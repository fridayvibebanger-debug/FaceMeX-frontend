import { getSocket, joinUserSocket } from '@/lib/socket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCall = null;
let isCaller = false;

function safeCallback(callback, value) {
  if (typeof callback === 'function') {
    callback(value);
  }
}

function setVideoRefStream(videoRef, stream) {
  if (!videoRef) return;

  const videoElement = videoRef.current || videoRef;

  if (videoElement && 'srcObject' in videoElement) {
    videoElement.srcObject = stream;
  }
}

async function getUserMediaStream(callType = 'video') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Your browser does not support audio/video calls.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video:
      callType === 'video'
        ? {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          }
        : false,
  });

  return stream;
}

function createPeerConnection({
  roomId,
  callId,
  myUserId,
  onRemoteStream,
  onConnectionStateChange,
} = {}) {
  const socket = getSocket();

  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });

  remoteStream = new MediaStream();

  pc.ontrack = (event) => {
    event.streams?.[0]?.getTracks()?.forEach((track) => {
      remoteStream.addTrack(track);
    });

    safeCallback(onRemoteStream, remoteStream);
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;

    const finalRoomId = roomId || currentCall?.roomId;
    const finalCallId = callId || currentCall?.callId;

    if (!finalRoomId) return;

    socket.emit('call:candidate', {
      roomId: finalRoomId,
      callId: finalCallId,
      candidate: event.candidate,
      fromUserId: myUserId,
    });
  };

  pc.onconnectionstatechange = () => {
    safeCallback(onConnectionStateChange, pc.connectionState);

    if (
      pc.connectionState === 'failed' ||
      pc.connectionState === 'disconnected' ||
      pc.connectionState === 'closed'
    ) {
      console.log('Call connection state:', pc.connectionState);
    }
  };

  return pc;
}

export async function startCall({
  myUserId,
  receiverId,
  callType = 'video',
  fromUser = null,
  localVideoRef = null,
  remoteVideoRef = null,
  setCallId,
  setRoomId,
  setPeerConnection,
  setLocalStream,
  setRemoteStream,
  onStatus,
  onError,
  onRemoteStream,
  onConnectionStateChange,
}) {
  try {
    const socket = getSocket();
    joinUserSocket(myUserId);

    isCaller = true;

    localStream = await getUserMediaStream(callType);
    setVideoRefStream(localVideoRef, localStream);

    safeCallback(setLocalStream, localStream);
    safeCallback(onStatus, 'calling');

    peerConnection = createPeerConnection({
      myUserId,
      onRemoteStream: (stream) => {
        setVideoRefStream(remoteVideoRef, stream);
        safeCallback(setRemoteStream, stream);
        safeCallback(onRemoteStream, stream);
      },
      onConnectionStateChange,
    });

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    safeCallback(setPeerConnection, peerConnection);

    socket.emit('call:invite', {
      toUserId: receiverId,
      fromUserId: myUserId,
      fromUser,
      callType,
    });

    socket.once('call:ringing', (payload) => {
      currentCall = payload;

      safeCallback(setCallId, payload.callId);
      safeCallback(setRoomId, payload.roomId);
      safeCallback(onStatus, 'ringing');
    });

    socket.once('call:accepted', async (payload) => {
      currentCall = payload;

      safeCallback(setCallId, payload.callId);
      safeCallback(setRoomId, payload.roomId);
      safeCallback(onStatus, 'accepted');

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('call:offer', {
        roomId: payload.roomId,
        callId: payload.callId,
        offer,
        fromUserId: myUserId,
      });

      safeCallback(onStatus, 'connecting');
    });
  } catch (error) {
    console.error('Start call failed:', error);
    safeCallback(onError, error);
    endCall({ myUserId });
  }
}

export async function acceptCall({
  call,
  myUserId,
  callType = 'video',
  localVideoRef = null,
  remoteVideoRef = null,
  setPeerConnection,
  setLocalStream,
  setRemoteStream,
  onStatus,
  onError,
  onRemoteStream,
  onConnectionStateChange,
}) {
  try {
    const socket = getSocket();
    joinUserSocket(myUserId);

    if (!call?.callId || !call?.roomId) {
      throw new Error('Missing call details.');
    }

    isCaller = false;
    currentCall = call;

    localStream = await getUserMediaStream(call.callType || callType);
    setVideoRefStream(localVideoRef, localStream);

    safeCallback(setLocalStream, localStream);
    safeCallback(onStatus, 'accepted');

    peerConnection = createPeerConnection({
      roomId: call.roomId,
      callId: call.callId,
      myUserId,
      onRemoteStream: (stream) => {
        setVideoRefStream(remoteVideoRef, stream);
        safeCallback(setRemoteStream, stream);
        safeCallback(onRemoteStream, stream);
      },
      onConnectionStateChange,
    });

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    safeCallback(setPeerConnection, peerConnection);

    socket.emit('call:accept', {
      callId: call.callId,
      userId: myUserId,
    });

    socket.emit('call:join', {
      callId: call.callId,
      roomId: call.roomId,
      userId: myUserId,
    });
  } catch (error) {
    console.error('Accept call failed:', error);
    safeCallback(onError, error);
    declineCall({
      callId: call?.callId,
      userId: myUserId,
      reason: 'accept_failed',
    });
  }
}

export function listenForCallEvents({
  userId,
  onIncomingCall,
  onCallRinging,
  onCallAccepted,
  onCallDeclined,
  onCallCancelled,
  onCallEnded,
  onRemoteStream,
  onStatus,
  onError,
} = {}) {
  const socket = getSocket();

  if (userId) {
    joinUserSocket(userId);
  }

  const handleIncomingCall = (payload) => {
    currentCall = payload;
    safeCallback(onIncomingCall, payload);
    safeCallback(onStatus, 'incoming');
  };

  const handleRinging = (payload) => {
    currentCall = payload;
    safeCallback(onCallRinging, payload);
    safeCallback(onStatus, 'ringing');
  };

  const handleAccepted = (payload) => {
    currentCall = payload;
    safeCallback(onCallAccepted, payload);
    safeCallback(onStatus, 'accepted');
  };

  const handleOffer = async (payload) => {
    try {
      if (!peerConnection || !payload.offer) return;

      currentCall = {
        ...(currentCall || {}),
        callId: payload.callId,
        roomId: payload.roomId,
      };

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(payload.offer)
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('call:answer', {
        roomId: payload.roomId,
        callId: payload.callId,
        answer,
        fromUserId: userId,
      });

      safeCallback(onStatus, 'connected');
    } catch (error) {
      console.error('Handle offer failed:', error);
      safeCallback(onError, error);
    }
  };

  const handleAnswer = async (payload) => {
    try {
      if (!peerConnection || !payload.answer) return;

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(payload.answer)
      );

      safeCallback(onStatus, 'connected');
    } catch (error) {
      console.error('Handle answer failed:', error);
      safeCallback(onError, error);
    }
  };

  const handleCandidate = async (payload) => {
    try {
      if (!peerConnection || !payload.candidate) return;

      await peerConnection.addIceCandidate(
        new RTCIceCandidate(payload.candidate)
      );
    } catch (error) {
      console.error('Handle ICE candidate failed:', error);
    }
  };

  const handleDeclined = (payload) => {
    safeCallback(onCallDeclined, payload);
    safeCallback(onStatus, 'declined');
    cleanupCall();
  };

  const handleCancelled = (payload) => {
    safeCallback(onCallCancelled, payload);
    safeCallback(onStatus, 'cancelled');
    cleanupCall();
  };

  const handleEnded = (payload) => {
    safeCallback(onCallEnded, payload);
    safeCallback(onStatus, 'ended');
    cleanupCall();
  };

  const handleCleanup = (payload) => {
    safeCallback(onCallEnded, payload);
    cleanupCall();
  };

  socket.on('call:incoming', handleIncomingCall);
  socket.on('call:ringing', handleRinging);
  socket.on('call:accepted', handleAccepted);
  socket.on('call:offer', handleOffer);
  socket.on('call:answer', handleAnswer);
  socket.on('call:candidate', handleCandidate);
  socket.on('call:declined', handleDeclined);
  socket.on('call:cancelled', handleCancelled);
  socket.on('call:end', handleEnded);
  socket.on('call:cleanup', handleCleanup);

  return () => {
    socket.off('call:incoming', handleIncomingCall);
    socket.off('call:ringing', handleRinging);
    socket.off('call:accepted', handleAccepted);
    socket.off('call:offer', handleOffer);
    socket.off('call:answer', handleAnswer);
    socket.off('call:candidate', handleCandidate);
    socket.off('call:declined', handleDeclined);
    socket.off('call:cancelled', handleCancelled);
    socket.off('call:end', handleEnded);
    socket.off('call:cleanup', handleCleanup);
  };
}

export function declineCall({ callId, userId, reason = 'declined' } = {}) {
  const socket = getSocket();

  if (!callId) return;

  socket.emit('call:decline', {
    callId,
    userId,
    reason,
  });

  cleanupCall();
}

export function cancelCall({ callId, userId } = {}) {
  const socket = getSocket();
  const finalCallId = callId || currentCall?.callId;

  if (!finalCallId) {
    cleanupCall();
    return;
  }

  socket.emit('call:cancel', {
    callId: finalCallId,
    userId,
  });

  cleanupCall();
}

export function endCall({ callId, roomId, myUserId } = {}) {
  const socket = getSocket();

  const finalCallId = callId || currentCall?.callId;
  const finalRoomId = roomId || currentCall?.roomId;

  if (finalRoomId) {
    socket.emit('call:end', {
      callId: finalCallId,
      roomId: finalRoomId,
      fromUserId: myUserId,
    });
  }

  cleanupCall();
}

export function toggleMicrophone(enabled) {
  if (!localStream) return false;

  localStream.getAudioTracks().forEach((track) => {
    track.enabled = Boolean(enabled);
  });

  const socket = getSocket();

  if (currentCall?.roomId) {
    socket.emit('call:media-toggle', {
      callId: currentCall.callId,
      roomId: currentCall.roomId,
      audioEnabled: Boolean(enabled),
      videoEnabled: getCameraEnabled(),
    });
  }

  return Boolean(enabled);
}

export function toggleCamera(enabled) {
  if (!localStream) return false;

  localStream.getVideoTracks().forEach((track) => {
    track.enabled = Boolean(enabled);
  });

  const socket = getSocket();

  if (currentCall?.roomId) {
    socket.emit('call:media-toggle', {
      callId: currentCall.callId,
      roomId: currentCall.roomId,
      audioEnabled: getMicrophoneEnabled(),
      videoEnabled: Boolean(enabled),
    });
  }

  return Boolean(enabled);
}

export function getMicrophoneEnabled() {
  return localStream?.getAudioTracks()?.some((track) => track.enabled) || false;
}

export function getCameraEnabled() {
  return localStream?.getVideoTracks()?.some((track) => track.enabled) || false;
}

export function getCurrentCall() {
  return currentCall;
}

export function getLocalStream() {
  return localStream;
}

export function getRemoteStream() {
  return remoteStream;
}

export function getPeerConnection() {
  return peerConnection;
}

export function cleanupCall() {
  try {
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }
  } catch {}

  try {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  } catch {}

  try {
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
  } catch {}

  peerConnection = null;
  localStream = null;
  remoteStream = null;
  currentCall = null;
  isCaller = false;
}

export default {
  startCall,
  acceptCall,
  listenForCallEvents,
  declineCall,
  cancelCall,
  endCall,
  toggleMicrophone,
  toggleCamera,
  getMicrophoneEnabled,
  getCameraEnabled,
  getCurrentCall,
  getLocalStream,
  getRemoteStream,
  getPeerConnection,
  cleanupCall,
};
