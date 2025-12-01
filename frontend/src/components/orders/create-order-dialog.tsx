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
  // Required
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
}

// Local order specific fields interface
interface LocalOrderFormData {
  yarnRequired: string;
  yarnBookedDate: string;
  yarnReceivedDate: string;
  ppYards: string;
  fitCumPpSubmitDate: string;
  fitCumPpCommentsDate: string;
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
  
  // Local order specific fields
  const [localOrderData, setLocalOrderData] = useState<LocalOrderFormData>({
    yarnRequired: '',
    yarnBookedDate: '',
    yarnReceivedDate: '',
    ppYards: '',
    fitCumPpSubmitDate: '',
    fitCumPpCommentsDate: '',
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
    if (!formData.customerName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Vendor name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.fabricType.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Fabric type is required',
        variant: 'destructive',
      });
      return false;
    }

    if (orderLines.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one order line is required',
        variant: 'destructive',
      });
      return false;
    }

    for (let i = 0; i < orderLines.length; i++) {
      const line = orderLines[i];

      if (!line.styleNumber.trim()) {
        toast({
          title: 'Validation Error',
          description: `Line ${i + 1}: Style number is required`,
          variant: 'destructive',
        });
        return false;
      }

      if (!line.quantity || parseFloat(line.quantity) <= 0) {
        toast({
          title: 'Validation Error',
          description: `Line ${i + 1}: Valid quantity is required`,
          variant: 'destructive',
        });
        return false;
      }
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
            lines: lines.map((line) => ({
              colorCode: line.colorCode || undefined,
              cadCode: line.cadCode || undefined,
              quantity: parseFloat(line.quantity),
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
      setLocalOrderData({
        yarnRequired: '',
        yarnBookedDate: '',
        yarnReceivedDate: '',
        ppYards: '',
        fitCumPpSubmitDate: '',
        fitCumPpCommentsDate: '',
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

          {/* Local Order Specific Fields */}
          {orderType === 'local' && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-lg flex items-center gap-2">
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
                      <Label htmlFor="yarnRequired">Yarn Required (Amount)</Label>
                      <Input
                        id="yarnRequired"
                        type="number"
                        step="0.01"
                        value={localOrderData.yarnRequired}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, yarnRequired: e.target.value })}
                        placeholder="e.g., 500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="yarnBookedDate">Yarn Booked Date</Label>
                      <Input
                        id="yarnBookedDate"
                        type="date"
                        value={localOrderData.yarnBookedDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, yarnBookedDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="yarnReceivedDate">Yarn Received Date</Label>
                      <Input
                        id="yarnReceivedDate"
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
                      <Label htmlFor="ppYards">PP Yards</Label>
                      <Input
                        id="ppYards"
                        type="number"
                        step="0.01"
                        value={localOrderData.ppYards}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, ppYards: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fitCumPpSubmitDate">FIT CUM PP Submit Date</Label>
                      <Input
                        id="fitCumPpSubmitDate"
                        type="date"
                        value={localOrderData.fitCumPpSubmitDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, fitCumPpSubmitDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fitCumPpCommentsDate">FIT CUM PP Comments Date</Label>
                      <Input
                        id="fitCumPpCommentsDate"
                        type="date"
                        value={localOrderData.fitCumPpCommentsDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, fitCumPpCommentsDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Production Dates Section */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-green-700 mb-3 block">Production Dates</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dyeingCompleteDate">Dyeing Complete Date</Label>
                      <Input
                        id="dyeingCompleteDate"
                        type="date"
                        value={localOrderData.dyeingCompleteDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, dyeingCompleteDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bulkSizeSetDate">Bulk Size Set Date</Label>
                      <Input
                        id="bulkSizeSetDate"
                        type="date"
                        value={localOrderData.bulkSizeSetDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, bulkSizeSetDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cuttingStartDate">Cutting Start Date</Label>
                      <Input
                        id="cuttingStartDate"
                        type="date"
                        value={localOrderData.cuttingStartDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, cuttingStartDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cuttingCompleteDate">Cutting Complete Date</Label>
                      <Input
                        id="cuttingCompleteDate"
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
                      <Label htmlFor="printSendDate">Print Send Date</Label>
                      <Input
                        id="printSendDate"
                        type="date"
                        value={localOrderData.printSendDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, printSendDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="printReceivedDate">Print Received Date</Label>
                      <Input
                        id="printReceivedDate"
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
                      <Label htmlFor="sewingInputDate">Sewing Input Date</Label>
                      <Input
                        id="sewingInputDate"
                        type="date"
                        value={localOrderData.sewingInputDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, sewingInputDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sewingFinishDate">Sewing Finish Date</Label>
                      <Input
                        id="sewingFinishDate"
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
                      <Label htmlFor="packingCompleteDate">Packing Complete Date</Label>
                      <Input
                        id="packingCompleteDate"
                        type="date"
                        value={localOrderData.packingCompleteDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, packingCompleteDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="finalInspectionDate">Final Inspection Date</Label>
                      <Input
                        id="finalInspectionDate"
                        type="date"
                        value={localOrderData.finalInspectionDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, finalInspectionDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exFactoryDate">Ex-Factory Date</Label>
                      <Input
                        id="exFactoryDate"
                        type="date"
                        value={localOrderData.exFactoryDate}
                        onChange={(e) => setLocalOrderData({ ...localOrderData, exFactoryDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 italic mt-4">
                  Note: Knitting Start, Knitting Complete, and Dyeing Start dates will be automatically calculated based on Yarn Received date and can be edited from the Edit Order page.
                </p>
              </CardContent>
            </Card>
          )}

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
                {/* Required Fields */}
                <div className="border-b pb-4">
                  <Label className="text-sm font-semibold text-indigo-700 mb-2 block">Required Information</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`line-${lineIndex}-styleNumber`}>
                        Style Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`line-${lineIndex}-styleNumber`}
                        value={line.styleNumber}
                        onChange={(e) => updateOrderLine(lineIndex, 'styleNumber', e.target.value)}
                        placeholder="e.g., ST-2024-01"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`line-${lineIndex}-quantity`}>
                        Quantity <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`line-${lineIndex}-quantity`}
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateOrderLine(lineIndex, 'quantity', e.target.value)}
                        required
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
