"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md border bg-white text-gray-950",
        className,
      )}
      {...props}
    />
  ),
);
Command.displayName = "Command";

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="border-b px-3 py-2">
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-gray-400",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("max-h-64 overflow-y-auto p-1 text-sm", className)}
      {...props}
    />
  ),
);
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-6 text-center text-sm text-gray-500", className)}
      {...props}
    />
  ),
);
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-1 py-1.5 text-xs font-medium text-gray-500", className)}
      {...props}
    />
  ),
);
CommandGroup.displayName = "CommandGroup";

const CommandItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = "CommandItem";

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem };
