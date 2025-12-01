'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Copy, ChevronDown, ChevronRight, Globe, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

type OrderType = 'foreign' | 'local' | null;

interface OrderLineFormData {
  // Basic info (all optional)
  styleNumber: string;
  quantity: string;
  unit: string;
  
  // Optional Color
  colorCode?: string;
  
  // Optional CAD
  cadCode?: string;
  
  // Optional Style Technical Details
  description?: string;
  fabricComposition?: string;
  gsm?: string;
  construction?: string;
  cuttableWidth?: string;
  finishingWidth?: string;
  
  // Optional Commercial Data
  millPrice?: string;
  provaPrice?: string;
  commission?: string;
  currency?: string;
  
  // Optional Dates
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
  
  // Optional Notes
  notes?: string;
  
  // Local Order Production Fields (only used for local orders)
  yarnRequired?: string;
  yarnBookedDate?: string;
  yarnReceivedDate?: string;
  ppYards?: string;
  fitCumPpSubmitDate?: string;
  fitCumPpCommentsDate?: string;
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

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrderDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [showTypeSelection, setShowTypeSelection] = useState(true);
  const [formData, setFormData] = useState({
    poNumber: '',
    customerName: '',
    buyerName: '',
    fabricType: '',
    orderDate: '',
    notes: '',
  });
  
  const [orderLines, setOrderLines] = useState<OrderLineFormData[]>([
    {
      styleNumber: '',
      quantity: '',
      unit: 'yards',
      currency: 'USD',
    },
  ]);

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

  const addOrderLine = () => {
    setOrderLines([
      ...orderLines,
      {
        styleNumber: '',
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

  const updateOrderLine = (index: number, field: keyof OrderLineFormData, value: any) => {
    const newLines = [...orderLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setOrderLines(newLines);
  };

  const copyCommercialDataToAll = (sourceIndex: number) => {
    const sourceLine = orderLines[sourceIndex];
    const newLines = orderLines.map((line, index) => {
      if (index === sourceIndex) return line;
      return {
        ...line,
        millPrice: sourceLine.millPrice,
        provaPrice: sourceLine.provaPrice,
        commission: sourceLine.commission,
        currency: sourceLine.currency,
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
        approvalDate: sourceLine.approvalDate,
      };
    });
    setOrderLines(newLines);
    toast({
      title: 'Dates Copied',
      description: `Dates from Line ${sourceIndex + 1} copied to all other lines`,
    });
  };

  const validateForm = () => {
    // All fields are optional - only basic validation
    if (orderLines.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one order line is required',
        variant: 'destructive',
      });
      return false;
    }

    // Check if at least one line has a style number (soft requirement)
    const hasAnyStyle = orderLines.some(line => line.styleNumber.trim());
    if (!hasAnyStyle) {
      toast({
        title: 'Validation Error',
        description: 'At least one line should have a style number',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Group lines by style
      const styleGroups = new Map<string, typeof orderLines>();
      
      orderLines.forEach(line => {
        const styleKey = line.styleNumber.trim();
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
        status: 'upcoming',
        category: 'upcoming',
        orderType: orderType,
        quantity: orderLines.reduce(
          (total, line) => total + (parseFloat(line.quantity) || 0),
          0
        ),
        unit: orderLines[0]?.unit || 'meters',
        styles: Array.from(styleGroups.entries()).map(([styleNumber, lines]) => {
          const firstLine = lines[0];
          return {
            styleNumber: styleNumber,
            description: firstLine.description || undefined,
            fabricType: formData.fabricType,
            fabricComposition: firstLine.fabricComposition || undefined,
            gsm: firstLine.gsm ? parseFloat(firstLine.gsm) : undefined,
            construction: firstLine.construction || undefined,
            cuttableWidth: firstLine.cuttableWidth || undefined,
            finishingWidth: firstLine.finishingWidth || undefined,
            etd: firstLine.etd || undefined,
            eta: firstLine.eta || undefined,
            submissionDate: firstLine.submissionDate || undefined,
            lines: lines.map((line) => {
              const lineData: any = {
                colorCode: line.colorCode || undefined,
                cadCode: line.cadCode || undefined,
                quantity: line.quantity ? parseFloat(line.quantity) : undefined,
                unit: line.unit,
                millPrice: line.millPrice ? parseFloat(line.millPrice) : undefined,
                provaPrice: line.provaPrice ? parseFloat(line.provaPrice) : undefined,
                commission: line.commission ? parseFloat(line.commission) : undefined,
                currency: line.currency || undefined,
                etd: line.etd || undefined,
                eta: line.eta || undefined,
                submissionDate: line.submissionDate || undefined,
                approvalDate: line.approvalDate || undefined,
                notes: line.notes || undefined,
              };
              
              // Add local order production fields at line level for local orders
              if (orderType === 'local') {
                lineData.yarnRequired = line.yarnRequired ? parseFloat(line.yarnRequired) : undefined;
                lineData.yarnBookedDate = line.yarnBookedDate || undefined;
                lineData.yarnReceivedDate = line.yarnReceivedDate || undefined;
                lineData.ppYards = line.ppYards ? parseFloat(line.ppYards) : undefined;
                lineData.fitCumPpSubmitDate = line.fitCumPpSubmitDate || undefined;
                lineData.fitCumPpCommentsDate = line.fitCumPpCommentsDate || undefined;
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

      console.log('Creating order with data:', orderData);

      await api.post('/orders/', orderData);

      toast({
        title: 'Success',
        description: 'Order created successfully',
      });

      // Reset form
      setFormData({
        poNumber: '',
        customerName: '',
        buyerName: '',
        fabricType: '',
        orderDate: '',
        notes: '',
      });
      setOrderLines([
        {
          styleNumber: '',
          quantity: '',
          unit: 'yards',
          currency: 'USD',
        },
      ]);
      setOrderType(null);
      setShowTypeSelection(true);

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to create order';

      toast({
        title: 'Error',
        description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle dialog close - reset state
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setOrderType(null);
      setShowTypeSelection(true);
    }
    onOpenChange(isOpen);
  };

  // Handle order type selection
  const handleTypeSelection = (type: 'foreign' | 'local') => {
    setOrderType(type);
    setShowTypeSelection(false);
  };

  // Go back to type selection
  const handleBackToTypeSelection = () => {
    setShowTypeSelection(true);
    setOrderType(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Order Type Selection Screen */}
        {showTypeSelection ? (
          <>
            <DialogHeader>
              <DialogTitle>Select Order Type</DialogTitle>
              <DialogDescription>
                Please select the type of order you want to create
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6 p-6">
              <button
                type="button"
                onClick={() => handleTypeSelection('foreign')}
                className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              >
                <Globe className="h-16 w-16 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <span className="text-xl font-semibold text-gray-800">Foreign Order</span>
                <span className="text-sm text-gray-500 mt-2 text-center">
                  International orders with standard workflow
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => handleTypeSelection('local')}
                className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
              >
                <MapPin className="h-16 w-16 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
                <span className="text-xl font-semibold text-gray-800">Local Order</span>
                <span className="text-sm text-gray-500 mt-2 text-center">
                  Local orders with production tracking
                </span>
              </button>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToTypeSelection}
                  className="mr-2"
                >
                  ← Back
                </Button>
                Create New {orderType === 'local' ? 'Local' : 'Foreign'} Order
              </DialogTitle>
              <DialogDescription>
                Add order lines - each line is a Style + optional Color + optional CAD combination
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Order Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Order Information
                    <span className={`text-xs px-2 py-1 rounded ${orderType === 'local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {orderType === 'local' ? 'Local Order' : 'Foreign Order'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="poNumber">PO Number</Label>
                <Input
                  id="poNumber"
                  value={formData.poNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, poNumber: e.target.value })
                  }
                  placeholder="Leave empty to auto-generate"
                />
              </div>
              <div>
                <Label htmlFor="customerName">
                  Vendor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="buyerName">Buyer Name</Label>
                <Input
                  id="buyerName"
                  value={formData.buyerName}
                  onChange={(e) =>
                    setFormData({ ...formData, buyerName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fabricType">
                  Fabric Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fabricType"
                  value={formData.fabricType}
                  onChange={(e) =>
                    setFormData({ ...formData, fabricType: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Lines */}
          {orderLines.map((line, lineIndex) => (
            <Card key={lineIndex} className="relative border-l-4 border-l-indigo-500">
              <CardHeader 
                className="flex flex-row items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:bg-indigo-100 transition-colors"
                onClick={() => toggleLineExpanded(lineIndex)}
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  {expandedLines.has(lineIndex) ? (
                    <ChevronDown className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-indigo-600" />
                  )}
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-semibold">
                    Line {lineIndex + 1}
                  </span>
                  {line.styleNumber && (
                    <span className="text-sm text-gray-600">Style: {line.styleNumber}</span>
                  )}
                  {line.colorCode && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">🎨 {line.colorCode}</span>
                  )}
                  {line.cadCode && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">📐 {line.cadCode}</span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {orderLines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOrderLine(lineIndex);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {expandedLines.has(lineIndex) && (
                <CardContent className="space-y-4 pt-4">
                {/* Basic Fields */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-indigo-700 mb-2 block">Basic Information</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`line-${lineIndex}-styleNumber`}>Style Number</Label>
                      <Input
                        id={`line-${lineIndex}-styleNumber`}
                        value={line.styleNumber}
                        onChange={(e) => updateOrderLine(lineIndex, 'styleNumber', e.target.value)}
                        placeholder="e.g., ST-2024-01"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-quantity`}>Quantity</Label>
                      <Input
                        id={`line-${lineIndex}-quantity`}
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateOrderLine(lineIndex, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-unit`}>Unit</Label>
                      <Select
                        value={line.unit}
                        onValueChange={(value) => updateOrderLine(lineIndex, 'unit', value)}
                      >
                        <SelectTrigger>
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
                  </div>
                </div>

                {/* Optional: Color & CAD */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-blue-700 mb-2 block">Color & CAD (Optional)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`line-${lineIndex}-colorCode`}>Color Code</Label>
                      <Input
                        id={`line-${lineIndex}-colorCode`}
                        value={line.colorCode || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'colorCode', e.target.value)}
                        placeholder="e.g., RED-01"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-cadCode`}>CAD Code</Label>
                      <Input
                        id={`line-${lineIndex}-cadCode`}
                        value={line.cadCode || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'cadCode', e.target.value)}
                        placeholder="e.g., CAD-001"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional: Style Technical Details */}
                <details className="border-b pb-4">
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer mb-2">
                    Style Technical Details (Optional)
                  </summary>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="col-span-2">
                      <Label htmlFor={`line-${lineIndex}-description`}>Description</Label>
                      <Textarea
                        id={`line-${lineIndex}-description`}
                        value={line.description || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'description', e.target.value)}
                        placeholder="Style description"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-fabricComposition`}>Fabric Composition</Label>
                      <Input
                        id={`line-${lineIndex}-fabricComposition`}
                        value={line.fabricComposition || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'fabricComposition', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-gsm`}>GSM</Label>
                      <Input
                        id={`line-${lineIndex}-gsm`}
                        type="number"
                        value={line.gsm || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'gsm', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-cuttableWidth`}>Cuttable Width</Label>
                      <Input
                        id={`line-${lineIndex}-cuttableWidth`}
                        value={line.cuttableWidth || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'cuttableWidth', e.target.value)}
                        placeholder="e.g., 60 inches"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-finishingWidth`}>Finishing Width</Label>
                      <Input
                        id={`line-${lineIndex}-finishingWidth`}
                        value={line.finishingWidth || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'finishingWidth', e.target.value)}
                        placeholder="e.g., 58 inches"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`line-${lineIndex}-construction`}>Construction</Label>
                      <Textarea
                        id={`line-${lineIndex}-construction`}
                        value={line.construction || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'construction', e.target.value)}
                        placeholder="Construction details"
                        rows={2}
                      />
                    </div>
                  </div>
                </details>

                {/* Optional: Commercial Data */}
                <details>
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer mb-2 flex items-center justify-between">
                    <span>Commercial Data (Optional)</span>
                    {orderLines.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyCommercialDataToAll(lineIndex);
                        }}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy to All Lines
                      </Button>
                    )}
                  </summary>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div>
                      <Label htmlFor={`line-${lineIndex}-millPrice`}>Mill Price</Label>
                      <Input
                        id={`line-${lineIndex}-millPrice`}
                        type="number"
                        step="0.01"
                        value={line.millPrice || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'millPrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-provaPrice`}>Prova Price</Label>
                      <Input
                        id={`line-${lineIndex}-provaPrice`}
                        type="number"
                        step="0.01"
                        value={line.provaPrice || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'provaPrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-commission`}>Commission (%)</Label>
                      <Input
                        id={`line-${lineIndex}-commission`}
                        type="number"
                        step="0.01"
                        value={line.commission || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'commission', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-currency`}>Currency</Label>
                      <Input
                        id={`line-${lineIndex}-currency`}
                        value={line.currency || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'currency', e.target.value)}
                        placeholder="e.g., USD"
                      />
                    </div>
                  </div>
                </details>

                {/* Optional: Dates */}
                <details>
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Delivery & Approval Dates (Optional)
                    </span>
                    {orderLines.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyDatesToAll(lineIndex);
                        }}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy to All Lines
                      </Button>
                    )}
                  </summary>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <div>
                      <Label htmlFor={`line-${lineIndex}-etd`}>ETD</Label>
                      <Input
                        id={`line-${lineIndex}-etd`}
                        type="date"
                        value={line.etd || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'etd', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-eta`}>ETA</Label>
                      <Input
                        id={`line-${lineIndex}-eta`}
                        type="date"
                        value={line.eta || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'eta', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-submissionDate`}>Submission Date</Label>
                      <Input
                        id={`line-${lineIndex}-submissionDate`}
                        type="date"
                        value={line.submissionDate || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'submissionDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-approvalDate`}>Approval Date</Label>
                      <Input
                        id={`line-${lineIndex}-approvalDate`}
                        type="date"
                        value={line.approvalDate || ''}
                        onChange={(e) => updateOrderLine(lineIndex, 'approvalDate', e.target.value)}
                      />
                    </div>
                  </div>
                </details>

                {/* Optional: Notes */}
                <div>
                  <Label htmlFor={`line-${lineIndex}-notes`}>Line Notes</Label>
                  <Textarea
                    id={`line-${lineIndex}-notes`}
                    value={line.notes || ''}
                    onChange={(e) => updateOrderLine(lineIndex, 'notes', e.target.value)}
                    placeholder="Any specific notes for this line"
                    rows={2}
                  />
                </div>

                {/* Local Order Production Fields - Only shown for local orders */}
                {orderType === 'local' && (
                  <details className="border-t pt-4 mt-4">
                    <summary className="text-sm font-semibold text-green-700 cursor-pointer mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Production Tracking (Local Order)
                    </summary>
                    <div className="space-y-4 mt-3">
                      {/* Yarn Section */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor={`line-${lineIndex}-yarnRequired`}>Yarn Required</Label>
                          <Input
                            id={`line-${lineIndex}-yarnRequired`}
                            type="number"
                            step="0.01"
                            value={line.yarnRequired || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'yarnRequired', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-yarnBookedDate`}>Yarn Booked</Label>
                          <Input
                            id={`line-${lineIndex}-yarnBookedDate`}
                            type="date"
                            value={line.yarnBookedDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'yarnBookedDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-yarnReceivedDate`}>Yarn Received</Label>
                          <Input
                            id={`line-${lineIndex}-yarnReceivedDate`}
                            type="date"
                            value={line.yarnReceivedDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'yarnReceivedDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* PP & FIT Section */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor={`line-${lineIndex}-ppYards`}>PP Yards</Label>
                          <Input
                            id={`line-${lineIndex}-ppYards`}
                            type="number"
                            step="0.01"
                            value={line.ppYards || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'ppYards', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-fitCumPpSubmitDate`}>FIT CUM PP Submit</Label>
                          <Input
                            id={`line-${lineIndex}-fitCumPpSubmitDate`}
                            type="date"
                            value={line.fitCumPpSubmitDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'fitCumPpSubmitDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-fitCumPpCommentsDate`}>FIT CUM PP Comments</Label>
                          <Input
                            id={`line-${lineIndex}-fitCumPpCommentsDate`}
                            type="date"
                            value={line.fitCumPpCommentsDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'fitCumPpCommentsDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Production Dates */}
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor={`line-${lineIndex}-dyeingCompleteDate`}>Dyeing Complete</Label>
                          <Input
                            id={`line-${lineIndex}-dyeingCompleteDate`}
                            type="date"
                            value={line.dyeingCompleteDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'dyeingCompleteDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-bulkSizeSetDate`}>Bulk Size Set</Label>
                          <Input
                            id={`line-${lineIndex}-bulkSizeSetDate`}
                            type="date"
                            value={line.bulkSizeSetDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'bulkSizeSetDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-cuttingStartDate`}>Cutting Start</Label>
                          <Input
                            id={`line-${lineIndex}-cuttingStartDate`}
                            type="date"
                            value={line.cuttingStartDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'cuttingStartDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-cuttingCompleteDate`}>Cutting Complete</Label>
                          <Input
                            id={`line-${lineIndex}-cuttingCompleteDate`}
                            type="date"
                            value={line.cuttingCompleteDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'cuttingCompleteDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Print Section */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`line-${lineIndex}-printSendDate`}>Print Send</Label>
                          <Input
                            id={`line-${lineIndex}-printSendDate`}
                            type="date"
                            value={line.printSendDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'printSendDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-printReceivedDate`}>Print Received</Label>
                          <Input
                            id={`line-${lineIndex}-printReceivedDate`}
                            type="date"
                            value={line.printReceivedDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'printReceivedDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Sewing Section */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`line-${lineIndex}-sewingInputDate`}>Sewing Input</Label>
                          <Input
                            id={`line-${lineIndex}-sewingInputDate`}
                            type="date"
                            value={line.sewingInputDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'sewingInputDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-sewingFinishDate`}>Sewing Finish</Label>
                          <Input
                            id={`line-${lineIndex}-sewingFinishDate`}
                            type="date"
                            value={line.sewingFinishDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'sewingFinishDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Final Stage Section */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor={`line-${lineIndex}-packingCompleteDate`}>Packing Complete</Label>
                          <Input
                            id={`line-${lineIndex}-packingCompleteDate`}
                            type="date"
                            value={line.packingCompleteDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'packingCompleteDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-finalInspectionDate`}>Final Inspection</Label>
                          <Input
                            id={`line-${lineIndex}-finalInspectionDate`}
                            type="date"
                            value={line.finalInspectionDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'finalInspectionDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`line-${lineIndex}-exFactoryDate`}>Ex-Factory</Label>
                          <Input
                            id={`line-${lineIndex}-exFactoryDate`}
                            type="date"
                            value={line.exFactoryDate || ''}
                            onChange={(e) => updateOrderLine(lineIndex, 'exFactoryDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 italic">
                        Note: Knitting Start, Knitting Complete, and Dyeing Start dates will be auto-calculated based on Yarn Received date.
                      </p>
                    </div>
                  </details>
                )}
              </CardContent>
              )}
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addOrderLine} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Line
          </Button>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
