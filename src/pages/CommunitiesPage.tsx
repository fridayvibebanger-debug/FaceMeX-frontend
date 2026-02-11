import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, Plus, Search, Calendar, MapPin, Clock, 
  Ticket, Globe, Lock, TrendingUp 
} from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { useNavigate } from 'react-router-dom';

export default function CommunitiesPage() {
  const { circles, events, joinCircle, leaveCircle, attendEvent, unattendEvent, createCircle } = useSocialStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('circles');

  const [createOpen, setCreateOpen] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [circleDesc, setCircleDesc] = useState('');
  const [circleCategory, setCircleCategory] = useState<'tech' | 'art' | 'music' | 'gaming' | 'fitness' | 'other'>('tech');
  const [circlePrivate, setCirclePrivate] = useState(false);
  const [circleCover, setCircleCover] = useState('');

  const filteredCircles = circles.filter((circle) =>
    circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    circle.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="flex pt-14 md:pt-16 pb-16 md:pb-0">
        <LeftSidebar />
        <main className="flex-1 lg:ml-64">
          <div className="max-w-6xl mx-auto py-4 md:py-8 px-3 sm:px-4">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Communities & Events
              </h1>
              <p className="text-muted-foreground">
                Connect with like-minded people and join exciting events
              </p>
            </div>

            {/* Search and Create */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search communities and events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create {activeTab === 'circles' ? 'Circle' : 'Event'}
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="circles">
                  <Users className="h-4 w-4 mr-2" />
                  Circles
                </TabsTrigger>
                <TabsTrigger value="events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Events
                </TabsTrigger>
              </TabsList>

              {/* Circles Tab */}
              <TabsContent value="circles" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCircles.map((circle, index) => (
                    <motion.div
                      key={circle.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                        onClick={() => navigate(`/communities/circle/${circle.id}`)}
                      >
                        <div className="relative h-40">
                          <img
                            src={circle.coverImage}
                            alt={circle.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            {circle.isPrivate ? (
                              <Badge variant="secondary" className="bg-background/90">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-background/90">
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{circle.name}</span>
                            <Badge variant="outline" className="capitalize">
                              {circle.category}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {circle.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{circle.memberCount.toLocaleString()} members</span>
                            </div>
                            {circle.isMember ? (
                              <Button
                                onClick={() => leaveCircle(circle.id)}
                                variant="outline"
                                size="sm"
                              >
                                Leave
                              </Button>
                            ) : (
                              <Button
                                onClick={() => joinCircle(circle.id)}
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                              >
                                Join
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created by {circle.creatorName}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow">
                        <div className="relative h-48">
                          <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                          {event.isPaid && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-green-500">
                                <Ticket className="h-3 w-3 mr-1" />
                                R{event.price}
                              </Badge>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge
                              variant="secondary"
                              className={`bg-background/90 ${
                                event.type === 'virtual'
                                  ? 'text-blue-600'
                                  : event.type === 'in-person'
                                  ? 'text-green-600'
                                  : 'text-purple-600'
                              }`}
                            >
                              {event.type}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle>{event.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>

                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{format(event.startTime, 'PPP')}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>
                                {format(event.startTime, 'p')} - {format(event.endTime, 'p')}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{event.location}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {event.tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                #{tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={event.hostAvatar} />
                                <AvatarFallback>{event.hostName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs text-muted-foreground">Hosted by</p>
                                <p className="text-sm font-semibold">{event.hostName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Attendees</p>
                              <p className="text-sm font-semibold">
                                {event.attendeeCount}
                                {event.maxAttendees && ` / ${event.maxAttendees}`}
                              </p>
                            </div>
                          </div>

                          {event.isAttending ? (
                            <Button
                              onClick={() => unattendEvent(event.id)}
                              variant="outline"
                              className="w-full"
                            >
                              Cancel Attendance
                            </Button>
                          ) : (
                            <Button
                              onClick={() => attendEvent(event.id)}
                              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                            >
                              {event.isPaid ? `Get Ticket - R${event.price}` : 'Attend Event'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Circle</DialogTitle>
                  <DialogDescription>
                    Set up a new community circle. This is a local mock creator that uses your current demo data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="e.g. Cape Town Creators"
                      value={circleName}
                      onChange={(e) => setCircleName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="What is this circle about?"
                      value={circleDesc}
                      onChange={(e) => setCircleDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Category</label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={circleCategory}
                        onChange={(e) => setCircleCategory(e.target.value as any)}
                      >
                        <option value="tech">Tech</option>
                        <option value="art">Art</option>
                        <option value="music">Music</option>
                        <option value="gaming">Gaming</option>
                        <option value="fitness">Fitness</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Visibility</label>
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          type="button"
                          className={`flex-1 h-9 rounded-full border text-xs ${
                            !circlePrivate
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-background text-foreground'
                          }`}
                          onClick={() => setCirclePrivate(false)}
                        >
                          <Globe className="h-3 w-3 mr-1 inline" /> Public
                        </button>
                        <button
                          type="button"
                          className={`flex-1 h-9 rounded-full border text-xs ${
                            circlePrivate
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-background text-foreground'
                          }`}
                          onClick={() => setCirclePrivate(true)}
                        >
                          <Lock className="h-3 w-3 mr-1 inline" /> Private
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cover image URL (optional)</label>
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={circleCover}
                      onChange={(e) => setCircleCover(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!circleName.trim()) return;
                      const cover = circleCover.trim() || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80';
                      createCircle({
                        name: circleName.trim(),
                        description: circleDesc.trim() || 'New community circle',
                        coverImage: cover,
                        creatorId: '1',
                        creatorName: 'You',
                        isPrivate: circlePrivate,
                        category: circleCategory,
                      });
                      setCircleName('');
                      setCircleDesc('');
                      setCircleCover('');
                      setCirclePrivate(false);
                      setCircleCategory('tech');
                      setActiveTab('circles');
                      setCreateOpen(false);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    Create Circle
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
