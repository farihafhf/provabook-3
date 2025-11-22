'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, FileText, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface Sample {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  type: string;
  version: number;
  status: string;
  submissionDate?: string;
  recipient?: string;
  courierName?: string;
  awbNumber?: string;
  attachment?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
}

export default function SamplesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    type: 'lab_dip',
    orderId: '',
    recipient: '',
    courierName: '',
    awbNumber: '',
    submissionDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchSamples();
    fetchOrders();
  }, [isAuthenticated, router]);

  const fetchSamples = async () => {
    try {
      const response = await api.get('/samples');
      setSamples(response.data);
    } catch (error) {
      console.error('Failed to fetch samples:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleCreateSample = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('orderId', formData.orderId);
      
      if (formData.recipient) formDataToSend.append('recipient', formData.recipient);
      if (formData.courierName) formDataToSend.append('courierName', formData.courierName);
      if (formData.awbNumber) formDataToSend.append('awbNumber', formData.awbNumber);
      if (formData.submissionDate) formDataToSend.append('submissionDate', formData.submissionDate);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      if (file) formDataToSend.append('attachment', file);

      console.log('Creating sample with FormData');

      await api.post('/samples', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast({
        title: 'Success',
        description: 'Sample created successfully',
      });

      setDialogOpen(false);
      setFormData({
        type: 'lab_dip',
        orderId: '',
        recipient: '',
        courierName: '',
        awbNumber: '',
        submissionDate: '',
        notes: '',
      });
      setFile(null);
      fetchSamples();
    } catch (error: any) {
      console.error('Error creating sample:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.message);
      
      const errorMessage = Array.isArray(error.response?.data?.message) 
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to create sample';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading samples...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Samples</h1>
            <p className="text-gray-500 mt-2">Track sample submissions and approvals</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Sample</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSample} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Sample Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lab_dip">Lab Dip</SelectItem>
                        <SelectItem value="strike_off">Strike Off</SelectItem>
                        <SelectItem value="bulk_swatch">Bulk Swatch</SelectItem>
                        <SelectItem value="pp_sample">PP Sample</SelectItem>
                        <SelectItem value="hand_loom">Hand Loom</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderId">Order *</Label>
                    <Select value={formData.orderId} onValueChange={(value) => setFormData({ ...formData, orderId: value })}>
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
                    <Label htmlFor="recipient">Recipient</Label>
                    <Input
                      id="recipient"
                      value={formData.recipient}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courierName">Courier</Label>
                    <Input
                      id="courierName"
                      value={formData.courierName}
                      onChange={(e) => setFormData({ ...formData, courierName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awbNumber">AWB Number</Label>
                    <Input
                      id="awbNumber"
                      value={formData.awbNumber}
                      onChange={(e) => setFormData({ ...formData, awbNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submissionDate">Submission Date</Label>
                    <Input
                      id="submissionDate"
                      type="date"
                      value={formData.submissionDate}
                      onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="attachment">Attachment</Label>
                    <Input
                      id="attachment"
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    />
                    {file && (
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !formData.orderId}>
                    {submitting ? 'Creating...' : 'Create Sample'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Samples</CardTitle>
          </CardHeader>
          <CardContent>
            {samples.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No samples found</p>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Sample
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Version</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Recipient</th>
                      <th className="pb-3 font-medium">Courier</th>
                      <th className="pb-3 font-medium">AWB</th>
                      <th className="pb-3 font-medium">Submission Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {samples.map((sample) => (
                      <tr key={sample.id} className="text-sm">
                        <td className="py-4 font-medium capitalize">{sample.type.replace('_', ' ')}</td>
                        <td className="py-4">V{sample.version}</td>
                        <td className="py-4">
                          <Badge variant="secondary" className="capitalize">
                            {sample.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4">{sample.recipient || '-'}</td>
                        <td className="py-4">{sample.courierName || '-'}</td>
                        <td className="py-4">{sample.awbNumber || '-'}</td>
                        <td className="py-4">{sample.submissionDate ? formatDate(sample.submissionDate) : '-'}</td>
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
