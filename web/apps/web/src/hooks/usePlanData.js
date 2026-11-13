import { useState, useCallback } from 'react';
    import { supabase } from '@/lib/supabaseClient';
    import { useToast } from '@/components/ui/use-toast';

    export const usePlanData = () => {
      const { toast } = useToast();
      const [plan, setPlan] = useState(null);
      const [loadingPlan, setLoadingPlan] = useState(false); 

      const fetchUserPlan = useCallback(async (idToFetch) => {
        if (!idToFetch) {
          console.log("[usePlanData] fetchUserPlan: No user ID provided. Plan state remains unchanged or cleared if appropriate in calling context.");
          setPlan(null); 
          setLoadingPlan(false); 
          return null;
        }
        
        console.log(`[usePlanData] fetchUserPlan: Initiating fetch for user ${idToFetch}`);
        setLoadingPlan(true);
        try {
          const { data, error } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_id', idToFetch)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(`[usePlanData] fetchUserPlan: Error fetching plan for user ${idToFetch}:`, error);
            toast({ title: "Error Loading Plan", description: `Could not load your plan details. ${error.message}`, variant: "destructive" });
            setPlan(null);
          } else if (data) {
            console.log(`[usePlanData] fetchUserPlan: Plan data received for ${idToFetch}:`, data);
            setPlan(data);
          } else {
            console.log(`[usePlanData] fetchUserPlan: No plan found for user ${idToFetch}. This is normal if no plan has been selected.`);
            setPlan(null);
          }
        } catch (e) {
            console.error(`[usePlanData] fetchUserPlan: Unexpected error during fetch for user ${idToFetch}:`, e);
            toast({ title: "System Error", description: "An unexpected error occurred while fetching plan details.", variant: "destructive" });
            setPlan(null);
        } finally {
            setLoadingPlan(false);
            console.log(`[usePlanData] fetchUserPlan: Fetch completed for user ${idToFetch}. Loading state: false.`);
        }
        
        const { data: currentPlanState } = await supabase.from('user_plans').select('*').eq('user_id', idToFetch).order('created_at', { ascending: false }).limit(1).maybeSingle();
        return currentPlanState;
      }, [toast]); 

      const savePlan = async (planDetails, currentAuthUser) => {
        if (!currentAuthUser || !currentAuthUser.id) {
          toast({title: "Error", description: "You must be logged in with a valid user ID to save a plan.", variant: "destructive"});
          console.error("[usePlanData] savePlan: User or user.id is missing.");
          setLoadingPlan(false);
          return null;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error("[usePlanData] savePlan: Error fetching session or no active session:", sessionError);
          toast({ title: "Session Error", description: "Could not verify current session. Please log in again.", variant: "destructive" });
          setLoadingPlan(false);
          return null;
        }
        
        setLoadingPlan(true);
        console.log(`[usePlanData] savePlan: Attempting to save plan for user ${currentAuthUser.id} with details:`, planDetails);
        
        const isProduction = import.meta.env.MODE === 'production';
        const priceIdToSave = isProduction ? planDetails.stripePriceId : planDetails.stripeTestPriceId;

        if (!priceIdToSave || priceIdToSave.includes('YOUR_')) {
            console.error(`[usePlanData] savePlan: Stripe Price ID for plan "${planDetails.name}" is a placeholder or missing for the current environment (${import.meta.env.MODE}). Price ID: "${priceIdToSave}"`);
            toast({ title: "Configuration Error", description: `Payment configuration for ${planDetails.name} is incomplete. Contact support.`, variant: "destructive", duration: 7000 });
            setLoadingPlan(false);
            return null;
        }

        const newPlanEntry = {
          user_id: currentAuthUser.id,
          plan_id: planDetails.id, 
          name: planDetails.name,
          price: planDetails.price,
          stripe_price_id: priceIdToSave, 
          status: 'selected', 
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(), 
        };

        try {
            const { data, error } = await supabase
            .from('user_plans')
            .insert(newPlanEntry)
            .select()
            .single();

            if (error) {
            console.error('[usePlanData] savePlan: Error saving plan:', error);
            toast({ title: "Plan Save Error", description: `Failed to save plan: ${error.message}. Check console for details.`, variant: "destructive" });
            return null; 
            }
            
            console.log(`[usePlanData] savePlan: Plan saved successfully for ${currentAuthUser.id}:`, data);
            setPlan(data); 
            toast({ title: "Plan Selected", description: `${data.name} has been selected.` });
            return data;
        } catch (e) {
            console.error(`[usePlanData] savePlan: Unexpected error during save for user ${currentAuthUser.id}:`, e);
            toast({ title: "System Error", description: "An unexpected error occurred while saving the plan.", variant: "destructive" });
            return null;
        } finally {
            setLoadingPlan(false);
        }
      };

      return { plan, loadingPlan, fetchUserPlan, savePlan, setPlan };
    };