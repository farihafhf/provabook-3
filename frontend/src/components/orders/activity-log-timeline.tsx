'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Clock, 
  MessageSquare,
  Factory,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Target,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

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

interface ActivityLogTimelineProps {
  orderId: string;
  onRefresh?: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'production':
      return <Factory className="h-3 w-3" />;
    case 'quality':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'communication':
      return <MessageCircle className="h-3 w-3" />;
    case 'milestone':
      return <Target className="h-3 w-3" />;
    case 'issue':
      return <AlertTriangle className="h-3 w-3" />;
    case 'plan':
      return <ClipboardList className="h-3 w-3" />;
    default:
      return <MessageSquare className="h-3 w-3" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'production':
      return 'bg-blue-100 text-blue-700 border-blue-500';
    case 'quality':
      return 'bg-green-100 text-green-700 border-green-500';
    case 'communication':
      return 'bg-purple-100 text-purple-700 border-purple-500';
    case 'milestone':
      return 'bg-amber-100 text-amber-700 border-amber-500';
    case 'issue':
      return 'bg-red-100 text-red-700 border-red-500';
    case 'plan':
      return 'bg-indigo-100 text-indigo-700 border-indigo-500';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-500';
  }
};

const formatDateTime = (dateString: string): { date: string; time: string } => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

export function ActivityLogTimeline({ orderId, onRefresh }: ActivityLogTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);

  useEffect(() => {
    if (orderId) {
      fetchActivityLogs();
    }
  }, [orderId]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      console.log('ActivityLogTimeline: Fetching logs for order', orderId);
      const response = await api.get(`/orders/${orderId}/activity-logs/`);
      console.log('ActivityLogTimeline: Response', response.data);
      const allLogs = response.data.logs || [];
      console.log('ActivityLogTimeline: Got', allLogs.length, 'logs');
      // Show only the most recent 5 entries in the timeline
      setLogs(allLogs.slice(0, 5));
    } catch (error) {
      console.error('ActivityLogTimeline: Failed to fetch activity logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-600" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-gray-500" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No activity logs yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add updates to track progress
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-indigo-600" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200" />
          
          <div className="space-y-4">
            {logs.map((log) => {
              const { date, time } = formatDateTime(log.createdAt);
              const colorClass = getCategoryColor(log.category);
              
              return (
                <div key={log.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div 
                    className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center border-2 ${colorClass}`}
                  >
                    {getCategoryIcon(log.category)}
                  </div>
                  
                  {/* Content */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge 
                        className={`text-xs font-medium ${colorClass.replace('border-', 'hover:bg-')}`}
                      >
                        {log.categoryDisplay}
                      </Badge>
                      {log.lineLabel && (
                        <Badge variant="outline" className="text-xs">
                          {log.lineLabel}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                      {log.content}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium">{date}</span>
                      <span>{time}</span>
                    </div>
                    
                    {log.createdByName && (
                      <div className="text-xs text-gray-400 mt-1">
                        by {log.createdByName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-center text-gray-500">
            Showing {logs.length} most recent {logs.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
