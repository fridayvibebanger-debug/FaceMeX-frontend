import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CallModal from "@/components/calls/CallModal";

export default function CallPage() {
  // UI state
  const [open, setOpen] = useState(false);

  // streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // WebRTC + call tracking
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);

  // TEMP USERS (replace with Supabase Auth later)
  const myUserId = "user_1";
  const receiverId = "user_2";

  const pcRef = useRef<RTCPeerConnection | null>(null);

  // 🎥 GET CAMERA + MIC
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => setLocalStream(stream))
      .catch((err) => console.error("Media error:", err));
  }, []);

  // ⚡ CREATE PEER CONNECTION
  const createPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // send local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // receive remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pcRef.current = pc;
    setPeerConnection(pc);

    return pc;
  };

  // 📞 START CALL
  const startCall = async () => {
    if (!localStream) return;

    const pc = createPeerConnection(localStream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const { data, error } = await supabase
      .from("calls")
      .insert([
        {
          caller_id: myUserId,
          receiver_id: receiverId,
          offer,
          status: "calling",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Call error:", error);
      return;
    }

    setCallId(data.id);
    setOpen(true);
  };

  // 📡 LISTEN FOR INCOMING CALL
  useEffect(() => {
    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
        },
        (payload) => {
          if (payload.new.receiver_id === myUserId) {
            setIncomingCall(payload.new);
            setOpen(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🟢 ACCEPT CALL
  const acceptCall = async () => {
    if (!incomingCall || !localStream) return;

    const pc = createPeerConnection(localStream);

    await pc.setRemoteDescription(incomingCall.offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await supabase
      .from("calls")
      .update({
        answer,
        status: "connected",
      })
      .eq("id", incomingCall.id);

    setPeerConnection(pc);
    setOpen(true);
  };

  // 📡 LISTEN FOR ANSWER (CALLER SIDE)
  useEffect(() => {
    if (!callId || !peerConnection) return;

    const channel = supabase
      .channel("call-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${callId}`,
        },
        async (payload) => {
          if (payload.new.answer && peerConnection) {
            await peerConnection.setRemoteDescription(payload.new.answer);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, peerConnection]);

  // ❌ END CALL
  const endCall = () => {
    peerConnection?.close();
    pcRef.current = null;

    setPeerConnection(null);
    setRemoteStream(null);
    setCallId(null);
    setIncomingCall(null);
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">FaceMeX Call System</h1>

      {/* START CALL */}
      <button
        onClick={startCall}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Start Call
      </button>

      {/* ACCEPT CALL */}
      {incomingCall && (
        <button
          onClick={acceptCall}
          className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
        >
          Accept Call
        </button>
      )}

      {/* CALL UI */}
      <CallModal
        open={open}
        onOpenChange={setOpen}
        type="video"
        participant={{
          name: "User",
          avatar: "",
        }}
        localStream={localStream}
        remoteStream={remoteStream}
        onEnd={endCall}
      />
    </div>
  );
}
