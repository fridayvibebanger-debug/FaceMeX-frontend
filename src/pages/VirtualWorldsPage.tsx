import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Search, Globe, Lock, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useVirtualWorldStore } from '@/store/virtualWorldStore';
import AvatarCustomizer from '@/components/avatar/AvatarCustomizer';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { createCheckoutSession } from '@/utils/billing';
import { io, Socket } from 'socket.io-client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useAvatarStore } from '@/store/avatarStore';
import AvatarPreview from '@/components/avatar/AvatarPreview';
import { API_URL } from '@/lib/api';

export default function VirtualWorldsPage() {
  const { worlds, currentWorld, joinWorld, leaveWorld, createWorld, deleteWorld, updateWorld, loadWorlds } = useVirtualWorldStore();
  const { hasTier, id: userId, name } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAvatarCustomizerOpen, setIsAvatarCustomizerOpen] = useState(false);
  const [startRpm, setStartRpm] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [newWorldPriceUSD, setNewWorldPriceUSD] = useState<string>('0');
  const [newWorldImageFile, setNewWorldImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editWorldId, setEditWorldId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTheme, setEditTheme] = useState<'space'|'beach'|'city'|'forest'>('beach');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editPriceUSD, setEditPriceUSD] = useState<string>('0');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [editMaxParticipants, setEditMaxParticipants] = useState<number>(50);
  const [editModsText, setEditModsText] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const [peerAvatars, setPeerAvatars] = useState<Record<string, any>>({});
  const { currentAvatar } = useAvatarStore();

  const apiOrigin = useMemo(() => window.location.origin, []);
  const backendOrigin = useMemo(() => API_URL, []);
  const openCustomizerOrCheckout = async () => {
    if (!hasTier('creator')) {
      const priceId = (import.meta as any).env?.VITE_STRIPE_PRICE_CREATOR_PLUS as string | undefined;
      if (!priceId) { window.location.assign('/pricing'); return; }
      try {
        const session = await createCheckoutSession({
          priceId,
          mode: 'subscription',
          successUrl: `${apiOrigin}/pricing?from=avatar`,
          cancelUrl: `${apiOrigin}/pricing?from=avatar`,
          metadata: { feature: 'avatar-customize' },
        });
        if (session?.url) { window.location.assign(session.url); }
      } catch {
        window.location.assign('/pricing');
      }
      return;
    }
    setIsAvatarCustomizerOpen(true);
  };

  // Create world form state
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldDescription, setNewWorldDescription] = useState('');
  const [newWorldTheme, setNewWorldTheme] = useState<'space' | 'beach' | 'city' | 'forest'>('beach');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => { loadWorlds().catch(() => {}); }, [loadWorlds]);

  // Load model-viewer script on demand when any RPM model is present
  useEffect(() => {
    const need3D = !!currentAvatar?.rpmModelUrl || Object.values(peerAvatars).some((av: any) => !!av?.rpmModelUrl);
    if (!need3D) return;
    const existing = document.querySelector('script[data-model-viewer]') as HTMLScriptElement | null;
    if (existing) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    s.setAttribute('data-model-viewer', 'true');
    document.head.appendChild(s);
    return () => {
      // keep cached for performance; do not remove
    };
  }, [currentAvatar, peerAvatars]);

  const filteredWorlds = worlds.filter(
    (world) =>
      world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      world.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    if (!backendOrigin) return;
    const s = io(backendOrigin, { withCredentials: true });
    socketRef.current = s;
    return () => {
      try { s.close(); } catch {}
      socketRef.current = null;
    };
  }, []);

  const handleJoinWorld = async (worldId: string) => {
    const world = worlds.find(w => w.id === worldId);
    if (!world) return;
    // capacity guard
    if ((world.participants || 0) >= (world.maxParticipants || 0)) {
      alert('This world is full right now. Please try again later.');
      return;
    }
    const requiresSubscription = (world.priceCents ?? 0) > 0 || !world.isPublic;
    if (requiresSubscription && !hasTier('pro')) {
      // Start Stripe Checkout for subscription tier
      const priceId = import.meta.env.VITE_STRIPE_PRICE_WORLD_SUBSCRIPTION as string | undefined;
      if (!priceId) {
        // Fallback: redirect to Pricing page if price id missing
        window.location.assign('/pricing');
        return;
      }
      try {
        const session = await createCheckoutSession({
          priceId,
          mode: 'subscription',
          successUrl: `${apiOrigin}/world`,
          cancelUrl: `${apiOrigin}/pricing`,
          metadata: { worldId },
        });
        if (session.url) {
          window.location.assign(session.url);
          return;
        }
      } catch (_e) {
        window.location.assign('/pricing');
        return;
      }
    }
    joinWorld(worldId);
  };

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) return;
    let thumbnailUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80';
    if (newWorldImageFile) {
      try {
        setIsUploadingImage(true);
        thumbnailUrl = await uploadToCloudinary(newWorldImageFile);
      } catch (_e) {
        // keep default if upload fails
      } finally {
        setIsUploadingImage(false);
      }
    }
    createWorld({
      name: newWorldName,
      description: newWorldDescription,
      thumbnail: thumbnailUrl,
      creatorId: '1',
      creatorName: 'John Doe',
      maxParticipants: 50,
      isPublic,
      theme: newWorldTheme,
      priceCents: Math.max(0, Math.round(Number(newWorldPriceUSD || '0') * 100)) || 0,
    });
    setIsCreateModalOpen(false);
    setNewWorldName('');
    setNewWorldDescription('');
    setNewWorldPriceUSD('0');
    setNewWorldImageFile(null);
  };

  // Presence lifecycle: join/leave room
  useEffect(() => {
    if (!currentWorld) {
      // Cleanup existing socket if any
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch {}
        socketRef.current = null;
      }
      setPeerAvatars({});
      return;
    }
    if (!backendOrigin) return;
    const sock = io(backendOrigin, { transports: ['websocket'], withCredentials: true });
    socketRef.current = sock;
    const payload = { worldId: currentWorld.id, user: { id: userId, name } };
    sock.emit('world:join', payload);
    // Immediately broadcast my current avatar to others
    try { sock.emit('world:avatar:update', { worldId: currentWorld.id, userId, avatar: currentAvatar }); } catch {}
    const onJoined = (p: any) => {
      // Optionally handle presence UI updates; for now, no-op
      console.debug('world:presence:join', p);
    };
    const onLeft = (p: any) => {
      console.debug('world:presence:leave', p);
    };
    const onAvatarUpdated = (evt: any) => {
      if (!evt?.userId) return;
      setPeerAvatars(prev => ({ ...prev, [evt.userId]: evt.avatar }));
    };
    const onSnapshot = (evt: any) => {
      if (!evt?.peers) return;
      const map: Record<string, any> = {};
      for (const peer of evt.peers) {
        if (peer?.userId) map[peer.userId] = peer.avatar || null;
      }
      setPeerAvatars(map);
    };
    sock.on('world:presence:join', onJoined);
    sock.on('world:presence:snapshot', onSnapshot);
    sock.on('world:presence:leave', onLeft);
    sock.on('world:avatar:updated', onAvatarUpdated);
    const onReconnect = () => {
      sock.emit('world:join', payload);
      // Re-share my avatar on reconnect
      try { sock.emit('world:avatar:update', { worldId: currentWorld.id, userId, avatar: currentAvatar }); } catch {}
    };
    sock.io.on('reconnect', onReconnect);
    return () => {
      try { sock.emit('world:leave', payload); } catch {}
      try { sock.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, [currentWorld, backendOrigin, userId, name]);

  // Emit avatar updates whenever my avatar changes within a joined world
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock || !currentWorld) return;
    try {
      sock.emit('world:avatar:update', { worldId: currentWorld.id, userId, avatar: currentAvatar });
    } catch {}
  }, [currentAvatar, currentWorld, userId]);

  if (currentWorld) {
    const getWorldGradient = () => {
      switch (currentWorld.theme) {
        case 'space':
          return 'from-indigo-900 via-purple-900 to-black';
        case 'beach':
          return 'from-sky-400 via-blue-300 to-yellow-200';
        case 'city':
          return 'from-gray-900 via-purple-900 to-pink-900';
        case 'forest':
          return 'from-green-900 via-green-700 to-green-500';
        default:
          return 'from-blue-500 to-purple-500';
      }
    };

    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Top Bar */}
        <div className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={leaveWorld}>
                Leave World
              </Button>
              <div>
                <h2 className="text-xl font-bold text-foreground">{currentWorld.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{currentWorld.participants} / {currentWorld.maxParticipants} participants</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={isMicOn ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsMicOn(!isMicOn)}
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isVideoOn ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsVideoOn(!isVideoOn)}
              >
                {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              {/* Avatar actions removed from UI (Customize / Create 3D Avatar) */}
              {currentWorld?.creatorId === userId && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditWorldId(currentWorld.id);
                      setEditName(currentWorld.name);
                      setEditDescription(currentWorld.description);
                      setEditTheme(currentWorld.theme as any);
                      setEditIsPublic(currentWorld.isPublic);
                      setEditPriceUSD(String(((currentWorld as any).priceCents || 0) / 100));
                      setEditMaxParticipants(currentWorld.maxParticipants || 50);
                      setEditModsText(((currentWorld as any).mods || []).join(','));
                      setIsEditModalOpen(true);
                    }}
                  >
                    Edit World
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('Delete this world? This cannot be undone.')) {
                        deleteWorld(currentWorld.id);
                      }
                    }}
                  >
                    Delete World
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* World Viewer - simplified Apple/SaaS + video-first style (no 3D avatars) */}
        <div className={`flex-1 bg-gradient-to-b ${getWorldGradient()} flex items-center justify-center px-4`}>
          <div className="max-w-3xl w-full">
            <div className="rounded-2xl bg-black/80 backdrop-blur-sm border border-white/10 shadow-xl overflow-hidden">
              <div className="aspect-video w-full flex items-center justify-center text-slate-400 text-xs">
                <span>World experience layout (video-first shell, 3D avatars disabled)</span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-background/80 backdrop-blur-sm border border-border/60 px-4 py-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-foreground">{currentWorld.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Theme: {currentWorld.theme}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{currentWorld.participants} / {currentWorld.maxParticipants} participants</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{currentWorld.description}</p>
            </div>
          </div>
        </div>

        {/* Avatar customizer dialog hidden on joined-world view */}

        {/* Edit World Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit World</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-world-name">World Name</Label>
                <Input id="edit-world-name" value={editName} onChange={(e)=> setEditName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-world-description">Description</Label>
                <Textarea id="edit-world-description" value={editDescription} onChange={(e)=> setEditDescription(e.target.value)} className="min-h-[100px]" />
              </div>
              <div>
                <Label>Theme</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['space','beach','city','forest'].map((t)=> (
                    <Button key={t} variant={editTheme===t ? 'default':'outline'} onClick={()=> setEditTheme(t as any)} className="capitalize">{t}</Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="edit-is-public" checked={editIsPublic} onChange={(e)=> setEditIsPublic(e.target.checked)} className="rounded" />
                <Label htmlFor="edit-is-public" className="cursor-pointer">Make this world public</Label>
              </div>
              <div>
                <Label htmlFor="edit-world-capacity">Max Participants</Label>
                <Input id="edit-world-capacity" type="number" min="1" max="5000" value={editMaxParticipants}
                  onChange={(e)=> setEditMaxParticipants(Math.max(1, parseInt(e.target.value||'1',10)))} />
              </div>
              <div>
                <Label htmlFor="edit-world-mods">Moderators (user IDs, comma-separated)</Label>
                <Input id="edit-world-mods" value={editModsText} onChange={(e)=> setEditModsText(e.target.value)} placeholder="2,3,45" />
                <div className="text-[10px] text-muted-foreground mt-1">Host is creator by default. Mods can manage participants/settings.</div>
              </div>
              <div>
                <Label htmlFor="edit-world-image">World Image</Label>
                <Input id="edit-world-image" type="file" accept="image/*" onChange={(e)=> setEditImageFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label htmlFor="edit-world-price">Price (USD/month)</Label>
                <Input id="edit-world-price" type="number" min="0" step="0.5" value={editPriceUSD} onChange={(e)=> setEditPriceUSD(e.target.value)} />
              </div>
              <Button onClick={async ()=> {
                if (!editWorldId) { setIsEditModalOpen(false); return; }
                let newThumb: string | undefined;
                if (editImageFile) {
                  try { setIsUploadingEditImage(true); newThumb = await uploadToCloudinary(editImageFile); } finally { setIsUploadingEditImage(false); }
                }
                const patch: any = {
                  name: editName,
                  description: editDescription,
                  theme: editTheme,
                  isPublic: editIsPublic,
                  maxParticipants: editMaxParticipants,
                  mods: editModsText.split(',').map(s=>s.trim()).filter(Boolean),
                  priceCents: Math.max(0, Math.round(Number(editPriceUSD||'0') * 100)) || 0,
                };
                if (newThumb) patch.thumbnail = newThumb;
                updateWorld(editWorldId, patch);
                setIsEditModalOpen(false);
                setEditImageFile(null);
              }} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                {isUploadingEditImage ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-50 dark:to-slate-400 bg-clip-text text-transparent">
            Virtual Worlds
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Discover and host immersive sessions. Join live rooms or create your own world.
          </p>
        </div>

        {/* Search and actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search worlds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={openCustomizerOrCheckout}
            variant="outline"
          >
            Customize Avatar
          </Button>
          <Button
            variant="secondary"
            onClick={async () => { if (!hasTier('creator')) { await openCustomizerOrCheckout(); return; } setStartRpm(true); setIsAvatarCustomizerOpen(true); }}
          >
            Create 3D Avatar
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create World
          </Button>
        </div>

        {/* Worlds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorlds.map((world, index) => (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/95">
                <div className="relative h-44">
                  <img
                    src={world.thumbnail}
                    alt={world.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    {world.isPublic ? (
                      <Badge variant="secondary" className="bg-background/90">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-background/90">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                    {(world.participants >= world.maxParticipants) && (
                      <Badge className="ml-2" variant="destructive">Full</Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{world.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {world.theme}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {world.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      <span>
                        {world.participants} / {world.maxParticipants}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleJoinWorld(world.id)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        disabled={world.participants >= world.maxParticipants}
                      >
                        {world.participants >= world.maxParticipants ? 'Full' : 'Join World'}
                      </Button>
                      {world.creatorId === userId && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditWorldId(world.id);
                              setEditName(world.name);
                              setEditDescription(world.description);
                              setEditTheme(world.theme as any);
                              setEditIsPublic(world.isPublic);
                              setEditPriceUSD(String(((world as any).priceCents || 0) / 100));
                              setEditMaxParticipants(world.maxParticipants || 50);
                              setEditModsText(((world as any).mods || []).join(','));
                              setIsEditModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm('Delete this world?')) {
                                deleteWorld(world.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {typeof world.priceCents === 'number' && world.priceCents > 0 && (
                    <div className="mt-2 text-xs">
                      <Badge className="mr-2">Paid</Badge>
                      <span>${(world.priceCents / 100).toFixed(2)} / mo</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created by {world.creatorName}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Create World Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Virtual World</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="world-name">World Name</Label>
                <Input
                  id="world-name"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  placeholder="My Amazing World"
                />
              </div>

              <div>
                <Label htmlFor="world-description">Description</Label>
                <Textarea
                  id="world-description"
                  value={newWorldDescription}
                  onChange={(e) => setNewWorldDescription(e.target.value)}
                  placeholder="Describe your world..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label>Theme</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['space', 'beach', 'city', 'forest'].map((theme) => (
                    <Button
                      key={theme}
                      variant={newWorldTheme === theme ? 'default' : 'outline'}
                      onClick={() => setNewWorldTheme(theme as any)}
                      className="capitalize"
                    >
                      {theme}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is-public" className="cursor-pointer">
                  Make this world public
                </Label>
              </div>

              <div>
                <Label htmlFor="world-image">World Image (optional)</Label>
                <Input
                  id="world-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewWorldImageFile(e.target.files?.[0] || null)}
                />
                {newWorldImageFile && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Selected: {newWorldImageFile.name} {isUploadingImage ? '(uploading...)' : ''}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="world-price">Price (USD/month)</Label>
                <Input
                  id="world-price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={newWorldPriceUSD}
                  onChange={(e) => setNewWorldPriceUSD(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Button
                onClick={handleCreateWorld}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                Create World
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Avatar customizer dialog hidden on list view */}
      </div>
    </div>
  );
}