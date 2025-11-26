'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface LineItemCardProps {
  line: {
    id: string;
    styleNumber?: string;
    colorCode?: string;
    colorName?: string;
    cadCode?: string;
    cadName?: string;
    quantity: number;
    unit: string;
    status?: string;
    etd?: string;
    provaPrice?: number;
    currency?: string;
  };
  onClick?: () => void;
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

const getETDUrgency = (etdDate?: string): { text: string; color: string; days: number } => {
  if (!etdDate) return { text: 'No ETD set', color: 'text-gray-500', days: 999 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const etd = new Date(etdDate);
  etd.setHours(0, 0, 0, 0);
  
  const diffTime = etd.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { 
      text: `${Math.abs(diffDays)} days overdue`, 
      color: 'text-red-600 font-semibold', 
      days: diffDays 
    };
  } else if (diffDays === 0) {
    return { text: 'Due today!', color: 'text-red-600 font-semibold', days: 0 };
  } else if (diffDays <= 7) {
    return { text: `${diffDays} days left`, color: 'text-orange-600 font-semibold', days: diffDays };
  } else if (diffDays <= 30) {
    return { text: `${diffDays} days left`, color: 'text-yellow-600 font-medium', days: diffDays };
  } else {
    return { text: `${diffDays} days left`, color: 'text-green-600', days: diffDays };
  }
};

export function LineItemCard({ line, onClick }: LineItemCardProps) {
  const urgency = getETDUrgency(line.etd);
  
  return (
    <Card 
      className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left Section: Line Info */}
          <div className="flex-1 space-y-3">
            {/* Header with badges */}
            <div className="flex flex-wrap items-center gap-2">
              {line.styleNumber && (
                <Badge className="bg-indigo-600 text-white font-semibold px-3 py-1 text-sm">
                  {line.styleNumber}
                </Badge>
              )}
              {line.colorCode && (
                <Badge className="bg-blue-100 text-blue-800 font-mono px-3 py-1 text-sm">
                  {line.colorCode}
                </Badge>
              )}
              {line.cadCode && (
                <Badge className="bg-purple-100 text-purple-800 font-mono px-3 py-1 text-sm">
                  {line.cadCode}
                </Badge>
              )}
              {!line.colorCode && !line.cadCode && (
                <Badge className="bg-gray-100 text-gray-600 px-3 py-1 text-sm">
                  Style Only
                </Badge>
              )}
            </div>

            {/* Status Badge */}
            <div>
              <Badge className={`${getStatusBadgeClass(line.status || 'upcoming')} font-medium px-3 py-1.5`}>
                {getStatusDisplayName(line.status || 'upcoming')}
              </Badge>
            </div>

            {/* Color/CAD names if available */}
            {(line.colorName || line.cadName) && (
              <div className="text-sm text-gray-600 space-y-0.5">
                {line.colorName && <div>Color: {line.colorName}</div>}
                {line.cadName && <div>CAD: {line.cadName}</div>}
              </div>
            )}
          </div>

          {/* Right Section: Quantity & Price */}
          <div className="text-right space-y-2">
            <div className="text-2xl font-bold text-indigo-700">
              {line.quantity.toLocaleString()}
              <span className="text-sm font-normal text-gray-600 ml-1">{line.unit}</span>
            </div>
            {line.provaPrice && (
              <div className="text-lg font-semibold text-green-700">
                {line.currency || 'USD'} {line.provaPrice.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* ETD Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>ETD: {line.etd ? formatDate(line.etd) : 'Not set'}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${urgency.color}`}>
              {urgency.days < 0 && <AlertTriangle className="h-4 w-4" />}
              {urgency.days >= 0 && urgency.days <= 7 && <Clock className="h-4 w-4" />}
              <span>{urgency.text}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
