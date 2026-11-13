import { useState, useCallback } from 'react';
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
          const usersCollectionRef = collection(db, "users");
          const usersSnapshot = await getDocs(usersCollectionRef);
          const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const plansCollectionRef = collection(db, "userPlans");
          const plansSnapshot = await getDocs(plansCollectionRef);
          const plansMap = new Map();
          plansSnapshot.forEach(doc => {
            const planData = doc.data();
            if (!plansMap.has(planData.userId) || plansMap.get(planData.userId).createdAt < planData.createdAt) {
                 plansMap.set(planData.userId, { id: doc.id, ...planData });
            }
          });

          const formattedUsers = usersList.map(u => ({
            ...u,
            plan: plansMap.get(u.id) || null
          }));

          setAllUsers(formattedUsers);
        } catch (error) {
          console.error('Error fetching all users for admin:', error);
          setError(error);
          if (error.code === 'permission-denied') {
             toast({ title: "Access Denied", description: "You do not have permission to view this data.", variant: "destructive"});
          } else {
             toast({ title: "Admin Error", description: "Could not load user data.", variant: "destructive"});
          }
          setAllUsers([]);
        } finally {
          setLoadingAdminData(false);
        }
      }, [toast]);
      
      const updateServiceStatus = async (userId, date, status) => {
        toast({title: "Feature In Development", description: "Service status updates will be implemented with Firebase soon."});
      };

      return { allUsers, loadingAdminData, error, fetchAllUsersDataForAdmin, updateServiceStatus, setAllUsers };
    };