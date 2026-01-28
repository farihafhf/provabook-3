'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertTriangle, History, Percent, FlaskConical, CheckCircle2, Package } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ApprovalTimelineDialog } from './approval-timeline-dialog';

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
    // Delivery metrics
    totalDeliveredQuantity?: number;
    actualDeliveryDate?: string;
    daysOverdueAtDelivery?: number;
    // Greige/Yarn calculation fields
    processLossPercent?: number;
    mixedFabricType?: string;
    mixedFabricPercent?: number;
    greigeQuantity?: number;
    yarnRequired?: number;
    // Production progress for garments
    producedQuantity?: number;
  };
  orderId?: string;
  orderType?: string; // 'local' or 'foreign'
  onClick?: () => void;
  onRefresh?: () => void; // Callback to refresh parent data when approval stages are modified
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

const getLineTimingDisplay = (line: { status?: string; etd?: string; actualDeliveryDate?: string; daysOverdueAtDelivery?: number }) => {
  const status = line.status || 'upcoming';
  const isCompleted = status === 'completed';

  if (isCompleted) {
    // For completed lines, use actual delivery date and fixed "days late/early" info
    if (line.actualDeliveryDate) {
      const baseText = `Delivered on ${formatDate(line.actualDeliveryDate)}`;
      const daysOffset = typeof line.daysOverdueAtDelivery === 'number' ? line.daysOverdueAtDelivery : null;

      if (daysOffset !== null) {
        if (daysOffset > 0) {
          return {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
            text: `${baseText} (${daysOffset} days late)` ,
            color: 'text-emerald-700 font-semibold',
          };
        }
        if (daysOffset < 0) {
          return {
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
            text: `${baseText} (${Math.abs(daysOffset)} days early)`,
            color: 'text-emerald-700 font-semibold',
          };
        }
        // On-time delivery
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
          text: `${baseText} (on time)`,
          color: 'text-emerald-700 font-semibold',
        };
      }

      // No ETD or offset, but we know delivery date
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        text: baseText,
        color: 'text-emerald-700 font-semibold',
      };
    }

    // Completed with no delivery record - show neutral completed state
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      text: 'Completed',
      color: 'text-emerald-700 font-semibold',
    };
  }

  // Non-completed lines: use existing ETD urgency logic
  const urgency = getETDUrgency(line.etd);
  let icon = null as JSX.Element | null;
  if (urgency.days < 0) {
    icon = <AlertTriangle className="h-4 w-4" />;
  } else if (urgency.days >= 0 && urgency.days <= 7) {
    icon = <Clock className="h-4 w-4" />;
  }

  return {
    icon,
    text: urgency.text,
    color: urgency.color,
  };
};

export function LineItemCard({ line, orderId, orderType, onClick, onRefresh }: LineItemCardProps) {
  const [showApprovalTimeline, setShowApprovalTimeline] = useState(false);
  const timing = getLineTimingDisplay(line);
  
  // Check if line has greige/yarn calculations (for local orders)
  const hasCalculations = orderType === 'local' && (line.greigeQuantity || line.yarnRequired || line.processLossPercent);
  
  const lineLabel = [
    line.styleNumber,
    line.colorCode && `Color: ${line.colorCode}`,
    line.cadCode && `CAD: ${line.cadCode}`,
  ].filter(Boolean).join(' - ');
  
  return (
    <>
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

        {/* Production Progress - Only for pieces unit with produced quantity */}
        {line.unit.toLowerCase() === 'pieces' && (line.producedQuantity !== undefined && line.producedQuantity > 0) && (
          <div className="mt-4 pt-3 border-t border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 -mx-6 px-6 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-800">Production Progress</span>
              <span className="text-xs font-bold text-emerald-700 ml-auto">
                {line.quantity > 0 ? Math.round((line.producedQuantity / line.quantity) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${line.quantity > 0 ? Math.min(100, (line.producedQuantity / line.quantity) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-emerald-700 font-medium">{line.producedQuantity.toLocaleString()} produced</span>
              <span className="text-orange-600 font-medium">{(line.quantity - line.producedQuantity).toLocaleString()} remaining</span>
            </div>
          </div>
        )}

        {/* Greige/Yarn Calculation Summary - Only for Local Orders with calculations */}
        {hasCalculations && (
          <div className="mt-4 pt-3 border-t border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 px-6 py-3 rounded-b-lg">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Production Calculations</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {/* Left column: Losses */}
              <div className="space-y-1">
                {line.processLossPercent !== undefined && line.processLossPercent > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Percent className="h-3 w-3 text-red-500" />
                    <span className="text-gray-600">Loss:</span>
                    <span className="font-semibold text-red-600">{line.processLossPercent}%</span>
                  </div>
                )}
                {line.mixedFabricType && (
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3 text-purple-500" />
                    <span className="text-gray-600">{line.mixedFabricType}:</span>
                    <span className="font-semibold text-purple-600">{line.mixedFabricPercent || 0}%</span>
                  </div>
                )}
              </div>
              {/* Right column: Calculated quantities */}
              <div className="space-y-1">
                {line.greigeQuantity && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">Greige:</span>
                    <span className="font-bold text-amber-700">{line.greigeQuantity.toLocaleString()} {line.unit}</span>
                  </div>
                )}
                {line.yarnRequired && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">Yarn:</span>
                    <span className="font-bold text-blue-700">{line.yarnRequired.toLocaleString()} {line.unit}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ETD Section */}
        <div className={`mt-4 pt-4 border-t border-gray-100 ${hasCalculations ? '-mx-6 px-6' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>ETD: {line.etd ? formatDate(line.etd) : 'Not set'}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${timing.color}`}>
              {timing.icon}
              <span>{timing.text}</span>
            </div>
          </div>
        </div>

        {/* Approval Timeline Button */}
        {orderId && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-indigo-600 border-indigo-300 hover:bg-indigo-50"
              onClick={(e) => {
                e.stopPropagation();
                setShowApprovalTimeline(true);
              }}
            >
              <History className="h-4 w-4 mr-2" />
              View Approval Timeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Approval Timeline Dialog */}
    {orderId && (
      <ApprovalTimelineDialog
        open={showApprovalTimeline}
        onClose={() => setShowApprovalTimeline(false)}
        orderId={orderId}
        lineId={line.id}
        lineLabel={lineLabel}
        onRefresh={onRefresh}
      />
    )}
  </>
  );
}
