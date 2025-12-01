'use client';

import React, { useEffect, useMemo, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
import { 
  Loader2, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  ChevronsUpDown,
  ArrowUpDown,
  Package,
  Scissors,
  Droplets,
  CheckCircle2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { OrderFilters } from '@/components/orders/order-filters';
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';

// Types for Local Orders
interface OrderLine {
  id: string;
  styleNumber?: string;
  colorCode?: string;
  cadCode?: string;
  description?: string;
  quantity: number;
  unit: string;
  millPrice?: number;
  millPriceTotal?: number;
  currency?: string;
  etd?: string;
  status?: string;
  approvalStatus?: Record<string, string>;
  approvalDates?: Record<string, string>;
  // Local order production fields
  yarnRequired?: number;
  yarnBookedDate?: string;
  yarnReceivedDate?: string;
  ppYards?: number;
  fitCumPpSubmitDate?: string;
  fitCumPpCommentsDate?: string;
  knittingStartDate?: string;
  knittingCompleteDate?: string;
  dyeingStartDate?: string;
  dyeingCompleteDate?: string;
  bulkSizeSetDate?: string;
  cuttingStartDate?: string;
  cuttingCompleteDate?: string;
  printSendDate?: string;
  printReceivedDate?: string;
  sewingInputDate?: string;
  sewingFinishDate?: string;
  packingCompleteDate?: string;
  finalInspectionDate?: string;
  exFactoryDate?: string;
}

interface Order {
  id: string;
  poNumber: string;
  customerName: string;
  fabricType: string;
  quantity: number;
  unit: string;
  status: string;
  category: string;
  orderDate: string;
  expectedDeliveryDate: string;
  currency?: string;
  merchandiserName?: string;
  earliestEtd?: string;
  lineStatusCounts?: Record<string, number>;
  lines?: OrderLine[];
  orderType?: string;
}

interface OrdersFilterParams {
  search?: string | null;
  status?: string | null;
  orderDateFrom?: string | null;
  orderDateTo?: string | null;
}

// Derive production stage from line-level dates
function deriveLineProductionStage(line: OrderLine): string {
  if (line.exFactoryDate) return 'Ex-Factory';
  if (line.packingCompleteDate) return 'Packed';
  if (line.sewingFinishDate) return 'Sewing Complete';
  if (line.sewingInputDate) return 'Sewing';
  if (line.cuttingCompleteDate) return 'Cut';
  if (line.cuttingStartDate) return 'Cutting';
  if (line.dyeingCompleteDate) return 'Dyed';
  if (line.dyeingStartDate) return 'Dyeing';
  if (line.knittingCompleteDate) return 'Knitted';
  if (line.knittingStartDate) return 'Knitting';
  if (line.yarnReceivedDate) return 'Yarn In';
  if (line.yarnBookedDate) return 'Yarn Booked';
  return 'Pre-Yarn';
}

// Get stage badge color
function getStageBadgeClass(stage: string): string {
  const stageColors: Record<string, string> = {
    'Pre-Yarn': 'bg-gray-100 text-gray-700 border-gray-300',
    'Yarn Booked': 'bg-amber-50 text-amber-700 border-amber-300',
    'Yarn In': 'bg-amber-100 text-amber-800 border-amber-400',
    'Knitting': 'bg-blue-100 text-blue-700 border-blue-300',
    'Knitted': 'bg-blue-200 text-blue-800 border-blue-400',
    'Dyeing': 'bg-purple-100 text-purple-700 border-purple-300',
    'Dyed': 'bg-purple-200 text-purple-800 border-purple-400',
    'Cutting': 'bg-orange-100 text-orange-700 border-orange-300',
    'Cut': 'bg-orange-200 text-orange-800 border-orange-400',
    'Sewing': 'bg-pink-100 text-pink-700 border-pink-300',
    'Sewing Complete': 'bg-pink-200 text-pink-800 border-pink-400',
    'Packed': 'bg-green-100 text-green-700 border-green-300',
    'Ex-Factory': 'bg-green-200 text-green-800 border-green-400',
  };
  return stageColors[stage] || 'bg-gray-100 text-gray-600 border-gray-200';
}

// Aggregate line stages to derive order-level stage
function deriveOrderProductionStage(lines: OrderLine[]): string {
  if (!lines || lines.length === 0) return 'Pre-Yarn';
  
  const stages = lines.map(deriveLineProductionStage);
  const stageOrder = [
    'Pre-Yarn', 'Yarn Booked', 'Yarn In', 'Knitting', 'Knitted',
    'Dyeing', 'Dyed', 'Cutting', 'Cut', 'Sewing', 'Sewing Complete',
    'Packed', 'Ex-Factory'
  ];
  
  // Find the minimum stage (least progressed line)
  let minStageIndex = stageOrder.length - 1;
  for (const stage of stages) {
    const idx = stageOrder.indexOf(stage);
    if (idx !== -1 && idx < minStageIndex) {
      minStageIndex = idx;
    }
  }
  
  return stageOrder[minStageIndex];
}

// Calculate aggregated production metrics from all lines across all orders
function calculateProductionMetrics(orders: Order[]) {
  let totalLines = 0;
  let yarnReceivedLines = 0;
  let knittingStartedLines = 0;
  let knittingCompleteLines = 0;
  let dyeingStartedLines = 0;
  let dyeingCompleteLines = 0;
  let sewingFinishLines = 0;
  let exFactoryLines = 0;

  orders.forEach(order => {
    (order.lines || []).forEach(line => {
      totalLines++;
      if (line.yarnReceivedDate) yarnReceivedLines++;
      if (line.knittingStartDate) knittingStartedLines++;
      if (line.knittingCompleteDate) knittingCompleteLines++;
      if (line.dyeingStartDate) dyeingStartedLines++;
      if (line.dyeingCompleteDate) dyeingCompleteLines++;
      if (line.sewingFinishDate) sewingFinishLines++;
      if (line.exFactoryDate) exFactoryLines++;
    });
  });

  return {
    totalLines,
    yarn: {
      received: yarnReceivedLines,
      percent: totalLines > 0 ? (yarnReceivedLines / totalLines) * 100 : 0,
    },
    knitting: {
      started: knittingStartedLines,
      complete: knittingCompleteLines,
      percent: totalLines > 0 ? (knittingCompleteLines / totalLines) * 100 : 0,
    },
    dyeing: {
      started: dyeingStartedLines,
      complete: dyeingCompleteLines,
      percent: totalLines > 0 ? (dyeingCompleteLines / totalLines) * 100 : 0,
    },
    finishing: {
      sewingComplete: sewingFinishLines,
      exFactory: exFactoryLines,
      percent: totalLines > 0 ? (exFactoryLines / totalLines) * 100 : 0,
    },
  };
}

export default function LocalOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState<OrdersFilterParams>({});
  const [sortByEtd, setSortByEtd] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const handleFiltersChange = (newFilters: OrdersFilterParams) => {
    setFilters((prev) => {
      if (
        prev.search === newFilters.search &&
        prev.status === newFilters.status &&
        prev.orderDateFrom === newFilters.orderDateFrom &&
        prev.orderDateTo === newFilters.orderDateTo
      ) {
        return prev;
      }
      return newFilters;
    });
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchOrders(filters);
  }, [isAuthenticated, router, filters]);

  const fetchOrders = async (filtersToUse?: OrdersFilterParams, silent = false) => {
    try {
      if (!silent && orders.length === 0) {
        setLoading(true);
      }

      const params: Record<string, string> = { 
        _t: String(Date.now()),
        order_type: 'local', // Filter for local orders only
      };
      if (filtersToUse?.search) params.search = filtersToUse.search;
      if (filtersToUse?.status) params.status = filtersToUse.status;
      if (filtersToUse?.orderDateFrom) params.order_date_from = filtersToUse.orderDateFrom;
      if (filtersToUse?.orderDateTo) params.order_date_to = filtersToUse.orderDateTo;

      const response = await api.get('/orders', { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch local orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate production metrics from all orders
  const productionMetrics = useMemo(() => calculateProductionMetrics(orders), [orders]);

  const getStatusBadgeClass = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'upcoming') {
      return 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-100';
    } else if (lowerStatus === 'in_development') {
      return 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-100';
    } else if (lowerStatus === 'running') {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100';
    } else if (lowerStatus === 'bulk') {
      return 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-100';
    } else if (lowerStatus === 'completed') {
      return 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-100';
    } else if (lowerStatus === 'archived') {
      return 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-100';
    }
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      'upcoming': 'Upcoming',
      'in_development': 'In Development',
      'running': 'Running Order',
      'bulk': 'Bulk',
      'completed': 'Completed',
      'archived': 'Archived'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const renderAggregatedStatus = (order: Order) => {
    const statusCounts = order.lineStatusCounts || {};
    const statuses = Object.keys(statusCounts);

    if (statuses.length === 0) {
      return (
        <Badge className={getStatusBadgeClass(order.status)}>
          {getStatusDisplayName(order.status)}
        </Badge>
      );
    }

    if (statuses.length === 1) {
      return (
        <Badge className={getStatusBadgeClass(statuses[0])}>
          {getStatusDisplayName(statuses[0])}
        </Badge>
      );
    }

    const statusPriority = ['running', 'bulk', 'in_development', 'upcoming', 'completed', 'archived'];
    const sortedStatuses = statuses.sort((a, b) => 
      statusPriority.indexOf(a) - statusPriority.indexOf(b)
    );

    return (
      <div className="flex flex-col gap-1">
        {sortedStatuses.map(status => (
          <Badge 
            key={status} 
            className={`${getStatusBadgeClass(status)} text-xs px-2 py-0.5`}
          >
            {statusCounts[status]} {getStatusDisplayName(status)}
          </Badge>
        ))}
      </div>
    );
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/orders/${orderToDelete.id}/`);

      toast({
        title: 'Success',
        description: 'Order deleted successfully',
      });

      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      await fetchOrders(filters);
    } catch (error: any) {
      console.error('Error deleting order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete order';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading local orders...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Local Orders</h1>
            <p className="text-gray-500 mt-2">Manage local production orders with stage tracking</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Local Order
          </Button>
        </div>

        {/* Create Order Dialog - defaults to local type */}
        <CreateOrderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => fetchOrders(filters)}
          defaultOrderType="local"
        />

        {/* Production Stage Cards - Aggregated from line-level data */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Yarn Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                Yarn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-500">Received / Total Lines</span>
                <span className="font-semibold">
                  {productionMetrics.yarn.received} / {productionMetrics.totalLines}
                </span>
              </div>
              <Progress value={productionMetrics.yarn.percent} className="h-2" />
              <div className="flex justify-end text-xs text-gray-500">
                {productionMetrics.yarn.percent.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          {/* Knitting Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Scissors className="h-4 w-4 text-blue-500" />
                Knitting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-500">Complete / Total Lines</span>
                <span className="font-semibold">
                  {productionMetrics.knitting.complete} / {productionMetrics.totalLines}
                </span>
              </div>
              <Progress value={productionMetrics.knitting.percent} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Started: {productionMetrics.knitting.started}</span>
                <span>{productionMetrics.knitting.percent.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Dyeing Card */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-purple-500" />
                Dyeing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-500">Complete / Total Lines</span>
                <span className="font-semibold">
                  {productionMetrics.dyeing.complete} / {productionMetrics.totalLines}
                </span>
              </div>
              <Progress value={productionMetrics.dyeing.percent} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Started: {productionMetrics.dyeing.started}</span>
                <span>{productionMetrics.dyeing.percent.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Finishing Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Finishing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-500">Ex-Factory / Total Lines</span>
                <span className="font-semibold">
                  {productionMetrics.finishing.exFactory} / {productionMetrics.totalLines}
                </span>
              </div>
              <Progress value={productionMetrics.finishing.percent} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Sewing Done: {productionMetrics.finishing.sewingComplete}</span>
                <span>{productionMetrics.finishing.percent.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Suspense fallback={null}>
          <OrderFilters onFilterChange={handleFiltersChange} />
        </Suspense>

        {/* Orders Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Local Orders</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (expandedOrders.size === orders.length) {
                    setExpandedOrders(new Set());
                  } else {
                    setExpandedOrders(new Set(orders.map(o => o.id)));
                  }
                }}
              >
                <ChevronsUpDown className="mr-2 h-4 w-4" />
                {expandedOrders.size === orders.length ? 'Collapse All' : 'Expand All'}
              </Button>
              <Button
                variant={sortByEtd ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortByEtd(!sortByEtd)}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort by ETD
              </Button>
            </div>
          </CardHeader>
          <CardContent 
            ref={mainScrollRef}
            className="max-h-[calc(100vh-520px)] overflow-y-auto"
          >
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No local orders found</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Local Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium w-12">S/N</th>
                      <th className="pb-3 font-medium w-8"></th>
                      <th className="pb-3 font-medium">PO #</th>
                      <th className="pb-3 font-medium">Vendor</th>
                      <th className="pb-3 font-medium">Fabric Type</th>
                      <th className="pb-3 font-medium">Quantity</th>
                      <th className="pb-3 font-medium">Production Stage</th>
                      <th className="pb-3 font-medium">ETD</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Order Date</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(sortByEtd
                      ? [...orders].sort((a, b) => {
                          if (!a.earliestEtd && !b.earliestEtd) return 0;
                          if (!a.earliestEtd) return 1;
                          if (!b.earliestEtd) return -1;
                          return new Date(a.earliestEtd).getTime() - new Date(b.earliestEtd).getTime();
                        })
                      : orders
                    ).map((order, index) => {
                      const isExpanded = expandedOrders.has(order.id);
                      const lines = order.lines || [];
                      const orderStage = deriveOrderProductionStage(lines);
                      
                      return (
                        <React.Fragment key={order.id}>
                          {/* Main order row */}
                          <tr
                            className="text-sm cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              if (lines.length > 0) {
                                toggleOrderExpanded(order.id);
                              }
                            }}
                          >
                            <td className="py-4 text-gray-500 font-medium">{index + 1}</td>
                            <td className="py-4">
                              {lines.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOrderExpanded(order.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </td>
                            <td className="py-4 font-medium">{order.poNumber}</td>
                            <td className="py-4">{order.customerName}</td>
                            <td className="py-4">{order.fabricType}</td>
                            <td className="py-4">{order.quantity.toLocaleString()} {order.unit}</td>
                            <td className="py-4">
                              <Badge className={`${getStageBadgeClass(orderStage)} border`}>
                                {orderStage}
                              </Badge>
                            </td>
                            <td className="py-4">
                              {order.earliestEtd ? (
                                <span className="font-medium">{formatDate(order.earliestEtd)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4">
                              {renderAggregatedStatus(order)}
                            </td>
                            <td className="py-4">{order.orderDate ? formatDate(order.orderDate) : '-'}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(`/orders/${order.id}`);
                                  }}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(`/orders/${order.id}/edit`);
                                  }}
                                  title="Edit Order"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteClick(order);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Order"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded line items with production timeline */}
                          {isExpanded && lines.length > 0 && (
                            <tr>
                              <td colSpan={11} className="p-0">
                                <div className="bg-gradient-to-b from-slate-50 to-white border-t border-b border-slate-200 p-4">
                                  <div className="text-xs font-semibold text-slate-600 mb-3">
                                    Line Items ({lines.length}) - Production Timeline
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1200px] text-xs">
                                      <thead>
                                        <tr className="text-slate-600 bg-slate-100/50">
                                          <th className="py-2 px-2 text-left font-semibold">Style / Color</th>
                                          <th className="py-2 px-2 text-left font-semibold">Qty</th>
                                          <th className="py-2 px-2 text-left font-semibold">Stage</th>
                                          <th className="py-2 px-2 text-left font-semibold">Yarn Rcvd</th>
                                          <th className="py-2 px-2 text-left font-semibold">Knit Start</th>
                                          <th className="py-2 px-2 text-left font-semibold">Knit Done</th>
                                          <th className="py-2 px-2 text-left font-semibold">Dye Start</th>
                                          <th className="py-2 px-2 text-left font-semibold">Dye Done</th>
                                          <th className="py-2 px-2 text-left font-semibold">Cut Start</th>
                                          <th className="py-2 px-2 text-left font-semibold">Cut Done</th>
                                          <th className="py-2 px-2 text-left font-semibold">Sew Start</th>
                                          <th className="py-2 px-2 text-left font-semibold">Sew Done</th>
                                          <th className="py-2 px-2 text-left font-semibold">Ex-Factory</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {lines.map((line) => {
                                          const lineStage = deriveLineProductionStage(line);
                                          return (
                                            <tr 
                                              key={line.id} 
                                              className="border-t border-slate-200 hover:bg-slate-50/80"
                                            >
                                              <td className="py-2 px-2">
                                                <div className="flex flex-wrap items-center gap-1">
                                                  <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                                                    {line.styleNumber || '-'}
                                                  </Badge>
                                                  {line.colorCode && (
                                                    <Badge className="bg-pink-100 text-pink-700 text-xs">
                                                      {line.colorCode}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="py-2 px-2">{line.quantity?.toLocaleString() || '-'}</td>
                                              <td className="py-2 px-2">
                                                <Badge className={`${getStageBadgeClass(lineStage)} border text-xs`}>
                                                  {lineStage}
                                                </Badge>
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.yarnReceivedDate ? (
                                                  <span className="text-green-600 font-medium">{formatDate(line.yarnReceivedDate)}</span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.knittingStartDate ? formatDate(line.knittingStartDate) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.knittingCompleteDate ? (
                                                  <span className="text-blue-600 font-medium">{formatDate(line.knittingCompleteDate)}</span>
                                                ) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.dyeingStartDate ? formatDate(line.dyeingStartDate) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.dyeingCompleteDate ? (
                                                  <span className="text-purple-600 font-medium">{formatDate(line.dyeingCompleteDate)}</span>
                                                ) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.cuttingStartDate ? formatDate(line.cuttingStartDate) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.cuttingCompleteDate ? formatDate(line.cuttingCompleteDate) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.sewingInputDate ? formatDate(line.sewingInputDate) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.sewingFinishDate ? (
                                                  <span className="text-green-600 font-medium">{formatDate(line.sewingFinishDate)}</span>
                                                ) : '-'}
                                              </td>
                                              <td className="py-2 px-2">
                                                {line.exFactoryDate ? (
                                                  <span className="text-green-700 font-bold">{formatDate(line.exFactoryDate)}</span>
                                                ) : '-'}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete order &quot;{orderToDelete?.poNumber}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
