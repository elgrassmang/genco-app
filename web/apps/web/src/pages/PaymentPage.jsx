import React, { useState, useEffect, useCallback } from 'react';
    import { useNavigate, useLocation } from 'react-router-dom';
    import { useAuth } from '@/contexts/AuthContext';
    import { useData } from '@/contexts/DataContext';
    import { useToast } from '@/components/ui/use-toast';
    import { getPlanById, getStripePriceId } from '@/config/plans';

    import { useStripeLoader } from '@/hooks/useStripeLoader';
    import PaymentLoadingState from '@/components/payment/PaymentLoadingState';
    import NoPlanSelectedState from '@/components/payment/NoPlanSelectedState';
    import PlanAlreadyActiveState from '@/components/payment/PlanAlreadyActiveState';
    import ConfirmSubscriptionForm from '@/components/payment/ConfirmSubscriptionForm';
    import PaymentErrorState from '@/components/payment/PaymentErrorState';
    import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';

    const usePaymentPageLogic = () => {
      const { user, profile: authProfile } = useAuth();
      const { 
        plan: currentPlan, 
        profile: dataProfile,
        fetchUserPlan, 
        initialDataLoaded, 
        loadingData: dataContextLoading 
      } = useData();
      const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
      const [effectiveStripePriceId, setEffectiveStripePriceId] = useState(null);
      const [paymentError, setPaymentError] = useState(null);
      const [isProcessingPayment, setIsProcessingPayment] = useState(false);

      const effectiveProfile = authProfile || dataProfile;

      useEffect(() => {
        if (initialDataLoaded && currentPlan?.plan_id) {
          const planDetailsFromConfig = getPlanById(currentPlan.plan_id);
          if (!planDetailsFromConfig) {
            console.error(`[PaymentPage] Plan details not found for plan_id: ${currentPlan.plan_id}. Check config/plans.js.`);
            setPaymentError(`Configuration error: Plan details for your selected plan ID (${currentPlan.plan_id}) are missing.`);
            setSelectedPlanDetails(null);
            setEffectiveStripePriceId(null);
            return;
          }
          const stripePriceId = getStripePriceId(currentPlan.plan_id);
          if (!stripePriceId || stripePriceId.includes('YOUR_')) {
            console.error(`[PaymentPage] Stripe Price ID for plan ${planDetailsFromConfig.name} (${planDetailsFromConfig.id}) is a placeholder or missing. Price ID: ${stripePriceId}`);
            setPaymentError(`Configuration error: Payment setup for ${planDetailsFromConfig.name} is incomplete. Please contact support.`);
            setSelectedPlanDetails({ ...planDetailsFromConfig, stripePriceIdFromConfig: stripePriceId });
            setEffectiveStripePriceId(null);
            return;
          }
          setSelectedPlanDetails({ ...planDetailsFromConfig, stripePriceIdFromConfig: stripePriceId });
          setEffectiveStripePriceId(stripePriceId);
          setPaymentError(null);
        } else if (initialDataLoaded && !currentPlan?.plan_id) {
          setSelectedPlanDetails(null);
          setEffectiveStripePriceId(null);
          setPaymentError(null);
        }
      }, [currentPlan, initialDataLoaded]);
      
      return { 
        user, effectiveProfile, currentPlan, fetchUserPlan, initialDataLoaded, dataContextLoading,
        selectedPlanDetails, effectiveStripePriceId, paymentError, setPaymentError,
        isProcessingPayment, setIsProcessingPayment
      };
    };

    const useStripeRedirectHandler = (
        stripe, user, selectedPlanDetails, effectiveStripePriceId, 
        setIsProcessingPayment, setPaymentError, toast
      ) => {
      return useCallback(async () => {
        if (!stripe || !user || !selectedPlanDetails || !effectiveStripePriceId) {
          const errorMsg = 'Payment system not ready, user not logged in, or plan details missing. Please try again.';
          toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
          setPaymentError(errorMsg);
          console.error("Stripe, user, or plan details missing.", { stripeReady: !!stripe, userReady: !!user, planReady: !!selectedPlanDetails, priceId: effectiveStripePriceId });
          return;
        }
        
        setIsProcessingPayment(true);
        setPaymentError(null);

        const checkoutOptions = {
          lineItems: [{ price: effectiveStripePriceId, quantity: 1 }],
          mode: 'subscription',
          successUrl: `${window.location.origin}/dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payment?payment_cancelled=true`,
          customerEmail: user.email,
        };

        if (user?.uid && typeof user.uid === 'string') {
          checkoutOptions.clientReferenceId = user.uid;
        } else {
          console.warn("User ID is not available or not a string for clientReferenceId.");
        }
        
        console.log("Stripe redirectToCheckout options:", JSON.stringify(checkoutOptions, null, 2));

        try {
          const { error } = await stripe.redirectToCheckout(checkoutOptions);
          if (error) {
            console.error('Stripe redirectToCheckout error:', error);
            toast({ title: 'Payment Error', description: error.message, variant: 'destructive' });
            setPaymentError(error.message);
          }
        } catch (error) {
          console.error('Exception during Stripe redirect:', error);
          const errorMsg = 'An unexpected error occurred. Please try again.';
          toast({ title: 'Payment System Error', description: errorMsg, variant: 'destructive' });
          setPaymentError(errorMsg);
        } finally {
          setIsProcessingPayment(false);
        }
      }, [stripe, user, selectedPlanDetails, effectiveStripePriceId, setIsProcessingPayment, setPaymentError, toast]);
    };


    const usePaymentStatusSideEffects = (user, fetchUserPlan, setIsProcessingPayment, initialDataLoaded, saveUserPlanSubscription) => {
      const location = useLocation();
      const navigate = useNavigate();
      const { toast } = useToast();

      useEffect(() => {
        if (!initialDataLoaded || !user?.uid) return;

        const queryParams = new URLSearchParams(location.search);
        const success = queryParams.get('payment_success');
        const cancelled = queryParams.get('payment_cancelled');
        const sessionId = queryParams.get('session_id');

        const handlePaymentSuccess = async () => {
          if (sessionId) {
            setIsProcessingPayment(true);
            toast({ title: "Payment Successful!", description: "Updating your subscription details..." });
            
            const currentPlanDetails = await fetchUserPlan(user.uid);
            if (currentPlanDetails && currentPlanDetails.id && currentPlanDetails.status === 'selected') {
               await saveUserPlanSubscription(user.uid, currentPlanDetails.id, sessionId, 'active');
            } else if (currentPlanDetails && currentPlanDetails.status === 'active') {
               console.log("Plan already active, no update needed from success URL.");
            } else {
               console.warn("Could not find a 'selected' plan to activate post-payment or plan already active.");
               toast({ title: "Subscription Update Issue", description: "Could not automatically update subscription status. Please check your dashboard or contact support.", variant: "warning", duration: 10000 });
            }
            setIsProcessingPayment(false);
            navigate('/dashboard', { replace: true });
          }
        };

        if (success === 'true' && !queryParams.get('handled')) {
          queryParams.append('handled', 'true');
          navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
          handlePaymentSuccess();
        } else if (cancelled === 'true' && !queryParams.get('handled')) {
          queryParams.append('handled', 'true');
          navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
          toast({ title: "Payment Cancelled", description: "Your payment process was cancelled.", variant: "warning" });
          navigate('/plan-selection', { replace: true });
        }
      }, [location.search, user, fetchUserPlan, setIsProcessingPayment, toast, navigate, initialDataLoaded, saveUserPlanSubscription]);
    };


    const PaymentPage = () => {
      const navigate = useNavigate();
      const { toast } = useToast();
      
      const { 
        user, effectiveProfile, currentPlan, fetchUserPlan, initialDataLoaded, dataContextLoading,
        selectedPlanDetails, effectiveStripePriceId, paymentError, setPaymentError,
        isProcessingPayment, setIsProcessingPayment
      } = usePaymentPageLogic();
      
      const { stripe, isLoadingStripe } = useStripeLoader();
      const { saveUserPlanSubscription } = useSubscriptionManagement(null, fetchUserPlan); 

      usePaymentStatusSideEffects(user, fetchUserPlan, setIsProcessingPayment, initialDataLoaded, saveUserPlanSubscription);
      
      const handleProceedToStripe = useStripeRedirectHandler(
        stripe, user, selectedPlanDetails, effectiveStripePriceId, 
        setIsProcessingPayment, setPaymentError, toast
      );
            
      const isOverallLoading = dataContextLoading || isLoadingStripe || !initialDataLoaded;

      if (isOverallLoading) {
        return <PaymentLoadingState />;
      }

      if (paymentError) {
        return <PaymentErrorState errorMessage={paymentError} onRetry={handleProceedToStripe} selectedPlanDetails={selectedPlanDetails} />;
      }

      if (!selectedPlanDetails && initialDataLoaded) {
        return <NoPlanSelectedState />;
      }
      
      if (currentPlan && selectedPlanDetails && currentPlan.status === 'active' && currentPlan.plan_id === selectedPlanDetails.id) {
         return <PlanAlreadyActiveState planName={selectedPlanDetails.name} />;
      }

      if (!selectedPlanDetails) { 
         return <PaymentLoadingState message="Determining selected plan..."/>;
      }

      const isProceedDisabled = !stripe || !effectiveStripePriceId || isProcessingPayment;
      
      return (
        <ConfirmSubscriptionForm
          selectedPlanDetails={selectedPlanDetails}
          profile={effectiveProfile}
          isLoading={isProcessingPayment}
          isStripeLoading={isLoadingStripe}
          isProceedDisabled={isProceedDisabled}
          effectiveStripePriceId={effectiveStripePriceId}
          onProceedToStripe={handleProceedToStripe}
          onNavigate={navigate}
        />
      );
    };

    export default PaymentPage;