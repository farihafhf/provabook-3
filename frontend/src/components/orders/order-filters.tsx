'use client';

import * as React from 'react';
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
  const [search, setSearch] = React.useState(initialSearch ?? '');
  const [status, setStatus] = React.useState<string>(initialStatus ?? 'all');
  const [orderDateFrom, setOrderDateFrom] = React.useState(initialOrderDateFrom ?? '');
  const [orderDateTo, setOrderDateTo] = React.useState(initialOrderDateTo ?? '');

  const emitChange = React.useCallback(
    (next?: Partial<{ search: string; status: string; orderDateFrom: string; orderDateTo: string }>) => {
      if (!onFilterChange) return;

      const merged = {
        search: next?.search ?? search,
        status: next?.status ?? status,
        orderDateFrom: next?.orderDateFrom ?? orderDateFrom,
        orderDateTo: next?.orderDateTo ?? orderDateTo,
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

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setOrderDateFrom('');
    setOrderDateTo('');
    emitChange({ search: '', status: 'all', orderDateFrom: '', orderDateTo: '' });
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
              emitChange({ search: value });
            }}
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="order-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              emitChange({ status: value });
            }}
          >
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
              setOrderDateFrom(value);
              emitChange({ orderDateFrom: value });
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
              setOrderDateTo(value);
              emitChange({ orderDateTo: value });
            }}
          />
        </div>
      </div>
    </section>
  );
}
