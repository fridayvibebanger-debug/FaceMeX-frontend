import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Languages,
  FileText,
  Copy,
  ShieldCheck,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type CallStatus = 'starting' | 'ringing' | 'connected' | 'ended' | 'failed';

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function CallPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const type = searchParams.get('type') === 'video' ? 'video' : 'audio';
  const isVideoCall = type === 'video';

  const [status, setStatus] = useState<CallStatus>('starting');
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(isVideoCall);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [translateOn, setTranslateOn] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [copied, setCopied] = useState(false);

  const displayName = useMemo(() => {
    if (!userId) return 'FaceMeX user';

    const clean = String(userId)
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .trim();

    return clean.length > 18 ? 'FaceMeX user' : clean;
  }, [userId]);

  const callLabel = isVideoCall ? 'Video call' : 'Voice call';

  const summaryText = useMemo(() => {
    return `Call with ${displayName}
Type: ${callLabel}
Status: ${status}
Duration: ${formatDuration(seconds)}

Notes:
- Add call notes here after the conversation.
- Use this summary for follow-up messages or reminders.`;
  }, [displayName, callLabel, status, seconds]);

  useEffect(() => {
    let cancelled = false;

    async function startMedia() {
      setStatus('starting');
      setPermissionError('');

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera and microphone are not supported on this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideoCall
            ? {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current && isVideoCall) {
          localVideoRef.current.srcObject = stream;
        }

        setMicOn(true);
        setCameraOn(isVideoCall);
        setStatus('ringing');

        window.setTimeout(() => {
          if (!cancelled) setStatus('connected');
        }, 1200);
      } catch (error: any) {
        if (cancelled) return;

        setStatus('failed');
        setPermissionError(
          error?.message ||
            'Could not access microphone or camera. Please allow permissions and try again.'
        );
      }
    }

    startMedia();

    return () => {
      cancelled = true;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [isVideoCall]);

  useEffect(() => {
    if (status !== 'connected') return;

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    const next = !micOn;

    stream?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });

    setMicOn(next);
  };

  const toggleCamera = () => {
    if (!isVideoCall) return;

    const stream = localStreamRef.current;
    const next = !cameraOn;

    stream?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });

    setCameraOn(next);
  };

  const endCall = () => {
    setStatus('ended');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (userId) {
      navigate(`/messages/${userId}?focus=1`);
      return;
    }

    navigate('/messages');
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);

      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const retryPermissions = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.22),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.15),rgba(2,6,23,0.96))]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-2xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" />
              FaceMeX secure call
            </div>

            <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {formatDuration(seconds)}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/80">
            {isVideoCall ? (
              <>
                <div className="flex h-[360px] items-center justify-center bg-slate-950">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold shadow-[0_0_45px_rgba(168,85,247,0.45)]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <p className="text-lg font-semibold">{displayName}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {status === 'connected'
                        ? 'Connected'
                        : status === 'ringing'
                          ? 'Ringing...'
                          : status === 'failed'
                            ? 'Permission needed'
                            : 'Starting call...'}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 h-28 w-20 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl">
                  {cameraOn ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs text-white/50">
                      Camera off
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-[360px] flex-col items-center justify-center px-4 text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl" />
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-4xl font-bold shadow-[0_0_55px_rgba(168,85,247,0.55)]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                </div>

                <h1 className="text-2xl font-bold">{displayName}</h1>

                <p className="mt-2 text-sm text-white/60">
                  {status === 'connected'
                    ? 'Voice call connected'
                    : status === 'ringing'
                      ? 'Calling...'
                      : status === 'failed'
                        ? 'Microphone permission needed'
                        : 'Starting secure call...'}
                </p>

                {status === 'starting' && (
                  <Loader2 className="mt-5 h-5 w-5 animate-spin text-white/50" />
                )}
              </div>
            )}

            {translateOn && (
              <div className="absolute left-3 right-3 top-3 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/80 backdrop-blur-xl">
                Live translation ready. Captions will appear here when connected.
              </div>
            )}
          </div>

          {permissionError && (
            <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
              <p>{permissionError}</p>

              <Button
                type="button"
                size="sm"
                className="mt-3 rounded-full bg-white text-slate-950 hover:bg-white/90"
                onClick={retryPermissions}
              >
                Try again
              </Button>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={toggleMic}
              disabled={status === 'failed' || status === 'ended'}
              className="rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20"
            >
              {micOn ? (
                <Mic className="mr-2 h-4 w-4" />
              ) : (
                <MicOff className="mr-2 h-4 w-4" />
              )}
              {micOn ? 'Mute' : 'Unmute'}
            </Button>

            <Button
              type="button"
              onClick={toggleCamera}
              disabled={!isVideoCall || status === 'failed' || status === 'ended'}
              className="rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
            >
              {cameraOn ? (
                <Video className="mr-2 h-4 w-4" />
              ) : (
                <VideoOff className="mr-2 h-4 w-4" />
              )}
              {cameraOn ? 'Video' : 'Camera off'}
            </Button>

            <Button
              type="button"
              onClick={() => setSummaryOpen((value) => !value)}
              className="rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20"
            >
              <FileText className="mr-2 h-4 w-4" />
              Summary
            </Button>

            <Button
              type="button"
              onClick={() => setTranslateOn((value) => !value)}
              className={`rounded-2xl border border-white/10 text-white hover:bg-white/20 ${
                translateOn ? 'bg-blue-500/40' : 'bg-white/10'
              }`}
            >
              <Languages className="mr-2 h-4 w-4" />
              {translateOn ? 'On' : 'Translate'}
            </Button>
          </div>

          {summaryOpen && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Call summary</p>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-white hover:bg-white/10"
                  onClick={copySummary}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <pre className="max-h-40 whitespace-pre-wrap overflow-y-auto text-xs leading-relaxed text-white/70">
                {summaryText}
              </pre>
            </div>
          )}

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
            <Button
              type="button"
              onClick={endCall}
              className="rounded-2xl bg-red-500 py-6 text-white hover:bg-red-600"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              End Call
            </Button>

            <Button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 text-white hover:bg-white/20"
              onClick={() => {
                try {
                  document.documentElement.requestFullscreen?.();
                } catch {
                  // ignore fullscreen error
                }
              }}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
            Camera, microphone, timer, mute, video, translation toggle and summary tools are active on this call screen.
          </p>
        </div>
      </div>
    </div>
  );
}
