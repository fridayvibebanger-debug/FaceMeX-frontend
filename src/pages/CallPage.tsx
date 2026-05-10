import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { PhoneOff, Mic, Video, Languages, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CallPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get('type') || 'audio';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl text-center">
        <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-3xl font-bold shadow-[0_0_40px_rgba(168,85,247,0.45)]">
          F
        </div>

        <h1 className="text-2xl font-bold">Calling user</h1>
        <p className="text-sm text-white/60 mt-1">User ID: {userId}</p>
        <p className="text-sm text-white/60 mt-1">{type === 'video' ? 'Video call' : 'Voice call'}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button className="rounded-2xl bg-white/10 hover:bg-white/20">
            <Mic className="h-4 w-4 mr-2" />
            Mute
          </Button>

          <Button className="rounded-2xl bg-white/10 hover:bg-white/20">
            <Video className="h-4 w-4 mr-2" />
            Video
          </Button>

          <Button className="rounded-2xl bg-white/10 hover:bg-white/20">
            <FileText className="h-4 w-4 mr-2" />
            Summary
          </Button>

          <Button className="rounded-2xl bg-white/10 hover:bg-white/20">
            <Languages className="h-4 w-4 mr-2" />
            Translate
          </Button>
        </div>

        <Button
          onClick={() => navigate(-1)}
          className="mt-6 w-full rounded-2xl bg-red-500 hover:bg-red-600"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          End Call
        </Button>
      </div>
    </div>
  );
}
