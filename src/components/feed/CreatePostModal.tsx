import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { uploadImagesToAzure } from '@/lib/azureUpload';
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
  Loader2,
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
  coverUrl?: string;
  mimeType?: string;
  size?: number;
};

type PostMode = 'social' | 'professional';

function cleanTier(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isCreatorPlusTier(value: unknown) {
  const tier = cleanTier(value);

  return (
    tier === 'creator' ||
    tier === 'business' ||
    tier === 'exclusive' ||
    tier.startsWith('creator') ||
    tier.startsWith('business') ||
    tier.startsWith('exclusive')
  );
}

function safeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeSvgText(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFileExtension(fileName: string) {
  const ext = String(fileName || '').split('.').pop() || 'DOC';
  return ext.toUpperCase().slice(0, 8);
}

function createDocumentCoverDataUrl(fileName: string, fileType = 'DOC') {
  const cleanName = escapeSvgText(String(fileName || 'Document').slice(0, 60));
  const cleanType = escapeSvgText(String(fileType || 'DOC').slice(0, 12));

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="50%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#e5e7eb"/>
      </linearGradient>
    </defs>

    <rect width="900" height="1200" fill="url(#bg)"/>
    <circle cx="780" cy="160" r="210" fill="#38bdf8" opacity="0.18"/>
    <circle cx="130" cy="1050" r="250" fill="#a855f7" opacity="0.18"/>

    <rect x="110" y="135" width="680" height="930" rx="54" fill="url(#paper)"/>
    <rect x="170" y="220" width="560" height="26" rx="13" fill="#cbd5e1"/>
    <rect x="170" y="280" width="430" height="20" rx="10" fill="#e2e8f0"/>

    <rect x="285" y="410" width="330" height="380" rx="34" fill="#f8fafc" stroke="#cbd5e1" stroke-width="6"/>
    <path d="M540 410 L615 485 L615 790 L285 790 L285 410 Z" fill="#ffffff"/>
    <path d="M540 410 L615 485 L540 485 Z" fill="#cbd5e1"/>

    <rect x="335" y="565" width="230" height="24" rx="12" fill="#94a3b8"/>
    <rect x="335" y="620" width="180" height="18" rx="9" fill="#cbd5e1"/>
    <rect x="335" y="665" width="210" height="18" rx="9" fill="#e2e8f0"/>

    <rect x="180" y="860" width="540" height="76" rx="24" fill="#0f172a"/>
    <text x="450" y="910" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">${cleanType}</text>

    <text x="450" y="995" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#334155" text-anchor="middle">${cleanName}</text>
    <text x="450" y="1040" font-family="Arial, sans-serif" font-size="20" font-weight="500" fill="#64748b" text-anchor="middle">FaceMeX Document</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadProgressTimerRef = useRef<number | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { user } = useAuthStore();
  const { addPost, getAISuggestions, trendingHashtags } = usePostStore();
  const { mode, tier, addons, hasTier } = useUserStore();

  const [postMode, setPostMode] = useState<PostMode>(mode || 'social');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const uploadGenRef = useRef(0);
  const [topic, setTopic] = useState('');
  const [isGeneratingAIContent, setIsGeneratingAIContent] = useState(false);

  const [postSafetyDialogOpen, setPostSafetyDialogOpen] = useState(false);
  const [postSafetyScan, setPostSafetyScan] = useState<SafetyScanResult | null>(null);
  const pendingPostRef = useRef(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);
  const voiceTimerRef = useRef<number | null>(null);

  const userTier = cleanTier(tier || user?.tier || 'free');

  const canUseProAi = (() => {
    try {
      return Boolean(
        hasTier?.('pro') ||
          hasTier?.('creator') ||
          hasTier?.('business') ||
          hasTier?.('exclusive')
      );
    } catch {
      return userTier === 'pro' || isCreatorPlusTier(userTier);
    }
  })();

  const canUseVoiceNote = (() => {
    const t = cleanTier(tier || user?.tier);

    return (
      t.startsWith('creator') ||
      t.startsWith('business') ||
      t.startsWith('exclusive') ||
      addons?.verified === true
    );
  })();

  const canUseDocumentPost = (() => {
    try {
      return Boolean(hasTier?.('creator') || hasTier?.('business') || hasTier?.('exclusive'));
    } catch {
      return isCreatorPlusTier(userTier);
    }
  })();

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);
    });

  const clearUploadTimer = () => {
    if (uploadProgressTimerRef.current !== null) {
      window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
  };

  const startUploadProgress = () => {
    setUploadProgress(3);
    clearUploadTimer();

    uploadProgressTimerRef.current = window.setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, prev + Math.floor(Math.random() * 9) + 3);
      });
    }, 350);
  };

  const finishUploadProgress = () => {
    setUploadProgress(100);
    clearUploadTimer();

    window.setTimeout(() => {
      setUploadProgress(0);
    }, 500);
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
    if (isCreatorPlusTier(tier || user?.tier)) return 60;
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
      throw new Error('Video is too large. Please upload a smaller video under 120MB.');
    }

    return true;
  };

  const clearVoiceTimer = () => {
    if (voiceTimerRef.current !== null) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearUploadTimer();
      clearVoiceTimer();

      try {
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (content.length > 10) {
      const suggestions = getAISuggestions(content);
      setAiSuggestions(suggestions);
    } else {
      setAiSuggestions([]);
    }
  }, [content, getAISuggestions]);

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
          } catch {
            toast({
              title: 'Voice failed',
              description: 'Could not upload voice note. Please try again.',
              variant: 'destructive',
            });
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
    } catch {
      alert('Unable to access microphone. Please allow mic permissions to record a voice note.');
    }
  };

  const cancelUpload = () => {
    uploadGenRef.current += 1;
    setIsUploading(false);
    setUploadProgress(0);
    clearUploadTimer();

    setImagePreviews([]);
    setVideoPreviews([]);
    setDocumentPreviews([]);
    setAudioPreview(null);
  };

  const handleImprovePostWithAI = async () => {
    if (!canUseProAi) {
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
    } catch {
      toast({
        title: 'AI failed',
        description: 'Could not improve the post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAIContent(false);
    }
  };

  const handleImagesUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      e.currentTarget.value = '';
      return;
    }

    const maxImages = 5;
    const remainingSlots = Math.max(0, maxImages - imagePreviews.length);

    if (remainingSlots <= 0) {
      alert(`You can upload up to ${maxImages} images per post.`);
      e.currentTarget.value = '';
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    const tooLarge = filesToUpload.find((f) => f.size > 15 * 1024 * 1024);

    if (tooLarge) {
      alert('One of the images is too large. Please pick files under 15MB each.');
      e.currentTarget.value = '';
      return;
    }

    const myGen = ++uploadGenRef.current;
    setAudioPreview(null);

    try {
      try {
        const local = await Promise.all(filesToUpload.map((f) => readAsDataURL(f)));

        if (uploadGenRef.current !== myGen) return;

        setImagePreviews((prev) => [...prev, ...local].slice(0, maxImages));
      } catch {}

      setIsUploading(true);
      startUploadProgress();

      const urls = await uploadImagesToAzure(filesToUpload);

      if (uploadGenRef.current !== myGen) return;

      setImagePreviews((prev) => {
        const withoutLocal = prev.filter((src) => !src.startsWith('data:'));
        return [...withoutLocal, ...urls].slice(0, maxImages);
      });

      finishUploadProgress();
    } catch (err: any) {
      const msg = err?.code || err?.message || 'Upload failed';
      alert(`Images upload failed: ${msg}.`);
    } finally {
      setIsUploading(false);
      e.currentTarget.value = '';
    }
  };

  const handleVideosUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith('video/')
    );

    if (files.length === 0) {
      e.currentTarget.value = '';
      return;
    }

    const maxVideos = 4;
    const remainingSlots = Math.max(0, maxVideos - videoPreviews.length);

    if (remainingSlots <= 0) {
      alert(`You can upload up to ${maxVideos} videos per post.`);
      e.currentTarget.value = '';
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    const myGen = ++uploadGenRef.current;
    setAudioPreview(null);

    try {
      setIsUploading(true);
      startUploadProgress();

      for (const file of filesToUpload) {
        await validateVideoFile(file);
      }

      const urls = await Promise.all(
        filesToUpload.map((file) => uploadMedia(file, 'posts/videos'))
      );

      if (uploadGenRef.current !== myGen) return;

      setVideoPreviews((prev) => [...prev, ...urls].slice(0, maxVideos));

      finishUploadProgress();

      toast({
        title: 'Video uploaded',
        description: `${urls.length} video${urls.length === 1 ? '' : 's'} added to your post.`,
      });
    } catch (err: any) {
      alert(err?.message || 'Video upload failed. Please choose a shorter video.');
    } finally {
      setIsUploading(false);
      e.currentTarget.value = '';
    }
  };

const handleDocumentsUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!canUseDocumentPost) {
      e.currentTarget.value = '';

      toast({
        title: 'Creator+ required',
        description:
          'Only Creator, Business and Exclusive users can post documents. Free and Pro users can view documents only.',
        variant: 'destructive',
      });

      return;
    }

    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      e.currentTarget.value = '';
      return;
    }

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
          const extension = getFileExtension(file.name);
          const coverUrl = createDocumentCoverDataUrl(file.name, extension);

          return {
            id: safeId(`doc-${index}`),
            title: file.name,
            url,
            pages: [coverUrl],
            coverUrl,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
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

      toast({
        title: 'Document uploaded',
        description: `${uploaded.length} document${uploaded.length === 1 ? '' : 's'} added to your post.`,
      });
    } catch (err: any) {
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

    if (documentPreviews.length > 0 && !canUseDocumentPost) {
      toast({
        title: 'Creator+ required',
        description: 'Remove the document or upgrade to Creator+ before posting.',
        variant: 'destructive',
      });

      return;
    }

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

      const firstDoc = documentPreviews[0];

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
          videoUrl: videoPreviews[0] || '',
          videoUrls: videoPreviews,
          video_url: videoPreviews[0] || '',
          video_urls: videoPreviews,

          mediaType: primaryMediaType,
          media_type: primaryMediaType,

          documents: documentPreviews,

          documentUrl: firstDoc?.url || '',
          documentTitle: firstDoc?.title || '',
          documentPages: firstDoc?.pages || [],
          documentTotalPages: firstDoc?.totalPages || 0,
          documentPreviewPages: firstDoc?.previewPages || 1,
          documentCoverUrl: firstDoc?.coverUrl || firstDoc?.pages?.[0] || '',

          document_url: firstDoc?.url || '',
          document_title: firstDoc?.title || '',
          document_pages: firstDoc?.pages || [],
          document_total_pages: firstDoc?.totalPages || 0,
          document_preview_pages: firstDoc?.previewPages || 1,
          document_cover_url: firstDoc?.coverUrl || firstDoc?.pages?.[0] || '',
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

  const canPost =
    Boolean(content.trim()) ||
    imagePreviews.length > 0 ||
    videoPreviews.length > 0 ||
    documentPreviews.length > 0 ||
    Boolean(audioPreview);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overflow-x-hidden rounded-2xl border bg-card p-4 sm:max-w-[640px] sm:p-6">
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
          <DialogTitle className="text-base font-semibold tracking-tight">
            New post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Posting as:</span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`rounded border px-2 py-1 ${
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
                className={`rounded border px-2 py-1 ${
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
              <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name || 'FaceMeX user'}
              </p>
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
                      Topic for AI tools
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImprovePostWithAI}
                      disabled={isGeneratingAIContent || !canUseProAi}
                      className="text-xs"
                    >
                      {isGeneratingAIContent
                        ? 'Improving…'
                        : canUseProAi
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
                <div className="text-xs text-muted-foreground">
                  Suggested hashtags
                </div>

                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
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
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                      className="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
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
              className="relative overflow-hidden rounded-2xl bg-muted"
            >
              <div className="relative aspect-video w-full bg-black">
                <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                  {imagePreviews.slice(0, 4).map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="relative overflow-hidden rounded bg-black"
                    >
                      <img src={src} alt="Preview" className="h-full w-full object-cover" />

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
                      className="col-span-2 row-span-2 h-full w-full rounded object-contain"
                    />
                  )}
                </div>
              </div>

              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
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
              className="space-y-3 rounded-2xl border bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Videos selected: {videoPreviews.length}
                </p>

                <p className="text-[11px] text-muted-foreground">
                  Limit: {getMaxVideoSeconds()}s each
                </p>
              </div>

              <div className="space-y-3">
                {videoPreviews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative overflow-hidden rounded-[22px] border bg-black shadow-sm"
                  >
                    <video
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[360px] w-full bg-black object-contain"
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                    />

                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
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

                      setDocumentPreviews((prev) =>
                        prev.map((doc) => ({
                          ...doc,
                          totalPages: value,
                          previewPages: Math.max(1, Math.min(doc.previewPages || 1, value)),
                        }))
                      );
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
                    className="overflow-hidden rounded-2xl border bg-background shadow-sm"
                  >
                    {doc.coverUrl && (
                      <div className="aspect-[16/9] w-full overflow-hidden bg-slate-950">
                        <img
                          src={doc.coverUrl}
                          alt={doc.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.title}</p>
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
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {audioPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-xl border bg-background p-3"
            >
              <audio controls className="w-full" src={audioPreview} />

              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          <div className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 overflow-hidden sm:flex-1">
              <input
                ref={imageInputRef}
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
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="h-9 shrink-0"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Photos
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
                className="h-9 shrink-0"
              >
                <Video className="mr-2 h-4 w-4" />
                Video
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => documentInputRef.current?.click()}
                disabled={isUploading}
                className="h-9 shrink-0"
              >
                <FileText className="mr-2 h-4 w-4" />
                Document
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleVoiceRecording().catch(() => {})}
                disabled={isUploading || !canUseVoiceNote}
                className="h-9 shrink-0"
              >
                {canUseVoiceNote ? (
                  <Mic className={`mr-2 h-4 w-4 ${isRecordingVoice ? 'animate-pulse' : ''}`} />
                ) : (
                  <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                {isRecordingVoice ? `Recording ${voiceSeconds}s` : 'Voice'}
              </Button>
            </div>

            <div className="flex w-full max-w-full min-w-0 flex-wrap items-center justify-end gap-2 overflow-hidden sm:w-auto sm:shrink-0">
              {isUploading && (
                <span className="min-w-[48px] text-right text-[11px] text-muted-foreground">
                  {uploadProgress}%
                </span>
              )}

              {isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 max-w-full shrink-0 text-[11px]"
                  onClick={cancelUpload}
                >
                  Cancel upload
                </Button>
              )}

              <Button
                onClick={handlePost}
                disabled={!canPost || isUploading || isPosting}
                className="h-9 min-w-[92px] shrink-0"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting
                  </>
                ) : isUploading ? (
                  'Uploading...'
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
