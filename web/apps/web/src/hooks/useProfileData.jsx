import React, { useState, useCallback } from 'react';
import { db } from '@/lib/firebaseClient'; 
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from '@/components/ui/use-toast';

export const useProfileData = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    if (!db) {
      console.error("[useProfileData] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database not initialized.", variant: "destructive" });
      return null;
    }
    setLoadingProfile(true);
    try {
      // TASK 3: Ensure 'users' collection is used, not 'profiles'
      const userDocRef = doc(db, "users", userId);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setProfile(data);
        return data;
      } else {
        console.warn(`[useProfileData] Profile not found for user ${userId}.`);
        setProfile(null); 
        return null;
      }
    } catch (error) {
      console.error('[useProfileData] fetchUserProfile: Error fetching profile:', error);
      toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive" });
      setProfile(null);
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [toast]);

  const saveProfile = async (profileData, currentAuthUser) => {
    if (!currentAuthUser || !currentAuthUser.uid) {
      toast({title: "Error", description: "You must be logged in.", variant: "destructive"});
      return null;
    }
    if (!db) {
      console.error("[useProfileData] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database not initialized.", variant: "destructive" });
      return null;
    }
    setLoadingProfile(true);
    try {
      // TASK 3: Ensure 'users' collection is used
      const userDocRef = doc(db, "users", currentAuthUser.uid);
      const dataToSave = {
        ...profileData, 
        email: currentAuthUser.email,
        updatedAt: serverTimestamp(),
        id: currentAuthUser.uid,
        isTemporary: false 
      };
      
      // Check existence first to decide between set (with merge) or update
      // Though setDoc with merge:true is often safer if doc might not exist
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
          await updateDoc(userDocRef, dataToSave);
      } else {
          dataToSave.createdAt = serverTimestamp();
          await setDoc(userDocRef, dataToSave);
      }

      const updatedProfile = { ...dataToSave, id: currentAuthUser.uid, email: currentAuthUser.email };
      // Remove timestamps for local state to avoid serialization issues if passed around improperly
      delete updatedProfile.createdAt; 
      delete updatedProfile.updatedAt; 
      
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('[useProfileData] saveProfile: Error saving profile:', error);
      toast({ title: "Profile Save Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoadingProfile(false);
    }
  };

  return { profile, loadingProfile, fetchUserProfile, saveProfile, setProfile };
};