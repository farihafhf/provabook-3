'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, Clock, AlertCircle, Calendar, Plus, Trash2, Factory, Pencil, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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

interface CustomApprovalGate {
  id: string;
  orderLineId: string;
  name: string;
  gateKey: string;
  status: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderLine {
  id: string;
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
  // Style details
  description?: string;
  fabricComposition?: string;
  gsm?: number;
  cuttableWidth?: string;
  finishingWidth?: string;
  // Mill offers for development stage
  millOffers?: MillOffer[];
  // Swatch dates for In Development status
  swatchReceivedDate?: string;
  swatchSentDate?: string;
}

interface LineItemDetailSheetProps {
  line: OrderLine | null;
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderStatus?: string;
  onStatusChange?: (lineId: string, newStatus: string) => Promise<void>;
  onApprovalChange?: (approvalType: string, newStatus: string, lineId: string, lineLabel: string, customTimestamp?: string) => Promise<void>;
  onMillOfferAdd?: (lineId: string, millName: string, price: number, currency: string) => Promise<void>;
  onMillOfferDelete?: (millOfferId: string) => Promise<void>;
  onSwatchDatesChange?: (lineId: string, swatchReceivedDate: string | null, swatchSentDate: string | null) => Promise<void>;
  updating?: boolean;
}

interface PendingApproval {
  approvalType: string;
  newStatus: string;
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    upcoming: 'bg-gray-100 text-gray-800',
    in_development: 'bg-blue-100 text-blue-800',
    running: 'bg-yellow-100 text-yellow-800',
    bulk: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
  };
  return classes[status] || classes.upcoming;
};

const getStatusDisplayName = (status: string) => {
  const names: Record<string, string> = {
    upcoming: 'Upcoming',
    in_development: 'In Development',
    running: 'Running',
    bulk: 'Bulk',
    completed: 'Completed',
  };
  return names[status] || status;
};

const getApprovalIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'resubmission':
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    case 'submission':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'default':
      return <Clock className="h-4 w-4 text-gray-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const formatApprovalName = (key: string): string => {
  const names: Record<string, string> = {
    labDip: 'Lab Dip',
    strikeOff: 'Strike-Off',
    handloom: 'Handloom',
    aop: 'AOP',
    qualityTest: 'Quality Test',
    quality: 'Quality',
    bulkSwatch: 'Bulk Swatch',
    price: 'Price',
    ppSample: 'PP Sample',
  };
  return names[key] || key;
};

export function LineItemDetailSheet({
  line,
  open,
  onClose,
  orderId,
  orderStatus,
  onStatusChange,
  onApprovalChange,
  onMillOfferAdd,
  onMillOfferDelete,
  onSwatchDatesChange,
  updating = false,
}: LineItemDetailSheetProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedApprovals, setSelectedApprovals] = useState<Record<string, string>>({});
  
  // Custom timestamp dialog state
  const [showTimestampDialog, setShowTimestampDialog] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [useCustomTimestamp, setUseCustomTimestamp] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  
  // Mill offer input state
  const [newMillName, setNewMillName] = useState('');
  const [newMillPrice, setNewMillPrice] = useState('');
  const [addingMillOffer, setAddingMillOffer] = useState(false);
  
  // Swatch dates input state
  const [swatchReceivedDate, setSwatchReceivedDate] = useState('');
  const [swatchSentDate, setSwatchSentDate] = useState('');
  const [savingSwatchDates, setSavingSwatchDates] = useState(false);

  // Custom approval gate state
  const [customGates, setCustomGates] = useState<CustomApprovalGate[]>([]);
  const [newGateName, setNewGateName] = useState('');
  const [creatingGate, setCreatingGate] = useState(false);
  const [updatingGateId, setUpdatingGateId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch custom approval gates when dialog opens
  useEffect(() => {
    if (open && line && orderId) {
      fetchCustomGates();
    }
  }, [open, line?.id, orderId]);

  const fetchCustomGates = async () => {
    if (!line || !orderId) return;
    try {
      const response = await api.get(`/orders/${orderId}/lines/${line.id}/custom-gates/`);
      setCustomGates(response.data);
    } catch (error) {
      console.error('Failed to fetch custom gates:', error);
    }
  };

  const handleCreateCustomGate = async () => {
    if (!line || !orderId || !newGateName.trim()) return;
    
    setCreatingGate(true);
    try {
      const response = await api.post(`/orders/${orderId}/lines/${line.id}/custom-gates/`, {
        name: newGateName.trim(),
        orderLineId: line.id,
      });
      setCustomGates(prev => [...prev, response.data]);
      setNewGateName('');
      toast({
        title: 'Success',
        description: `Custom gate "${newGateName.trim()}" created`,
      });
    } catch (error: any) {
      console.error('Failed to create custom gate:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create custom gate',
        variant: 'destructive',
      });
    } finally {
      setCreatingGate(false);
    }
  };

  const handleDeleteCustomGate = async (gateId: string) => {
    if (!orderId) return;
    try {
      await api.delete(`/orders/${orderId}/custom-gates/${gateId}/`);
      setCustomGates(prev => prev.filter(g => g.id !== gateId));
      toast({
        title: 'Success',
        description: 'Custom gate deleted',
      });
    } catch (error: any) {
      console.error('Failed to delete custom gate:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete custom gate',
        variant: 'destructive',
      });
    }
  };

  const handleCustomGateStatusChange = async (gateId: string, newStatus: string, customTimestamp?: string) => {
    if (!orderId) return;
    
    setUpdatingGateId(gateId);
    try {
      const response = await api.patch(`/orders/${orderId}/custom-gates/${gateId}/`, {
        status: newStatus,
        ...(customTimestamp && { customTimestamp }),
      });
      setCustomGates(prev => prev.map(g => g.id === gateId ? response.data : g));
    } catch (error: any) {
      console.error('Failed to update custom gate:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update custom gate',
        variant: 'destructive',
      });
    } finally {
      setUpdatingGateId(null);
    }
  };

  // Sync local state when the sheet opens or when line data changes
  // This ensures the UI updates immediately when approval/status changes are made
  useEffect(() => {
    if (!line) return;

    if (open) {
      setSelectedStatus(line.status || '');
      setSelectedApprovals(line.approvalStatus || {});
      // Initialize swatch dates
      setSwatchReceivedDate(line.swatchReceivedDate || '');
      setSwatchSentDate(line.swatchSentDate || '');
    } else {
      setSelectedStatus('');
      setSelectedApprovals({});
      // Reset mill offer inputs when dialog closes
      setNewMillName('');
      setNewMillPrice('');
      setSwatchReceivedDate('');
      setSwatchSentDate('');
    }
  }, [open, line?.id, line?.approvalStatus, line?.status, line?.swatchReceivedDate, line?.swatchSentDate]);

  // Handle adding a new mill offer
  const handleAddMillOffer = async () => {
    if (!line || !onMillOfferAdd || !newMillName.trim() || !newMillPrice) return;
    
    const price = parseFloat(newMillPrice);
    if (isNaN(price) || price <= 0) return;
    
    setAddingMillOffer(true);
    try {
      await onMillOfferAdd(line.id, newMillName.trim(), price, line.currency || 'USD');
      setNewMillName('');
      setNewMillPrice('');
    } finally {
      setAddingMillOffer(false);
    }
  };

  // Handle deleting a mill offer
  const handleDeleteMillOffer = async (millOfferId: string) => {
    if (!onMillOfferDelete) return;
    await onMillOfferDelete(millOfferId);
  };

  // Handle saving swatch dates
  const handleSaveSwatchDates = async () => {
    if (!line || !onSwatchDatesChange) return;
    
    setSavingSwatchDates(true);
    try {
      await onSwatchDatesChange(
        line.id,
        swatchReceivedDate || null,
        swatchSentDate || null
      );
    } finally {
      setSavingSwatchDates(false);
    }
  };

  // Reset dialog state when closed
  const resetTimestampDialog = () => {
    setShowTimestampDialog(false);
    setPendingApproval(null);
    setUseCustomTimestamp(false);
    setCustomDate('');
    setCustomTime('');
  };

  // Get current date/time for default values
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    return { date, time };
  };

  if (!line) return null;

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !onStatusChange) return;
    await onStatusChange(line.id, selectedStatus);
    onClose();
  };

  // Called when user selects an approval status from dropdown
  const handleApprovalSelect = (approvalType: string, newStatus: string) => {
    // Don't show dialog for 'default' selection (clearing the status)
    if (newStatus === 'default' || newStatus === '') {
      handleApprovalUpdate(approvalType, '');
      return;
    }
    
    // Check if this is an actual change
    const currentStatus = line.approvalStatus?.[approvalType] || 'default';
    if (newStatus === currentStatus) return;
    
    // Show the timestamp dialog
    setPendingApproval({ approvalType, newStatus });
    const { date, time } = getCurrentDateTime();
    setCustomDate(date);
    setCustomTime(time);
    setShowTimestampDialog(true);
  };

  // Called when user confirms the approval change in the dialog
  const handleConfirmApproval = async () => {
    if (!pendingApproval || !onApprovalChange) return;
    
    const { approvalType, newStatus } = pendingApproval;
    const label = `${line.styleNumber || ''} ${line.colorCode || ''} ${line.cadCode || ''}`.trim();
    
    // Build custom timestamp if user wants to use one
    let customTimestamp: string | undefined;
    if (useCustomTimestamp && customDate && customTime) {
      customTimestamp = `${customDate}T${customTime}:00`;
    }
    
    resetTimestampDialog();
    
    // Update the approval with optional custom timestamp
    await onApprovalChange(approvalType, newStatus, line.id, label, customTimestamp);
    
    // Reset the dropdown back to 'default' after successful submission
    // This allows the user to add multiple consecutive entries of the same status
    // (e.g., multiple "Submission" entries for Quality on different dates)
    setSelectedApprovals(prev => ({ ...prev, [approvalType]: 'default' }));
  };

  // Called when user cancels the approval change
  const handleCancelApproval = () => {
    // Revert the local selection state
    if (pendingApproval) {
      const originalStatus = line.approvalStatus?.[pendingApproval.approvalType] || 'default';
      setSelectedApprovals(prev => ({ ...prev, [pendingApproval.approvalType]: originalStatus }));
    }
    resetTimestampDialog();
  };

  const handleApprovalUpdate = async (approvalType: string, newStatus: string) => {
    if (!onApprovalChange) return;
    const label = `${line.styleNumber || ''} ${line.colorCode || ''} ${line.cadCode || ''}`.trim();
    
    // Update the approval - no auto-advance, stage changes are manual
    await onApprovalChange(approvalType, newStatus, line.id, label);
  };

  // All approval gates are shown at all times - stage changes are manual
  const allApprovalTypes = ['price', 'quality', 'labDip', 'strikeOff', 'handloom', 'ppSample'];

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Order Line Details</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => {
                router.push(`/orders/${orderId}/edit?lineId=${line.id}`);
                onClose();
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Line
            </Button>
          </div>
          <DialogDescription>
            View and manage line item status and approvals
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Line Identification */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Line Identification</h3>
            <div className="flex flex-wrap gap-2">
              {line.styleNumber && (
                <Badge className="bg-indigo-600 text-white font-semibold px-4 py-2 text-base">
                  {line.styleNumber}
                </Badge>
              )}
              {line.colorCode && (
                <Badge className="bg-blue-100 text-blue-800 font-mono px-4 py-2 text-base">
                  {line.colorCode}
                </Badge>
              )}
              {line.cadCode && (
                <Badge className="bg-purple-100 text-purple-800 font-mono px-4 py-2 text-base">
                  {line.cadCode}
                </Badge>
              )}
            </div>
            {(line.colorName || line.cadName) && (
              <div className="text-sm text-gray-600 space-y-1">
                {line.colorName && <div>Color: {line.colorName}</div>}
                {line.cadName && <div>CAD: {line.cadName}</div>}
              </div>
            )}
            {/* Style Details */}
            {(line.description || line.fabricComposition || line.gsm || line.cuttableWidth || line.finishingWidth) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {line.description && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Description:</span>{' '}
                      <span className="text-gray-800">{line.description}</span>
                    </div>
                  )}
                  {line.fabricComposition && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Fabric Composition:</span>{' '}
                      <span className="text-gray-800 font-medium">{line.fabricComposition}</span>
                    </div>
                  )}
                  {line.gsm && (
                    <div>
                      <span className="text-gray-500">GSM:</span>{' '}
                      <span className="text-gray-800 font-medium">{line.gsm}</span>
                    </div>
                  )}
                  {(line.cuttableWidth || line.finishingWidth) && (
                    <div>
                      <span className="text-gray-500">Width:</span>{' '}
                      <span className="text-gray-800 font-medium">
                        {line.cuttableWidth && `${line.cuttableWidth} (Cuttable)`}
                        {line.cuttableWidth && line.finishingWidth && ' / '}
                        {line.finishingWidth && `${line.finishingWidth} (Finishing)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-gray-700">Current Status</Label>
              <Badge className={`${getStatusBadgeClass(selectedStatus || line.status || 'upcoming')} font-medium px-3 py-1.5`}>
                {getStatusDisplayName(selectedStatus || line.status || 'upcoming')}
              </Badge>
            </div>
          </div>

          {/* Commercial Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Commercial Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Quantity</Label>
                <p className="text-lg font-semibold">{line.quantity.toLocaleString()} {line.unit}</p>
              </div>
              {line.millPrice && (
                <div>
                  <Label className="text-xs text-gray-500">Mill Price</Label>
                  <p className="text-lg font-semibold">{line.currency || 'USD'} {line.millPrice.toFixed(2)}</p>
                </div>
              )}
              {line.provaPrice && (
                <div>
                  <Label className="text-xs text-gray-500">Prova Price</Label>
                  <p className="text-lg font-semibold text-green-700">{line.currency || 'USD'} {line.provaPrice.toFixed(2)}</p>
                </div>
              )}
              {line.commission && (
                <div>
                  <Label className="text-xs text-gray-500">Commission</Label>
                  <p className="text-lg font-semibold text-orange-600">{line.commission.toFixed(2)}%</p>
                </div>
              )}
              {line.etd && (
                <div>
                  <Label className="text-xs text-gray-500">ETD</Label>
                  <p className="text-lg font-semibold text-blue-600">{formatDate(line.etd)}</p>
                </div>
              )}
              {line.eta && (
                <div>
                  <Label className="text-xs text-gray-500">ETA</Label>
                  <p className="text-lg font-semibold text-green-600">{formatDate(line.eta)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mill Offers Section - Only show for In Development status */}
          {(line.status === 'in_development' || selectedStatus === 'in_development') && onMillOfferAdd && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                Mill Price Quotes
                <span className="text-sm font-normal text-gray-600">(Development Stage)</span>
              </h3>
              
              {/* Existing Mill Offers */}
              {line.millOffers && line.millOffers.length > 0 && (
                <div className="space-y-2">
                  {line.millOffers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-gray-900">{offer.millName}</div>
                        <div className="text-lg font-semibold text-green-700">
                          ${offer.price.toFixed(2)}
                        </div>
                      </div>
                      {onMillOfferDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMillOffer(offer.id)}
                          disabled={updating}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add New Mill Offer */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <Label className="text-sm font-semibold text-blue-900">Add Mill Price Quote</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Mill Name</Label>
                    <Input
                      placeholder="e.g., First Concept"
                      value={newMillName}
                      onChange={(e) => setNewMillName(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Mill Price ($/unit)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 1.05"
                      value={newMillPrice}
                      onChange={(e) => setNewMillPrice(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddMillOffer}
                  disabled={addingMillOffer || !newMillName.trim() || !newMillPrice}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {addingMillOffer ? 'Adding...' : 'Add Mill Price'}
                </Button>
              </div>
            </div>
          )}

          {/* Swatch Dates Section - Only show for In Development status */}
          {(line.status === 'in_development' || selectedStatus === 'in_development') && onSwatchDatesChange && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Swatch Tracking
                <span className="text-sm font-normal text-gray-600">(Development Stage)</span>
              </h3>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Swatch Received Date</Label>
                    <Input
                      type="date"
                      value={swatchReceivedDate}
                      onChange={(e) => setSwatchReceivedDate(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Swatch Sent Date</Label>
                    <Input
                      type="date"
                      value={swatchSentDate}
                      onChange={(e) => setSwatchSentDate(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveSwatchDates}
                  disabled={savingSwatchDates || (swatchReceivedDate === (line.swatchReceivedDate || '') && swatchSentDate === (line.swatchSentDate || ''))}
                  className="w-full"
                  variant="outline"
                >
                  {savingSwatchDates ? 'Saving...' : 'Save Swatch Dates'}
                </Button>
              </div>
            </div>
          )}

          {/* Status Update Section */}
          {onStatusChange && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <Label className="text-sm font-semibold text-blue-900">Update Line Status</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedStatus || line.status || 'upcoming'} 
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="flex-1 bg-white">
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
                  onClick={handleStatusUpdate} 
                  disabled={updating || !selectedStatus || selectedStatus === line.status}
                >
                  {updating ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          )}

          {/* Approval Gates - Always show all 6 approval points */}
          {onApprovalChange && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Approval Gates
                <span className="text-sm font-normal text-gray-600 ml-2">(All approvals - stage changes are manual)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allApprovalTypes.map((approvalType) => (
                  <div key={approvalType} className="p-3 border rounded-lg space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      {getApprovalIcon(selectedApprovals[approvalType] || line.approvalStatus?.[approvalType] || 'default')}
                      {formatApprovalName(approvalType)}
                    </Label>
                    <Select
                      value={selectedApprovals[approvalType] || line.approvalStatus?.[approvalType] || 'default'}
                      onValueChange={(value) => {
                        // Show confirmation dialog with optional timestamp
                        handleApprovalSelect(approvalType, value);
                      }}
                      disabled={updating}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="submission">Submission</SelectItem>
                        <SelectItem value="resubmission">Re-submission</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {/* Custom Approval Gates */}
                {customGates.map((gate) => (
                  <div key={gate.id} className="p-3 border rounded-lg space-y-2 bg-purple-50 border-purple-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        {getApprovalIcon(gate.status)}
                        {gate.name}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-300">
                          Custom
                        </Badge>
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomGate(gate.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Select
                      value={gate.status}
                      onValueChange={(value) => handleCustomGateStatusChange(gate.id, value)}
                      disabled={updatingGateId === gate.id}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="submission">Submission</SelectItem>
                        <SelectItem value="resubmission">Re-submission</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Add Custom Gate Section */}
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Add Custom Approval Gate</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter gate name (e.g., Buyer Approval)"
                    value={newGateName}
                    onChange={(e) => setNewGateName(e.target.value)}
                    className="flex-1 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newGateName.trim()) {
                        handleCreateCustomGate();
                      }
                    }}
                  />
                  <Button
                    onClick={handleCreateCustomGate}
                    disabled={creatingGate || !newGateName.trim()}
                    size="sm"
                  >
                    {creatingGate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Go to Next Stage button - Independent of approval gates */}
          {['upcoming', 'in_development', 'running', 'bulk'].includes(line.status || 'upcoming') && onStatusChange && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={updating}
                onClick={async () => {
                  const currentStatus = line.status || 'upcoming';
                  let nextStatus = '';

                  if (currentStatus === 'upcoming') {
                    nextStatus = 'in_development';
                  } else if (currentStatus === 'in_development') {
                    nextStatus = 'running';
                  } else if (currentStatus === 'running') {
                    nextStatus = 'bulk';
                  } else if (currentStatus === 'bulk') {
                    nextStatus = 'completed';
                  }

                  if (!nextStatus) return;

                  await onStatusChange(line.id, nextStatus);
                }}
              >
                {updating ? 'Moving to next stage...' : 'Go to Next Stage'}
              </Button>
            </div>
          )}

          {/* Notes Section */}
          {line.notes && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Label className="text-sm font-semibold text-yellow-900 mb-2 block">Notes</Label>
              <p className="text-sm text-yellow-700">{line.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Approval Timestamp Dialog */}
    <Dialog open={showTimestampDialog} onOpenChange={(open) => !open && handleCancelApproval()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Confirm Approval Change
            </DialogTitle>
            <DialogDescription>
              {pendingApproval && (
                <>
                  Set <strong>{formatApprovalName(pendingApproval.approvalType)}</strong> to{' '}
                  <strong className="capitalize">{pendingApproval.newStatus}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Option to use custom timestamp */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useCustomTimestamp"
                checked={useCustomTimestamp}
                onCheckedChange={(checked) => setUseCustomTimestamp(checked === true)}
              />
              <label
                htmlFor="useCustomTimestamp"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Set custom date and time
              </label>
            </div>

            {/* Date/Time inputs - shown when custom timestamp is enabled */}
            {useCustomTimestamp && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="customDate" className="text-sm">Date</Label>
                  <Input
                    id="customDate"
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customTime" className="text-sm">Time</Label>
                  <Input
                    id="customTime"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Info text */}
            <p className="text-xs text-muted-foreground">
              {useCustomTimestamp 
                ? 'The approval will be recorded with the date and time you specified above.'
                : 'The approval will be recorded with the current date and time.'}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelApproval}>
              Cancel
            </Button>
            <Button onClick={handleConfirmApproval} disabled={updating}>
              {updating ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
