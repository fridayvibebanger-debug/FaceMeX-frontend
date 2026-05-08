import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CallModal from "@/components/calls/CallModal";

export default function Chat() {
  // UI state
  const [callOpen, setCallOpen] = useState(false);

  // streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // WebRTC
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  // call data
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // TEMP USERS (replace with Supabase Auth later)
  const myUserId = "user_1";
  const otherUserId = "user_2";

  // 🎥 GET CAMERA + MIC
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => setLocalStream(stream))
      .catch((err) => console.error("Media error:", err));
  }, []);

  // ⚡ CREATE PEER CONNECTION
  const createPeer = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  };

  // 📞 START CALL
  const startCall = async () => {
    if (!localStream) return;

    const pc = createPeer(localStream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const { data, error } = await supabase
      .from("calls")
      .insert([
        {
          caller_id: myUserId,
          receiver_id: otherUserId,
          offer,
          status: "calling",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setActiveCallId(data.id);
    setPeerConnection(pc);
    setCallOpen(true);
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
            setCallOpen(true);
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

    const pc = createPeer(localStream);

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
    setCallOpen(true);
  };

  // 📡 LISTEN FOR ANSWER (CALLER SIDE)
  useEffect(() => {
    if (!activeCallId || !peerConnection) return;

    const channel = supabase
      .channel("call-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${activeCallId}`,
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
  }, [activeCallId, peerConnection]);

  // ❌ END CALL
  const endCall = () => {
    peerConnection?.close();

    setPeerConnection(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setActiveCallId(null);
    setCallOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Chat System (FaceMeX)</h1>

      {/* MESSAGE AREA (placeholder) */}
      <div className="border p-4 rounded h-64">
        Chat messages here...
      </div>

      {/* CALL BUTTON */}
      <button
        onClick={startCall}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        📞 Call User
      </button>

      {/* ACCEPT CALL BUTTON */}
      {incomingCall && (
        <button
          onClick={acceptCall}
          className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
        >
          ✅ Accept Call
        </button>
      )}

      {/* CALL MODAL */}
      <CallModal
        open={callOpen}
        onOpenChange={setCallOpen}
        type="video"
        participant={{
          name: "Driver / User",
          avatar: "",
        }}
        localStream={localStream}
        remoteStream={remoteStream}
        onEnd={endCall}
      />
    </div>
  );
}
