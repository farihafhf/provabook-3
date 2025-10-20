'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Plus, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    buyerName: '',
    fabricType: '',
    quantity: '',
    unit: 'meters',
    orderDate: '',
    expectedDeliveryDate: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, router]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const orderData = {
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        fabricType: formData.fabricType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        status: 'upcoming',
        category: 'upcoming',
        orderDate: formData.orderDate || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
      };

      console.log('Creating order with data:', orderData);

      const response = await api.post('/orders', orderData);

      console.log('Order created successfully:', response.data);

      toast({
        title: 'Success',
        description: 'Order created successfully',
      });

      setDialogOpen(false);
      setFormData({
        customerName: '',
        buyerName: '',
        fabricType: '',
        quantity: '',
        unit: 'meters',
        orderDate: '',
        expectedDeliveryDate: '',
      });
      
      // Refresh orders list
      await fetchOrders();
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

  const getCategoryBadgeClass = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === 'upcoming') {
      return 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100';
    } else if (lowerCategory === 'running') {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100';
    } else if (lowerCategory === 'archived') {
      return 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100';
    }
    return 'bg-gray-100 text-gray-600 border border-gray-200';
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerName">Buyer Name</Label>
                    <Input
                      id="buyerName"
                      value={formData.buyerName}
                      onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fabricType">Fabric Type *</Label>
                    <Input
                      id="fabricType"
                      required
                      value={formData.fabricType}
                      onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <select
                      id="unit"
                      className="w-full h-10 px-3 border rounded-md"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="meters">Meters</option>
                      <option value="yards">Yards</option>
                      <option value="kilograms">Kilograms</option>
                      <option value="pieces">Pieces</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date *</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      required
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Order'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Order Date</th>
                      <th className="pb-3 font-medium">Expected Delivery</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="text-sm">
                        <td className="py-4 font-medium">{order.orderNumber}</td>
                        <td className="py-4">{order.customerName}</td>
                        <td className="py-4">{order.fabricType}</td>
                        <td className="py-4">{order.quantity.toLocaleString()} {order.unit}</td>
                        <td className="py-4">
                          <Badge className={getCategoryBadgeClass(order.category)}>
                            {order.category}
                          </Badge>
                        </td>
                        <td className="py-4">{order.orderDate ? formatDate(order.orderDate) : '-'}</td>
                        <td className="py-4">{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}</td>
                        <td className="py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
