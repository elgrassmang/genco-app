import React from 'react';
    import { cn } from '@/lib/utils';

    const Table = React.forwardRef(({ className, ...props }, ref) => (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props} />
      </div>
    ));
    Table.displayName = "Table";

    const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
      <thead ref={ref} className={cn("[&_tr]:border-b border-[hsl(var(--brand-deep-red))/0.4]", className)} {...props} />
    ));
    TableHeader.displayName = "TableHeader";

    const TableBody = React.forwardRef(({ className, ...props }, ref) => (
      <tbody
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props} />
    ));
    TableBody.displayName = "TableBody";

    const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
      <tfoot
        ref={ref}
        className={cn("border-t bg-[hsl(var(--brand-dark))/0.8] font-medium [&>tr]:last:border-b-0", className)}
        {...props} />
    ));
    TableFooter.displayName = "TableFooter";

    const TableRow = React.forwardRef(({ className, ...props }, ref) => (
      <tr
        ref={ref}
        className={cn("border-b border-[hsl(var(--brand-deep-red))/0.4] transition-colors hover:bg-[hsl(var(--brand-dark))/0.6] data-[state=selected]:bg-[hsl(var(--brand-dark))/0.7]", className)}
        {...props} />
    ));
    TableRow.displayName = "TableRow";

    const TableHead = React.forwardRef(({ className, ...props }, ref) => (
      <th
        ref={ref}
        className={cn(
          "h-14 px-5 text-left align-middle font-semibold text-[hsl(var(--brand-cream))/0.9] [&:has([role=checkbox])]:pr-0",
          className
        )}
        {...props} />
    ));
    TableHead.displayName = "TableHead";

    const TableCell = React.forwardRef(({ className, ...props }, ref) => (
      <td
        ref={ref}
        className={cn("p-5 align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props} />
    ));
    TableCell.displayName = "TableCell";

    const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
      <caption
        ref={ref}
        className={cn("mt-4 text-sm text-[hsl(var(--brand-cream))/0.7]", className)}
        {...props} />
    ));
    TableCaption.displayName = "TableCaption";

    export {
      Table,
      TableHeader,
      TableBody,
      TableFooter,
      TableHead,
      TableRow,
      TableCell,
      TableCaption,
    };