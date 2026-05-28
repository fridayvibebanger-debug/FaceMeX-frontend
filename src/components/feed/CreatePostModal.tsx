import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Image as ImageIcon,
  X,
  Hash,
  Mic,
  Lock,
  Video,
  FileText,
} from 'lucide-react';
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

type UploadedDocument = {
  id: string;
  title: string;
  url: string;
  pages: string[];
  totalPages: number;
  previewPages: number;
};

export default function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [documentPreviews, setDocumentPreviews] = useState<UploadedDocument[]>([]);
  const [documentPreviewPages, setDocumentPreviewPages] = useState(1);
  const [documentTotalPages, setDocumentTotalPages] = useState(1);

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

  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

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

  const startUploadProgress = () => {
    setUploadProgress(3);

    if (uploadProgressTimerRef.current !== null) {
      window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }

    uploadProgressTimerRef.current = window.setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, prev + Math.floor(Math.random() * 9) + 3);
      });
    }, 350);
  };

  const finishUploadProgress = () => {
    setUploadProgress(100);

    if (uploadProgressTimerRef.current !== null) {
      window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }

    window.setTimeout(() => {
      setUploadProgress(0);
    }, 500);
  };

  const compressImage = async (file: File, maxSize = 1600): Promise<File> => {
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

      if (scale >= 1) return file;

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
          0.8
        );
      });

      return new File([blob], file.name.replace(/\.(png|webp)$/i, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch (err) {
      console.warn('Image compression skipped', err);
      return file;
    }
  };

  const getVideoDuration = (file: File) => {
    return new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration || 0);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read video duration.'));
      };

      video.src = url;
    });
  };

  const getMaxVideoSeconds = () => {
    const t = String(tier || user?.tier || '').toLowerCase();

    if (
      t.startsWith('creator') ||
      t.startsWith('business') ||
      t.startsWith('exclusive')
    ) {
      return 60;
    }

    return 30;
  };

  const validateVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      throw new Error('Please choose a valid video file.');
    }

    const maxSeconds = getMaxVideoSeconds();
    const duration = await getVideoDuration(file);

    if (duration > maxSeconds) {
      throw new Error(`Video is too long. Your current limit is ${maxSeconds} seconds.`);
    }

    if (file.size > 120 * 1024 * 1024) {
      throw new Error('Video is too large. Please upload a smaller video.');
    }

    return true;
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
        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        voiceChunksRef.current = [];

        try {
          setIsUploading(true);
          startUploadProgress();

          const file = new File([blob], `voice-${Date.now()}.webm`, {
            type: blob.type || 'audio/webm',
          });

          const url = await uploadMedia(file, 'posts/audio');

          setAudioPreview(url);
          setImagePreviews([]);
          setVideoPreviews([]);
          setDocumentPreviews([]);
          finishUploadProgress();
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
            setVideoPreviews([]);
            setDocumentPreviews([]);
          } catch {}
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
        description: 'Upgrade to Creator+ or higher to post a voice note. Everyone can still listen.',
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
        if (event.data && event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
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
    setVideoPreviews([]);
    setDocumentPreviews([]);
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

    const currentTotal = imagePreviews.length + files.length;

    if (currentTotal > 10) {
      alert('You can upload up to 10 images per post.');
      e.currentTarget.value = '';
      return;
    }

    const tooLarge = files.find((f) => f.size > 15 * 1024 * 1024);

    if (tooLarge) {
      alert('One of the images is too large. Please pick files under 15MB each.');
      e.currentTarget.value = '';
      return;
    }

    const myGen = ++uploadGenRef.current;
    setAudioPreview(null);

    try {
      try {
        const local = await Promise.all(files.map((f) => readAsDataURL(f)));

        if (uploadGenRef.current !== myGen) return;

        setImagePreviews((prev) => [...prev, ...local].slice(0, 10));
      } catch {}

      setIsUploading(true);
      startUploadProgress();

      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      const urls = await Promise.all(compressed.map((f) => uploadMedia(f, 'posts/images')));

      if (uploadGenRef.current !== myGen) return;

      setImagePreviews((prev) => {
        const withoutLocal = prev.filter((src) => !src.startsWith('data:'));
        return [...withoutLocal, ...urls].slice(0, 10);
      });

      finishUploadProgress();
    } catch (err) {
      console.error('Images upload failed', err);
      const msg = (err as any)?.code || (err as any)?.message || 'Upload failed';
      alert(`Images upload failed: ${msg}.`);
    } finally {
      setIsUploading(false);
      e.currentTarget.value = '';
    }
  };

  const handleVideosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const currentTotal = videoPreviews.length + files.length;

    if (currentTotal > 4) {
      alert('You can upload up to 4 videos per post.');
      e.currentTarget.value = '';
      return;
    }

    const myGen = ++uploadGenRef.current;
    setAudioPreview(null);

    try {
      setIsUploading(true);
      startUploadProgress();

      for (const file of files) {
        await validateVideoFile(file);
      }

      const urls = await Promise.all(files.map((file) => uploadMedia(file, 'posts/videos')));

      if (uploadGenRef.current !== myGen) return;

      setVideoPreviews((prev) => [...prev, ...urls].slice(0, 4));

      finishUploadProgress();
    } catch (err: any) {
      console.error('Video upload failed', err);
      alert(err?.message || 'Video upload failed. Please choose a shorter video.');
    } finally {
      setIsUploading(false);
      e.currentTarget.value = '';
    }
  };

  const handleDocumentsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const currentTotal = documentPreviews.length + files.length;

    if (currentTotal > 5) {
      alert('You can upload up to 5 documents per post.');
      e.currentTarget.value = '';
      return;
    }

    const tooLarge = files.find((f) => f.size > 30 * 1024 * 1024);

    if (tooLarge) {
      alert('One of the documents is too large. Please pick files under 30MB each.');
      e.currentTarget.value = '';
      return;
    }

    const myGen = ++uploadGenRef.current;
    setAudioPreview(null);

    try {
      setIsUploading(true);
      startUploadProgress();

      const uploaded = await Promise.all(
        files.map(async (file, index) => {
          const url = await uploadMedia(file, 'posts/documents');

          return {
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `doc-${Date.now()}-${index}`,
            title: file.name,
            url,
            pages: [],
            totalPages: Math.max(1, documentTotalPages),
            previewPages: Math.max(
              1,
              Math.min(documentPreviewPages, Math.max(1, documentTotalPages))
            ),
          };
        })
      );

      if (uploadGenRef.current !== myGen) return;

      setDocumentPreviews((prev) => [...prev, ...uploaded].slice(0, 5));

      finishUploadProgress();
    } catch (err: any) {
      console.error('Document upload failed', err);
      alert(err?.message || 'Document upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      e.currentTarget.value = '';
    }
  };

  const handlePost = async () => {
    const hasMedia =
      imagePreviews.length > 0 ||
      videoPreviews.length > 0 ||
      documentPreviews.length > 0 ||
      !!audioPreview;

    if (!(content.trim() || hasMedia)) return;

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

      const primaryMediaType =
        videoPreviews.length > 0
          ? 'video'
          : imagePreviews.length > 0
            ? 'image'
            : documentPreviews.length > 0
              ? 'document'
              : audioPreview
                ? 'audio'
                : 'text';

      await (addPost as any)(
        content.trim() || content,
        imagePreviews.length ? imagePreviews : undefined,
        audioPreview || undefined,
        undefined,
        postMode,
        {
          image: imagePreviews[0] || '',
          images: imagePreviews,

          video: videoPreviews[0] || '',
          videos: videoPreviews,
          mediaType: primaryMediaType,
          media_type: primaryMediaType,

          documents: documentPreviews,
          documentUrl: documentPreviews[0]?.url || '',
          documentTitle: documentPreviews[0]?.title || '',
          documentPages: documentPreviews[0]?.pages || [],
          documentTotalPages: documentPreviews[0]?.totalPages || 0,
          documentPreviewPages: documentPreviews[0]?.previewPages || 1,

          document_url: documentPreviews[0]?.url || '',
          document_title: documentPreviews[0]?.title || '',
          document_pages: documentPreviews[0]?.pages || [],
          document_total_pages: documentPreviews[0]?.totalPages || 0,
          document_preview_pages: documentPreviews[0]?.previewPages || 1,
        }
      );

      setContent('');
      setImagePreviews([]);
      setVideoPreviews([]);
      setDocumentPreviews([]);
      setDocumentPreviewPages(1);
      setDocumentTotalPages(1);
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
    setVideoPreviews([]);
    setDocumentPreviews([]);
    setAudioPreview(null);
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setDocumentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addHashtag = (hashtag: string) => {
    setContent((prev) => `${prev} ${hashtag}`.trimStart());
  };

  const hasStarted = !!(
    content.trim() ||
    imagePreviews.length > 0 ||
    videoPreviews.length > 0 ||
    documentPreviews.length > 0 ||
    audioPreview ||
    topic.trim()
  );

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
              <button
                type="button"
                className={`px-2 py-1 rounded border ${
                  postMode === 'social'
                    ? 'border-primary text-foreground'
                    : 'border-muted-foreground/30'
                }`}
                onClick={() => setPostMode('social')}
              >
                Social
              </button>

              <button
                type="button"
                className={`px-2 py-1 rounded border ${
                  postMode === 'professional'
                    ? 'border-primary text-foreground'
                    : 'border-muted-foreground/30'
                }`}
                onClick={() => setPostMode('professional')}
              >
                Professional
              </button>
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
                    <span className="text-xs text-muted-foreground">
                      Topic (for AI tools)
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImprovePostWithAI}
                      disabled={isGeneratingAIContent || !hasTier('pro')}
                      className="text-xs"
                    >
                      {isGeneratingAIContent
                        ? 'Improving…'
                        : hasTier('pro')
                          ? 'Improve writing'
                          : 'Upgrade for AI'}
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

          <div className="space-y-2">
            <button
              type="button"
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
                      onClick={() => addHashtag(`#${tag}`)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {imagePreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden bg-muted"
            >
              <div className="relative w-full aspect-video bg-black">
                <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                  {imagePreviews.slice(0, 4).map((src, index) => (
                    <div key={`${src}-${index}`} className="relative overflow-hidden rounded bg-black">
                      <img
                        src={src}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />

                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {index === 3 && imagePreviews.length > 4 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white">
                          +{imagePreviews.length - 4}
                        </div>
                      )}
                    </div>
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

          {videoPreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2 rounded-2xl border bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Videos selected: {videoPreviews.length}
                </p>

                <p className="text-[11px] text-muted-foreground">
                  Limit: {getMaxVideoSeconds()}s each
                </p>
              </div>

              <div className="space-y-2">
                {videoPreviews.map((src, index) => (
                  <div key={`${src}-${index}`} className="relative overflow-hidden rounded-2xl bg-black">
                    <video
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[320px] w-full object-cover"
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                    />

                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                      onClick={() => removeVideo(index)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {documentPreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3 rounded-2xl border bg-muted/20 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Documents selected: {documentPreviews.length}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Total pages</span>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={documentTotalPages}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(200, Number(e.target.value) || 1));
                      setDocumentTotalPages(value);
                      setDocumentPreviewPages((prev) => Math.max(1, Math.min(prev, value)));
                    }}
                    className="h-8 w-20"
                  />

                  <span className="text-muted-foreground">Show pages</span>
                  <Input
                    type="number"
                    min={1}
                    max={documentTotalPages}
                    value={documentPreviewPages}
                    onChange={(e) => {
                      const value = Math.max(
                        1,
                        Math.min(documentTotalPages, Number(e.target.value) || 1)
                      );

                      setDocumentPreviewPages(value);

                      setDocumentPreviews((prev) =>
                        prev.map((doc) => ({
                          ...doc,
                          previewPages: value,
                          totalPages: documentTotalPages,
                        }))
                      );
                    }}
                    className="h-8 w-20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {documentPreviews.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Showing {doc.previewPages} of {doc.totalPages} page
                          {doc.totalPages === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <button type="button" onClick={() => removeDocument(index)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
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
            <div className="flex flex-wrap items-center gap-2">
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

                  <input
                    ref={videoInputRef}
                    id="videos-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    multiple
                    onChange={handleVideosUpload}
                  />

                  <input
                    ref={documentInputRef}
                    id="documents-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    multiple
                    onChange={handleDocumentsUpload}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Add video
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Add document
                  </Button>

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
                disabled={
                  (!content.trim() &&
                    imagePreviews.length === 0 &&
                    videoPreviews.length === 0 &&
                    documentPreviews.length === 0 &&
                    !audioPreview) ||
                  isUploading ||
                  isPosting
                }
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
