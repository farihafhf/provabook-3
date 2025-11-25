'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Package, FileText, Printer, Download, Calendar, Edit2, Truck, Plus, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, downloadBlob } from '@/lib/utils';
import { FileUpload } from '@/components/file-upload';
import { DocumentList } from '@/components/document-list';
import { PrintableOrder } from '@/components/printable-order';
import { OrderTimeline, type TimelineEvent } from '@/components/orders/order-timeline';

interface OrderColor {
  id: string;
  colorCode: string;
  quantity: number;
  unit: string;
  millName?: string;
  millPrice?: number;
  provaPrice?: number;
  currency?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
  notes?: string;
}

interface OrderStyle {
  id: string;
  styleNumber: string;
  description?: string;
  fabricType?: string;
  fabricComposition?: string;
  gsm?: number;
  finishType?: string;
  construction?: string;
  cuttableWidth?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  notes?: string;
  colors: OrderColor[];
  createdAt: string;
  updatedAt: string;
}

interface SupplierDelivery {
  id: string;
  order: string;
  orderNumber?: string;
  deliveryDate: string;
  deliveredQuantity: number;
  unit: string;
  notes?: string;
  createdBy?: string;
  createdByDetails?: any;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  buyerName?: string;
  baseStyleNumber?: string;
  styleNumber?: string;
  fabricType: string;
  fabricSpecifications?: string;
  fabricComposition?: string;
  gsm?: number;
  finishType?: string;
  construction?: string;
  millName?: string;
  millPrice?: number;
  provaPrice?: number;
  currency?: string;
  quantity: number;
  unit: string;
  colorQuantityBreakdown?: Array<{ color: string; quantity: number }>;
  etd?: string;
  eta?: string;
  status: string;
  category: string;
  currentStage: string;
  timelineEvents?: TimelineEvent[];
  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  approvalStatus?: {
    labDip?: string;
    strikeOff?: string;
    aop?: string;
    qualityTest?: string;
    quality?: string;
    bulkSwatch?: string;
    price?: string;
    ppSample?: string;
  };
  styles?: OrderStyle[];
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const [statusSelection, setStatusSelection] = useState<string>('upcoming');
  const [downloadingPO, setDownloadingPO] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [assigningTask, setAssigningTask] = useState(false);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleDates, setStyleDates] = useState<{[key: string]: {etd: string; eta: string; submissionDate: string}}>({});
  
  // Supplier Deliveries state
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<SupplierDelivery | null>(null);
  const [deliveryFormData, setDeliveryFormData] = useState({
    deliveryDate: '',
    deliveredQuantity: '',
    notes: ''
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();
    fetchDocuments();
    fetchUsers();
    fetchDeliveries();
  }, [isAuthenticated, router, params.id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${params.id}`);
      setOrder(response.data);
      if (response.data?.status) {
        setStatusSelection(response.data.status);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/orders/${params.id}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      const data = response.data as any;
      const usersArray = Array.isArray(data) ? data : data?.results || [];
      setUsers(usersArray);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchDeliveries = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/orders/supplier-deliveries/?order=${params.id}&_t=${timestamp}`);
      console.log('Fetched deliveries:', response.data);
      setDeliveries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    }
  };

  const handleAddDelivery = () => {
    setEditingDelivery(null);
    setDeliveryFormData({
      deliveryDate: order?.etd || new Date().toISOString().split('T')[0],
      deliveredQuantity: '',
      notes: ''
    });
    setShowDeliveryDialog(true);
  };

  const handleEditDelivery = (delivery: SupplierDelivery) => {
    setEditingDelivery(delivery);
    setDeliveryFormData({
      deliveryDate: delivery.deliveryDate,
      deliveredQuantity: delivery.deliveredQuantity.toString(),
      notes: delivery.notes || ''
    });
    setShowDeliveryDialog(true);
  };

  const handleSaveDelivery = async () => {
    if (!deliveryFormData.deliveryDate || !deliveryFormData.deliveredQuantity) {
      toast({
        title: 'Error',
        description: 'Please fill in delivery date and quantity',
        variant: 'destructive',
      });
      return;
    }

    setSavingDelivery(true);
    try {
      const payload = {
        order: order?.id,
        deliveryDate: deliveryFormData.deliveryDate,
        deliveredQuantity: parseFloat(deliveryFormData.deliveredQuantity),
        unit: order?.unit || 'meters',
        notes: deliveryFormData.notes || undefined
      };

      if (editingDelivery) {
        const response = await api.patch(`/orders/supplier-deliveries/${editingDelivery.id}/`, payload);
        console.log('Delivery updated response:', response.data);
        toast({
          title: 'Success',
          description: 'Delivery updated successfully',
        });
      } else {
        const response = await api.post('/orders/supplier-deliveries/', payload);
        console.log('Delivery created response:', response.data);
        toast({
          title: 'Success',
          description: 'Delivery recorded successfully',
        });
      }

      setShowDeliveryDialog(false);
      console.log('Fetching deliveries after save...');
      await fetchDeliveries();
      console.log('Deliveries fetched, current state:', deliveries);
    } catch (error: any) {
      console.error('Failed to save delivery:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save delivery',
        variant: 'destructive',
      });
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!confirm('Are you sure you want to delete this delivery record?')) {
      return;
    }

    try {
      await api.delete(`/orders/supplier-deliveries/${deliveryId}/`);
      toast({
        title: 'Success',
        description: 'Delivery deleted successfully',
      });
      await fetchDeliveries();
    } catch (error: any) {
      console.error('Failed to delete delivery:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete delivery',
        variant: 'destructive',
      });
    }
  };

  const getTotalDeliveredQuantity = () => {
    return deliveries.reduce((sum, d) => sum + d.deliveredQuantity, 0);
  };

  const getRemainingQuantity = () => {
    if (!order) return 0;
    return order.quantity - getTotalDeliveredQuantity();
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim() || !selectedUser) {
      toast({
        title: 'Error',
        description: 'Please enter task title and select a user',
        variant: 'destructive',
      });
      return;
    }

    setAssigningTask(true);
    try {
      await api.post('/orders/tasks', {
        order: order?.id,
        title: taskTitle,
        assignedTo: selectedUser,
        priority: 'medium',
      });

      toast({
        title: 'Success',
        description: 'Task assigned successfully',
      });

      setTaskTitle('');
      setSelectedUser('');
    } catch (error: any) {
      console.error('Error assigning task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign task',
        variant: 'destructive',
      });
    } finally {
      setAssigningTask(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await api.delete(`/orders/documents/${documentId}/`);
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  };

  const handleApprovalChange = async (approvalType: string, newStatus: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/approvals/`, {
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
      await api.patch(`/orders/${order.id}/approvals/`, {
        approvalType: 'ppSample',
        status: 'approved',
      });

      await api.post(`/orders/${order.id}/change-stage/`, {
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
      await api.post(`/orders/${order.id}/change-stage/`, {
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPO = async () => {
    if (!order) return;

    setDownloadingPO(true);
    try {
      const response = await api.get(`/orders/${order.id}/download-po`, {
        responseType: 'blob',
      });

      const disposition =
        response.headers['content-disposition'] || response.headers['Content-Disposition'];
      let filename = `PO-${order.orderNumber}.pdf`;

      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      downloadBlob(response.data, filename);

      toast({
        title: 'PO Downloaded',
        description: 'The purchase order PDF has been downloaded.',
      });
    } catch (error: any) {
      console.error('Failed to download PO:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to download PO',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPO(false);
    }
  };

  const handleEditStyleDates = (styleId: string, etd: string, eta: string, submissionDate: string) => {
    setEditingStyleId(styleId);
    setStyleDates(prev => ({
      ...prev,
      [styleId]: { etd, eta, submissionDate }
    }));
  };

  const handleSaveStyleDates = async (styleId: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      const dates = styleDates[styleId];
      await api.patch(`/orders/styles/${styleId}/`, {
        etd: dates.etd || null,
        eta: dates.eta || null,
        submissionDate: dates.submissionDate || null,
      });

      toast({
        title: 'Success',
        description: 'Style dates updated successfully',
      });

      setEditingStyleId(null);
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update style dates:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update dates',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEditDates = () => {
    setEditingStyleId(null);
    setStyleDates({});
  };

  const handleConfirmStatusChange = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const resp = await api.patch(`/orders/${order.id}/`, { status: statusSelection });
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${getStatusDisplayName(resp.data.status)}`,
      });
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to change status:', error);
      const msg = error.response?.data?.status?.[0] || error.response?.data?.message || 'Failed to change status';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatApprovalName = (type: string): string => {
    const names: Record<string, string> = {
      labDip: 'Lab Dip',
      strikeOff: 'Strike-Off',
      qualityTest: 'Quality Test',
      bulkSwatch: 'Bulk Swatch',
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
    const isRunning = order.status === 'running';
    
    if (isRunning) {
      // Running Order: Lab Dip, AOP/Strike Off, PP Sample
      const statuses = [
        order.approvalStatus.labDip,
        order.approvalStatus.aop || order.approvalStatus.strikeOff,
        order.approvalStatus.ppSample,
      ];
      return statuses.filter(s => s === 'approved').length;
    } else {
      // Upcoming/In Development: Quality, Price
      const statuses = [
        order.approvalStatus.quality || order.approvalStatus.qualityTest,
        order.approvalStatus.price || order.approvalStatus.bulkSwatch,
      ];
      return statuses.filter(s => s === 'approved').length;
    }
  };

  const getTotalApprovals = () => {
    const isRunning = order?.status === 'running';
    return isRunning ? 3 : 2; // Running: 3 approvals, Upcoming/In Dev: 2 approvals
  };

  const allRunningApproved = () => {
    if (!order?.approvalStatus) return false;
    const aopApproved = order.approvalStatus.aop === 'approved' || order.approvalStatus.strikeOff === 'approved';
    return (
      order.approvalStatus.labDip === 'approved' &&
      aopApproved &&
      order.approvalStatus.ppSample === 'approved'
    );
  };

  const allEarlyApproved = () => {
    if (!order?.approvalStatus) return false;
    const qualityApproved = order.approvalStatus.quality === 'approved' || order.approvalStatus.qualityTest === 'approved';
    const priceApproved = order.approvalStatus.price === 'approved' || order.approvalStatus.bulkSwatch === 'approved';
    return qualityApproved && priceApproved;
  };

  const getStatusBadgeClass = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'upcoming') {
      return 'bg-gradient-to-r from-amber-400 to-orange-400 text-white border-2 border-amber-500 shadow-lg';
    } else if (lowerStatus === 'in_development') {
      return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-2 border-blue-600 shadow-lg';
    } else if (lowerStatus === 'running') {
      return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-2 border-emerald-600 shadow-lg';
    } else if (lowerStatus === 'bulk') {
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-600 shadow-lg';
    } else if (lowerStatus === 'completed') {
      return 'bg-gradient-to-r from-slate-600 to-gray-700 text-white border-2 border-slate-700 shadow-lg';
    } else if (lowerStatus === 'archived') {
      return 'bg-gradient-to-r from-gray-400 to-slate-400 text-white border-2 border-gray-500 shadow-lg';
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
            <Button
              variant="outline"
              onClick={() => router.push(`/orders/${order.id}/edit`)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Order
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPO}
              disabled={downloadingPO}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadingPO ? 'Downloading...' : 'Download PO'}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Order
            </Button>
            {(order.currentStage === 'In Development' || order.currentStage === 'Production') && (
              <Button onClick={handleMarkDelivered} disabled={updating}>
                <Package className="mr-2 h-4 w-4" />
                {updating ? 'Processing...' : 'Mark Delivered'}
              </Button>
            )}
          </div>
        </div>

        {/* Single Prominent Status Badge */}
        <div className="flex items-center gap-3">
          <Badge className={`text-2xl font-bold px-6 py-3 ${getStatusBadgeClass(order.status)}`}>
            {getStatusDisplayName(order.status)}
          </Badge>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${order.status === 'bulk' ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <TabsTrigger value="info">Order Info</TabsTrigger>
            {order.status !== 'bulk' && (
              <TabsTrigger value="approval">Approval Gate</TabsTrigger>
            )}
            <TabsTrigger value="deliveries">
              <Truck className="h-4 w-4 mr-2" />
              ETD & Deliveries ({deliveries.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Order Number</p>
                        <p className="font-medium">{order.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Customer Name</p>
                        <p className="font-medium">{order.customerName}</p>
                      </div>
                      {order.buyerName && (
                        <div>
                          <p className="text-xs text-gray-500">Buyer Name</p>
                          <p className="font-medium">{order.buyerName}</p>
                        </div>
                      )}
                      {order.orderDate && (
                        <div>
                          <p className="text-xs text-gray-500">Order Date</p>
                          <p className="font-medium">{formatDate(order.orderDate)}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Stage</p>
                        <div className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {getStatusDisplayName(order.status)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Set Status Card */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle>Set Order Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Select value={statusSelection} onValueChange={setStatusSelection}>
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="in_development">In Development</SelectItem>
                            <SelectItem value="running">Running Order</SelectItem>
                            <SelectItem value="bulk">Bulk</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleConfirmStatusChange} disabled={updating}>
                          {updating ? 'Updating...' : 'Confirm Status'}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Status can be manually set or automatically updated when all approvals are completed.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Assign Task Card */}
                <Card className="border-l-4 border-l-purple-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="flex items-center gap-2">
                      <span>Assign Task to Team Member</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title" className="text-sm font-medium">
                          Task Title *
                        </Label>
                        <Input
                          id="task-title"
                          placeholder="e.g., Review fabric specifications, Check pricing..."
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assign-user" className="text-sm font-medium">
                          Assign To *
                        </Label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                          <SelectTrigger id="assign-user" className="w-full">
                            <SelectValue placeholder="Select team member to assign task" />
                          </SelectTrigger>
                          <SelectContent>
                            {users && Array.isArray(users) && users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{user.fullName}</span>
                                  <span className="text-xs text-gray-500">({user.role})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-blue-600 text-sm">ℹ️</span>
                        <p className="text-xs text-blue-700">
                          The assigned team member will receive an instant notification and can view this task on their dashboard.
                        </p>
                      </div>
                      <Button 
                        onClick={handleAssignTask} 
                        disabled={assigningTask || !taskTitle.trim() || !selectedUser}
                        className="w-full"
                        size="lg"
                      >
                        {assigningTask ? 'Assigning Task...' : 'Assign Task'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Fabric Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Fabric Type</p>
                        <p className="font-medium">{order.fabricType}</p>
                      </div>
                      {order.fabricSpecifications && (
                        <div>
                          <p className="text-xs text-gray-500">Specifications</p>
                          <p className="font-medium">{order.fabricSpecifications}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Total Quantity</p>
                        <p className="font-medium">{order.quantity.toLocaleString()} {order.unit}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Styles and Colors Section */}
                {order.styles && order.styles.length > 0 && (
                  <Card className="border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5 text-indigo-600" />
                        Styles & Color Variants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {order.styles.map((style, styleIndex) => (
                          <div key={style.id} className="border rounded-lg p-3 bg-gradient-to-br from-white to-gray-50">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-indigo-900">
                                  {style.styleNumber}
                                </h3>
                                {style.description && (
                                  <p className="text-sm text-gray-600 mt-1">{style.description}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="bg-indigo-50">
                                Style {styleIndex + 1}
                              </Badge>
                            </div>

                            {/* Style Details Grid - More Compact */}
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3 p-2 bg-white rounded border text-sm">
                              {style.fabricType && (
                                <div>
                                  <p className="text-xs text-gray-500">Fabric Type</p>
                                  <p className="text-sm font-medium">{style.fabricType}</p>
                                </div>
                              )}
                              {style.fabricComposition && (
                                <div>
                                  <p className="text-xs text-gray-500">Composition</p>
                                  <p className="text-sm font-medium">{style.fabricComposition}</p>
                                </div>
                              )}
                              {style.gsm && (
                                <div>
                                  <p className="text-xs text-gray-500">GSM</p>
                                  <p className="text-sm font-medium">{style.gsm}</p>
                                </div>
                              )}
                              {style.cuttableWidth && (
                                <div>
                                  <p className="text-xs text-gray-500">Cuttable Width</p>
                                  <p className="text-sm font-medium">{style.cuttableWidth}</p>
                                </div>
                              )}
                              {style.construction && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500">Construction</p>
                                  <p className="text-sm font-medium">{style.construction}</p>
                                </div>
                              )}
                            </div>

                            {/* Editable Style Dates */}
                            <div className="border-t pt-2 mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-semibold flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Delivery Dates
                                </Label>
                                {editingStyleId !== style.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditStyleDates(style.id, style.etd || '', style.eta || '', style.submissionDate || '')}
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                              </div>
                              {editingStyleId === style.id ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs">ETD</Label>
                                      <Input
                                        type="date"
                                        className="h-8 text-xs"
                                        value={styleDates[style.id]?.etd || ''}
                                        onChange={(e) => setStyleDates(prev => ({
                                          ...prev,
                                          [style.id]: { ...prev[style.id], etd: e.target.value }
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">ETA</Label>
                                      <Input
                                        type="date"
                                        className="h-8 text-xs"
                                        value={styleDates[style.id]?.eta || ''}
                                        onChange={(e) => setStyleDates(prev => ({
                                          ...prev,
                                          [style.id]: { ...prev[style.id], eta: e.target.value }
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Submission</Label>
                                      <Input
                                        type="date"
                                        className="h-8 text-xs"
                                        value={styleDates[style.id]?.submissionDate || ''}
                                        onChange={(e) => setStyleDates(prev => ({
                                          ...prev,
                                          [style.id]: { ...prev[style.id], submissionDate: e.target.value }
                                        }))}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={handleCancelEditDates}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={() => handleSaveStyleDates(style.id)} disabled={updating}>
                                      {updating ? 'Saving...' : 'Save'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <p className="text-gray-500">ETD</p>
                                    <p className="font-medium text-blue-600">{style.etd ? formatDate(style.etd) : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">ETA</p>
                                    <p className="font-medium text-green-600">{style.eta ? formatDate(style.eta) : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Submission</p>
                                    <p className="font-medium text-gray-700">{style.submissionDate ? formatDate(style.submissionDate) : '-'}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Colors Table */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Color Variants ({style.colors.length})</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                      <th className="text-left p-2 font-medium">Color Code</th>
                                      <th className="text-right p-2 font-medium">Quantity</th>
                                      <th className="text-right p-2 font-medium">Mill Price</th>
                                      <th className="text-right p-2 font-medium">Prova Price</th>
                                      <th className="text-center p-2 font-medium">ETD</th>
                                      <th className="text-center p-2 font-medium">ETA</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {style.colors.map((color) => (
                                      <tr key={color.id} className="hover:bg-gray-50">
                                        <td className="p-2">
                                          <Badge variant="secondary" className="font-mono">
                                            {color.colorCode}
                                          </Badge>
                                        </td>
                                        <td className="p-2 text-right font-medium">
                                          {color.quantity.toLocaleString()} {color.unit}
                                        </td>
                                        <td className="p-2 text-right">
                                          {color.millPrice ? `${color.currency || 'USD'} ${color.millPrice.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-2 text-right text-green-700 font-medium">
                                          {color.provaPrice ? `${color.currency || 'USD'} ${color.provaPrice.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-2 text-center text-xs">
                                          {color.etd ? formatDate(color.etd) : '-'}
                                        </td>
                                        <td className="p-2 text-center text-xs">
                                          {color.eta ? formatDate(color.eta) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-indigo-50 font-semibold">
                                    <tr>
                                      <td className="p-2">Total</td>
                                      <td className="p-2 text-right">
                                        {style.colors.reduce((sum, c) => sum + c.quantity, 0).toLocaleString()} {style.colors[0]?.unit || ''}
                                      </td>
                                      <td colSpan={4}></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {style.notes && (
                              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                <p className="text-xs text-yellow-700 font-medium mb-1">Notes:</p>
                                <p className="text-yellow-900">{style.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}


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

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Tracking Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OrderTimeline events={order.timelineEvents ?? []} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Approval Gate Tab - Hidden for Bulk status */}
          {order.status !== 'bulk' && (
          <TabsContent value="approval">
            <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Approval Gate</CardTitle>
              <div className="text-sm font-medium">
                Progress: <span className="text-blue-600 text-lg">{getApprovedCount()} / {getTotalApprovals()}</span> Approved
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {order.status === 'running' 
                ? 'Running Order approvals: Lab Dip, Strike Off/AOP, PP Sample' 
                : 'Early stage approvals: Quality, Price'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Dynamic Approvals based on Order Status */}
              {order.status === 'running' ? (
                <>
                  {/* Running Order Approvals: Lab Dip, AOP/Strike Off, PP Sample */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getApprovalIcon(order.approvalStatus?.labDip || 'pending')}
                          <span className="font-medium">Lab Dip</span>
                        </div>
                      </div>
                      <Select
                        value={order.approvalStatus?.labDip || 'pending'}
                        onValueChange={(value) => handleApprovalChange('labDip', value)}
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

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getApprovalIcon(order.approvalStatus?.aop || order.approvalStatus?.strikeOff || 'pending')}
                          <span className="font-medium">Strike Off / AOP</span>
                        </div>
                      </div>
                      <Select
                        value={order.approvalStatus?.aop || order.approvalStatus?.strikeOff || 'pending'}
                        onValueChange={(value) => handleApprovalChange('aop', value)}
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

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getApprovalIcon(order.approvalStatus?.ppSample || 'pending')}
                          <span className="font-medium">PP Sample</span>
                        </div>
                      </div>
                      <Select
                        value={order.approvalStatus?.ppSample || 'pending'}
                        onValueChange={(value) => handleApprovalChange('ppSample', value)}
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
                  </div>

                  {/* Auto-advance to Bulk notice */}
                  {allRunningApproved() && (
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                      <p className="text-sm text-purple-800 font-medium">
                        ✨ All running approvals completed! Order will auto-advance to <strong>Bulk</strong> status on next approval update.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Upcoming/In Development Approvals: Quality, Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getApprovalIcon(order.approvalStatus?.quality || order.approvalStatus?.qualityTest || 'pending')}
                          <span className="font-medium">Quality</span>
                        </div>
                      </div>
                      <Select
                        value={order.approvalStatus?.quality || order.approvalStatus?.qualityTest || 'pending'}
                        onValueChange={(value) => handleApprovalChange('quality', value)}
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

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getApprovalIcon(order.approvalStatus?.price || order.approvalStatus?.bulkSwatch || 'pending')}
                          <span className="font-medium">Price</span>
                        </div>
                      </div>
                      <Select
                        value={order.approvalStatus?.price || order.approvalStatus?.bulkSwatch || 'pending'}
                        onValueChange={(value) => handleApprovalChange('price', value)}
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
                  </div>

                  {/* Auto-advance to Running notice */}
                  {allEarlyApproved() && (
                    <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                      <p className="text-sm text-green-800 font-medium">
                        ✨ All early approvals completed! Order will auto-advance to <strong>Running Order</strong> status on next approval update.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>
          )}

          {/* ETD & Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-600" />
                    Supplier Delivery Records
                  </CardTitle>
                  <Button onClick={handleAddDelivery} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Delivery
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-600 mb-1">Total Ordered</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {order.quantity.toLocaleString()} {order.unit}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-600 mb-1">Total Delivered</div>
                      <div className="text-2xl font-bold text-green-700">
                        {getTotalDeliveredQuantity().toLocaleString()} {order.unit}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-600 mb-1">Remaining</div>
                      <div className="text-2xl font-bold text-orange-700">
                        {getRemainingQuantity().toLocaleString()} {order.unit}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Deliveries Table */}
                {deliveries.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No delivery records yet</p>
                    <p className="text-sm text-gray-400 mb-4">Click "Record Delivery" to add your first delivery entry</p>
                    <Button onClick={handleAddDelivery} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Delivery
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Quantity</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Notes</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Created By</th>
                          <th className="text-right p-3 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((delivery) => (
                          <tr key={delivery.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDate(delivery.deliveryDate)}
                              </div>
                            </td>
                            <td className="p-3 text-sm font-medium">
                              {delivery.deliveredQuantity.toLocaleString()} {delivery.unit}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {delivery.notes || <span className="text-gray-400 italic">No notes</span>}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {delivery.createdByName || 'Unknown'}
                            </td>
                            <td className="p-3 text-sm text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDelivery(delivery)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDelivery(delivery.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Document</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  orderId={order.id} 
                  onUploadComplete={fetchDocuments}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentList 
                  documents={documents}
                  onDelete={handleDeleteDocument}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Hidden Printable Order (only visible when printing) */}
        <PrintableOrder 
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            buyerName: order.buyerName,
            styleNumber: order.styleNumber,
            fabricType: order.fabricType,
            fabricSpecifications: order.fabricSpecifications,
            fabricComposition: order.fabricComposition,
            gsm: order.gsm,
            finishType: order.finishType,
            construction: order.construction,
            millName: order.millName,
            millPrice: order.millPrice,
            provaPrice: order.provaPrice,
            currency: order.currency,
            quantity: order.quantity,
            unit: order.unit,
            colorQuantityBreakdown: order.colorQuantityBreakdown,
            etd: order.etd,
            eta: order.eta,
            status: order.status,
            category: order.category,
            currentStage: order.currentStage,
            orderDate: order.orderDate,
            expectedDeliveryDate: order.expectedDeliveryDate,
            actualDeliveryDate: order.actualDeliveryDate,
            notes: order.notes,
            merchandiser: undefined,
          }}
        />

        {/* Delivery Dialog */}
        <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingDelivery ? 'Edit Delivery Record' : 'Record Supplier Delivery'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-date">Delivery Date *</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryFormData.deliveryDate}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivered-quantity">Delivered Quantity *</Label>
                <div className="flex gap-2">
                  <Input
                    id="delivered-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFormData.deliveredQuantity}
                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveredQuantity: e.target.value })}
                    placeholder="Enter quantity"
                    className="flex-1"
                    required
                  />
                  <div className="flex items-center px-3 bg-gray-100 border rounded-md text-sm text-gray-600">
                    {order?.unit || 'meters'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-notes">Notes (Optional)</Label>
                <Textarea
                  id="delivery-notes"
                  value={deliveryFormData.notes}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, notes: e.target.value })}
                  placeholder="Add any additional notes about this delivery..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeliveryDialog(false)}
                disabled={savingDelivery}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveDelivery} disabled={savingDelivery}>
                {savingDelivery ? 'Saving...' : editingDelivery ? 'Update Delivery' : 'Save Delivery'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
