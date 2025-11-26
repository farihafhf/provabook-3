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
import { ArrowLeft, Save, Plus, Trash2, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';

interface ColorFormData {
  id?: string;
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
  notes?: string;
}

interface StyleFormData {
  id?: string;
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
  notes?: string;
  colors: ColorFormData[];
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
    baseStyleNumber: '',
    fabricType: '',
    orderDate: '',
    notes: '',
  });
  
  const [styles, setStyles] = useState<StyleFormData[]>([]);

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
        baseStyleNumber: order.baseStyleNumber || order.styleNumber || '',
        fabricType: order.fabricType || '',
        orderDate: order.orderDate || '',
        notes: order.notes || '',
      });

      // Set styles data if available
      if (order.styles && order.styles.length > 0) {
        setStyles(
          order.styles.map((style: any) => ({
            id: style.id,
            description: style.description || '',
            fabricType: style.fabricType || '',
            fabricComposition: style.fabricComposition || '',
            gsm: style.gsm ? style.gsm.toString() : '',
            finishType: style.finishType || '',
            construction: style.construction || '',
            cuttableWidth: style.cuttableWidth || '',
            etd: style.etd || '',
            eta: style.eta || '',
            submissionDate: style.submissionDate || '',
            notes: style.notes || '',
            colors: style.colors?.map((color: any) => ({
              id: color.id,
              colorCode: color.colorCode || '',
              quantity: color.quantity ? color.quantity.toString() : '',
              unit: color.unit || 'meters',
              millName: color.millName || '',
              millPrice: color.millPrice ? color.millPrice.toString() : '',
              provaPrice: color.provaPrice ? color.provaPrice.toString() : '',
              currency: color.currency || 'USD',
              etd: color.etd || '',
              eta: color.eta || '',
              submissionDate: color.submissionDate || '',
              notes: color.notes || '',
            })) || [{ colorCode: '', quantity: '', unit: 'meters', currency: 'USD' }],
          }))
        );
      } else {
        // Fallback to single style with basic data
        setStyles([
          {
            fabricType: order.fabricType || '',
            fabricComposition: order.fabricComposition || '',
            gsm: order.gsm ? order.gsm.toString() : '',
            finishType: order.finishType || '',
            construction: order.construction || '',
            colors: [
              {
                colorCode: '',
                quantity: order.quantity ? order.quantity.toString() : '',
                unit: order.unit || 'meters',
                currency: order.currency || 'USD',
              },
            ],
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
      const orderData = {
        poNumber: formData.poNumber || undefined,
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        baseStyleNumber: formData.baseStyleNumber,
        fabricType: formData.fabricType,
        orderDate: formData.orderDate || undefined,
        notes: formData.notes || undefined,
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
          id: style.id,
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
          notes: style.notes || undefined,
          colors: style.colors.map((color) => ({
            id: color.id,
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
            notes: color.notes || undefined,
          })),
        })),
      };

      await api.patch(`/orders/${params.id}/`, orderData);

      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });

      router.push(`/orders/${params.id}`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update order',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStyle = (index: number, field: keyof StyleFormData, value: any) => {
    const newStyles = [...styles];
    (newStyles[index] as any)[field] = value;
    setStyles(newStyles);
  };

  const updateColor = (styleIndex: number, colorIndex: number, field: keyof ColorFormData, value: any) => {
    const newStyles = [...styles];
    newStyles[styleIndex].colors[colorIndex] = {
      ...newStyles[styleIndex].colors[colorIndex],
      [field]: value,
    };
    setStyles(newStyles);
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
      newStyles[styleIndex].colors.splice(colorIndex, 1);
      setStyles(newStyles);
    }
  };

  const addStyle = () => {
    setStyles([
      ...styles,
      {
        colors: [{ colorCode: '', quantity: '', unit: 'meters', currency: 'USD' }],
      },
    ]);
  };

  const removeStyle = (index: number) => {
    if (styles.length > 1) {
      const newStyles = styles.filter((_, i) => i !== index);
      setStyles(newStyles);
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
          <p className="text-gray-500 mt-1">Update order information and styles</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
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
                  <Label htmlFor="customerName">Customer Name *</Label>
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
                  <Label htmlFor="baseStyleNumber">Base Style Number *</Label>
                  <Input
                    id="baseStyleNumber"
                    required
                    placeholder="e.g., ST2024"
                    value={formData.baseStyleNumber}
                    onChange={(e) => setFormData({ ...formData, baseStyleNumber: e.target.value })}
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
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Styles */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Styles</h2>
              <Button type="button" variant="outline" onClick={addStyle}>
                <Plus className="h-4 w-4 mr-1" />
                Add Style
              </Button>
            </div>

            {styles.map((style, styleIndex) => (
              <Card key={styleIndex} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      Style {styleIndex + 1}
                      {formData.baseStyleNumber && ` (${formData.baseStyleNumber}-${String(styleIndex + 1).padStart(2, '0')})`}
                    </CardTitle>
                    {styles.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeStyle(styleIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Style Details */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-4">
                      <Label className="text-sm">Description</Label>
                      <Textarea
                        value={style.description || ''}
                        onChange={(e) => updateStyle(styleIndex, 'description', e.target.value)}
                        placeholder="Style description"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Fabric Composition</Label>
                      <Input
                        value={style.fabricComposition || ''}
                        onChange={(e) => updateStyle(styleIndex, 'fabricComposition', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">GSM</Label>
                      <Input
                        type="number"
                        value={style.gsm || ''}
                        onChange={(e) => updateStyle(styleIndex, 'gsm', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Finish Type</Label>
                      <Input
                        value={style.finishType || ''}
                        onChange={(e) => updateStyle(styleIndex, 'finishType', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Cuttable Width</Label>
                      <Input
                        value={style.cuttableWidth || ''}
                        onChange={(e) => updateStyle(styleIndex, 'cuttableWidth', e.target.value)}
                        placeholder="e.g., 60 inches"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-sm">Construction</Label>
                      <Textarea
                        value={style.construction || ''}
                        onChange={(e) => updateStyle(styleIndex, 'construction', e.target.value)}
                        placeholder="Construction details"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Style Dates */}
                  <div className="border-t pt-3">
                    <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      Delivery Dates
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">ETD</Label>
                        <Input
                          type="date"
                          value={style.etd || ''}
                          onChange={(e) => updateStyle(styleIndex, 'etd', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">ETA</Label>
                        <Input
                          type="date"
                          value={style.eta || ''}
                          onChange={(e) => updateStyle(styleIndex, 'eta', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Submission Date</Label>
                        <Input
                          type="date"
                          value={style.submissionDate || ''}
                          onChange={(e) => updateStyle(styleIndex, 'submissionDate', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-sm font-semibold">Color Variants</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addColor(styleIndex)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Color
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {style.colors.map((color, colorIndex) => (
                        <div key={colorIndex} className="border rounded p-3 bg-gray-50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">Color {colorIndex + 1}</span>
                            {style.colors.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeColor(styleIndex, colorIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            <div>
                              <Label className="text-xs">Color Code *</Label>
                              <Input
                                value={color.colorCode}
                                onChange={(e) => updateColor(styleIndex, colorIndex, 'colorCode', e.target.value)}
                                required
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantity *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={color.quantity}
                                onChange={(e) => updateColor(styleIndex, colorIndex, 'quantity', e.target.value)}
                                required
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Unit</Label>
                              <Select
                                value={color.unit}
                                onValueChange={(value) => updateColor(styleIndex, colorIndex, 'unit', value)}
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
                              <Label className="text-xs">Mill Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={color.millPrice || ''}
                                onChange={(e) => updateColor(styleIndex, colorIndex, 'millPrice', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Prova Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={color.provaPrice || ''}
                                onChange={(e) => updateColor(styleIndex, colorIndex, 'provaPrice', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Currency</Label>
                              <Input
                                value={color.currency}
                                onChange={(e) => updateColor(styleIndex, colorIndex, 'currency', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
