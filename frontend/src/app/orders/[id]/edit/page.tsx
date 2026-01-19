'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  // Finished Fabric fields
  finishedFabricQuantity?: string;
  finishedFabricUnit?: string;
  // Yarn fields (yarnRequired is now auto-calculated)
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
  const searchParams = useSearchParams();
  const targetLineId = searchParams.get('lineId');
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
    finishedFabricQuantity: '',
    finishedFabricUnit: 'kg',
    processLossPercent: '',
    mixedFabricType: '',
    mixedFabricPercent: '',
  });
  
  const [orderType, setOrderType] = useState<'foreign' | 'local'>('foreign');
  
  const [orderLines, setOrderLines] = useState<OrderLineFormData[]>([]);
  const orderLinesRef = useRef<OrderLineFormData[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([0])); // First line expanded by default
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep ref in sync with state to ensure handleSubmit always has latest values
  useEffect(() => {
    orderLinesRef.current = orderLines;
  }, [orderLines]);

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
      const response = await api.get(`/orders/${params.id}`, {
        params: { _t: Date.now() }
      });
      const order = response.data;
      
      // DEBUG: Log finished fabric from API
      console.log('=== LOADED FROM API ===');
      console.log('Order finishedFabricQuantity:', order.finishedFabricQuantity);
      console.log('Order finishedFabricUnit:', order.finishedFabricUnit);
      
      // Set basic order data
      setFormData({
        poNumber: order.poNumber || '',
        customerName: order.customerName || '',
        buyerName: order.buyerName || '',
        fabricType: order.fabricType || '',
        orderDate: order.orderDate || '',
        notes: order.notes || '',
        finishedFabricQuantity: order.finishedFabricQuantity ? order.finishedFabricQuantity.toString() : '',
        finishedFabricUnit: order.finishedFabricUnit || 'kg',
        processLossPercent: order.processLossPercent ? order.processLossPercent.toString() : '',
        mixedFabricType: order.mixedFabricType || '',
        mixedFabricPercent: order.mixedFabricPercent ? order.mixedFabricPercent.toString() : '',
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
              // Finished Fabric fields
              finishedFabricQuantity: item.finishedFabricQuantity ? item.finishedFabricQuantity.toString() : '',
              finishedFabricUnit: item.finishedFabricUnit || 'kg',
              // Greige/Yarn calculation fields - use order level now
              
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
        
        // Debug: Log what was loaded from API
        console.log('=== LOADED FROM API ===');
        console.log('Lines loaded:', lines.map((l, i) => ({ 
          index: i + 1,
          id: l.id?.slice(-8), 
          styleId: l.styleId?.slice(-8),
          styleNumber: l.styleNumber, 
          quantity: l.quantity 
        })));
        
        setOrderLines(lines);
        
        // Handle lineId query param - find, expand, scroll to, and highlight target line
        if (targetLineId) {
          const targetIndex = lines.findIndex(line => line.id === targetLineId);
          if (targetIndex !== -1) {
            // Expand the target line
            setExpandedLines(new Set([targetIndex]));
            // Highlight the target line briefly
            setHighlightedLineIndex(targetIndex);
            // Scroll to the target line after a short delay to allow rendering
            setTimeout(() => {
              lineRefs.current[targetIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
              // Remove highlight after 2 seconds
              setTimeout(() => {
                setHighlightedLineIndex(null);
              }, 2000);
            }, 100);
          }
        }
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
      // CRITICAL: Use ref to get the latest orderLines state
      const currentOrderLines = orderLinesRef.current;
      
      // NO GROUPING - Each line is its own style with exactly 1 line
      // This ensures complete independence between lines
      const orderData: any = {
        poNumber: formData.poNumber || undefined,
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        fabricType: formData.fabricType,
        orderDate: formData.orderDate || undefined,
        notes: formData.notes || undefined,
        quantity: currentOrderLines.reduce(
          (total, line) => total + (parseFloat(line.quantity) || 0),
          0
        ),
        unit: currentOrderLines[0]?.unit || 'meters',
        finishedFabricQuantity: orderType === 'local' && formData.finishedFabricQuantity ? parseFloat(formData.finishedFabricQuantity) : undefined,
        finishedFabricUnit: orderType === 'local' && formData.finishedFabricUnit ? formData.finishedFabricUnit : undefined,
        processLossPercent: orderType === 'local' && formData.processLossPercent ? parseFloat(formData.processLossPercent) : undefined,
        mixedFabricType: orderType === 'local' && formData.mixedFabricType ? formData.mixedFabricType : undefined,
        mixedFabricPercent: orderType === 'local' && formData.mixedFabricPercent ? parseFloat(formData.mixedFabricPercent) : undefined,
        // Each line becomes its own style - completely independent
        styles: currentOrderLines.map((line, index) => {
          // Build line data
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
          
          // Add local order production fields
          if (orderType === 'local') {
            lineData.finishedFabricQuantity = line.finishedFabricQuantity ? parseFloat(line.finishedFabricQuantity) : undefined;
            lineData.finishedFabricUnit = line.finishedFabricUnit || undefined;
            // Percentages are now order-level
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
          
          // Each line gets its own style - DO NOT send styleId to avoid backend overwriting
          // The backend will create/find styles based on data, not ID
          return {
            // NO id field - this forces backend to handle each style independently
            styleNumber: line.styleNumber || `Line-${index + 1}`,
            description: line.description || undefined,
            fabricType: line.fabricType || formData.fabricType,
            fabricComposition: line.fabricComposition || undefined,
            gsm: line.gsm ? parseFloat(line.gsm) : undefined,
            finishType: line.finishType || undefined,
            construction: line.construction || undefined,
            cuttableWidth: line.cuttableWidth || undefined,
            finishingWidth: line.finishingWidth || undefined,
            lines: [lineData], // Exactly 1 line per style
          };
        }),
      };

      // Debug: Log what we're sending to verify data integrity
      console.log('=== EDIT ORDER SUBMIT ===');
      console.log('Order Type:', orderType);
      console.log('Finished Fabric Quantity:', orderData.finishedFabricQuantity);
      console.log('Finished Fabric Unit:', orderData.finishedFabricUnit);
      console.log(`Sending ${orderData.styles.length} styles (1 per line):`);
      orderData.styles.forEach((s: any, i: number) => {
        console.log(`  Style ${i + 1}: styleNumber="${s.styleNumber}", desc="${s.description?.slice(0,20) || ''}...", lineId="${s.lines[0]?.id?.slice(-8)}", qty=${s.lines[0]?.quantity}, finishedFabric=${s.lines[0]?.finishedFabricQuantity}`);
      });
      
      await api.patch(`/orders/${params.id}/`, orderData);

      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });

      const fromSource = searchParams.get('from');
      const query = fromSource ? `?from=${fromSource}` : '';
      router.push(`/orders/${params.id}${query}`);
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
    // Debug: Track every field change
    console.log(`[UPDATE] Line ${index + 1}: ${field} = "${value}"`);
    
    setOrderLines(prevLines => {
      const newLines = [...prevLines];
      newLines[index] = { ...newLines[index], [field]: value };
      return newLines;
    });
  };

  const addOrderLine = () => {
    setOrderLines(prevLines => [
      ...prevLines,
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
    setOrderLines(prevLines => {
      if (prevLines.length > 1) {
        return prevLines.filter((_, i) => i !== index);
      }
      return prevLines;
    });
  };

  const copyBasicInfoToAll = (sourceIndex: number) => {
    console.log(`[COPY BASIC] Triggered from Line ${sourceIndex + 1}`);
    setOrderLines(prevLines => {
      const sourceLine = prevLines[sourceIndex];
      return prevLines.map((line, index) => {
        if (index === sourceIndex) return line;
        return {
          ...line,
          styleNumber: sourceLine.styleNumber,
          colorCode: sourceLine.colorCode,
          cadName: sourceLine.cadName,
          quantity: sourceLine.quantity,
          unit: sourceLine.unit,
          currency: sourceLine.currency,
        };
      });
    });
    toast({
      title: 'Basic Info Copied',
      description: `Style, color, CAD, quantity, unit and currency from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyTechnicalDetailsToAll = (sourceIndex: number) => {
    console.log(`[COPY TECHNICAL] Triggered from Line ${sourceIndex + 1}`);
    setOrderLines(prevLines => {
      const sourceLine = prevLines[sourceIndex];
      return prevLines.map((line, index) => {
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
    });
    toast({
      title: 'Technical Details Copied',
      description: `Style technical details from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyCommercialDataToAll = (sourceIndex: number) => {
    setOrderLines(prevLines => {
      const sourceLine = prevLines[sourceIndex];
      return prevLines.map((line, index) => {
        if (index === sourceIndex) return line;
        return {
          ...line,
          millName: sourceLine.millName,
          millPrice: sourceLine.millPrice,
          provaPrice: sourceLine.provaPrice,
        };
      });
    });
    toast({
      title: 'Commercial Data Copied',
      description: `Commercial data from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyDatesToAll = (sourceIndex: number) => {
    setOrderLines(prevLines => {
      const sourceLine = prevLines[sourceIndex];
      return prevLines.map((line, index) => {
        if (index === sourceIndex) return line;
        return {
          ...line,
          etd: sourceLine.etd,
          eta: sourceLine.eta,
          submissionDate: sourceLine.submissionDate,
        };
      });
    });
    toast({
      title: 'Dates Copied',
      description: `Dates from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const copyProductionTrackingToAll = (sourceIndex: number) => {
    setOrderLines(prevLines => {
      const sourceLine = prevLines[sourceIndex];
      return prevLines.map((line, index) => {
        if (index === sourceIndex) return line;
        return {
          ...line,
          // Percentages are now at order level
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
    });
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
                
                {/* Order-Level Finished Fabric (Local Orders Only) */}
                {orderType === 'local' && (
                  <>
                    <div className="col-span-3 border-t pt-4">
                      <Label className="text-sm font-semibold text-green-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Finished Fabric (Order-Level)
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Used for production calculations. Optional field.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="finishedFabricQuantity">Finished Fabric Quantity</Label>
                      <Input
                        id="finishedFabricQuantity"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g., 1000"
                        value={formData.finishedFabricQuantity}
                        onChange={(e) => setFormData({ ...formData, finishedFabricQuantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="finishedFabricUnit">Unit</Label>
                      <Select
                        value={formData.finishedFabricUnit}
                        onValueChange={(value) => setFormData({ ...formData, finishedFabricUnit: value })}
                      >
                        <SelectTrigger id="finishedFabricUnit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="yards">yards</SelectItem>
                          <SelectItem value="meters">meters</SelectItem>
                          <SelectItem value="lbs">lbs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Greige & Yarn Calculation Parameters (Order Level) */}
                    <div className="col-span-3 grid grid-cols-3 gap-4 bg-amber-50 p-4 rounded-lg border border-amber-200 mt-2">
                      <div className="col-span-3">
                        <Label className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                          Greige & Yarn Calculation Parameters
                        </Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="processLossPercent">Process Loss (%)</Label>
                        <Input
                          id="processLossPercent"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="e.g., 10"
                          value={formData.processLossPercent}
                          onChange={(e) => setFormData({ ...formData, processLossPercent: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mixedFabricType">Mixed Fabric Type</Label>
                        <Input
                          id="mixedFabricType"
                          placeholder="e.g., Lycra"
                          value={formData.mixedFabricType}
                          onChange={(e) => setFormData({ ...formData, mixedFabricType: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mixedFabricPercent">Mixed Fabric (%)</Label>
                        <Input
                          id="mixedFabricPercent"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="e.g., 4"
                          value={formData.mixedFabricPercent}
                          onChange={(e) => setFormData({ ...formData, mixedFabricPercent: e.target.value })}
                        />
                      </div>
                      
                      {/* Calculation Preview */}
                      {formData.finishedFabricQuantity && (
                        <div className="col-span-3 mt-2 text-sm text-amber-800 bg-white p-3 rounded border border-amber-100">
                          <span className="font-semibold block mb-1">Production Calculation Preview:</span>
                          {(() => {
                            const finished = parseFloat(formData.finishedFabricQuantity || '0');
                            const loss = parseFloat(formData.processLossPercent || '0') / 100;
                            const mixed = parseFloat(formData.mixedFabricPercent || '0') / 100;
                            
                            const greige = finished * (1 + loss);
                            const yarn = greige * (1 - mixed);
                            
                            return (
                              <div className="flex gap-4">
                                <span>
                                  Total Greige: <strong>{greige.toLocaleString(undefined, { maximumFractionDigits: 2 })} {formData.finishedFabricUnit}</strong>
                                </span>
                                <span>
                                  Total Yarn: <strong>{yarn.toLocaleString(undefined, { maximumFractionDigits: 2 })} {formData.finishedFabricUnit}</strong>
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </>
                )}
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
                  ref={(el) => { lineRefs.current[lineIndex] = el; }}
                  className={`border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all ${
                    highlightedLineIndex === lineIndex 
                      ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50 animate-pulse' 
                      : ''
                  }`}
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
                        
                        {/* Finished Fabric Section */}
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-3">
                          <Label className="text-sm font-semibold text-green-800 mb-2 block">
                            Finished Fabric (Line-Level)
                          </Label>
                          <p className="text-xs text-gray-600 mb-2">
                            Optional: Override quantity for this line's production calculations
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">Finished Fabric Quantity</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 500"
                                value={line.finishedFabricQuantity || ''}
                                onChange={(e) => updateOrderLine(lineIndex, 'finishedFabricQuantity', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Unit</Label>
                              <Select
                                value={line.finishedFabricUnit || 'kg'}
                                onValueChange={(value) => updateOrderLine(lineIndex, 'finishedFabricUnit', value)}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="yards">yards</SelectItem>
                                  <SelectItem value="meters">meters</SelectItem>
                                  <SelectItem value="lbs">lbs</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Greige & Yarn Calculation Preview (based on Order Parameters) */}
                        {line.finishedFabricQuantity && (
                          <div className="mb-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <Label className="text-sm font-semibold text-amber-800 mb-2 block">
                              Calculation Preview (using Order parameters)
                            </Label>
                            <div className="text-xs text-amber-700">
                              {(() => {
                                const finished = parseFloat(line.finishedFabricQuantity || '0');
                                // Use order-level percentages from formData
                                const loss = parseFloat(formData.processLossPercent || '0') / 100;
                                const mixed = parseFloat(formData.mixedFabricPercent || '0') / 100;
                                
                                const greige = finished * (1 + loss);
                                const yarn = greige * (1 - mixed);
                                
                                return (
                                  <div className="space-y-1">
                                    <div>Process Loss: {formData.processLossPercent || 0}%</div>
                                    {formData.mixedFabricType && (
                                      <div>Mixed Fabric: {formData.mixedFabricType} ({formData.mixedFabricPercent || 0}%)</div>
                                    )}
                                    <div className="font-semibold mt-1">
                                      Greige: {greige.toFixed(2)} {line.finishedFabricUnit || 'kg'}
                                    </div>
                                    <div className="font-semibold">
                                      Yarn Required: {yarn.toFixed(2)} {line.finishedFabricUnit || 'kg'}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

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
