import React from 'react';
    import { Loader2 } from 'lucide-react';

    const PaymentLoadingState = ({ message = "Loading payment details..." }) => {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Loader2 className="h-12 w-12 text-[hsl(var(--primary))] animate-spin" />
          <p className="ml-3 text-lg text-[hsl(var(--foreground))]">{message}</p>
        </div>
      );
    };

    export default PaymentLoadingState;