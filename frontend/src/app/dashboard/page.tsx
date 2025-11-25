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

          {/* Key Metrics & Charts - Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders by Stage with Visual Breakdown */}
            {data.byStage && (
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardTitle className="text-lg">Orders Distribution by Stage</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {chartLoading ? (
                    <div className="flex items-center justify-center h-[280px]">
                      <p className="text-gray-500 text-sm">Loading chart...</p>
                    </div>
                  ) : (
                    <OrdersByStageChart data={chartData?.orders_by_stage || []} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Monthly Trends */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="text-lg">Monthly Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[280px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <MonthlyTrendsChart data={chartData?.orders_trend || []} />
                )}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-around text-center">
                  <div>
                    <div className="text-lg font-semibold text-indigo-600">{data.totalCount}</div>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-emerald-600">{data.runningCount}</div>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-600">{data.archivedCount}</div>
                    <p className="text-xs text-gray-500">Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline & Workload - Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming ETD/ETA Timeline */}
            {data.upcoming && (
              <Card className="lg:col-span-2 shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                  <CardTitle className="text-lg">Upcoming Delivery Timeline</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        ETD (Estimated Time of Dispatch)
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-sm text-gray-600">Next 7 days</span>
                          <span className="text-xl font-bold text-blue-600">{data.upcoming.etd.next7}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-sm text-gray-600">Next 14 days</span>
                          <span className="text-xl font-bold text-blue-600">{data.upcoming.etd.next14}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-sm text-gray-600">Next 30 days</span>
                          <span className="text-xl font-bold text-blue-600">{data.upcoming.etd.next30}</span>
                        </div>
                        {data.upcoming.etd.overdue > 0 && (
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-300">
                            <span className="text-sm text-gray-600">Overdue</span>
                            <span className="text-xl font-bold text-red-600">{data.upcoming.etd.overdue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        ETA (Estimated Time of Arrival)
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-sm text-gray-600">Next 7 days</span>
                          <span className="text-xl font-bold text-green-600">{data.upcoming.eta.next7}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-sm text-gray-600">Next 14 days</span>
                          <span className="text-xl font-bold text-green-600">{data.upcoming.eta.next14}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-sm text-gray-600">Next 30 days</span>
                          <span className="text-xl font-bold text-green-600">{data.upcoming.eta.next30}</span>
                        </div>
                        {data.upcoming.eta.overdue > 0 && (
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-300">
                            <span className="text-sm text-gray-600">Overdue</span>
                            <span className="text-xl font-bold text-red-600">{data.upcoming.eta.overdue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Merchandiser Workload */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-lg">Team Workload</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500 text-sm">Loading...</p>
                  </div>
                ) : (
                  <MerchandiserWorkloadChart data={chartData?.orders_by_merchandiser || []} />
                )}
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

          {/* Key Metrics & Charts - Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Orders by Stage with Visual Breakdown */}
            {data.byStage && (
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardTitle className="text-lg">My Orders Distribution by Stage</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {chartLoading ? (
                    <div className="flex items-center justify-center h-[280px]">
                      <p className="text-gray-500 text-sm">Loading chart...</p>
                    </div>
                  ) : (
                    <OrdersByStageChart data={chartData?.orders_by_stage || []} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* My Monthly Trends */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="text-lg">My Monthly Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[280px]">
                    <p className="text-gray-500 text-sm">Loading chart...</p>
                  </div>
                ) : (
                  <MonthlyTrendsChart data={chartData?.orders_trend || []} />
                )}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-around text-center">
                  <div>
                    <div className="text-lg font-semibold text-indigo-600">{data.myTotalCount}</div>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-emerald-600">{data.myRunningCount}</div>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-600">{data.myArchivedCount}</div>
                    <p className="text-xs text-gray-500">Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Overview - Second Row */}
          {data.upcoming && (
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <CardTitle className="text-lg">My Upcoming Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      ETD (Estimated Time of Dispatch)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-gray-600">Next 7 days</span>
                        <span className="text-xl font-bold text-blue-600">{data.upcoming.etd.next7}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-gray-600">Next 14 days</span>
                        <span className="text-xl font-bold text-blue-600">{data.upcoming.etd.next14}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-gray-600">Next 30 days</span>
                        <span className="text-xl font-bold text-blue-600">{data.upcoming.etd.next30}</span>
                      </div>
                      {data.upcoming.etd.overdue > 0 && (
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-300">
                          <span className="text-sm text-gray-600">Overdue</span>
                          <span className="text-xl font-bold text-red-600">{data.upcoming.etd.overdue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-600" />
                      ETA (Estimated Time of Arrival)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm text-gray-600">Next 7 days</span>
                        <span className="text-xl font-bold text-green-600">{data.upcoming.eta.next7}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm text-gray-600">Next 14 days</span>
                        <span className="text-xl font-bold text-green-600">{data.upcoming.eta.next14}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm text-gray-600">Next 30 days</span>
                        <span className="text-xl font-bold text-green-600">{data.upcoming.eta.next30}</span>
                      </div>
                      {data.upcoming.eta.overdue > 0 && (
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-300">
                          <span className="text-sm text-gray-600">Overdue</span>
                          <span className="text-xl font-bold text-red-600">{data.upcoming.eta.overdue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


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
