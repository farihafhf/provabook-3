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
import { Plus, Trash2, X, Copy, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface StyleFormData {
  styleNumber?: string;
  description?: string;
  fabricType?: string;
  fabricComposition?: string;
  gsm?: string;
  finishType?: string;
  construction?: string;
  cuttableWidth?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  colors: ColorFormData[];
}

interface ColorFormData {
  colorCode: string;
  quantity: string;
  unit: string;
  millName?: string;
  millPrice?: string;
  provaPrice?: string;
  currency: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
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
    baseStyleNumber: '',
    fabricType: '',
    orderDate: '',
    notes: '',
    cad: '',
  });
  
  const [styles, setStyles] = useState<StyleFormData[]>([
    {
      colors: [
        {
          colorCode: '',
          quantity: '',
          unit: 'meters',
          currency: 'USD',
        },
      ],
    },
  ]);

  const addStyle = () => {
    setStyles([
      ...styles,
      {
        colors: [
          {
            colorCode: '',
            quantity: '',
            unit: 'meters',
            currency: 'USD',
          },
        ],
      },
    ]);
  };

  const removeStyle = (styleIndex: number) => {
    if (styles.length > 1) {
      setStyles(styles.filter((_, i) => i !== styleIndex));
    }
  };

  const addColor = (styleIndex: number) => {
    const newStyles = [...styles];
    newStyles[styleIndex].colors.push({
      colorCode: '',
      quantity: '',
      unit: 'meters',
      currency: 'USD',
    });
    setStyles(newStyles);
  };

  const removeColor = (styleIndex: number, colorIndex: number) => {
    const newStyles = [...styles];
    if (newStyles[styleIndex].colors.length > 1) {
      newStyles[styleIndex].colors = newStyles[styleIndex].colors.filter(
        (_, i) => i !== colorIndex
      );
      setStyles(newStyles);
    }
  };

  const updateStyle = (styleIndex: number, field: keyof StyleFormData, value: any) => {
    const newStyles = [...styles];
    newStyles[styleIndex] = { ...newStyles[styleIndex], [field]: value };
    setStyles(newStyles);
  };

  const updateColor = (
    styleIndex: number,
    colorIndex: number,
    field: keyof ColorFormData,
    value: any
  ) => {
    const newStyles = [...styles];
    newStyles[styleIndex].colors[colorIndex] = {
      ...newStyles[styleIndex].colors[colorIndex],
      [field]: value,
    };
    setStyles(newStyles);
  };

  const copyFirstStyleDatesToAll = () => {
    if (styles.length === 0) return;
    
    const firstStyle = styles[0];
    const newStyles = styles.map((style, index) => {
      if (index === 0) return style;
      return {
        ...style,
        etd: firstStyle.etd,
        eta: firstStyle.eta,
        submissionDate: firstStyle.submissionDate,
      };
    });
    
    setStyles(newStyles);
    toast({
      title: 'Dates Copied',
      description: `Dates from Style 1 copied to all ${styles.length - 1} other style(s)`,
    });
  };

  const validateForm = () => {
    // Validate required order fields
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

    if (!formData.baseStyleNumber.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Base style number is required',
        variant: 'destructive',
      });
      return false;
    }

    // Validate styles
    if (styles.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one style is required',
        variant: 'destructive',
      });
      return false;
    }

    for (let i = 0; i < styles.length; i++) {
      const style = styles[i];

      if (style.colors.length === 0) {
        toast({
          title: 'Validation Error',
          description: `Style ${i + 1}: At least one color is required`,
          variant: 'destructive',
        });
        return false;
      }

      for (let j = 0; j < style.colors.length; j++) {
        const color = style.colors[j];
        
        if (!color.colorCode.trim()) {
          toast({
            title: 'Validation Error',
            description: `Style ${i + 1}, Color ${j + 1}: Color code is required`,
            variant: 'destructive',
          });
          return false;
        }

        if (!color.quantity || parseFloat(color.quantity) <= 0) {
          toast({
            title: 'Validation Error',
            description: `Style ${i + 1}, Color ${j + 1}: Valid quantity is required`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    // Check for duplicate color codes across all styles
    const allColorCodes = styles.flatMap(style => 
      style.colors.map(c => c.colorCode.trim().toLowerCase())
    );
    const uniqueColorCodes = new Set(allColorCodes);
    if (allColorCodes.length !== uniqueColorCodes.size) {
      toast({
        title: 'Validation Error',
        description: 'Color codes must be unique across all styles in an order',
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
      // Prepare order data with styles
      const orderData = {
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        baseStyleNumber: formData.baseStyleNumber,
        fabricType: formData.fabricType,
        orderDate: formData.orderDate || undefined,
        notes: formData.notes || undefined,
        cad: formData.cad || undefined,
        status: 'upcoming',
        category: 'upcoming',
        // Calculate total quantity from all colors
        quantity: styles.reduce(
          (total, style) =>
            total +
            style.colors.reduce(
              (styleTotal, color) => styleTotal + (parseFloat(color.quantity) || 0),
              0
            ),
          0
        ),
        unit: 'meters',
        styles: styles.map((style) => ({
          styleNumber: style.styleNumber || undefined,
          description: style.description || undefined,
          fabricType: style.fabricType || formData.fabricType,
          fabricComposition: style.fabricComposition || undefined,
          gsm: style.gsm ? parseFloat(style.gsm) : undefined,
          finishType: style.finishType || undefined,
          construction: style.construction || undefined,
          cuttableWidth: style.cuttableWidth || undefined,
          etd: style.etd || undefined,
          eta: style.eta || undefined,
          submissionDate: style.submissionDate || undefined,
          colors: style.colors.map((color) => ({
            colorCode: color.colorCode,
            quantity: parseFloat(color.quantity),
            unit: color.unit,
            millName: color.millName || undefined,
            millPrice: color.millPrice ? parseFloat(color.millPrice) : undefined,
            provaPrice: color.provaPrice ? parseFloat(color.provaPrice) : undefined,
            currency: color.currency,
            etd: color.etd || undefined,
            eta: color.eta || undefined,
            submissionDate: color.submissionDate || undefined,
            approvalDate: color.approvalDate || undefined,
          })),
        })),
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
        baseStyleNumber: '',
        fabricType: '',
        orderDate: '',
        notes: '',
        cad: '',
      });
      setStyles([
        {
          colors: [
            {
              colorCode: '',
              quantity: '',
              unit: 'meters',
              currency: 'USD',
            },
          ],
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
            Add a new order with multiple styles and color variants
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
                <Label htmlFor="baseStyleNumber">
                  Base Style Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="baseStyleNumber"
                  value={formData.baseStyleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, baseStyleNumber: e.target.value })
                  }
                  placeholder="e.g., ST2024"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Styles will be auto-numbered as ST2024-01, ST2024-02, etc.
                </p>
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
                <Label htmlFor="cad">CAD</Label>
                <Input
                  id="cad"
                  value={formData.cad}
                  onChange={(e) =>
                    setFormData({ ...formData, cad: e.target.value })
                  }
                  placeholder="CAD reference or identifier"
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
                <p className="text-xs text-gray-500 mt-1">
                  Date when the order was placed
                </p>
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

          {/* Styles and Colors */}
          {styles.map((style, styleIndex) => (
            <Card key={styleIndex} className="relative">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Style {styleIndex + 1}
                </CardTitle>
                {styles.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStyle(styleIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Style Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <Label htmlFor={`style-${styleIndex}-number`}>Style Number</Label>
                    <Input
                      id={`style-${styleIndex}-number`}
                      value={style.styleNumber || ''}
                      onChange={(e) =>
                        updateStyle(styleIndex, 'styleNumber', e.target.value)
                      }
                      placeholder="e.g., ST2024-01 or any custom style number"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a custom style number for this style variant
                    </p>
                  </div>
                  <div className="col-span-3">
                    <Label>Description</Label>
                    <Textarea
                      value={style.description || ''}
                      onChange={(e) =>
                        updateStyle(styleIndex, 'description', e.target.value)
                      }
                      placeholder="Style description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Fabric Composition</Label>
                    <Input
                      value={style.fabricComposition || ''}
                      onChange={(e) =>
                        updateStyle(styleIndex, 'fabricComposition', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>GSM</Label>
                    <Input
                      type="number"
                      value={style.gsm || ''}
                      onChange={(e) => updateStyle(styleIndex, 'gsm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Cuttable Width</Label>
                    <Input
                      value={style.cuttableWidth || ''}
                      onChange={(e) =>
                        updateStyle(styleIndex, 'cuttableWidth', e.target.value)
                      }
                      placeholder="e.g., 60 inches"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Construction</Label>
                    <Textarea
                      value={style.construction || ''}
                      onChange={(e) =>
                        updateStyle(styleIndex, 'construction', e.target.value)
                      }
                      placeholder="Construction details including width and other info"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Style Dates */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Delivery Dates for This Style
                    </Label>
                    {styleIndex === 0 && styles.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyFirstStyleDatesToAll}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy to All Styles
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`style-${styleIndex}-etd`}>ETD (Est. Dispatch)</Label>
                      <Input
                        id={`style-${styleIndex}-etd`}
                        type="date"
                        value={style.etd || ''}
                        onChange={(e) => updateStyle(styleIndex, 'etd', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`style-${styleIndex}-eta`}>ETA (Est. Arrival)</Label>
                      <Input
                        id={`style-${styleIndex}-eta`}
                        type="date"
                        value={style.eta || ''}
                        onChange={(e) => updateStyle(styleIndex, 'eta', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`style-${styleIndex}-submission`}>Submission Date</Label>
                      <Input
                        id={`style-${styleIndex}-submission`}
                        type="date"
                        value={style.submissionDate || ''}
                        onChange={(e) => updateStyle(styleIndex, 'submissionDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Different styles can have different delivery schedules based on supplier availability
                  </p>
                </div>

                {/* Colors for this style */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Colors</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addColor(styleIndex)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Color
                    </Button>
                  </div>

                  {style.colors.map((color, colorIndex) => (
                    <Card key={colorIndex} className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium">
                            Color {colorIndex + 1}
                          </span>
                          {style.colors.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeColor(styleIndex, colorIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">
                              Color Code <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={color.colorCode}
                              onChange={(e) =>
                                updateColor(
                                  styleIndex,
                                  colorIndex,
                                  'colorCode',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., RED-01"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              Quantity <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={color.quantity}
                              onChange={(e) =>
                                updateColor(
                                  styleIndex,
                                  colorIndex,
                                  'quantity',
                                  e.target.value
                                )
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Select
                              value={color.unit}
                              onValueChange={(value) =>
                                updateColor(
                                  styleIndex,
                                  colorIndex,
                                  'unit',
                                  value
                                )
                              }
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
                          <div>
                            <Label className="text-xs">Currency</Label>
                            <Input
                              value={color.currency}
                              onChange={(e) =>
                                updateColor(
                                  styleIndex,
                                  colorIndex,
                                  'currency',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Mill Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={color.millPrice || ''}
                              onChange={(e) =>
                                updateColor(
                                  styleIndex,
                                  colorIndex,
                                  'millPrice',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Prova Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={color.provaPrice || ''}
                              onChange={(e) =>
                                updateColor(
                                  styleIndex,
                                  colorIndex,
                                  'provaPrice',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addStyle} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Style
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
