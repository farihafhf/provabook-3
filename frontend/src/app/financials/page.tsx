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
import { Plus, FileText, DollarSign, MoreHorizontal, Upload, Download, Search, History } from 'lucide-react';
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
  pdfUrl?: string;
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

const PI_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const LC_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'issued', label: 'Issued' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'expired', label: 'Expired' },
];

const PAGE_SIZE = 10;

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
  const [piPage, setPiPage] = useState(0);
  const [lcPage, setLcPage] = useState(0);
  const [editPiDialogOpen, setEditPiDialogOpen] = useState(false);
  const [editLcDialogOpen, setEditLcDialogOpen] = useState(false);
  const [editingPi, setEditingPi] = useState<ProformaInvoice | null>(null);
  const [editingLc, setEditingLc] = useState<LetterOfCredit | null>(null);

  const [selectedOrderFilter, setSelectedOrderFilter] = useState<string>('');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);

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

  const [editPiFormData, setEditPiFormData] = useState({
    orderId: '',
    amount: '',
    currency: 'USD',
    issueDate: '',
  });

  const [editLcFormData, setEditLcFormData] = useState({
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

  useEffect(() => {
    setPiPage(0);
  }, [pis.length]);

  useEffect(() => {
    setLcPage(0);
  }, [lcs.length]);

  const fetchFinancials = async (orderId?: string) => {
    try {
      const params: any = { _t: Date.now() };
      if (orderId) {
        params.order = orderId;
      }
      
      const [pisResponse, lcsResponse] = await Promise.all([
        api.get('/financials/pis', { params }),
        api.get('/financials/lcs', { params: { _t: Date.now() } }),
      ]);
      setPis(pisResponse.data);
      setLcs(lcsResponse.data);
    } catch (error) {
      console.error('Failed to fetch financials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderFilterChange = (orderId: string) => {
    const actualOrderId = orderId === 'all' ? '' : orderId;
    setSelectedOrderFilter(actualOrderId);
    fetchFinancials(actualOrderId || undefined);
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdfFile(file);
    } else if (file) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleOpenEditPI = (pi: ProformaInvoice) => {
    setEditingPi(pi);
    setEditPiFormData({
      orderId: pi.orderId,
      amount: pi.amount != null ? pi.amount.toString() : '',
      currency: pi.currency || 'USD',
      issueDate: pi.issueDate ? pi.issueDate.slice(0, 10) : '',
    });
    setEditPiDialogOpen(true);
  };

  const handleOpenEditLC = (lc: LetterOfCredit) => {
    setEditingLc(lc);
    setEditLcFormData({
      orderId: lc.orderId,
      amount: lc.amount != null ? lc.amount.toString() : '',
      currency: lc.currency || 'USD',
      issueDate: lc.issueDate ? lc.issueDate.slice(0, 10) : '',
      expiryDate: lc.expiryDate ? lc.expiryDate.slice(0, 10) : '',
      issuingBank: lc.issuingBank || '',
    });
    setEditLcDialogOpen(true);
  };

  const handleCreatePI = async (e: React.FormEvent) => {
    e.preventDefault();
    setPiSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('orderId', piFormData.orderId);
      formData.append('amount', piFormData.amount);
      formData.append('currency', piFormData.currency);
      if (piFormData.issueDate) {
        formData.append('issueDate', piFormData.issueDate);
      }
      if (selectedPdfFile) {
        formData.append('pdfFile', selectedPdfFile);
      }

      console.log('Creating PI with data:', piFormData);

      const token = localStorage.getItem('access_token');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/financials/pis/`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create PI');
      }

      const newPi = await response.json();

      // Immediately add the new PI to the state
      setPis((prevPis) => [newPi, ...prevPis]);

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
      setSelectedPdfFile(null);
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

  const handleUpdatePI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPi) {
      return;
    }
    setPiSubmitting(true);

    try {
      const piData = {
        orderId: editPiFormData.orderId,
        amount: parseFloat(editPiFormData.amount),
        currency: editPiFormData.currency,
        issueDate: editPiFormData.issueDate || undefined,
      };

      await api.patch(`/financials/pis/${editingPi.id}`, piData);

      setPis((prev) =>
        prev.map((pi) =>
          pi.id === editingPi.id
            ? {
                ...pi,
                orderId: editPiFormData.orderId,
                amount: parseFloat(editPiFormData.amount),
                currency: editPiFormData.currency,
                issueDate: editPiFormData.issueDate || undefined,
              }
            : pi
        )
      );

      toast({
        title: 'Success',
        description: 'Proforma Invoice updated successfully',
      });

      setEditPiDialogOpen(false);
      setEditingPi(null);
    } catch (error: any) {
      console.error('Error updating PI:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.message);

      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to update Proforma Invoice';

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

      const response = await api.post('/financials/lcs', lcData);
      const newLc = response.data;

      // Immediately add the new LC to the state
      setLcs((prevLcs) => [newLc, ...prevLcs]);

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

  const handleUpdateLC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLc) {
      return;
    }
    setLcSubmitting(true);

    try {
      const lcData = {
        orderId: editLcFormData.orderId,
        amount: parseFloat(editLcFormData.amount),
        currency: editLcFormData.currency,
        issueDate: editLcFormData.issueDate,
        expiryDate: editLcFormData.expiryDate,
        issuingBank: editLcFormData.issuingBank || undefined,
      };

      await api.patch(`/financials/lcs/${editingLc.id}`, lcData);

      setLcs((prev) =>
        prev.map((lc) =>
          lc.id === editingLc.id
            ? {
                ...lc,
                orderId: editLcFormData.orderId,
                amount: parseFloat(editLcFormData.amount),
                currency: editLcFormData.currency,
                issueDate: editLcFormData.issueDate,
                expiryDate: editLcFormData.expiryDate,
                issuingBank: editLcFormData.issuingBank || undefined,
              }
            : lc
        )
      );

      toast({
        title: 'Success',
        description: 'Letter of Credit updated successfully',
      });

      setEditLcDialogOpen(false);
      setEditingLc(null);
    } catch (error: any) {
      console.error('Error updating LC:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.message);

      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to update Letter of Credit';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLcSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, modelType: 'pi' | 'lc') => {
    try {
      const endpoint = modelType === 'pi' ? '/financials/pis' : '/financials/lcs';

      console.log(`Updating ${modelType} ${id} status to ${newStatus}`);
      const response = await api.patch(`${endpoint}/${id}`, { status: newStatus });
      console.log('PATCH response:', response.data);

      // Use the response data to update state to ensure we match what backend saved
      if (modelType === 'pi') {
        setPis((prev) =>
          prev.map((pi) => (pi.id === id ? { ...pi, status: response.data.status } : pi))
        );
      } else {
        setLcs((prev) =>
          prev.map((lc) => (lc.id === id ? { ...lc, status: response.data.status } : lc))
        );
      }

      toast({
        title: 'Success',
        description: `Status updated to ${response.data.status}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message || error.message || 'Failed to update status';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const piTotalPages = Math.ceil(pis.length / PAGE_SIZE);
  const lcTotalPages = Math.ceil(lcs.length / PAGE_SIZE);
  const paginatedPis =
    piTotalPages > 0
      ? pis.slice(piPage * PAGE_SIZE, piPage * PAGE_SIZE + PAGE_SIZE)
      : [];
  const paginatedLcs =
    lcTotalPages > 0
      ? lcs.slice(lcPage * PAGE_SIZE, lcPage * PAGE_SIZE + PAGE_SIZE)
      : [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading financials...</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    order.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financials</h1>
          <p className="text-gray-500 mt-2">Manage Proforma Invoices and Letters of Credit</p>
        </div>

        {/* Order Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filter by Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-search">Search Orders</Label>
                <Input
                  id="order-search"
                  placeholder="Search by order number or customer..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-filter">Select Order</Label>
                <Select value={selectedOrderFilter || "all"} onValueChange={handleOrderFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All orders</SelectItem>
                    {filteredOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} - {order.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedOrderFilter && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary">
                  Showing PIs for: {orders.find(o => o.id === selectedOrderFilter)?.orderNumber}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleOrderFilterChange('all')}
                >
                  Clear filter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                    <div className="space-y-2">
                      <Label htmlFor="pi_pdf">Upload PDF (Optional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="pi_pdf"
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePdfFileSelect}
                        />
                        {selectedPdfFile && (
                          <Badge variant="secondary">
                            {selectedPdfFile.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Upload PI document in PDF format</p>
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
                  {paginatedPis.map((pi) => {
                    const statusBadge = getPiStatusBadge(pi.status);

                    return (
                      <div key={pi.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{pi.piNumber}</p>
                              {pi.version > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  <History className="h-3 w-3 mr-1" />
                                  v{pi.version}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {pi.orderNumber} - {pi.customerName}
                            </p>
                            {pi.createdByName && (
                              <p className="text-xs text-blue-600 mt-1">
                                Handled by: {pi.createdByName}
                              </p>
                            )}
                            {pi.pdfUrl && (
                              <a 
                                href={pi.pdfUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                              >
                                <Download className="h-3 w-3" />
                                Download PDF
                              </a>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant={statusBadge.variant} className="capitalize">
                              {statusBadge.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditPI(pi)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {PI_STATUS_OPTIONS.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handleStatusChange(pi.id, option.value, 'pi')}
                                        disabled={pi.status === option.value}
                                      >
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-sm text-gray-500">
                      Page {piPage + 1} of {piTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPiPage((prev) => Math.max(prev - 1, 0))}
                        disabled={piPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPiPage((prev) =>
                            Math.min(prev + 1, piTotalPages - 1)
                          )
                        }
                        disabled={piPage >= piTotalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
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
                  {paginatedLcs.map((lc) => {
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
                          <div className="flex items-start gap-2">
                            <Badge variant={statusBadge.variant} className="capitalize">
                              {statusBadge.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditLC(lc)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {LC_STATUS_OPTIONS.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handleStatusChange(lc.id, option.value, 'lc')}
                                        disabled={lc.status === option.value}
                                      >
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-sm text-gray-500">
                      Page {lcPage + 1} of {lcTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLcPage((prev) => Math.max(prev - 1, 0))}
                        disabled={lcPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLcPage((prev) =>
                            Math.min(prev + 1, lcTotalPages - 1)
                          )
                        }
                        disabled={lcPage >= lcTotalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={editPiDialogOpen}
          onOpenChange={(open) => {
            setEditPiDialogOpen(open);
            if (!open) {
              setEditingPi(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Proforma Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePI} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_pi_number">PI Number</Label>
                  <Input id="edit_pi_number" value={editingPi?.piNumber ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_pi_order">Customer / Order *</Label>
                  <Select
                    value={editPiFormData.orderId}
                    onValueChange={(value) =>
                      setEditPiFormData({ ...editPiFormData, orderId: value })
                    }
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
                  <Label htmlFor="edit_pi_amount">Amount *</Label>
                  <Input
                    id="edit_pi_amount"
                    type="number"
                    step="0.01"
                    required
                    value={editPiFormData.amount}
                    onChange={(e) =>
                      setEditPiFormData({ ...editPiFormData, amount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_pi_currency">Currency</Label>
                  <Select
                    value={editPiFormData.currency}
                    onValueChange={(value) =>
                      setEditPiFormData({ ...editPiFormData, currency: value })
                    }
                  >
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
                  <Label htmlFor="edit_pi_issueDate">Issue Date</Label>
                  <Input
                    id="edit_pi_issueDate"
                    type="date"
                    value={editPiFormData.issueDate}
                    onChange={(e) =>
                      setEditPiFormData({ ...editPiFormData, issueDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditPiDialogOpen(false);
                    setEditingPi(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={piSubmitting || !editPiFormData.orderId || !editPiFormData.amount}
                >
                  {piSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editLcDialogOpen}
          onOpenChange={(open) => {
            setEditLcDialogOpen(open);
            if (!open) {
              setEditingLc(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Letter of Credit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateLC} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_lc_number">LC Number</Label>
                  <Input id="edit_lc_number" value={editingLc?.lcNumber ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_lc_order">Customer / Order *</Label>
                  <Select
                    value={editLcFormData.orderId}
                    onValueChange={(value) =>
                      setEditLcFormData({ ...editLcFormData, orderId: value })
                    }
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
                  <Label htmlFor="edit_lc_amount">Amount *</Label>
                  <Input
                    id="edit_lc_amount"
                    type="number"
                    step="0.01"
                    required
                    value={editLcFormData.amount}
                    onChange={(e) =>
                      setEditLcFormData({ ...editLcFormData, amount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_lc_currency">Currency</Label>
                  <Select
                    value={editLcFormData.currency}
                    onValueChange={(value) =>
                      setEditLcFormData({ ...editLcFormData, currency: value })
                    }
                  >
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
                  <Label htmlFor="edit_lc_issueDate">Issue Date *</Label>
                  <Input
                    id="edit_lc_issueDate"
                    type="date"
                    required
                    value={editLcFormData.issueDate}
                    onChange={(e) =>
                      setEditLcFormData({ ...editLcFormData, issueDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_lc_expiryDate">Expiry Date *</Label>
                  <Input
                    id="edit_lc_expiryDate"
                    type="date"
                    required
                    value={editLcFormData.expiryDate}
                    onChange={(e) =>
                      setEditLcFormData({ ...editLcFormData, expiryDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_lc_issuingBank">Issuing Bank</Label>
                  <Input
                    id="edit_lc_issuingBank"
                    value={editLcFormData.issuingBank}
                    onChange={(e) =>
                      setEditLcFormData({ ...editLcFormData, issuingBank: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditLcDialogOpen(false);
                    setEditingLc(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    lcSubmitting ||
                    !editLcFormData.orderId ||
                    !editLcFormData.amount ||
                    !editLcFormData.issueDate ||
                    !editLcFormData.expiryDate
                  }
                >
                  {lcSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
