import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export const usePaymentStatusHandler = (user, fetchUserPlan, setIsLoading, enabled = true) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const queryParams = new URLSearchParams(location.search);
    const paymentSuccess = queryParams.get('payment_success');
    const paymentCancelled = queryParams.get('payment_cancelled');
    const sessionId = queryParams.get('session_id');

    const clearUrlParams = () => {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    };

    if (paymentSuccess === 'true' && sessionId && user) {
      console.log("[PaymentStatusHandler] Payment success detected. Session ID:", sessionId);
      
      const processSuccess = async () => {
        if (setIsLoading) setIsLoading(true);
        if (user?.id && fetchUserPlan) {
          await fetchUserPlan(user.id); 
        }
        toast({
          title: "Payment Successful!",
          description: "Your subscription is active. Redirecting to dashboard...",
          className: "bg-green-500 text-white border-green-600"
        });
        clearUrlParams();
        navigate('/dashboard', { replace: true });
        if (setIsLoading) setIsLoading(false);
      };
      processSuccess();

    } else if (paymentCancelled === 'true') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment process was cancelled. You can try again or contact support.',
        variant: 'default',
        className: "bg-yellow-500 text-black border-yellow-600"
      });
      clearUrlParams();
    }
  }, [location.search, user, navigate, toast, fetchUserPlan, setIsLoading, enabled]);
};