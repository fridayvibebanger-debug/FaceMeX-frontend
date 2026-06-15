import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Camera, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { uploadMedia } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const moodOptions = ['happy', 'excited', 'focused', 'peaceful', 'creative', 'energetic'];

const interestOptions = [
  'Technology',
  'Design',
  'Photography',
  'Travel',
  'Music',
  'Art',
  'Fitness',
  'Food',
  'Gaming',
  'Fashion',
];

function safeString(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstLetter(value: string) {
  const clean = value.trim();
  return clean ? clean.charAt(0).toUpperCase() : 'U';
}

export default function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user, updateProfile } = useAuthStore() as any;

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [mood, setMood] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName(safeString(user?.name || user?.full_name || user?.fullName || user?.username));
    setBio(safeString(user?.bio));
    setPronouns(safeString(user?.pronouns));
    setMood(safeString(user?.mood));
    setLocation(safeString(user?.location));
    setWebsite(safeString(user?.website));
    setInterests(safeStringArray(user?.interests));
    setAvatarPreview(safeString(user?.avatar || user?.avatar_url || user?.avatarUrl));
    setCoverPreview(safeString(user?.coverPhoto || user?.cover_photo || user?.coverUrl));
  }, [open, user]);

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    try {
      const url = await uploadMedia(file, 'profile/avatars');
      setAvatarPreview(safeString(url));
    } catch (err) {
      console.error('Avatar upload failed', err);

      toast({
        title: 'Avatar upload failed',
        description: 'Please try again with a different image or check your connection.',
        variant: 'destructive',
      });
    }
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    try {
      const url = await uploadMedia(file, 'profile/covers');
      setCoverPreview(safeString(url));
    } catch (err) {
      console.error('Cover upload failed', err);

      toast({
        title: 'Cover upload failed',
        description: 'Please try again with a different image or check your connection.',
        variant: 'destructive',
      });
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((item) => item !== interest);
      }

      return [...prev, interest];
    });
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanBio = bio.trim();
    const cleanPronouns = pronouns.trim();
    const cleanMood = mood.trim();
    const cleanLocation = location.trim();
    const cleanWebsite = website.trim();

    if (!cleanName) {
      toast({
        title: 'Name required',
        description: 'Please enter your name before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      await updateProfile?.({
        name: cleanName,
        bio: cleanBio,
        pronouns: cleanPronouns,
        mood: cleanMood,
        location: cleanLocation,
        website: cleanWebsite,
        interests,
        avatar: avatarPreview,
        avatar_url: avatarPreview,
        coverPhoto: coverPreview,
        cover_photo: coverPreview,
      });

      toast({
        title: 'Profile updated',
        description: 'Your changes were saved.',
      });

      onOpenChange(false);
    } catch (err) {
      console.error('Profile update failed', err);

      toast({
        title: 'Save failed',
        description: 'Your profile could not be saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Cover Photo</Label>

            <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
              ) : null}

              <label
                htmlFor="cover-upload"
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 transition-colors hover:bg-black/50"
              >
                <Camera className="h-8 w-8 text-white" />
              </label>

              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </div>
          </div>

          <div>
            <Label>Profile Picture</Label>

            <div className="mt-2 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} alt={name} />
                  <AvatarFallback>{firstLetter(name)}</AvatarFallback>
                </Avatar>

                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/50"
                >
                  <Camera className="h-6 w-6 text-white" />
                </label>

                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>

            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="pronouns">Pronouns</Label>

            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g., he/him, she/her, they/them"
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>

            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="min-h-[100px]"
              disabled={saving}
            />
          </div>

          <div>
            <Label>Current Mood</Label>

            <div className="mt-2 flex flex-wrap gap-2">
              {moodOptions.map((moodOption) => (
                <Badge
                  key={moodOption}
                  variant={mood === moodOption ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setMood(moodOption)}
                >
                  {moodOption}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Interests</Label>

            <div className="mt-2 flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <Badge
                  key={interest}
                  variant={interests.includes(interest) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}

                  {interests.includes(interest) ? <X className="ml-1 h-3 w-3" /> : null}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>

            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>

            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourwebsite.com"
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
