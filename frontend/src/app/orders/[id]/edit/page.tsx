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
import { ArrowLeft, Save, Plus, Trash2, Calendar, MapPin, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';

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
  // Local order production fields (line-level)
  // Greige/Yarn calculation fields
  processLossPercent?: string;
  mixedFabricType?: string;
  mixedFabricPercent?: string;
  greigeQuantity?: string;
  yarnRequired?: string;
  yarnBookedDate?: string;
  yarnReceivedDate?: string;
  ppYards?: string;
  fitCumPpSubmitDate?: string;
  fitCumPpCommentsDate?: string;
  knittingStartDate?: string;
  knittingCompleteDate?: string;
  dyeingStartDate?: string;
  dyeingCompleteDate?: string;
  bulkSizeSetDate?: string;
  cuttingStartDate?: string;
  cuttingCompleteDate?: string;
  printSendDate?: string;
  printReceivedDate?: string;
  sewingInputDate?: string;
  sewingFinishDate?: string;
  packingCompleteDate?: string;
  finalInspectionDate?: string;
  exFactoryDate?: string;
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
  
  const [orderLines, setOrderLines] = useState<OrderLineFormData[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([0])); // First line expanded by default

  const toggleLineExpanded = (index: number) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLines(newExpanded);
  };

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
              // Local order production fields (line-level)
              // Greige/Yarn calculation fields
              processLossPercent: item.processLossPercent ? item.processLossPercent.toString() : '',
              mixedFabricType: item.mixedFabricType || '',
              mixedFabricPercent: item.mixedFabricPercent ? item.mixedFabricPercent.toString() : '',
              greigeQuantity: item.greigeQuantity ? item.greigeQuantity.toString() : '',
              yarnRequired: item.yarnRequired ? item.yarnRequired.toString() : '',
              yarnBookedDate: item.yarnBookedDate || '',
              yarnReceivedDate: item.yarnReceivedDate || '',
              ppYards: item.ppYards ? item.ppYards.toString() : '',
              fitCumPpSubmitDate: item.fitCumPpSubmitDate || '',
              fitCumPpCommentsDate: item.fitCumPpCommentsDate || '',
              knittingStartDate: item.knittingStartDate || '',
              knittingCompleteDate: item.knittingCompleteDate || '',
              dyeingStartDate: item.dyeingStartDate || '',
              dyeingCompleteDate: item.dyeingCompleteDate || '',
              bulkSizeSetDate: item.bulkSizeSetDate || '',
              cuttingStartDate: item.cuttingStartDate || '',
              cuttingCompleteDate: item.cuttingCompleteDate || '',
              printSendDate: item.printSendDate || '',
              printReceivedDate: item.printReceivedDate || '',
              sewingInputDate: item.sewingInputDate || '',
              sewingFinishDate: item.sewingFinishDate || '',
              packingCompleteDate: item.packingCompleteDate || '',
              finalInspectionDate: item.finalInspectionDate || '',
              exFactoryDate: item.exFactoryDate || '',
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
            lines: lines.map((line) => {
              const lineData: any = {
                id: line.id,
                colorCode: line.colorCode,
                cadName: line.cadName || undefined,
                quantity: line.quantity ? parseFloat(line.quantity) : undefined,
                unit: line.unit,
                millName: line.millName || undefined,
                millPrice: line.millPrice ? parseFloat(line.millPrice) : undefined,
                provaPrice: line.provaPrice ? parseFloat(line.provaPrice) : undefined,
                currency: line.currency,
                etd: line.etd || undefined,
                eta: line.eta || undefined,
                submissionDate: line.submissionDate || undefined,
                notes: line.notes || undefined,
              };
              
              // Add local order production fields at line level for local orders
              if (orderType === 'local') {
                // Greige/Yarn calculation fields (yarnRequired is auto-calculated on backend)
                lineData.processLossPercent = line.processLossPercent ? parseFloat(line.processLossPercent) : undefined;
                lineData.mixedFabricType = line.mixedFabricType || undefined;
                lineData.mixedFabricPercent = line.mixedFabricPercent ? parseFloat(line.mixedFabricPercent) : undefined;
                // Yarn dates
                lineData.yarnBookedDate = line.yarnBookedDate || undefined;
                lineData.yarnReceivedDate = line.yarnReceivedDate || undefined;
                lineData.ppYards = line.ppYards ? parseFloat(line.ppYards) : undefined;
                lineData.fitCumPpSubmitDate = line.fitCumPpSubmitDate || undefined;
                lineData.fitCumPpCommentsDate = line.fitCumPpCommentsDate || undefined;
                lineData.knittingStartDate = line.knittingStartDate || undefined;
                lineData.knittingCompleteDate = line.knittingCompleteDate || undefined;
                lineData.dyeingStartDate = line.dyeingStartDate || undefined;
                lineData.dyeingCompleteDate = line.dyeingCompleteDate || undefined;
                lineData.bulkSizeSetDate = line.bulkSizeSetDate || undefined;
                lineData.cuttingStartDate = line.cuttingStartDate || undefined;
                lineData.cuttingCompleteDate = line.cuttingCompleteDate || undefined;
                lineData.printSendDate = line.printSendDate || undefined;
                lineData.printReceivedDate = line.printReceivedDate || undefined;
                lineData.sewingInputDate = line.sewingInputDate || undefined;
                lineData.sewingFinishDate = line.sewingFinishDate || undefined;
                lineData.packingCompleteDate = line.packingCompleteDate || undefined;
                lineData.finalInspectionDate = line.finalInspectionDate || undefined;
                lineData.exFactoryDate = line.exFactoryDate || undefined;
              }
              
              return lineData;
            }),
          };
        }),
      };

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

  const copyBasicInfoToAll = (sourceIndex: number) => {
    const sourceLine = orderLines[sourceIndex];
    const newLines = orderLines.map((line, index) => {
      if (index === sourceIndex) return line;
      return {
        ...line,
        colorCode: sourceLine.colorCode,
        cadName: sourceLine.cadName,
        unit: sourceLine.unit,
        currency: sourceLine.currency,
      };
    });
    setOrderLines(newLines);
    toast({
      title: 'Basic Info Copied',
      description: `Color, CAD, unit and currency from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyTechnicalDetailsToAll = (sourceIndex: number) => {
    const sourceLine = orderLines[sourceIndex];
    const newLines = orderLines.map((line, index) => {
      if (index === sourceIndex) return line;
      return {
        ...line,
        description: sourceLine.description,
        fabricType: sourceLine.fabricType,
        fabricComposition: sourceLine.fabricComposition,
        gsm: sourceLine.gsm,
        finishType: sourceLine.finishType,
        cuttableWidth: sourceLine.cuttableWidth,
        finishingWidth: sourceLine.finishingWidth,
        construction: sourceLine.construction,
      };
    });
    setOrderLines(newLines);
    toast({
      title: 'Technical Details Copied',
      description: `Style technical details from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyCommercialDataToAll = (sourceIndex: number) => {
    const sourceLine = orderLines[sourceIndex];
    const newLines = orderLines.map((line, index) => {
      if (index === sourceIndex) return line;
      return {
        ...line,
        millName: sourceLine.millName,
        millPrice: sourceLine.millPrice,
        provaPrice: sourceLine.provaPrice,
      };
    });
    setOrderLines(newLines);
    toast({
      title: 'Commercial Data Copied',
      description: `Commercial data from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyDatesToAll = (sourceIndex: number) => {
    const sourceLine = orderLines[sourceIndex];
    const newLines = orderLines.map((line, index) => {
      if (index === sourceIndex) return line;
      return {
        ...line,
        etd: sourceLine.etd,
        eta: sourceLine.eta,
        submissionDate: sourceLine.submissionDate,
      };
    });
    setOrderLines(newLines);
    toast({
      title: 'Dates Copied',
      description: `Dates from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyProductionTrackingToAll = (sourceIndex: number) => {
    const sourceLine = orderLines[sourceIndex];
    const newLines = orderLines.map((line, index) => {
      if (index === sourceIndex) return line;
      return {
        ...line,
        processLossPercent: sourceLine.processLossPercent,
        mixedFabricType: sourceLine.mixedFabricType,
        mixedFabricPercent: sourceLine.mixedFabricPercent,
        yarnBookedDate: sourceLine.yarnBookedDate,
        yarnReceivedDate: sourceLine.yarnReceivedDate,
        ppYards: sourceLine.ppYards,
        fitCumPpSubmitDate: sourceLine.fitCumPpSubmitDate,
        fitCumPpCommentsDate: sourceLine.fitCumPpCommentsDate,
        knittingStartDate: sourceLine.knittingStartDate,
        knittingCompleteDate: sourceLine.knittingCompleteDate,
        dyeingStartDate: sourceLine.dyeingStartDate,
        dyeingCompleteDate: sourceLine.dyeingCompleteDate,
        bulkSizeSetDate: sourceLine.bulkSizeSetDate,
        cuttingStartDate: sourceLine.cuttingStartDate,
        cuttingCompleteDate: sourceLine.cuttingCompleteDate,
        printSendDate: sourceLine.printSendDate,
        printReceivedDate: sourceLine.printReceivedDate,
        sewingInputDate: sourceLine.sewingInputDate,
        sewingFinishDate: sourceLine.sewingFinishDate,
        packingCompleteDate: sourceLine.packingCompleteDate,
        finalInspectionDate: sourceLine.finalInspectionDate,
        exFactoryDate: sourceLine.exFactoryDate,
      };
    });
    setOrderLines(newLines);
    toast({
      title: 'Production Tracking Copied',
      description: `Production tracking data from Line ${sourceIndex + 1} copied to all other lines`,
    });
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
                  <CardHeader 
                    className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:bg-indigo-100 transition-colors"
                    onClick={() => toggleLineExpanded(lineIndex)}
                  >
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        {expandedLines.has(lineIndex) ? (
                          <ChevronDown className="h-5 w-5 text-indigo-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-indigo-600" />
                        )}
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
                        {line.cadName && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono">
                            📐 {line.cadName}
                          </span>
                        )}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOrderLine(lineIndex);
                        }}
                        disabled={orderLines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedLines.has(lineIndex) && (
                  <CardContent className="space-y-4 pt-4">
                    {/* Required Fields */}
                    <div className="border-b pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold text-indigo-700">Basic Information</Label>
                        {orderLines.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyBasicInfoToAll(lineIndex)}
                            className="text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy to All Lines
                          </Button>
                        )}
                      </div>
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
                    </div>

                    {/* Optional Style Technical Details */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Style Technical Details (Optional)</Label>
                        {orderLines.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyTechnicalDetailsToAll(lineIndex)}
                            className="text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy to All Lines
                          </Button>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Commercial Data (Optional)</Label>
                        {orderLines.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyCommercialDataToAll(lineIndex)}
                            className="text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy to All Lines
                          </Button>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Important Dates (Optional)
                        </Label>
                        {orderLines.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyDatesToAll(lineIndex)}
                            className="text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy to All Lines
                          </Button>
                        )}
                      </div>
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

                    {/* Local Order Production Fields - Only shown for local orders */}
                    {orderType === 'local' && (
                      <div className="border-t pt-3 mt-3 bg-green-50 -mx-6 px-6 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-semibold text-green-700 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Production Tracking (Local Order)
                          </Label>
                          {orderLines.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyProductionTrackingToAll(lineIndex)}
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy to All Lines
                            </Button>
                          )}
                        </div>
                        
                        {/* Greige & Yarn Calculation Section */}
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-3">
                          <Label className="text-sm font-semibold text-amber-800 mb-2 block">
                            Greige & Yarn Calculation
                          </Label>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-sm">Process Loss (%)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="e.g., 10"
                                value={line.processLossPercent || ''}
                                onChange={(e) => updateOrderLine(lineIndex, 'processLossPercent', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Mixed Fabric Type</Label>
                              <Input
                                placeholder="e.g., Lycra, Spandex"
                                value={line.mixedFabricType || ''}
                                onChange={(e) => updateOrderLine(lineIndex, 'mixedFabricType', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Mixed Fabric (%)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="e.g., 4"
                                value={line.mixedFabricPercent || ''}
                                onChange={(e) => updateOrderLine(lineIndex, 'mixedFabricPercent', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          {/* Show calculated values */}
                          {(line.greigeQuantity || line.yarnRequired || line.quantity) && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-100 p-2 rounded">
                              <span className="font-medium">Calculated: </span>
                              {line.greigeQuantity && `Greige: ${parseFloat(line.greigeQuantity).toFixed(2)} ${line.unit} | `}
                              {line.yarnRequired && `Yarn Required: ${parseFloat(line.yarnRequired).toFixed(2)} ${line.unit}`}
                              {!line.greigeQuantity && !line.yarnRequired && line.quantity && (() => {
                                const finished = parseFloat(line.quantity || '0');
                                const loss = parseFloat(line.processLossPercent || '0') / 100;
                                const mixed = parseFloat(line.mixedFabricPercent || '0') / 100;
                                const greige = finished * (1 + loss);
                                const yarn = greige * (1 - mixed);
                                return `Preview - Greige: ${greige.toFixed(2)} ${line.unit} | Yarn: ${yarn.toFixed(2)} ${line.unit}`;
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Yarn Dates Section */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-sm">Yarn Booked</Label>
                            <Input
                              type="date"
                              value={line.yarnBookedDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'yarnBookedDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Yarn Received</Label>
                            <Input
                              type="date"
                              value={line.yarnReceivedDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'yarnReceivedDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* PP & Knitting Section */}
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <Label className="text-sm">PP Yards</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.ppYards || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'ppYards', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">FIT CUM PP Submit</Label>
                            <Input
                              type="date"
                              value={line.fitCumPpSubmitDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'fitCumPpSubmitDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">FIT CUM PP Comments</Label>
                            <Input
                              type="date"
                              value={line.fitCumPpCommentsDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'fitCumPpCommentsDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Knitting & Dyeing Section (calculated fields) */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label className="text-sm">Knitting Start</Label>
                            <Input
                              type="date"
                              value={line.knittingStartDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'knittingStartDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Knitting Complete</Label>
                            <Input
                              type="date"
                              value={line.knittingCompleteDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'knittingCompleteDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Dyeing Start</Label>
                            <Input
                              type="date"
                              value={line.dyeingStartDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'dyeingStartDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Production Dates */}
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <Label className="text-sm">Dyeing Complete</Label>
                            <Input
                              type="date"
                              value={line.dyeingCompleteDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'dyeingCompleteDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Bulk Size Set</Label>
                            <Input
                              type="date"
                              value={line.bulkSizeSetDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'bulkSizeSetDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Cutting Start</Label>
                            <Input
                              type="date"
                              value={line.cuttingStartDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'cuttingStartDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Cutting Complete</Label>
                            <Input
                              type="date"
                              value={line.cuttingCompleteDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'cuttingCompleteDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Print & Sewing */}
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <Label className="text-sm">Print Send</Label>
                            <Input
                              type="date"
                              value={line.printSendDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'printSendDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Print Received</Label>
                            <Input
                              type="date"
                              value={line.printReceivedDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'printReceivedDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Sewing Input</Label>
                            <Input
                              type="date"
                              value={line.sewingInputDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'sewingInputDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Sewing Finish</Label>
                            <Input
                              type="date"
                              value={line.sewingFinishDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'sewingFinishDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Final Stage */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm">Packing Complete</Label>
                            <Input
                              type="date"
                              value={line.packingCompleteDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'packingCompleteDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Final Inspection</Label>
                            <Input
                              type="date"
                              value={line.finalInspectionDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'finalInspectionDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Ex-Factory</Label>
                            <Input
                              type="date"
                              value={line.exFactoryDate || ''}
                              onChange={(e) => updateOrderLine(lineIndex, 'exFactoryDate', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  )}
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
