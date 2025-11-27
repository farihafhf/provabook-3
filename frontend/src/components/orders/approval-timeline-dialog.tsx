'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, RotateCcw, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface ApprovalHistoryItem {
  id: string;
  approvalType: string;
  status: string;
  changedByName?: string;
  changedByEmail?: string;
  createdAt: string;
  notes?: string;
}

interface ApprovalTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  lineId: string;
  lineLabel: string;
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
}: ApprovalTimelineDialogProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);

  useEffect(() => {
    if (open && orderId && lineId) {
      fetchApprovalHistory();
    }
  }, [open, orderId, lineId]);

  const fetchApprovalHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/orders/${orderId}/lines/${lineId}/approval-history/`);
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No approval history yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Approval changes will appear here as they happen
            </p>
          </div>
        ) : (
          <div className="relative py-6">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200" />

            {/* Timeline Items */}
            <div className="space-y-8">
              {history.map((item, index) => (
                <div key={item.id} className="relative pl-14">
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-1 flex items-center justify-center">
                    <div className="bg-white p-1.5 rounded-full border-2 border-indigo-300 shadow-md">
                      {getStatusIcon(item.status)}
                    </div>
                  </div>

                  {/* Timeline Content Card */}
                  <div className="bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900">
                            {formatApprovalType(item.approvalType)}
                          </h4>
                          <Badge className={`mt-1 ${getStatusColor(item.status)} border font-medium`}>
                            {getStatusLabel(item.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        {item.changedByName && (
                          <div className="text-sm">
                            <span className="text-gray-500">Changed by: </span>
                            <span className="text-gray-900 font-medium">{item.changedByName}</span>
                            {item.changedByEmail && (
                              <span className="text-gray-400 ml-1">({item.changedByEmail})</span>
                            )}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-sm">
                            <span className="text-gray-500">Notes: </span>
                            <span className="text-gray-900">{item.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          {new Date(item.createdAt).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
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
  );
}
