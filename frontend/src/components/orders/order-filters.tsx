'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  { value: 'running', label: 'Running' },
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

  const updateUrlParams = React.useCallback(
    (next: Partial<{ search: string; status: string; orderDateFrom: string; orderDateTo: string }>) => {
      const params = new URLSearchParams(searchParams.toString());

      const apply = (key: string, value: string | undefined | null, removeIfAll?: boolean) => {
        if (!value || value === '' || (removeIfAll && value === 'all')) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      };

      if ('search' in next) {
        apply('search', next.search ?? '');
      }
      if ('status' in next) {
        apply('status', next.status ?? '', true);
      }
      if ('orderDateFrom' in next) {
        apply('order_date_from', next.orderDateFrom ?? '');
      }
      if ('orderDateTo' in next) {
        apply('order_date_to', next.orderDateTo ?? '');
      }

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.push(url, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const emitFilterChange = React.useCallback(
    (overrides?: Partial<{ search: string; status: string; orderDateFrom: string; orderDateTo: string }>) => {
      if (!onFilterChange) return;

      const merged = {
        search,
        status,
        orderDateFrom,
        orderDateTo,
        ...overrides,
      };

      onFilterChange({
        search: merged.search,
        status: merged.status === 'all' ? null : merged.status,
        orderDateFrom: merged.orderDateFrom || null,
        orderDateTo: merged.orderDateTo || null,
      });
    },
    [onFilterChange, search, status, orderDateFrom, orderDateTo]
  );

  // Keep local state in sync if the URL changes via back/forward navigation
  React.useEffect(() => {
    const nextSearch = searchParams.get('search') ?? '';
    const nextStatus = searchParams.get('status') ?? 'all';
    const nextOrderDateFrom = searchParams.get('order_date_from') ?? '';
    const nextOrderDateTo = searchParams.get('order_date_to') ?? '';

    setSearch(nextSearch);
    setStatus(nextStatus);
    setOrderDateFrom(nextOrderDateFrom);
    setOrderDateTo(nextOrderDateTo);

    emitFilterChange({
      search: nextSearch,
      status: nextStatus,
      orderDateFrom: nextOrderDateFrom,
      orderDateTo: nextOrderDateTo,
    });
  }, [searchParams, emitFilterChange]);

  // Debounce search updates to the URL by 300ms
  React.useEffect(() => {
    const handle = setTimeout(() => {
      updateUrlParams({ search });
      emitFilterChange({ search });
    }, 300);

    return () => clearTimeout(handle);
  }, [search, updateUrlParams, emitFilterChange]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    updateUrlParams({ status: value });
    emitFilterChange({ status: value });
  };

  const handleOrderDateFromChange = (value: string) => {
    setOrderDateFrom(value);
    updateUrlParams({ orderDateFrom: value });
    emitFilterChange({ orderDateFrom: value });
  };

  const handleOrderDateToChange = (value: string) => {
    setOrderDateTo(value);
    updateUrlParams({ orderDateTo: value });
    emitFilterChange({ orderDateTo: value });
  };

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setOrderDateFrom('');
    setOrderDateTo('');
    updateUrlParams({ search: '', status: 'all', orderDateFrom: '', orderDateTo: '' });
    emitFilterChange({ search: '', status: 'all', orderDateFrom: '', orderDateTo: '' });
  };

  return (
    <section className={cn('w-full rounded-lg bg-white border border-gray-200 p-4 md:p-5 shadow-sm', className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
        {/* Search */}
        <div className="md:col-span-2 flex flex-col gap-1">
          <Label htmlFor="order-search">Search</Label>
          <Input
            id="order-search"
            type="text"
            placeholder="Search customer, order #, or style"
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              setSearch(value);
            }}
          />
        </div>

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

        {/* Reset */}
        <div className="flex justify-start md:justify-end">
          <Button type="button" variant="outline" className="mt-6 md:mt-0" onClick={handleReset}>
            Reset filters
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Order Date From */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="order-date-from">Order Date (From)</Label>
          <Input
            id="order-date-from"
            type="date"
            value={orderDateFrom}
            onChange={(event) => {
              const value = event.target.value;
              handleOrderDateFromChange(value);
            }}
          />
        </div>

        {/* Order Date To */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="order-date-to">Order Date (To)</Label>
          <Input
            id="order-date-to"
            type="date"
            value={orderDateTo}
            onChange={(event) => {
              const value = event.target.value;
              handleOrderDateToChange(value);
            }}
          />
        </div>
      </div>
    </section>
  );
}
