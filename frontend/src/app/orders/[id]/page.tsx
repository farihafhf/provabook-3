'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  buyerName?: string;
  fabricType: string;
  fabricSpecifications?: string;
  quantity: number;
  unit: string;
  status: string;
  category: string;
  currentStage: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  approvalStatus?: {
    labDip?: string;
    trimsCard?: string;
    fabricTest?: string;
    fitSample?: string;
    ppSample?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();
  }, [isAuthenticated, router, params.id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${params.id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalChange = async (approvalType: string, newStatus: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/approvals`, {
        approvalType,
        status: newStatus,
      });

      toast({
        title: 'Success',
        description: `${formatApprovalName(approvalType)} updated to ${newStatus}`,
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update approval:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update approval',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleApprovePPSample = async () => {
    if (!order) return;

    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/approvals`, {
        approvalType: 'ppSample',
        status: 'approved',
      });

      await api.post(`/orders/${order.id}/change-stage`, {
        stage: 'In Development',
      });

      toast({
        title: 'Success',
        description: 'PP Sample approved! Order moved to In Development',
      });

      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to approve PP Sample:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve PP Sample',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!order) return;

    setUpdating(true);
    try {
      await api.post(`/orders/${order.id}/change-stage`, {
        stage: 'Delivered',
      });

      toast({
        title: 'Success',
        description: 'Order marked as delivered and moved to archive',
      });

      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to mark as delivered:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to mark as delivered',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatApprovalName = (type: string): string => {
    const names: Record<string, string> = {
      labDip: 'Lab Dip',
      trimsCard: 'Trims Card',
      fabricTest: 'Fabric Test',
      fitSample: 'Fit Sample',
      ppSample: 'PP Sample',
    };
    return names[type] || type;
  };

  const getApprovalIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getApprovedCount = () => {
    if (!order?.approvalStatus) return 0;
    const statuses = [
      order.approvalStatus.labDip,
      order.approvalStatus.trimsCard,
      order.approvalStatus.fabricTest,
      order.approvalStatus.fitSample,
    ];
    return statuses.filter(s => s === 'approved').length;
  };

  const allParallelApproved = () => {
    if (!order?.approvalStatus) return false;
    return (
      order.approvalStatus.labDip === 'approved' &&
      order.approvalStatus.trimsCard === 'approved' &&
      order.approvalStatus.fabricTest === 'approved' &&
      order.approvalStatus.fitSample === 'approved'
    );
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
          <p>Loading order details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Order not found</p>
            <Button onClick={() => router.push('/orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Button variant="ghost" onClick={() => router.push('/orders')} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-gray-500 mt-2">{order.customerName}</p>
          </div>
          <div className="flex gap-2">
            {(order.currentStage === 'In Development' || order.currentStage === 'Production') && (
              <Button onClick={handleMarkDelivered} disabled={updating}>
                <Package className="mr-2 h-4 w-4" />
                {updating ? 'Processing...' : 'Mark Delivered'}
              </Button>
            )}
          </div>
        </div>

        {/* Current Stage Badge */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Current Stage: {order.currentStage}
          </Badge>
          <Badge className={`text-lg px-4 py-2 ${getCategoryBadgeClass(order.category)}`}>
            {order.category}
          </Badge>
        </div>

        {/* Approval Gate Section */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Approval Gate</CardTitle>
              <div className="text-sm font-medium">
                Progress: <span className="text-blue-600 text-lg">{getApprovedCount()} / 4</span> Approved
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Parallel Approvals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['labDip', 'trimsCard', 'fabricTest', 'fitSample'] as const).map((type) => (
                  <div key={type} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getApprovalIcon(order.approvalStatus?.[type] || 'pending')}
                        <span className="font-medium">{formatApprovalName(type)}</span>
                      </div>
                    </div>
                    <Select
                      value={order.approvalStatus?.[type] || 'pending'}
                      onValueChange={(value) => handleApprovalChange(type, value)}
                      disabled={updating}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* PP Sample - Dependency Gate */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-6 w-6 text-blue-600" />
                      <span className="font-bold text-lg">PP Sample (Final Approval)</span>
                    </div>
                    {!allParallelApproved() && (
                      <p className="text-sm text-gray-600">
                        ⚠️ All parallel approvals must be approved before PP Sample can be approved
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleApprovePPSample}
                    disabled={!allParallelApproved() || updating || order.approvalStatus?.ppSample === 'approved'}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {order.approvalStatus?.ppSample === 'approved' ? (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        PP Sample Approved
                      </>
                    ) : (
                      <>
                        {updating ? 'Processing...' : 'Approve PP Sample'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-medium">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              {order.buyerName && (
                <div>
                  <p className="text-sm text-gray-500">Buyer Name</p>
                  <p className="font-medium">{order.buyerName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className="mt-1">{order.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <Badge variant="secondary" className="mt-1">{order.category}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fabric Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Fabric Type</p>
                <p className="font-medium">{order.fabricType}</p>
              </div>
              {order.fabricSpecifications && (
                <div>
                  <p className="text-sm text-gray-500">Specifications</p>
                  <p className="font-medium">{order.fabricSpecifications}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">{order.quantity.toLocaleString()} {order.unit}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.orderDate && (
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">{formatDate(order.orderDate)}</p>
                </div>
              )}
              {order.expectedDeliveryDate && (
                <div>
                  <p className="text-sm text-gray-500">Expected Delivery</p>
                  <p className="font-medium">{formatDate(order.expectedDeliveryDate)}</p>
                </div>
              )}
              {order.actualDeliveryDate && (
                <div>
                  <p className="text-sm text-gray-500">Actual Delivery</p>
                  <p className="font-medium">{formatDate(order.actualDeliveryDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
