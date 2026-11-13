import { useCallback, useState } from 'react'; // Added useState
    import { supabase } from '@/lib/supabaseClient';
    import { useToast } from '@/components/ui/use-toast';

    export const useSubscriptionManagement = (setPlanInContext, fetchUserPlanFromContext) => {
      const { toast } = useToast();
      const [isProcessing, setIsProcessing] = useState(false); // Added processing state

      const saveUserPlanSubscription = useCallback(async (userIdToUpdate, planId, stripeSubscriptionId, newStatus) => {
        if (!userIdToUpdate || !planId || !stripeSubscriptionId || !newStatus) {
          toast({ title: "Error", description: "Missing data for subscription update.", variant: "destructive" });
          return false;
        }
        setIsProcessing(true);
        try {
          const { data, error } = await supabase
            .from('user_plans')
            .update({ 
              stripe_subscription_id: stripeSubscriptionId,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userIdToUpdate)
            // .eq('plan_id', planId) // Removing this to update latest plan if plan_id changed during checkout attempt
            .order('created_at', { ascending: false }) 
            .limit(1) // Ensure only the most recent plan record for the user is updated
            .select()
            .single();

          if (error) {
            console.error('Error updating user plan subscription:', error);
            toast({ title: "Subscription Update Error", description: error.message, variant: "destructive" });
            setIsProcessing(false);
            return false;
          }
          
          if (setPlanInContext) setPlanInContext(data); 
          toast({ title: "Success", description: "Subscription updated successfully." });
          setIsProcessing(false);
          return true;
        } catch (error) {
          console.error('Unexpected error in saveUserPlanSubscription:', error);
          toast({ title: "System Error", description: "An unexpected error occurred.", variant: "destructive" });
          setIsProcessing(false);
          return false;
        }
      }, [toast, setPlanInContext]);

      const cancelSubscription = useCallback(async (stripeSubscriptionId, userId) => {
        if (!stripeSubscriptionId) {
          toast({ title: "Error", description: "No active subscription ID found to cancel.", variant: "destructive" });
          return { success: false, error: "No active subscription ID." };
        }
        setIsProcessing(true);
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('cancel-stripe-subscription', {
            body: JSON.stringify({ subscription_id: stripeSubscriptionId }),
          });

          if (functionError) throw functionError;

          if (functionData.success) {
            toast({ title: "Subscription Cancelled", description: "Your subscription has been successfully cancelled." });
            if (fetchUserPlanFromContext && userId) await fetchUserPlanFromContext(userId); 
            setIsProcessing(false);
            return { success: true };
          } else {
             setIsProcessing(false);
            throw new Error(functionData.error || "Failed to cancel subscription via function.");
          }
        } catch (error) {
          console.error("Error cancelling subscription:", error);
          toast({ title: "Cancellation Failed", description: error.message || "Could not cancel your subscription. Please contact support.", variant: "destructive" });
          setIsProcessing(false);
          return { success: false, error: error.message || "Could not cancel." };
        }
      }, [toast, fetchUserPlanFromContext]);

      const redirectToCustomerPortal = useCallback(async () => {
        setIsProcessing(true);
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                throw new Error("User not authenticated or session expired.");
            }
            const user = sessionData.session.user;

            const { data: functionData, error: functionError } = await supabase.functions.invoke('create-stripe-portal-session', {
                body: JSON.stringify({ user_id: user.id })
            });

            if (functionError) throw functionError;

            if (functionData.portalUrl) {
                window.location.href = functionData.portalUrl;
            } else {
                throw new Error(functionData.error || "Could not create customer portal session.");
            }
        } catch (error) {
            console.error("Error redirecting to customer portal:", error);
            toast({ title: "Portal Error", description: error.message || "Could not open billing management.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
      }, [toast]);


      return { saveUserPlanSubscription, cancelSubscription, redirectToCustomerPortal, isProcessing };
    };