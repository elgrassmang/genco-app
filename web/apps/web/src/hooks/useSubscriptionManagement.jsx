import React, { useCallback, useState } from 'react';
import { db } from '@/lib/firebaseClient'; 
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from '@/components/ui/use-toast';

export const useSubscriptionManagement = (setPlanInContext, fetchUserPlanFromContext) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const saveUserPlanSubscription = useCallback(async (userIdToUpdate, planDocId, stripeSubscriptionId, newStatus) => {
    if (!userIdToUpdate || !planDocId || !stripeSubscriptionId || !newStatus) {
      toast({ title: "Error", description: "Missing data for subscription update.", variant: "destructive" });
      return false;
    }
    if (!db) {
      console.error("[useSubscriptionManagement] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database not initialized.", variant: "destructive" });
      return false;
    }
    setIsProcessing(true);
    try {
      const planRef = doc(db, "userPlans", planDocId);
      const updateData = {
        stripeSubscriptionId: stripeSubscriptionId,
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      await updateDoc(planRef, updateData);
      
      if (fetchUserPlanFromContext && userIdToUpdate) {
        const updatedPlan = await fetchUserPlanFromContext(userIdToUpdate);
        if (setPlanInContext && updatedPlan) setPlanInContext(updatedPlan);
      }
      
      toast({ title: "Success", description: "Subscription updated successfully." });
      return true;
    } catch (error) {
      console.error('Error updating user plan subscription:', error);
      toast({ title: "Subscription Update Error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, setPlanInContext, fetchUserPlanFromContext]);

  const cancelSubscription = useCallback(async (stripeSubscriptionId, userId, planDocId) => {
    setIsProcessing(true);
    toast({ title: "Feature In Development", description: "Cancelling subscriptions with Firebase Cloud Functions will be implemented soon." });
    console.warn("cancelSubscription: Firebase Cloud Function call needed here to interact with Stripe.");
    setIsProcessing(false);
    return { success: false, error: "Not implemented yet." };
  }, [toast]);

  const redirectToCustomerPortal = useCallback(async () => {
    setIsProcessing(true);
    toast({ title: "Feature In Development", description: "Stripe Customer Portal with Firebase Cloud Functions will be implemented soon." });
    console.warn("redirectToCustomerPortal: Firebase Cloud Function call needed here.");
    setIsProcessing(false);
  }, [toast]);

  return { saveUserPlanSubscription, cancelSubscription, redirectToCustomerPortal, isProcessing };
};