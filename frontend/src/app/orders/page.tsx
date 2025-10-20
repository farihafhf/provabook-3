'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDate } from '@/lib/utils';

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
      upcoming: 'secondary',
      running: 'success',
      completed: 'default',
      archived: 'outline',
    };
    return colors[status] || 'default';
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No orders found</p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Order
                </Button>
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
                      <tr key={order.id} className="text-sm">
                        <td className="py-4 font-medium">{order.orderNumber}</td>
                        <td className="py-4">{order.customerName}</td>
                        <td className="py-4">{order.fabricType}</td>
                        <td className="py-4">{order.quantity.toLocaleString()} {order.unit}</td>
                        <td className="py-4">
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
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
