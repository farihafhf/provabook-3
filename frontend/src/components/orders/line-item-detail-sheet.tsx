'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
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
  onApprovalChange?: (approvalType: string, newStatus: string, lineId: string, lineLabel: string) => Promise<void>;
  updating?: boolean;
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

  if (!line) return null;

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !onStatusChange) return;
    await onStatusChange(line.id, selectedStatus);
    onClose();
  };

  const handleApprovalUpdate = async (approvalType: string, newStatus: string) => {
    if (!onApprovalChange) return;
    const label = `${line.styleNumber || ''} ${line.colorCode || ''} ${line.cadCode || ''}`.trim();
    await onApprovalChange(approvalType, newStatus, line.id, label);
    
    // Check if all gates for current status are approved and auto-advance status
    const currentApprovals = { ...line.approvalStatus, [approvalType]: newStatus };
    await checkAndAutoAdvanceStatus(currentApprovals);
  };

  // Determine which approval gates to show based on LINE status (not order status)
  const getApprovalGatesForStatus = (status: string): string[] => {
    switch (status) {
      case 'upcoming':
      case 'in_development':
        return ['price', 'quality'];
      case 'running':
        return ['labDip', 'strikeOff', 'handloom', 'ppSample'];
      case 'bulk':
      case 'completed':
        return []; // No approval gates for bulk/completed
      default:
        return ['price', 'quality'];
    }
  };

  const approvalTypes = getApprovalGatesForStatus(line.status || 'upcoming');

  // Check if all required approvals for current stage are approved, then auto-advance
  const checkAndAutoAdvanceStatus = async (currentApprovals: Record<string, string>) => {
    if (!onStatusChange) return;
    
    const currentStatus = line.status || 'upcoming';
    const requiredGates = getApprovalGatesForStatus(currentStatus);
    
    // Check if all required gates are approved
    const allApproved = requiredGates.every(gate => currentApprovals[gate] === 'approved');
    
    if (allApproved && requiredGates.length > 0) {
      // Auto-advance to next status
      let nextStatus = '';
      if (currentStatus === 'upcoming' || currentStatus === 'in_development') {
        nextStatus = 'running';
      } else if (currentStatus === 'running') {
        nextStatus = 'bulk';
      }
      
      if (nextStatus) {
        // Small delay to let the approval update complete
        setTimeout(async () => {
          await onStatusChange(line.id, nextStatus);
        }, 500);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Order Line Details</SheetTitle>
          <SheetDescription>
            View and manage line item status and approvals
          </SheetDescription>
        </SheetHeader>

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

          {/* Approval Gates */}
          {onApprovalChange && approvalTypes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Approval Gates
                {line.status === 'upcoming' || line.status === 'in_development' ? (
                  <span className="text-sm font-normal text-gray-600 ml-2">(Price & Quality for Running)</span>
                ) : line.status === 'running' ? (
                  <span className="text-sm font-normal text-gray-600 ml-2">(Sample approvals for Bulk)</span>
                ) : null}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvalTypes.map((approvalType) => (
                  <div key={approvalType} className="p-3 border rounded-lg space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      {getApprovalIcon(line.approvalStatus?.[approvalType] || 'submission')}
                      {formatApprovalName(approvalType)}
                    </Label>
                    <Select
                      value={selectedApprovals[approvalType] || line.approvalStatus?.[approvalType] || 'submission'}
                      onValueChange={(value) => {
                        setSelectedApprovals(prev => ({ ...prev, [approvalType]: value }));
                        handleApprovalUpdate(approvalType, value);
                      }}
                      disabled={updating}
                    >
                      <SelectTrigger className="w-full">
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
                ))}
              </div>
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
      </SheetContent>
    </Sheet>
  );
}
