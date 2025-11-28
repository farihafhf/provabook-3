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
import { CheckCircle2, XCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
}

interface LineItemDetailSheetProps {
  line: OrderLine | null;
  open: boolean;
  onClose: () => void;
  orderStatus?: string;
  onStatusChange?: (lineId: string, newStatus: string) => Promise<void>;
  onApprovalChange?: (approvalType: string, newStatus: string, lineId: string, lineLabel: string, customTimestamp?: string) => Promise<void>;
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
  orderStatus,
  onStatusChange,
  onApprovalChange,
  updating = false,
}: LineItemDetailSheetProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedApprovals, setSelectedApprovals] = useState<Record<string, string>>({});
  
  // Custom timestamp dialog state
  const [showTimestampDialog, setShowTimestampDialog] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [useCustomTimestamp, setUseCustomTimestamp] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  // Reset local selection state when the sheet opens for a new line
  useEffect(() => {
    if (!line) return;

    if (open) {
      setSelectedStatus(line.status || '');
      setSelectedApprovals(line.approvalStatus || {});
    } else {
      setSelectedStatus('');
      setSelectedApprovals({});
    }
  }, [open, line?.id]);

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
    
    // Update local state immediately
    setSelectedApprovals(prev => ({ ...prev, [approvalType]: newStatus }));
    
    // Build custom timestamp if user wants to use one
    let customTimestamp: string | undefined;
    if (useCustomTimestamp && customDate && customTime) {
      customTimestamp = `${customDate}T${customTime}:00`;
    }
    
    resetTimestampDialog();
    
    // Update the approval with optional custom timestamp
    await onApprovalChange(approvalType, newStatus, line.id, label, customTimestamp);
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
          <DialogTitle className="text-2xl">Order Line Details</DialogTitle>
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
          </div>

          {/* Current Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-gray-700">Current Status</Label>
              <Badge className={`${getStatusBadgeClass(line.status || 'upcoming')} font-medium px-3 py-1.5`}>
                {getStatusDisplayName(line.status || 'upcoming')}
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
                      {getApprovalIcon(line.approvalStatus?.[approvalType] || 'default')}
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
