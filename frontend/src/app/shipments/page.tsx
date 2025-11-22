'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal, Trash, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface ShipmentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  status: string;
  mode: string;
  awbNumber?: string;
  carrierName?: string;
  courierName?: string;
  shippingDate?: string;
  estimatedDepartureDate?: string;
  packingListUrl?: string;
  documents?: string;
  notes?: string;
  orderId?: string;
  order_id?: string;
  orderNumber?: string;
  order?: ShipmentOrder;
  createdAt?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
}

const SHIPMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'customs_clearance', label: 'Customs Clearance' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
];

export default function ShipmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    orderId: '',
    carrier: '',
    awb: '',
    date: '',
    status: 'pending',
    quantity: '',
    unit: 'meters',
    notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [shipRes, orderRes] = await Promise.all([
          api.get('/shipments/', { params: { _t: Date.now() } }),
          api.get('/orders/'),
        ]);

        setShipments(Array.isArray(shipRes.data) ? (shipRes.data as Shipment[]) : []);
        setOrders(Array.isArray(orderRes.data) ? (orderRes.data as Order[]) : []);
      } catch (error) {
        console.error('Failed to load shipments:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated, router]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderId) {
      toast({
        title: 'Order required',
        description: 'Please select an order for this shipment.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.quantity) {
      toast({
        title: 'Quantity required',
        description: 'Please enter the shipped quantity.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const body = new FormData();
      body.append('order_id', formData.orderId);
      body.append('status', formData.status);
      body.append('quantity', String(parseFloat(formData.quantity)));
      body.append('unit', formData.unit || 'meters');

      if (formData.carrier) body.append('courierName', formData.carrier);
      if (formData.awb) body.append('awbNumber', formData.awb);
      if (formData.date) body.append('estimatedDepartureDate', formData.date);
      if (formData.notes) body.append('notes', formData.notes);
      if (file) body.append('packingList', file);

      const response = await api.post('/shipments/', body, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const created: Shipment = response.data;
      const matchedOrder = orders.find((order) => order.id === formData.orderId);
      const createdWithOrder: Shipment = matchedOrder
        ? {
            ...created,
            order: {
              id: matchedOrder.id,
              orderNumber: matchedOrder.orderNumber,
              customerName: matchedOrder.customerName,
            },
          }
        : created;

      setShipments((prev) => [createdWithOrder, ...prev]);

      toast({
        title: 'Success',
        description: 'Shipment created successfully.',
      });

      setDialogOpen(false);
      setFormData({
        orderId: '',
        carrier: '',
        awb: '',
        date: '',
        status: 'pending',
        quantity: '',
        unit: 'meters',
        notes: '',
      });
      setFile(null);
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message || error.message || 'Failed to create shipment';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShipment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipment?')) return;

    try {
      await api.delete(`/shipments/${id}`);
      setShipments((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Deleted', description: 'Shipment deleted successfully.' });
    } catch (error: any) {
      console.error('Error deleting shipment:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to delete shipment';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await api.patch(`/shipments/${id}/`, { status: newStatus });
      const updatedShipment: Shipment = response.data;
      
      // Optimistically update local state
      setShipments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: updatedShipment.status } : s))
      );

      toast({
        title: 'Status Updated',
        description: `Shipment status changed to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const label = status.replace('_', ' ');
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    
    if (status === 'delivered') {
      variant = 'default';
    } else if (status === 'in_transit') {
      variant = 'outline';
    }
    
    return (
      <Badge variant={variant} className="capitalize">
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <p>Loading shipments...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Shipments</h1>
            <p className="mt-2 text-gray-500">Track deliveries and logistics</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create New Shipment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateShipment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order *</Label>
                    <Select
                      value={formData.orderId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, orderId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select order" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderNumber} - {order.customerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPMENT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Carrier</Label>
                    <Input
                      value={formData.carrier}
                      onChange={(e) => setFormData((prev) => ({ ...prev, carrier: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AWB</Label>
                    <Input
                      value={formData.awb}
                      onChange={(e) => setFormData((prev) => ({ ...prev, awb: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Packing List (PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file && (
                      <p className="text-sm text-gray-500">Selected: {file.name}</p>
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !formData.orderId}>
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            {shipments.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No shipments found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-gray-600">
                    <tr>
                      <th className="pb-2 font-medium">Order #</th>
                      <th className="pb-2 font-medium">Carrier</th>
                      <th className="pb-2 font-medium">AWB</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Docs</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shipments.map((shipment) => (
                      <tr key={shipment.id} className="align-middle">
                        <td className="py-3 font-medium">
                          {shipment.order?.orderNumber || shipment.orderNumber || '-'}
                        </td>
                        <td className="py-3">{shipment.carrierName || shipment.courierName || '-'}</td>
                        <td className="py-3">
                          {shipment.awbNumber ? (
                            <a
                              href={`https://google.com/search?q=${encodeURIComponent(shipment.awbNumber)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {shipment.awbNumber}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3">
                          {shipment.shippingDate
                            ? formatDate(shipment.shippingDate)
                            : shipment.estimatedDepartureDate
                            ? formatDate(shipment.estimatedDepartureDate)
                            : '-'}
                        </td>
                        <td className="py-3">{getStatusBadge(shipment.status)}</td>
                        <td className="py-3">
                          {shipment.documents ? (
                            <button
                              onClick={() => window.open(shipment.documents, '_blank')}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Document"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  Update Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(shipment.id, 'pending')}
                                    disabled={shipment.status === 'pending'}
                                  >
                                    Pending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(shipment.id, 'in_transit')}
                                    disabled={shipment.status === 'in_transit'}
                                  >
                                    In Transit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(shipment.id, 'delivered')}
                                    disabled={shipment.status === 'delivered'}
                                  >
                                    Delivered
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => handleDeleteShipment(shipment.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
