import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Link as LinkIcon, UserPlus, UserMinus, Settings, CheckCircle, Briefcase, FileText, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import PostCard from '@/components/feed/PostCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useUserStore } from '@/store/userStore';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import IdentityVerifiedBadge from '@/components/safety/IdentityVerifiedBadge';
import { deepseekReply } from '@/utils/ai';
import { toast } from '@/components/ui/use-toast';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { posts } = usePostStore();
  const { currentTier } = useSubscriptionStore();
  const { professional, saveProfessional, endorseSkill, setMode, addons, mode, hasTier } = useUserStore();
  const params = useParams<{ id?: string }>();
  const effectiveUserId = user?.id || '1';
  const viewedUserId = params.id || effectiveUserId;
  const isOwnProfile = viewedUserId === effectiveUserId;
  const viewedUser = useMemo(() => {
    if (isOwnProfile) return user;
    return {
      id: viewedUserId,
      name: `User ${String(viewedUserId).slice(0, 6)}`,
      email: '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(viewedUserId)}`,
      coverPhoto: '',
      bio: 'Welcome to my profile.',
      followers: 0,
      joinedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
      interests: [],
    } as any;
  }, [isOwnProfile, user, viewedUserId]);

  const userPosts = posts.filter((post) => post.userId === viewedUserId);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [followerCount, setFollowerCount] = useState(user?.followers || 0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [newSkill, setNewSkill] = useState('');
  const pro = useMemo(() => professional || { headline: '', bio: '', location: '', skills: [], experience: [], education: [], links: [], endorsements: {}, openToCollab: false, collabNote: '', resumeSummary: '' }, [professional]);
  const [collabNoteDraft, setCollabNoteDraft] = useState(pro.collabNote || '');
  const [resumeDraft, setResumeDraft] = useState(pro.resumeSummary || '');
  const [headlineDraft, setHeadlineDraft] = useState(pro.headline || '');
  const [expRole, setExpRole] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expSummary, setExpSummary] = useState('');
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduEnd, setEduEnd] = useState('');
  const [careerGoalsDraft, setCareerGoalsDraft] = useState(pro.careerGoals || '');
  const [industryInterestDraft, setIndustryInterestDraft] = useState('');
  const [experienceLevelDraft, setExperienceLevelDraft] = useState(pro.experienceLevel || '');
  const [smartSummaryDraft, setSmartSummaryDraft] = useState(pro.smartSummary || '');
  const [smartPositioningDraft, setSmartPositioningDraft] = useState(pro.smartPositioning || '');
  const [smartSuggestedSkillsDraft, setSmartSuggestedSkillsDraft] = useState<string[]>(pro.smartSuggestedSkills || []);
  const [aiSmartBusy, setAiSmartBusy] = useState<null | 'rewrite' | 'skills' | 'positioning'>(null);
  const canUseAI = hasTier('pro');
  const canSeeAnalytics = isOwnProfile && hasTier('pro');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'professional' | 'photos'>(mode === 'professional' ? 'professional' : 'posts');
  const collabSectionRef = useRef<HTMLDivElement | null>(null);
  const [jumpToCollab, setJumpToCollab] = useState(false);

  useEffect(() => {
    if (isOwnProfile) return;
    try {
      const raw = localStorage.getItem(`faceme:connections:${effectiveUserId}`);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setIsConnected(Array.isArray(ids) ? ids.includes(viewedUserId) : false);
    } catch {
      setIsConnected(false);
    }
  }, [effectiveUserId, isOwnProfile, viewedUserId]);

  useEffect(() => {
    if (isOwnProfile) {
      setFollowerCount(user?.followers || 0);

      try {
        const key = `faceme:connections:${effectiveUserId}`;
        const raw = localStorage.getItem(key);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        setConnectionCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setConnectionCount(0);
      }
      return;
    }
    setFollowerCount(0);
    setConnectionCount(0);
  }, [isOwnProfile, user?.followers, user?.isFollowing, viewedUserId]);

  useEffect(() => {
    if (isOwnProfile) return;
    try {
      const key = `faceme:profile_views:${viewedUserId}`;
      const raw = localStorage.getItem(key);
      const n = raw ? parseInt(raw, 10) || 0 : 0;
      localStorage.setItem(key, String(n + 1));
    } catch {
    }
  }, [isOwnProfile, viewedUserId]);

  const profileViews = useMemo(() => {
    try {
      const key = `faceme:profile_views:${effectiveUserId}`;
      const raw = localStorage.getItem(key);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }, [effectiveUserId]);

  const myPostAnalytics = useMemo(() => {
    const mine = posts.filter((p) => p.userId === effectiveUserId);
    const totalPosts = mine.length;
    const totalLikes = mine.reduce((a, p) => a + (p.likes || 0), 0);
    const totalComments = mine.reduce((a, p) => a + (Array.isArray(p.comments) ? p.comments.length : 0), 0);
    const totalShares = mine.reduce((a, p) => a + (p.shares || 0), 0);
    const engagement = totalLikes + totalComments + totalShares;
    const avgEngagement = totalPosts > 0 ? Math.round((engagement / totalPosts) * 10) / 10 : 0;
    const topPost = mine
      .slice()
      .sort((a, b) => ((b.likes || 0) + (b.comments?.length || 0) + (b.shares || 0)) - ((a.likes || 0) + (a.comments?.length || 0) + (a.shares || 0)))
      [0];
    return { totalPosts, totalLikes, totalComments, totalShares, engagement, avgEngagement, topPost };
  }, [posts, effectiveUserId]);

  useEffect(() => {
    if (activeTab === 'professional' && jumpToCollab && collabSectionRef.current) {
      collabSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setJumpToCollab(false);
    }
  }, [activeTab, jumpToCollab]);

  useEffect(() => {
    setHeadlineDraft(pro.headline || '');
  }, [pro.headline]);

  useEffect(() => {
    setCareerGoalsDraft(pro.careerGoals || '');
  }, [pro.careerGoals]);

  useEffect(() => {
    setExperienceLevelDraft(pro.experienceLevel || '');
  }, [pro.experienceLevel]);

  useEffect(() => {
    setSmartSummaryDraft(pro.smartSummary || '');
  }, [pro.smartSummary]);

  useEffect(() => {
    setSmartPositioningDraft(pro.smartPositioning || '');
  }, [pro.smartPositioning]);

  useEffect(() => {
    setSmartSuggestedSkillsDraft(pro.smartSuggestedSkills || []);
  }, [pro.smartSuggestedSkills]);

  const addIndustryInterest = async () => {
    const v = industryInterestDraft.trim();
    if (!v) return;
    const next = Array.from(new Set([...(pro.industryInterests || []), v]));
    setIndustryInterestDraft('');
    await saveProfessional({ ...pro, industryInterests: next });
  };

  const removeIndustryInterest = async (value: string) => {
    const next = (pro.industryInterests || []).filter((x) => x !== value);
    await saveProfessional({ ...pro, industryInterests: next });
  };

  const aiRewriteProfessionally = async () => {
    if (!isOwnProfile) return;
    if (!canUseAI) {
      toast({ title: 'Upgrade needed', description: 'AI tools are available on Pro and above.' });
      return;
    }
    setAiSmartBusy('rewrite');
    try {
      const input = `Rewrite this user's Smart Profile professionally (clear, concise, no hype).\n\nSkills: ${(pro.skills || []).join(', ')}\nCareer goals: ${careerGoalsDraft || '(none)'}\nIndustry interests: ${(pro.industryInterests || []).join(', ') || '(none)'}\nExperience level: ${experienceLevelDraft || '(unspecified)'}\n\nOutput 2 short paragraphs max (no headings, no bullets).`;
      const rewritten = await deepseekReply(input);
      setSmartSummaryDraft(rewritten);
      await saveProfessional({ ...pro, careerGoals: careerGoalsDraft, experienceLevel: experienceLevelDraft as any, smartSummary: rewritten });
    } catch {
      toast({ title: 'AI unavailable', description: 'Could not rewrite right now. Try again in a moment.' });
    } finally {
      setAiSmartBusy(null);
    }
  };

  const aiSuggestMissingSkills = async () => {
    if (!isOwnProfile) return;
    if (!canUseAI) {
      toast({ title: 'Upgrade needed', description: 'AI tools are available on Pro and above.' });
      return;
    }
    setAiSmartBusy('skills');
    try {
      const input = `Suggest 6 to 10 missing skills that would strengthen this profile for the stated career goals and industry interests.\n\nCurrent skills: ${(pro.skills || []).join(', ') || '(none)'}\nCareer goals: ${careerGoalsDraft || '(none)'}\nIndustry interests: ${(pro.industryInterests || []).join(', ') || '(none)'}\nExperience level: ${experienceLevelDraft || '(unspecified)'}\n\nReturn ONLY a comma-separated list of skills. No extra text.`;
      const raw = await deepseekReply(input);
      const list = raw
        .split(/,|\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      const unique = Array.from(new Set(list));
      setSmartSuggestedSkillsDraft(unique);
      await saveProfessional({ ...pro, careerGoals: careerGoalsDraft, experienceLevel: experienceLevelDraft as any, smartSuggestedSkills: unique });
    } catch {
      toast({ title: 'AI unavailable', description: 'Could not suggest skills right now. Try again later.' });
    } finally {
      setAiSmartBusy(null);
    }
  };

  const aiCareerPositioning = async () => {
    if (!isOwnProfile) return;
    if (!canUseAI) {
      toast({ title: 'Upgrade needed', description: 'AI tools are available on Pro and above.' });
      return;
    }
    setAiSmartBusy('positioning');
    try {
      const input = `Write one sentence that positions this user for specific roles (not generic jobs).\nFormat like: "You are well positioned for junior data analyst roles in fintech."\n\nUse this info:\nSkills: ${(pro.skills || []).join(', ') || '(none)'}\nCareer goals: ${careerGoalsDraft || '(none)'}\nIndustry interests: ${(pro.industryInterests || []).join(', ') || '(none)'}\nExperience level: ${experienceLevelDraft || '(unspecified)'}\n\nReturn ONLY the sentence.`;
      const line = (await deepseekReply(input)).trim();
      setSmartPositioningDraft(line);
      await saveProfessional({ ...pro, careerGoals: careerGoalsDraft, experienceLevel: experienceLevelDraft as any, smartPositioning: line });
    } catch {
      toast({ title: 'AI unavailable', description: 'Could not generate positioning right now. Try again later.' });
    } finally {
      setAiSmartBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-14 md:pt-20 px-3 sm:px-4 pb-20 md:pb-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-4 md:mb-6 overflow-hidden rounded-2xl border border-border/60 shadow-none">
            {/* Cover Photo */}
            <div className="relative h-24 sm:h-28 md:h-40 lg:h-44">
              {user?.coverPhoto ? (
                <img
                  src={user.coverPhoto}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted/40" />
              )}
            </div>
            
            <CardContent className="relative pt-0 pb-4 md:pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-6">
                <div className="relative z-10 -mt-10 sm:-mt-12 md:-mt-16">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 ring-2 ring-border bg-muted">
                    <AvatarImage src={viewedUser?.avatar} alt={viewedUser?.name} />
                    <AvatarFallback className="bg-muted text-foreground text-2xl font-semibold flex items-center justify-center">
                      {(viewedUser?.name && viewedUser.name.charAt(0))
                        || (viewedUser?.email && viewedUser.email.charAt(0).toUpperCase())
                        || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {addons?.verified && (
                    <span className="md:hidden absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                      <CheckCircle className="h-4 w-4 text-foreground/70" />
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-left pt-1 sm:pt-4">
                  <div className="flex flex-wrap items-center justify-start gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{viewedUser?.name}</h1>
                    <IdentityVerifiedBadge />
                    {currentTier !== 'free' && (
                      <Badge variant="secondary" className="ml-1">
                        {currentTier.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {pro.headline ? (
                    <div className="text-sm md:text-base font-medium text-foreground/90 mb-2 break-words">
                      {pro.headline}
                    </div>
                  ) : null}

                  <p className="text-muted-foreground text-sm leading-relaxed mb-3 break-words">{user?.bio}</p>

                  {/* Interests */}
                  {user?.interests && user.interests.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-2 mb-3 justify-start">
                      {user.interests.map((interest) => (
                        <Badge key={interest} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-start gap-3 text-xs sm:text-sm text-muted-foreground">
                    {viewedUser?.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {viewedUser.location}
                      </div>
                    )}
                    {viewedUser?.joinedDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Joined {formatDistanceToNow(viewedUser.joinedDate, { addSuffix: true })}
                      </div>
                    )}
                    {viewedUser?.website && (
                      <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 mr-1" />
                        <a href={`https://${viewedUser.website}`} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline">
                          {viewedUser.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto items-center gap-2 sm:ml-auto flex-shrink-0 mt-1 sm:mt-0">
                  {isOwnProfile ? (
                    <Button
                      onClick={() => setIsEditModalOpen(true)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex w-full sm:w-auto items-center gap-2">
                      <AnimatePresence mode="wait">
                        {!isConnected ? (
                          <motion.div
                            key="connect"
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.22 }}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => {
                                try {
                                  const key = `faceme:connections:${effectiveUserId}`;
                                  const raw = localStorage.getItem(key);
                                  const ids = raw ? (JSON.parse(raw) as string[]) : [];
                                  const next = Array.isArray(ids) ? Array.from(new Set([...ids, viewedUserId])) : [viewedUserId];
                                  localStorage.setItem(key, JSON.stringify(next));
                                  setConnectionCount(next.length);
                                } catch {}
                                setIsConnected(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Connect
                            </Button>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-2 sm:flex sm:justify-start sm:space-x-8 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t"
              >
                <div className="text-center cursor-pointer hover:bg-muted/30 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg transition-colors">
                  <p className="text-base sm:text-2xl font-bold">{userPosts.length}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Posts</p>
                </div>

                <div className="text-center cursor-pointer hover:bg-muted/30 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg transition-colors">
                  <p className="text-base sm:text-2xl font-bold">{connectionCount}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Connections</p>
                </div>

                <div className="text-center cursor-pointer hover:bg-muted/30 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg transition-colors">
                  <p className="text-base sm:text-2xl font-bold">{followerCount}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Followers</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {canSeeAnalytics ? (
          <Card className="mb-4 md:mb-6 rounded-2xl border border-border/60 shadow-none">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold">Analytics</h2>
                <Badge variant="outline" className="text-[10px]">PRO+</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Profile views</div>
                  <div className="mt-1 text-2xl font-semibold">{profileViews}</div>
                  <div className="mt-1 text-xs text-muted-foreground">From local activity (device-based)</div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Post engagement</div>
                  <div className="mt-1 text-2xl font-semibold">{myPostAnalytics.engagement}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {myPostAnalytics.totalLikes} likes · {myPostAnalytics.totalComments} comments · {myPostAnalytics.totalShares} shares
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Average per post</div>
                  <div className="mt-1 text-2xl font-semibold">{myPostAnalytics.avgEngagement}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Across {myPostAnalytics.totalPosts} posts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {(pro.headline || pro.bio || pro.location || (pro.skills && pro.skills.length) || (pro.experience && pro.experience.length) || (pro.education && pro.education.length) || (pro.links && pro.links.length)) && (
          <Card className="mb-4 md:mb-6 rounded-2xl border border-border/60 shadow-none">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold">Professional</h2>
                <Badge variant="outline" className="text-[10px]">LinkedIn style</Badge>
              </div>

              <div className="space-y-3">
                {pro.headline && (
                  <div className="text-sm font-medium text-foreground">{pro.headline}</div>
                )}

                {pro.location && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{pro.location}</span>
                  </div>
                )}

                {(pro.experience && pro.experience.length > 0) && (
                  <div className="rounded-xl border bg-card p-3">
                    <div className="text-xs font-semibold mb-1">Experience</div>
                    <div className="text-xs text-muted-foreground">
                      {pro.experience[0]?.role}{pro.experience[0]?.company ? ` · ${pro.experience[0].company}` : ''}
                    </div>
                  </div>
                )}

                {(pro.education && pro.education.length > 0) && (
                  <div className="rounded-xl border bg-card p-3">
                    <div className="text-xs font-semibold mb-1">Education</div>
                    <div className="text-xs text-muted-foreground">
                      {pro.education[0]?.institution}{pro.education[0]?.degree ? ` · ${pro.education[0].degree}` : ''}
                    </div>
                  </div>
                )}

                {(pro.skills && pro.skills.length > 0) && (
                  <div>
                    <div className="text-xs font-semibold mb-2">Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {pro.skills.slice(0, 12).map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            setMode('professional');
                            navigate(`/feed?skill=${encodeURIComponent(s)}`);
                          }}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(pro.links && pro.links.length > 0) && (
                  <div>
                    <div className="text-xs font-semibold mb-2">Links</div>
                    <div className="flex flex-col gap-1">
                      {pro.links.slice(0, 4).map((l, i) => (
                        <a
                          key={i}
                          className="text-xs text-primary hover:underline truncate"
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {l.type}: {l.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap rounded-none bg-transparent p-0 border-b border-border/60">
            <TabsTrigger
              value="posts"
              className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground"
            >
              Smart Profile
            </TabsTrigger>
            <TabsTrigger
              value="professional"
              className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground"
            >
              Professional
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground"
            >
              Media
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-6 space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))
            ) : (
              <Card className="rounded-2xl border border-border/60 shadow-none">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No posts yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="professional" className="mt-6">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardContent className="py-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>Headline</span>
                      </h3>
                      {isOwnProfile ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Input
                            value={headlineDraft}
                            onChange={(e) => setHeadlineDraft(e.target.value)}
                            placeholder="e.g. Frontend Developer · React · UI Systems"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await saveProfessional({ ...pro, headline: headlineDraft });
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{pro.headline || 'Add a headline to showcase your role'}</p>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>Bio</span>
                      </h3>
                      <p className="text-muted-foreground">{pro.bio || 'Tell others about your professional background'}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Location</span>
                      </h3>
                      <p className="text-muted-foreground">{pro.location || 'Set your location'}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Links</span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(pro.links || []).length ? (
                          pro.links!.map((l, i) => (
                            <a key={i} className="text-sm text-primary hover:underline" href={l.url} target="_blank" rel="noreferrer">{l.type}: {l.url}</a>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No links yet</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold mb-1 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span>Professional Groups</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">Join industry-focused groups for discussions and collaboration.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => navigate('/groups/pro')}
                      >
                        View groups
                      </Button>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <h3 className="font-semibold mb-1 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span>Experience</span>
                        </h3>
                        <div className="space-y-2">
                          {(pro.experience || []).length ? (
                            pro.experience!.map((e, idx) => (
                              <div key={idx} className="p-3 border rounded-lg bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <div className="font-medium text-sm">{e.role || 'Role'}</div>
                                  <div className="text-xs text-muted-foreground">{e.company || 'Company'}{(e.start || e.end) && ` • ${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}`}</div>
                                  {e.summary && (
                                    <div className="text-xs text-muted-foreground mt-1">{e.summary}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {e.verified && <Badge variant="outline" className="text-[10px]">Verified</Badge>}
                                  {isOwnProfile && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px]"
                                      onClick={async () => {
                                        const list = [...(pro.experience || [])];
                                        list[idx] = { ...list[idx], verified: !list[idx].verified };
                                        await saveProfessional({ ...pro, experience: list });
                                      }}
                                    >
                                      {e.verified ? 'Unverify' : 'Verify (dev)'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Add roles you want to highlight.</p>
                          )}
                        </div>
                      </div>

                      {isOwnProfile && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="Role" value={expRole} onChange={(e) => setExpRole(e.target.value)} />
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="Company" value={expCompany} onChange={(e) => setExpCompany(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="Start (e.g. 2022)" value={expStart} onChange={(e) => setExpStart(e.target.value)} />
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="End (or Present)" value={expEnd} onChange={(e) => setExpEnd(e.target.value)} />
                          </div>
                          <textarea
                            className="w-full min-h-[50px] px-2 py-1 border rounded text-xs bg-transparent"
                            placeholder="Short summary (optional)"
                            value={expSummary}
                            onChange={(e) => setExpSummary(e.target.value)}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!expRole.trim() || !expCompany.trim()) return;
                                const next = {
                                  role: expRole.trim(),
                                  company: expCompany.trim(),
                                  start: expStart.trim() || undefined,
                                  end: expEnd.trim() || undefined,
                                  summary: expSummary.trim() || undefined,
                                  verified: false,
                                };
                                const list = [...(pro.experience || []), next];
                                await saveProfessional({ ...pro, experience: list });
                                setExpRole(''); setExpCompany(''); setExpStart(''); setExpEnd(''); setExpSummary('');
                              }}
                            >
                              Add experience
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <h3 className="font-semibold mb-1 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>Education</span>
                        </h3>
                        <div className="space-y-2">
                          {(pro.education || []).length ? (
                            pro.education!.map((e, idx) => (
                              <div key={idx} className="p-3 border rounded-lg bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <div className="font-medium text-sm">{e.institution || 'Institution'}</div>
                                  <div className="text-xs text-muted-foreground">{e.degree || 'Degree'}{e.field ? ` • ${e.field}` : ''}{(e.start || e.end) && ` • ${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}`}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {e.verified && <Badge variant="outline" className="text-[10px]">Verified</Badge>}
                                  {isOwnProfile && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px]"
                                      onClick={async () => {
                                        const list = [...(pro.education || [])];
                                        list[idx] = { ...list[idx], verified: !list[idx].verified };
                                        await saveProfessional({ ...pro, education: list });
                                      }}
                                    >
                                      {e.verified ? 'Unverify' : 'Verify (dev)'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Add education you want to highlight.</p>
                          )}
                        </div>
                      </div>

                      {isOwnProfile && (
                        <div className="space-y-2">
                          <input className="w-full px-2 py-1 border rounded text-xs bg-transparent" placeholder="Institution" value={eduInstitution} onChange={(e) => setEduInstitution(e.target.value)} />
                          <div className="grid grid-cols-2 gap-2">
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="Degree" value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} />
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="Field of study" value={eduField} onChange={(e) => setEduField(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="Start (e.g. 2019)" value={eduStart} onChange={(e) => setEduStart(e.target.value)} />
                            <input className="px-2 py-1 border rounded text-xs bg-transparent" placeholder="End (or Present)" value={eduEnd} onChange={(e) => setEduEnd(e.target.value)} />
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!eduInstitution.trim()) return;
                                const next = {
                                  institution: eduInstitution.trim(),
                                  degree: eduDegree.trim() || undefined,
                                  field: eduField.trim() || undefined,
                                  start: eduStart.trim() || undefined,
                                  end: eduEnd.trim() || undefined,
                                  verified: false,
                                };
                                const list = [...(pro.education || []), next];
                                await saveProfessional({ ...pro, education: list });
                                setEduInstitution(''); setEduDegree(''); setEduField(''); setEduStart(''); setEduEnd('');
                              }}
                            >
                              Add education
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Skills & Endorsements</span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(pro.skills || []).length ? (
                          pro.skills!.map((s) => (
                            <div key={s} className="flex items-center gap-2 border rounded-full px-3 py-1 cursor-pointer hover:bg-muted/60" onClick={() => {
                              setMode('professional');
                              navigate(`/feed?skill=${encodeURIComponent(s)}`);
                            }}>
                              <span className="text-sm">{s}</span>
                              <button
                                className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  endorseSkill(s);
                                }}
                              >
                                Endorse
                              </button>
                              <span className="text-xs text-muted-foreground">{pro.endorsements?.[s] || 0}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">Add skills to get endorsements</p>
                        )}
                      </div>
                      {isOwnProfile && (
                        <div className="mt-3 flex gap-2">
                          <input className="px-3 py-2 border rounded w-48 bg-transparent" placeholder="Add a skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
                          <Button
                            onClick={async () => {
                              const skill = newSkill.trim();
                              if (!skill) return;
                              const nextSkills = Array.from(new Set([...(pro.skills || []), skill]));
                              await saveProfessional({ ...pro, skills: nextSkills });
                              setNewSkill('');
                            }}
                            variant="outline"
                          >Add</Button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold mb-1 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>AI Resume &amp; Skill Builder</span>
                          </h3>
                          <p className="text-xs text-muted-foreground">Create a short professional summary based on your headline, bio, and skills.</p>
                        </div>
                        {pro.resumeSummary && (
                          <Badge variant="outline" className="text-[10px]">Saved</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <textarea
                          className="w-full min-h-[80px] px-3 py-2 border rounded text-sm bg-transparent"
                          placeholder="Use the generator or write a brief summary of your experience, focus areas, and skills."
                          value={resumeDraft}
                          onChange={(e) => setResumeDraft(e.target.value)}
                        />
                        <div className="flex justify-between items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const parts: string[] = [];
                              if (pro.headline) parts.push(pro.headline);
                              if (pro.bio) parts.push(pro.bio);
                              if (pro.skills && pro.skills.length) {
                                parts.push(`Key skills: ${pro.skills.join(', ')}`);
                              }
                              const text = parts.length
                                ? parts.join(' • ')
                                : 'Professional summary generated from your profile. Add your role, key projects, and skills.';
                              setResumeDraft(text);
                            }}
                          >
                            Generate from profile
                          </Button>
                          {isOwnProfile && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                await saveProfessional({ ...pro, resumeSummary: resumeDraft });
                              }}
                            >
                              Save summary
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div ref={collabSectionRef} className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold mb-1">Open to creative collabs</h3>
                          <p className="text-xs text-muted-foreground">Signal that you're interested in collaborating with creators and communities.</p>
                        </div>
                        <button
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${pro.openToCollab ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
                          onClick={async () => {
                            await saveProfessional({ ...pro, openToCollab: !pro.openToCollab });
                          }}
                        >
                          {pro.openToCollab ? 'Open' : 'Closed'}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Collab note (optional)</p>
                        <textarea
                          className="w-full min-h-[60px] px-3 py-2 border rounded text-sm bg-transparent"
                          placeholder="E.g. short-form video, brand design, storytelling collabs..."
                          value={collabNoteDraft}
                          onChange={(e) => {
                            setCollabNoteDraft(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    {isOwnProfile && (
                      <div className="pt-2 border-t">
                        <Button
                          onClick={async () => {
                            await saveProfessional(pro);
                          }}
                        >Save Professional Profile</Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="about" className="mt-6">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardContent className="py-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Smart Profile</div>
                    <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      A professional snapshot focused on skills, goals, and career direction.
                    </div>
                  </div>
                  {isOwnProfile ? (
                    <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={aiSmartBusy !== null}
                        onClick={aiRewriteProfessionally}
                        className="w-full sm:w-auto"
                      >
                        {aiSmartBusy === 'rewrite' ? 'Rewriting…' : 'Rewrite professionally'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={aiSmartBusy !== null}
                        onClick={aiCareerPositioning}
                        className="w-full sm:w-auto"
                      >
                        {aiSmartBusy === 'positioning' ? 'Working…' : 'Career positioning'}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {smartPositioningDraft ? (
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                    <div className="text-muted-foreground">{smartPositioningDraft}</div>
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {(pro.skills || []).length ? (
                        pro.skills!.slice(0, 20).map((s) => (
                          <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => {
                            setMode('professional');
                            navigate(`/feed?skill=${encodeURIComponent(s)}`);
                          }}>
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No skills added yet.</div>
                      )}
                    </div>

                    {isOwnProfile ? (
                      <div className="pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={aiSmartBusy !== null}
                          onClick={aiSuggestMissingSkills}
                          className="w-full sm:w-auto"
                        >
                          {aiSmartBusy === 'skills' ? 'Suggesting…' : 'Suggest missing skills'}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Career goals</div>
                      {isOwnProfile ? (
                        <textarea
                          className="w-full min-h-[84px] px-3 py-2 border rounded-xl text-sm bg-transparent"
                          placeholder="E.g. Move into junior data analyst roles in fintech; build strong SQL + dashboarding skills."
                          value={careerGoalsDraft}
                          onChange={(e) => setCareerGoalsDraft(e.target.value)}
                          onBlur={async () => {
                            await saveProfessional({ ...pro, careerGoals: careerGoalsDraft });
                          }}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground leading-relaxed">{pro.careerGoals || 'Not specified.'}</div>
                      )}
                    </div>

                    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry interests</div>
                      <div className="flex flex-wrap gap-2">
                        {(pro.industryInterests || []).length ? (
                          (pro.industryInterests || []).map((x) => (
                            <Badge
                              key={x}
                              variant="outline"
                              className={isOwnProfile ? 'cursor-pointer' : ''}
                              onClick={async () => {
                                if (!isOwnProfile) return;
                                await removeIndustryInterest(x);
                              }}
                            >
                              {x}{isOwnProfile ? ' ×' : ''}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">Not specified.</div>
                        )}
                      </div>
                      {isOwnProfile ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Input
                            value={industryInterestDraft}
                            onChange={(e) => setIndustryInterestDraft(e.target.value)}
                            placeholder="Add an industry (e.g. fintech)"
                            className="h-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addIndustryInterest();
                              }
                            }}
                          />
                          <Button type="button" size="sm" variant="outline" onClick={addIndustryInterest} className="w-full sm:w-auto">
                            Add
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Experience level</div>
                      {isOwnProfile ? (
                        <select
                          className="w-full h-10 px-3 border rounded-xl bg-transparent text-sm"
                          value={experienceLevelDraft}
                          onChange={async (e) => {
                            const v = e.target.value;
                            setExperienceLevelDraft(v);
                            await saveProfessional({ ...pro, experienceLevel: v as any });
                          }}
                        >
                          <option value="">Select…</option>
                          <option value="student">Student</option>
                          <option value="entry">Entry</option>
                          <option value="junior">Junior</option>
                          <option value="mid">Mid</option>
                          <option value="senior">Senior</option>
                          <option value="lead">Lead</option>
                          <option value="executive">Executive</option>
                          <option value="career_switcher">Career switcher</option>
                        </select>
                      ) : (
                        <div className="text-sm text-muted-foreground">{pro.experienceLevel || 'Not specified.'}</div>
                      )}
                    </div>
                  </div>
                </div>

                {isOwnProfile && smartSuggestedSkillsDraft.length ? (
                  <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested skills</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {smartSuggestedSkillsDraft.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="text-xs rounded-full border border-border/60 bg-background px-3 py-1 hover:bg-muted/30"
                          onClick={async () => {
                            const nextSkills = Array.from(new Set([...(pro.skills || []), s]));
                            await saveProfessional({ ...pro, skills: nextSkills });
                          }}
                          title="Add to skills"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {smartSummaryDraft ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Professional summary</div>
                    {isOwnProfile ? (
                      <textarea
                        className="w-full min-h-[110px] px-3 py-2 border rounded-xl text-sm bg-transparent"
                        value={smartSummaryDraft}
                        onChange={(e) => setSmartSummaryDraft(e.target.value)}
                        onBlur={async () => {
                          await saveProfessional({ ...pro, smartSummary: smartSummaryDraft });
                        }}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{smartSummaryDraft}</div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="photos" className="mt-6">
            <Card>
              <CardContent className="py-6">
                <div className="grid grid-cols-3 gap-2">
                  {userPosts
                    .filter(post => post.image)
                    .map((post) => (
                      <div key={post.id} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <img
                          src={post.image}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                </div>
                {userPosts.filter(post => post.image).length === 0 && (
                  <p className="text-center text-muted-foreground py-6">No photos yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
}