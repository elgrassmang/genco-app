import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { usePlanData } from '@/hooks/usePlanData';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useToast } from '@/components/ui/use-toast';
import { useInitialDataLoad } from '@/hooks/useInitialDataLoad';

const DataContext = createContext(null);

const useCombinedDataState = () => {
  const { user, profile: authProfile, loadingAuth: authLoading, isAdmin, updateUserContextProfile } = useAuth();
  const { toast } = useToast();
  
  const { 
    profile: dataHookProfile, 
    loadingProfile, 
    fetchUserProfile: fetchProfileHook, 
    saveProfile: originalSaveProfile,
    setProfile: setDataHookProfile 
  } = useProfileData();

  const { 
    plan, 
    loadingPlan, 
    fetchUserPlan: fetchPlanHook, 
    savePlan: originalSavePlan,
    setPlan
  } = usePlanData();
  
  const effectiveProfile = authProfile || dataHookProfile;

  const { 
    initialDataLoaded, 
    loadingData: initialDataHookLoading 
  } = useInitialDataLoad(user, authLoading, fetchProfileHook, fetchPlanHook, setDataHookProfile, setPlan);
  
  const dataActions = useDataActionsLogic(
    user, toast, originalSaveProfile, setDataHookProfile, updateUserContextProfile,
    originalSavePlan, plan, fetchPlanHook, setPlan
  );

  const loadingData = useMemo(() => 
    authLoading || (user && (!initialDataLoaded || loadingProfile || loadingPlan)) || initialDataHookLoading,
    [authLoading, user, initialDataLoaded, loadingProfile, loadingPlan, initialDataHookLoading]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      setDataHookProfile(null);
      setPlan(null);
    }
  }, [user, authLoading, setDataHookProfile, setPlan]);

  const fetchUserProfile = useCallback((idToFetch) => 
    fetchProfileHook(idToFetch || (isAdmin && idToFetch ? idToFetch : user?.uid)),
    [fetchProfileHook, isAdmin, user?.uid]
  );

  const fetchUserPlan = useCallback((idToFetch) => 
    fetchPlanHook(idToFetch || (isAdmin && idToFetch ? idToFetch : user?.uid)),
    [fetchPlanHook, isAdmin, user?.uid]
  );
  
  return {
    profile: effectiveProfile,
    plan,
    ...dataActions,
    loadingData, 
    fetchUserProfile, 
    fetchUserPlan,
    initialDataLoaded,
    setProfile: setDataHookProfile, 
    setPlan
  };
};

const useDataActionsLogic = (
  user, toast, originalSaveProfile, setDataHookProfile, updateUserContextProfile, 
  originalSavePlan, plan, fetchPlanHook, setPlan
) => {
  const { 
    saveUserPlanSubscription, 
    cancelSubscription: cancelSubscriptionHookAction,
    redirectToCustomerPortal,
    isProcessing: isSubscriptionProcessing 
  } = useSubscriptionManagement(setPlan, fetchPlanHook);

  const saveProfile = useCallback(async (profileData) => {
    if (!user?.uid) {
      toast({ title: "Error", description: "You must be logged in to save profile.", variant: "destructive" });
      return null;
    }
    const result = await originalSaveProfile(profileData, user);
    if (result) {
      setDataHookProfile(prev => ({...prev, ...profileData, role: result.role || prev?.role, id: user.uid }));
      updateUserContextProfile(result); 
    }
    return result;
  }, [user, originalSaveProfile, toast, setDataHookProfile, updateUserContextProfile]);
  
  const savePlan = useCallback(async (planDetails) => {
    if (!user?.uid) {
      toast({ title: "Error", description: "You must be logged in to save plan.", variant: "destructive" });
      return null;
    }
    return originalSavePlan(planDetails, user);
  }, [user, originalSavePlan, toast]);

  const cancelSubscription = useCallback(async () => {
    if (!user?.uid) {
      toast({ title: "Error", description: "You must be logged in to cancel subscription.", variant: "destructive" });
      return { success: false, error: "User not logged in." };
    }
    if (!plan?.stripeSubscriptionId || !plan.id) {
        toast({ title: "Error", description: "No active subscription or plan ID to cancel.", variant: "destructive" });
        return { success: false, error: "No active subscription ID or plan ID." };
    }
    return cancelSubscriptionHookAction(plan.stripeSubscriptionId, user.uid, plan.id);
  }, [plan, user, cancelSubscriptionHookAction, toast]);

  return { saveProfile, savePlan, saveUserPlanSubscription, cancelSubscription, redirectToCustomerPortal, isSubscriptionProcessing };
};

export const DataProvider = ({ children }) => {
  const dataValues = useCombinedDataState();
  return <DataContext.Provider value={dataValues}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === null) throw new Error('useData must be used within a DataProvider');
  return context;
};