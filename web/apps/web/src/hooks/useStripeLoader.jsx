import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useStripeLoader = () => {
  const [stripe, setStripe] = useState(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const VITE_STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    const initializeStripe = () => {
      if (VITE_STRIPE_PUBLISHABLE_KEY && !VITE_STRIPE_PUBLISHABLE_KEY.includes('YOUR_')) {
        setStripe(window.Stripe(VITE_STRIPE_PUBLISHABLE_KEY));
      } else {
        console.error("Stripe Publishable Key is a placeholder or missing. Payment system cannot initialize.");
        toast({ 
          title: "Configuration Error", 
          description: "Payment system is not configured. Please contact support.", 
          variant: "destructive", 
          duration: 7000 
        });
      }
      setIsLoadingStripe(false);
    };

    if (window.Stripe) {
      initializeStripe();
    } else {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        if (window.Stripe) {
          initializeStripe();
        } else {
          console.error("Stripe.js failed to load.");
          toast({ 
            title: "Error", 
            description: "Payment system could not load. Please try again later.", 
            variant: "destructive" 
          });
          setIsLoadingStripe(false);
        }
      };
      script.onerror = () => {
        console.error("Error loading Stripe.js script.");
        toast({ 
          title: "Error", 
          description: "Failed to load payment system script. Check network connection.", 
          variant: "destructive" 
        });
        setIsLoadingStripe(false);
      };
      document.body.appendChild(script);
      
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [toast]);

  return { stripe, isLoadingStripe };
};