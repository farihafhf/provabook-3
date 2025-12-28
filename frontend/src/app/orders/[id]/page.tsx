'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Package, FileText, Printer, Download, Calendar, Edit2, Truck, Plus, Trash2, Pencil, DollarSign, ChevronDown, ChevronRight, Scissors, Droplets, Calculator, FlaskConical, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, downloadBlob } from '@/lib/utils';
import { FileUpload } from '@/components/file-upload';
import { DocumentList } from '@/components/document-list';
import { PrintableOrder } from '@/components/printable-order';
import { OrderTimeline, type TimelineEvent } from '@/components/orders/order-timeline';
import { LineItemCard } from '@/components/orders/line-item-card';
import { LineItemDetailSheet } from '@/components/orders/line-item-detail-sheet';
import { DocumentTrackingTimeline } from '@/components/orders/document-tracking-timeline';

interface MillOffer {
  id: string;
  orderLineId: string;
  millName: string;
  price: number;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderLine {
  id: string;
  styleId: string;
  styleNumber?: string;
  colorCode?: string;
  colorName?: string;
  cadCode?: string;
  cadName?: string;
  quantity: number;
  unit: string;
  millName?: string;
  millPrice?: number;
  provaPrice?: number;
  commission?: number;
  currency?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
  approvalStatus?: Record<string, string>;
  status?: string;
  notes?: string;
  totalValue?: number;
  totalCost?: number;
  profit?: number;
  lineLabel?: string;
  // Style-level fields (populated when line is selected)
  description?: string;
  fabricComposition?: string;
  gsm?: number;
  cuttableWidth?: string;
  finishingWidth?: string;
  // Local order production fields - greige/yarn calculation
  processLossPercent?: number;
  mixedFabricType?: string;
  mixedFabricPercent?: number;
  greigeQuantity?: number;
  yarnRequired?: number;
  // Mill offers for development stage
  millOffers?: MillOffer[];
  // Swatch dates for In Development status
  swatchReceivedDate?: string;
  swatchSentDate?: string;
}

interface OrderColor {
  id: string;
  colorCode: string;
  colorName?: string;
  quantity: number;
  unit: string;
  millName?: string;
  millPrice?: number;
  provaPrice?: number;
  currency?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  approvalDate?: string;
  notes?: string;
}

interface OrderStyle {
  id: string;
  styleNumber: string;
  description?: string;
  fabricType?: string;
  fabricComposition?: string;
  gsm?: number;
  finishType?: string;
  construction?: string;
  cuttableWidth?: string;
  finishingWidth?: string;
  etd?: string;
  eta?: string;
  submissionDate?: string;
  notes?: string;
  colors: OrderColor[];
  lines: OrderLine[];
  createdAt: string;
  updatedAt: string;
}

interface SupplierDelivery {
  id: string;
  order: string;
  poNumber?: string;
  orderLine?: string;
  orderLineLabel?: string;
  style?: string;
  styleNumber?: string;
  color?: string;
  colorCode?: string;
  colorName?: string;
  cad?: string;
  cadCode?: string;
  cadName?: string;
  deliveryDate: string;
  deliveredQuantity: number;
  unit: string;
  notes?: string;
  createdBy?: string;
  createdByDetails?: any;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// Production entry types for local orders
type ProductionEntryType = 'knitting' | 'dyeing' | 'finishing';

interface ProductionEntry {
  id: string;
  order: string;
  orderNumber?: string;
  orderLine?: string;
  orderLineLabel?: string;
  styleNumber?: string;
  colorCode?: string;
  cadCode?: string;
  entryType: ProductionEntryType;
  entryTypeDisplay?: string;
  entryDate: string;
  quantity: number;
  unit: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ProductionSummary {
  totalKnitting: number;
  totalDyeing: number;
  totalFinishing: number;
  totalGreige: number;
  totalYarn: number;
  totalDelivered: number;
  knittingEntriesCount: number;
  dyeingEntriesCount: number;
  finishingEntriesCount: number;
  knittingPercent: number;
  dyeingPercent: number;
  finishingPercent: number;
  yarnPercent: number;
}

interface Order {
  id: string;
  poNumber: string;
  customerName: string;
  buyerName?: string;
  baseStyleNumber?: string;
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
    handloom?: string;
    aop?: string;
    qualityTest?: string;
    quality?: string;
    bulkSwatch?: string;
    price?: string;
    ppSample?: string;
  };
  approvalHistoryData?: Array<{
    id: string;
    approvalType: string;
    status: string;
    changedByName?: string;
    changedByEmail?: string;
    createdAt: string;
    orderLineId?: string;
    lineLabel?: string;
    styleNumber?: string;
    colorCode?: string;
    cadCode?: string;
  }>;
  styles?: OrderStyle[];
  merchandiser?: string;
  merchandiserDetails?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    phone?: string;
    department?: string;
  };
  // Delivery and profit metrics
  totalDeliveredQuantity?: number;
  shortageExcessQuantity?: number;
  potentialProfit?: number;
  realizedProfit?: number;
  totalValue?: number;
  realizedValue?: number;
  orderType?: 'local' | 'foreign';
  // Production summary for local orders
  productionSummary?: ProductionSummary;
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('lineitems');
  const [statusSelection, setStatusSelection] = useState<string>('upcoming');
  const [downloadingPO, setDownloadingPO] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assigningTask, setAssigningTask] = useState(false);
  const [showAssignConfirmDialog, setShowAssignConfirmDialog] = useState(false);
  const [currentAssignedTask, setCurrentAssignedTask] = useState<any>(null);

  // Reset dropdown after fetching current task (don't auto-sync to avoid cache issues)
  useEffect(() => {
    setSelectedUser('');
  }, [currentAssignedTask]);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleDates, setStyleDates] = useState<{[key: string]: {etd: string; eta: string; submissionDate: string}}>({});
  const [isOrderInfoOpen, setIsOrderInfoOpen] = useState(true);
  const [isStatusCardOpen, setIsStatusCardOpen] = useState(true);
  const [isProfitSummaryOpen, setIsProfitSummaryOpen] = useState(true);
  const [selectedStyleForApproval, setSelectedStyleForApproval] = useState<string>('all');
  const [expandedOrderLines, setExpandedOrderLines] = useState<Set<string>>(new Set()); // Track expanded lines by line.id
  const [lineStatusSelections, setLineStatusSelections] = useState<{[key: string]: string}>({}); // Track status selection per line
  const [selectedLineItem, setSelectedLineItem] = useState<OrderLine | null>(null); // For detail sheet
  const [showLineItemSheet, setShowLineItemSheet] = useState(false);
  
  // Supplier Deliveries state
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<SupplierDelivery | null>(null);
  const [deliveryFormData, setDeliveryFormData] = useState({
    lineItem: '',  // Direct line item ID selection
    style: '',
    color: '',
    cad: '',
    deliveryDate: '',
    deliveredQuantity: '',
    notes: ''
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Production Entries state (for local orders)
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [showProductionDialog, setShowProductionDialog] = useState(false);
  const [editingProductionEntry, setEditingProductionEntry] = useState<ProductionEntry | null>(null);
  const [productionFormData, setProductionFormData] = useState({
    lineItem: '',
    entryType: 'knitting' as ProductionEntryType,
    entryDate: '',
    quantity: '',
    unit: 'kg',
    notes: ''
  });
  const [savingProductionEntry, setSavingProductionEntry] = useState(false);

  // Greige/Yarn Calculations Dialog state
  const [showCalculationsDialog, setShowCalculationsDialog] = useState(false);

  // Helper function to calculate greige for a line
  const calculateLineGreige = (line: OrderLine): number => {
    if (line.greigeQuantity) return line.greigeQuantity;
    const qty = line.quantity || 0;
    const lossPercent = (line.processLossPercent || 0) / 100;
    return qty * (1 + lossPercent);
  };

  // Helper function to calculate yarn for a line
  const calculateLineYarn = (line: OrderLine): number => {
    if (line.yarnRequired) return line.yarnRequired;
    const greige = calculateLineGreige(line);
    const mixedPercent = (line.mixedFabricPercent || 0) / 100;
    return greige * (1 - mixedPercent);
  };

  // Calculate total greige and yarn from all lines
  const calculateTotalGreige = (): number => {
    if (!order?.styles) return order?.quantity || 0;
    let total = 0;
    for (const style of order.styles) {
      for (const line of style.lines || []) {
        total += calculateLineGreige(line);
      }
    }
    return total > 0 ? total : order?.quantity || 0;
  };

  const calculateTotalYarn = (): number => {
    if (!order?.styles) return order?.quantity || 0;
    let total = 0;
    for (const style of order.styles) {
      for (const line of style.lines || []) {
        total += calculateLineYarn(line);
      }
    }
    return total > 0 ? total : order?.quantity || 0;
  };

  // Get actual greige to use (calculated if not from backend)
  const getActualTotalGreige = (): number => {
    const backendGreige = order?.productionSummary?.totalGreige;
    const calculatedGreige = calculateTotalGreige();
    // Use calculated greige if it differs from order quantity (meaning process loss is set)
    if (calculatedGreige > (order?.quantity || 0)) {
      return calculatedGreige;
    }
    return backendGreige || calculatedGreige;
  };

  // Use backend-calculated percentages that account for delivered quantity
  // Progress = max(production_entries, delivered_qty)
  const getKnittingPercent = (): number => {
    // Use backend percentage which accounts for delivered qty
    return order?.productionSummary?.knittingPercent || 0;
  };

  const getDyeingPercent = (): number => {
    // Use backend percentage which accounts for delivered qty
    return order?.productionSummary?.dyeingPercent || 0;
  };

  const getFinishingPercent = (): number => {
    // Use backend percentage which accounts for delivered qty
    return order?.productionSummary?.finishingPercent || 0;
  };
  
  // Get effective quantities that account for delivery (max of production entries or delivered)
  const getEffectiveKnitting = (): number => {
    const ps = order?.productionSummary;
    if (!ps) return 0;
    return Math.max(ps.totalKnitting, ps.totalDelivered || 0);
  };
  
  const getEffectiveDyeing = (): number => {
    const ps = order?.productionSummary;
    if (!ps) return 0;
    return Math.max(ps.totalDyeing, ps.totalDelivered || 0);
  };
  
  const getEffectiveFinishing = (): number => {
    const ps = order?.productionSummary;
    if (!ps) return 0;
    return Math.max(ps.totalFinishing, ps.totalDelivered || 0);
  };

  const toggleOrderLineExpanded = (lineId: string) => {
    const newExpanded = new Set(expandedOrderLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedOrderLines(newExpanded);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();
    fetchDocuments();
    fetchUsers();
    fetchDeliveries();
    fetchCurrentTask();
    fetchProductionEntries(); // Fetch production entries for local orders
  }, [isAuthenticated, router, params.id]);

  // Update selectedLineItem when order data changes (e.g., after approval/status changes)
  // This ensures the popup shows fresh data without needing to close and reopen
  useEffect(() => {
    if (!order || !selectedLineItem) return;
    
    // Find the updated line data from the refreshed order
    for (const style of (order.styles || [])) {
      const updatedLine = style.lines?.find((l: OrderLine) => l.id === selectedLineItem.id);
      if (updatedLine) {
        // Update selectedLineItem with fresh data, preserving style-level fields
        setSelectedLineItem({
          ...updatedLine,
          styleNumber: style.styleNumber,
          description: style.description,
          fabricComposition: style.fabricComposition,
          gsm: style.gsm,
          cuttableWidth: style.cuttableWidth,
          finishingWidth: style.finishingWidth,
        });
        return;
      }
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      // Add cache-busting to prevent stale state
      const response = await api.get(`/orders/${params.id}`, {
        params: { _t: Date.now() }
      });
      setOrder(response.data);
      if (response.data?.status) {
        setStatusSelection(response.data.status);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/orders/${params.id}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      const data = response.data as any;
      const usersArray = Array.isArray(data) ? data : data?.results || [];
      setUsers(usersArray);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCurrentTask = async () => {
    try {
      const response = await api.get('/orders/tasks/', {
        params: { order_id: params.id, status: 'pending' }
      });
      console.log('Tasks API response:', response.data);
      const tasks = Array.isArray(response.data) ? response.data : response.data?.results || [];
      console.log('Filtered pending tasks:', tasks);
      // Get the most recent pending task
      if (tasks.length > 0) {
        const task = tasks[0];
        console.log('Current assigned task:', task);
        setCurrentAssignedTask(task);
      } else {
        console.log('No pending tasks found');
        setCurrentAssignedTask(null);
      }
    } catch (error) {
      console.error('Failed to fetch current task:', error);
      setCurrentAssignedTask(null);
    }
  };

  const fetchDeliveries = async () => {
    try {
      // Add timestamp to prevent caching and use Axios params so interceptor
      // can safely append trailing slashes without breaking the URL
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/supplier-deliveries/', {
        params: {
          order: params.id,
          _t: timestamp,
        },
      });
      console.log('Fetched deliveries:', response.data);
      setDeliveries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    }
  };

  const fetchProductionEntries = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await api.get('/orders/production-entries/', {
        params: {
          order: params.id,
          _t: timestamp,
        },
      });
      console.log('Fetched production entries:', response.data);
      setProductionEntries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch production entries:', error);
    }
  };

  const handleAddProductionEntry = (entryType?: ProductionEntryType) => {
    setEditingProductionEntry(null);
    setProductionFormData({
      lineItem: '',
      entryType: entryType || 'knitting',
      entryDate: new Date().toISOString().split('T')[0],
      quantity: '',
      unit: 'kg',
      notes: ''
    });
    setShowProductionDialog(true);
  };

  const handleEditProductionEntry = (entry: ProductionEntry) => {
    setEditingProductionEntry(entry);
    setProductionFormData({
      lineItem: entry.orderLine || '',
      entryType: entry.entryType,
      entryDate: entry.entryDate,
      quantity: entry.quantity.toString(),
      unit: entry.unit,
      notes: entry.notes || ''
    });
    setShowProductionDialog(true);
  };

  const handleSaveProductionEntry = async () => {
    if (!productionFormData.entryDate || !productionFormData.quantity) {
      toast({
        title: 'Error',
        description: 'Please fill in date and quantity',
        variant: 'destructive',
      });
      return;
    }

    setSavingProductionEntry(true);
    try {
      const payload = {
        order: order?.id,
        orderLine: productionFormData.lineItem && productionFormData.lineItem !== 'general' ? productionFormData.lineItem : undefined,
        entryType: productionFormData.entryType,
        entryDate: productionFormData.entryDate,
        quantity: parseFloat(productionFormData.quantity),
        unit: productionFormData.unit,
        notes: productionFormData.notes || undefined
      };

      if (editingProductionEntry) {
        const response = await api.patch(`/orders/production-entries/${editingProductionEntry.id}/`, payload);
        console.log('Production entry updated:', response.data);
        // Update state with response data
        setProductionEntries(prev => prev.map(e => e.id === editingProductionEntry.id ? response.data : e));
        toast({
          title: 'Success',
          description: 'Production entry updated successfully',
        });
      } else {
        const response = await api.post('/orders/production-entries/', payload);
        console.log('Production entry created:', response.data);
        // Add new entry to state
        setProductionEntries(prev => [response.data, ...prev]);
        toast({
          title: 'Success',
          description: 'Production entry recorded successfully',
        });
      }

      setShowProductionDialog(false);
      // Refetch order to update summary
      fetchOrder();
    } catch (error: any) {
      console.error('Failed to save production entry:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save production entry',
        variant: 'destructive',
      });
    } finally {
      setSavingProductionEntry(false);
    }
  };

  const handleDeleteProductionEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await api.delete(`/orders/production-entries/${entryId}/`);
      setProductionEntries(prev => prev.filter(e => e.id !== entryId));
      toast({
        title: 'Success',
        description: 'Production entry deleted',
      });
      // Refetch order to update summary
      fetchOrder();
    } catch (error) {
      console.error('Failed to delete production entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete production entry',
        variant: 'destructive',
      });
    }
  };

  const getEntryTypeDisplay = (type: ProductionEntryType): string => {
    const displays: Record<ProductionEntryType, string> = {
      knitting: 'Knitting',
      dyeing: 'Dyeing',
      finishing: 'Finishing'
    };
    return displays[type] || type;
  };

  const getEntryTypeBadgeClass = (type: ProductionEntryType): string => {
    const classes: Record<ProductionEntryType, string> = {
      knitting: 'bg-blue-100 text-blue-800',
      dyeing: 'bg-purple-100 text-purple-800',
      finishing: 'bg-green-100 text-green-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  const handleAddDelivery = () => {
    setEditingDelivery(null);
    setDeliveryFormData({
      lineItem: '',  // Direct line item ID selection
      style: '',
      color: '',
      cad: '',
      deliveryDate: order?.etd || new Date().toISOString().split('T')[0],
      deliveredQuantity: '',
      notes: ''
    });
    setShowDeliveryDialog(true);
  };

  const handleEditDelivery = (delivery: SupplierDelivery) => {
    setEditingDelivery(delivery);
    setDeliveryFormData({
      lineItem: delivery.orderLine || '',  // Set the line item from existing delivery
      style: delivery.style || '',
      color: delivery.color || '',
      cad: delivery.cad || '',
      deliveryDate: delivery.deliveryDate,
      deliveredQuantity: delivery.deliveredQuantity.toString(),
      notes: delivery.notes || ''
    });
    setShowDeliveryDialog(true);
  };

  // Auto-calculate order line based on style, color, and CAD selections
  const findMatchingOrderLine = (): string | undefined => {
    if (!order?.styles || !deliveryFormData.style) return undefined;

    const selectedStyle = order.styles.find(s => s.id === deliveryFormData.style);
    if (!selectedStyle?.lines || selectedStyle.lines.length === 0) return undefined;

    // Get selected color code (not ID)
    const selectedColorCode = deliveryFormData.color 
      ? selectedStyle.colors.find(c => c.id === deliveryFormData.color)?.colorCode
      : undefined;

    // Find matching line based on style + color + CAD combination
    const matchingLine = selectedStyle.lines.find(line => {
      // If both color and CAD are provided, match both
      if (selectedColorCode && deliveryFormData.cad) {
        return line.colorCode === selectedColorCode && line.id === deliveryFormData.cad;
      }
      // If only color is provided, match color (and line should have no CAD or any CAD)
      if (selectedColorCode && !deliveryFormData.cad) {
        return line.colorCode === selectedColorCode;
      }
      // If only CAD is provided, match CAD (and line should have no color or any color)
      if (!selectedColorCode && deliveryFormData.cad) {
        return line.id === deliveryFormData.cad;
      }
      // If neither color nor CAD, match any line from this style
      return true;
    });

    return matchingLine?.id;
  };

  const handleSaveDelivery = async () => {
    if (!deliveryFormData.deliveryDate || !deliveryFormData.deliveredQuantity) {
      toast({
        title: 'Error',
        description: 'Please fill in delivery date and quantity',
        variant: 'destructive',
      });
      return;
    }

    setSavingDelivery(true);
    try {
      // Use direct lineItem selection if provided, otherwise fall back to auto-calculation
      const orderLineId = deliveryFormData.lineItem || findMatchingOrderLine();

      const payload = {
        order: order?.id,
        orderLine: orderLineId || undefined,
        style: deliveryFormData.style || undefined,
        color: deliveryFormData.color || undefined,
        cad: deliveryFormData.cad || undefined,
        deliveryDate: deliveryFormData.deliveryDate,
        deliveredQuantity: parseFloat(deliveryFormData.deliveredQuantity),
        unit: order?.unit || 'meters',
        notes: deliveryFormData.notes || undefined
      };

      if (editingDelivery) {
        const response = await api.patch(`/orders/supplier-deliveries/${editingDelivery.id}/`, payload);
        console.log('Delivery updated response:', response.data);
        toast({
          title: 'Success',
          description: 'Delivery updated successfully',
        });
      } else {
        const response = await api.post('/orders/supplier-deliveries/', payload);
        console.log('Delivery created response:', response.data);
        toast({
          title: 'Success',
          description: 'Delivery recorded successfully',
        });
      }

      setShowDeliveryDialog(false);
      console.log('Fetching deliveries after save...');
      await fetchDeliveries();
      console.log('Deliveries fetched, current state:', deliveries);
    } catch (error: any) {
      console.error('Failed to save delivery:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save delivery',
        variant: 'destructive',
      });
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!confirm('Are you sure you want to delete this delivery record?')) {
      return;
    }

    try {
      await api.delete(`/orders/supplier-deliveries/${deliveryId}/`);
      toast({
        title: 'Success',
        description: 'Delivery deleted successfully',
      });
      await fetchDeliveries();
    } catch (error: any) {
      console.error('Failed to delete delivery:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete delivery',
        variant: 'destructive',
      });
    }
  };

  const getTotalDeliveredQuantity = () => {
    return deliveries.reduce((sum, d) => sum + d.deliveredQuantity, 0);
  };

  const getRemainingQuantity = () => {
    if (!order) return 0;
    return order.quantity - getTotalDeliveredQuantity();
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    if (userId) {
      setShowAssignConfirmDialog(true);
    }
  };

  const handleConfirmAssignTask = async () => {
    if (!selectedUser) {
      return;
    }

    const normalizedTitle = order?.poNumber ? `Order task for PO ${order.poNumber}` : 'Order task';

    setAssigningTask(true);
    try {
      await api.post('/orders/tasks', {
        order: order?.id,
        title: normalizedTitle,
        assignedTo: selectedUser,
        priority: 'medium',
      });

      toast({
        title: 'Success',
        description: 'Task assigned successfully',
      });

      setShowAssignConfirmDialog(false);
      setSelectedUser('');
      
      // If merchandiser reassigns to someone else, redirect to orders list
      // Managers can stay on the page since they can see all orders
      if (currentUser?.role === 'merchandiser' && selectedUser !== currentUser?.id) {
        // Navigate to the appropriate orders list based on order type
        router.push(order?.orderType === 'local' ? '/production' : '/orders');
      } else {
        // Manager or reassigning to self - refresh data
        await fetchCurrentTask();
        await fetchOrder();
      }
    } catch (error: any) {
      console.error('Error assigning task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign task',
        variant: 'destructive',
      });
    } finally {
      setAssigningTask(false);
    }
  };

  const handleCancelAssignTask = () => {
    setShowAssignConfirmDialog(false);
    if (currentAssignedTask && currentAssignedTask.assignedTo) {
      setSelectedUser(currentAssignedTask.assignedTo);
    } else {
      setSelectedUser('');
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

      // Refetch order to get updated data (no toast for better UX)
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

  const handleLineApprovalChange = async (approvalType: string, newStatus: string, lineId: string, lineLabel: string, customTimestamp?: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/approvals/`, {
        approvalType,
        status: newStatus,
        orderLineId: lineId,
        ...(customTimestamp && { customTimestamp }),
      });

      // Refetch order to get updated data (no toast for better UX)
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update line approval:', error);
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
      const response = await api.get(`/orders/${order.id}/download-po`, {
        responseType: 'blob',
      });

      const disposition =
        response.headers['content-disposition'] || response.headers['Content-Disposition'];
      let filename = `PO-${order.poNumber}.pdf`;

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

  const handleEditStyleDates = (styleId: string, etd: string, eta: string, submissionDate: string) => {
    setEditingStyleId(styleId);
    setStyleDates(prev => ({
      ...prev,
      [styleId]: { etd, eta, submissionDate }
    }));
  };

  const handleSaveStyleDates = async (styleId: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      const dates = styleDates[styleId];
      await api.patch(`/orders/styles/${styleId}/`, {
        etd: dates.etd || null,
        eta: dates.eta || null,
        submissionDate: dates.submissionDate || null,
      });

      toast({
        title: 'Success',
        description: 'Style dates updated successfully',
      });

      setEditingStyleId(null);
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update style dates:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update dates',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEditDates = () => {
    setEditingStyleId(null);
    setStyleDates({});
  };

  const handleConfirmStatusChange = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const resp = await api.patch(`/orders/${order.id}/`, { status: statusSelection });
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${getStatusDisplayName(resp.data.status)}`,
      });
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to change status:', error);
      const msg = error.response?.data?.status?.[0] || error.response?.data?.message || 'Failed to change status';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleOrderTypeChange = async (newOrderType: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/`, { orderType: newOrderType });
      
      const typeLabel = newOrderType === 'local' ? 'Local' : 'Foreign';
      toast({
        title: 'Order Type Updated',
        description: `Order changed to ${typeLabel}. It will now appear in the ${typeLabel} orders list.`,
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to change order type:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to change order type',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleLineStatusChange = async (lineId: string, newStatus: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/lines/${lineId}/status/`, {
        status: newStatus,
      });

      toast({
        title: 'Success',
        description: `Line status updated to ${getStatusDisplayName(newStatus)}`,
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update line status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update line status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!order) return;
    
    setUpdating(true);
    try {
      const response = await api.patch(`/orders/${order.id}/lines/bulk-status/`, {
        status: newStatus,
      });

      const updatedCount = response.data?.updatedCount || 0;
      toast({
        title: 'Success',
        description: `${updatedCount} line(s) updated to ${getStatusDisplayName(newStatus)}`,
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to bulk update line status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update line statuses',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  // Mill Offer Handlers
  const handleMillOfferAdd = async (lineId: string, millName: string, price: number, currency: string) => {
    if (!order) return;
    
    try {
      await api.post('/orders/mill-offers/', {
        order_line: lineId,
        mill_name: millName,
        price: price,
        currency: currency,
      });

      toast({
        title: 'Success',
        description: `Mill offer from ${millName} added`,
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to add mill offer:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add mill offer',
        variant: 'destructive',
      });
    }
  };

  const handleMillOfferDelete = async (millOfferId: string) => {
    if (!order) return;
    
    try {
      await api.delete(`/orders/mill-offers/${millOfferId}/`);

      toast({
        title: 'Success',
        description: 'Mill offer removed',
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to delete mill offer:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete mill offer',
        variant: 'destructive',
      });
    }
  };

  // Swatch Dates Handler
  const handleSwatchDatesChange = async (lineId: string, swatchReceivedDate: string | null, swatchSentDate: string | null) => {
    if (!order) return;
    
    try {
      await api.patch(`/orders/${order.id}/lines/${lineId}/swatch-dates/`, {
        swatchReceivedDate: swatchReceivedDate || '',
        swatchSentDate: swatchSentDate || '',
      });

      toast({
        title: 'Success',
        description: 'Swatch dates updated',
      });

      // Refetch order to get updated data
      await fetchOrder();
    } catch (error: any) {
      console.error('Failed to update swatch dates:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update swatch dates',
        variant: 'destructive',
      });
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
    if (status === 'submission' || status === 'resubmission') return <Clock className="h-5 w-5 text-blue-500" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getApprovedCount = () => {
    if (!order?.approvalStatus) return 0;
    const isRunning = order.status === 'running';
    
    if (isRunning) {
      // Running Order: Lab Dip, Strike Off, Handloom, PP Sample
      const statuses = [
        order.approvalStatus.labDip,
        order.approvalStatus.strikeOff,
        order.approvalStatus.handloom,
        order.approvalStatus.ppSample,
      ];
      return statuses.filter(s => s === 'approved').length;
    } else {
      // Upcoming/In Development: Quality, Price
      const statuses = [
        order.approvalStatus.quality || order.approvalStatus.qualityTest,
        order.approvalStatus.price || order.approvalStatus.bulkSwatch,
      ];
      return statuses.filter(s => s === 'approved').length;
    }
  };

  const getTotalApprovals = () => {
    const isRunning = order?.status === 'running';
    return isRunning ? 4 : 2; // Running: 4 approvals (Lab Dip, Strike Off, Handloom, PP Sample), Upcoming/In Dev: 2 approvals
  };

  const allRunningApproved = () => {
    if (!order?.approvalStatus) return false;
    return (
      order.approvalStatus.labDip === 'approved' &&
      order.approvalStatus.strikeOff === 'approved' &&
      order.approvalStatus.handloom === 'approved' &&
      order.approvalStatus.ppSample === 'approved'
    );
  };

  const allEarlyApproved = () => {
    if (!order?.approvalStatus) return false;
    const qualityApproved = order.approvalStatus.quality === 'approved' || order.approvalStatus.qualityTest === 'approved';
    const priceApproved = order.approvalStatus.price === 'approved' || order.approvalStatus.bulkSwatch === 'approved';
    return qualityApproved && priceApproved;
  };

  const getStatusBadgeClass = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'upcoming') {
      return 'bg-gradient-to-r from-amber-400 to-orange-400 text-white border-2 border-amber-500 shadow-lg';
    } else if (lowerStatus === 'in_development') {
      return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-2 border-blue-600 shadow-lg';
    } else if (lowerStatus === 'running') {
      return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-2 border-emerald-600 shadow-lg';
    } else if (lowerStatus === 'bulk') {
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-600 shadow-lg';
    } else if (lowerStatus === 'completed') {
      return 'bg-gradient-to-r from-slate-600 to-gray-700 text-white border-2 border-slate-700 shadow-lg';
    } else if (lowerStatus === 'archived') {
      return 'bg-gradient-to-r from-gray-400 to-slate-400 text-white border-2 border-gray-500 shadow-lg';
    }
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      'upcoming': 'Upcoming',
      'in_development': 'In Development',
      'running': 'Running Order',
      'bulk': 'Bulk',
      'completed': 'Completed',
      'archived': 'Archived'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  // Calculate aggregated order status based on line items
  const getAggregatedOrderStatus = (): { status: string; display: string; isMixed: boolean; statusCounts?: Record<string, number> } => {
    if (!order?.styles || order.styles.length === 0) {
      return { status: order?.status || 'upcoming', display: getStatusDisplayName(order?.status || 'upcoming'), isMixed: false };
    }

    const allLines: OrderLine[] = [];
    order.styles.forEach(style => {
      if (style.lines && style.lines.length > 0) {
        allLines.push(...style.lines);
      }
    });

    if (allLines.length === 0) {
      return { status: order?.status || 'upcoming', display: getStatusDisplayName(order?.status || 'upcoming'), isMixed: false };
    }

    // Count statuses
    const statusCounts: Record<string, number> = {};
    allLines.forEach(line => {
      const lineStatus = line.status || 'upcoming';
      statusCounts[lineStatus] = (statusCounts[lineStatus] || 0) + 1;
    });

    const uniqueStatuses = Object.keys(statusCounts);

    // If all lines have the same status, return that status
    if (uniqueStatuses.length === 1) {
      const singleStatus = uniqueStatuses[0];
      return { 
        status: singleStatus, 
        display: getStatusDisplayName(singleStatus), 
        isMixed: false 
      };
    }

    // Mixed statuses - build display string with counts
    // Order by priority: running > bulk > in_development > upcoming > completed > archived
    const statusPriority = ['running', 'bulk', 'in_development', 'upcoming', 'completed', 'archived'];
    const sortedStatuses = uniqueStatuses.sort((a, b) => {
      return statusPriority.indexOf(a) - statusPriority.indexOf(b);
    });

    const displayParts = sortedStatuses.map(status => 
      `${statusCounts[status]} ${getStatusDisplayName(status)}`
    );

    // Primary status is the highest priority one for badge styling
    const primaryStatus = sortedStatuses[0];

    return { 
      status: primaryStatus, 
      display: displayParts.join('\n'), 
      isMixed: true,
      statusCounts 
    };
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
            <Button onClick={() => router.back()}>
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
            <Button variant="ghost" onClick={() => router.back()} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
            <h1 className="text-3xl font-bold">PO #{order.poNumber}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-gray-500">{order.customerName}</p>
              {(() => {
                const aggregatedStatus = getAggregatedOrderStatus();
                if (aggregatedStatus.isMixed && aggregatedStatus.statusCounts) {
                  // Display multiple badges for mixed statuses
                  const statusPriority = ['running', 'bulk', 'in_development', 'upcoming', 'completed', 'archived'];
                  const sortedStatuses = Object.keys(aggregatedStatus.statusCounts).sort((a, b) => 
                    statusPriority.indexOf(a) - statusPriority.indexOf(b)
                  );
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {sortedStatuses.map(status => (
                        <Badge 
                          key={status} 
                          className={`${getStatusBadgeClass(status)} font-semibold px-2.5 py-1 text-xs`}
                        >
                          {aggregatedStatus.statusCounts![status]} {getStatusDisplayName(status)}
                        </Badge>
                      ))}
                    </div>
                  );
                }
                return (
                  <Badge className={`${getStatusBadgeClass(aggregatedStatus.status)} font-semibold px-3 py-1.5`}>
                    {aggregatedStatus.display}
                  </Badge>
                );
              })()}
              {order.merchandiserDetails && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-semibold px-3 py-1.5">
                  👤 {order.merchandiserDetails.fullName}
                </Badge>
              )}
              {/* Order Type Switcher */}
              <div className="flex items-center gap-2">
                <Select 
                  value={order.orderType || 'foreign'} 
                  onValueChange={handleOrderTypeChange}
                  disabled={updating}
                >
                  <SelectTrigger className={`w-[120px] h-8 text-xs font-semibold ${
                    order.orderType === 'local' 
                      ? 'bg-amber-100 border-amber-400 text-amber-800' 
                      : 'bg-teal-100 border-teal-400 text-teal-800'
                  }`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foreign">🌍 Foreign</SelectItem>
                    <SelectItem value="local">🏭 Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Quick Task Assignment Dropdown */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">Assign to:</Label>
              <Select value={selectedUser} onValueChange={handleUserSelect}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users && Array.isArray(users) && users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <span className="font-medium">{user.fullName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/orders/${order.id}/edit`)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Order
            </Button>
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

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lineitems" className="text-xs sm:text-sm">
              <Package className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Line Items</span><span className="sm:hidden">Items</span> ({order.styles?.reduce((sum, s) => sum + (s.lines?.length || 0), 0) || 0})
              </span>
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="text-xs sm:text-sm">
              <Truck className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">
                {order.orderType === 'local' 
                  ? <><span className="hidden sm:inline">Deliveries & Production</span><span className="sm:hidden">Del/Prod</span> ({deliveries.length + productionEntries.length})</>
                  : <><span className="hidden sm:inline">ETD & Deliveries</span><span className="sm:hidden">Deliveries</span> ({deliveries.length})</>
                }
              </span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Documents</span><span className="sm:hidden">Docs</span> ({documents.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Line Items Tab */}
          <TabsContent value="lineitems" className="space-y-6">
            {/* Bulk Status Update Header */}
            {order.styles && order.styles.length > 0 && order.styles.some(s => s.lines && s.lines.length > 0) && (
              <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>{order.styles.reduce((sum, s) => sum + (s.lines?.length || 0), 0)} line(s) in this order</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Bulk Update All Lines:</span>
                  <Select onValueChange={(value) => handleBulkStatusChange(value)} disabled={updating}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="in_development">In Development</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="bulk">Bulk</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Line Item Cards - Left Side (3/4 width on large screens) */}
              <div className="lg:col-span-3">
                {order.styles && order.styles.length > 0 && order.styles.some(s => s.lines && s.lines.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.styles.map((style) => 
                      style.lines && style.lines.length > 0 ? style.lines.map((line) => (
                        <LineItemCard
                          key={line.id}
                          line={{
                            ...line,
                            // Use style-level ETD as fallback when line-level ETD is missing
                            etd: line.etd || style.etd,
                            styleNumber: style.styleNumber,
                          }}
                          orderId={order.id}
                          orderType={order.orderType}
                          onClick={() => {
                            setSelectedLineItem({
                              ...line, 
                              styleNumber: style.styleNumber,
                              description: style.description,
                              fabricComposition: style.fabricComposition,
                              gsm: style.gsm,
                              cuttableWidth: style.cuttableWidth,
                              finishingWidth: style.finishingWidth,
                            });
                            setShowLineItemSheet(true);
                          }}
                          onRefresh={fetchOrder}
                        />
                      )) : null
                    )}
                  </div>
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="pt-12 pb-12 text-center">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-2">No line items yet</p>
                      <p className="text-sm text-gray-400">Line items will appear here once they are added to the order</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Document Tracking Timeline - Right Side (1/4 width on large screens) */}
              <div className="lg:col-span-1">
                <DocumentTrackingTimeline documents={documents} />
              </div>
            </div>
          </TabsContent>

          {/* Info Tab (hidden, for backward compatibility) */}
          <TabsContent value="info" className="space-y-6">
            {/* Order Lines Section - Moved to Top */}
            {order.styles && order.styles.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Order Lines ({order.styles.reduce((sum, s) => sum + (s.lines?.length || 0), 0)} lines)
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Each line represents a unique Style + Color + CAD combination</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Bulk Update Status:</span>
                      <Select onValueChange={(value) => handleBulkStatusChange(value)} disabled={updating}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="in_development">In Development</SelectItem>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="bulk">Bulk</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {order.styles.map((style) => 
                      style.lines && style.lines.length > 0 ? style.lines.map((line) => (
                        <Card key={line.id} className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all">
                          <CardHeader 
                            className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:bg-indigo-100 transition-colors"
                            onClick={() => toggleOrderLineExpanded(line.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex items-center gap-2">
                                {expandedOrderLines.has(line.id) ? (
                                  <ChevronDown className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <Badge className="bg-indigo-600 text-white font-semibold px-3 py-1">
                                      {style.styleNumber}
                                    </Badge>
                                    {line.colorCode && (
                                      <Badge className="bg-blue-100 text-blue-800 font-mono px-3 py-1">
                                        {line.colorCode}
                                      </Badge>
                                    )}
                                    {line.cadCode && (
                                      <Badge className="bg-purple-100 text-purple-800 font-mono px-3 py-1">
                                        {line.cadCode}
                                      </Badge>
                                    )}
                                    {!line.colorCode && !line.cadCode && (
                                      <Badge className="bg-gray-100 text-gray-600 px-3 py-1">
                                        Style Only
                                      </Badge>
                                    )}
                                    {/* Status Badge */}
                                    <Badge className={`font-semibold px-3 py-1 ${getStatusBadgeClass(line.status || 'upcoming')}`}>
                                      {getStatusDisplayName(line.status || 'upcoming')}
                                    </Badge>
                                  </div>
                                  {style.description && (
                                    <p className="text-xs text-gray-600">{style.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-indigo-700">
                                  {line.quantity.toLocaleString()} <span className="text-sm font-normal text-gray-600">{line.unit}</span>
                                </div>
                                {line.provaPrice && (
                                  <div className="text-sm font-semibold text-green-700">
                                    ${line.provaPrice.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          {expandedOrderLines.has(line.id) && (
                            <CardContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {/* Commercial Data */}
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-medium">Mill Price</p>
                                <p className="text-sm font-semibold">
                                  {line.millPrice ? `${line.currency || 'USD'} ${line.millPrice.toFixed(2)}` : '-'}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-medium">Commission</p>
                                <p className="text-sm font-semibold text-orange-700">
                                  {line.commission ? `${line.commission.toFixed(2)}%` : '-'}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-medium">ETD</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {line.etd ? formatDate(line.etd) : '-'}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-medium">ETA</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {line.eta ? formatDate(line.eta) : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Mill Offers & Prova Price & Swatch Dates - For In Development status */}
                            {line.status === 'in_development' && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-medium">Mill Offer</p>
                                    <div className="text-sm">
                                      {line.millOffers && line.millOffers.length > 0 ? (
                                        <div className="space-y-1">
                                          {line.millOffers.map((offer) => (
                                            <div key={offer.id} className="font-medium text-gray-900">
                                              {offer.millName} - ${offer.price?.toFixed(2) ?? '0.00'}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic">No offers yet</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-medium">Prova Price</p>
                                    <p className="text-sm font-semibold text-green-700">
                                      {line.provaPrice ? `$${line.provaPrice.toFixed(2)}` : <span className="text-orange-600 italic font-normal">Pending</span>}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-medium">Swatch Received</p>
                                    <p className="text-sm font-medium text-blue-700">
                                      {line.swatchReceivedDate ? formatDate(line.swatchReceivedDate) : <span className="text-gray-400 italic font-normal">-</span>}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-medium">Swatch Sent</p>
                                    <p className="text-sm font-medium text-blue-700">
                                      {line.swatchSentDate ? formatDate(line.swatchSentDate) : <span className="text-gray-400 italic font-normal">-</span>}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Production Calculations - For Local Orders */}
                            {order.orderType === 'local' && (
                              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                                <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1">
                                  <Calculator className="h-3 w-3" />
                                  Production Calculations
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                  {line.mixedFabricType && (
                                    <div className="bg-white p-2 rounded border">
                                      <p className="text-gray-500">{line.mixedFabricType} ({line.mixedFabricPercent || 0}%)</p>
                                      <p className="font-bold text-purple-700">
                                        {(calculateLineGreige(line) * (line.mixedFabricPercent || 0) / 100).toFixed(2)} {line.unit}
                                      </p>
                                    </div>
                                  )}
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-gray-500">Process Loss ({line.processLossPercent || 0}%)</p>
                                    <p className="font-bold text-red-600">
                                      {(line.quantity * (line.processLossPercent || 0) / 100).toFixed(2)} {line.unit}
                                    </p>
                                  </div>
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-gray-500">Greige Required</p>
                                    <p className="font-bold text-amber-700">{Math.round(calculateLineGreige(line)).toLocaleString()} {line.unit}</p>
                                  </div>
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-gray-500">Yarn Required</p>
                                    <p className="font-bold text-blue-700">{Math.round(calculateLineYarn(line)).toLocaleString()} {line.unit}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                              
                            {/* Status Update Section */}
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-xs font-semibold text-blue-900 mb-2">Update Line Status</p>
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={lineStatusSelections[line.id] || line.status || 'upcoming'} 
                                  onValueChange={(value) => setLineStatusSelections(prev => ({ ...prev, [line.id]: value }))}
                                >
                                  <SelectTrigger className="w-full max-w-xs bg-white">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="in_development">In Development</SelectItem>
                                    <SelectItem value="running">Running Order</SelectItem>
                                    <SelectItem value="bulk">Bulk</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleLineStatusChange(line.id, lineStatusSelections[line.id] || line.status || 'upcoming')} 
                                  disabled={updating || !lineStatusSelections[line.id] || lineStatusSelections[line.id] === line.status}
                                >
                                  {updating ? 'Updating...' : 'Update'}
                                </Button>
                              </div>
                            </div>
                              
                            {/* Style Technical Details - Collapsed by default */}
                            {(style.fabricType || style.gsm || style.construction) && (
                              <details className="mt-3 p-2 bg-gray-50 rounded border">
                                <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
                                  Technical Details
                                </summary>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs">
                                  {style.fabricType && (
                                    <div>
                                      <p className="text-gray-500">Fabric</p>
                                      <p className="font-medium">{style.fabricType}</p>
                                    </div>
                                  )}
                                  {style.gsm && (
                                    <div>
                                      <p className="text-gray-500">GSM</p>
                                      <p className="font-medium">{style.gsm}</p>
                                    </div>
                                  )}
                                  {style.construction && (
                                    <div>
                                      <p className="text-gray-500">Construction</p>
                                      <p className="font-medium">{style.construction}</p>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}

                            {line.notes && (
                              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                <p className="text-yellow-700 font-medium">Note: {line.notes}</p>
                              </div>
                            )}
                          </CardContent>
                          )}
                        </Card>
                      )) : null
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3 flex items-center justify-between">
                    <CardTitle className="text-lg">Order Information</CardTitle>
                    <button
                      type="button"
                      onClick={() => setIsOrderInfoOpen((prev) => !prev)}
                      className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOrderInfoOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </CardHeader>
                  {isOrderInfoOpen && (
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">PO Number</p>
                        <p className="font-medium">{order.poNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Vendor Name</p>
                        <p className="font-medium">{order.customerName}</p>
                      </div>
                      {order.buyerName && (
                        <div>
                          <p className="text-xs text-gray-500">Buyer Name</p>
                          <p className="font-medium">{order.buyerName}</p>
                        </div>
                      )}
                      {order.merchandiserDetails && (
                        <div>
                          <p className="text-xs text-gray-500">Assigned Merchandiser</p>
                          <p className="font-medium">{order.merchandiserDetails.fullName}</p>
                          <p className="text-xs text-gray-400">({order.merchandiserDetails.role})</p>
                        </div>
                      )}
                      {order.orderDate && (
                        <div>
                          <p className="text-xs text-gray-500">Order Date</p>
                          <p className="font-medium">{formatDate(order.orderDate)}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Stage</p>
                        <div className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {getStatusDisplayName(order.status)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  )}
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Fabric Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Fabric Type</p>
                        <p className="font-medium">{order.fabricType}</p>
                      </div>
                      {order.fabricSpecifications && (
                        <div>
                          <p className="text-xs text-gray-500">Specifications</p>
                          <p className="font-medium">{order.fabricSpecifications}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Total Quantity</p>
                        <p className="font-medium">{order.quantity.toLocaleString()} {order.unit}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Profit Summary Card */}
                {(order.potentialProfit !== undefined && order.potentialProfit !== null) && (
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3 flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Profit Summary
                      </CardTitle>
                      <button
                        type="button"
                        onClick={() => setIsProfitSummaryOpen((prev) => !prev)}
                        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isProfitSummaryOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </CardHeader>
                    {isProfitSummaryOpen && (
                    <CardContent>
                      <div className="space-y-4">
                        {/* Pricing Row - Only show if order-level prices exist */}
                        {order.millPrice && order.provaPrice && (
                          <div className="grid grid-cols-3 gap-3 text-sm pb-3 border-b">
                            <div>
                              <p className="text-xs text-gray-500">Mill Price</p>
                              <p className="font-medium">{order.currency} {order.millPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Prova Price</p>
                              <p className="font-medium text-green-700">{order.currency} {order.provaPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Unit Profit</p>
                              <p className="font-medium text-blue-700">
                                {order.currency} {(order.provaPrice - order.millPrice).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* For multi-style orders, show note about aggregated pricing */}
                        {order.styles && order.styles.length > 0 && !order.millPrice && (
                          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                            <p className="font-medium text-blue-800 mb-1">Multi-Style Order</p>
                            <p>Profits calculated from {order.styles.reduce((sum, style) => sum + (style.colors?.length || 0), 0)} color variants across {order.styles.length} style(s)</p>
                          </div>
                        )}

                        <div className="pt-3">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Potential Profit */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-blue-600 font-medium mb-1">Potential Profit</p>
                              <p className="text-xs text-gray-600 mb-2">
                                (Based on ordered: {order.quantity.toLocaleString()} {order.unit})
                              </p>
                              <p className="text-2xl font-bold text-blue-700">
                                {order.currency} {(order.potentialProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </p>
                            </div>

                            {/* Realized Profit */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-xs text-green-600 font-medium mb-1">Realized Profit</p>
                              <p className="text-xs text-gray-600 mb-2">
                                (Based on delivered: {(order.totalDeliveredQuantity || 0).toLocaleString()} {order.unit})
                              </p>
                              <p className="text-2xl font-bold text-green-700">
                                {order.currency} {(order.realizedProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Profit Status Indicator */}
                        {order.shortageExcessQuantity !== undefined && order.shortageExcessQuantity < 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-sm text-amber-800">
                              ⚠️ Profit shortfall of {order.currency} {((order.potentialProfit || 0) - (order.realizedProfit || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} due to delivery shortage
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    )}
                  </Card>
                )}

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

              <div className="space-y-4">
                {/* Order-Level Approval Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>Order-Level Approval History</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Aggregated</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Timeline of order-wide approval changes</p>
                  </CardHeader>
                  <CardContent>
                    <OrderTimeline events={
                      (order.approvalHistoryData ?? [])
                        .filter(h => h.orderLineId === null || h.orderLineId === undefined) // Only order-level approvals
                        .map(history => ({
                          title: `${history.approvalType} → ${history.status}`,
                          date: history.createdAt,
                          status: history.status === 'approved' ? 'completed' as const : 
                                  history.status === 'rejected' ? 'pending' as const : 
                                  'current' as const,
                          description: history.changedByName ? `Changed by ${history.changedByName}` : ''
                        }))
                    } />
                  </CardContent>
                </Card>

                {/* Line-Level Approval Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>Line-Level Approval History</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Per Line</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Timeline of approvals for individual order lines</p>
                  </CardHeader>
                  <CardContent>
                    <OrderTimeline events={
                      (order.approvalHistoryData ?? [])
                        .filter(h => h.orderLineId) // Only line-level approvals
                        .map(history => {
                          const lineIdentifier = [
                            history.styleNumber,
                            history.colorCode && `🎨 ${history.colorCode}`,
                            history.cadCode && `📐 ${history.cadCode}`
                          ].filter(Boolean).join(' ');
                          
                          return {
                            title: `${history.approvalType} → ${history.status}`,
                            date: history.createdAt,
                            status: history.status === 'approved' ? 'completed' as const : 
                                    history.status === 'rejected' ? 'pending' as const : 
                                    'current' as const,
                            description: `${lineIdentifier}${history.changedByName ? ` • Changed by ${history.changedByName}` : ''}`
                          };
                        })
                    } />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Approval Gate Tab - Hidden for Bulk status */}
          {order.status !== 'bulk' && (
          <TabsContent value="approval">
            {/* Overall Summary Card */}
            <Card className="border-2 border-blue-200 mb-6">
              <CardHeader>
                <CardTitle>Order-Level Approval Summary (Aggregated)</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Aggregated from all lines below • Read-only
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {order.status === 'running' ? (
                <>
                  {/* Running Order Approvals */}
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          {getApprovalIcon(order.approvalStatus?.labDip || 'submission')}
                          <span className="text-sm font-medium">Lab Dip</span>
                        </div>
                        <Badge className={`text-xs ${
                          order.approvalStatus?.labDip === 'approved' ? 'bg-green-100 text-green-800' :
                          order.approvalStatus?.labDip === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.approvalStatus?.labDip || 'submission'}
                        </Badge>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          {getApprovalIcon(order.approvalStatus?.strikeOff || 'submission')}
                          <span className="text-sm font-medium">Strike Off</span>
                        </div>
                        <Badge className={`text-xs ${
                          order.approvalStatus?.strikeOff === 'approved' ? 'bg-green-100 text-green-800' :
                          order.approvalStatus?.strikeOff === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.approvalStatus?.strikeOff || 'submission'}
                        </Badge>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          {getApprovalIcon(order.approvalStatus?.handloom || 'submission')}
                          <span className="text-sm font-medium">Handloom</span>
                        </div>
                        <Badge className={`text-xs ${
                          order.approvalStatus?.handloom === 'approved' ? 'bg-green-100 text-green-800' :
                          order.approvalStatus?.handloom === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.approvalStatus?.handloom || 'submission'}
                        </Badge>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          {getApprovalIcon(order.approvalStatus?.ppSample || 'submission')}
                          <span className="text-sm font-medium">PP Sample</span>
                        </div>
                        <Badge className={`text-xs ${
                          order.approvalStatus?.ppSample === 'approved' ? 'bg-green-100 text-green-800' :
                          order.approvalStatus?.ppSample === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.approvalStatus?.ppSample || 'submission'}
                        </Badge>
                      </div>
                </>
              ) : (
                <>
                  {/* Upcoming/In Development Approvals */}
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          {getApprovalIcon(order.approvalStatus?.quality || 'submission')}
                          <span className="text-sm font-medium">Quality</span>
                        </div>
                        <Badge className={`text-xs ${
                          order.approvalStatus?.quality === 'approved' ? 'bg-green-100 text-green-800' :
                          order.approvalStatus?.quality === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.approvalStatus?.quality || 'submission'}
                        </Badge>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          {getApprovalIcon(order.approvalStatus?.price || 'submission')}
                          <span className="text-sm font-medium">Price</span>
                        </div>
                        <Badge className={`text-xs ${
                          order.approvalStatus?.price === 'approved' ? 'bg-green-100 text-green-800' :
                          order.approvalStatus?.price === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.approvalStatus?.price || 'submission'}
                        </Badge>
                      </div>
                </>
              )}
                </div>
              </CardContent>
            </Card>

            {/* Filter Controls */}
            <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <h3 className="text-lg font-semibold">Line-Level Approvals</h3>
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Filter by Style:</Label>
                <Select value={selectedStyleForApproval} onValueChange={setSelectedStyleForApproval}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Styles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Styles</SelectItem>
                    {order.styles?.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.styleNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line-Level Approval Cards */}
            <div className="space-y-4">
              {order.styles
                ?.filter(style => selectedStyleForApproval === 'all' || style.id === selectedStyleForApproval)
                .map((style) => 
                  style.lines && style.lines.length > 0 ? style.lines.map((line) => (
                    <Card key={line.id} className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold">
                              {style.styleNumber}
                            </CardTitle>
                            <div className="flex gap-2 mt-1">
                              {line.colorCode && (
                                <Badge className="bg-blue-100 text-blue-800 font-mono">
                                  Color: {line.colorCode}
                                </Badge>
                              )}
                              {line.cadCode && (
                                <Badge className="bg-purple-100 text-purple-800 font-mono">
                                  CAD: {line.cadCode}
                                </Badge>
                              )}
                              {!line.colorCode && !line.cadCode && (
                                <Badge className="bg-gray-100 text-gray-600">
                                  Style Only
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <div>{line.quantity} {line.unit}</div>
                            {line.provaPrice && <div className="font-medium text-green-700">${line.provaPrice.toFixed(2)}</div>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {order.status === 'running' ? (
                            <>
                              {/* Lab Dip */}
                              <div>
                                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  {getApprovalIcon(line.approvalStatus?.labDip || 'submission')}
                                  Lab Dip
                                </Label>
                                <Select
                                  value={line.approvalStatus?.labDip || 'submission'}
                                  onValueChange={(value) => handleLineApprovalChange('labDip', value, line.id, `${style.styleNumber} ${line.colorCode || ''} ${line.cadCode || ''}`)}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submission">Submission</SelectItem>
                                    <SelectItem value="resubmission">Re-submission</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Strike Off */}
                              <div>
                                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  {getApprovalIcon(line.approvalStatus?.strikeOff || 'submission')}
                                  Strike Off
                                </Label>
                                <Select
                                  value={line.approvalStatus?.strikeOff || 'submission'}
                                  onValueChange={(value) => handleLineApprovalChange('strikeOff', value, line.id, `${style.styleNumber} ${line.colorCode || ''} ${line.cadCode || ''}`)}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submission">Submission</SelectItem>
                                    <SelectItem value="resubmission">Re-submission</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Handloom */}
                              <div>
                                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  {getApprovalIcon(line.approvalStatus?.handloom || 'submission')}
                                  Handloom
                                </Label>
                                <Select
                                  value={line.approvalStatus?.handloom || 'submission'}
                                  onValueChange={(value) => handleLineApprovalChange('handloom', value, line.id, `${style.styleNumber} ${line.colorCode || ''} ${line.cadCode || ''}`)}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submission">Submission</SelectItem>
                                    <SelectItem value="resubmission">Re-submission</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* PP Sample */}
                              <div>
                                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  {getApprovalIcon(line.approvalStatus?.ppSample || 'submission')}
                                  PP Sample
                                </Label>
                                <Select
                                  value={line.approvalStatus?.ppSample || 'submission'}
                                  onValueChange={(value) => handleLineApprovalChange('ppSample', value, line.id, `${style.styleNumber} ${line.colorCode || ''} ${line.cadCode || ''}`)}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submission">Submission</SelectItem>
                                    <SelectItem value="resubmission">Re-submission</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Quality */}
                              <div>
                                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  {getApprovalIcon(line.approvalStatus?.quality || 'submission')}
                                  Quality
                                </Label>
                                <Select
                                  value={line.approvalStatus?.quality || 'submission'}
                                  onValueChange={(value) => handleLineApprovalChange('quality', value, line.id, `${style.styleNumber} ${line.colorCode || ''} ${line.cadCode || ''}`)}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submission">Submission</SelectItem>
                                    <SelectItem value="resubmission">Re-submission</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Price */}
                              <div>
                                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  {getApprovalIcon(line.approvalStatus?.price || 'submission')}
                                  Price
                                </Label>
                                <Select
                                  value={line.approvalStatus?.price || 'submission'}
                                  onValueChange={(value) => handleLineApprovalChange('price', value, line.id, `${style.styleNumber} ${line.colorCode || ''} ${line.cadCode || ''}`)}
                                  disabled={updating}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="submission">Submission</SelectItem>
                                    <SelectItem value="resubmission">Re-submission</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )) : null
                )}
            </div>

            {/* If no lines */}
            {(!order.styles || order.styles.every(s => !s.lines || s.lines.length === 0)) && (
              <Card className="border-dashed border-2">
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500 mb-2">No lines available for approval management</p>
                  <p className="text-sm text-gray-400">Lines will appear here once they are added to the order</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          )}

          {/* ETD & Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            {/* Production Progress Bars - Only for Local Orders */}
            {order.orderType === 'local' && order.productionSummary && (
              <div className="grid gap-4 md:grid-cols-3">
                {/* Knitting Progress - uses Greige as denominator */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-blue-500" />
                      Knitting Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-500">
                        {getEffectiveKnitting().toLocaleString()} / {Math.round(getActualTotalGreige()).toLocaleString()} {order.unit}
                      </span>
                      <span className="font-semibold text-blue-700">{getKnittingPercent()}%</span>
                    </div>
                    <Progress value={Math.min(getKnittingPercent(), 100)} className="h-2" />
                    <div className="text-xs text-gray-500">
                      {order.productionSummary.knittingEntriesCount} entries{order.productionSummary.totalDelivered > 0 && order.productionSummary.totalKnitting === 0 ? ' (from delivery)' : ''} • <span className="text-amber-600">Greige base</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Dyeing Progress - uses Greige as denominator */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-purple-500" />
                      Dyeing Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-500">
                        {getEffectiveDyeing().toLocaleString()} / {Math.round(getActualTotalGreige()).toLocaleString()} {order.unit}
                      </span>
                      <span className="font-semibold text-purple-700">{getDyeingPercent()}%</span>
                    </div>
                    <Progress value={Math.min(getDyeingPercent(), 100)} className="h-2" />
                    <div className="text-xs text-gray-500">
                      {order.productionSummary.dyeingEntriesCount} entries{order.productionSummary.totalDelivered > 0 && order.productionSummary.totalDyeing === 0 ? ' (from delivery)' : ''} • <span className="text-amber-600">Greige base</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Finishing Progress - uses Greige as denominator */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Finishing Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-gray-500">
                        {getEffectiveFinishing().toLocaleString()} / {Math.round(getActualTotalGreige()).toLocaleString()} {order.unit}
                      </span>
                      <span className="font-semibold text-green-700">{getFinishingPercent()}%</span>
                    </div>
                    <Progress value={Math.min(getFinishingPercent(), 100)} className="h-2" />
                    <div className="text-xs text-gray-500">
                      {order.productionSummary.finishingEntriesCount} entries{order.productionSummary.totalDelivered > 0 && order.productionSummary.totalFinishing === 0 ? ' (from delivery)' : ''} • <span className="text-amber-600">Greige base</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Production Entries Section - Only for Local Orders */}
            {order.orderType === 'local' && (
              <Card className="border-l-4 border-l-indigo-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-indigo-600" />
                      Knitting, Dyeing & Finishing Records
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAddProductionEntry('knitting')} size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
                        <Plus className="h-4 w-4 mr-1" />
                        Knitting
                      </Button>
                      <Button onClick={() => handleAddProductionEntry('dyeing')} size="sm" variant="outline" className="text-purple-700 border-purple-300 hover:bg-purple-50">
                        <Plus className="h-4 w-4 mr-1" />
                        Dyeing
                      </Button>
                      <Button onClick={() => handleAddProductionEntry('finishing')} size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
                        <Plus className="h-4 w-4 mr-1" />
                        Finishing
                      </Button>
                      <Button onClick={() => setShowCalculationsDialog(true)} size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50 ml-2">
                        <Calculator className="h-4 w-4 mr-1" />
                        Calculations
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {productionEntries.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">No production records yet</p>
                      <p className="text-sm text-gray-400 mb-4">Click one of the buttons above to record knitting, dyeing, or finishing</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left p-3 text-sm font-semibold text-gray-700">Type</th>
                            <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                            <th className="text-left p-3 text-sm font-semibold text-gray-700">Order Line</th>
                            <th className="text-left p-3 text-sm font-semibold text-gray-700">Quantity</th>
                            <th className="text-left p-3 text-sm font-semibold text-gray-700">Notes</th>
                            <th className="text-left p-3 text-sm font-semibold text-gray-700">Created By</th>
                            <th className="text-right p-3 text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionEntries.map((entry) => (
                            <tr key={entry.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 text-sm">
                                <Badge className={getEntryTypeBadgeClass(entry.entryType)}>
                                  {getEntryTypeDisplay(entry.entryType)}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  {formatDate(entry.entryDate)}
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                {entry.orderLineLabel ? (
                                  <Badge className="bg-indigo-100 text-indigo-800 font-medium">
                                    {entry.orderLineLabel}
                                  </Badge>
                                ) : entry.styleNumber || entry.colorCode ? (
                                  <div className="flex flex-col gap-0.5">
                                    {entry.styleNumber && (
                                      <span className="font-medium text-gray-700">{entry.styleNumber}</span>
                                    )}
                                    {entry.colorCode && (
                                      <span className="text-xs text-gray-500">{entry.colorCode}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">General</span>
                                )}
                              </td>
                              <td className="p-3 text-sm font-medium">
                                {entry.quantity.toLocaleString()} {entry.unit}
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {entry.notes || <span className="text-gray-400 italic">No notes</span>}
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {entry.createdByName || 'Unknown'}
                              </td>
                              <td className="p-3 text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProductionEntry(entry)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProductionEntry(entry.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-600" />
                    Supplier Delivery Records
                  </CardTitle>
                  <Button onClick={handleAddDelivery} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Delivery
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-600 mb-1">Total Ordered</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {order.quantity.toLocaleString()} {order.unit}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-600 mb-1">Total Delivered</div>
                      <div className="text-2xl font-bold text-green-700">
                        {getTotalDeliveredQuantity().toLocaleString()} {order.unit}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={
                    order.shortageExcessQuantity === undefined ? 'bg-gray-50 border-gray-200' :
                    order.shortageExcessQuantity < 0 ? 'bg-red-50 border-red-200' :
                    order.shortageExcessQuantity > 0 ? 'bg-green-50 border-green-200' :
                    'bg-gray-50 border-gray-200'
                  }>
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-600 mb-1">
                        {order.shortageExcessQuantity === undefined ? 'Status' :
                         order.shortageExcessQuantity < 0 ? 'Shortage' :
                         order.shortageExcessQuantity > 0 ? 'Excess' :
                         'Status'}
                      </div>
                      <div className={`text-2xl font-bold ${
                        order.shortageExcessQuantity === undefined ? 'text-gray-700' :
                        order.shortageExcessQuantity < 0 ? 'text-red-700' :
                        order.shortageExcessQuantity > 0 ? 'text-green-700' :
                        'text-gray-700'
                      }`}>
                        {order.shortageExcessQuantity === undefined ? 'No deliveries yet' :
                         order.shortageExcessQuantity < 0 ? `${Math.abs(order.shortageExcessQuantity).toLocaleString()} ${order.unit}` :
                         order.shortageExcessQuantity > 0 ? `+${order.shortageExcessQuantity.toLocaleString()} ${order.unit}` :
                         `On target`}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Deliveries Table */}
                {deliveries.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No delivery records yet</p>
                    <p className="text-sm text-gray-400 mb-4">Click "Record Delivery" to add your first delivery entry</p>
                    <Button onClick={handleAddDelivery} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Delivery
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Order Line</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Quantity</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Notes</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Created By</th>
                          <th className="text-right p-3 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((delivery) => (
                          <tr key={delivery.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDate(delivery.deliveryDate)}
                              </div>
                            </td>
                            <td className="p-3 text-sm">
                              {delivery.orderLineLabel ? (
                                <Badge className="bg-indigo-100 text-indigo-800 font-medium">
                                  {delivery.orderLineLabel}
                                </Badge>
                              ) : delivery.styleNumber || delivery.colorCode ? (
                                <div className="flex flex-col gap-0.5">
                                  {delivery.styleNumber && (
                                    <span className="font-medium text-gray-700">{delivery.styleNumber}</span>
                                  )}
                                  {delivery.colorCode && (
                                    <span className="text-xs text-gray-500">
                                      {delivery.colorCode}
                                      {delivery.colorName && ` (${delivery.colorName})`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">General</span>
                              )}
                            </td>
                            <td className="p-3 text-sm font-medium">
                              {delivery.deliveredQuantity.toLocaleString()} {delivery.unit}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {delivery.notes || <span className="text-gray-400 italic">No notes</span>}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {delivery.createdByName || 'Unknown'}
                            </td>
                            <td className="p-3 text-sm text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDelivery(delivery)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDelivery(delivery.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                  orderLines={order.styles?.flatMap(style => 
                    (style.lines || []).map(line => ({
                      id: line.id,
                      styleNumber: style.styleNumber,
                      colorCode: line.colorCode,
                      cadCode: line.cadCode
                    }))
                  )}
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
                  orderId={params.id as string}
                  onDelete={handleDeleteDocument}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Hidden Printable Order (only visible when printing) */}
        <PrintableOrder 
          order={{
            id: order.id,
            poNumber: order.poNumber,
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

        {/* Delivery Dialog */}
        <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingDelivery ? 'Edit Delivery Record' : 'Record Supplier Delivery'}
              </DialogTitle>
            </DialogHeader>
              <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-date">Delivery Date *</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryFormData.deliveryDate}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryDate: e.target.value })}
                  required
                />
              </div>
              
              {/* Line Item Selection - Direct association with style-color-CAD */}
              {order?.styles && order.styles.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="delivery-line-item">Line Item (Style / Color / CAD)</Label>
                  <Select
                    value={deliveryFormData.lineItem || "general"}
                    onValueChange={(value) =>
                      setDeliveryFormData({
                        ...deliveryFormData,
                        lineItem: value === "general" ? "" : value,
                        // Clear style/color/cad when selecting a direct line item
                        style: "",
                        color: "",
                        cad: "",
                      })
                    }
                  >
                    <SelectTrigger id="delivery-line-item">
                      <SelectValue placeholder="Select a line item or leave general" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <span className="text-slate-500">General (Order-wide)</span>
                      </SelectItem>
                      {order.styles.flatMap((style) =>
                        (style.lines || []).map((line) => {
                          const label = [
                            style.styleNumber,
                            line.colorCode && `Color: ${line.colorCode}`,
                            line.cadCode && `CAD: ${line.cadCode}`,
                          ].filter(Boolean).join(' - ');
                          return (
                            <SelectItem key={line.id} value={line.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{label}</span>
                                <span className="text-xs text-slate-500">
                                  ({line.quantity?.toLocaleString()} {line.unit})
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Select a specific line item to track delivery progress
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="delivered-quantity">Delivered Quantity *</Label>
                <div className="flex gap-2">
                  <Input
                    id="delivered-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFormData.deliveredQuantity}
                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveredQuantity: e.target.value })}
                    placeholder="Enter quantity"
                    className="flex-1"
                    required
                  />
                  <div className="flex items-center px-3 bg-gray-100 border rounded-md text-sm text-gray-600">
                    {order?.unit || 'meters'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-notes">Notes (Optional)</Label>
                <Textarea
                  id="delivery-notes"
                  value={deliveryFormData.notes}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, notes: e.target.value })}
                  placeholder="Add any additional notes about this delivery..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeliveryDialog(false)}
                disabled={savingDelivery}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveDelivery} disabled={savingDelivery}>
                {savingDelivery ? 'Saving...' : editingDelivery ? 'Update Delivery' : 'Save Delivery'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Production Entry Dialog - Only for Local Orders */}
        <Dialog open={showProductionDialog} onOpenChange={setShowProductionDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingProductionEntry ? 'Edit Production Entry' : 'Record Production Entry'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="entry-type">Entry Type *</Label>
                <Select
                  value={productionFormData.entryType}
                  onValueChange={(value: ProductionEntryType) => setProductionFormData({ ...productionFormData, entryType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knitting">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-blue-500" />
                        <span>Knitting</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dyeing">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-purple-500" />
                        <span>Dyeing</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="finishing">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Finishing</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-date">Date *</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={productionFormData.entryDate}
                  onChange={(e) => setProductionFormData({ ...productionFormData, entryDate: e.target.value })}
                  required
                />
              </div>

              {order?.styles && order.styles.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="line-item">Order Line (Optional)</Label>
                  <Select
                    value={productionFormData.lineItem}
                    onValueChange={(value) => setProductionFormData({ ...productionFormData, lineItem: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="General (applies to whole order)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General (applies to whole order)</SelectItem>
                      {order.styles.flatMap((style) =>
                        (style.lines || []).map((line) => {
                          const lineLabel = [
                            style.styleNumber,
                            line.colorCode,
                            line.cadCode
                          ].filter(Boolean).join(' / ');
                          return (
                            <SelectItem key={line.id} value={line.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{lineLabel || 'Base Line'}</span>
                                <span className="text-xs text-slate-500">
                                  ({line.quantity?.toLocaleString()} {line.unit})
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Optionally associate this entry with a specific line item
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="production-quantity">Quantity *</Label>
                <div className="flex gap-2">
                  <Input
                    id="production-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={productionFormData.quantity}
                    onChange={(e) => setProductionFormData({ ...productionFormData, quantity: e.target.value })}
                    placeholder="Enter quantity"
                    className="flex-1"
                    required
                  />
                  <Select
                    value={productionFormData.unit}
                    onValueChange={(value) => setProductionFormData({ ...productionFormData, unit: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="yards">yards</SelectItem>
                      <SelectItem value="meters">meters</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="production-notes">Notes (Optional)</Label>
                <Textarea
                  id="production-notes"
                  value={productionFormData.notes}
                  onChange={(e) => setProductionFormData({ ...productionFormData, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowProductionDialog(false)}
                disabled={savingProductionEntry}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProductionEntry} disabled={savingProductionEntry}>
                {savingProductionEntry ? 'Saving...' : editingProductionEntry ? 'Update Entry' : 'Save Entry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Line Item Detail Sheet */}
        <LineItemDetailSheet
          line={selectedLineItem}
          open={showLineItemSheet}
          onClose={() => {
            setShowLineItemSheet(false);
            setSelectedLineItem(null);
          }}
          orderId={order.id}
          orderStatus={order.status}
          onStatusChange={handleLineStatusChange}
          onApprovalChange={handleLineApprovalChange}
          onMillOfferAdd={handleMillOfferAdd}
          onMillOfferDelete={handleMillOfferDelete}
          onSwatchDatesChange={handleSwatchDatesChange}
          onCustomGateChange={async () => {
            // Refresh order data when custom gates are modified
            await fetchOrder();
          }}
          updating={updating}
        />

        {/* Task Assignment Confirmation Dialog */}
        <Dialog open={showAssignConfirmDialog} onOpenChange={setShowAssignConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Task Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Assign order <span className="font-semibold">PO #{order?.poNumber}</span> to{' '}
                <span className="font-semibold text-purple-700">
                  {users.find(u => u.id === selectedUser)?.fullName}
                </span>?
              </p>
              {currentAssignedTask && currentAssignedTask.assignedToDetails && (
                <div className="p-3 bg-yellow-50 border border-yellow-300 rounded">
                  <p className="text-xs text-yellow-700 font-medium mb-1">⚠️ Current Assignment:</p>
                  <p className="text-sm text-gray-900">Currently assigned to {currentAssignedTask.assignedToDetails.fullName}</p>
                  <p className="text-xs text-gray-600 mt-1">This will reassign the order to the new person.</p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                The assigned team member will receive an instant notification and can view this task on their dashboard.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelAssignTask}
                disabled={assigningTask}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAssignTask}
                disabled={assigningTask}
              >
                {assigningTask ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Greige & Yarn Calculations Dialog */}
        <Dialog open={showCalculationsDialog} onOpenChange={setShowCalculationsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-600" />
                Production Calculations Summary
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Order-level summary */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Order Summary
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-500 text-xs mb-1">Total Finished Fabric</p>
                    <p className="font-bold text-lg text-indigo-700">
                      {order?.quantity?.toLocaleString() || 0} <span className="text-sm font-normal">{order?.unit}</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-500 text-xs mb-1">Total Greige Required</p>
                    <p className="font-bold text-lg text-amber-700">
                      {Math.round(getActualTotalGreige()).toLocaleString()} <span className="text-sm font-normal">{order?.unit}</span>
                    </p>
                    {getActualTotalGreige() > (order?.quantity || 0) && (
                      <p className="text-xs text-amber-600 mt-1">
                        +{Math.round(getActualTotalGreige() - (order?.quantity || 0)).toLocaleString()} for process loss
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-500 text-xs mb-1">Total Yarn Required</p>
                    <p className="font-bold text-lg text-blue-700">
                      {Math.round(calculateTotalYarn()).toLocaleString()} <span className="text-sm font-normal">{order?.unit}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Line-by-line calculations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Line Item Calculations
                </h3>
                {order?.styles?.map((style) =>
                  style.lines?.map((line) => {
                    const lineGreige = calculateLineGreige(line);
                    const lineYarn = calculateLineYarn(line);
                    return (
                      <div key={line.id} className="border rounded-lg overflow-hidden">
                        {/* Line header */}
                        <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white">{style.styleNumber}</Badge>
                            {line.colorCode && <Badge className="bg-blue-100 text-blue-800">{line.colorCode}</Badge>}
                            {line.cadCode && <Badge className="bg-purple-100 text-purple-800">{line.cadCode}</Badge>}
                            {line.mixedFabricType && (
                              <Badge className="bg-purple-100 text-purple-700">
                                {line.mixedFabricType} {line.mixedFabricPercent || 0}%
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-medium">{line.quantity?.toLocaleString()} {line.unit}</span>
                        </div>
                        {/* Calculation details */}
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {/* Input values */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-500 uppercase">Inputs</p>
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-red-500" />
                                <span className="text-gray-600">Process Loss:</span>
                                <span className="font-semibold text-red-600">{line.processLossPercent || 0}%</span>
                              </div>
                              {line.mixedFabricType && (
                                <div className="flex items-center gap-2">
                                  <FlaskConical className="h-4 w-4 text-purple-500" />
                                  <span className="text-gray-600">{line.mixedFabricType}:</span>
                                  <span className="font-semibold text-purple-600">{line.mixedFabricPercent || 0}%</span>
                                </div>
                              )}
                            </div>
                            {/* Calculation breakdown */}
                            <div className="space-y-2 col-span-2">
                              <p className="text-xs font-medium text-gray-500 uppercase">Calculation</p>
                              <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                                <p>Greige = {line.quantity} × (1 + {line.processLossPercent || 0}%)</p>
                                <p className="font-semibold text-amber-700">= {Math.round(lineGreige).toLocaleString()} {line.unit}</p>
                                {line.mixedFabricType && (
                                  <>
                                    <p className="mt-1">{line.mixedFabricType} = {Math.round(lineGreige).toLocaleString()} × {line.mixedFabricPercent || 0}%</p>
                                    <p className="font-semibold text-purple-700">= {(lineGreige * (line.mixedFabricPercent || 0) / 100).toFixed(2)} {line.unit}</p>
                                    <p className="mt-1">Yarn = {Math.round(lineGreige).toLocaleString()} - {(lineGreige * (line.mixedFabricPercent || 0) / 100).toFixed(2)}</p>
                                    <p className="font-semibold text-blue-700">= {Math.round(lineYarn).toLocaleString()} {line.unit}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Result */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-500 uppercase">Result</p>
                              <div className="bg-amber-50 p-2 rounded border border-amber-200">
                                <p className="text-xs text-gray-500">Greige:</p>
                                <p className="font-bold text-amber-700">{Math.round(lineGreige).toLocaleString()} {line.unit}</p>
                              </div>
                              {line.mixedFabricType && (
                                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                                  <p className="text-xs text-gray-500">{line.mixedFabricType}:</p>
                                  <p className="font-bold text-purple-700">{(lineGreige * (line.mixedFabricPercent || 0) / 100).toFixed(2)} {line.unit}</p>
                                </div>
                              )}
                              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <p className="text-xs text-gray-500">Yarn:</p>
                                <p className="font-bold text-blue-700">{Math.round(lineYarn).toLocaleString()} {line.unit}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formula explanation */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm">
                <h4 className="font-semibold text-blue-800 mb-2">Formula Reference</h4>
                <div className="space-y-1 text-blue-700">
                  <p><strong>Greige Quantity</strong> = Finished Fabric × (1 + Process Loss %)</p>
                  <p><strong>Yarn Required</strong> = Greige Quantity × (1 - Mixed Fabric %)</p>
                </div>
                <p className="mt-2 text-xs text-blue-600">
                  Production progress bars use Greige Quantity as the 100% baseline (textile industry standard).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCalculationsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
