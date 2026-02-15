import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Phone, Video, Mic, MicOff, VideoOff, Monitor, 
  MoreVertical, X, Maximize2, Volume2, VolumeX 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'voice' | 'video';
  participant: {
    name: string;
    avatar: string;
  };
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onEnd?: () => void;
}

export default function CallModal({
  open,
  onOpenChange,
  type,
  participant,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleVideo,
  onEnd,
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleEndCall = () => {
    if (onEnd) onEnd();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[600px] p-0">
        {/* Video Area */}
        <div className="relative h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
          {/* Remote Video/Avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            {type === 'video' && !isVideoOff && remoteStream ? (
              <video
                ref={(el) => {
                  remoteVideoRef.current = el;
                  if (el && remoteStream) {
                    el.srcObject = remoteStream;
                  }
                }}
                className="w-full h-full object-cover bg-black"
                autoPlay
                playsInline
              />
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-white/20">
                  <AvatarImage src={participant.avatar} />
                  <AvatarFallback className="text-4xl">
                    {participant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-white text-2xl font-semibold mb-2">
                  {participant.name}
                </h3>
                <p className="text-white/60">{callDuration}</p>
              </motion.div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          {type === 'video' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20"
            >
              <div className="w-full h-full flex items-center justify-center bg-black">
                {isVideoOff || !localStream ? (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" />
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                ) : (
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el && localStream) {
                        el.srcObject = localStream;
                      }
                    }}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">{callDuration}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleEndCall}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-center space-x-4">
              {/* Mute/Unmute */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant={isMuted ? 'destructive' : 'secondary'}
                  className="h-14 w-14 rounded-full"
                  onClick={() => {
                    setIsMuted((v) => !v);
                    if (onToggleMute) onToggleMute();
                  }}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </motion.div>

              {/* Video On/Off */}
              {type === 'video' && (
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    variant={isVideoOff ? 'destructive' : 'secondary'}
                    className="h-14 w-14 rounded-full"
                    onClick={() => {
                      setIsVideoOff((v) => !v);
                      if (onToggleVideo) onToggleVideo();
                    }}
                  >
                    {isVideoOff ? (
                      <VideoOff className="h-6 w-6" />
                    ) : (
                      <Video className="h-6 w-6" />
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Screen Share */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant={isScreenSharing ? 'default' : 'secondary'}
                  className="h-14 w-14 rounded-full"
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                >
                  <Monitor className="h-6 w-6" />
                </Button>
              </motion.div>

              {/* Speaker */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant={isSpeakerOff ? 'destructive' : 'secondary'}
                  className="h-14 w-14 rounded-full"
                  onClick={() => setIsSpeakerOff(!isSpeakerOff)}
                >
                  {isSpeakerOff ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </Button>
              </motion.div>

              {/* End Call */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
                  onClick={handleEndCall}
                >
                  <Phone className="h-6 w-6 rotate-135" />
                </Button>
              </motion.div>

              {/* More Options */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-14 w-14 rounded-full"
                >
                  <MoreVertical className="h-6 w-6" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
