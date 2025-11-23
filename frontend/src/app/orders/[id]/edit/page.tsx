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
import { ArrowLeft, Save } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';

interface OrderFormData {
  customerName: string;
  buyerName: string;
  styleNumber: string;
  fabricType: string;
  fabricSpecifications: string;
  fabricComposition: string;
  gsm: string;
  finishType: string;
  construction: string;
  millName: string;
  millPrice: string;
  provaPrice: string;
  currency: string;
  quantity: string;
  unit: string;
  orderDate: string;
  expectedDeliveryDate: string;
  etd: string;
  eta: string;
  notes: string;
  merchandiser: string;
  colorBreakdown: Array<{ color: string; quantity: string }>;
}

export default function OrderEditPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [taskAssignment, setTaskAssignment] = useState({
    title: '',
    assignedTo: '',
  });
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    buyerName: '',
    styleNumber: '',
    fabricType: '',
    fabricSpecifications: '',
    fabricComposition: '',
    gsm: '',
    finishType: '',
    construction: '',
    millName: '',
    millPrice: '',
    provaPrice: '',
    currency: 'USD',
    quantity: '',
    unit: 'meters',
    orderDate: '',
    expectedDeliveryDate: '',
    etd: '',
    eta: '',
    notes: '',
    merchandiser: '',
    colorBreakdown: [{ color: '', quantity: '' }],
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();
    fetchUsers();
  }, [isAuthenticated, router, params.id]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${params.id}/`);
      const order = response.data;
      
      setFormData({
        customerName: order.customerName || '',
        buyerName: order.buyerName || '',
        styleNumber: order.styleNumber || '',
        fabricType: order.fabricType || '',
        fabricSpecifications: order.fabricSpecifications || '',
        fabricComposition: order.fabricComposition || '',
        gsm: order.gsm ? order.gsm.toString() : '',
        finishType: order.finishType || '',
        construction: order.construction || '',
        millName: order.millName || '',
        millPrice: order.millPrice ? order.millPrice.toString() : '',
        provaPrice: order.provaPrice ? order.provaPrice.toString() : '',
        currency: order.currency || 'USD',
        quantity: order.quantity ? order.quantity.toString() : '',
        unit: order.unit || 'meters',
        orderDate: order.orderDate || '',
        expectedDeliveryDate: order.expectedDeliveryDate || '',
        etd: order.etd || '',
        eta: order.eta || '',
        notes: order.notes || '',
        merchandiser: order.merchandiser || '',
        colorBreakdown: order.colorQuantityBreakdown && order.colorQuantityBreakdown.length > 0
          ? order.colorQuantityBreakdown.map((item: any) => ({
              color: item.color || '',
              quantity: item.quantity ? item.quantity.toString() : '',
            }))
          : [{ color: '', quantity: '' }],
      });
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
      const orderData: any = {
        customerName: formData.customerName,
        buyerName: formData.buyerName || undefined,
        styleNumber: formData.styleNumber || undefined,
        fabricType: formData.fabricType,
        fabricSpecifications: formData.fabricSpecifications || undefined,
        fabricComposition: formData.fabricComposition || undefined,
        gsm: formData.gsm ? parseFloat(formData.gsm) : undefined,
        finishType: formData.finishType || undefined,
        construction: formData.construction || undefined,
        millName: formData.millName || undefined,
        millPrice: formData.millPrice ? parseFloat(formData.millPrice) : undefined,
        provaPrice: formData.provaPrice ? parseFloat(formData.provaPrice) : undefined,
        currency: formData.currency,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        colorQuantityBreakdown: formData.colorBreakdown
          .filter(item => item.color && item.quantity)
          .map(item => ({
            color: item.color,
            quantity: parseFloat(item.quantity),
          })) || undefined,
        etd: formData.etd || undefined,
        eta: formData.eta || undefined,
        orderDate: formData.orderDate || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        notes: formData.notes || undefined,
        merchandiser: formData.merchandiser || undefined,
      };

      await api.patch(`/orders/${params.id}/`, orderData);

      // Assign task if provided
      if (taskAssignment.title && taskAssignment.assignedTo) {
        try {
          await api.post('/orders/tasks/', {
            order: params.id,
            title: taskAssignment.title,
            assignedTo: taskAssignment.assignedTo,
            priority: 'medium',
          });
          console.log('Task assigned successfully');
        } catch (taskError) {
          console.error('Error assigning task:', taskError);
          // Don't fail the entire operation if task assignment fails
        }
      }

      toast({
        title: 'Success',
        description: taskAssignment.title ? 'Order updated and task assigned successfully' : 'Order updated successfully',
      });

      router.push(`/orders/${params.id}`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      
      const errorMessage = Array.isArray(error.response?.data?.message) 
        ? error.response.data.message.join(', ')
        : error.response?.data?.message || error.message || 'Failed to update order';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addColorRow = () => {
    setFormData({
      ...formData,
      colorBreakdown: [...formData.colorBreakdown, { color: '', quantity: '' }],
    });
  };

  const removeColorRow = (index: number) => {
    const newBreakdown = formData.colorBreakdown.filter((_, i) => i !== index);
    setFormData({ 
      ...formData, 
      colorBreakdown: newBreakdown.length > 0 ? newBreakdown : [{ color: '', quantity: '' }] 
    });
  };

  const updateColorRow = (index: number, field: 'color' | 'quantity', value: string) => {
    const newBreakdown = [...formData.colorBreakdown];
    newBreakdown[index][field] = value;
    setFormData({ ...formData, colorBreakdown: newBreakdown });
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Button variant="ghost" onClick={() => router.push(`/orders/${params.id}`)} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Order Details
            </Button>
            <h1 className="text-3xl font-bold">Edit Order</h1>
            <p className="text-gray-500 mt-2">Update order information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input 
                      id="customerName" 
                      required 
                      value={formData.customerName} 
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerName">Buyer Name</Label>
                    <Input 
                      id="buyerName" 
                      value={formData.buyerName} 
                      onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="styleNumber">Style / Article Number</Label>
                    <Input 
                      id="styleNumber" 
                      placeholder="e.g., ST-2025-001" 
                      value={formData.styleNumber} 
                      onChange={(e) => setFormData({ ...formData, styleNumber: e.target.value })} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fabric Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Fabric Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fabricType">Fabric Type *</Label>
                    <Input 
                      id="fabricType" 
                      required 
                      placeholder="e.g., Single Jersey" 
                      value={formData.fabricType} 
                      onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fabricComposition">Composition</Label>
                    <Input 
                      id="fabricComposition" 
                      placeholder="e.g., 100% Cotton" 
                      value={formData.fabricComposition} 
                      onChange={(e) => setFormData({ ...formData, fabricComposition: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gsm">GSM</Label>
                    <Input 
                      id="gsm" 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g., 180" 
                      value={formData.gsm} 
                      onChange={(e) => setFormData({ ...formData, gsm: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="finishType">Finish Type</Label>
                    <Input 
                      id="finishType" 
                      placeholder="e.g., Peach Finish" 
                      value={formData.finishType} 
                      onChange={(e) => setFormData({ ...formData, finishType: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="construction">Construction</Label>
                    <Input 
                      id="construction" 
                      placeholder="e.g., 30/1 Combed Ring Spun" 
                      value={formData.construction} 
                      onChange={(e) => setFormData({ ...formData, construction: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="fabricSpecifications">Fabric Specifications</Label>
                    <Textarea 
                      id="fabricSpecifications" 
                      placeholder="Additional fabric specifications" 
                      value={formData.fabricSpecifications} 
                      onChange={(e) => setFormData({ ...formData, fabricSpecifications: e.target.value })} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mill & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Mill & Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="millName">Mill Name</Label>
                    <Input 
                      id="millName" 
                      placeholder="e.g., ABC Textile Mills" 
                      value={formData.millName} 
                      onChange={(e) => setFormData({ ...formData, millName: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="millPrice">Mill Price</Label>
                    <Input 
                      id="millPrice" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={formData.millPrice} 
                      onChange={(e) => setFormData({ ...formData, millPrice: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provaPrice">Prova Price (PI)</Label>
                    <Input 
                      id="provaPrice" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={formData.provaPrice} 
                      onChange={(e) => setFormData({ ...formData, provaPrice: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select 
                      id="currency" 
                      className="w-full h-10 px-3 border rounded-md" 
                      value={formData.currency} 
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="USD">USD</option>
                      <option value="BDT">BDT</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantity & Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Quantity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Total Quantity *</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.quantity} 
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <select 
                      id="unit" 
                      className="w-full h-10 px-3 border rounded-md" 
                      value={formData.unit} 
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="meters">Meters</option>
                      <option value="yards">Yards</option>
                      <option value="kilograms">Kilograms</option>
                      <option value="pieces">Pieces</option>
                    </select>
                  </div>
                </div>
                <Label className="mb-2 block">Color-wise Breakdown (Optional)</Label>
                {formData.colorBreakdown.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <Input 
                      className="col-span-5" 
                      placeholder="Color name" 
                      value={item.color} 
                      onChange={(e) => updateColorRow(index, 'color', e.target.value)} 
                    />
                    <Input 
                      className="col-span-5" 
                      type="number" 
                      step="0.01" 
                      placeholder="Quantity" 
                      value={item.quantity} 
                      onChange={(e) => updateColorRow(index, 'quantity', e.target.value)} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="col-span-2" 
                      onClick={() => removeColorRow(index)} 
                      disabled={formData.colorBreakdown.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addColorRow} className="mt-2">
                  + Add Color
                </Button>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Important Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input 
                      id="orderDate" 
                      type="date" 
                      value={formData.orderDate} 
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                    <Input 
                      id="expectedDeliveryDate" 
                      type="date" 
                      value={formData.expectedDeliveryDate} 
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="etd">ETD (Est. Time of Departure)</Label>
                    <Input 
                      id="etd" 
                      type="date" 
                      value={formData.etd} 
                      onChange={(e) => setFormData({ ...formData, etd: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eta">ETA (Est. Time of Arrival)</Label>
                    <Input 
                      id="eta" 
                      type="date" 
                      value={formData.eta} 
                      onChange={(e) => setFormData({ ...formData, eta: e.target.value })} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Any additional notes or comments..." 
                    value={formData.notes} 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Task Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Task Assignment (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskTitle">Task Title</Label>
                    <Input 
                      id="taskTitle" 
                      placeholder="e.g., Review fabric specifications" 
                      value={taskAssignment.title} 
                      onChange={(e) => setTaskAssignment({ ...taskAssignment, title: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignTo">Assign To</Label>
                    <Select 
                      value={taskAssignment.assignedTo} 
                      onValueChange={(value) => setTaskAssignment({ ...taskAssignment, assignedTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user to assign task" />
                      </SelectTrigger>
                      <SelectContent>
                        {users && Array.isArray(users) && users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Assign a task to any team member. They will be notified.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/orders/${params.id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
