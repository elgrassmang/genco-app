import React from 'react';
    import {
      Toast,
      ToastProvider,
      ToastViewport,
    } from '@/components/ui/toast';
    import { useToast } from '@/components/ui/use-toast';

    export function Toaster() {
      const { toasts } = useToast();

      return (
        <ToastProvider>
          {toasts.map(({ id, title, description, action, variant, dismiss, ...props }) => {
            return (
              <Toast 
                key={id} 
                id={id}
                title={title} 
                description={description} 
                action={action}
                variant={variant}
                {...props} 
              />
            );
          })}
          <ToastViewport />
        </ToastProvider>
      );
    }