import { Check } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export type TimelineStatus = 'completed' | 'current' | 'pending';

export interface TimelineEvent {
  title: string;
  date: string | Date;
  status: TimelineStatus;
  description: string;
}

export interface OrderTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

function StatusDot({ status }: { status: TimelineStatus }) {
  if (status === 'completed') {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Check className="h-4 w-4" />
      </div>
    );
  }

  if (status === 'current') {
    return (
      <div className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inline-flex h-6 w-6 rounded-full bg-blue-200 opacity-75 animate-ping" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
      </div>
    );
  }

  return <div className="h-4 w-4 rounded-full border-2 border-gray-300 bg-white" />;
}

export function OrderTimeline({ events, className }: OrderTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500',
          className
        )}
      >
        No timeline data
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />
      <div className="space-y-6">
        {events.map((event, index) => (
          <div key={index} className="relative flex items-start gap-4 pl-10">
            <div className="absolute left-4 top-2 flex -translate-x-1/2 items-center justify-center">
              <StatusDot status={event.status} />
            </div>
            <div className="flex-1 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
                <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
              </div>
              {event.description && (
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
