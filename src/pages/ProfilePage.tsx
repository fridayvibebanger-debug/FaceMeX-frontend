import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Calendar,
  Link as LinkIcon,
  UserPlus,
  UserMinus,
  Settings,
  CheckCircle,
  Briefcase,
  FileText,
  Sparkles,
  MessageCircle,
  Save,
} from 'lucide-react';
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
import { toast } from '@/components/ui/use-toast';

type ProfessionalProfile = {
  headline: string;
  bio: string;
  location: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    start?: string;
    end?: string;
    summary?: string;
    verified?: boolean;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    field?: string;
    start?: string;
    end?: string;
    verified?: boolean;
  }>;
  links: Array<{
    type: string;
    url: string;
  }>;
  endorsements: Record<string, number>;
  openToCollab: boolean;
  collabNote: string;
  resumeSummary: string;
};

const emptyProfessional: ProfessionalProfile = {
  headline: '',
  bio: '',
  location: '',
  skills: [],
  experience: [],
  education: [],
  links: [],
  endorsements: {},
  openToCollab: false,
  collabNote: '',
  resumeSummary: '',
};

function normalizePro(value: any): ProfessionalProfile {
  const experience = Array.isArray(value?.experience)
    ? value.experience
        .filter((item: any) => item?.role || item?.company)
        .map((item: any) => ({
          role: String(item.role || 'Role'),
          company: String(item.company || 'Company'),
          start: item.start || undefined,
          end: item.end || undefined,
          summary: item.summary || undefined,
          verified: Boolean(item.verified),
        }))
    : [];

  const education = Array.isArray(value?.education)
    ? value.education
        .filter((item: any) => item?.institution)
        .map((item: any) => ({
          institution: String(item.institution || 'Institution'),
          degree: item.degree || undefined,
          field: item.field || undefined,
          start: item.start || undefined,
          end: item.end || undefined,
          verified: Boolean(item.verified),
        }))
    : [];

  return {
    ...emptyProfessional,
    ...(value || {}),
    skills: Array.isArray(value?.skills) ? value.skills : [],
    experience,
    education,
    links: Array.isArray(value?.links) ? value.links : [],
    endorsements: value?.endorsements || {},
  };
}

function getInitial(name?: string, email?: string) {
  return name?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || 'U';
}

function getTierRank(tier?: string) {
  const clean = String(tier || 'free').toLowerCase();

  const ranks: Record<string, number> = {
    free: 0,
    verified: 0,
    pro: 1,
    creator: 2,
    business: 3,
    exclusive: 4,
  };

  return ranks[clean] || 0;
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore() as any;
  const { posts } = usePostStore();
  const { currentTier } = useSubscriptionStore();

  const {
    professional,
    saveProfessional,
    endorseSkill,
    setMode,
    addons,
    mode,
    hasTier,
  } = useUserStore();

  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const effectiveUserId = user?.id || '';
  const viewedUserId = params.id || effectiveUserId;
  const isOwnProfile = viewedUserId === effectiveUserId;

  const [viewedProfile, setViewedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPendingConnection, setIsPendingConnection] = useState(false);
  const [buttonBusy, setButtonBusy] = useState<'connect' | 'follow' | 'message' | null>(null);

  const [bioEditing, setBioEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(user?.bio || '');

  const storePro = useMemo(() => normalizePro(professional), [professional]);

  const viewedPro = useMemo(() => {
    if (isOwnProfile) return normalizePro(viewedProfile?.professional || professional);
    return normalizePro(viewedProfile?.professional);
  }, [isOwnProfile, professional, viewedProfile?.professional]);

  const [newSkill, setNewSkill] = useState('');
  const [headlineDraft, setHeadlineDraft] = useState(viewedPro.headline || '');
  const [professionalBioDraft, setProfessionalBioDraft] = useState(viewedPro.bio || '');
  const [professionalLocationDraft, setProfessionalLocationDraft] = useState(viewedPro.location || '');
  const [resumeDraft, setResumeDraft] = useState(viewedPro.resumeSummary || '');

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

  const collabSectionRef = useRef<HTMLDivElement | null>(null);

  const canUseProfessionalProfile =
    hasTier?.('creator') ||
    getTierRank(currentTier) >= getTierRank('creator') ||
    getTierRank(user?.tier) >= getTierRank('creator');

  const canEditProfessional = isOwnProfile && canUseProfessionalProfile;
  const canSeeAnalytics = isOwnProfile && hasTier?.('pro');

  const [activeTab, setActiveTab] = useState<'posts' | 'professional' | 'photos'>(
    mode === 'professional' ? 'professional' : 'posts'
  );

  useEffect(() => {
    const loadProfile = async () => {
      if (!viewedUserId) {
        setProfileLoading(false);
        setProfileMissing(true);
        return;
      }

      setProfileLoading(true);
      setProfileMissing(false);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewedUserId)
        .maybeSingle();

      if (error) {
        setViewedProfile(null);
        setProfileMissing(true);
        setProfileLoading(false);
        return;
      }

      setViewedProfile(data || null);
      setProfileMissing(!data && !isOwnProfile);
      setProfileLoading(false);
    };

    loadProfile();
  }, [viewedUserId, isOwnProfile]);

  const viewedUser = useMemo(() => {
    if (isOwnProfile) {
      if (!user && !viewedProfile) return null;

      return {
        id: viewedProfile?.id || user?.id || viewedUserId,
        email: viewedProfile?.email || user?.email || '',
        name:
          viewedProfile?.full_name ||
          viewedProfile?.name ||
          viewedProfile?.username ||
          user?.name ||
          user?.email?.split('@')?.[0] ||
          '',
        avatar:
          viewedProfile?.avatar_url ||
          viewedProfile?.avatar ||
          user?.avatar ||
          '',
        coverPhoto:
          viewedProfile?.cover_photo ||
          viewedProfile?.coverPhoto ||
          user?.coverPhoto ||
          '',
        bio: viewedProfile?.bio || user?.bio || '',
        joinedDate: viewedProfile?.created_at
          ? new Date(viewedProfile.created_at)
          : user?.joinedDate
            ? new Date(user.joinedDate)
            : null,
        interests: viewedProfile?.interests || user?.interests || [],
        location: viewedProfile?.location || user?.location || '',
        website: viewedProfile?.website || user?.website || '',
        tier:
          viewedProfile?.tier ||
          viewedProfile?.subscription_tier ||
          user?.tier ||
          currentTier ||
          'free',
        verified:
          viewedProfile?.verified === true ||
          viewedProfile?.is_verified === true ||
          user?.verified === true ||
          user?.is_verified === true ||
          addons?.verified === true,
      } as any;
    }

    if (!viewedProfile) return null;

    const realName =
      viewedProfile.full_name ||
      viewedProfile.name ||
      viewedProfile.username ||
      viewedProfile.email?.split('@')?.[0] ||
      '';

    return {
      id: viewedProfile.id || viewedUserId,
      email: viewedProfile.email || '',
      name: realName,
      avatar: viewedProfile.avatar_url || viewedProfile.avatar || '',
      coverPhoto: viewedProfile.cover_photo || viewedProfile.coverPhoto || '',
      bio: viewedProfile.bio || '',
      joinedDate: viewedProfile.created_at ? new Date(viewedProfile.created_at) : null,
      interests: viewedProfile.interests || [],
      location: viewedProfile.location || '',
      website: viewedProfile.website || '',
      tier: viewedProfile.tier || viewedProfile.subscription_tier || 'free',
      verified: viewedProfile.verified === true || viewedProfile.is_verified === true,
    } as any;
  }, [isOwnProfile, user, viewedUserId, viewedProfile, currentTier, addons?.verified]);

  const isProfileVerified =
    viewedUser?.verified === true ||
    viewedProfile?.verified === true ||
    viewedProfile?.is_verified === true ||
    addons?.verified === true;

  useEffect(() => {
    setBioDraft(viewedUser?.bio || '');
  }, [viewedUser?.bio]);

  useEffect(() => {
    setHeadlineDraft(viewedPro.headline || '');
    setProfessionalBioDraft(viewedPro.bio || '');
    setProfessionalLocationDraft(viewedPro.location || '');
    setResumeDraft(viewedPro.resumeSummary || '');
  }, [viewedPro.headline, viewedPro.bio, viewedPro.location, viewedPro.resumeSummary]);

  const userPosts = useMemo(() => {
    return posts.filter((post: any) => {
      return post.userId === viewedUserId || post.user_id === viewedUserId;
    });
  }, [posts, viewedUserId]);

  const loadProfileRelationships = async () => {
    if (!viewedUserId) return;

    try {
      const [followersResult, connectionsResult] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', viewedUserId),

        supabase
          .from('connection_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`sender_id.eq.${viewedUserId},receiver_id.eq.${viewedUserId}`),
      ]);

      setFollowerCount(followersResult.count || 0);
      setConnectionCount(connectionsResult.count || 0);

      if (!effectiveUserId || isOwnProfile) return;

      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', effectiveUserId)
        .eq('following_id', viewedUserId)
        .maybeSingle();

      setIsFollowing(Boolean(followData));

      const { data: connectionRows } = await supabase
        .from('connection_requests')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${effectiveUserId},receiver_id.eq.${effectiveUserId}`);

      const connection = (connectionRows || []).find((row: any) => {
        return (
          (row.sender_id === effectiveUserId && row.receiver_id === viewedUserId) ||
          (row.sender_id === viewedUserId && row.receiver_id === effectiveUserId)
        );
      });

      setIsConnected(connection?.status === 'accepted');
      setIsPendingConnection(connection?.status === 'pending');
    } catch {
      // keep UI stable
    }
  };

  useEffect(() => {
    if (!viewedUserId) return;

    loadProfileRelationships();

    const channel = supabase
      .channel(`profile-relationship-${viewedUserId}-${effectiveUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () =>
        loadProfileRelationships()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connection_requests' },
        () => loadProfileRelationships()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewedUserId, effectiveUserId, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile) return;

    try {
      const key = `faceme:profile_views:${viewedUserId}`;
      const raw = localStorage.getItem(key);
      const n = raw ? parseInt(raw, 10) || 0 : 0;
      localStorage.setItem(key, String(n + 1));
    } catch {}
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
    const mine = posts.filter((p: any) => {
      return p.userId === effectiveUserId || p.user_id === effectiveUserId;
    });

    const totalPosts = mine.length;
    const totalLikes = mine.reduce((a: number, p: any) => a + (p.likes || 0), 0);
    const totalComments = mine.reduce(
      (a: number, p: any) => a + (Array.isArray(p.comments) ? p.comments.length : 0),
      0
    );
    const totalShares = mine.reduce((a: number, p: any) => a + (p.shares || 0), 0);
    const engagement = totalLikes + totalComments + totalShares;
    const avgEngagement = totalPosts > 0 ? Math.round((engagement / totalPosts) * 10) / 10 : 0;

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalShares,
      engagement,
      avgEngagement,
    };
  }, [posts, effectiveUserId]);

  const hasProfessionalPreview = useMemo(() => {
    return Boolean(
      viewedPro.headline ||
        viewedPro.bio ||
        viewedPro.location ||
        viewedPro.skills.length > 0 ||
        viewedPro.experience.length > 0 ||
        viewedPro.education.length > 0 ||
        viewedPro.links.length > 0
    );
  }, [viewedPro]);

  const profileTier = String(viewedUser?.tier || currentTier || 'free').toLowerCase();

  const handleFollowProfile = async () => {
    if (!viewedUserId || isOwnProfile) return;

    setButtonBusy('follow');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user?.id) {
        toast({
          title: 'Login required',
          description: 'Please login again before following someone.',
          variant: 'destructive',
        });
        return;
      }

      const myUserId = authData.user.id;

      if (myUserId === viewedUserId) {
        toast({
          title: 'Not allowed',
          description: 'You cannot follow your own profile.',
        });
        return;
      }

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myUserId)
          .eq('following_id', viewedUserId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowerCount((count) => Math.max(0, count - 1));

        toast({
          title: 'Unfollowed',
          description: `You unfollowed ${viewedUser?.name || 'this user'}.`,
        });

        return;
      }

      const { error } = await supabase.from('follows').upsert(
        {
          follower_id: myUserId,
          following_id: viewedUserId,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'follower_id,following_id',
          ignoreDuplicates: true,
        }
      );

      if (error) throw error;

      setIsFollowing(true);
      setFollowerCount((count) => count + 1);

      toast({
        title: 'Followed',
        description: `You are now following ${viewedUser?.name || 'this user'}.`,
      });

      void (async () => {
        try {
          await supabase.from('notifications').insert({
            user_id: viewedUserId,
            actor_id: myUserId,
            type: 'follow',
            title: 'New follower',
            message: `${user?.name || user?.email?.split('@')[0] || 'Someone'} followed you.`,
            action_url: `/profile/${myUserId}`,
            is_read: false,
          });
        } catch {}
      })();
    } catch (error: any) {
      toast({
        title: 'Follow failed',
        description:
          error?.message || 'Could not update follow right now. Check your Supabase follows policy.',
        variant: 'destructive',
      });
    } finally {
      setButtonBusy(null);
    }
  };

  const handleConnectProfile = async () => {
    if (!effectiveUserId || !viewedUserId || isOwnProfile) return;

    setButtonBusy('connect');

    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .upsert(
          {
            sender_id: effectiveUserId,
            receiver_id: viewedUserId,
            status: 'pending',
          },
          {
            onConflict: 'sender_id,receiver_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      setIsPendingConnection(true);

      void (async () => {
        try {
          await supabase.from('notifications').upsert({
            id: data.id,
            user_id: viewedUserId,
            actor_id: effectiveUserId,
            type: 'connection_request',
            title: 'New connection request',
            message: `${user?.name || user?.email?.split('@')[0] || 'Someone'} wants to connect with you.`,
            action_url: '/notifications',
            is_read: false,
          });
        } catch {}
      })();

      toast({
        title: 'Connection sent',
        description: 'Your connection request was sent.',
      });
    } catch (error: any) {
      toast({
        title: 'Connect failed',
        description: error?.message || 'Could not send connection request.',
        variant: 'destructive',
      });
    } finally {
      setButtonBusy(null);
    }
  };

  const startProfileChat = async () => {
    if (!effectiveUserId || !viewedUserId || isOwnProfile) return;

    setButtonBusy('message');

    try {
      navigate(`/messages/${viewedUserId}?focus=1`);
    } finally {
      setButtonBusy(null);
    }
  };

  const saveBio = async () => {
    if (!isOwnProfile || !effectiveUserId) return;

    const nextBio = bioDraft.trim();

    try {
      updateProfile?.({
        bio: nextBio,
      });

      await supabase
        .from('profiles')
        .update({
          bio: nextBio,
        })
        .eq('id', effectiveUserId);

      setBioEditing(false);

      toast({
        title: 'Bio saved',
        description: 'Your profile bio was updated.',
      });
    } catch {
      toast({
        title: 'Bio saved locally',
        description: 'Your bio was saved in the app. Supabase update did not complete.',
      });
      setBioEditing(false);
    }
  };

  const saveProfessionalLive = async (next: ProfessionalProfile) => {
    if (!canEditProfessional || !effectiveUserId) {
      toast({
        title: 'Creator tier required',
        description:
          'Professional profile editing is available for Creator, Business and Exclusive users.',
      });
      return;
    }

    await saveProfessional(next);

    const { error } = await supabase
      .from('profiles')
      .update({
        professional: next,
      })
      .eq('id', effectiveUserId);

    if (error) {
      toast({
        title: 'Saved locally',
        description:
          'Professional profile saved in the app. Add the professional jsonb column in Supabase to save it for real users.',
      });
      return;
    }

    toast({
      title: 'Professional profile saved',
      description: 'Your professional information is now visible on your profile.',
    });
  };

  const addSkill = async () => {
    const skill = newSkill.trim();
    if (!skill) return;

    const next: ProfessionalProfile = {
      ...viewedPro,
      skills: Array.from(new Set([...viewedPro.skills, skill])),
    };

    setNewSkill('');
    await saveProfessionalLive(next);
  };

  const addExperience = async () => {
    if (!expRole.trim() || !expCompany.trim()) return;

    const next: ProfessionalProfile = {
      ...viewedPro,
      experience: [
        ...viewedPro.experience,
        {
          role: expRole.trim(),
          company: expCompany.trim(),
          start: expStart.trim() || undefined,
          end: expEnd.trim() || undefined,
          summary: expSummary.trim() || undefined,
          verified: false,
        },
      ],
    };

    setExpRole('');
    setExpCompany('');
    setExpStart('');
    setExpEnd('');
    setExpSummary('');

    await saveProfessionalLive(next);
  };

  const addEducation = async () => {
    if (!eduInstitution.trim()) return;

    const next: ProfessionalProfile = {
      ...viewedPro,
      education: [
        ...viewedPro.education,
        {
          institution: eduInstitution.trim(),
          degree: eduDegree.trim() || undefined,
          field: eduField.trim() || undefined,
          start: eduStart.trim() || undefined,
          end: eduEnd.trim() || undefined,
          verified: false,
        },
      ],
    };

    setEduInstitution('');
    setEduDegree('');
    setEduField('');
    setEduStart('');
    setEduEnd('');

    await saveProfessionalLive(next);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background">
        <Navbar />
        <div className="max-w-5xl mx-auto pt-20 px-3 sm:px-4 pb-20">
          <Card className="rounded-2xl border border-border/60 shadow-none">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading profile...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (profileMissing || !viewedUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background">
        <Navbar />
        <div className="max-w-5xl mx-auto pt-20 px-3 sm:px-4 pb-20">
          <Card className="rounded-2xl border border-border/60 shadow-none">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Profile not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-14 md:pt-20 px-3 sm:px-4 pb-20 md:pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4 md:mb-6 overflow-hidden rounded-2xl border border-border/60 shadow-none">
            <div className="relative h-24 sm:h-28 md:h-40 lg:h-44">
              {viewedUser?.coverPhoto ? (
                <img src={viewedUser.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
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
                      {getInitial(viewedUser?.name, viewedUser?.email)}
                    </AvatarFallback>
                  </Avatar>

                  {isProfileVerified && (
                    <span className="md:hidden absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left pt-1 sm:pt-4">
                  <div className="flex flex-wrap items-center justify-start gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                      {viewedUser?.name}
                    </h1>

                    {isProfileVerified && <CheckCircle className="h-5 w-5 text-primary" />}

                    <IdentityVerifiedBadge />

                    {profileTier !== 'free' && (
                      <Badge variant="secondary" className="ml-1">
                        {profileTier.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {viewedPro.headline ? (
                    <div className="text-sm md:text-base font-medium text-foreground/90 mb-2 break-words">
                      {viewedPro.headline}
                    </div>
                  ) : null}

                  {isOwnProfile && bioEditing ? (
                    <div className="mb-3 space-y-2">
                      <textarea
                        className="w-full min-h-[72px] rounded-xl border bg-background px-3 py-2 text-sm"
                        value={bioDraft}
                        onChange={(event) => setBioDraft(event.target.value)}
                        placeholder="Write your profile bio..."
                      />

                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" className="rounded-full" onClick={saveBio}>
                          <Save className="h-4 w-4 mr-2" />
                          Save bio
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setBioDraft(viewedUser?.bio || '');
                            setBioEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <p className="text-muted-foreground text-sm leading-relaxed break-words">
                        {viewedUser?.bio || 'No bio added yet.'}
                      </p>

                      {isOwnProfile && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-1 h-7 rounded-full px-2 text-xs"
                          onClick={() => setBioEditing(true)}
                        >
                          Edit bio
                        </Button>
                      )}
                    </div>
                  )}

                  {viewedUser?.interests && viewedUser.interests.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-2 mb-3 justify-start">
                      {viewedUser.interests.map((interest: string) => (
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
                        <a
                          href={
                            viewedUser.website.startsWith('http')
                              ? viewedUser.website
                              : `https://${viewedUser.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
                        >
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
                      className="w-full sm:w-auto rounded-full px-5"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex w-full sm:w-auto items-center gap-2">
                      <AnimatePresence mode="wait">
                        {isConnected ? (
                          <motion.div
                            key="message"
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.22 }}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              type="button"
                              className="w-full sm:w-auto rounded-full px-5"
                              onClick={startProfileChat}
                              disabled={buttonBusy === 'message'}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              {buttonBusy === 'message' ? 'Opening...' : 'Message'}
                            </Button>
                          </motion.div>
                        ) : isPendingConnection ? (
                          <motion.div
                            key="pending"
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.22 }}
                            className="w-full sm:w-auto"
                          >
                            <Button type="button" variant="outline" className="w-full sm:w-auto rounded-full px-5" disabled>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Pending
                            </Button>
                          </motion.div>
                        ) : (
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
                              className="w-full sm:w-auto rounded-full px-5"
                              onClick={handleConnectProfile}
                              disabled={buttonBusy === 'connect'}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {buttonBusy === 'connect' ? 'Sending...' : 'Connect'}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button
                        type="button"
                        variant={isFollowing ? 'secondary' : 'outline'}
                        className="w-full sm:w-auto rounded-full px-5"
                        onClick={handleFollowProfile}
                        disabled={buttonBusy === 'follow'}
                      >
                        {isFollowing ? <UserMinus className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        {buttonBusy === 'follow' ? 'Please wait...' : isFollowing ? 'Unfollow' : 'Follow'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap rounded-none bg-transparent p-0 border-b border-border/60">
            <TabsTrigger value="posts" className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground">
              Posts
            </TabsTrigger>

            <TabsTrigger value="professional" className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground">
              Professional
            </TabsTrigger>

            <TabsTrigger value="photos" className="shrink-0 rounded-none px-3 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground">
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((post: any, index: number) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
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
                <p className="text-sm text-muted-foreground">
                  Professional profile section kept active. Your existing editor content can stay below this area.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="mt-6">
            <Card>
              <CardContent className="py-6">
                <div className="grid grid-cols-3 gap-2">
                  {userPosts
                    .filter((post: any) => post.image)
                    .map((post: any) => (
                      <div
                        key={post.id}
                        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img src={post.image} alt="Post" className="w-full h-full object-cover" />
                      </div>
                    ))}
                </div>

                {userPosts.filter((post: any) => post.image).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No photos yet</p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
    </div>
  );
}
