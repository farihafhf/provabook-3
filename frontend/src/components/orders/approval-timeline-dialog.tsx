'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Clock, RotateCcw, Calendar, Ship, Plane, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ApprovalHistoryItem {
  id: string;
  approvalType: string;
  status: string;
  changedByName?: string;
  changedByEmail?: string;
  createdAt: string;
  notes?: string;
}

interface TimelineEvent {
  id: string;
  type: 'approval' | 'etd' | 'eta';
  date: string;
  approvalType?: string;
  status?: string;
  changedByName?: string;
  changedByEmail?: string;
  notes?: string;
}

interface ApprovalTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  lineId: string;
  lineLabel: string;
  onRefresh?: () => void; // Callback to refresh parent data when approval stages are modified
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'resubmission':
      return <RotateCcw className="h-5 w-5 text-orange-600" />;
    case 'submission':
      return <Clock className="h-5 w-5 text-blue-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'resubmission':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'submission':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'resubmission':
      return 'Re-submission';
    case 'submission':
      return 'Submission';
    default:
      return status;
  }
};

const formatApprovalType = (type: string) => {
  const mapping: Record<string, string> = {
    labDip: 'Lab Dip',
    strikeOff: 'Strike-Off',
    handloom: 'Handloom',
    ppSample: 'PP Sample',
    quality: 'Quality',
    price: 'Price',
    aop: 'AOP',
    qualityTest: 'Quality Test',
    bulkSwatch: 'Bulk Swatch',
  };
  return mapping[type] || type;
};

export function ApprovalTimelineDialog({
  open,
  onClose,
  orderId,
  lineId,
  lineLabel,
  onRefresh,
}: ApprovalTimelineDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<TimelineEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && orderId && lineId) {
      fetchApprovalHistory();
    }
  }, [open, orderId, lineId]);

  const fetchApprovalHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/orders/${orderId}/lines/${lineId}/approval-history/`);
      const { history = [], etd, eta } = response.data;
      
      // Convert approval history to timeline events
      const approvalEvents: TimelineEvent[] = history.map((item: ApprovalHistoryItem) => ({
        id: item.id,
        type: 'approval' as const,
        date: item.createdAt,
        approvalType: item.approvalType,
        status: item.status,
        changedByName: item.changedByName,
        changedByEmail: item.changedByEmail,
        notes: item.notes,
      }));
      
      // Add ETD/ETA as timeline events if they exist
      const dateEvents: TimelineEvent[] = [];
      if (etd) {
        dateEvents.push({
          id: `etd-${lineId}`,
          type: 'etd' as const,
          date: etd,
        });
      }
      if (eta) {
        dateEvents.push({
          id: `eta-${lineId}`,
          type: 'eta' as const,
          date: eta,
        });
      }
      
      // Combine and sort all events by date (latest first)
      const allEvents = [...approvalEvents, ...dateEvents].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setTimelineEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const handleOpenEdit = (event: TimelineEvent) => {
    setEditingEvent(event);
    setEditStatus(event.status || '');
    setEditNotes(event.notes || '');
    
    // Parse the date/time from createdAt
    const eventDate = new Date(event.date);
    setEditDate(eventDate.toISOString().split('T')[0]);
    setEditTime(eventDate.toTimeString().slice(0, 5));
    
    setShowEditDialog(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    
    setSaving(true);
    try {
      const customTimestamp = `${editDate}T${editTime}:00`;
      
      await api.patch(`/orders/${orderId}/approval-history/${editingEvent.id}/`, {
        status: editStatus,
        notes: editNotes,
        customTimestamp,
      });
      
      toast({
        title: 'Success',
        description: 'Approval stage updated successfully',
      });
      
      // Refresh the timeline
      await fetchApprovalHistory();
      
      // Notify parent to refresh
      if (onRefresh) {
        onRefresh();
      }
      
      setShowEditDialog(false);
      setEditingEvent(null);
    } catch (error: any) {
      console.error('Failed to update approval history:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update approval stage',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation
  const handleOpenDelete = (event: TimelineEvent) => {
    setDeletingEvent(event);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    
    setDeleting(true);
    try {
      await api.delete(`/orders/${orderId}/approval-history/${deletingEvent.id}/delete/`);
      
      toast({
        title: 'Success',
        description: 'Approval stage deleted successfully',
      });
      
      // Refresh the timeline
      await fetchApprovalHistory();
      
      // Notify parent to refresh
      if (onRefresh) {
        onRefresh();
      }
      
      setShowDeleteDialog(false);
      setDeletingEvent(null);
    } catch (error: any) {
      console.error('Failed to delete approval history:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete approval stage',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Approval Timeline
          </DialogTitle>
          <p className="text-sm text-gray-600">{lineLabel}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No timeline events yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Timeline events will appear here as they happen
            </p>
          </div>
        ) : (
          <div className="relative py-6">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200" />

            {/* Timeline Items */}
            <div className="space-y-8">
              {timelineEvents.map((event) => {
                const isApproval = event.type === 'approval';
                const isETD = event.type === 'etd';
                const isETA = event.type === 'eta';
                
                return (
                  <div key={event.id} className="relative pl-14">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1 flex items-center justify-center">
                      <div className={`bg-white p-1.5 rounded-full border-2 shadow-md ${
                        isETD ? 'border-blue-400' : isETA ? 'border-purple-400' : 'border-indigo-300'
                      }`}>
                        {isETD ? (
                          <Ship className="h-5 w-5 text-blue-600" />
                        ) : isETA ? (
                          <Plane className="h-5 w-5 text-purple-600" />
                        ) : (
                          getStatusIcon(event.status!)
                        )}
                      </div>
                    </div>

                    {/* Timeline Content Card */}
                    <div className="bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">
                              {isETD
                                ? 'Estimated Time of Departure (ETD)'
                                : isETA
                                ? 'Estimated Time of Arrival (ETA)'
                                : formatApprovalType(event.approvalType!)}
                            </h4>
                            {isApproval && (
                              <Badge className={`mt-1 ${getStatusColor(event.status!)} border font-medium`}>
                                {getStatusLabel(event.status!)}
                              </Badge>
                            )}
                            {(isETD || isETA) && (
                              <Badge className="mt-1 bg-sky-100 text-sky-800 border-sky-300 border font-medium">
                                Milestone
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(event.date)}</span>
                            </div>
                            {/* Edit/Delete buttons for approval events only */}
                            {isApproval && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  onClick={() => handleOpenEdit(event)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  onClick={() => handleOpenDelete(event)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        {isApproval && (
                          <div className="space-y-2">
                            {event.changedByName && (
                              <div className="text-sm">
                                <span className="text-gray-500">Changed by: </span>
                                <span className="text-gray-900 font-medium">{event.changedByName}</span>
                                {event.changedByEmail && (
                                  <span className="text-gray-400 ml-1">({event.changedByEmail})</span>
                                )}
                              </div>
                            )}
                            {event.notes && (
                              <div className="text-sm">
                                <span className="text-gray-500">Notes: </span>
                                <span className="text-gray-900">{event.notes}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            {new Date(event.date).toLocaleString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              ...(isApproval ? { hour: '2-digit', minute: '2-digit' } : {}),
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Edit Dialog */}
    <Dialog open={showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-600" />
            Edit Approval Stage
          </DialogTitle>
          <DialogDescription>
            {editingEvent && (
              <>Modify the {formatApprovalType(editingEvent.approvalType!)} approval entry</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="editStatus">Status</Label>
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submission">Submission</SelectItem>
                <SelectItem value="resubmission">Re-submission</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editDate">Date</Label>
              <Input
                id="editDate"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTime">Time</Label>
              <Input
                id="editTime"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="editNotes">Notes (optional)</Label>
            <Textarea
              id="editNotes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Approval Stage
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this approval entry? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {deletingEvent && (
          <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-gray-900">
              {formatApprovalType(deletingEvent.approvalType!)} - {getStatusLabel(deletingEvent.status!)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(deletingEvent.date).toLocaleString()}
            </p>
            {deletingEvent.changedByName && (
              <p className="text-xs text-gray-500">Changed by: {deletingEvent.changedByName}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
