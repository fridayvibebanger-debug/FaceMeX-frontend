import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, X, Hash, Mic, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';
import { useUserStore } from '@/store/userStore';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadMedia } from '@/lib/storage';
import { generateAIReply } from '@/lib/aiReply';
import { toast } from '@/components/ui/use-toast';
import SafetyWarningDialog from '@/components/safety/SafetyWarningDialog';
import { reportSafetyEvent, safetyScanText, type SafetyScanResult } from '@/lib/safety';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const uploadProgressTimerRef = useRef<number | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const { user } = useAuthStore();
  const { addPost, getAISuggestions, trendingHashtags } = usePostStore();
  const { mode, tier, addons, hasTier } = useUserStore();
  const [postMode, setPostMode] = useState<'social' | 'professional'>(mode || 'social');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const uploadGenRef = useRef(0);
  const [topic, setTopic] = useState('');
  const [isGeneratingAIContent, setIsGeneratingAIContent] = useState(false);

  const [postSafetyDialogOpen, setPostSafetyDialogOpen] = useState(false);
  const [postSafetyScan, setPostSafetyScan] = useState<SafetyScanResult | null>(null);
  const pendingPostRef = useRef(false);

  const canUseVoiceNote = (() => {
    const t = String(tier || '').toLowerCase();
    return (
      t.startsWith('creator') ||
      t.startsWith('business') ||
      t.startsWith('exclusive') ||
      addons?.verified === true
    );
  })();

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);
  const voiceTimerRef = useRef<number | null>(null);

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const compressImage = async (file: File, maxSize = 1600): Promise<File> => {
    // Only attempt to compress images
    if (!file.type.startsWith('image/')) return file;
    try {
      const dataUrl = await readAsDataURL(file);
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });

      const { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      if (scale >= 1) return file; // already small enough

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b) return reject(new Error('Compression failed'));
            resolve(b);
          },
          'image/jpeg',
          0.8,
        );
      });

      return new File([blob], file.name.replace(/\.(png|webp)$/i, '.jpg'), { type: 'image/jpeg' });
    } catch (err) {
      console.warn('Image compression skipped', err);
      return file;
    }
  };

  const clearVoiceTimer = () => {
    if (voiceTimerRef.current !== null) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = voiceRecorderRef.current;
    const stream = voiceStreamRef.current;
    if (!recorder || !stream) return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        voiceChunksRef.current = [];

        try {
          setIsUploading(true);
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
          const url = await uploadMedia(file, 'posts/audio');
          setAudioPreview(url);
          setImagePreviews([]);
        } catch {
          try {
            const reader = new FileReader();
            const dataUrl: string = await new Promise((res, rej) => {
              reader.onload = () => res(String(reader.result || ''));
              reader.onerror = () => rej(new Error('voice_read_failed'));
              reader.readAsDataURL(blob);
            });
            setAudioPreview(dataUrl);
            setImagePreviews([]);
          } catch {
          }
        } finally {
          setIsUploading(false);
          stream.getTracks().forEach((t) => t.stop());
          voiceStreamRef.current = null;
          voiceRecorderRef.current = null;
          clearVoiceTimer();
          setIsRecordingVoice(false);
          resolve();
        }
      };

      recorder.stop();
    });
  };

  const toggleVoiceRecording = async () => {
    if (!canUseVoiceNote) {
      toast({
        title: 'Voice notes are Creator+ only',
        description: 'Upgrade to Creator+ (or higher) to post a voice note. Everyone can still listen.',
        variant: 'destructive',
      });
      return;
    }
    if (isRecordingVoice) {
      await stopVoiceRecording();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      voiceRecorderRef.current = recorder;
      voiceChunksRef.current = [];
      setVoiceSeconds(0);

      clearVoiceTimer();
      voiceTimerRef.current = window.setInterval(() => {
        setVoiceSeconds((s) => s + 1);
      }, 1000);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.start();
      setIsRecordingVoice(true);
    } catch (err) {
      console.error('Microphone access denied or failed', err);
      alert('Unable to access microphone. Please allow mic permissions to record a voice note.');
    }
  };

  useEffect(() => {
    if (content.length > 10) {
      const suggestions = getAISuggestions(content);
      setAiSuggestions(suggestions);
    } else {
      setAiSuggestions([]);
    }
  }, [content, getAISuggestions]);

  const cancelUpload = () => {
    uploadGenRef.current += 1;
    setIsUploading(false);
    setUploadProgress(0);
    if (uploadProgressTimerRef.current !== null) {
      window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
    setImagePreviews([]);
    setAudioPreview(null);
  };

  const handleImprovePostWithAI = async () => {
    if (!hasTier('pro')) {
      toast({
        title: 'Upgrade needed',
        description: 'AI writing improvements are available on Pro and above.',
      });
      return;
    }
    if (!topic.trim()) {
      toast({
        title: 'Add a topic first',
        description: 'Enter a topic so AI can improve your post with the right context.',
        variant: 'destructive',
      });
      return;
    }
    if (!content.trim()) {
      toast({
        title: 'Write something first',
        description: 'Add some text, then use AI to improve it.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAIContent(true);
    try {
      const reply = await generateAIReply({
        context: [],
        userMessage: `Improve this ${postMode === 'professional' ? 'professional' : 'casual'} post about "${topic.trim()}", keeping the meaning but making it clearer and more engaging:\n\n${content.trim()}`,
        tone: postMode === 'professional' ? 'professional' : 'casual',
        maxLength: 280,
      });
      setContent(reply);
      toast({
        title: 'Improved',
        description: 'AI refined your post. Review before posting.',
      });
    } catch (error) {
      console.error('AI improve failed:', error);
      toast({
        title: 'AI failed',
        description: 'Could not improve the post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAIContent(false);
    }
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 5) {
      alert('You can upload up to 5 images at a time.');
      return;
    }
    const tooLarge = files.find((f) => f.size > 15 * 1024 * 1024);
    if (tooLarge) {
      alert('One of the images is too large. Please pick files under 15MB each.');
      return;
    }

    const myGen = ++uploadGenRef.current;
    setAudioPreview(null);

    try {
      // instant local previews
      try {
        const local = await Promise.all(files.map((f) => readAsDataURL(f)));
        if (uploadGenRef.current !== myGen) return;
        setImagePreviews(local);
      } catch {
      }

      setIsUploading(true);
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      const urls = await Promise.all(compressed.map((f) => uploadMedia(f, 'posts/images')));
      if (uploadGenRef.current !== myGen) return;
      setImagePreviews(urls);
    } catch (err) {
      console.error('Images upload failed', err);
      const msg = (err as any)?.code || (err as any)?.message || 'Upload failed';
      alert(`Images upload failed: ${msg}.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePost = async () => {
    if (!(content.trim() || imagePreviews.length > 0 || audioPreview)) return;

    // Safety scan (all tiers). Only warn (do not hard-block) so users can still proceed.
    const scan = safetyScanText(content);
    if (!pendingPostRef.current && (scan.level === 'medium' || scan.level === 'high')) {
      pendingPostRef.current = true;
      setPostSafetyScan(scan);
      setPostSafetyDialogOpen(true);
      reportSafetyEvent({
        content,
        scan,
        context: { location: 'posts', direction: 'draft' },
      }).catch(() => {});
      return;
    }

    try {
      setIsPosting(true);
      await addPost(
        content.trim() || content,
        imagePreviews.length ? imagePreviews : undefined,
        audioPreview || undefined,
        undefined,
        postMode,
      );
      setContent('');
      setImagePreviews([]);
      setAudioPreview(null);
      setAiSuggestions([]);
      setTopic('');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create post', err);
      alert('Failed to create post. Please ensure the API is running and configured correctly.');
    } finally {
      setIsPosting(false);
      pendingPostRef.current = false;
    }
  };

  const removeMedia = () => {
    setImagePreviews([]);
    setAudioPreview(null);
  };

  const addHashtag = (hashtag: string) => {
    setContent(prev => prev + ' ' + hashtag);
  };

  const hasStarted = !!(content.trim() || imagePreviews.length > 0 || audioPreview || topic.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl border bg-card">
        <SafetyWarningDialog
          open={postSafetyDialogOpen}
          onOpenChange={(v) => {
            setPostSafetyDialogOpen(v);
            if (!v) pendingPostRef.current = false;
          }}
          title="Potential scam or unsafe content"
          scan={postSafetyScan}
          primaryActionLabel="Post anyway"
          onPrimaryAction={() => {
            setPostSafetyDialogOpen(false);
            // Proceed with post (skip the warning once).
            handlePost();
          }}
        />
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">New post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Posting as:</span>
            <div className="flex items-center gap-1">
              <button className={`px-2 py-1 rounded border ${postMode==='social'?'border-primary text-foreground':'border-muted-foreground/30'}`} onClick={() => setPostMode('social')}>Social</button>
              <button className={`px-2 py-1 rounded border ${postMode==='professional'?'border-primary text-foreground':'border-muted-foreground/30'}`} onClick={() => setPostMode('professional')}>Professional</button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
            </div>
          </div>

          <Textarea
            placeholder="Share an update, idea, or story..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[220px] resize-none rounded-2xl border bg-background px-4 py-3 text-base leading-relaxed focus-visible:ring-2"
          />

          <AnimatePresence>
            {hasStarted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Topic (for AI tools)</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImprovePostWithAI}
                      disabled={isGeneratingAIContent || !hasTier('pro')}
                      className="text-xs"
                    >
                      {isGeneratingAIContent ? 'Improving…' : hasTier('pro') ? 'Improve writing' : 'Upgrade for AI'}
                    </Button>
                  </div>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Optional topic for AI"
                    className="h-9"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Hashtag Suggestions */}
          <AnimatePresence>
            {hasStarted && aiSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="text-xs text-muted-foreground">Suggested hashtags</div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => addHashtag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trending Hashtags */}
          <div className="space-y-2">
            <button
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Hash className="h-4 w-4" />
              <span>Hashtags</span>
            </button>
            <AnimatePresence>
              {hasStarted && showAISuggestions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2"
                >
                  {trendingHashtags.slice(0, 8).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => addHashtag('#' + tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Media Preview */}
          {imagePreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden bg-muted"
            >
              <div className="relative w-full aspect-video bg-black">
                <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                  {imagePreviews.slice(0, 4).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt="Preview"
                      className="h-full w-full object-cover rounded"
                    />
                  ))}
                  {imagePreviews.length === 1 && (
                    <img
                      src={imagePreviews[0]}
                      alt="Preview"
                      className="col-span-2 row-span-2 h-full w-full object-contain rounded"
                    />
                  )}
                </div>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {audioPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-xl overflow-hidden border bg-background p-3"
            >
              <audio controls className="w-full" src={audioPreview} />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              {hasStarted && (
                <>
                  <label htmlFor="images-upload">
                    <Button variant="ghost" size="sm" asChild>
                      <span className="cursor-pointer">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Add photos
                      </span>
                    </Button>
                  </label>
                  <input
                    id="images-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={handleImagesUpload}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVoiceRecording().catch(() => {})}
                    disabled={isUploading || !canUseVoiceNote}
                  >
                    {canUseVoiceNote ? (
                      <Mic className={`h-4 w-4 mr-2 ${isRecordingVoice ? 'animate-pulse' : ''}`} />
                    ) : (
                      <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                    )}
                    {isRecordingVoice ? `Recording ${voiceSeconds}s` : 'Voice'}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isUploading && (
                <span className="text-[11px] text-muted-foreground mr-1 min-w-[60px] text-right">
                  {`${uploadProgress}%`}
                </span>
              )}
              {isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px]"
                  onClick={cancelUpload}
                >
                  Cancel upload
                </Button>
              )}
              <Button
                onClick={handlePost}
                disabled={(!content.trim() && imagePreviews.length === 0 && !audioPreview) || isUploading || isPosting}
              >
                {isPosting ? 'Posting...' : isUploading ? 'Uploading...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}