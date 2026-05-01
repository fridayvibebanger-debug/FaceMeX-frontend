import { supabase } from '@/lib/supabase';

export const startCall = async ({
  localStream,
  myUserId,
  receiverId,
  setCallId,
  setPeerConnection
}) => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // send your audio/video
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const { data, error } = await supabase
    .from('calls')
    .insert([{
      caller_id: myUserId,
      receiver_id: receiverId,
      offer
    }])
    .select()
    .single();

  if (error) {
    console.error("Call error:", error);
    return;
  }

  setCallId(data.id);
  setPeerConnection(pc);
};
