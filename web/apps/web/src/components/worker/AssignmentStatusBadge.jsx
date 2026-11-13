import React from 'react';
    import { cn } from '@/lib/utils';
    import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

    const AssignmentStatusBadge = ({ status, className }) => {
      const statusConfig = {
        pending: {
          text: 'Pending',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />,
          colors: 'bg-yellow-400/20 text-yellow-600 border-yellow-500/50 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30',
        },
        completed: {
          text: 'Completed',
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5" />,
          colors: 'bg-green-400/20 text-green-700 border-green-500/50 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30',
        },
        skipped: {
          text: 'Skipped',
          icon: <XCircle className="w-3.5 h-3.5 mr-1.5" />,
          colors: 'bg-red-400/20 text-red-700 border-red-500/50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        },
      };

      const currentStatus = statusConfig[status.toLowerCase()] || statusConfig.pending;

      return (
        <div
          className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border leading-tight',
            currentStatus.colors,
            className
          )}
        >
          {currentStatus.icon}
          {currentStatus.text}
        </div>
      );
    };

    export default AssignmentStatusBadge;