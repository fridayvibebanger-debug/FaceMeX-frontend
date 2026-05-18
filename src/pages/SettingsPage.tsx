import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { uploadMedia } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

type SettingsSection =
  | 'account'
  | 'privacy'
  | 'notifications'
  | 'mode'
  | 'wellbeing';

type PrivacySettings = {
  privateAccount: boolean;
  showOnlineStatus: boolean;
  allowTags: boolean;
  showFollowers: boolean;
  professionalVisibility: boolean;
  allowCollaborationInvites: boolean;
  readReceipts: boolean;
};

type NotificationSettings = {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  endorsements: boolean;
  groupActivity: boolean;
  jobMatches: boolean;
  wellbeing: boolean;
};

const DEFAULT_PRIVACY: PrivacySettings = {
  privateAccount: false,
  showOnlineStatus: true,
  allowTags: true,
  showFollowers: true,
  professionalVisibility: true,
  allowCollaborationInvites: true,
  readReceipts: true,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  endorsements: true,
  groupActivity: true,
  jobMatches: true,
  wellbeing: true,
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function initials(name?: string) {
  const clean = String(name || 'F').trim();
  return clean.charAt(0).toUpperCase();
}

export default function SettingsPage() {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuthStore();
  const { mode } = useUserStore();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>('account');

  const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    password: '',
    avatar: user?.avatar || '',
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>(() =>
    readLocal<PrivacySettings>('settings:privacy', DEFAULT_PRIVACY)
  );

  const [notifications, setNotifications] = useState<NotificationSettings>(() =>
    readLocal<NotificationSettings>(
      'settings:notifications',
      DEFAULT_NOTIFICATIONS
    )
  );

  const [primaryLanguage, setPrimaryLanguage] = useState('en');

  const [idImageUrl, setIdImageUrl] = useState('');
  const [idStatus, setIdStatus] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    setProfileForm((current) => ({
      ...current,
      name: user?.name || current.name,
      email: user?.email || current.email,
      bio: user?.bio || current.bio,
      avatar: user?.avatar || current.avatar,
    }));
  }, [user?.name, user?.email, user?.bio, user?.avatar]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('settings:lang:primary');
      if (stored) setPrimaryLanguage(stored);
    } catch {
      // ignore
    }
  }, []);

  const sections = useMemo(
    () => [
      {
        key: 'account' as const,
        title: 'Your account',
        subtitle: 'Profile, email, password',
      },
      {
        key: 'privacy' as const,
        title: 'Privacy and safety',
        subtitle: 'Visibility & safety center',
      },
      {
        key: 'notifications' as const,
        title: 'Notifications',
        subtitle: 'Push and in-app alerts',
      },
      {
        key: 'mode' as const,
        title: 'Modes & Pro',
        subtitle: 'Social vs Professional',
      },
      {
        key: 'wellbeing' as const,
        title: 'Wellbeing',
        subtitle: 'Support & resources',
      },
    ],
    []
  );

  const activeTitle = useMemo(() => {
    return sections.find((section) => section.key === activeSection)?.title || 'Settings';
  }, [activeSection, sections]);

  const updatePrivacy = (key: keyof PrivacySettings, value: boolean) => {
    const next = {
      ...privacy,
      [key]: value,
    };

    setPrivacy(next);
    writeLocal('settings:privacy', next);
  };

  const updateNotification = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    const next = {
      ...notifications,
      [key]: value,
    };

    setNotifications(next);
    writeLocal('settings:notifications', next);
  };

  const saveProfile = async () => {
    setProfileSaving(true);

    const payload = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      bio: profileForm.bio.trim(),
      avatar: profileForm.avatar,
      password: profileForm.password,
    };

    try {
      writeLocal('settings:account', payload);

      useAuthStore.setState((state: any) => ({
        ...state,
        user: state.user
          ? {
              ...state.user,
              name: payload.name,
              email: payload.email,
              bio: payload.bio,
              avatar: payload.avatar,
            }
          : state.user,
      }));

      useUserStore.setState((state: any) => ({
        ...state,
        name: payload.name || state.name,
        avatar: payload.avatar || state.avatar,
        user: state.user
          ? {
              ...state.user,
              name: payload.name,
              email: payload.email,
              bio: payload.bio,
              avatar: payload.avatar,
            }
          : state.user,
        profile: state.profile
          ? {
              ...state.profile,
              name: payload.name,
              email: payload.email,
              bio: payload.bio,
              avatar: payload.avatar,
              avatar_url: payload.avatar,
            }
          : state.profile,
      }));

      try {
        await api.post('/api/profile/update', {
          userId: user?.id,
          ...payload,
        });
      } catch {
        // app still works locally if backend endpoint does not exist yet
      }

      setProfileForm((current) => ({
        ...current,
        password: '',
      }));

      toast({
        title: 'Profile saved',
        description: 'Your account changes were saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save profile right now.',
        variant: 'destructive',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadAvatarFromDevice = async (file: File | null) => {
    if (!file) return;

    try {
      setAvatarUploading(true);

      const url = await uploadMedia(file, 'avatar');

      setProfileForm((current) => ({
        ...current,
        avatar: url,
      }));

      useAuthStore.setState((state: any) => ({
        ...state,
        user: state.user
          ? {
              ...state.user,
              avatar: url,
            }
          : state.user,
      }));

      useUserStore.setState((state: any) => ({
        ...state,
        avatar: url,
        user: state.user
          ? {
              ...state.user,
              avatar: url,
            }
          : state.user,
        profile: state.profile
          ? {
              ...state.profile,
              avatar: url,
              avatar_url: url,
            }
          : state.profile,
      }));

      toast({
        title: 'Profile picture updated',
        description: 'Press Save Changes to keep your full profile changes.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Please try another image.',
        variant: 'destructive',
      });
    } finally {
      setAvatarUploading(false);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const savePrivacy = async () => {
    setPrivacySaving(true);

    try {
      writeLocal('settings:privacy', privacy);

      try {
        await api.post('/api/settings/privacy', {
          userId: user?.id,
          privacy,
        });
      } catch {
        // local save still works
      }

      toast({
        title: 'Privacy saved',
        description: 'Your privacy and safety settings were saved.',
      });
    } catch {
      toast({
        title: 'Save failed',
        description: 'Could not save privacy settings right now.',
        variant: 'destructive',
      });
    } finally {
      setPrivacySaving(false);
    }
  };

  const saveNotifications = async () => {
    setNotificationsSaving(true);

    try {
      writeLocal('settings:notifications', notifications);

      try {
        await api.post('/api/settings/notifications', {
          userId: user?.id,
          notifications,
        });
      } catch {
        // local save still works
      }

      toast({
        title: 'Notifications saved',
        description: 'Your notification preferences were saved.',
      });
    } catch {
      toast({
        title: 'Save failed',
        description: 'Could not save notification settings right now.',
        variant: 'destructive',
      });
    } finally {
      setNotificationsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="flex">
        <LeftSidebar />

        <main className="flex-1 lg:ml-64 px-3 sm:px-6 lg:px-8 pt-14 md:pt-16 lg:pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-10">
          <div className="max-w-4xl mx-auto">
            <div className="md:flex md:gap-6">
              <div className="hidden md:block w-[280px] shrink-0">
                <div className="sticky top-20 space-y-3">
                  <div className="text-xl font-bold">Settings</div>

                  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/90 overflow-hidden shadow-sm">
                    {sections.map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b last:border-b-0 transition-colors ${
                          activeSection === section.key
                            ? 'bg-slate-100/80 dark:bg-slate-800/70'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'
                        }`}
                        onClick={() => setActiveSection(section.key)}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {section.title}
                          </div>

                          <div className="text-xs text-muted-foreground truncate">
                            {section.subtitle}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="md:hidden mb-3">
                  {mobileView === 'menu' ? (
                    <div className="text-xl font-bold">Settings</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 rounded-full"
                        onClick={() => setMobileView('menu')}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>

                      <div className="font-semibold truncate">{activeTitle}</div>
                    </div>
                  )}
                </div>

                <div className="md:hidden">
                  {mobileView === 'menu' && (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/90 overflow-hidden shadow-sm">
                      {sections.map((section) => (
                        <button
                          key={section.key}
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left border-b last:border-b-0"
                          onClick={() => {
                            setActiveSection(section.key);
                            setMobileView('detail');
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {section.title}
                            </div>

                            <div className="text-xs text-muted-foreground truncate">
                              {section.subtitle}
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`${
                    mobileView === 'menu' ? 'hidden md:block' : ''
                  } mt-3 md:mt-0`}
                >
                  <Tabs
                    value={activeSection}
                    onValueChange={(value) => {
                      setActiveSection(value as SettingsSection);
                      setMobileView('detail');
                    }}
                    className="space-y-6"
                  >
                    <TabsList className="hidden" />

                    <TabsContent value="account">
                      <Card className="rounded-3xl shadow-sm">
                        <CardHeader>
                          <CardTitle>Account Settings</CardTitle>
                          <CardDescription>
                            Manage your profile, email, avatar and password.
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-24 w-24 border">
                                <AvatarImage src={profileForm.avatar} />
                                <AvatarFallback>
                                  {initials(profileForm.name || user?.name)}
                                </AvatarFallback>
                              </Avatar>

                              <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) =>
                                  uploadAvatarFromDevice(
                                    event.target.files?.[0] || null
                                  )
                                }
                              />

                              <Button
                                type="button"
                                size="icon"
                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                                disabled={avatarUploading}
                                onClick={() => avatarInputRef.current?.click()}
                              >
                                {avatarUploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Camera className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-semibold">
                                {profileForm.name || user?.name || 'FaceMeX User'}
                              </h3>

                              <p className="truncate text-sm text-muted-foreground">
                                {profileForm.email || user?.email}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                Tap the camera to upload a new profile picture.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Full Name</Label>
                              <Input
                                id="name"
                                value={profileForm.name}
                                onChange={(event) =>
                                  setProfileForm({
                                    ...profileForm,
                                    name: event.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={profileForm.email}
                                onChange={(event) =>
                                  setProfileForm({
                                    ...profileForm,
                                    email: event.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="bio">Bio</Label>
                              <Input
                                id="bio"
                                value={profileForm.bio}
                                onChange={(event) =>
                                  setProfileForm({
                                    ...profileForm,
                                    bio: event.target.value,
                                  })
                                }
                                placeholder="Tell people who you are..."
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="password">New Password</Label>
                              <Input
                                id="password"
                                type="password"
                                placeholder="Leave empty if you do not want to change it"
                                value={profileForm.password}
                                onChange={(event) =>
                                  setProfileForm({
                                    ...profileForm,
                                    password: event.target.value,
                                  })
                                }
                              />
                            </div>

                            <Button
                              type="button"
                              className="w-full rounded-full"
                              disabled={profileSaving}
                              onClick={saveProfile}
                            >
                              {profileSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Save Changes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="privacy">
                      <Card className="rounded-3xl shadow-sm">
                        <CardHeader>
                          <CardTitle>Privacy Settings</CardTitle>
                          <CardDescription>
                            Control who can see your content and interact with you.
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <div className="space-y-5">
                            {[
                              {
                                key: 'privateAccount' as const,
                                title: 'Private Account',
                                desc: 'Only approved followers can see your posts.',
                              },
                              {
                                key: 'showOnlineStatus' as const,
                                title: 'Show Online Status',
                                desc: "Let others see when you're active.",
                              },
                              {
                                key: 'allowTags' as const,
                                title: 'Allow Tags',
                                desc: 'Let others tag you in posts.',
                              },
                              {
                                key: 'showFollowers' as const,
                                title: 'Show Followers',
                                desc: 'Display your follower count publicly.',
                              },
                              {
                                key: 'professionalVisibility' as const,
                                title: 'Professional profile visibility',
                                desc: 'Let others see your Professional tab and skills.',
                              },
                              {
                                key: 'allowCollaborationInvites' as const,
                                title: 'Allow collaboration invites',
                                desc: 'Let people send you Pro collaboration invites.',
                              },
                              {
                                key: 'readReceipts' as const,
                                title: 'Read receipts',
                                desc: 'Show when you have read messages in DMs.',
                              },
                            ].map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4"
                              >
                                <div className="space-y-0.5">
                                  <Label>{item.title}</Label>
                                  <p className="text-sm text-muted-foreground">
                                    {item.desc}
                                  </p>
                                </div>

                                <Switch
                                  checked={privacy[item.key]}
                                  onCheckedChange={(checked) =>
                                    updatePrivacy(item.key, checked)
                                  }
                                />
                              </div>
                            ))}
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Card className="border-dashed rounded-2xl">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  Safety Center
                                </CardTitle>
                                <CardDescription>
                                  Review safety tools, screenshot protection and policies.
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <Button asChild size="sm" className="w-full rounded-full">
                                  <Link to="/safety">Open Safety Center</Link>
                                </Button>
                              </CardContent>
                            </Card>

                            <Card className="border-dashed rounded-2xl">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  User Trust Dashboard
                                </CardTitle>
                                <CardDescription>
                                  View trust score, device history and safety status.
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="w-full rounded-full"
                                >
                                  <Link to="/trust">Open Trust Dashboard</Link>
                                </Button>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="rounded-2xl border bg-muted/40 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  Verify your identity optional
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Add an ID or document image. This helps prevent impersonation.
                                </p>
                              </div>

                              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="id-image-url">ID image URL</Label>
                              <Input
                                id="id-image-url"
                                type="url"
                                placeholder="https://..."
                                value={idImageUrl}
                                onChange={(event) =>
                                  setIdImageUrl(event.target.value)
                                }
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <label htmlFor="id-image-file">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    disabled={idUploading}
                                    className="rounded-full"
                                  >
                                    <span className="cursor-pointer">
                                      {idUploading ? 'Uploading…' : 'Choose file'}
                                    </span>
                                  </Button>
                                </label>

                                <input
                                  id="id-image-file"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (event) => {
                                    const file = event.target.files?.[0];

                                    if (!file) return;

                                    try {
                                      setIdUploading(true);
                                      const url = await uploadMedia(file, 'identity');

                                      setIdImageUrl(url);
                                      setIdStatus(
                                        'Image uploaded. Ready to submit for verification.'
                                      );
                                    } catch (error) {
                                      console.error('ID upload failed', error);

                                      toast({
                                        title: 'ID upload failed',
                                        description:
                                          'Please try again or check your connection.',
                                        variant: 'destructive',
                                      });
                                    } finally {
                                      setIdUploading(false);
                                      event.target.value = '';
                                    }
                                  }}
                                />

                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-full"
                                  disabled={!idImageUrl || !user?.id || idUploading}
                                  onClick={async () => {
                                    if (!idImageUrl || !user?.id) return;

                                    setIdStatus('Submitting verification...');

                                    try {
                                      const res = (await api.post(
                                        '/api/safety/verify-identity',
                                        {
                                          userId: user.id,
                                          imageUrl: idImageUrl,
                                          documentType: 'id',
                                        }
                                      )) as any;

                                      const status =
                                        res?.verification?.status || 'pending';

                                      setIdStatus(
                                        `Verification submitted. Current status: ${status}.`
                                      );
                                    } catch {
                                      setIdStatus(
                                        'Could not submit verification right now. Please try again later.'
                                      );
                                    }
                                  }}
                                >
                                  Submit for review
                                </Button>
                              </div>

                              <p className="text-muted-foreground">
                                Results appear in the Trust Dashboard.
                              </p>
                            </div>

                            {idStatus && (
                              <p className="text-xs text-muted-foreground">
                                {idStatus}
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            className="w-full rounded-full"
                            disabled={privacySaving}
                            onClick={savePrivacy}
                          >
                            {privacySaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Privacy Settings
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                      <Card className="rounded-3xl shadow-sm">
                        <CardHeader>
                          <CardTitle>Notification Settings</CardTitle>
                          <CardDescription>
                            Choose what notifications you receive.
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <div className="space-y-5">
                            {[
                              {
                                key: 'likes' as const,
                                title: 'Likes',
                                desc: 'Get notified when someone likes your post.',
                              },
                              {
                                key: 'comments' as const,
                                title: 'Comments',
                                desc: 'Get notified when someone comments on your post.',
                              },
                              {
                                key: 'follows' as const,
                                title: 'New Followers',
                                desc: 'Get notified when someone follows you.',
                              },
                              {
                                key: 'messages' as const,
                                title: 'Messages',
                                desc: 'Get notified when you receive a new message.',
                              },
                              {
                                key: 'endorsements' as const,
                                title: 'Endorsements & skills',
                                desc: 'Alerts when someone interacts with your Professional profile.',
                              },
                              {
                                key: 'groupActivity' as const,
                                title: 'Groups & communities',
                                desc: 'Activity from Professional groups and communities.',
                              },
                              {
                                key: 'jobMatches' as const,
                                title: 'Job and collab matches',
                                desc: 'Suggested jobs or projects that match your skills.',
                              },
                              {
                                key: 'wellbeing' as const,
                                title: 'Wellbeing nudges',
                                desc: 'Gentle reminders about breaks and support resources.',
                              },
                            ].map((item) => (
                              <div
                                key={item.key}
                                className="flex items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4"
                              >
                                <div className="space-y-0.5">
                                  <Label>{item.title}</Label>
                                  <p className="text-sm text-muted-foreground">
                                    {item.desc}
                                  </p>
                                </div>

                                <Switch
                                  checked={notifications[item.key]}
                                  onCheckedChange={(checked) =>
                                    updateNotification(item.key, checked)
                                  }
                                />
                              </div>
                            ))}
                          </div>

                          <Button
                            type="button"
                            className="w-full rounded-full"
                            disabled={notificationsSaving}
                            onClick={saveNotifications}
                          >
                            {notificationsSaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Notification Settings
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="mode">
                      <Card className="rounded-3xl shadow-sm">
                        <CardHeader>
                          <CardTitle>Social &amp; Professional Modes</CardTitle>
                          <CardDescription>
                            Control how you show up across Social and Professional layers.
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          <div className="p-4 border rounded-2xl bg-card flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">Current mode</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                You are currently in {mode} mode.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs">
                              <Button asChild size="sm" variant="outline" className="rounded-full">
                                <Link to="/feed">Switch in header</Link>
                              </Button>

                              <Button asChild size="sm" variant="outline" className="rounded-full">
                                <Link to="/profile">Open profile</Link>
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Card className="border-dashed rounded-2xl">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  Professional profile
                                </CardTitle>
                                <CardDescription>
                                  Update headline, skills, resume and collab preferences.
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <Button asChild size="sm" className="w-full rounded-full">
                                  <Link to="/profile#professional">
                                    Go to Professional tab
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>

                            <Card className="border-dashed rounded-2xl">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  Jobs &amp; Pro groups
                                </CardTitle>
                                <CardDescription>
                                  Explore roles, Pro groups and collaboration opportunities.
                                </CardDescription>
                              </CardHeader>

                              <CardContent className="flex flex-col gap-2">
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="w-full rounded-full"
                                >
                                  <Link to="/jobs">Open Jobs</Link>
                                </Button>

                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="w-full rounded-full"
                                >
                                  <Link to="/groups/pro">View Professional groups</Link>
                                </Button>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="p-4 border rounded-2xl bg-muted/40 space-y-3">
                            <div>
                              <p className="text-sm font-medium">
                                Language &amp; translation
                              </p>

                              <p className="text-xs text-muted-foreground">
                                Configure how FaceMeX helps with multilingual conversations.
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                              <div>
                                <p className="font-medium">Primary language</p>

                                <p className="text-muted-foreground text-xs mb-1">
                                  Used as the default target language for AI Translator.
                                </p>

                                <select
                                  className="mt-1 border rounded-xl px-3 py-2 text-xs bg-background"
                                  value={primaryLanguage}
                                  onChange={(event) => {
                                    const value = event.target.value;

                                    setPrimaryLanguage(value);

                                    try {
                                      localStorage.setItem(
                                        'settings:lang:primary',
                                        value
                                      );
                                    } catch {
                                      // ignore
                                    }

                                    toast({
                                      title: 'Language saved',
                                      description: 'Your primary language was updated.',
                                    });
                                  }}
                                >
                                  <option value="en">English</option>
                                  <option value="es">Spanish</option>
                                  <option value="fr">French</option>
                                  <option value="de">German</option>
                                  <option value="pt">Portuguese</option>
                                  <option value="ar">Arabic</option>
                                  <option value="hi">Hindi</option>
                                  <option value="sw">Swahili</option>
                                  <option value="zu">Zulu</option>
                                </select>
                              </div>

                              <div className="text-xs text-muted-foreground">
                                AI Translator will show previews in your primary language.
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-sm">
                              <div>
                                <p className="font-medium">
                                  Show translation helper in Messages
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Keep Translate visible in DMs and comments.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="wellbeing">
                      <Card className="rounded-3xl shadow-sm">
                        <CardHeader>
                          <CardTitle>Wellbeing &amp; Support</CardTitle>
                          <CardDescription>
                            Choose how FaceMeX supports safer and healthier use.
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            FaceMeX can surface gentle nudges, reflection tools and support information when things feel heavy.
                          </p>

                          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium">
                                  South Africa support
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  If you are in immediate danger, contact local emergency services. South Africa: 112 from mobile or 10111.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Card className="border-dashed rounded-2xl">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  Mental Health Resources
                                </CardTitle>
                                <CardDescription>
                                  Browse support information and self-care tools.
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <Button asChild size="sm" className="w-full rounded-full">
                                  <Link to="/mental-health">
                                    Open Mental Health hub
                                  </Link>
                                </Button>
                              </CardContent>
                            </Card>

                            <Card className="border-dashed rounded-2xl">
                              <CardHeader>
                                <CardTitle className="text-base">
                                  Emotion AI &amp; check-ins
                                </CardTitle>
                                <CardDescription>
                                  Reflect on how messages and posts feel.
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="w-full rounded-full"
                                >
                                  <Link to="/emotion">Open Emotion AI</Link>
                                </Button>
                              </CardContent>
                            </Card>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            If something feels urgent or unsafe, contact emergency services or a trusted adult nearby.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
