import React, { useState, useCallback } from 'react';
import { db } from '@/lib/firebaseClient';
import { doc, getDocs, collection, query, where, orderBy, limit, serverTimestamp, writeBatch } from "firebase/firestore";
import { useToast } from '@/components/ui/use-toast';
import { getStripePriceId as getConfigStripePriceId } from '@/config/plans';

export const usePlanData = () => {
  const { toast } = useToast();
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false); 

  const fetchUserPlan = useCallback(async (userId) => {
    if (!userId) {
      setPlan(null);
      setLoadingPlan(false);
      return null;
    }
     if (!db) {
      console.error("[usePlanData] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database not initialized.", variant: "destructive" });
      return null;
    }
    setLoadingPlan(true);
    try {
      // TASK 3: Verify collections. Plans are in 'userPlans'.
      const userPlansRef = collection(db, "userPlans");
      // Use composite index if available, or just filtering. 
      // Note: `orderBy` with `where` usually requires an index.
      const q = query(userPlansRef, where("userId", "==", userId), orderBy("createdAt", "desc"), limit(1));
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const planDoc = querySnapshot.docs[0];
        const data = { id: planDoc.id, ...planDoc.data() };
        setPlan(data);
        return data;
      } else {
        setPlan(null);
        return null;
      }
    } catch (error) {
      console.error(`[usePlanData] fetchUserPlan: Error for user ${userId}:`, error);
      
      let friendlyError = "Could not load plan data.";
      if (error.code === 'failed-precondition') {
          friendlyError = "Database index missing for plans. Please contact admin.";
      }
      
      toast({ title: "Error Loading Plan", description: friendlyError, variant: "destructive" });
      setPlan(null);
      return null;
    } finally {
      setLoadingPlan(false);
    }
  }, [toast]); 
  
  const savePlan = async (planDetails, currentAuthUser) => {
    if (!currentAuthUser || !currentAuthUser.uid) {
      toast({title: "Error", description: "You must be logged in.", variant: "destructive"});
      return null;
    }
    if (!db) {
      console.error("[usePlanData] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database not initialized.", variant: "destructive" });
      return null;
    }
    setLoadingPlan(true);
    
    try {
        const priceIdToSave = getConfigStripePriceId(planDetails.id);

        if (!priceIdToSave || priceIdToSave.includes('YOUR_')) {
            toast({ title: "Configuration Error", description: `Payment configuration for ${planDetails.name} is incomplete. Please contact support.`, variant: "destructive", duration: 7000 });
            setLoadingPlan(false);
            return null;
        }

        const newPlanEntry = {
          userId: currentAuthUser.uid,
          plan_id: planDetails.id, 
          name: planDetails.name,
          price: planDetails.price,
          stripePriceId: priceIdToSave, 
          status: 'selected', 
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        const batch = writeBatch(db);
        const userPlansRef = collection(db, "userPlans");
        
        // Mark existing plans as archived
        const q = query(userPlansRef, where("userId", "==", currentAuthUser.uid), where("status", "in", ["active", "selected"]));
        const existingActiveOrSelectedPlansSnapshot = await getDocs(q);

        existingActiveOrSelectedPlansSnapshot.forEach(doc => {
          batch.update(doc.ref, { status: "archived", updatedAt: serverTimestamp() });
        });
        
        // Create new plan
        const newPlanRef = doc(collection(db, "userPlans"));
        batch.set(newPlanRef, newPlanEntry);
        
        await batch.commit();

        const savedData = { id: newPlanRef.id, ...newPlanEntry };
        setPlan(savedData); 
        toast({ title: "Plan Selected", description: `${savedData.name} has been selected.` });
        return savedData;
    } catch (error) {
      console.error('[usePlanData] savePlan: Error saving plan:', error);
      toast({ title: "Plan Save Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoadingPlan(false);
    }
  };

  return { plan, loadingPlan, fetchUserPlan, savePlan, setPlan };
};