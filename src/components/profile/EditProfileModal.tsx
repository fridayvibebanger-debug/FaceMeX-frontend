import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Loader2, ShieldCheck, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { useAuthStore } from '@/store/authStore';
import { uploadMedia } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const moodOptions = [
  'happy',
  'excited',
  'focused',
  'peaceful',
  'creative',
  'energetic',
];

const interestOptions = [
  'Jobs',
  'Career',
  'Business',
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

function cleanText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function getUserValue(user: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = user?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }
  }

  return fallback;
}

function getIsVerified(user: any) {
  return Boolean(
    user?.verified ||
      user?.isVerified ||
      user?.is_verified ||
      user?.verificationStatus === 'verified' ||
      user?.verification_status === 'verified' ||
      user?.account_status === 'verified'
  );
}

function PostCardVerifiedBadge() {
  return (
    <span
      title="Verified"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm ring-2 ring-white dark:ring-[#111]"
    >
      <ShieldCheck className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

function VerifiedTextBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-600 ring-1 ring-sky-500/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20">
      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.6} />
      Verified
    </span>
  );
}

export default function EditProfileModal({
  open,
  onOpenChange,
}: EditProfileModalProps) {
  const { user, updateProfile } = useAuthStore();

  const currentUser = user as any;
  const isVerified = getIsVerified(currentUser);

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const userSnapshot = useMemo(() => {
    return {
      name: getUserValue(currentUser, [
        'name',
        'full_name',
        'fullName',
        'displayName',
        'username',
      ]),
      bio: getUserValue(currentUser, ['bio', 'about']),
      pronouns: getUserValue(currentUser, ['pronouns']),
      mood: getUserValue(currentUser, ['mood']),
      location: getUserValue(currentUser, ['location', 'city']),
      website: getUserValue(currentUser, ['website', 'website_url']),
      interests: getUserValue(currentUser, ['interests'], []) as string[],
      avatar: getUserValue(currentUser, [
        'avatar',
        'avatarUrl',
        'avatar_url',
        'profileImage',
        'profile_image',
      ]),
      coverPhoto: getUserValue(currentUser, [
        'coverPhoto',
        'cover_photo',
        'coverUrl',
        'cover_url',
      ]),
    };
  }, [currentUser]);

  useEffect(() => {
    if (!open) return;

    setName(userSnapshot.name);
    setBio(userSnapshot.bio);
    setPronouns(userSnapshot.pronouns);
    setMood(userSnapshot.mood);
    setLocation(userSnapshot.location);
    setWebsite(userSnapshot.website);
    setInterests(Array.isArray(userSnapshot.interests) ? userSnapshot.interests : []);
    setAvatarPreview(userSnapshot.avatar);
    setCoverPreview(userSnapshot.coverPhoto);
  }, [open, userSnapshot]);

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingAvatar(true);

      const url = await uploadMedia(file, 'profile/avatars');

      setAvatarPreview(url);

      toast({
        title: 'Profile picture uploaded',
        description: 'Tap Save Changes to update your profile.',
      });
    } catch (err) {
      console.error('Avatar upload failed', err);

      toast({
        title: 'Avatar upload failed',
        description: 'Please try again with a different image or check your connection.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingCover(true);

      const url = await uploadMedia(file, 'profile/covers');

      setCoverPreview(url);

      toast({
        title: 'Cover photo uploaded',
        description: 'Tap Save Changes to update your profile.',
      });
    } catch (err) {
      console.error('Cover upload failed', err);

      toast({
        title: 'Cover upload failed',
        description: 'Please try again with a different image or check your connection.',
        variant: 'destructive',
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    const cleanName = name.trim().replace(/\s+/g, ' ');

    if (!cleanName) {
      toast({
        title: 'Name required',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: cleanName,
        full_name: cleanName,
        fullName: cleanName,
        displayName: cleanName,

        bio: bio.trim(),
        about: bio.trim(),

        pronouns: pronouns.trim(),
        mood,
        location: location.trim(),
        city: location.trim(),

        website: website.trim(),
        website_url: website.trim(),

        interests,

        avatar: avatarPreview,
        avatarUrl: avatarPreview,
        avatar_url: avatarPreview,
        profileImage: avatarPreview,
        profile_image: avatarPreview,

        coverPhoto: coverPreview,
        cover_photo: coverPreview,
        coverUrl: coverPreview,
        cover_url: coverPreview,

        verified: Boolean(currentUser?.verified),
        isVerified: Boolean(currentUser?.isVerified),
        is_verified: Boolean(currentUser?.is_verified),

        updated_at: new Date().toISOString(),
      };

      await Promise.resolve(updateProfile(payload as any));

      toast({
        title: 'Profile updated',
        description: 'Your latest profile changes are saved.',
      });

      onOpenChange(false);
    } catch (err) {
      console.error('Profile update failed', err);

      toast({
        title: 'Profile update failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const avatarFallback =
    cleanText(name).charAt(0).toUpperCase() ||
    cleanText(currentUser?.email).charAt(0).toUpperCase() ||
    'F';

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
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  Add a cover photo
                </div>
              )}

              <label
                htmlFor="cover-upload"
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 transition-colors hover:bg-black/50"
              >
                {uploadingCover ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </label>

              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingCover || saving}
                onChange={handleCoverUpload}
              />
            </div>
          </div>

          <div>
            <Label>Profile Picture</Label>

            <div className="mt-2 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} alt={name || 'Profile picture'} />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>

                {isVerified && (
                  <span className="absolute -bottom-1 -right-1">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-md">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </span>
                  </span>
                )}

                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </label>

                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar || saving}
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {name || 'FaceMeX user'}
                  </p>

                  {isVerified && <PostCardVerifiedBadge />}
                  {isVerified && <VerifiedTextBadge />}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Your verified badge is controlled by FaceMeX and cannot be edited here.
                </p>
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
                  className="cursor-pointer capitalize"
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

                  {interests.includes(interest) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
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
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button onClick={handleSave} disabled={saving || uploadingAvatar || uploadingCover}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
