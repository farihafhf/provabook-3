'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'in_development', label: 'In Development' },
  { value: 'running', label: 'Running Order' },
  { value: 'bulk', label: 'Bulk' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export interface OrderFiltersProps {
  className?: string;
  initialSearch?: string;
  initialStatus?: string;
  initialOrderDateFrom?: string;
  initialOrderDateTo?: string;
  onFilterChange?: (filters: {
    search: string;
    status: string | null;
    orderDateFrom: string | null;
    orderDateTo: string | null;
  }) => void;
}

export function OrderFilters({
  className,
  initialSearch,
  initialStatus,
  initialOrderDateFrom,
  initialOrderDateTo,
  onFilterChange,
}: OrderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState<string>(() => {
    return searchParams.get('search') ?? initialSearch ?? '';
  });
  const [status, setStatus] = React.useState<string>(() => {
    return searchParams.get('status') ?? initialStatus ?? 'all';
  });
  const [orderDateFrom, setOrderDateFrom] = React.useState<string>(() => {
    return searchParams.get('order_date_from') ?? initialOrderDateFrom ?? '';
  });
  const [orderDateTo, setOrderDateTo] = React.useState<string>(() => {
    return searchParams.get('order_date_to') ?? initialOrderDateTo ?? '';
  });

  // Track the last emitted filter values to avoid duplicate emissions
  const lastEmittedRef = useRef<string>('');

  const emitFilterChange = React.useCallback(
    (next: { search: string; status: string; orderDateFrom: string; orderDateTo: string }) => {
      if (!onFilterChange) return;

      // Create a signature of the filter values to detect duplicates
      const signature = JSON.stringify(next);
      if (signature === lastEmittedRef.current) {
        return; // Skip duplicate emission
      }
      lastEmittedRef.current = signature;

      onFilterChange({
        search: next.search,
        status: next.status === 'all' ? null : next.status,
        orderDateFrom: next.orderDateFrom || null,
        orderDateTo: next.orderDateTo || null,
      });
    },
    [onFilterChange]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // Emit filters to parent
    emitFilterChange({
      search,
      status,
      orderDateFrom,
      orderDateTo,
    });

    // Update URL query for shareable/filterable links
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    if (orderDateFrom) params.set('order_date_from', orderDateFrom);
    if (orderDateTo) params.set('order_date_to', orderDateTo);
    // Preserve order_type from current URL if it exists
    const currentOrderType = searchParams.get('order_type');
    if (currentOrderType) params.set('order_type', currentOrderType);

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url, { scroll: false });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    // Emit immediately when status changes
    emitFilterChange({
      search,
      status: value,
      orderDateFrom,
      orderDateTo,
    });
    
    // CRITICAL: Also update the URL immediately so back navigation preserves the filter
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (value && value !== 'all') params.set('status', value);
    if (orderDateFrom) params.set('order_date_from', orderDateFrom);
    if (orderDateTo) params.set('order_date_to', orderDateTo);
    // Preserve order_type from current URL if it exists
    const currentOrderType = searchParams.get('order_type');
    if (currentOrderType) params.set('order_type', currentOrderType);
    
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url, { scroll: false });
  };

  const handleOrderDateFromChange = (value: string) => {
    setOrderDateFrom(value);
  };

  const handleOrderDateToChange = (value: string) => {
    setOrderDateTo(value);
  };

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setOrderDateFrom('');
    setOrderDateTo('');
    emitFilterChange({
      search: '',
      status: 'all',
      orderDateFrom: '',
      orderDateTo: '',
    });
  };

  // Sync local state and emit filter changes when URL params change
  // This effect runs on mount and whenever searchParams changes (e.g., back navigation)
  React.useEffect(() => {
    const urlSearch = searchParams.get('search') ?? '';
    const urlStatus = searchParams.get('status') ?? 'all';
    const urlDateFrom = searchParams.get('order_date_from') ?? '';
    const urlDateTo = searchParams.get('order_date_to') ?? '';

    // Always sync local state from URL to ensure consistency
    // This avoids stale closure issues by unconditionally updating state
    setSearch(urlSearch);
    setStatus(urlStatus);
    setOrderDateFrom(urlDateFrom);
    setOrderDateTo(urlDateTo);

    // Always emit filter change to parent - the emitFilterChange function
    // will deduplicate if values haven't changed
    emitFilterChange({
      search: urlSearch,
      status: urlStatus,
      orderDateFrom: urlDateFrom,
      orderDateTo: urlDateTo,
    });
  }, [searchParams, emitFilterChange]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const hasActiveFilters = search || (status && status !== 'all') || orderDateFrom || orderDateTo;

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <section className="w-full rounded-lg bg-white border border-gray-200 shadow-sm">
        {/* Mobile: Compact search bar with expand button */}
        <div className="md:hidden">
          <div className="p-3 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="order-search-mobile"
                type="text"
                placeholder="Search orders..."
                value={search}
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              />
            </div>
            <Button 
              type="button" 
              variant={hasActiveFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="sr-only">Filters active</span>}
            </Button>
          </div>
          
          {/* Expandable filters on mobile */}
          {isExpanded && (
            <div className="px-3 pb-3 pt-0 space-y-3 border-t border-gray-100">
              <div className="pt-3 flex flex-col gap-1">
                <Label htmlFor="order-status-mobile">Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="order-status-mobile">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="order-date-from-mobile" className="text-xs">From Date</Label>
                  <Input
                    id="order-date-from-mobile"
                    type="date"
                    value={orderDateFrom}
                    onChange={(event) => handleOrderDateFromChange(event.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="order-date-to-mobile" className="text-xs">To Date</Label>
                  <Input
                    id="order-date-to-mobile"
                    type="date"
                    value={orderDateTo}
                    onChange={(event) => handleOrderDateToChange(event.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">Search</Button>
                <Button type="button" variant="outline" size="sm" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Collapsible layout */}
        <div className="hidden md:block">
          {/* Collapsed bar - always visible */}
          <div className="p-3 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="order-search"
                type="text"
                placeholder="Search customer, order #, style, or merchandiser..."
                value={search}
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              />
            </div>
            <Button type="submit" size="sm">
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
            <Button 
              type="button" 
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              Filters
              {isDesktopExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>
          
          {/* Expandable filters */}
          {isDesktopExpanded && (
            <div className="px-3 pb-3 pt-0 border-t border-gray-100">
              <div className="pt-3 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
                {/* Status */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="order-status">Status</Label>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger id="order-status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Date From */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="order-date-from">Order Date (From)</Label>
                  <Input
                    id="order-date-from"
                    type="date"
                    value={orderDateFrom}
                    onChange={(event) => handleOrderDateFromChange(event.target.value)}
                  />
                </div>

                {/* Order Date To */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="order-date-to">Order Date (To)</Label>
                  <Input
                    id="order-date-to"
                    type="date"
                    value={orderDateTo}
                    onChange={(event) => handleOrderDateToChange(event.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </form>
  );
}
