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

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  buyerName?: string;
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
    qualityTest?: string;
    bulkSwatch?: string;
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateFormData, setDateFormData] = useState({ etd: '', eta: '' });
  const [stageSelection, setStageSelection] = useState<string>('Design');
  const [downloadingPO, setDownloadingPO] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();
    fetchDocuments();
  }, [isAuthenticated, router, params.id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${params.id}/`);
      setOrder(response.data);
      if (response.data?.currentStage) {
        setStageSelection(response.data.currentStage);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/orders/${params.id}/documents/`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
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
      const response = await api.get(`/orders/${order.id}/download-po/`, {
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

  const handleConfirmStageChange = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const resp = await api.post(`/orders/${order.id}/change-stage/`, { stage: stageSelection });
      toast({
        title: 'Stage Updated',
        description: `Stage changed to ${resp.data.currentStage}`,
      });
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to change stage:', error);
      const msg = error.response?.data?.stage?.[0] || error.response?.data?.message || 'Failed to change stage';
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
    const statuses = [
      order.approvalStatus.labDip,
      order.approvalStatus.strikeOff,
      order.approvalStatus.qualityTest,
      order.approvalStatus.bulkSwatch,
    ];
    return statuses.filter(s => s === 'approved').length;
  };

  const allParallelApproved = () => {
    if (!order?.approvalStatus) return false;
    return (
      order.approvalStatus.labDip === 'approved' &&
      order.approvalStatus.strikeOff === 'approved' &&
      order.approvalStatus.qualityTest === 'approved' &&
      order.approvalStatus.bulkSwatch === 'approved'
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

        {/* Current Stage Badge */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Current Stage: {order.currentStage}
          </Badge>
          <Badge className={`text-lg px-4 py-2 ${getCategoryBadgeClass(order.category)}`}>
            {order.category}
          </Badge>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Order Info</TabsTrigger>
            <TabsTrigger value="approval">Approval Gate</TabsTrigger>
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
                        {order.currentStage || '—'}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2 mt-3">Set Stage</p>
                      <div className="flex items-center gap-2">
                        <Select value={stageSelection} onValueChange={setStageSelection}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Greige">Greige</SelectItem>
                            <SelectItem value="Let Me Know">Let Me Know</SelectItem>
                            <SelectItem value="In Development">In Development</SelectItem>
                            <SelectItem value="Production">Production</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleConfirmStageChange} disabled={updating}>
                          {updating ? 'Updating...' : 'Confirm'}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Changing to Delivered will auto-archive and set Actual Delivery Date.</p>
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

          {/* Approval Gate Tab */}
          <TabsContent value="approval">
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
                {(['labDip', 'strikeOff', 'qualityTest', 'bulkSwatch'] as const).map((type) => (
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
