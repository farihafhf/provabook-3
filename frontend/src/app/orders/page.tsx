'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Plus, Eye, Trash2, Download, Edit, ArrowUpDown, ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDate, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { OrderFilters } from '@/components/orders/order-filters';
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';

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
  lcIssueDate?: string;
  piSentDate?: string;
}

interface OrdersFilterParams {
  search?: string | null;
  status?: string | null;
  orderDateFrom?: string | null;
  orderDateTo?: string | null;
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

// Generate a cache key from filters
function getFilterKey(filters: OrdersFilterParams): string {
  return JSON.stringify({
    search: filters.search || '',
    status: filters.status || '',
    orderDateFrom: filters.orderDateFrom || '',
    orderDateTo: filters.orderDateTo || '',
  });
}

function OrdersPageContent() {
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
  const [filters, setFilters] = useState<OrdersFilterParams>(() => {
    const statusParam = searchParams.get('status');
    return {
      search: searchParams.get('search') || undefined,
      status: (statusParam && statusParam !== 'all') ? statusParam : undefined,
      orderDateFrom: searchParams.get('order_date_from') || undefined,
      orderDateTo: searchParams.get('order_date_to') || undefined,
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
  const scrollContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);
  const isInitialMount = useRef(true);
  // formData, users, taskAssignment removed - now handled by CreateOrderDialog component

  // Setup wheel event listener with { passive: false } to allow preventDefault
  const setupScrollHandler = useCallback((element: HTMLDivElement | null, orderId: string) => {
    if (element) {
      scrollContainerRefs.current.set(orderId, element);
      
      const handleWheel = (e: WheelEvent) => {
        // Allow horizontal scroll with shift key OR when scrolling horizontally on touchpad
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
          element.scrollLeft += e.shiftKey ? e.deltaY : e.deltaX;
        }
      };
      
      element.addEventListener('wheel', handleWheel, { passive: false });
      
      // Store cleanup function
      (element as any)._wheelCleanup = () => {
        element.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

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
        order_type: 'foreign', // Filter for foreign orders only on this page
      };
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
    } catch (error: any) {
      console.error('Failed to export orders:', error);
      const message = error.response?.data?.message || 'Failed to export orders';
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
      
      // Refresh orders list with current filters
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
            <CardTitle>All Orders</CardTitle>
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
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium w-12">S/N</th>
                      <th className="pb-3 font-medium w-8"></th>
                      <th className="pb-3 font-medium">PO #</th>
                      <th className="pb-3 font-medium">Vendor</th>
                      <th className="pb-3 font-medium">Fabric Type</th>
                      <th className="pb-3 font-medium">Quantity</th>
                      <th className="pb-3 font-medium">ETD</th>
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
                      
                      return (
                        <React.Fragment key={order.id}>
                          {/* Main order row */}
                          <tr
                            className={`text-sm cursor-pointer ${getEtdRowClass(order.earliestEtd) || 'hover:bg-gray-50'}`}
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
                              {order.earliestEtd ? (
                                <span className="font-medium">{formatDate(order.earliestEtd)}</span>
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
                          
                          {/* Expanded line items */}
                          {isExpanded && lines.length > 0 && (
                            <tr>
                              <td colSpan={11} className="p-0">
                                <div className="bg-gradient-to-b from-slate-50 to-white border-t border-b border-slate-200">
                                  {/* Order-level document dates */}
                                  {(order.lcIssueDate || order.piSentDate) && (
                                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-6 text-xs">
                                      {order.piSentDate && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-500">PI Sent:</span>
                                          <Badge className="bg-violet-100 text-violet-700 text-xs font-medium">
                                            {formatDate(order.piSentDate)}
                                          </Badge>
                                        </div>
                                      )}
                                      {order.lcIssueDate && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-500">LC Issue:</span>
                                          <Badge className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                                            {formatDate(order.lcIssueDate)}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div 
                                    className="overflow-x-auto scroll-smooth focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-inset rounded"
                                    tabIndex={0}
                                    ref={(el) => setupScrollHandler(el, order.id)}
                                    onKeyDown={(e) => {
                                      const container = e.currentTarget;
                                      if (e.key === 'ArrowRight') {
                                        e.preventDefault();
                                        container.scrollLeft += 150;
                                      } else if (e.key === 'ArrowLeft') {
                                        e.preventDefault();
                                        container.scrollLeft -= 150;
                                      }
                                    }}
                                  >
                                  {/* Scroll hint */}
                                  <div className="text-[10px] text-slate-400 px-3 py-1 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                    <span>Scroll: Shift+MouseWheel or Arrow Keys (click table first) or Touchpad swipe</span>
                                  </div>
                                  <table className="w-full min-w-[900px]">
                                    <thead>
                                      <tr className="text-xs text-slate-600 bg-slate-100/50">
                                        <th className="py-2.5 px-3 text-left font-semibold">Style / Color / CAD</th>
                                        <th className="py-2.5 px-3 text-left font-semibold">Description</th>
                                        <th className="py-2.5 px-3 text-left font-semibold">Quantity</th>
                                        <th className="py-2.5 px-3 text-left font-semibold">Mill Price</th>
                                        <th className="py-2.5 px-3 text-left font-semibold">ETD</th>
                                        <th className="py-2.5 px-3 text-left font-semibold">Approval Stages</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((line) => (
                                        <tr 
                                          key={line.id} 
                                          className="text-sm border-t border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/orders/${order.id}`);
                                          }}
                                        >
                                          {/* Style / Color / CAD - Stacked badges */}
                                          <td className="py-3 px-3">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <Badge className="bg-indigo-100 text-indigo-700 text-xs font-medium">
                                                {line.styleNumber || '-'}
                                              </Badge>
                                              {line.colorCode && (
                                                <Badge className="bg-sky-100 text-sky-700 text-xs font-mono">
                                                  {line.colorCode}
                                                </Badge>
                                              )}
                                              {line.cadCode && (
                                                <Badge className="bg-amber-100 text-amber-700 text-xs font-mono">
                                                  CAD: {line.cadCode}
                                                </Badge>
                                              )}
                                            </div>
                                          </td>
                                          
                                          {/* Description - Full text, no truncation */}
                                          <td className="py-3 px-3 text-slate-600">
                                            <span className="text-sm">
                                              {line.description || <span className="text-slate-400">-</span>}
                                            </span>
                                          </td>
                                          
                                          {/* Quantity with unit */}
                                          <td className="py-3 px-3">
                                            <span className="font-semibold text-slate-800">
                                              {line.quantity.toLocaleString()}
                                            </span>
                                            <span className="text-slate-500 ml-1 text-xs">{line.unit}</span>
                                          </td>
                                          
                                          {/* Mill Price - Unit and Total stacked */}
                                          <td className="py-3 px-3">
                                            {line.millPrice ? (
                                              <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                  <span className="text-xs text-slate-500">{line.currency || 'USD'}</span>
                                                  <span className="font-medium text-slate-700">{line.millPrice.toFixed(2)}</span>
                                                  <span className="text-xs text-slate-400">/unit</span>
                                                </div>
                                                {line.millPriceTotal && (
                                                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                                                    Total: {line.currency || 'USD'} {line.millPriceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-slate-400 text-xs">-</span>
                                            )}
                                          </td>
                                          
                                          {/* ETD */}
                                          <td className="py-3 px-3">
                                            {line.etd ? (
                                              <span className="text-slate-700 font-medium">{formatDate(line.etd)}</span>
                                            ) : (
                                              <span className="text-slate-400 text-xs">-</span>
                                            )}
                                          </td>
                                          
                                          {/* Approval Stages - Show ALL stages that have ANY history */}
                                          <td className="py-3 px-3 min-w-[400px]">
                                            <div className="flex flex-nowrap gap-2">
                                              {(() => {
                                                // Combine approval types from BOTH approvalStatus AND approvalDates
                                                // This ensures we show ALL stages that have any recorded activity
                                                const allTypes = new Set<string>();
                                                
                                                // Add types from approvalStatus (excluding only 'default')
                                                Object.entries(line.approvalStatus || {}).forEach(([key, value]) => {
                                                  if (value && value !== 'default') {
                                                    allTypes.add(key);
                                                  }
                                                });
                                                
                                                // Add types from approvalDates (these have history records)
                                                Object.keys(line.approvalDates || {}).forEach(key => {
                                                  allTypes.add(key);
                                                });
                                                
                                                if (allTypes.size === 0) {
                                                  return <span className="text-slate-400 text-xs italic">No approvals yet</span>;
                                                }
                                                
                                                // Sort by priority order
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
                                                  // Get current status (could be submission, resubmission, approved, rejected, pending, etc.)
                                                  const status = line.approvalStatus?.[type] || 'pending';
                                                  const approvalDate = line.approvalDates?.[type];
                                                  const badge = getApprovalBadge(status);
                                                  
                                                  return (
                                                    <div 
                                                      key={type} 
                                                      className="flex items-center gap-1 bg-slate-50 rounded px-1.5 py-1 border border-slate-200 whitespace-nowrap"
                                                      title={`${formatApprovalName(type)}: ${badge.label}${approvalDate ? ` on ${formatDate(approvalDate)}` : ''}`}
                                                    >
                                                      <span className="text-[10px] font-semibold text-slate-600">{getApprovalAbbrev(type)}</span>
                                                      <Badge className={`${badge.bg} ${badge.text} text-[10px] px-1.5 py-0 font-medium`}>
                                                        {badge.label.substring(0, 3)}
                                                      </Badge>
                                                      {approvalDate && (
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                          {new Date(approvalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                                });
                                              })()}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
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
