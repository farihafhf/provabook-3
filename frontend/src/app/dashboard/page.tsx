'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Package, TrendingUp, AlertTriangle, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface Stats {
  totalOrders: number;
  upcomingOrders: number;
  runningOrders: number;
  archivedOrders: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchStats();
  }, [isAuthenticated, router]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/orders/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-2">Welcome to Provabook Operations Platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Upcoming</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats?.upcomingOrders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Pending orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Running</CardTitle>
              <Truck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.runningOrders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Active production</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Archived</CardTitle>
              <AlertTriangle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.archivedOrders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No recent activity to display</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button 
                onClick={() => router.push('/orders')}
                className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">View Orders</p>
                <p className="text-sm text-gray-500">Manage your textile orders</p>
              </button>
              <button 
                onClick={() => router.push('/samples')}
                className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium">Track Samples</p>
                <p className="text-sm text-gray-500">Monitor sample submissions</p>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
