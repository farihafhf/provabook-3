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
import { 
  Loader2, 
  Plus, 
  Calendar, 
  Pencil, 
  Trash2, 
  MessageSquare,
  Factory,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageCircle,
  Target,
  ClipboardList
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ActivityLogItem {
  id: string;
  orderId: string;
  orderLineId?: string;
  category: string;
  categoryDisplay: string;
  content: string;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  lineLabel?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLogDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  lineId?: string;
  lineLabel?: string;
  onRefresh?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Update', icon: MessageSquare },
  { value: 'production', label: 'Production Update', icon: Factory },
  { value: 'quality', label: 'Quality Note', icon: CheckCircle2 },
  { value: 'communication', label: 'Communication', icon: MessageCircle },
  { value: 'milestone', label: 'Milestone', icon: Target },
  { value: 'issue', label: 'Issue/Problem', icon: AlertTriangle },
  { value: 'plan', label: 'Plan/Schedule', icon: ClipboardList },
];

const getCategoryIcon = (category: string) => {
  const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
  if (option) {
    const Icon = option.icon;
    return <Icon className="h-4 w-4" />;
  }
  return <MessageSquare className="h-4 w-4" />;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'production':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'quality':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'communication':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'milestone':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'issue':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'plan':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export function ActivityLogDialog({
  open,
  onClose,
  orderId,
  lineId,
  lineLabel,
  onRefresh,
}: ActivityLogDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  
  // Add new entry state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState('general');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLogItem | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLog, setDeletingLog] = useState<ActivityLogItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      fetchActivityLogs();
    }
  }, [open, orderId, lineId]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      let url = `/orders/${orderId}/activity-logs/`;
      if (lineId) {
        url = `/orders/${orderId}/lines/${lineId}/activity-logs/`;
      }
      const response = await api.get(url);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newContent.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter some content for the update',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        category: newCategory,
        content: newContent.trim(),
      };
      if (lineId) {
        payload.orderLineId = lineId;
      }

      await api.post(`/orders/${orderId}/activity-logs/`, payload);
      
      toast({
        title: 'Success',
        description: 'Activity log entry added',
      });
      
      setNewContent('');
      setNewCategory('general');
      setShowAddForm(false);
      await fetchActivityLogs();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: unknown) {
      console.error('Failed to add activity log:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add activity log entry';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (log: ActivityLogItem) => {
    setEditingLog(log);
    setEditCategory(log.category);
    setEditContent(log.content);
    
    const logDate = new Date(log.createdAt);
    setEditDate(logDate.toISOString().split('T')[0]);
    setEditTime(logDate.toTimeString().slice(0, 5));
    
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLog || !editContent.trim()) return;
    
    setEditSaving(true);
    try {
      const customTimestamp = `${editDate}T${editTime}:00`;
      
      await api.patch(`/orders/${orderId}/activity-logs/${editingLog.id}/`, {
        category: editCategory,
        content: editContent.trim(),
        customTimestamp,
      });
      
      toast({
        title: 'Success',
        description: 'Activity log entry updated',
      });
      
      await fetchActivityLogs();
      
      if (onRefresh) {
        onRefresh();
      }
      
      setShowEditDialog(false);
      setEditingLog(null);
    } catch (error: unknown) {
      console.error('Failed to update activity log:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update activity log entry';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenDelete = (log: ActivityLogItem) => {
    setDeletingLog(log);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    
    setDeleting(true);
    try {
      await api.delete(`/orders/${orderId}/activity-logs/${deletingLog.id}/`);
      
      toast({
        title: 'Success',
        description: 'Activity log entry deleted',
      });
      
      await fetchActivityLogs();
      
      if (onRefresh) {
        onRefresh();
      }
      
      setShowDeleteDialog(false);
      setDeletingLog(null);
    } catch (error: unknown) {
      console.error('Failed to delete activity log:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete activity log entry';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Activity Log
          </DialogTitle>
          <DialogDescription>
            {lineLabel ? `Updates for ${lineLabel}` : 'Order-level updates and notes'}
          </DialogDescription>
        </DialogHeader>

        {/* Add New Entry Button/Form */}
        <div className="border-b pb-4">
          {!showAddForm ? (
            <Button 
              onClick={() => setShowAddForm(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Update
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Update Content</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter your update... (e.g., 'Knitting completed 500 yards today', 'Factory plans to finish dyeing tomorrow')"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewContent('');
                    setNewCategory('general');
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddEntry} disabled={saving || !newContent.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Update'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No activity logs yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Add your first update to start tracking progress
            </p>
          </div>
        ) : (
          <div className="relative py-4">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200" />

            {/* Timeline Items */}
            <div className="space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-14">
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-1 flex items-center justify-center">
                    <div className={`bg-white p-1.5 rounded-full border-2 shadow-md ${getCategoryColor(log.category).replace('bg-', 'border-').split(' ')[0]}`}>
                      {getCategoryIcon(log.category)}
                    </div>
                  </div>

                  {/* Timeline Content Card */}
                  <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getCategoryColor(log.category)} border font-medium`}>
                            {log.categoryDisplay}
                          </Badge>
                          {log.lineLabel && (
                            <Badge variant="outline" className="text-xs">
                              {log.lineLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(log)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleOpenDelete(log)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Content - truncated by default, expands on hover */}
                      <p 
                        className="text-gray-900 whitespace-pre-wrap line-clamp-3 hover:line-clamp-none cursor-pointer transition-all duration-200"
                        title={log.content}
                      >
                        {log.content}
                      </p>

                      {/* Footer */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(log.createdAt).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {log.createdByName && (
                          <span className="text-gray-400">by {log.createdByName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
            Edit Activity Log
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={editCategory} onValueChange={setEditCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={editSaving || !editContent.trim()}>
            {editSaving ? (
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
            Delete Activity Log
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this entry? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {deletingLog && (
          <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-gray-900 line-clamp-3">{deletingLog.content}</p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(deletingLog.createdAt).toLocaleString()}
            </p>
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
