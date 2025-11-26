'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { Bell, CheckCircle, Clock, AlertCircle, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchNotifications();
  }, [isAuthenticated, router]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const data = response.data as any;
      // Support both plain list and paginated { results: [...] } shapes
      const list: Notification[] = Array.isArray(data)
        ? data
        : (data?.results || []);
      setNotifications(list);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <AlertCircle className="h-5 w-5 text-purple-600" />;
      case 'approval_needed':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'status_update':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'delivery_recorded':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'etd_reminder':
        return <Clock className="h-5 w-5 text-red-600" />;
      case 'eta_alert_high':
        return <Clock className="h-5 w-5 text-red-600" />;
      case 'eta_alert_medium':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate to related content if available
    if (notification.relatedType === 'order' && notification.relatedId) {
      // Go directly to the related order details page
      router.push(`/orders/${notification.relatedId}`);
      return;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-gray-500 mt-2">
              Stay updated with system alerts and reminders
              {unreadCount > 0 && (
                <span className="ml-2 text-purple-600 font-medium">
                  ({unreadCount} unread)
                </span>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      notification.isRead
                        ? 'bg-white hover:bg-gray-50 border-gray-200'
                        : 'bg-purple-50 hover:bg-purple-100 border-purple-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notificationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className={`font-semibold ${!notification.isRead ? 'text-purple-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm mt-1 ${!notification.isRead ? 'text-purple-700' : 'text-gray-600'}`}>
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <Badge className="bg-purple-600 hover:bg-purple-700">New</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
