import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAvatarStore } from '@/store/avatarStore';
import { useUserStore } from '@/store/userStore';
import { createCheckoutSession } from '@/utils/billing';
import { Smile, Frown, Angry, Laugh, Meh, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import AvatarPreview from '@/components/avatar/AvatarPreview';

interface AvatarCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startRpm?: boolean;
}

const skinTones = ['#f5d5c5', '#e8b89a', '#d4a574', '#c68642', '#8d5524', '#5c3317'];
const hairColors = ['#000000', '#4a3728', '#8b4513', '#daa520', '#ff6347', '#9370db'];
const hairStyles = ['short', 'long', 'bun', 'afro'];
const eyeColors = ['#4a90e2', '#2ecc71', '#8b4513', '#9370db', '#34495e'];
const outfits = ['casual', 'formal', 'sporty', 'creative'];

const emotions = [
  { value: 'neutral', icon: Meh, label: 'Neutral' },
  { value: 'happy', icon: Smile, label: 'Happy' },
  { value: 'excited', icon: Sparkles, label: 'Excited' },
  { value: 'sad', icon: Frown, label: 'Sad' },
  { value: 'angry', icon: Angry, label: 'Angry' },
  { value: 'surprised', icon: Laugh, label: 'Surprised' },
];

export default function AvatarCustomizer({ open, onOpenChange, startRpm }: AvatarCustomizerProps) {
  const { currentAvatar, updateCustomization, setEmotion, setRpmModelUrl } = useAvatarStore();
  const { hasTier } = useUserStore();
  const [selectedEmotion, setSelectedEmotion] = useState(currentAvatar?.emotion || 'neutral');
  const [rpmOpen, setRpmOpen] = useState(false);
  const rpmFrameRef = useRef<HTMLIFrameElement | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const openRpmOrCheckout = async () => {
    if (!hasTier('creator')) {
      const priceId = (import.meta as any).env?.VITE_STRIPE_PRICE_CREATOR_PLUS as string | undefined;
      if (!priceId) {
        window.location.assign('/pricing');
        return;
      }
      try {
        const session = await createCheckoutSession({
          priceId,
          mode: 'subscription',
          successUrl: `${origin}/pricing?from=avatar`,
          cancelUrl: `${origin}/pricing?from=avatar`,
          metadata: { feature: '3d-avatar' },
        });
        if (session?.url) {
          window.location.assign(session.url);
          return;
        }
      } catch {
        window.location.assign('/pricing');
        return;
      }
    }
    setRpmOpen(true);
  };

  const handleEmotionChange = (emotion: any) => {
    setSelectedEmotion(emotion);
    setEmotion(emotion);
  };

  // Ready Player Me integration: listen for avatar exported
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const ORIGIN = 'https://readyplayer.me';
      if (!event.data || typeof event.data !== 'object') return;
      if (typeof event.origin === 'string' && !event.origin.includes('readyplayer.me')) return;
      const { source, eventName, data } = event.data as any;
      if (source !== 'readyplayerme') return;
      if (eventName === 'v1.avatar.exported') {
        const url = data?.url as string | undefined;
        if (url) {
          setRpmModelUrl(url);
          setRpmOpen(false);
        }
      }
      if (eventName === 'v1.frame.ready') {
        // Optionally can send user info to RPM if desired
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setRpmModelUrl]);

  // Auto-open RPM creator when requested
  useEffect(() => {
    if (open && startRpm) { openRpmOrCheckout(); }
  }, [open, startRpm]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Your Avatar</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <Label>Preview</Label>
            <div className="h-[400px] rounded-xl overflow-hidden border bg-card flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 rounded-xl flex items-center justify-center">
                  <AvatarPreview customization={currentAvatar?.customization} emotion={selectedEmotion as any} size={192} />
                </div>
                <p className="text-sm text-muted-foreground">Avatar Preview</p>
              </div>
            </div>

            {/* Emotion Controls */}
            <div>
              <Label>Current Emotion</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {emotions.map((emotion) => {
                  const Icon = emotion.icon;
                  return (
                    <Button
                      key={emotion.value}
                      variant={selectedEmotion === emotion.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleEmotionChange(emotion.value)}
                      className="flex flex-col h-auto py-3"
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs">{emotion.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Customization Options */}
          <div className="space-y-6">
            {/* Skin Tone */}
            <div>
              <Label>Skin Tone</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {skinTones.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateCustomization({ skinTone: color })}
                    className={`w-10 h-10 rounded-full border-2 ${
                      currentAvatar?.customization.skinTone === color
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <Label>Hair Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {hairColors.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateCustomization({ hairColor: color })}
                    className={`w-10 h-10 rounded-full border-2 ${
                      currentAvatar?.customization.hairColor === color
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div>
              <Label>Hair Style</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {hairStyles.map((style) => (
                  <Button
                    key={style}
                    variant={currentAvatar?.customization.hairStyle === style ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => updateCustomization({ hairStyle: style })}
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            {/* Eye Color */}
            <div>
              <Label>Eye Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {eyeColors.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateCustomization({ eyeColor: color })}
                    className={`w-10 h-10 rounded-full border-2 ${
                      currentAvatar?.customization.eyeColor === color
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Outfit Style */}
            <div>
              <Label>Outfit Style</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {outfits.map((outfit) => (
                  <Badge
                    key={outfit}
                    variant={currentAvatar?.customization.outfit === outfit ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => updateCustomization({ outfit })}
                  >
                    {outfit}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              Save Avatar
            </Button>

            {/* Ready Player Me 3D Avatar */}
            <div className="space-y-2">
              <Label>3D Avatar (Ready Player Me)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={openRpmOrCheckout}>{hasTier('creator') ? 'Create 3D Avatar' : 'Unlock 3D (Creator+)'}</Button>
                {currentAvatar?.rpmModelUrl && (
                  <a
                    href={currentAvatar.rpmModelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-primary"
                  >
                    Open current model
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* RPM Creator Modal */}
    <Dialog open={rpmOpen} onOpenChange={setRpmOpen}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden">
        <div className="h-[70vh]">
          <iframe
            ref={rpmFrameRef}
            title="Ready Player Me"
            src={`https://readyplayer.me/avatar?frameApi`} // frame API enabled
            allow="camera *; microphone *; clipboard-write"
            className="w-full h-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}