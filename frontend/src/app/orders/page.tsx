'use client';

import { Suspense, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Plus, Eye, Trash2, Download, Edit } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDate, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { OrderFilters } from '@/components/orders/order-filters';
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';

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
}

interface OrdersFilterParams {
  search?: string | null;
  status?: string | null;
  orderDateFrom?: string | null;
  orderDateTo?: string | null;
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
  const [filters, setFilters] = useState<OrdersFilterParams>({});
  // formData, users, taskAssignment removed - now handled by CreateOrderDialog component

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

  const fetchOrders = async (filtersToUse?: OrdersFilterParams) => {
    try {
      const params: Record<string, string> = {};
      if (filtersToUse?.search) params.search = filtersToUse.search;
      if (filtersToUse?.status) params.status = filtersToUse.status;
      if (filtersToUse?.orderDateFrom) params.order_date_from = filtersToUse.orderDateFrom;
      if (filtersToUse?.orderDateTo) params.order_date_to = filtersToUse.orderDateTo;

      const response = await api.get('/orders', { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const queryParams: Record<string, string> = {};
      const search = searchParams.get('search');
      const status = searchParams.get('status');
      const orderDateFrom = searchParams.get('order_date_from');
      const orderDateTo = searchParams.get('order_date_to');

      if (search) queryParams.search = search;
      if (status) queryParams.status = status;
      if (orderDateFrom) queryParams.order_date_from = orderDateFrom;
      if (orderDateTo) queryParams.order_date_to = orderDateTo;

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

        {/* Create Order Dialog */}
        <CreateOrderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => fetchOrders(filters)}
        />

        <Suspense fallback={null}>
          <OrderFilters onFilterChange={handleFiltersChange} />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <th className="pb-3 font-medium">PO #</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Fabric Type</th>
                      <th className="pb-3 font-medium">Quantity</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Order Date</th>
                      <th className="pb-3 font-medium">Expected Delivery</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="text-sm hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <td className="py-4 font-medium">{order.poNumber}</td>
                        <td className="py-4">{order.customerName}</td>
                        <td className="py-4">{order.fabricType}</td>
                        <td className="py-4">{order.quantity.toLocaleString()} {order.unit}</td>
                        <td className="py-4">
                          <Badge className={getStatusBadgeClass(order.status)}>
                            {getStatusDisplayName(order.status)}
                          </Badge>
                        </td>
                        <td className="py-4">{order.orderDate ? formatDate(order.orderDate) : '-'}</td>
                        <td className="py-4">{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}</td>
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
                    ))}
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
