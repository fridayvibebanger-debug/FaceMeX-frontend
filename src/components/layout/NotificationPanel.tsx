import { Bell, Heart, MessageCircle, UserPlus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/store/notificationStore';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const notifications = useNotificationStore((s) => s.notifications);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const view: Notification[] = (notifications || []).map((n: any) => ({
    id: String(n.id || n._id || ''),
    type: (n.type === 'like' || n.type === 'comment' || n.type === 'follow' ? n.type : 'follow') as Notification['type'],
    user: {
      name: String(n.title || 'User'),
      avatar: String(n.avatar || ''),
    },
    content: String(n.message || ''),
    timestamp: n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp || Date.now()),
    read: !!n.isRead,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Notifications</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {view.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No notifications yet.</div>
                ) : view.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.user.avatar} />
                      <AvatarFallback>{notification.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getIcon(notification.type)}
                        <p className="text-sm">
                          <span className="font-semibold">{notification.user.name}</span>{' '}
                          {notification.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
