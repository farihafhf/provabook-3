'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AlertsWidget } from '@/components/dashboard/alerts-widget';
import { ApprovalQueue } from '@/components/dashboard/approval-queue';
import type { AlertsWidgetOrder } from '@/components/dashboard/alerts-widget';
import type { ApprovalQueueOrder } from '@/components/dashboard/approval-queue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Package, TrendingUp, Clock, Archive, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import OrdersByStageChart from '@/components/dashboard/charts/OrdersByStageChart';
import MerchandiserWorkloadChart from '@/components/dashboard/charts/MerchandiserWorkloadChart';
import MonthlyTrendsChart from '@/components/dashboard/charts/MonthlyTrendsChart';
import { FinancialCharts } from '@/components/dashboard/financial-charts';
import { PendingLCs } from '@/components/dashboard/pending-lcs';
import { MyTasksWidget } from '@/components/dashboard/my-tasks-widget';

interface DashboardActivity {
  id: string;
  action: string;
  userName: string;
  orderNumber: string;
  customerName?: string;
  buyerName?: string;
  timestamp: string;
  details: any;
}

type DateWindow = {
  next7: number;
  next14: number;
  next30: number;
  overdue: number;
}

interface ManagerDashboard {
  totalCount: number;
  upcomingCount: number;
  runningCount: number;
  archivedCount: number;
  recentActivities: DashboardActivity[];
  byStage?: Record<string, number>;
  upcoming?: {
    etd: DateWindow;
    eta: DateWindow;
  };
}

interface MerchandiserDashboard {
  myTotalCount: number;
  myUpcomingCount: number;
  myRunningCount: number;
  myArchivedCount: number;
  recentActivities: DashboardActivity[];
  byStage?: Record<string, number>;
  upcoming?: {
    etd: DateWindow;
    eta: DateWindow;
  };
}

interface ChartData {
  name: string;
  value: number;
}

interface DashboardStats {
  orders_by_stage: ChartData[];
  orders_by_merchandiser: ChartData[];
  orders_trend: ChartData[];
}

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [dashboardData, setDashboardData] = useState<ManagerDashboard | MerchandiserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [upcomingEtdAlerts, setUpcomingEtdAlerts] = useState<AlertsWidgetOrder[]>([]);
  const [stuckApprovalAlerts, setStuckApprovalAlerts] = useState<ApprovalQueueOrder[]>([]);
  const [chartData, setChartData] = useState<DashboardStats | null>(null);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchDashboard();
    fetchAlertData();
    fetchChartData();
  }, [isAuthenticated, router]);

  // Refetch data when window gains focus to ensure fresh counts
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated()) {
        fetchDashboard();
        fetchChartData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

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

  const fetchAlertData = async () => {
    try {
      const [upcomingResult, stuckResult] = await Promise.allSettled([
        api.get('/orders/alerts/upcoming-etd'),
        api.get('/orders/alerts/stuck-approvals'),
      ]);

      if (upcomingResult.status === 'fulfilled') {
        const raw = upcomingResult.value.data as any[];
        const mapped: AlertsWidgetOrder[] = raw.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          etd: order.etd ?? null,
        }));
        setUpcomingEtdAlerts(mapped);
      } else {
        console.error('Failed to fetch upcoming ETD alerts:', upcomingResult.reason);
        setUpcomingEtdAlerts([]);
      }

      if (stuckResult.status === 'fulfilled') {
        const raw = stuckResult.value.data as any[];
        const mapped: ApprovalQueueOrder[] = raw.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          stage: order.currentStage ?? null,
        }));
        setStuckApprovalAlerts(mapped);
      } else {
        console.error('Failed to fetch stuck approvals alerts:', stuckResult.reason);
        setStuckApprovalAlerts([]);
      }
    } catch (error) {
      console.error('Unexpected error while fetching alerts:', error);
      setUpcomingEtdAlerts([]);
      setStuckApprovalAlerts([]);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await api.get('/dashboard/stats', {
        params: { _t: Date.now() }
      });
      setChartData(response.data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setChartLoading(false);
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

          {/* Orders by Stage */}
          {data.byStage && (
            <Card>
              <CardHeader>
                <CardTitle>Orders by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.byStage).map(([stage, count]) => (
                    <div key={stage} className="rounded-full px-3 py-1 text-sm bg-gray-100 border text-gray-700">
                      <span className="font-medium">{stage}</span>: {count}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming ETD/ETA */}
          {data.upcoming && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming ETD</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{data.upcoming.etd.next7}</div>
                      <p className="text-xs text-gray-500">Next 7d</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{data.upcoming.etd.next14}</div>
                      <p className="text-xs text-gray-500">Next 14d</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{data.upcoming.etd.next30}</div>
                      <p className="text-xs text-gray-500">Next 30d</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{data.upcoming.etd.overdue}</div>
                      <p className="text-xs text-gray-500">Overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming ETA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{data.upcoming.eta.next7}</div>
                      <p className="text-xs text-gray-500">Next 7d</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{data.upcoming.eta.next14}</div>
                      <p className="text-xs text-gray-500">Next 14d</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{data.upcoming.eta.next30}</div>
                      <p className="text-xs text-gray-500">Next 30d</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{data.upcoming.eta.overdue}</div>
                      <p className="text-xs text-gray-500">Overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dashboard Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <OrdersByStageChart data={chartData?.orders_by_stage || []} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Merchandiser Workload</CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <MerchandiserWorkloadChart data={chartData?.orders_by_merchandiser || []} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <MonthlyTrendsChart data={chartData?.orders_trend || []} />
                )}
              </CardContent>
            </Card>
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

          {/* Financial Analytics & Pending LCs - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FinancialCharts />
            </div>
            <div className="lg:col-span-1">
              <PendingLCs />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AlertsWidget orders={upcomingEtdAlerts} />
            <ApprovalQueue orders={stuckApprovalAlerts} />
            <MyTasksWidget />
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
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {activity.customerName && (
                            <span className="text-sm text-gray-700">
                              <span className="text-gray-500">Customer:</span> {activity.customerName}
                            </span>
                          )}
                          {activity.buyerName && (
                            <>
                              {activity.customerName && <span className="text-gray-400">•</span>}
                              <span className="text-sm text-gray-700">
                                <span className="text-gray-500">Buyer:</span> {activity.buyerName}
                              </span>
                            </>
                          )}
                          {(activity.customerName || activity.buyerName) && (
                            <span className="text-gray-400">•</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {activity.orderNumber}
                          </Badge>
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

          {/* Dashboard Charts - Merchandiser View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>My Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <OrdersByStageChart data={chartData?.orders_by_stage || []} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Monthly Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <MonthlyTrendsChart data={chartData?.orders_trend || []} />
                )}
              </CardContent>
            </Card>
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

          {/* My Financial Analytics & Pending LCs - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FinancialCharts />
            </div>
            <div className="lg:col-span-1">
              <PendingLCs />
            </div>
          </div>

          {/* My Tasks */}
          <MyTasksWidget />

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
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">{activity.userName}</span>
                          {' '}
                          <span className="text-gray-600">{activity.action}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {activity.customerName && (
                            <span className="text-sm text-gray-700">
                              <span className="text-gray-500">Customer:</span> {activity.customerName}
                            </span>
                          )}
                          {activity.buyerName && (
                            <>
                              {activity.customerName && <span className="text-gray-400">•</span>}
                              <span className="text-sm text-gray-700">
                                <span className="text-gray-500">Buyer:</span> {activity.buyerName}
                              </span>
                            </>
                          )}
                          {(activity.customerName || activity.buyerName) && (
                            <span className="text-gray-400">•</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {activity.orderNumber}
                          </Badge>
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
