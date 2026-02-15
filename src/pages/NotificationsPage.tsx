import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useNotificationStore } from '@/store/notificationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, load, read, markAllAsRead, readAll } = useNotificationStore();

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-14 md:pt-16 pb-16 md:pb-6 px-3 sm:px-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base md:text-lg">Notifications</CardTitle>
            </div>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => readAll().catch(() => markAllAsRead())}
              >
                Mark all as read
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`w-full text-left p-3 transition-colors ${
                        n.isRead ? 'hover:bg-muted/40' : 'bg-blue-50/60 hover:bg-blue-50'
                      }`}
                      onClick={() => {
                        read(n.id).catch(() => {});
                        if (n.actionUrl) navigate(n.actionUrl);
                      }}
                    >
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="text-sm text-muted-foreground">{n.message}</div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
