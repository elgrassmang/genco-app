import React, { useState, useCallback } from 'react';
import { db } from '@/lib/firebaseClient'; 
import { collection, getDocs } from "firebase/firestore";
import { useToast } from '@/components/ui/use-toast';

export const useAdminData = () => {
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllUsersDataForAdmin = useCallback(async () => {
    if (!db) {
      console.error("[useAdminData] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database not initialized.", variant: "destructive" });
      return;
    }
    setLoadingAdminData(true);
    setError(null);
    try {
      // TASK 3: Verify using 'users' collection
      // 1. Fetch Users
      const usersCollectionRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollectionRef);
      
      // Filter out archived users client-side
      const usersList = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.isArchived !== true);
      
      // 2. Fetch User Plans
      const plansCollectionRef = collection(db, "userPlans");
      const plansSnapshot = await getDocs(plansCollectionRef);
      const plansMap = new Map();
      
      // Map plans to users, keeping the most recent one if duplicates exist
      plansSnapshot.forEach(doc => {
        const planData = doc.data();
        if (!plansMap.has(planData.userId) || plansMap.get(planData.userId).createdAt < planData.createdAt) {
             plansMap.set(planData.userId, { id: doc.id, ...planData });
        }
      });

      // 3. Combine Data
      const formattedUsers = usersList.map(u => ({
        ...u,
        plan: plansMap.get(u.id) || null
      }));

      setAllUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching all users for admin:', error);
      setError(error);
      if (error.code === 'permission-denied') {
         toast({ title: "Access Denied", description: "Permission denied: Check Firestore security rules.", variant: "destructive"});
      } else {
         toast({ title: "Admin Error", description: "Could not load user data.", variant: "destructive"});
      }
      setAllUsers([]);
    } finally {
      setLoadingAdminData(false);
    }
  }, [toast]);
  
  const updateServiceStatus = async (userId, date, status) => {
    // Placeholder for future implementation
    toast({title: "Feature In Development", description: "Service status updates will be implemented with Firebase soon."});
  };

  return { allUsers, loadingAdminData, error, fetchAllUsersDataForAdmin, updateServiceStatus, setAllUsers };
};