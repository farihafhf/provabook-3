'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';

const PRODUCTION_SELECTED_ORDER_KEY = 'production_selected_order_id';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  category: string;
}

interface ProductionMetric {
  id: string;
  order: string;
  date: string;
  knitted_quantity: number | string;
  dyed_quantity: number | string;
  finished_quantity: number | string;
  notes?: string | null;
}

interface ProductionStageSummary {
  total: number | string;
  percent: number | string;
}

interface ProductionSummary {
  order_id: string;
  target: number | string;
  metrics: {
    knitting: ProductionStageSummary;
    dyeing: ProductionStageSummary;
    finishing: ProductionStageSummary;
  };
}

export default function ProductionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const [metrics, setMetrics] = useState<ProductionMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logForm, setLogForm] = useState({
    date: '',
    knitted: '',
    dyed: '',
    finished: '',
    notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!selectedOrderId) {
      setSummary(null);
      return;
    }

    fetchSummaryForOrder(selectedOrderId);
  }, [selectedOrderId]);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await api.get('/orders/', {
        params: { _t: Date.now() },
      });
      const data = Array.isArray(response.data) ? (response.data as Order[]) : [];
      const active = data.filter((order) => order.category !== 'archived');
      setOrders(active);

      if (typeof window !== 'undefined') {
        const storedId = window.localStorage.getItem(PRODUCTION_SELECTED_ORDER_KEY);
        if (storedId && active.some((order) => order.id === storedId)) {
          setSelectedOrderId(storedId);
          fetchMetricsForOrder(storedId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchMetricsForOrder = async (orderId: string) => {
    if (!orderId) return;
    try {
      setMetricsLoading(true);
      const response = await api.get('/production/', {
        params: { order: orderId, _t: Date.now() },
      });
      const data = Array.isArray(response.data) ? (response.data as ProductionMetric[]) : [];
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch production metrics:', error);
      setMetrics([]);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchSummaryForOrder = async (orderId: string) => {
    if (!orderId) return;
    try {
      setSummaryLoading(true);
      const response = await api.get(`/production/summary/${orderId}/`, {
        params: { _t: Date.now() },
      });
      setSummary(response.data as ProductionSummary);
    } catch (error) {
      console.error('Failed to fetch production summary:', error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query)
      );
    });
  }, [orders, orderSearch]);

  const targetValue = summary ? Number(summary.target || 0) : 0;
  const formattedTarget = targetValue.toLocaleString();

  const getStageSummary = (stage: keyof ProductionSummary['metrics']) => {
    if (!summary) {
      return { total: 0, percent: 0 };
    }

    const data = summary.metrics[stage];
    const total = Number(data?.total ?? 0);
    const percentRaw = Number(data?.percent ?? 0);
    const percent = Math.max(0, Math.min(100, percentRaw));

    return { total, percent };
  };

  const knittingSummary = getStageSummary('knitting');
  const dyeingSummary = getStageSummary('dyeing');
  const finishingSummary = getStageSummary('finishing');

  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PRODUCTION_SELECTED_ORDER_KEY, order.id);
    }
    setOrdersDialogOpen(false);
    setOrderSearch('');
    fetchMetricsForOrder(order.id);
  };

  const handleOpenLogDialog = () => {
    if (!selectedOrderId) {
      toast({
        title: 'Select an order first',
        description: 'Please choose an order before logging production.',
        variant: 'destructive',
      });
      return;
    }
    setLogDialogOpen(true);
  };

  const handleLogProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    setLogSubmitting(true);
    try {
      const payload: any = {
        order: selectedOrderId,
        date: logForm.date || new Date().toISOString().slice(0, 10),
        knitted_quantity: logForm.knitted ? parseFloat(logForm.knitted) : 0,
        dyed_quantity: logForm.dyed ? parseFloat(logForm.dyed) : 0,
        finished_quantity: logForm.finished ? parseFloat(logForm.finished) : 0,
      };
      if (logForm.notes.trim()) {
        payload.notes = logForm.notes.trim();
      }

      const response = await api.post('/production/', payload);
      const created: ProductionMetric = response.data;

      setMetrics((prev) => [created, ...prev]);

      toast({
        title: 'Success',
        description: 'Production entry logged successfully.',
      });

      setLogDialogOpen(false);
      setLogForm({ date: '', knitted: '', dyed: '', finished: '', notes: '' });
    } catch (error: any) {
      console.error('Error logging production:', error);
      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message || error.message || 'Failed to log production';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLogSubmitting(false);
    }
  };

  if (ordersLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading orders...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Production</h1>
            <p className="mt-2 text-gray-500">Log daily production metrics for your orders.</p>
          </div>
          <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenLogDialog} disabled={!orders.length}>
                <Plus className="mr-2 h-4 w-4" />
                Log Production
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log Production Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleLogProduction} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={logForm.date}
                    onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Knitted Qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={logForm.knitted}
                      onChange={(e) => setLogForm({ ...logForm, knitted: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dyed Qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={logForm.dyed}
                      onChange={(e) => setLogForm({ ...logForm, dyed: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Finished Qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={logForm.finished}
                      onChange={(e) => setLogForm({ ...logForm, finished: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                    placeholder="Optional comments"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLogDialogOpen(false)}
                    disabled={logSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={logSubmitting || !selectedOrderId}>
                    {logSubmitting ? 'Saving...' : 'Save Entry'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Order</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">
                No active orders found. Create an order first from the Orders page.
              </p>
            ) : (
              <div className="space-y-3">
                <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedOrder ? (
                        <span>
                          <span className="font-medium">{selectedOrder.orderNumber}</span>{' '}
                          <span className="text-gray-500">- {selectedOrder.customerName}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500">Search and select an order</span>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Select Order</DialogTitle>
                    </DialogHeader>
                    <Command>
                      <CommandInput
                        placeholder="Search by order # or customer"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                      />
                      <CommandList>
                        <CommandEmpty>No orders found.</CommandEmpty>
                        <CommandGroup>
                          {filteredOrders.map((order) => (
                            <CommandItem
                              key={order.id}
                              onClick={() => handleSelectOrder(order)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{order.orderNumber}</span>
                                <span className="text-xs text-gray-500">{order.customerName}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </DialogContent>
                </Dialog>

                {selectedOrder && (
                  <p className="text-sm text-gray-600">
                    Logging production for{' '}
                    <span className="font-medium">{selectedOrder.orderNumber}</span> -{' '}
                    {selectedOrder.customerName}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedOrderId && (
          <div className="grid gap-4 md:grid-cols-3">
            {summaryLoading ? (
              <div className="col-span-3 flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading production summary...</span>
              </div>
            ) : summary ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-700">Knitting</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-500">Total / Target</span>
                      <span className="font-semibold">
                        {knittingSummary.total.toLocaleString()} / {formattedTarget}
                      </span>
                    </div>
                    <Progress value={knittingSummary.percent} indicatorClassName="bg-blue-500" />
                    <div className="flex justify-end text-xs text-gray-500">
                      {knittingSummary.percent.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-700">Dyeing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-500">Total / Target</span>
                      <span className="font-semibold">
                        {dyeingSummary.total.toLocaleString()} / {formattedTarget}
                      </span>
                    </div>
                    <Progress value={dyeingSummary.percent} indicatorClassName="bg-purple-500" />
                    <div className="flex justify-end text-xs text-gray-500">
                      {dyeingSummary.percent.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-700">Finishing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-500">Total / Target</span>
                      <span className="font-semibold">
                        {finishingSummary.total.toLocaleString()} / {formattedTarget}
                      </span>
                    </div>
                    <Progress value={finishingSummary.percent} indicatorClassName="bg-green-500" />
                    <div className="flex justify-end text-xs text-gray-500">
                      {finishingSummary.percent.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="col-span-3 text-sm text-gray-500">
                No summary data available yet for this order.
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Daily Production Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedOrderId ? (
              <p className="text-sm text-gray-500">
                Select an order to view its production entries.
              </p>
            ) : metricsLoading ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading production entries...</span>
              </div>
            ) : metrics.length === 0 ? (
              <p className="text-sm text-gray-500">No production entries logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-gray-600">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Knitted</th>
                      <th className="pb-2 font-medium">Dyed</th>
                      <th className="pb-2 font-medium">Finished</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {metrics.map((metric) => (
                      <tr key={metric.id} className="align-top">
                        <td className="py-2">
                          {metric.date ? formatDate(metric.date) : '-'}
                        </td>
                        <td className="py-2">
                          {Number(metric.knitted_quantity || 0).toLocaleString()}
                        </td>
                        <td className="py-2">
                          {Number(metric.dyed_quantity || 0).toLocaleString()}
                        </td>
                        <td className="py-2">
                          {Number(metric.finished_quantity || 0).toLocaleString()}
                        </td>
                        <td className="py-2 text-gray-600">
                          {metric.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
