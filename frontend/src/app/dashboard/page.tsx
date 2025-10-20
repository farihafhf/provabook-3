'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Package, TrendingUp, Clock, Archive, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface DashboardActivity {
  id: string;
  action: string;
  userName: string;
  orderNumber: string;
  timestamp: string;
  details: any;
}

interface ManagerDashboard {
  totalCount: number;
  upcomingCount: number;
  runningCount: number;
  archivedCount: number;
  recentActivities: DashboardActivity[];
}

interface MerchandiserDashboard {
  myTotalCount: number;
  myUpcomingCount: number;
  myRunningCount: number;
  myArchivedCount: number;
  recentActivities: DashboardActivity[];
}

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [dashboardData, setDashboardData] = useState<ManagerDashboard | MerchandiserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchDashboard();
  }, [isAuthenticated, router]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
      // If response has upcomingCount, it's a manager dashboard
      setIsManager('upcomingCount' in response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Manager Dashboard View
  if (isManager && dashboardData && 'upcomingCount' in dashboardData) {
    const data = dashboardData as ManagerDashboard;
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-gray-500 mt-2">Company-wide overview and activity</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
                <Package className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">{data.totalCount}</div>
                <p className="text-xs text-gray-500 mt-1">All orders</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Upcoming Orders</CardTitle>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600">{data.upcomingCount}</div>
                <p className="text-xs text-gray-500 mt-1">Design phase</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Running Orders</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-emerald-600">{data.runningCount}</div>
                <p className="text-xs text-gray-500 mt-1">Active production</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Archived Orders</CardTitle>
                <Archive className="h-5 w-5 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-slate-700">{data.archivedCount}</div>
                <p className="text-xs text-gray-500 mt-1">Delivered</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Company-Wide Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">{activity.userName}</span>
                          {' '}
                          <span className="text-gray-600">{activity.action}</span>
                          {' '}
                          <span className="text-sm font-medium text-blue-600">
                            {activity.orderNumber}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
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

  // Merchandiser Dashboard View
  if (dashboardData && 'myUpcomingCount' in dashboardData) {
    const data = dashboardData as MerchandiserDashboard;
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-gray-500 mt-2">Your assigned orders and recent activity</p>
          </div>

          {/* My Orders Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">My Total Orders</CardTitle>
                <Package className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">{data.myTotalCount}</div>
                <p className="text-xs text-gray-500 mt-1">All my orders</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">My Upcoming Orders</CardTitle>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600">{data.myUpcomingCount}</div>
                <p className="text-xs text-gray-500 mt-1">Orders in design phase</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">My Running Orders</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-emerald-600">{data.myRunningCount}</div>
                <p className="text-xs text-gray-500 mt-1">Orders in production</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">My Archived Orders</CardTitle>
                <Archive className="h-5 w-5 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-slate-700">{data.myArchivedCount}</div>
                <p className="text-xs text-gray-500 mt-1">Delivered</p>
              </CardContent>
            </Card>
          </div>

          {/* My Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                My Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity on your orders</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">{activity.userName}</span>
                          {' '}
                          <span className="text-gray-600">{activity.action}</span>
                          {' '}
                          <Badge variant="outline" className="ml-1">{activity.orderNumber}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
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

  // Fallback
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    </DashboardLayout>
  );
}
