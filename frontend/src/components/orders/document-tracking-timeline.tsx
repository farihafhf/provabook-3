'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, FileCheck, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Document {
  id: string;
  fileName: string;
  category: string;
  subcategory?: string;
  createdAt: string;
  uploadedByName?: string;
}

interface DocumentTrackingTimelineProps {
  documents: Document[];
}

interface TimelineItem {
  id: string;
  type: 'lc' | 'pi';
  label: string;
  fileName: string;
  date: string;
  uploadedBy?: string;
}

const formatDateTime = (dateString: string): { date: string; time: string } => {
  const date = new Date(dateString);
  return {
    date: formatDate(dateString),
    time: date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

export function DocumentTrackingTimeline({ documents }: DocumentTrackingTimelineProps) {
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    
    // Filter LC and PI documents and sort by date
    const lcDocs = documents
      .filter(doc => doc.category === 'lc')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const piDocs = documents
      .filter(doc => doc.category === 'pi')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Add LC documents to timeline
    lcDocs.forEach((doc, index) => {
      const isFirst = index === 0;
      items.push({
        id: doc.id,
        type: 'lc',
        label: isFirst ? 'LC Received' : `LC Amendment ${index}`,
        fileName: doc.fileName,
        date: doc.createdAt,
        uploadedBy: doc.uploadedByName
      });
    });
    
    // Add PI documents to timeline
    piDocs.forEach((doc, index) => {
      const isFirst = index === 0;
      items.push({
        id: doc.id,
        type: 'pi',
        label: isFirst ? 'PI Issued' : `PI Revision ${index}`,
        fileName: doc.fileName,
        date: doc.createdAt,
        uploadedBy: doc.uploadedByName
      });
    });
    
    // Sort all items by date (newest first for display)
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [documents]);

  if (timelineItems.length === 0) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            Document Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No LC or PI documents uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload LC or PI documents to track dates
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
          <FileCheck className="h-4 w-4 text-indigo-600" />
          Document Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
          
          <div className="space-y-4">
            {timelineItems.map((item, index) => {
              const { date, time } = formatDateTime(item.date);
              const isLC = item.type === 'lc';
              
              return (
                <div key={item.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div 
                    className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${
                      isLC 
                        ? 'bg-blue-100 border-2 border-blue-500' 
                        : 'bg-green-100 border-2 border-green-500'
                    }`}
                  >
                    <FileText className={`h-3 w-3 ${isLC ? 'text-blue-600' : 'text-green-600'}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        className={`text-xs font-medium ${
                          isLC 
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' 
                            : 'bg-green-100 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {item.label}
                      </Badge>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-800 truncate mb-1" title={item.fileName}>
                      {item.fileName}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium">{date}</span>
                      <span>{time}</span>
                    </div>
                    
                    {item.uploadedBy && (
                      <div className="text-xs text-gray-400 mt-1">
                        by {item.uploadedBy}
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
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-gray-600">
                  LC: {timelineItems.filter(i => i.type === 'lc').length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-gray-600">
                  PI: {timelineItems.filter(i => i.type === 'pi').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
