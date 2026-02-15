import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, API_URL } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface StoryStep {
  text: string;
  userId?: string;
  createdAt?: string;
}

interface StoryRoom {
  _id: string;
  title: string;
  code: string;
  steps?: StoryStep[];
}

export default function StoriesPage() {
  const [rooms, setRooms] = useState<StoryRoom[]>([]);
  const [title, setTitle] = useState('');
  const [activeRoom, setActiveRoom] = useState<StoryRoom | null>(null);
  const [storyText, setStoryText] = useState('');
  const [newLine, setNewLine] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!API_URL) return;
    const s = io(API_URL, { withCredentials: true });
    setSocket(s);
    return () => {
      s.close();
    };
  }, []);

  const loadRooms = async () => {
    try {
      const res = await api.get('/api/stories') as any;
      setRooms(res.rooms || []);
    } catch (e) {
      console.error('Failed to load story rooms', e);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleStep = (payload: StoryStep) => {
      setStoryText((prev) => (prev ? prev + ' ' + payload.text : payload.text));
    };
    socket.on('story:step', handleStep);
    return () => {
      socket.off('story:step', handleStep);
    };
  }, [socket]);

  const handleCreateRoom = async () => {
    try {
      const res = await api.post('/api/stories', { title }) as any;
      const room = res.room as StoryRoom;
      setRooms((prev) => [room, ...prev]);
      setTitle('');
      await handleJoinRoom(room);
    } catch (e) {
      console.error('Failed to create story room', e);
    }
  };

  const handleJoinRoom = async (room: StoryRoom) => {
    setActiveRoom(room);
    setStoryText('');
    try {
      const res = await api.get(`/api/stories/${room.code}`) as any;
      const full = res.room as StoryRoom;
      if (full.steps && full.steps.length) {
        setStoryText(full.steps.map((s) => s.text).join(' '));
      }
    } catch (e) {
      console.error('Failed to load story room', e);
    }
    if (socket) {
      socket.emit('story:join', { code: room.code });
    }
  };

  const handleAddLine = async () => {
    const line = newLine.trim();
    if (!line || !activeRoom) return;
    setNewLine('');
    try {
      await api.post(`/api/stories/${activeRoom.code}/steps`, { text: line });
    } catch (e) {
      console.error('Failed to persist story line', e);
    }
    setStoryText((prev) => (prev ? prev + ' ' + line : line));
    if (socket) {
      socket.emit('story:add-step', { code: activeRoom.code, text: line });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-16">
        <LeftSidebar />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4 md:flex-row">
          <div className="w-full md:w-1/3 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Live Stories</h1>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New story title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Button size="sm" onClick={handleCreateRoom}>
                Start
              </Button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {rooms.map((room) => (
                <Card
                  key={room._id}
                  className={`cursor-pointer transition-colors ${
                    activeRoom?.code === room.code ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleJoinRoom(room)}
                >
                  <CardContent className="py-3">
                    <div className="text-sm font-medium truncate">{room.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">Code: {room.code}</div>
                  </CardContent>
                </Card>
              ))}
              {rooms.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No live stories yet. Start one and invite friends to join.
                </p>
              )}
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <Card className="h-full">
              <CardHeader className="space-y-2">
                <CardTitle>{activeRoom ? activeRoom.title : 'Select a story room'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  className="min-h-[220px]"
                  readOnly
                  value={storyText}
                  placeholder="When you join a room, the collaborative story will appear here."
                />
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Add the next line..."
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    disabled={!activeRoom}
                  />
                  <Button onClick={handleAddLine} disabled={!activeRoom}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
