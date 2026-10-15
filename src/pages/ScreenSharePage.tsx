import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import {
  ArrowLeft,
  Check,
  Copy,
  MonitorUp,
  Play,
  ShieldCheck,
  Square,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import {
  screenShareRequest,
  type ShareParticipant,
  type ShareSession,
  type ShareToken,
} from '@/lib/screenShareApi';

function getScreenCaptureError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      return 'Screen sharing was cancelled or permission was denied. You can try again whenever you are ready.';
    }
    if (error.name === 'NotReadableError') {
      return 'Your browser could not access the selected screen. Close other capture tools and try again.';
    }
  }
  return error instanceof Error ? error.message : 'Could not start screen sharing. Please try again.';
}

export default function ScreenSharePage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [session, setSession] = useState<ShareSession | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<Track | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [linkCopied, setLinkCopied] = useState(false);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectingRef = useRef(false);
  const stoppingRef = useRef(false);
  const mountedRef = useRef(false);
  const hostStreamingRef = useRef(false);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    const result = await screenShareRequest<{ session: ShareSession }>('get', { sessionId });
    setSession(result.session);
    setSessionError('');
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stoppingRef.current = true;
      const stream = localStreamRef.current;
      localStreamRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (hostStreamingRef.current && sessionId) {
        void screenShareRequest('pause', { sessionId }).catch((error: unknown) => {
          console.error('FaceMeX could not pause sharing during page cleanup', error);
        });
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !isInitialized || !isAuthenticated) {
      setSession(null);
      setSessionError('');
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const result = await screenShareRequest<{ session: ShareSession }>('get', { sessionId });
        if (active) {
          setSession(result.session);
          setSessionError('');
        }
      } catch (error) {
        if (active) {
          setSessionError(error instanceof Error ? error.message : 'Could not load this sharing session.');
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 3_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [sessionId, isAuthenticated, isInitialized]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteTrack) return;
    remoteTrack.attach(video);
    return () => {
      remoteTrack.detach(video);
      video.srcObject = null;
    };
  }, [remoteTrack]);

  const connectRoom = async (publishTrack?: MediaStreamTrack) => {
    if (!sessionId) throw new Error('This sharing link is missing its session ID.');
    const { url, token } = await screenShareRequest<ShareToken>('token', { sessionId });
    const room = new Room({ adaptiveStream: true, dynacast: true });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && mountedRef.current) setRemoteTrack(track);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video && mountedRef.current) setRemoteTrack(null);
    });
    room.on(RoomEvent.Disconnected, () => {
      if (roomRef.current === room) roomRef.current = null;
      if (mountedRef.current) {
        setRemoteTrack(null);
        setConnectionStatus('Disconnected');
      }
    });

    try {
      await room.connect(url, token);
      if (publishTrack) {
        await room.localParticipant.publishTrack(publishTrack, { source: Track.Source.ScreenShare });
      }
      roomRef.current = room;
      setConnectionStatus('Connected');
      return room;
    } catch (error) {
      room.disconnect();
      throw error;
    }
  };

  useEffect(() => {
    const shouldJoin =
      session?.role === 'visitor' &&
      session.status === 'active' &&
      session.participantStatus === 'approved' &&
      session.hostConnected;
    if (!shouldJoin || roomRef.current || connectingRef.current) return;

    let active = true;
    connectingRef.current = true;
    setConnectionStatus('Connecting…');
    void connectRoom()
      .catch((error: unknown) => {
        if (active) {
          setActionError(error instanceof Error ? error.message : 'Could not connect to the live room.');
          setConnectionStatus('Connection failed');
        }
      })
      .finally(() => {
        connectingRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [
    session?.id,
    session?.role,
    session?.status,
    session?.participantStatus,
    session?.hostConnected,
    joinAttempt,
  ]);

  useEffect(() => {
    if (
      session?.role === 'visitor' &&
      session.participantStatus !== 'approved' &&
      roomRef.current
    ) {
      roomRef.current.disconnect();
      roomRef.current = null;
      setRemoteTrack(null);
      setConnectionStatus('Not connected');
    }
  }, [session?.role, session?.participantStatus]);

  useEffect(() => {
    if (!/expired|ended|revoked/i.test(sessionError)) return;
    roomRef.current?.disconnect();
    roomRef.current = null;
    setRemoteTrack(null);
    setConnectionStatus('Session unavailable');
  }, [sessionError]);

  const createSession = async () => {
    setBusyAction('create');
    setActionError('');
    try {
      const result = await screenShareRequest<{ session: ShareSession }>('create');
      navigate(`/screen-share/${result.session.id}`, { replace: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not create a private session.');
    } finally {
      setBusyAction('');
    }
  };

  const runHostAction = async (action: 'approve' | 'reject' | 'remove' | 'start' | 'pause' | 'end', participantId?: string) => {
    if (!sessionId) return;
    setBusyAction(participantId ? `${action}:${participantId}` : action);
    setActionError('');
    try {
      const result = await screenShareRequest<{ session: ShareSession }>(action, {
        sessionId,
        ...(participantId ? { participantId } : {}),
      });
      setSession(result.session);
      setSessionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Could not ${action} the session.`);
    } finally {
      setBusyAction('');
    }
  };

  const stopLocalMedia = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    const stream = localStreamRef.current;
    localStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteTrack(null);
    }
  };

  const stopSharing = async () => {
    if (!sessionId || stoppingRef.current) return;
    stoppingRef.current = true;
    setBusyAction('pause');
    setActionError('');
    try {
      await stopLocalMedia();
      const result = await screenShareRequest<{ session: ShareSession }>('pause', { sessionId });
      hostStreamingRef.current = false;
      setSession(result.session);
      setConnectionStatus('Paused');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not safely stop sharing.');
    } finally {
      stoppingRef.current = false;
      setBusyAction('');
    }
  };

  const startSharing = async () => {
    if (!sessionId) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
      setActionError('Live screen capture is unavailable in this browser or context. Use a supported desktop browser over HTTPS.');
      return;
    }

    setBusyAction('start');
    setActionError('');
    let stream: MediaStream | null = null;
    let sessionStarted = false;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 12, max: 15 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('The browser did not provide a screen video track.');
      localStreamRef.current = stream;
      setLocalStream(stream);

      if (session?.status === 'active') {
        await screenShareRequest('pause', { sessionId });
      }
      await screenShareRequest('start', { sessionId });
      sessionStarted = true;
      await connectRoom(videoTrack);
      if (videoTrack.readyState === 'ended') {
        await stopSharing();
        return;
      }
      videoTrack.addEventListener('ended', () => void stopSharing(), { once: true });
      hostStreamingRef.current = true;
      setConnectionStatus('Sharing live');
      await refreshSession();
    } catch (error) {
      if (stream) {
        localStreamRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
      }
      roomRef.current?.disconnect();
      roomRef.current = null;
      setLocalStream(null);
      setConnectionStatus('Not connected');
      if (sessionStarted) {
        try {
          await screenShareRequest('pause', { sessionId });
        } catch (pauseError) {
          console.error('FaceMeX could not close a room after screen capture failed', pauseError);
        }
      }
      setActionError(getScreenCaptureError(error));
    } finally {
      setBusyAction('');
    }
  };

  const requestAccess = async () => {
    if (!sessionId) return;
    setBusyAction('request');
    setActionError('');
    try {
      const result = await screenShareRequest<{ session: ShareSession }>('request', { sessionId });
      setSession(result.session);
      setSessionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not request access.');
    } finally {
      setBusyAction('');
    }
  };

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2_000);
    } catch (error) {
      console.error('FaceMeX could not copy the private sharing link', error);
      setActionError('Could not copy the invitation. Copy the page address from your browser instead.');
    }
  };

  const leaveSession = async () => {
    await stopLocalMedia();
    navigate('/mexa');
  };

  const endSession = async () => {
    if (!sessionId) return;
    setBusyAction('end');
    setActionError('');
    try {
      await stopLocalMedia();
      const result = await screenShareRequest<{ session: ShareSession }>('end', { sessionId });
      hostStreamingRef.current = false;
      setSession(result.session);
      setConnectionStatus('Session ended');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not end the session.');
    } finally {
      setBusyAction('');
    }
  };

  const signInHref = `/login`;
  const liveCaptureSupported = typeof navigator !== 'undefined' &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  if (!isInitialized) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Checking FaceMeX sign-in…</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 text-slate-900">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          <h1 className="mt-4 text-xl font-semibold">Sign in to join private screen sharing</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The invitation link does not grant access by itself. Sign in to FaceMeX, then return to this tab to request the host’s approval.
          </p>
          <a href={signInHref} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700">
            Sign in to FaceMeX
          </a>
        </section>
      </main>
    );
  }

  if (!sessionId) {
    return (
      <main className="min-h-[100dvh] bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link to="/mexa" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to MEXA
          </Link>
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MonitorUp className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Private screen sharing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create an invitation for registered FaceMeX users. They must sign in and wait for your approval before they can view your live screen.
            </p>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Screen capture starts only after you choose a screen in your browser’s native picker. The invitation link alone never authorizes a viewer.
            </p>
            <Button type="button" onClick={() => void createSession()} disabled={busyAction === 'create'} className="mt-6 h-11 rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700">
              <Users className="mr-2 h-4 w-4" />
              {busyAction === 'create' ? 'Creating private link…' : 'Create sharing link'}
            </Button>
            {actionError && <p className="mt-4 text-sm text-red-600" role="alert">{actionError}</p>}
          </section>
        </div>
      </main>
    );
  }

  const role = session?.role;
  const canRequest = role === 'visitor' && !session?.participantStatus;
  const requestState = session?.participantStatus;

  return (
    <main className="min-h-[100dvh] bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/mexa" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> MEXA
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600" role="status">
            <span className={`h-2 w-2 rounded-full ${session?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {session?.status === 'active' ? connectionStatus : session?.status === 'ended' ? 'Session ended' : session?.status || 'Loading session'}
          </span>
        </div>

        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-600">FaceMeX · private session</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {role === 'host' ? 'Your screen-sharing room' : 'Join a screen-sharing room'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {session?.hostName ? `Hosted by ${session.hostName}` : 'Checking session access…'}
              {session?.expiresAt ? ` · Expires ${new Date(session.expiresAt).toLocaleString()}` : ''}
            </p>
          </div>
          {role === 'host' && (
            <Button type="button" variant="outline" onClick={() => void copyInvitation()} className="h-10 shrink-0 rounded-full border-slate-300 bg-white px-4">
              {linkCopied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
              {linkCopied ? 'Link copied' : 'Copy invitation'}
            </Button>
          )}
        </header>

        {(sessionError || actionError) && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {actionError || sessionError}
          </div>
        )}

        {!session && !sessionError && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading private session…</p>
        )}

        {session && (
          <>
            {role === 'host' ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                    <div>
                      <h2 className="text-sm font-semibold">Live screen preview</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Only approved viewers can subscribe.</p>
                    </div>
                    <span className="text-xs text-slate-500">{connectionStatus}</span>
                  </div>
                  <div className="aspect-video bg-slate-950">
                    {localStream ? (
                      <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full min-h-48 flex-col items-center justify-center px-5 text-center text-white/75">
                        <MonitorUp className="h-8 w-8 text-white/50" />
                        <p className="mt-3 text-sm font-medium">{session.status === 'active' ? 'Reconnect your screen to continue' : 'Your screen is not being shared'}</p>
                        <p className="mt-1 max-w-md text-xs leading-5 text-white/50">The browser will show a screen picker. FaceMeX will share only after you choose a screen.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
                    {session.status !== 'ended' && (
                      <>
                        {localStream ? (
                          <Button type="button" variant="destructive" onClick={() => void stopSharing()} disabled={Boolean(busyAction)} className="rounded-full">
                            <Square className="mr-2 h-4 w-4" /> Stop sharing
                          </Button>
                        ) : (
                          <Button type="button" onClick={() => void startSharing()} disabled={Boolean(busyAction) || !liveCaptureSupported} className="rounded-full bg-blue-600 text-white hover:bg-blue-700">
                            {session.status === 'active' ? <Play className="mr-2 h-4 w-4" /> : <MonitorUp className="mr-2 h-4 w-4" />}
                            {busyAction === 'start' ? 'Starting…' : session.status === 'active' ? 'Reconnect screen' : session.status === 'paused' ? 'Resume sharing' : 'Start sharing'}
                          </Button>
                        )}
                        {!liveCaptureSupported && (
                          <p className="w-full text-xs text-amber-700">Live screen capture requires a supported browser in a secure context (HTTPS). Some mobile browsers do not offer device-screen capture.</p>
                        )}
                        <Button type="button" variant="outline" onClick={() => void endSession()} disabled={Boolean(busyAction)} className="rounded-full">
                          End session
                        </Button>
                      </>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold">Viewer requests</h2>
                      <p className="mt-1 text-xs text-slate-500">Approve each person before they can join.</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      <Users className="h-3.5 w-3.5" /> {session.participants.length}/10
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {session.participants.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No viewers have requested access.</p>
                    ) : session.participants.map((participant: ShareParticipant) => (
                      <div key={participant.id} className="rounded-2xl border border-slate-100 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{participant.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {participant.status === 'waiting' ? 'Waiting for approval' : participant.connected ? 'Connected' : participant.status}
                            </p>
                          </div>
                          {participant.connected && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Connected" />}
                        </div>
                        {participant.status === 'waiting' && (
                          <div className="mt-3 flex gap-2">
                            <Button type="button" size="sm" onClick={() => void runHostAction('approve', participant.id)} disabled={Boolean(busyAction)} className="h-8 rounded-full bg-emerald-600 px-3 text-white hover:bg-emerald-700">
                              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void runHostAction('reject', participant.id)} disabled={Boolean(busyAction)} className="h-8 rounded-full px-3">
                              <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                        {participant.status === 'approved' && (
                          <Button type="button" size="sm" variant="outline" onClick={() => void runHostAction('remove', participant.id)} disabled={Boolean(busyAction)} className="mt-3 h-8 rounded-full px-3 text-red-700">
                            <UserRoundX className="mr-1.5 h-3.5 w-3.5" /> Remove viewer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="text-sm font-semibold">Host screen</h2>
                    <p className="mt-0.5 text-xs text-slate-500">The live screen appears only after the host approves your request.</p>
                  </div>
                  <span className="text-xs text-slate-500">{connectionStatus}</span>
                </div>
                <div className="aspect-video bg-slate-950">
                  {remoteTrack ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center px-5 text-center text-white/75">
                      <MonitorUp className="h-8 w-8 text-white/50" />
                      <p className="mt-3 text-sm font-medium">
                        {requestState === 'approved' && session.hostConnected ? 'Connecting to the live screen…' : 'No live screen yet'}
                      </p>
                      <p className="mt-1 max-w-md text-xs leading-5 text-white/50">
                        {requestState === 'approved' ? 'Stay here while the host starts or resumes sharing.' : 'Request access and wait for the host to approve you.'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
                  {canRequest && (
                    <Button type="button" onClick={() => void requestAccess()} disabled={Boolean(busyAction)} className="rounded-full bg-blue-600 text-white hover:bg-blue-700">
                      <UserCheck className="mr-2 h-4 w-4" />
                      {busyAction === 'request' ? 'Requesting…' : 'Request to join'}
                    </Button>
                  )}
                  {requestState === 'waiting' && <p className="text-sm text-amber-700" role="status">Request sent. Waiting for the host to approve you.</p>}
                  {requestState === 'rejected' && <p className="text-sm text-slate-600" role="status">The host declined this request.</p>}
                  {requestState === 'removed' && <p className="text-sm text-red-700" role="alert">The host removed your access to this session.</p>}
                  {requestState === 'approved' && session.status === 'active' && session.hostConnected && !remoteTrack && (connectionStatus === 'Connection failed' || connectionStatus === 'Disconnected') && (
                    <Button type="button" variant="outline" onClick={() => setJoinAttempt((attempt) => attempt + 1)} disabled={Boolean(busyAction)} className="rounded-full">
                      Retry connection
                    </Button>
                  )}
                  {session.status === 'ended' && <p className="text-sm text-slate-600">This private session has ended.</p>}
                  {session.status !== 'ended' && (
                    <Button type="button" variant="outline" onClick={() => void leaveSession()} disabled={Boolean(busyAction)} className="rounded-full">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Leave session
                    </Button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
