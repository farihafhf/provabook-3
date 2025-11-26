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
import { Plus, Trash2, Calendar, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface OrderLineFormData {
  styleNumber: string;
  quantity: string;
  unit: string;
  colorCode?: string;
  cadCode?: string;
  millPrice?: string;
  provaPrice?: string;
  commission?: string;
  currency?: string;
  etd?: string;
  eta?: string;
  notes?: string;
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
  const [formData, setFormData] = useState({
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
      unit: 'meters',
      currency: 'USD',
    },
  ]);

  const addOrderLine = () => {
    setOrderLines([
      ...orderLines,
      {
        styleNumber: '',
        quantity: '',
        unit: 'meters',
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

  const validateForm = () => {
    if (!formData.customerName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer name is required',
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

      const orderData = {
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        fabricType: formData.fabricType,
        orderDate: formData.orderDate || undefined,
        notes: formData.notes || undefined,
        status: 'upcoming',
        category: 'upcoming',
        quantity: orderLines.reduce(
          (total, line) => total + (parseFloat(line.quantity) || 0),
          0
        ),
        unit: 'meters',
        styles: Array.from(styleGroups.entries()).map(([styleNumber, lines]) => {
          const firstLine = lines[0];
          return {
            styleNumber: styleNumber,
            fabricType: formData.fabricType,
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
              notes: line.notes || undefined,
            })),
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
          unit: 'meters',
          currency: 'USD',
        },
      ]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Add order lines - each line is a Style + optional Color + optional CAD combination
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">
                  Customer Name <span className="text-red-500">*</span>
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
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="text-lg flex items-center gap-2">
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
                {orderLines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOrderLine(lineIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
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

                {/* Optional: Commercial Data */}
                <details>
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer mb-2">
                    Commercial Data (Optional)
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
                  </div>
                </details>

                {/* Optional: Dates */}
                <details>
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer mb-2 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Delivery Dates (Optional)
                  </summary>
                  <div className="grid grid-cols-2 gap-3 mt-2">
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
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
