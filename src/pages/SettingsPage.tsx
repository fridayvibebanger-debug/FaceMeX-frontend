import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { uploadMedia } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { mode } = useUserStore();
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'mode' | 'wellbeing'>('account');
  const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    endorsements: true,
    groupActivity: true,
    jobMatches: true,
    wellbeing: true,
  });
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [idImageUrl, setIdImageUrl] = useState('');
  const [idStatus, setIdStatus] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('settings:lang:primary');
      if (stored) setPrimaryLanguage(stored);
    } catch {}
  }, []);

  const sections = useMemo(
    () =>
      [
        { key: 'account' as const, title: 'Your account', subtitle: 'Profile, email, password' },
        { key: 'privacy' as const, title: 'Privacy and safety', subtitle: 'Visibility & safety center' },
        { key: 'notifications' as const, title: 'Notifications', subtitle: 'Push and in-app alerts' },
        { key: 'mode' as const, title: 'Modes & Pro', subtitle: 'Social vs Professional' },
        { key: 'wellbeing' as const, title: 'Wellbeing', subtitle: 'Support & resources' },
      ],
    []
  );

  const activeTitle = useMemo(() => {
    return sections.find((s) => s.key === activeSection)?.title || 'Settings';
  }, [activeSection, sections]);

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
                  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/90 overflow-hidden">
                    {sections.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className={`w-full flex items-center justify-between px-4 py-3 text-left border-b last:border-b-0 transition-colors ${
                          activeSection === s.key ? 'bg-slate-100/70 dark:bg-slate-900' : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'
                        }`}
                        onClick={() => {
                          setActiveSection(s.key);
                        }}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{s.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                        className="h-8 px-2"
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
                    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/90 overflow-hidden">
                      {sections.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-4 text-left border-b last:border-b-0"
                          onClick={() => {
                            setActiveSection(s.key);
                            setMobileView('detail');
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{s.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${mobileView === 'menu' ? 'hidden md:block' : ''} mt-3 md:mt-0`}>
                  <Tabs
                    value={activeSection}
                    onValueChange={(v) => {
                      setActiveSection(v as any);
                      setMobileView('detail');
                    }}
                    className="space-y-6"
                  >
                    <TabsList className="hidden" />

                    {/* Account Settings */}
                    <TabsContent value="account">
                      <Card>
                        <CardHeader>
                          <CardTitle>Account Settings</CardTitle>
                          <CardDescription>Manage your account information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <Avatar className="h-24 w-24">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <Button
                                size="icon"
                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                              >
                                <Camera className="h-4 w-4" />
                              </Button>
                            </div>
                            <div>
                              <h3 className="font-semibold">{user?.name}</h3>
                              <p className="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                          </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" defaultValue={user?.name} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Input id="bio" defaultValue={user?.bio} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" />
                      </div>

                      <Button className="w-full">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
                    </TabsContent>

                    {/* Privacy Settings */}
                    <TabsContent value="privacy">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>Control who can see your content</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Private Account</Label>
                        <p className="text-sm text-muted-foreground">
                          Only approved followers can see your posts
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Online Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Let others see when you're active
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Tags</Label>
                        <p className="text-sm text-muted-foreground">
                          Let others tag you in posts
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Followers</Label>
                        <p className="text-sm text-muted-foreground">
                          Display your follower count publicly
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Professional profile visibility</Label>
                        <p className="text-sm text-muted-foreground">
                          Let others see your Professional tab and skills when in professional mode
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow collaboration invites</Label>
                        <p className="text-sm text-muted-foreground">
                          Let people send you Pro collaboration invites on posts and projects
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Read receipts</Label>
                        <p className="text-sm text-muted-foreground">
                          Show when you have read messages in DMs
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Safety Center</CardTitle>
                          <CardDescription>
                            Review safety tools, screenshot protection and policy library.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" className="w-full">
                            <Link to="/safety">Open Safety Center</Link>
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">User Trust Dashboard</CardTitle>
                          <CardDescription>
                            View your trust score, device history and safety status.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link to="/trust">Open Trust Dashboard</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="mt-6 p-4 border rounded-lg bg-muted/40 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Verify your identity (optional)</p>
                          <p className="text-xs text-muted-foreground">
                            Add an ID or document image URL. This can increase your trust score and help prevent impersonation.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="id-image-url">ID image URL</Label>
                        <Input
                          id="id-image-url"
                          type="url"
                          placeholder="https://..."
                          value={idImageUrl}
                          onChange={(e) => setIdImageUrl(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <label htmlFor="id-image-file">
                            <Button type="button" size="sm" variant="outline" asChild disabled={idUploading}>
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
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setIdUploading(true);
                                const url = await uploadMedia(file, 'identity');
                                setIdImageUrl(url);
                                setIdStatus(`Image uploaded. Ready to submit for verification.`);
                              } catch (err) {
                                console.error('ID upload failed', err);
                                toast({ title: 'ID upload failed', description: 'Please try again or check your connection.', variant: 'destructive' });
                              } finally {
                                setIdUploading(false);
                                e.target.value = '';
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!idImageUrl || !user?.id || idUploading}
                            onClick={async () => {
                              if (!idImageUrl || !user?.id) return;
                              setIdStatus('Submitting verification...');
                              try {
                                const res = await api.post('/api/safety/verify-identity', {
                                  userId: user.id,
                                  imageUrl: idImageUrl,
                                  documentType: 'id',
                                }) as any;
                                const status = res?.verification?.status || 'pending';
                                setIdStatus(`Verification submitted. Current status: ${status}.`);
                              } catch {
                                setIdStatus('Could not submit verification right now. Please try again later.');
                              }
                            }}
                          >
                            Submit for review
                          </Button>
                        </div>
                        <p className="text-muted-foreground">
                          Your image is checked using AI + human review. See results in the Trust Dashboard.
                        </p>
                      </div>
                      {idStatus && (
                        <p className="text-xs text-muted-foreground">{idStatus}</p>
                      )}
                    </div>

                    <Button className="w-full">Save Privacy Settings</Button>
                  </CardContent>
                </Card>
                    </TabsContent>

                    {/* Notification Settings */}
                    <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>Choose what notifications you receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Likes</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone likes your post
                        </p>
                      </div>
                      <Switch
                        checked={notifications.likes}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, likes: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Comments</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone comments on your post
                        </p>
                      </div>
                      <Switch
                        checked={notifications.comments}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, comments: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Followers</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone follows you
                        </p>
                      </div>
                      <Switch
                        checked={notifications.follows}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, follows: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Messages</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you receive a new message
                        </p>
                      </div>
                      <Switch
                        checked={notifications.messages}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, messages: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Endorsements & skills</Label>
                        <p className="text-sm text-muted-foreground">
                          Alerts when someone endorses a skill or interacts with your Professional profile
                        </p>
                      </div>
                      <Switch
                        checked={notifications.endorsements}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, endorsements: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Groups & communities</Label>
                        <p className="text-sm text-muted-foreground">
                          Activity from Professional groups and communities you’ve joined
                        </p>
                      </div>
                      <Switch
                        checked={notifications.groupActivity}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, groupActivity: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Job and collab matches</Label>
                        <p className="text-sm text-muted-foreground">
                          Suggested jobs or projects that match your skills and reputation
                        </p>
                      </div>
                      <Switch
                        checked={notifications.jobMatches}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, jobMatches: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Wellbeing nudges</Label>
                        <p className="text-sm text-muted-foreground">
                          Gentle reminders about breaks and mental health resources when things feel heavy
                        </p>
                      </div>
                      <Switch
                        checked={notifications.wellbeing}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, wellbeing: checked })
                        }
                      />
                    </div>

                    <Button className="w-full">Save Notification Settings</Button>
                  </CardContent>
                </Card>
                    </TabsContent>

                    <TabsContent value="mode">
                <Card>
                  <CardHeader>
                    <CardTitle>Social &amp; Professional Modes</CardTitle>
                    <CardDescription>Control how you show up across Social and Professional layers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-card flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Current mode</p>
                        <p className="text-sm text-muted-foreground capitalize">You are currently in {mode} mode.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/feed">Switch in header</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/profile">Open profile</Link>
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Professional profile</CardTitle>
                          <CardDescription>Update your headline, skills, resume and collab preferences.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" className="w-full">
                            <Link to="/profile#professional">Go to Professional tab</Link>
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Jobs &amp; Pro groups</CardTitle>
                          <CardDescription>Explore roles, Pro groups and collaboration opportunities.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link to="/jobs">Open Jobs</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link to="/groups/pro">View Professional groups</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/40 space-y-3">
                      <div>
                        <p className="text-sm font-medium">Language &amp; translation</p>
                        <p className="text-xs text-muted-foreground">
                          Configure how FaceMe helps with multilingual conversations.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium">Primary language</p>
                          <p className="text-muted-foreground text-xs mb-1">Used as the default target language for AI Translator.</p>
                          <select
                            className="mt-1 border rounded px-2 py-1 text-xs bg-background"
                            value={primaryLanguage}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPrimaryLanguage(value);
                              try {
                                localStorage.setItem('settings:lang:primary', value);
                              } catch {}
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
                          <p className="font-medium">Show translation helper in Messages</p>
                          <p className="text-xs text-muted-foreground">Keep the Translate action visible on messages and, if you are on Exclusive or Business+, enable the AI Translator toggle.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                    </TabsContent>

                    <TabsContent value="wellbeing">
                <Card>
                  <CardHeader>
                    <CardTitle>Wellbeing &amp; Support</CardTitle>
                    <CardDescription>Choose how FaceMe supports your mental health and emotional signal.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      FaceMe is not a crisis service, but we surface gentle nudges, reflection tools and links to mental health resources when things feel heavy.
                    </p>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">South Africa support</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            If you need immediate help in South Africa: 112 (mobile) or 10111 (police). SADAG 0800 567 567, LifeLine 0861 322 322.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Mental Health Resources</CardTitle>
                          <CardDescription>Browse crisis lines, self-care tools and support information.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" className="w-full">
                            <Link to="/mental-health">Open Mental Health hub</Link>
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Emotion AI &amp; check-ins</CardTitle>
                          <CardDescription>Use Emotion AI to reflect on how messages and posts feel.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link to="/emotion">Open Emotion AI</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If you are ever in immediate danger or experiencing a crisis, please contact local emergency services or a trusted crisis line in your area.
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
