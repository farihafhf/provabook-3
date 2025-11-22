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
import { Plus, FileText, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface ProformaInvoice {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  piNumber: string;
  version: number;
  status: string;
  amount: number;
  currency: string;
  issueDate?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LetterOfCredit {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  lcNumber: string;
  status: string;
  amount: number;
  currency: string;
  issueDate: string;
  expiryDate: string;
  issuingBank?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const PI_STATUS_BADGE_CONFIG: Record<
  string,
  {
    label: string;
    variant: BadgeVariant;
  }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  canceled: { label: 'Cancelled', variant: 'destructive' },
};

const LC_STATUS_BADGE_CONFIG: Record<
  string,
  {
    label: string;
    variant: BadgeVariant;
  }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  issued: { label: 'Issued', variant: 'default' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  expired: { label: 'Expired', variant: 'destructive' },
};

function getPiStatusBadge(status: string) {
  const key = status?.toLowerCase() ?? '';
  const config = PI_STATUS_BADGE_CONFIG[key];

  if (config) {
    return config;
  }

  if (!status) {
    return { label: 'Unknown', variant: 'secondary' as BadgeVariant };
  }

  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    variant: 'secondary' as BadgeVariant,
  };
}

function getLcStatusBadge(status: string) {
  const key = status?.toLowerCase() ?? '';
  const config = LC_STATUS_BADGE_CONFIG[key];

  if (config) {
    return config;
  }

  if (!status) {
    return { label: 'Unknown', variant: 'secondary' as BadgeVariant };
  }

  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    variant: 'secondary' as BadgeVariant,
  };
}

export default function FinancialsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [pis, setPis] = useState<ProformaInvoice[]>([]);
  const [lcs, setLcs] = useState<LetterOfCredit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [piDialogOpen, setPiDialogOpen] = useState(false);
  const [lcDialogOpen, setLcDialogOpen] = useState(false);
  const [piSubmitting, setPiSubmitting] = useState(false);
  const [lcSubmitting, setLcSubmitting] = useState(false);
  
  const [piFormData, setPiFormData] = useState({
    orderId: '',
    amount: '',
    currency: 'USD',
    issueDate: '',
  });

  const [lcFormData, setLcFormData] = useState({
    orderId: '',
    amount: '',
    currency: 'USD',
    issueDate: '',
    expiryDate: '',
    issuingBank: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchFinancials();
    fetchOrders();
  }, [isAuthenticated, router]);

  const fetchFinancials = async () => {
    try {
      const [pisResponse, lcsResponse] = await Promise.all([
        api.get('/financials/pis'),
        api.get('/financials/lcs'),
      ]);
      setPis(pisResponse.data);
      setLcs(lcsResponse.data);
    } catch (error) {
      console.error('Failed to fetch financials:', error);
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

  const handleCreatePI = async (e: React.FormEvent) => {
    e.preventDefault();
    setPiSubmitting(true);

    try {
      const piData = {
        orderId: piFormData.orderId,
        amount: parseFloat(piFormData.amount),
        currency: piFormData.currency,
        issueDate: piFormData.issueDate || undefined,
      };

      console.log('Creating PI with data:', piData);

      await api.post('/financials/pis', piData);

      toast({
        title: 'Success',
        description: 'Proforma Invoice created successfully',
      });

      setPiDialogOpen(false);
      setPiFormData({
        orderId: '',
        amount: '',
        currency: 'USD',
        issueDate: '',
      });
      fetchFinancials();
    } catch (error: any) {
      console.error('Error creating PI:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.message);
      
      const errorMessage = Array.isArray(error.response?.data?.message) 
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to create Proforma Invoice';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setPiSubmitting(false);
    }
  };

  const handleCreateLC = async (e: React.FormEvent) => {
    e.preventDefault();
    setLcSubmitting(true);

    try {
      const lcData = {
        orderId: lcFormData.orderId,
        amount: parseFloat(lcFormData.amount),
        currency: lcFormData.currency,
        issueDate: lcFormData.issueDate,
        expiryDate: lcFormData.expiryDate,
        issuingBank: lcFormData.issuingBank || undefined,
      };

      console.log('Creating LC with data:', lcData);

      await api.post('/financials/lcs', lcData);

      toast({
        title: 'Success',
        description: 'Letter of Credit created successfully',
      });

      setLcDialogOpen(false);
      setLcFormData({
        orderId: '',
        amount: '',
        currency: 'USD',
        issueDate: '',
        expiryDate: '',
        issuingBank: '',
      });
      fetchFinancials();
    } catch (error: any) {
      console.error('Error creating LC:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.message);
      
      const errorMessage = Array.isArray(error.response?.data?.message) 
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to create Letter of Credit';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLcSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading financials...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financials</h1>
          <p className="text-gray-500 mt-2">Manage Proforma Invoices and Letters of Credit</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proforma Invoices Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Proforma Invoices</CardTitle>
              <Dialog open={piDialogOpen} onOpenChange={setPiDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New PI
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Proforma Invoice</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePI} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pi_order">Order *</Label>
                        <Select value={piFormData.orderId} onValueChange={(value) => setPiFormData({ ...piFormData, orderId: value })}>
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
                        <Label htmlFor="pi_amount">Amount *</Label>
                        <Input
                          id="pi_amount"
                          type="number"
                          step="0.01"
                          required
                          value={piFormData.amount}
                          onChange={(e) => setPiFormData({ ...piFormData, amount: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pi_currency">Currency</Label>
                        <Select value={piFormData.currency} onValueChange={(value) => setPiFormData({ ...piFormData, currency: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="BDT">BDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pi_issueDate">Issue Date</Label>
                        <Input
                          id="pi_issueDate"
                          type="date"
                          value={piFormData.issueDate}
                          onChange={(e) => setPiFormData({ ...piFormData, issueDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setPiDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={piSubmitting || !piFormData.orderId || !piFormData.amount}>
                        {piSubmitting ? 'Creating...' : 'Create PI'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {pis.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No PIs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pis.map((pi) => {
                    const statusBadge = getPiStatusBadge(pi.status);

                    return (
                      <div key={pi.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{pi.piNumber}</p>
                            <p className="text-sm text-gray-500">Version {pi.version}</p>
                            {pi.createdByName && (
                              <p className="text-xs text-blue-600 mt-1">
                                Handled by: {pi.createdByName}
                              </p>
                            )}
                          </div>
                          <Badge variant={statusBadge.variant} className="capitalize">
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {pi.currency} {pi.amount.toLocaleString()}
                          </span>
                          {pi.issueDate && (
                            <span className="text-gray-500">{formatDate(pi.issueDate)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Letters of Credit Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Letters of Credit</CardTitle>
              <Dialog open={lcDialogOpen} onOpenChange={setLcDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New LC
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Letter of Credit</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateLC} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lc_order">Order *</Label>
                        <Select value={lcFormData.orderId} onValueChange={(value) => setLcFormData({ ...lcFormData, orderId: value })}>
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
                        <Label htmlFor="lc_amount">Amount *</Label>
                        <Input
                          id="lc_amount"
                          type="number"
                          step="0.01"
                          required
                          value={lcFormData.amount}
                          onChange={(e) => setLcFormData({ ...lcFormData, amount: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lc_currency">Currency</Label>
                        <Select value={lcFormData.currency} onValueChange={(value) => setLcFormData({ ...lcFormData, currency: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="BDT">BDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lc_issueDate">Issue Date *</Label>
                        <Input
                          id="lc_issueDate"
                          type="date"
                          required
                          value={lcFormData.issueDate}
                          onChange={(e) => setLcFormData({ ...lcFormData, issueDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lc_expiryDate">Expiry Date *</Label>
                        <Input
                          id="lc_expiryDate"
                          type="date"
                          required
                          value={lcFormData.expiryDate}
                          onChange={(e) => setLcFormData({ ...lcFormData, expiryDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lc_issuingBank">Issuing Bank</Label>
                        <Input
                          id="lc_issuingBank"
                          value={lcFormData.issuingBank}
                          onChange={(e) => setLcFormData({ ...lcFormData, issuingBank: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setLcDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={lcSubmitting || !lcFormData.orderId || !lcFormData.amount || !lcFormData.issueDate || !lcFormData.expiryDate}>
                        {lcSubmitting ? 'Creating...' : 'Create LC'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {lcs.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No LCs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lcs.map((lc) => {
                    const statusBadge = getLcStatusBadge(lc.status);

                    return (
                      <div key={lc.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{lc.lcNumber}</p>
                            {lc.issuingBank && (
                              <p className="text-sm text-gray-500">{lc.issuingBank}</p>
                            )}
                            {lc.createdByName && (
                              <p className="text-xs text-blue-600 mt-1">
                                Handled by: {lc.createdByName}
                              </p>
                            )}
                          </div>
                          <Badge variant={statusBadge.variant} className="capitalize">
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-medium">
                              {lc.currency} {lc.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Issue:</span>
                            <span className="text-gray-500">{formatDate(lc.issueDate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expiry:</span>
                            <span className="text-gray-500">{formatDate(lc.expiryDate)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
