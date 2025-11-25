'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Package, FileText, Printer, Download, Calendar, Edit2 } from 'lucide-react';
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
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateFormData, setDateFormData] = useState({ etd: '', eta: '' });
  const [statusSelection, setStatusSelection] = useState<string>('upcoming');
  const [downloadingPO, setDownloadingPO] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [assigningTask, setAssigningTask] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();
    fetchDocuments();
    fetchUsers();
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

  const handleOpenDateDialog = () => {
    setDateFormData({
      etd: order?.etd || '',
      eta: order?.eta || '',
    });
    setDateDialogOpen(true);
  };

  const handleUpdateDates = async () => {
    if (!order) return;
    
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/`, {
        etd: dateFormData.etd || null,
        eta: dateFormData.eta || null,
      });

      toast({
        title: 'Success',
        description: 'Delivery dates updated successfully',
      });

      setDateDialogOpen(false);
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update dates:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update dates',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
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
          <TabsList className={`grid w-full ${order.status === 'bulk' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <TabsTrigger value="info">Order Info</TabsTrigger>
            {order.status !== 'bulk' && (
              <TabsTrigger value="approval">Approval Gate</TabsTrigger>
            )}
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-2">
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
                    {/* Status and Category are omitted per UX: show Stage only */}
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Stage</p>
                      <div className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {getStatusDisplayName(order.status)}
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

                {/* Styles and Colors Section */}
                {order.styles && order.styles.length > 0 && (
                  <Card className="border-l-4 border-l-indigo-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-600" />
                        Styles & Color Variants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {order.styles.map((style, styleIndex) => (
                          <div key={style.id} className="border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50">
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

                            {/* Style Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 bg-white rounded border">
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
                              {style.etd && (
                                <div>
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    ETD
                                  </p>
                                  <p className="text-sm font-medium text-blue-600">{formatDate(style.etd)}</p>
                                </div>
                              )}
                              {style.eta && (
                                <div>
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    ETA
                                  </p>
                                  <p className="text-sm font-medium text-green-600">{formatDate(style.eta)}</p>
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

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Dates & Delivery</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleOpenDateDialog}>
                      <Edit2 className="mr-2 h-3 w-3" />
                      Edit Dates
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.orderDate && (
                      <div>
                        <p className="text-sm text-gray-500">Order Date</p>
                        <p className="font-medium">{formatDate(order.orderDate)}</p>
                      </div>
                    )}
                    {order.etd && (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          ETD (Estimated Time of Dispatch)
                        </p>
                        <p className="font-medium text-blue-600">{formatDate(order.etd)}</p>
                      </div>
                    )}
                    {order.eta && (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          ETA (Estimated Time of Arrival)
                        </p>
                        <p className="font-medium text-green-600">{formatDate(order.eta)}</p>
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
                    {!order.etd && !order.eta && !order.orderDate && !order.expectedDeliveryDate && !order.actualDeliveryDate && (
                      <p className="text-sm text-gray-400 text-center py-4">No dates recorded yet</p>
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

        {/* ETD/ETA Edit Dialog */}
        <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Delivery Dates</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="etd">ETD (Estimated Time of Dispatch)</Label>
                <Input
                  id="etd"
                  type="date"
                  value={dateFormData.etd}
                  onChange={(e) => setDateFormData({ ...dateFormData, etd: e.target.value })}
                />
                <p className="text-xs text-gray-500">When the order is expected to leave the mill</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eta">ETA (Estimated Time of Arrival)</Label>
                <Input
                  id="eta"
                  type="date"
                  value={dateFormData.eta}
                  onChange={(e) => setDateFormData({ ...dateFormData, eta: e.target.value })}
                />
                <p className="text-xs text-gray-500">When the order is expected to arrive at destination</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateDates} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Dates'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </DashboardLayout>
  );
}
