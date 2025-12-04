'use client';

import React, { useEffect, useMemo, useState, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, downloadBlob } from '@/lib/utils';
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
  Download,
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
  deliveredQty?: number;
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
  // Line-level production entry summary
  productionKnitting?: number;
  productionDyeing?: number;
  productionFinishing?: number;
  productionKnittingPercent?: number;
  productionDyeingPercent?: number;
  productionFinishingPercent?: number;
}

interface ProductionSummary {
  totalKnitting: number;
  totalDyeing: number;
  totalFinishing: number;
  knittingEntriesCount: number;
  dyeingEntriesCount: number;
  finishingEntriesCount: number;
  knittingPercent: number;
  dyeingPercent: number;
  finishingPercent: number;
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
  productionSummary?: ProductionSummary;
  lcIssueDate?: string;
  piSentDate?: string;
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

// Approval helper functions
function formatApprovalName(key: string): string {
  const names: Record<string, string> = {
    price: 'Price',
    quality: 'Quality',
    labDip: 'Lab Dip',
    lab_dip: 'Lab Dip',
    strikeOff: 'Strike Off',
    strike_off: 'Strike Off',
    handloom: 'Handloom',
    ppSample: 'PP Sample',
    pp_sample: 'PP Sample',
    aop: 'AOP',
    qualityTest: 'Quality Test',
    quality_test: 'Quality Test',
    bulkSwatch: 'Bulk Swatch',
    bulk_swatch: 'Bulk Swatch',
  };
  return names[key] || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
}

function getApprovalAbbrev(key: string): string {
  const abbrevs: Record<string, string> = {
    price: 'PRC',
    quality: 'QTY',
    labDip: 'LAB',
    lab_dip: 'LAB',
    strikeOff: 'S/O',
    strike_off: 'S/O',
    handloom: 'H/L',
    ppSample: 'PP',
    pp_sample: 'PP',
    aop: 'AOP',
    qualityTest: 'QT',
    quality_test: 'QT',
    bulkSwatch: 'B/S',
    bulk_swatch: 'B/S',
  };
  return abbrevs[key] || key.substring(0, 3).toUpperCase();
}

function getApprovalBadge(status: string) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    submission: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submission' },
    resubmission: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Resubmission' },
    default: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Pending' },
  };
  return statusConfig[status] || statusConfig.default;
}

// Calculate aggregated production metrics from all lines across all orders
// Includes data from both line dates AND productionEntry records
function calculateProductionMetrics(orders: Order[]) {
  let totalLines = 0;
  let totalQuantity = 0;
  let yarnReceivedLines = 0;
  let knittingStartedLines = 0;
  let knittingCompleteLines = 0;
  let dyeingStartedLines = 0;
  let dyeingCompleteLines = 0;
  let sewingFinishLines = 0;
  let exFactoryLines = 0;

  // Aggregated from productionSummary (ProductionEntry records)
  let totalKnittingQty = 0;
  let totalDyeingQty = 0;
  let totalFinishingQty = 0;
  let totalKnittingEntries = 0;
  let totalDyeingEntries = 0;
  let totalFinishingEntries = 0;

  orders.forEach(order => {
    totalQuantity += order.quantity || 0;
    
    // Line-level date-based metrics
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

    // Add productionSummary data from ProductionEntry records
    if (order.productionSummary) {
      totalKnittingQty += order.productionSummary.totalKnitting || 0;
      totalDyeingQty += order.productionSummary.totalDyeing || 0;
      totalFinishingQty += order.productionSummary.totalFinishing || 0;
      totalKnittingEntries += order.productionSummary.knittingEntriesCount || 0;
      totalDyeingEntries += order.productionSummary.dyeingEntriesCount || 0;
      totalFinishingEntries += order.productionSummary.finishingEntriesCount || 0;
    }
  });

  return {
    totalLines,
    totalQuantity,
    yarn: {
      received: yarnReceivedLines,
      percent: totalLines > 0 ? (yarnReceivedLines / totalLines) * 100 : 0,
    },
    knitting: {
      started: knittingStartedLines,
      complete: knittingCompleteLines,
      percent: totalLines > 0 ? (knittingCompleteLines / totalLines) * 100 : 0,
      // From ProductionEntry records
      totalQty: totalKnittingQty,
      entriesCount: totalKnittingEntries,
      qtyPercent: totalQuantity > 0 ? (totalKnittingQty / totalQuantity) * 100 : 0,
    },
    dyeing: {
      started: dyeingStartedLines,
      complete: dyeingCompleteLines,
      percent: totalLines > 0 ? (dyeingCompleteLines / totalLines) * 100 : 0,
      // From ProductionEntry records
      totalQty: totalDyeingQty,
      entriesCount: totalDyeingEntries,
      qtyPercent: totalQuantity > 0 ? (totalDyeingQty / totalQuantity) * 100 : 0,
    },
    finishing: {
      sewingComplete: sewingFinishLines,
      exFactory: exFactoryLines,
      percent: totalLines > 0 ? (exFactoryLines / totalLines) * 100 : 0,
      // From ProductionEntry records
      totalQty: totalFinishingQty,
      entriesCount: totalFinishingEntries,
      qtyPercent: totalQuantity > 0 ? (totalFinishingQty / totalQuantity) * 100 : 0,
    },
  };
}

function LocalOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Initialize filters from URL params to preserve filter state when navigating back
  const [filters, setFilters] = useState<OrdersFilterParams>(() => {
    const urlSearch = searchParams.get('search');
    const urlStatus = searchParams.get('status');
    const urlDateFrom = searchParams.get('order_date_from');
    const urlDateTo = searchParams.get('order_date_to');
    return {
      search: urlSearch || undefined,
      status: urlStatus || undefined,
      orderDateFrom: urlDateFrom || undefined,
      orderDateTo: urlDateTo || undefined,
    };
  });
  const [sortByEtd, setSortByEtd] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Memoize the filter change handler to prevent unnecessary re-renders
  // and ensure stable reference for OrderFilters component
  const handleFiltersChange = useCallback((newFilters: OrdersFilterParams) => {
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
  }, []);

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

  const handleExportTnA = async () => {
    try {
      setExporting(true);

      // Use the filters state to ensure export matches displayed orders
      const queryParams: Record<string, string> = {
        order_type: 'local', // Export local orders only
      };
      if (filters.search) queryParams.search = filters.search;
      if (filters.status) queryParams.status = filters.status;
      if (filters.orderDateFrom) queryParams.order_date_from = filters.orderDateFrom;
      if (filters.orderDateTo) queryParams.order_date_to = filters.orderDateTo;

      const response = await api.get('/orders/export-tna', {
        params: queryParams,
        responseType: 'blob',
      });

      const disposition =
        response.headers['content-disposition'] || response.headers['Content-Disposition'];
      let filename = 'TnA_Export.xlsx';

      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      downloadBlob(response.data, filename);
    } catch (error: any) {
      console.error('Failed to export TnA:', error);
      const message = error.response?.data?.message || 'Failed to export TnA';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
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
            <p className="text-gray-500 mt-2">Manage local orders with detailed stage tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportTnA}
              disabled={exporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export TnA'}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Local Order
            </Button>
          </div>
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
              {productionMetrics.knitting.entriesCount > 0 && (
                <div className="pt-2 border-t mt-2 space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-blue-600 font-medium">Recorded: {productionMetrics.knitting.totalQty.toLocaleString()}</span>
                    <span className="text-blue-600">{productionMetrics.knitting.qtyPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={productionMetrics.knitting.qtyPercent} className="h-1.5" indicatorClassName="bg-blue-500" />
                </div>
              )}
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
              {productionMetrics.dyeing.entriesCount > 0 && (
                <div className="pt-2 border-t mt-2 space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-purple-600 font-medium">Recorded: {productionMetrics.dyeing.totalQty.toLocaleString()}</span>
                    <span className="text-purple-600">{productionMetrics.dyeing.qtyPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={productionMetrics.dyeing.qtyPercent} className="h-1.5" indicatorClassName="bg-purple-500" />
                </div>
              )}
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
              {productionMetrics.finishing.entriesCount > 0 && (
                <div className="pt-2 border-t mt-2 space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-green-600 font-medium">Recorded: {productionMetrics.finishing.totalQty.toLocaleString()}</span>
                    <span className="text-green-600">{productionMetrics.finishing.qtyPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={productionMetrics.finishing.qtyPercent} className="h-1.5" indicatorClassName="bg-green-500" />
                </div>
              )}
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
                      <th className="pb-3 font-medium">PI Sent</th>
                      <th className="pb-3 font-medium">LC Issue</th>
                      <th className="pb-3 font-medium">Merchandiser</th>
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
                              {order.piSentDate ? (
                                <span className="text-violet-600 font-medium">{formatDate(order.piSentDate)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4">
                              {order.lcIssueDate ? (
                                <span className="text-emerald-600 font-medium">{formatDate(order.lcIssueDate)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4">
                              {order.merchandiserName ? (
                                <span className="text-gray-700">{order.merchandiserName}</span>
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
                              <td colSpan={14} className="p-0">
                                <div className="bg-gradient-to-b from-slate-50 to-white border-t border-b border-slate-200">
                                  <div>
                                    {/* Scroll hint */}
                                    <div className="text-[10px] text-slate-400 px-3 py-1 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                      <span>Line Items ({lines.length}) • Scroll horizontally to view all columns →</span>
                                    </div>
                                    <table className="w-full text-xs min-w-[2100px]">
                                      <thead>
                                        <tr className="text-slate-600 bg-slate-100/50">
                                          <th className="py-2 px-3 text-left font-semibold min-w-[180px] sticky left-0 bg-slate-100/95 z-10">Style / Color / CAD</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[90px]">Qty</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[90px]">Delivered</th>
                                          {/* Production Entry Progress Columns */}
                                          <th className="py-2 px-3 text-left font-semibold min-w-[100px] bg-blue-50">
                                            <div className="flex items-center gap-1">
                                              <Scissors className="h-3 w-3 text-blue-500" />
                                              <span>Knitting</span>
                                            </div>
                                          </th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[100px] bg-purple-50">
                                            <div className="flex items-center gap-1">
                                              <Droplets className="h-3 w-3 text-purple-500" />
                                              <span>Dyeing</span>
                                            </div>
                                          </th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[100px] bg-green-50">
                                            <div className="flex items-center gap-1">
                                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                                              <span>Finishing</span>
                                            </div>
                                          </th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[100px]">Mill Price</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[100px]">Stage</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px]">ETD</th>
                                          {/* PI and LC columns */}
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-violet-50">PI Sent</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-emerald-50">LC Issue</th>
                                          {/* Production Dates */}
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-amber-50">Yarn</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-sky-50">Knit Date</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-indigo-50">Dye Date</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-orange-50">Cut</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-teal-50">Sew</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[85px] bg-lime-50">Ex-Fact</th>
                                          <th className="py-2 px-3 text-left font-semibold min-w-[200px]">Approval Stages</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {lines.map((line) => {
                                          const lineStage = deriveLineProductionStage(line);
                                          const delivered = line.deliveredQty || 0;
                                          const total = line.quantity || 0;
                                          const deliveryPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
                                          const isComplete = deliveryPct >= 100;
                                          
                                          // Calculate proportional production values from order-level data
                                          // if line-specific data isn't available
                                          const orderQty = order.quantity || 0;
                                          const lineQty = line.quantity || 0;
                                          const lineRatio = orderQty > 0 ? lineQty / orderQty : 0;
                                          const ps = order.productionSummary;
                                          
                                          // Use line-specific data if available, otherwise calculate proportional from order
                                          const knitting = line.productionKnitting || (ps && lineRatio > 0 ? Math.round(ps.totalKnitting * lineRatio) : 0);
                                          const knittingPct = line.productionKnittingPercent || (ps?.knittingPercent || 0);
                                          const dyeing = line.productionDyeing || (ps && lineRatio > 0 ? Math.round(ps.totalDyeing * lineRatio) : 0);
                                          const dyeingPct = line.productionDyeingPercent || (ps?.dyeingPercent || 0);
                                          const finishing = line.productionFinishing || (ps && lineRatio > 0 ? Math.round(ps.totalFinishing * lineRatio) : 0);
                                          const finishingPct = line.productionFinishingPercent || (ps?.finishingPercent || 0);
                                          
                                          // Track if using proportional data (for visual indicator)
                                          const isProportionalKnitting = !line.productionKnitting && knitting > 0;
                                          const isProportionalDyeing = !line.productionDyeing && dyeing > 0;
                                          const isProportionalFinishing = !line.productionFinishing && finishing > 0;
                                          
                                          return (
                                            <tr 
                                              key={line.id} 
                                              className="border-t border-slate-200 hover:bg-slate-50/80 cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/orders/${order.id}`);
                                              }}
                                            >
                                              {/* Style / Color / CAD */}
                                              <td className="py-2 px-3 min-w-[180px] sticky left-0 bg-white z-10">
                                                <div className="flex flex-wrap items-center gap-1">
                                                  <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                                                    {line.styleNumber || '-'}
                                                  </Badge>
                                                  {line.colorCode && (
                                                    <Badge className="bg-sky-100 text-sky-700 text-xs font-mono">
                                                      {line.colorCode}
                                                    </Badge>
                                                  )}
                                                  {line.cadCode && (
                                                    <Badge className="bg-amber-100 text-amber-700 text-xs font-mono">
                                                      {line.cadCode}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </td>
                                              {/* Quantity */}
                                              <td className="py-2 px-3 min-w-[90px]">
                                                <span className="font-semibold">{line.quantity?.toLocaleString() || '-'}</span>
                                                <span className="text-slate-400 ml-1 text-[10px]">{line.unit}</span>
                                              </td>
                                              {/* Delivered with progress */}
                                              <td className="py-2 px-3 min-w-[90px]">
                                                {delivered > 0 ? (
                                                  <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-baseline gap-1">
                                                      <span className={`font-semibold text-xs ${isComplete ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                        {delivered.toLocaleString()}
                                                      </span>
                                                      <span className="text-slate-400 text-[10px]">/ {total.toLocaleString()}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1">
                                                      <div 
                                                        className={`h-1 rounded-full ${isComplete ? 'bg-emerald-500' : deliveryPct > 50 ? 'bg-sky-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(deliveryPct, 100)}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-400">-</span>
                                                )}
                                              </td>
                                              {/* Knitting Production Entry Progress */}
                                              <td className="py-2 px-3 min-w-[100px] bg-blue-50/30">
                                                {(() => {
                                                  const isKnitComplete = knittingPct >= 100;
                                                  if (knitting > 0) {
                                                    return (
                                                      <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-baseline gap-1">
                                                          <span className={`font-semibold text-xs ${isKnitComplete ? 'text-blue-600' : 'text-slate-700'}`}>
                                                            {isProportionalKnitting ? '~' : ''}{knitting.toLocaleString()}
                                                          </span>
                                                          <span className="text-slate-400 text-[10px]">({knittingPct}%)</span>
                                                        </div>
                                                        <div className="w-full bg-blue-100 rounded-full h-1">
                                                          <div 
                                                            className={`h-1 rounded-full ${isKnitComplete ? 'bg-blue-600' : 'bg-blue-400'} ${isProportionalKnitting ? 'opacity-60' : ''}`}
                                                            style={{ width: `${Math.min(knittingPct, 100)}%` }}
                                                          />
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                  return <span className="text-blue-200">-</span>;
                                                })()}
                                              </td>
                                              {/* Dyeing Production Entry Progress */}
                                              <td className="py-2 px-3 min-w-[100px] bg-purple-50/30">
                                                {(() => {
                                                  const isDyeComplete = dyeingPct >= 100;
                                                  if (dyeing > 0) {
                                                    return (
                                                      <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-baseline gap-1">
                                                          <span className={`font-semibold text-xs ${isDyeComplete ? 'text-purple-600' : 'text-slate-700'}`}>
                                                            {isProportionalDyeing ? '~' : ''}{dyeing.toLocaleString()}
                                                          </span>
                                                          <span className="text-slate-400 text-[10px]">({dyeingPct}%)</span>
                                                        </div>
                                                        <div className="w-full bg-purple-100 rounded-full h-1">
                                                          <div 
                                                            className={`h-1 rounded-full ${isDyeComplete ? 'bg-purple-600' : 'bg-purple-400'} ${isProportionalDyeing ? 'opacity-60' : ''}`}
                                                            style={{ width: `${Math.min(dyeingPct, 100)}%` }}
                                                          />
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                  return <span className="text-purple-200">-</span>;
                                                })()}
                                              </td>
                                              {/* Finishing Production Entry Progress */}
                                              <td className="py-2 px-3 min-w-[100px] bg-green-50/30">
                                                {(() => {
                                                  const isFinishComplete = finishingPct >= 100;
                                                  if (finishing > 0) {
                                                    return (
                                                      <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-baseline gap-1">
                                                          <span className={`font-semibold text-xs ${isFinishComplete ? 'text-green-600' : 'text-slate-700'}`}>
                                                            {isProportionalFinishing ? '~' : ''}{finishing.toLocaleString()}
                                                          </span>
                                                          <span className="text-slate-400 text-[10px]">({finishingPct}%)</span>
                                                        </div>
                                                        <div className="w-full bg-green-100 rounded-full h-1">
                                                          <div 
                                                            className={`h-1 rounded-full ${isFinishComplete ? 'bg-green-600' : 'bg-green-400'} ${isProportionalFinishing ? 'opacity-60' : ''}`}
                                                            style={{ width: `${Math.min(finishingPct, 100)}%` }}
                                                          />
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                  return <span className="text-green-200">-</span>;
                                                })()}
                                              </td>
                                              {/* Mill Price */}
                                              <td className="py-2 px-3 min-w-[100px]">
                                                {line.millPrice ? (
                                                  <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">${line.millPrice.toFixed(2)}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                      Total: ${((line.millPrice || 0) * (line.quantity || 0)).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-400">-</span>
                                                )}
                                              </td>
                                              {/* Stage */}
                                              <td className="py-2 px-3 min-w-[100px]">
                                                <Badge className={`${getStageBadgeClass(lineStage)} border text-xs whitespace-nowrap`}>
                                                  {lineStage}
                                                </Badge>
                                              </td>
                                              {/* ETD */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap">
                                                {line.etd ? (
                                                  <span className="font-medium text-slate-700">{formatDate(line.etd)}</span>
                                                ) : (
                                                  <span className="text-slate-400">-</span>
                                                )}
                                              </td>
                                              {/* PI Sent - Order level */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-violet-50/30">
                                                {order.piSentDate ? (
                                                  <span className="text-violet-600 font-medium text-[11px]">{formatDate(order.piSentDate)}</span>
                                                ) : (
                                                  <span className="text-violet-200">-</span>
                                                )}
                                              </td>
                                              {/* LC Issue - Order level */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-emerald-50/30">
                                                {order.lcIssueDate ? (
                                                  <span className="text-emerald-600 font-medium text-[11px]">{formatDate(order.lcIssueDate)}</span>
                                                ) : (
                                                  <span className="text-emerald-200">-</span>
                                                )}
                                              </td>
                                              {/* Yarn - amber bg */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-amber-50/50">
                                                {line.yarnReceivedDate ? (
                                                  <span className="text-amber-700 font-medium text-[11px]">{formatDate(line.yarnReceivedDate)}</span>
                                                ) : (
                                                  <span className="text-amber-300">-</span>
                                                )}
                                              </td>
                                              {/* Knitting - blue bg */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-blue-50/50">
                                                {line.knittingCompleteDate ? (
                                                  <span className="text-blue-700 font-medium text-[11px]">{formatDate(line.knittingCompleteDate)}</span>
                                                ) : line.knittingStartDate ? (
                                                  <span className="text-blue-400 text-[11px]">{formatDate(line.knittingStartDate)}</span>
                                                ) : (
                                                  <span className="text-blue-200">-</span>
                                                )}
                                              </td>
                                              {/* Dyeing - purple bg */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-purple-50/50">
                                                {line.dyeingCompleteDate ? (
                                                  <span className="text-purple-700 font-medium text-[11px]">{formatDate(line.dyeingCompleteDate)}</span>
                                                ) : line.dyeingStartDate ? (
                                                  <span className="text-purple-400 text-[11px]">{formatDate(line.dyeingStartDate)}</span>
                                                ) : (
                                                  <span className="text-purple-200">-</span>
                                                )}
                                              </td>
                                              {/* Cutting - orange bg */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-orange-50/50">
                                                {line.cuttingCompleteDate ? (
                                                  <span className="text-orange-700 font-medium text-[11px]">{formatDate(line.cuttingCompleteDate)}</span>
                                                ) : line.cuttingStartDate ? (
                                                  <span className="text-orange-400 text-[11px]">{formatDate(line.cuttingStartDate)}</span>
                                                ) : (
                                                  <span className="text-orange-200">-</span>
                                                )}
                                              </td>
                                              {/* Sewing - teal bg */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-teal-50/50">
                                                {line.sewingFinishDate ? (
                                                  <span className="text-teal-700 font-medium text-[11px]">{formatDate(line.sewingFinishDate)}</span>
                                                ) : line.sewingInputDate ? (
                                                  <span className="text-teal-400 text-[11px]">{formatDate(line.sewingInputDate)}</span>
                                                ) : (
                                                  <span className="text-teal-200">-</span>
                                                )}
                                              </td>
                                              {/* Ex-Factory - green bg */}
                                              <td className="py-2 px-3 min-w-[85px] whitespace-nowrap bg-green-50/50">
                                                {line.exFactoryDate ? (
                                                  <span className="text-green-700 font-bold text-[11px]">{formatDate(line.exFactoryDate)}</span>
                                                ) : (
                                                  <span className="text-green-200">-</span>
                                                )}
                                              </td>
                                              {/* Approval Stages */}
                                              <td className="py-2 px-3 min-w-[200px]">
                                                <div className="flex flex-wrap gap-1">
                                                  {(() => {
                                                    // Combine approval types from BOTH approvalStatus AND approvalDates
                                                    const allTypes = new Set<string>();
                                                    
                                                    Object.entries(line.approvalStatus || {}).forEach(([key, value]) => {
                                                      if (value && value !== 'default') {
                                                        allTypes.add(key);
                                                      }
                                                    });
                                                    
                                                    Object.keys(line.approvalDates || {}).forEach(key => {
                                                      allTypes.add(key);
                                                    });
                                                    
                                                    if (allTypes.size === 0) {
                                                      return <span className="text-slate-400 text-[10px] italic">No approvals</span>;
                                                    }
                                                    
                                                    const priorityOrder: Record<string, number> = {
                                                      price: 1, labDip: 2, lab_dip: 2,
                                                      strikeOff: 3, strike_off: 3,
                                                      handloom: 4, quality: 5,
                                                      ppSample: 6, pp_sample: 6,
                                                      aop: 7, qualityTest: 8, quality_test: 8,
                                                      bulkSwatch: 9, bulk_swatch: 9
                                                    };
                                                    
                                                    const sortedTypes = Array.from(allTypes).sort((a, b) => {
                                                      return (priorityOrder[a] || 99) - (priorityOrder[b] || 99);
                                                    });
                                                    
                                                    return sortedTypes.map(type => {
                                                      const status = line.approvalStatus?.[type] || 'pending';
                                                      const approvalDate = line.approvalDates?.[type];
                                                      const badge = getApprovalBadge(status);
                                                      
                                                      return (
                                                        <div 
                                                          key={type} 
                                                          className="flex items-center gap-0.5 bg-slate-50 rounded px-1 py-0.5 border border-slate-200 whitespace-nowrap"
                                                          title={`${formatApprovalName(type)}: ${badge.label}${approvalDate ? ` on ${formatDate(approvalDate)}` : ''}`}
                                                        >
                                                          <span className="text-[9px] font-semibold text-slate-600">{getApprovalAbbrev(type)}</span>
                                                          <Badge className={`${badge.bg} ${badge.text} text-[9px] px-1 py-0 font-medium`}>
                                                            {badge.label.substring(0, 3)}
                                                          </Badge>
                                                        </div>
                                                      );
                                                    });
                                                  })()}
                                                </div>
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

export default function LocalOrdersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading local orders...</span>
          </div>
        </div>
      </DashboardLayout>
    }>
      <LocalOrdersPageContent />
    </Suspense>
  );
}
