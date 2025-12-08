'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Plus, Eye, Trash2, Download, Edit, ArrowUpDown, ChevronRight, ChevronDown, ChevronsUpDown, Image as ImageIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDate, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { OrderFilters } from '@/components/orders/order-filters';
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';

interface MillOffer {
  id: string;
  millName: string;
  price: number;
  currency?: string;
}

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
  provaPrice?: number;
  currency?: string;
  etd?: string;
  status?: string;
  approvalStatus?: Record<string, string>;
  approvalDates?: Record<string, string>;
  deliveredQty?: number;
  millOffers?: MillOffer[];
  swatchReceivedDate?: string;
  swatchSentDate?: string;
  samplePhoto?: {
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
  } | null;
}

interface Order {
  id: string;
  poNumber: string;
  customerName: string;
  buyerName?: string;
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
  lcIssueDate?: string;
  piSentDate?: string;
  orderType?: 'local' | 'foreign';
  notes?: string;
  createdById?: string;
  createdByDetails?: {
    id: string;
    fullName: string;
  };
  // Local order specific fields
  productionSummary?: {
    totalKnitting: number;
    totalDyeing: number;
    totalFinishing: number;
    knittingPercent: number;
    dyeingPercent: number;
    finishingPercent: number;
  };
}

interface OrdersFilterParams {
  search?: string | null;
  status?: string | null;
  orderDateFrom?: string | null;
  orderDateTo?: string | null;
  orderType?: string | null; // 'foreign', 'local', or 'all'
}

// Cache keys for sessionStorage
const ORDERS_CACHE_KEY = 'orders_cache';
const ORDERS_SCROLL_KEY = 'orders_scroll_position';
const ORDERS_EXPANDED_KEY = 'orders_expanded';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface OrdersCache {
  data: Order[];
  filterKey: string;
  timestamp: number;
}

type ApiError = {
  response?: { data?: { message?: string } };
  message?: string;
};

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as ApiError;
    if (typeof maybeError.response?.data?.message === 'string') {
      return maybeError.response.data.message;
    }
    if (typeof maybeError.message === 'string') {
      return maybeError.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return defaultMessage;
};

// Generate a cache key from filters
function getFilterKey(filters: OrdersFilterParams): string {
  return JSON.stringify({
    search: filters.search || '',
    status: filters.status || '',
    orderDateFrom: filters.orderDateFrom || '',
    orderDateTo: filters.orderDateTo || '',
    orderType: filters.orderType || 'foreign',
  });
}

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestApprovalDialogOpen, setRequestApprovalDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderCreatorInfo, setOrderCreatorInfo] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [samplePhotoViewer, setSamplePhotoViewer] = useState<{ fileName: string; fileUrl: string } | null>(null);
  // State for search highlighting - tracks which lines match the current search
  const [highlightedLines, setHighlightedLines] = useState<Set<string>>(new Set());
  // Initialize filters from URL params to preserve filter state when navigating back
  const [filters, setFilters] = useState<OrdersFilterParams>(() => {
    const urlSearch = searchParams.get('search');
    const urlStatus = searchParams.get('status');
    const urlDateFrom = searchParams.get('order_date_from');
    const urlDateTo = searchParams.get('order_date_to');
    const urlOrderType = searchParams.get('order_type'); // 'all' to show both local and foreign
    return {
      search: urlSearch || undefined,
      status: urlStatus || undefined,
      orderDateFrom: urlDateFrom || undefined,
      orderDateTo: urlDateTo || undefined,
      orderType: urlOrderType || undefined,
    };
  });
  const [sortByEtd, setSortByEtd] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(() => {
    // Restore expanded orders from sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(ORDERS_EXPANDED_KEY);
        if (saved) return new Set(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    return new Set();
  });
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);
  const isInitialMount = useRef(true);
  // formData, users, taskAssignment removed - now handled by CreateOrderDialog component

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
      // Preserve orderType from URL when updating other filters
      return { ...newFilters, orderType: prev.orderType };
    });
  }, []);

  // Save scroll position before unload or navigation
  useEffect(() => {
    const saveScrollPosition = () => {
      if (mainScrollRef.current) {
        sessionStorage.setItem(ORDERS_SCROLL_KEY, String(mainScrollRef.current.scrollTop));
      }
    };

    // Save on beforeunload
    window.addEventListener('beforeunload', saveScrollPosition);

    // Save expanded orders state
    sessionStorage.setItem(ORDERS_EXPANDED_KEY, JSON.stringify(Array.from(expandedOrders)));

    return () => {
      window.removeEventListener('beforeunload', saveScrollPosition);
      // Save on component unmount (navigation)
      saveScrollPosition();
    };
  }, [expandedOrders]);

  // Restore scroll position after orders load
  useLayoutEffect(() => {
    if (!loading && orders.length > 0 && !hasRestoredScroll.current && mainScrollRef.current) {
      const savedScroll = sessionStorage.getItem(ORDERS_SCROLL_KEY);
      if (savedScroll) {
        const scrollPos = parseInt(savedScroll, 10);
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTop = scrollPos;
          }
        });
      }
      hasRestoredScroll.current = true;
    }
  }, [loading, orders]);

  // Sync filters with URL params when they change (e.g., from dashboard chart click)
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const urlStatus = searchParams.get('status');
    const urlDateFrom = searchParams.get('order_date_from');
    const urlDateTo = searchParams.get('order_date_to');
    const urlOrderType = searchParams.get('order_type');
    
    setFilters({
      search: urlSearch || undefined,
      status: urlStatus || undefined,
      orderDateFrom: urlDateFrom || undefined,
      orderDateTo: urlDateTo || undefined,
      orderType: urlOrderType || undefined,
    });
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Try to load from cache first for instant display
    const filterKey = getFilterKey(filters);
    try {
      const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);
      if (cached) {
        const cacheData: OrdersCache = JSON.parse(cached);
        const isValid = Date.now() - cacheData.timestamp < CACHE_TTL;
        const isSameFilter = cacheData.filterKey === filterKey;
        
        if (isValid && isSameFilter && cacheData.data.length > 0) {
          // Use cached data immediately
          setOrders(cacheData.data);
          setLoading(false);
          
          // Only refresh in background if it's been more than 30 seconds
          if (Date.now() - cacheData.timestamp > 30000) {
            fetchOrders(filters, true); // silent refresh
          }
          return;
        }
      }
    } catch { /* ignore cache errors */ }

    // No valid cache, fetch fresh
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    fetchOrders(filters);
  }, [isAuthenticated, router, filters]);

  const fetchOrders = async (filtersToUse?: OrdersFilterParams, silent = false) => {
    try {
      if (!silent) {
        // Only show loading if not a silent refresh and we have no data
        if (orders.length === 0) {
          setLoading(true);
        }
      }

      const params: Record<string, string> = { 
        _t: String(Date.now()),
      };
      // Support 'all' to show both local and foreign orders (for merchandiser workload view)
      // Default to 'foreign' if not specified
      const orderType = filtersToUse?.orderType;
      if (orderType && orderType !== 'all') {
        params.order_type = orderType;
      } else if (!orderType) {
        params.order_type = 'foreign'; // Default for this page
      }
      // Note: if orderType === 'all', we don't set order_type param, showing all orders
      
      if (filtersToUse?.search) params.search = filtersToUse.search;
      if (filtersToUse?.status) params.status = filtersToUse.status;
      if (filtersToUse?.orderDateFrom) params.order_date_from = filtersToUse.orderDateFrom;
      if (filtersToUse?.orderDateTo) params.order_date_to = filtersToUse.orderDateTo;

      const response = await api.get('/orders', { params });
      setOrders(response.data);

      // Save to cache
      const filterKey = getFilterKey(filtersToUse || {});
      const cacheData: OrdersCache = {
        data: response.data,
        filterKey,
        timestamp: Date.now(),
      };
      try {
        sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(cacheData));
      } catch { /* ignore storage errors */ }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to auto-expand orders and highlight lines when searching by style
  useEffect(() => {
    if (!filters.search || orders.length === 0) {
      setHighlightedLines(new Set());
      return;
    }

    const searchTerm = filters.search.toLowerCase();
    const newHighlighted = new Set<string>();
    const ordersToExpand = new Set<string>();

    // Find matching lines and their orders
    orders.forEach((order) => {
      const lines = order.lines || [];
      lines.forEach((line) => {
        const styleMatch = line.styleNumber?.toLowerCase().includes(searchTerm);
        const colorMatch = line.colorCode?.toLowerCase().includes(searchTerm);
        const cadMatch = line.cadCode?.toLowerCase().includes(searchTerm);
        
        if (styleMatch || colorMatch || cadMatch) {
          newHighlighted.add(line.id);
          ordersToExpand.add(order.id);
        }
      });
    });

    // Update highlighted lines
    setHighlightedLines(newHighlighted);

    // Auto-expand orders with matching lines
    if (ordersToExpand.size > 0) {
      setExpandedOrders((prev) => {
        const newExpanded = new Set(prev);
        ordersToExpand.forEach((id) => newExpanded.add(id));
        return newExpanded;
      });

      // Scroll to first highlighted line after a short delay
      setTimeout(() => {
        const firstHighlighted = document.querySelector('[data-highlighted="true"]');
        if (firstHighlighted) {
          firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [filters.search, orders]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // Use the filters state (same source as fetchOrders) to ensure export matches displayed orders
      const queryParams: Record<string, string> = {
        order_type: 'foreign', // Export foreign orders only
      };
      if (filters.search) queryParams.search = filters.search;
      if (filters.status) queryParams.status = filters.status;
      if (filters.orderDateFrom) queryParams.order_date_from = filters.orderDateFrom;
      if (filters.orderDateTo) queryParams.order_date_to = filters.orderDateTo;

      const response = await api.get('/orders/export-excel', {
        params: queryParams,
        responseType: 'blob',
      });

      const disposition =
        response.headers['content-disposition'] || response.headers['Content-Disposition'];
      let filename = 'orders.xlsx';

      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      downloadBlob(response.data, filename);
    } catch (error: unknown) {
      console.error('Failed to export orders:', error);
      const message = getErrorMessage(error, 'Failed to export orders');
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // handleCreateOrder removed - now handled by CreateOrderDialog component

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'secondary',
      running: 'success',
      completed: 'default',
      archived: 'secondary',
    };
    return colors[status] || 'default';
  };

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

  // Render aggregated status badges based on line status counts
  const renderAggregatedStatus = (order: Order) => {
    const statusCounts = order.lineStatusCounts || {};
    const statuses = Object.keys(statusCounts);

    // If no line statuses, fall back to parent order status
    if (statuses.length === 0) {
      return (
        <Badge className={getStatusBadgeClass(order.status)}>
          {getStatusDisplayName(order.status)}
        </Badge>
      );
    }

    // If all lines have same status, show single badge
    if (statuses.length === 1) {
      return (
        <Badge className={getStatusBadgeClass(statuses[0])}>
          {getStatusDisplayName(statuses[0])}
        </Badge>
      );
    }

    // Mixed statuses - show stacked badges with counts
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

  const getEtdRowClass = (etd?: string): string => {
    if (!etd) return '';
    
    const etdDate = new Date(etd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    etdDate.setHours(0, 0, 0, 0);
    
    const diffTime = etdDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Past due - red
      return 'bg-red-50 hover:bg-red-100';
    } else if (diffDays <= 5) {
      // Within 5 days - red
      return 'bg-red-50 hover:bg-red-100';
    } else if (diffDays <= 10) {
      // Within 10 days - yellow
      return 'bg-yellow-50 hover:bg-yellow-100';
    }
    return '';
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

  const formatApprovalName = (key: string): string => {
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
  };

  // Short abbreviations for compact display
  const getApprovalAbbrev = (key: string): string => {
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
  };

  const getApprovalBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      submission: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submission' },
      resubmission: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Resubmission' },
      default: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Pending' },
    };
    return statusConfig[status] || statusConfig.default;
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    
    // Check if current user is the creator - if not, go directly to request approval
    const isCreator = !order.createdById || currentUser?.id === order.createdById;
    const isAdmin = currentUser?.role === 'admin';
    
    if (isCreator || isAdmin) {
      // User is creator or admin - show normal delete dialog
      setDeleteDialogOpen(true);
    } else {
      // User is not the creator - show request approval dialog directly
      setOrderCreatorInfo({
        id: order.createdById!,
        name: order.createdByDetails?.fullName || 'the creator',
      });
      setRequestApprovalDialogOpen(true);
    }
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
      
      // Refresh orders list with current filters
      await fetchOrders(filters);
    } catch (error: any) {
      console.error('Error deleting order:', error);
      
      // Check if this is an ownership issue (403 with requiresApproval)
      if (error.response?.status === 403 && error.response?.data?.requiresApproval) {
        setOrderCreatorInfo({
          id: error.response.data.creatorId,
          name: error.response.data.creatorName,
        });
        setDeleteDialogOpen(false);
        setRequestApprovalDialogOpen(true);
      } else {
        const errorMessage = getErrorMessage(error, 'Failed to delete order');
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!orderToDelete) return;

    setRequestingApproval(true);
    try {
      await api.post(`/orders/${orderToDelete.id}/request-deletion/`);

      toast({
        title: 'Request Sent',
        description: `Deletion request sent to ${orderCreatorInfo?.name}. They will be notified.`,
      });

      setRequestApprovalDialogOpen(false);
      setOrderToDelete(null);
      setOrderCreatorInfo(null);
    } catch (error: any) {
      console.error('Error requesting deletion approval:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send deletion request';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setRequestingApproval(false);
    }
  };

  // Color row management functions removed - now handled by CreateOrderDialog component

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading orders...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-gray-500 mt-2">Manage textile fabric orders</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Create Order Dialog - Foreign orders only on this page */}
        <CreateOrderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => fetchOrders(filters)}
          defaultOrderType="foreign"
        />

        <Suspense fallback={null}>
          <OrderFilters onFilterChange={handleFiltersChange} />
        </Suspense>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>
                {filters.orderType === 'all' ? 'All Orders' : 'Foreign Orders'}
              </CardTitle>
              {filters.orderType === 'all' && (
                <Badge variant="secondary" className="text-xs">Local + Foreign</Badge>
              )}
              {filters.search && (
                <Badge variant="outline" className="text-xs">
                  Filtered: {filters.search}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (expandedOrders.size === orders.length) {
                    // All expanded, collapse all
                    setExpandedOrders(new Set());
                  } else {
                    // Expand all
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
            className="max-h-[calc(100vh-320px)] overflow-y-auto"
          >
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No orders found</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b sticky top-0 z-20 bg-white">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium w-12">S/N</th>
                      <th className="pb-3 font-medium w-8"></th>
                      {filters.orderType === 'all' && <th className="pb-3 font-medium">Type</th>}
                      <th className="pb-3 font-medium">Merchandiser</th>
                      <th className="pb-3 font-medium">Vendor</th>
                      <th className="pb-3 font-medium">Buyer</th>
                      <th className="pb-3 font-medium">PO #</th>
                      <th className="pb-3 font-medium">Fabric Type</th>
                      <th className="pb-3 font-medium">Quantity</th>
                      <th className="pb-3 font-medium">ETD</th>
                      <th className="pb-3 font-medium">PI Sent</th>
                      <th className="pb-3 font-medium">LC Issue</th>
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
                      
                      return (
                        <React.Fragment key={order.id}>
                          {/* Main order row */}
                          <tr
                            className={`text-sm cursor-pointer ${getEtdRowClass(order.earliestEtd) || 'hover:bg-gray-50'}`}
                            onClick={() => {
                              router.push(`/orders/${order.id}`);
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
                            {filters.orderType === 'all' && (
                              <td className="py-4">
                                <Badge 
                                  variant={order.orderType === 'local' ? 'secondary' : 'outline'}
                                  className={order.orderType === 'local' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}
                                >
                                  {order.orderType === 'local' ? 'Local' : 'Foreign'}
                                </Badge>
                              </td>
                            )}
                            <td className="py-4">
                              {order.merchandiserName ? (
                                <span className="text-gray-700">{order.merchandiserName}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4">{order.customerName}</td>
                            <td className="py-4">
                              {order.buyerName ? (
                                <span className="text-gray-700">{order.buyerName}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 font-medium">{order.poNumber}</td>
                            <td className="py-4">{order.fabricType}</td>
                            <td className="py-4">{order.quantity.toLocaleString()} {order.unit}</td>
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
                          
                          {/* Expanded line items */}
                          {isExpanded && lines.length > 0 && (
                            <tr>
                              <td colSpan={filters.orderType === 'all' ? 16 : 15} className="p-0">
                                <div className="bg-gradient-to-b from-slate-50 to-white border-t border-b border-slate-200">
                                  {/* Order Notes - Mobile */}
                                  {order.notes && (
                                    <div className="md:hidden px-3 py-2 bg-amber-50 border-b border-amber-200">
                                      <div className="flex items-start gap-2">
                                        <span className="text-xs font-semibold text-amber-700">📝 Notes:</span>
                                        <p className="text-sm text-amber-900">{order.notes}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Mobile Card View */}
                                  <div className="md:hidden p-3 space-y-3">
                                    {lines.map((line) => {
                                      const isHighlighted = highlightedLines.has(line.id);
                                      return (
                                      <div 
                                        key={line.id}
                                        data-highlighted={isHighlighted}
                                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                                          isHighlighted 
                                            ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-400 animate-[pulse_1s_ease-in-out_2]' 
                                            : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/orders/${order.id}`);
                                        }}
                                      >
                                        {/* Header with badges and status */}
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">{line.styleNumber || '-'}</Badge>
                                          {line.colorCode && <Badge className="bg-sky-100 text-sky-700 text-xs">{line.colorCode}</Badge>}
                                          {line.cadCode && <Badge className="bg-amber-100 text-amber-700 text-xs">CAD: {line.cadCode}</Badge>}
                                          {/* Line Status Badge */}
                                          {line.status && (
                                            <Badge className={`text-[10px] ${
                                              line.status === 'running' ? 'bg-green-100 text-green-700' :
                                              line.status === 'in_development' ? 'bg-blue-100 text-blue-700' :
                                              line.status === 'upcoming' ? 'bg-amber-100 text-amber-700' :
                                              line.status === 'bulk' ? 'bg-purple-100 text-purple-700' :
                                              line.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>
                                              {line.status === 'running' ? 'Running' :
                                               line.status === 'in_development' ? 'In Dev' :
                                               line.status === 'upcoming' ? 'Upcoming' :
                                               line.status === 'bulk' ? 'Bulk' :
                                               line.status === 'completed' ? 'Done' :
                                               line.status}
                                            </Badge>
                                          )}
                                        </div>
                                        {line.samplePhoto && line.samplePhoto.fileUrl && (
                                          <div className="mt-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 px-2 text-[11px]"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const photo = line.samplePhoto;
                                                if (!photo || !photo.fileUrl) return;
                                                if (photo.fileType && !photo.fileType.startsWith('image/')) {
                                                  window.open(photo.fileUrl, '_blank');
                                                  return;
                                                }
                                                setSamplePhotoViewer({
                                                  fileName: photo.fileName,
                                                  fileUrl: photo.fileUrl,
                                                });
                                              }}
                                            >
                                              <Eye className="h-3 w-3 mr-1" />
                                              Sample Photo
                                            </Button>
                                          </div>
                                        )}
                                        {/* Description */}
                                        {line.description && (
                                          <p className="text-sm text-slate-600 mb-2">{line.description}</p>
                                        )}
                                        {/* Key details grid */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <span className="text-slate-500">Qty:</span>
                                            <span className="font-semibold ml-1">{line.quantity.toLocaleString()} {line.unit}</span>
                                          </div>
                                          {line.deliveredQty !== undefined && line.deliveredQty > 0 && (
                                            <div>
                                              <span className="text-slate-500">Delivered:</span>
                                              <span className="font-semibold ml-1 text-emerald-600">{line.deliveredQty.toLocaleString()}</span>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-slate-500">ETD:</span>
                                            <span className="font-medium ml-1">{line.etd ? formatDate(line.etd) : <span className="text-orange-600 italic">Pending</span>}</span>
                                          </div>
                                          <div>
                                            <span className="text-slate-500">PI:</span>
                                            <span className="font-medium ml-1">{order.piSentDate ? formatDate(order.piSentDate) : <span className="text-orange-600 italic">Pending</span>}</span>
                                          </div>
                                          <div>
                                            <span className="text-slate-500">LC:</span>
                                            <span className="font-medium ml-1">{order.lcIssueDate ? formatDate(order.lcIssueDate) : <span className="text-orange-600 italic">Pending</span>}</span>
                                          </div>
                                        </div>
                                        
                                        {/* Mill Price / Mill Offers */}
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span className="text-slate-500 block mb-1">Mill Price:</span>
                                              {line.millPrice ? (
                                                <span className="font-semibold text-slate-800">{line.currency || 'USD'} {line.millPrice.toFixed(2)}</span>
                                              ) : line.millOffers && line.millOffers.length > 0 ? (
                                                <div className="space-y-1">
                                                  {line.millOffers.map((offer) => (
                                                    <div key={offer.id} className="bg-slate-50 px-1.5 py-0.5 rounded">
                                                      <span className="font-semibold text-slate-700">{offer.millName}</span>
                                                      <span className="text-blue-600 font-bold ml-1">${offer.price?.toFixed(2) ?? '0.00'}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-orange-600 italic">Pending</span>
                                              )}
                                            </div>
                                            <div>
                                              <span className="text-slate-500 block mb-1">Prova Price:</span>
                                              {line.provaPrice ? (
                                                <span className="font-bold text-green-700">${line.provaPrice.toFixed(2)}</span>
                                              ) : (
                                                <span className="text-orange-600 italic">Pending</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Approval badges */}
                                        {Object.keys(line.approvalStatus || {}).filter(k => line.approvalStatus?.[k] && line.approvalStatus[k] !== 'default').length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-slate-100">
                                            <div className="flex flex-wrap gap-1">
                                              {Object.entries(line.approvalStatus || {})
                                                .filter(([, v]) => v && v !== 'default')
                                                .map(([type, status]) => {
                                                  const badge = getApprovalBadge(status);
                                                  return (
                                                    <div key={type} className="flex items-center gap-1 bg-slate-50 rounded px-1.5 py-0.5 border">
                                                      <span className="text-[10px] text-slate-600">{getApprovalAbbrev(type)}</span>
                                                      <Badge className={`${badge.bg} ${badge.text} text-[10px] px-1 py-0`}>{badge.label.substring(0, 3)}</Badge>
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      );
                                    })}
                                  </div>

                                  {/* Order Notes - shown if notes exist */}
                                  {order.notes && (
                                    <div className="hidden md:block px-4 py-2 bg-amber-50 border-b border-amber-200">
                                      <div className="flex items-start gap-2">
                                        <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">📝 Notes:</span>
                                        <p className="text-sm text-amber-900">{order.notes}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Desktop Card View - Clean organized layout */}
                                  <div className="hidden md:block p-3">
                                    <div className="space-y-2">
                                      {lines.map((line) => {
                                        const isHighlighted = highlightedLines.has(line.id);
                                        const delivered = line.deliveredQty || 0;
                                        const total = line.quantity || 0;
                                        const deliveryPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
                                        
                                        return (
                                          <div
                                            key={line.id}
                                            data-highlighted={isHighlighted}
                                            className={`rounded-lg border p-3 cursor-pointer transition-all ${
                                              isHighlighted 
                                                ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-400 animate-[pulse_1s_ease-in-out_2]' 
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/orders/${order.id}`);
                                            }}
                                          >
                                            {/* Row 1: Style info + Status + Key numbers */}
                                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                              {/* Style badges */}
                                              <div className="flex items-center gap-1.5">
                                                <Badge className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                                                  {line.styleNumber || '-'}
                                                </Badge>
                                                {line.colorCode && (
                                                  <Badge className="bg-sky-100 text-sky-700 text-xs font-mono">
                                                    {line.colorCode}
                                                  </Badge>
                                                )}
                                                {line.cadCode && (
                                                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                    CAD: {line.cadCode}
                                                  </Badge>
                                                )}
                                              </div>
                                              
                                              {/* Status badge */}
                                              {line.status && (
                                                <Badge className={`text-[10px] ${
                                                  line.status === 'running' ? 'bg-green-100 text-green-700' :
                                                  line.status === 'in_development' ? 'bg-blue-100 text-blue-700' :
                                                  line.status === 'upcoming' ? 'bg-amber-100 text-amber-700' :
                                                  line.status === 'bulk' ? 'bg-purple-100 text-purple-700' :
                                                  line.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                  'bg-gray-100 text-gray-600'
                                                }`}>
                                                  {line.status === 'running' ? 'Running' :
                                                   line.status === 'in_development' ? 'In Dev' :
                                                   line.status === 'upcoming' ? 'Upcoming' :
                                                   line.status === 'bulk' ? 'Bulk' :
                                                   line.status === 'completed' ? 'Done' :
                                                   line.status}
                                                </Badge>
                                              )}
                                              
                                              {/* Description - inline */}
                                              {line.description && (
                                                <span className="text-sm text-slate-600 flex-1 truncate max-w-xs" title={line.description}>
                                                  {line.description}
                                                </span>
                                              )}
                                              
                                              {/* Sample photo button */}
                                              {line.samplePhoto?.fileUrl && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const photo = line.samplePhoto;
                                                    if (!photo?.fileUrl) return;
                                                    if (photo.fileType && !photo.fileType.startsWith('image/')) {
                                                      window.open(photo.fileUrl, '_blank');
                                                      return;
                                                    }
                                                    setSamplePhotoViewer({ fileName: photo.fileName, fileUrl: photo.fileUrl });
                                                  }}
                                                >
                                                  <ImageIcon className="h-3 w-3 mr-1 text-indigo-600" />
                                                  Photo
                                                </Button>
                                              )}
                                            </div>
                                            
                                            {/* Row 2: Key metrics in a clean grid */}
                                            <div className="grid grid-cols-6 gap-4 text-xs">
                                              {/* Quantity & Delivery */}
                                              <div className="col-span-1">
                                                <span className="text-slate-500 block">Quantity</span>
                                                <span className="font-semibold text-slate-800">{line.quantity.toLocaleString()} {line.unit}</span>
                                                {delivered > 0 && (
                                                  <div className="mt-1">
                                                    <div className="flex items-center gap-1">
                                                      <span className={`text-[10px] ${deliveryPct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                        {delivered.toLocaleString()} delivered ({deliveryPct}%)
                                                      </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1 mt-0.5">
                                                      <div 
                                                        className={`h-1 rounded-full ${deliveryPct >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                                        style={{ width: `${Math.min(deliveryPct, 100)}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {/* Pricing */}
                                              <div className="col-span-1">
                                                <span className="text-slate-500 block">Mill Price</span>
                                                {line.millPrice ? (
                                                  <span className="font-medium text-slate-700">{line.currency || 'USD'} {line.millPrice.toFixed(2)}</span>
                                                ) : line.millOffers?.length ? (
                                                  <span className="text-blue-600 text-[10px]">{line.millOffers.length} offer(s)</span>
                                                ) : (
                                                  <span className="text-orange-500 italic">Pending</span>
                                                )}
                                              </div>
                                              
                                              <div className="col-span-1">
                                                <span className="text-slate-500 block">Prova Price</span>
                                                {line.provaPrice ? (
                                                  <span className="font-medium text-green-700">${line.provaPrice.toFixed(2)}</span>
                                                ) : (
                                                  <span className="text-orange-500 italic">Pending</span>
                                                )}
                                              </div>
                                              
                                              {/* Key Dates */}
                                              <div className="col-span-1">
                                                <span className="text-slate-500 block">ETD</span>
                                                {line.etd ? (
                                                  <span className="font-medium text-slate-700">{formatDate(line.etd)}</span>
                                                ) : (
                                                  <span className="text-orange-500 italic">Pending</span>
                                                )}
                                              </div>
                                              
                                              <div className="col-span-1">
                                                <span className="text-slate-500 block">PI / LC</span>
                                                <div className="flex gap-2">
                                                  {order.piSentDate ? (
                                                    <span className="text-violet-600 font-medium">{formatDate(order.piSentDate)}</span>
                                                  ) : (
                                                    <span className="text-orange-500 italic">PI -</span>
                                                  )}
                                                  <span className="text-slate-300">/</span>
                                                  {order.lcIssueDate ? (
                                                    <span className="text-emerald-600 font-medium">{formatDate(order.lcIssueDate)}</span>
                                                  ) : (
                                                    <span className="text-orange-500 italic">LC -</span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Swatch dates (for in_development) */}
                                              {line.status === 'in_development' && (
                                                <div className="col-span-1">
                                                  <span className="text-slate-500 block">Swatch</span>
                                                  <div className="text-[10px]">
                                                    {line.swatchReceivedDate && <span className="text-blue-600">Recv: {formatDate(line.swatchReceivedDate)}</span>}
                                                    {line.swatchSentDate && <span className="text-blue-600 ml-1">Sent: {formatDate(line.swatchSentDate)}</span>}
                                                    {!line.swatchReceivedDate && !line.swatchSentDate && <span className="text-slate-400">-</span>}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Row 3: Approval Stages - compact inline */}
                                            {(() => {
                                              const allTypes = new Set<string>();
                                              Object.entries(line.approvalStatus || {}).forEach(([key, value]) => {
                                                if (value && value !== 'default') allTypes.add(key);
                                              });
                                              Object.keys(line.approvalDates || {}).forEach(key => allTypes.add(key));
                                              
                                              if (allTypes.size === 0) return null;
                                              
                                              const priorityOrder: Record<string, number> = {
                                                price: 1, labDip: 2, lab_dip: 2, strikeOff: 3, strike_off: 3,
                                                handloom: 4, quality: 5, ppSample: 6, pp_sample: 6,
                                                aop: 7, qualityTest: 8, quality_test: 8, bulkSwatch: 9, bulk_swatch: 9
                                              };
                                              const sortedTypes = Array.from(allTypes).sort((a, b) => (priorityOrder[a] || 99) - (priorityOrder[b] || 99));
                                              
                                              return (
                                                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                                                  <span className="text-[10px] text-slate-500 mr-1">Approvals:</span>
                                                  {sortedTypes.map(type => {
                                                    const status = line.approvalStatus?.[type] || 'pending';
                                                    const badge = getApprovalBadge(status);
                                                    return (
                                                      <div 
                                                        key={type}
                                                        className="flex items-center gap-0.5 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-200"
                                                        title={formatApprovalName(type)}
                                                      >
                                                        <span className="text-[9px] font-semibold text-slate-600">{getApprovalAbbrev(type)}</span>
                                                        <Badge className={`${badge.bg} ${badge.text} text-[9px] px-1 py-0`}>
                                                          {badge.label.substring(0, 3)}
                                                        </Badge>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        );
                                      })}
                                    </div>
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

        <Dialog open={!!samplePhotoViewer} onOpenChange={(open) => { if (!open) setSamplePhotoViewer(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="truncate">
                {samplePhotoViewer?.fileName || 'Sample Photo'}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex items-center justify-center">
              {samplePhotoViewer && (
                <img
                  src={samplePhotoViewer.fileUrl}
                  alt={samplePhotoViewer.fileName}
                  className="max-h-[70vh] w-full object-contain rounded-md"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this order? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {orderToDelete && (
              <div className="py-4">
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm"><strong>PO #:</strong> {orderToDelete.poNumber}</p>
                  <p className="text-sm"><strong>Customer:</strong> {orderToDelete.customerName}</p>
                  <p className="text-sm"><strong>Fabric:</strong> {orderToDelete.fabricType}</p>
                  <p className="text-sm"><strong>Quantity:</strong> {orderToDelete.quantity} {orderToDelete.unit}</p>
                </div>
              </div>
            )}
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
                {deleting ? 'Deleting...' : 'Delete Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Approval Dialog - shown when non-creator tries to delete */}
        <Dialog open={requestApprovalDialogOpen} onOpenChange={(open) => {
          setRequestApprovalDialogOpen(open);
          if (!open) {
            setOrderToDelete(null);
            setOrderCreatorInfo(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Deletion Approval</DialogTitle>
              <DialogDescription>
                This order was created by <strong>{orderCreatorInfo?.name}</strong>. They must approve this deletion.
              </DialogDescription>
            </DialogHeader>
            {orderToDelete && (
              <div className="py-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm"><strong>PO #:</strong> {orderToDelete.poNumber}</p>
                  <p className="text-sm"><strong>Customer:</strong> {orderToDelete.customerName}</p>
                  <p className="text-sm"><strong>Fabric:</strong> {orderToDelete.fabricType}</p>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Click &quot;Request Approval&quot; to send a notification to {orderCreatorInfo?.name}. 
                  They will be able to approve or decline your request.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRequestApprovalDialogOpen(false);
                  setOrderToDelete(null);
                  setOrderCreatorInfo(null);
                }}
                disabled={requestingApproval}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestApproval}
                disabled={requestingApproval}
              >
                {requestingApproval ? 'Sending...' : 'Request Approval'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading orders...</p>
        </div>
      </DashboardLayout>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
