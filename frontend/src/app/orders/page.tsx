'use client';

import { Suspense, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Plus, Eye, Trash2, Download, Edit } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDate, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { OrderFilters } from '@/components/orders/order-filters';

interface Order {
  id: string;
  orderNumber: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<OrdersFilterParams>({});
  const [formData, setFormData] = useState({
    customerName: '',
    buyerName: '',
    styleNumber: '',
    fabricType: '',
    fabricComposition: '',
    gsm: '',
    finishType: '',
    construction: '',
    millName: '',
    millPrice: '',
    provaPrice: '',
    currency: 'USD',
    quantity: '',
    unit: 'meters',
    orderDate: '',
    expectedDeliveryDate: '',
    etd: '',
    eta: '',
    colorBreakdown: [{ color: '', quantity: '' }],
  });

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

      const response = await api.get('/orders/', { params });
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

      const response = await api.get('/orders/export-excel/', {
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const orderData = {
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        styleNumber: formData.styleNumber || undefined,
        fabricType: formData.fabricType,
        fabricComposition: formData.fabricComposition || undefined,
        gsm: formData.gsm ? parseFloat(formData.gsm) : undefined,
        finishType: formData.finishType || undefined,
        construction: formData.construction || undefined,
        millName: formData.millName || undefined,
        millPrice: formData.millPrice ? parseFloat(formData.millPrice) : undefined,
        provaPrice: formData.provaPrice ? parseFloat(formData.provaPrice) : undefined,
        currency: formData.currency,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        colorQuantityBreakdown: formData.colorBreakdown
          .filter(item => item.color && item.quantity)
          .map(item => ({
            color: item.color,
            quantity: parseFloat(item.quantity),
          })) || undefined,
        etd: formData.etd || undefined,
        eta: formData.eta || undefined,
        status: 'upcoming',
        category: 'upcoming',
        orderDate: formData.orderDate || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
      };

      console.log('Creating order with data:', orderData);

      const response = await api.post('/orders/', orderData);

      console.log('Order created successfully:', response.data);

      toast({
        title: 'Success',
        description: 'Order created successfully',
      });

      setDialogOpen(false);
      setFormData({
        customerName: '',
        buyerName: '',
        styleNumber: '',
        fabricType: '',
        fabricComposition: '',
        gsm: '',
        finishType: '',
        construction: '',
        millName: '',
        millPrice: '',
        provaPrice: '',
        currency: 'USD',
        quantity: '',
        unit: 'meters',
        orderDate: '',
        expectedDeliveryDate: '',
        etd: '',
        eta: '',
        colorBreakdown: [{ color: '', quantity: '' }],
      });
      
      // Refresh orders list with current filters
      await fetchOrders(filters);
    } catch (error: any) {
      console.error('Error creating order:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.message);
      
      const errorMessage = Array.isArray(error.response?.data?.message) 
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to create order';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  const addColorRow = () => {
    setFormData({
      ...formData,
      colorBreakdown: [...formData.colorBreakdown, { color: '', quantity: '' }],
    });
  };

  const removeColorRow = (index: number) => {
    const newBreakdown = formData.colorBreakdown.filter((_, i) => i !== index);
    setFormData({ ...formData, colorBreakdown: newBreakdown.length > 0 ? newBreakdown : [{ color: '', quantity: '' }] });
  };

  const updateColorRow = (index: number, field: 'color' | 'quantity', value: string) => {
    const newBreakdown = [...formData.colorBreakdown];
    newBreakdown[index][field] = value;
    setFormData({ ...formData, colorBreakdown: newBreakdown });
  };

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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOrder} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input id="customerName" required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyerName">Buyer Name</Label>
                      <Input id="buyerName" value={formData.buyerName} onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="styleNumber">Style / Article Number</Label>
                      <Input id="styleNumber" placeholder="e.g., ST-2025-001" value={formData.styleNumber} onChange={(e) => setFormData({ ...formData, styleNumber: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Fabric Specifications */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Fabric Specifications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fabricType">Fabric Type *</Label>
                      <Input id="fabricType" required placeholder="e.g., Single Jersey" value={formData.fabricType} onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fabricComposition">Composition</Label>
                      <Input id="fabricComposition" placeholder="e.g., 100% Cotton" value={formData.fabricComposition} onChange={(e) => setFormData({ ...formData, fabricComposition: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gsm">GSM</Label>
                      <Input id="gsm" type="number" step="0.01" placeholder="e.g., 180" value={formData.gsm} onChange={(e) => setFormData({ ...formData, gsm: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finishType">Finish Type</Label>
                      <Input id="finishType" placeholder="e.g., Peach Finish" value={formData.finishType} onChange={(e) => setFormData({ ...formData, finishType: e.target.value })} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="construction">Construction</Label>
                      <Input id="construction" placeholder="e.g., 30/1 Combed Ring Spun" value={formData.construction} onChange={(e) => setFormData({ ...formData, construction: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Mill & Pricing */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Mill & Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="millName">Mill Name</Label>
                      <Input id="millName" placeholder="e.g., ABC Textile Mills" value={formData.millName} onChange={(e) => setFormData({ ...formData, millName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="millPrice">Mill Price</Label>
                      <Input id="millPrice" type="number" step="0.01" placeholder="0.00" value={formData.millPrice} onChange={(e) => setFormData({ ...formData, millPrice: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provaPrice">Prova Price (PI)</Label>
                      <Input id="provaPrice" type="number" step="0.01" placeholder="0.00" value={formData.provaPrice} onChange={(e) => setFormData({ ...formData, provaPrice: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select id="currency" className="w-full h-10 px-3 border rounded-md" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="USD">USD</option>
                        <option value="BDT">BDT</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quantity & Colors */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Quantity</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Total Quantity *</Label>
                      <Input id="quantity" type="number" step="0.01" required value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit *</Label>
                      <select id="unit" className="w-full h-10 px-3 border rounded-md" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                        <option value="meters">Meters</option>
                        <option value="yards">Yards</option>
                        <option value="kilograms">Kilograms</option>
                        <option value="pieces">Pieces</option>
                      </select>
                    </div>
                  </div>
                  <Label className="mb-2 block">Color-wise Breakdown (Optional)</Label>
                  {formData.colorBreakdown.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <Input className="col-span-5" placeholder="Color name" value={item.color} onChange={(e) => updateColorRow(index, 'color', e.target.value)} />
                      <Input className="col-span-5" type="number" step="0.01" placeholder="Quantity" value={item.quantity} onChange={(e) => updateColorRow(index, 'quantity', e.target.value)} />
                      <Button type="button" variant="outline" size="sm" className="col-span-2" onClick={() => removeColorRow(index)} disabled={formData.colorBreakdown.length === 1}>Remove</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addColorRow} className="mt-2">+ Add Color</Button>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Important Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderDate">Order Date *</Label>
                      <Input id="orderDate" type="date" required value={formData.orderDate} onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                      <Input id="expectedDeliveryDate" type="date" value={formData.expectedDeliveryDate} onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="etd">ETD (Est. Time of Departure)</Label>
                      <Input id="etd" type="date" value={formData.etd} onChange={(e) => setFormData({ ...formData, etd: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eta">ETA (Est. Time of Arrival)</Label>
                      <Input id="eta" type="date" value={formData.eta} onChange={(e) => setFormData({ ...formData, eta: e.target.value })} />
                    </div>
                  </div>
                </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Order'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Order
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium">Order #</th>
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
                        <td className="py-4 font-medium">{order.orderNumber}</td>
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
                  <p className="text-sm"><strong>Order #:</strong> {orderToDelete.orderNumber}</p>
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
