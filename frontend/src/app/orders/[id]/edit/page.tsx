'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';

// Local order specific fields interface
interface LocalOrderFormData {
  yarnRequired: string;
  yarnBookedDate: string;
  yarnReceivedDate: string;
  ppYards: string;
  fitCumPpSubmitDate: string;
  fitCumPpCommentsDate: string;
  knittingStartDate: string;
  knittingCompleteDate: string;
  dyeingStartDate: string;
  dyeingCompleteDate: string;
  bulkSizeSetDate: string;
  cuttingStartDate: string;
  cuttingCompleteDate: string;
  printSendDate: string;
  printReceivedDate: string;
  sewingInputDate: string;
  sewingFinishDate: string;
  packingCompleteDate: string;
  finalInspectionDate: string;
  exFactoryDate: string;
}

interface OrderLineFormData {
  id?: string;
  styleId?: string;
  styleNumber: string;
  colorCode: string;
  cadName?: string;
  quantity: string;
  unit: string;
  millName?: string;
  millPrice?: string;
  provaPrice?: string;
  currency: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  notes?: string;
  // Optional style-level fields
  description?: string;
  fabricType?: string;
  fabricComposition?: string;
  gsm?: string;
  finishType?: string;
  construction?: string;
  cuttableWidth?: string;
  finishingWidth?: string;
}

export default function OrderEditPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    poNumber: '',
    customerName: '',
    buyerName: '',
    fabricType: '',
    orderDate: '',
    notes: '',
  });
  
  const [orderType, setOrderType] = useState<'foreign' | 'local'>('foreign');
  
  // Local order specific fields
  const [localOrderData, setLocalOrderData] = useState<LocalOrderFormData>({
    yarnRequired: '',
    yarnBookedDate: '',
    yarnReceivedDate: '',
    ppYards: '',
    fitCumPpSubmitDate: '',
    fitCumPpCommentsDate: '',
    knittingStartDate: '',
    knittingCompleteDate: '',
    dyeingStartDate: '',
    dyeingCompleteDate: '',
    bulkSizeSetDate: '',
    cuttingStartDate: '',
    cuttingCompleteDate: '',
    printSendDate: '',
    printReceivedDate: '',
    sewingInputDate: '',
    sewingFinishDate: '',
    packingCompleteDate: '',
    finalInspectionDate: '',
    exFactoryDate: '',
  });
  
  const [orderLines, setOrderLines] = useState<OrderLineFormData[]>([]);

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
      const order = response.data;
      
      // Set basic order data
      setFormData({
        poNumber: order.poNumber || '',
        customerName: order.customerName || '',
        buyerName: order.buyerName || '',
        fabricType: order.fabricType || '',
        orderDate: order.orderDate || '',
        notes: order.notes || '',
      });
      
      // Set order type
      setOrderType(order.orderType || 'foreign');
      
      // Set local order specific fields
      if (order.orderType === 'local') {
        setLocalOrderData({
          yarnRequired: order.yarnRequired ? order.yarnRequired.toString() : '',
          yarnBookedDate: order.yarnBookedDate || '',
          yarnReceivedDate: order.yarnReceivedDate || '',
          ppYards: order.ppYards ? order.ppYards.toString() : '',
          fitCumPpSubmitDate: order.fitCumPpSubmitDate || '',
          fitCumPpCommentsDate: order.fitCumPpCommentsDate || '',
          knittingStartDate: order.knittingStartDate || '',
          knittingCompleteDate: order.knittingCompleteDate || '',
          dyeingStartDate: order.dyeingStartDate || '',
          dyeingCompleteDate: order.dyeingCompleteDate || '',
          bulkSizeSetDate: order.bulkSizeSetDate || '',
          cuttingStartDate: order.cuttingStartDate || '',
          cuttingCompleteDate: order.cuttingCompleteDate || '',
          printSendDate: order.printSendDate || '',
          printReceivedDate: order.printReceivedDate || '',
          sewingInputDate: order.sewingInputDate || '',
          sewingFinishDate: order.sewingFinishDate || '',
          packingCompleteDate: order.packingCompleteDate || '',
          finalInspectionDate: order.finalInspectionDate || '',
          exFactoryDate: order.exFactoryDate || '',
        });
      }

      // Flatten styles and lines into orderLines array
      if (order.styles && order.styles.length > 0) {
        const lines: OrderLineFormData[] = [];
        
        order.styles.forEach((style: any) => {
          const lineItems = style.lines || style.colors || [];
          
          lineItems.forEach((item: any) => {
            lines.push({
              id: item.id,
              styleId: style.id,
              styleNumber: style.styleNumber || '',
              colorCode: item.colorCode || '',
              cadName: item.cadName || '',
              quantity: item.quantity ? item.quantity.toString() : '',
              unit: item.unit || 'meters',
              millName: item.millName || '',
              millPrice: item.millPrice ? item.millPrice.toString() : '',
              provaPrice: item.provaPrice ? item.provaPrice.toString() : '',
              currency: item.currency || 'USD',
              etd: item.etd || '',
              eta: item.eta || '',
              submissionDate: item.submissionDate || '',
              notes: item.notes || '',
              // Style-level fields
              description: style.description || '',
              fabricType: style.fabricType || '',
              fabricComposition: style.fabricComposition || '',
              gsm: style.gsm ? style.gsm.toString() : '',
              finishType: style.finishType || '',
              construction: style.construction || '',
              cuttableWidth: style.cuttableWidth || '',
              finishingWidth: style.finishingWidth || '',
            });
          });
        });
        
        setOrderLines(lines);
      } else {
        // Fallback to single line
        setOrderLines([
          {
            styleNumber: order.styleNumber || '',
            colorCode: '',
            quantity: order.quantity ? order.quantity.toString() : '',
            unit: order.unit || 'meters',
            currency: order.currency || 'USD',
            fabricType: order.fabricType || '',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Group lines by style number
      const styleGroups = new Map<string, typeof orderLines>();
      
      orderLines.forEach(line => {
        const styleKey = `${line.styleNumber}-${line.styleId || ''}`;
        if (!styleGroups.has(styleKey)) {
          styleGroups.set(styleKey, []);
        }
        styleGroups.get(styleKey)!.push(line);
      });

      const orderData: any = {
        poNumber: formData.poNumber || undefined,
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        fabricType: formData.fabricType,
        orderDate: formData.orderDate || undefined,
        notes: formData.notes || undefined,
        quantity: orderLines.reduce(
          (total, line) => total + (parseFloat(line.quantity) || 0),
          0
        ),
        unit: orderLines[0]?.unit || 'meters',
        styles: Array.from(styleGroups.entries()).map(([key, lines]) => {
          const firstLine = lines[0];
          return {
            id: firstLine.styleId,
            styleNumber: firstLine.styleNumber,
            description: firstLine.description || undefined,
            fabricType: firstLine.fabricType || formData.fabricType,
            fabricComposition: firstLine.fabricComposition || undefined,
            gsm: firstLine.gsm ? parseFloat(firstLine.gsm) : undefined,
            finishType: firstLine.finishType || undefined,
            construction: firstLine.construction || undefined,
            cuttableWidth: firstLine.cuttableWidth || undefined,
            finishingWidth: firstLine.finishingWidth || undefined,
            lines: lines.map((line) => ({
              id: line.id,
              colorCode: line.colorCode,
              cadName: line.cadName || undefined,
              quantity: parseFloat(line.quantity),
              unit: line.unit,
              millName: line.millName || undefined,
              millPrice: line.millPrice ? parseFloat(line.millPrice) : undefined,
              provaPrice: line.provaPrice ? parseFloat(line.provaPrice) : undefined,
              currency: line.currency,
              etd: line.etd || undefined,
              eta: line.eta || undefined,
              submissionDate: line.submissionDate || undefined,
              notes: line.notes || undefined,
            })),
          };
        }),
      };
      
      // Add local order specific fields if this is a local order
      if (orderType === 'local') {
        orderData.yarnRequired = localOrderData.yarnRequired ? parseFloat(localOrderData.yarnRequired) : undefined;
        orderData.yarnBookedDate = localOrderData.yarnBookedDate || undefined;
        orderData.yarnReceivedDate = localOrderData.yarnReceivedDate || undefined;
        orderData.ppYards = localOrderData.ppYards ? parseFloat(localOrderData.ppYards) : undefined;
        orderData.fitCumPpSubmitDate = localOrderData.fitCumPpSubmitDate || undefined;
        orderData.fitCumPpCommentsDate = localOrderData.fitCumPpCommentsDate || undefined;
        orderData.knittingStartDate = localOrderData.knittingStartDate || undefined;
        orderData.knittingCompleteDate = localOrderData.knittingCompleteDate || undefined;
        orderData.dyeingStartDate = localOrderData.dyeingStartDate || undefined;
        orderData.dyeingCompleteDate = localOrderData.dyeingCompleteDate || undefined;
        orderData.bulkSizeSetDate = localOrderData.bulkSizeSetDate || undefined;
        orderData.cuttingStartDate = localOrderData.cuttingStartDate || undefined;
        orderData.cuttingCompleteDate = localOrderData.cuttingCompleteDate || undefined;
        orderData.printSendDate = localOrderData.printSendDate || undefined;
        orderData.printReceivedDate = localOrderData.printReceivedDate || undefined;
        orderData.sewingInputDate = localOrderData.sewingInputDate || undefined;
        orderData.sewingFinishDate = localOrderData.sewingFinishDate || undefined;
        orderData.packingCompleteDate = localOrderData.packingCompleteDate || undefined;
        orderData.finalInspectionDate = localOrderData.finalInspectionDate || undefined;
        orderData.exFactoryDate = localOrderData.exFactoryDate || undefined;
      }

      await api.patch(`/orders/${params.id}/`, orderData);

      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });

      router.push(`/orders/${params.id}`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      // Extract error message, ensuring it's always a string
      let errorMessage = 'Failed to update order';
      const responseData = error.response?.data;
      if (responseData) {
        if (typeof responseData.message === 'string') {
          errorMessage = responseData.message;
        } else if (responseData.message && typeof responseData.message === 'object') {
          // Flatten nested validation errors to a readable string
          const firstKey = Object.keys(responseData.message)[0];
          const firstValue = responseData.message[firstKey];
          errorMessage = Array.isArray(firstValue) ? firstValue[0] : String(firstValue);
        } else if (responseData.detail) {
          errorMessage = String(responseData.detail);
        } else {
          errorMessage = JSON.stringify(responseData);
        }
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateOrderLine = (index: number, field: keyof OrderLineFormData, value: any) => {
    const newLines = [...orderLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setOrderLines(newLines);
  };

  const addOrderLine = () => {
    setOrderLines([
      ...orderLines,
      {
        styleNumber: '',
        colorCode: '',
        quantity: '',
        unit: 'yards',
        currency: 'USD',
      },
    ]);
  };

  const removeOrderLine = (index: number) => {
    if (orderLines.length > 1) {
      setOrderLines(orderLines.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading order...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push(`/orders/${params.id}`)} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Order Details
          </Button>
          <h1 className="text-3xl font-bold">Edit Order</h1>
          <p className="text-gray-500 mt-1">Update order information and lines</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Order Information
                <span className={`text-xs px-2 py-1 rounded ${orderType === 'local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {orderType === 'local' ? 'Local Order' : 'Foreign Order'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="poNumber">PO Number *</Label>
                  <Input
                    id="poNumber"
                    required
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customerName">Vendor Name *</Label>
                  <Input
                    id="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="buyerName">Buyer Name</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fabricType">Fabric Type *</Label>
                  <Input
                    id="fabricType"
                    required
                    placeholder="e.g., Single Jersey"
                    value={formData.fabricType}
                    onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="notes">Order Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Local Order Specific Fields */}
          {orderType === 'local' && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Local Order Production Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {/* Yarn Section */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">Yarn Information</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-yarnRequired">Yarn Required (Amount)</Label>
                      <Input
                        id="edit-yarnRequired"
                        type="number"
                        step="0.01"
                        value={localOrderData.yarnRequired}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, yarnRequired: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-yarnBookedDate">Yarn Booked Date</Label>
                      <Input
                        id="edit-yarnBookedDate"
                        type="date"
                        value={localOrderData.yarnBookedDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, yarnBookedDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-yarnReceivedDate">Yarn Received Date</Label>
                      <Input
                        id="edit-yarnReceivedDate"
                        type="date"
                        value={localOrderData.yarnReceivedDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, yarnReceivedDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* PP Section */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">PP & FIT Information</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-ppYards">PP Yards</Label>
                      <Input
                        id="edit-ppYards"
                        type="number"
                        step="0.01"
                        value={localOrderData.ppYards}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, ppYards: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-fitCumPpSubmitDate">FIT CUM PP Submit Date</Label>
                      <Input
                        id="edit-fitCumPpSubmitDate"
                        type="date"
                        value={localOrderData.fitCumPpSubmitDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, fitCumPpSubmitDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-fitCumPpCommentsDate">FIT CUM PP Comments Date</Label>
                      <Input
                        id="edit-fitCumPpCommentsDate"
                        type="date"
                        value={localOrderData.fitCumPpCommentsDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, fitCumPpCommentsDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Knitting Section (Calculated but editable) */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">
                    Knitting & Dyeing Dates
                    <span className="text-xs font-normal text-gray-500 ml-2">(Auto-calculated but editable)</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-knittingStartDate">Knitting Start Date</Label>
                      <Input
                        id="edit-knittingStartDate"
                        type="date"
                        value={localOrderData.knittingStartDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, knittingStartDate: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Yarn Received + 11 days</p>
                    </div>
                    <div>
                      <Label htmlFor="edit-knittingCompleteDate">Knitting Complete Date</Label>
                      <Input
                        id="edit-knittingCompleteDate"
                        type="date"
                        value={localOrderData.knittingCompleteDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, knittingCompleteDate: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Knitting Start + 18 days</p>
                    </div>
                    <div>
                      <Label htmlFor="edit-dyeingStartDate">Dyeing Start Date</Label>
                      <Input
                        id="edit-dyeingStartDate"
                        type="date"
                        value={localOrderData.dyeingStartDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, dyeingStartDate: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">Knitting Start + 5 days</p>
                    </div>
                  </div>
                </div>

                {/* Production Dates Section */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">Production Dates</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="edit-dyeingCompleteDate">Dyeing Complete</Label>
                      <Input
                        id="edit-dyeingCompleteDate"
                        type="date"
                        value={localOrderData.dyeingCompleteDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, dyeingCompleteDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-bulkSizeSetDate">Bulk Size Set</Label>
                      <Input
                        id="edit-bulkSizeSetDate"
                        type="date"
                        value={localOrderData.bulkSizeSetDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, bulkSizeSetDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-cuttingStartDate">Cutting Start</Label>
                      <Input
                        id="edit-cuttingStartDate"
                        type="date"
                        value={localOrderData.cuttingStartDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, cuttingStartDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-cuttingCompleteDate">Cutting Complete</Label>
                      <Input
                        id="edit-cuttingCompleteDate"
                        type="date"
                        value={localOrderData.cuttingCompleteDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, cuttingCompleteDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Print Section (Optional) */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">Print Information (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-printSendDate">Print Send Date</Label>
                      <Input
                        id="edit-printSendDate"
                        type="date"
                        value={localOrderData.printSendDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, printSendDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-printReceivedDate">Print Received Date</Label>
                      <Input
                        id="edit-printReceivedDate"
                        type="date"
                        value={localOrderData.printReceivedDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, printReceivedDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Sewing Section */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">Sewing Dates</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-sewingInputDate">Sewing Input Date</Label>
                      <Input
                        id="edit-sewingInputDate"
                        type="date"
                        value={localOrderData.sewingInputDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, sewingInputDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-sewingFinishDate">Sewing Finish Date</Label>
                      <Input
                        id="edit-sewingFinishDate"
                        type="date"
                        value={localOrderData.sewingFinishDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, sewingFinishDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Final Stage Section */}
                <div>
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">Final Stage Dates</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-packingCompleteDate">Packing Complete</Label>
                      <Input
                        id="edit-packingCompleteDate"
                        type="date"
                        value={localOrderData.packingCompleteDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, packingCompleteDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-finalInspectionDate">Final Inspection</Label>
                      <Input
                        id="edit-finalInspectionDate"
                        type="date"
                        value={localOrderData.finalInspectionDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, finalInspectionDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-exFactoryDate">Ex-Factory Date</Label>
                      <Input
                        id="edit-exFactoryDate"
                        type="date"
                        value={localOrderData.exFactoryDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, exFactoryDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Lines */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Order Lines</h2>
              <Button type="button" variant="outline" onClick={addOrderLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            {orderLines.map((line, lineIndex) => (
                <Card
                  key={line.id || lineIndex}
                  className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all"
                >
                  <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-semibold">
                          Line {lineIndex + 1}
                        </span>
                        {line.styleNumber && (
                          <span className="text-sm text-gray-700 font-mono">
                            {line.styleNumber}
                          </span>
                        )}
                        {line.colorCode && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                            {line.colorCode}
                          </span>
                        )}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrderLine(lineIndex)}
                        disabled={orderLines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Required Fields */}
                    <div className="grid grid-cols-6 gap-3">
                      <div>
                        <Label className="text-sm">Style Number *</Label>
                        <Input
                          value={line.styleNumber}
                          onChange={(e) => updateOrderLine(lineIndex, 'styleNumber', e.target.value)}
                          required
                          className="text-sm"
                          placeholder="ST2024"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Color Code *</Label>
                        <Input
                          value={line.colorCode}
                          onChange={(e) => updateOrderLine(lineIndex, 'colorCode', e.target.value)}
                          required
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">CAD Name</Label>
                        <Input
                          value={line.cadName || ''}
                          onChange={(e) => updateOrderLine(lineIndex, 'cadName', e.target.value)}
                          className="text-sm"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Quantity *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateOrderLine(lineIndex, 'quantity', e.target.value)}
                          required
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Unit</Label>
                        <Select
                          value={line.unit}
                          onValueChange={(value) => updateOrderLine(lineIndex, 'unit', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meters">Meters</SelectItem>
                            <SelectItem value="yards">Yards</SelectItem>
                            <SelectItem value="kg">Kilograms</SelectItem>
                            <SelectItem value="lbs">Pounds</SelectItem>
                            <SelectItem value="pieces">Pieces</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Currency</Label>
                        <Input
                          value={line.currency}
                          onChange={(e) => updateOrderLine(lineIndex, 'currency', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Optional Style Technical Details */}
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold mb-2 block">Style Technical Details (Optional)</Label>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-4">
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            value={line.description || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'description', e.target.value)}
                            placeholder="Style description"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Fabric Composition</Label>
                          <Input
                            value={line.fabricComposition || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'fabricComposition', e.target.value)}
                            className="text-sm"
                            placeholder="e.g., 100% Cotton"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">GSM</Label>
                          <Input
                            type="number"
                            value={line.gsm || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'gsm', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Finish Type</Label>
                          <Input
                            value={line.finishType || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'finishType', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Cuttable Width</Label>
                          <Input
                            value={line.cuttableWidth || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'cuttableWidth', e.target.value)}
                            placeholder="e.g., 60 inches"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Finishing Width</Label>
                          <Input
                            value={line.finishingWidth || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'finishingWidth', e.target.value)}
                            placeholder="e.g., 58 inches"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-sm">Construction</Label>
                          <Textarea
                            value={line.construction || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'construction', e.target.value)}
                            placeholder="Construction details"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Commercial Data */}
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold mb-2 block">Commercial Data (Optional)</Label>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-sm">Mill Name</Label>
                          <Input
                            value={line.millName || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'millName', e.target.value)}
                            className="text-sm"
                            placeholder="Mill supplier"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Mill Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.millPrice || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'millPrice', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Prova Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.provaPrice || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'provaPrice', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="border-t pt-3">
                      <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        Important Dates (Optional)
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">ETD</Label>
                          <Input
                            type="date"
                            value={line.etd || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'etd', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">ETA</Label>
                          <Input
                            type="date"
                            value={line.eta || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'eta', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Submission Date</Label>
                          <Input
                            type="date"
                            value={line.submissionDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'submissionDate', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="border-t pt-3">
                      <Label className="text-sm">Line Notes</Label>
                      <Textarea
                        value={line.notes || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'notes', e.target.value)}
                        placeholder="Additional notes for this line"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.push(`/orders/${params.id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
