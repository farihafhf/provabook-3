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
  severity: 'info' | 'warning' | 'critical';
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

  const getNotificationIcon = (type: string, severity: string) => {
    // ETD alerts use severity-based coloring
    if (type === 'etd_alert') {
      if (severity === 'critical') {
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      } else if (severity === 'warning') {
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      }
    }
    
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

  const getNotificationBgColor = (notification: Notification) => {
    if (notification.isRead) {
      return 'bg-white hover:bg-gray-50 border-gray-200';
    }
    
    // Use severity-based colors for unread notifications
    if (notification.severity === 'critical') {
      return 'bg-red-50 hover:bg-red-100 border-red-200 shadow-sm';
    } else if (notification.severity === 'warning') {
      return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 shadow-sm';
    }
    
    return 'bg-purple-50 hover:bg-purple-100 border-purple-200 shadow-sm';
  };

  const getNotificationTextColor = (notification: Notification) => {
    if (notification.isRead) {
      return { title: 'text-gray-900', message: 'text-gray-600' };
    }
    
    if (notification.severity === 'critical') {
      return { title: 'text-red-900', message: 'text-red-700' };
    } else if (notification.severity === 'warning') {
      return { title: 'text-yellow-900', message: 'text-yellow-700' };
    }
    
    return { title: 'text-purple-900', message: 'text-purple-700' };
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
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${getNotificationBgColor(notification)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notificationType, notification.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className={`font-semibold ${getNotificationTextColor(notification).title}`}>
                              {notification.title}
                            </h3>
                            <p className={`text-sm mt-1 ${getNotificationTextColor(notification).message}`}>
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <Badge className={
                              notification.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                              notification.severity === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                              'bg-purple-600 hover:bg-purple-700'
                            }>New</Badge>
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
