import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useInitialDataLoad = (user, authLoading, fetchUserProfile, fetchUserPlan, setProfile, setPlan) => {
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(true); 
  const { toast } = useToast();

  const loadData = useCallback(async (userId) => {
    console.log("[useInitialDataLoad] User detected (ID:", userId, "), fetching initial profile and plan.");
    setLoadingData(true);
    setInitialDataLoaded(false); 
    try {
      await fetchUserProfile(userId);
      await fetchUserPlan(userId);
    } catch (error) {
      console.error("[useInitialDataLoad] Error during initial data fetch:", error);
      toast({ title: "Data Fetch Error", description: "Could not load your initial profile or plan data.", variant: "destructive" });
    } finally {
      setInitialDataLoaded(true); 
      setLoadingData(false);
      console.log("[useInitialDataLoad] Profile and plan fetch sequence completed for user:", userId);
    }
  }, [fetchUserProfile, fetchUserPlan, toast]);

  const clearDataAndFinalize = useCallback(() => {
    console.log("[useInitialDataLoad] No user detected or auth still loading, clearing profile and plan data.");
    if (setProfile) setProfile(null);
    if (setPlan) setPlan(null);
    setInitialDataLoaded(true); 
    setLoadingData(false);
  }, [setProfile, setPlan]);

  useEffect(() => {
    // TASK 2: Prevent race conditions by strictly checking authLoading
    // PREVENT RACE CONDITION: Do not clear or fetch data while auth state is indeterminate
    if (authLoading) {
       console.log("[useInitialDataLoad] Auth is loading, preserving existing data state to prevent flickering/race conditions.");
       // We deliberately do NOT call clearDataAndFinalize() here.
       // We just set loading indicator to true to show UI spinner if needed.
       setLoadingData(true);
       setInitialDataLoaded(false);
       return; 
    }

    // Only proceed when auth is fully settled (authLoading === false)
    if (user && user.uid) { // Use uid to be consistent with Firebase user object
      loadData(user.uid);
    } else if (user && user.id) { // Fallback for some user object structures
      loadData(user.id);
    } else {
      // Only clear data when we are CERTAIN there is no user and auth is finished
      clearDataAndFinalize();
    }
  }, [user, authLoading, loadData, clearDataAndFinalize]);

  return { initialDataLoaded, loadingData };
};