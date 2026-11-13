import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAdminData as useAdminDataHook } from '@/hooks/useAdminData';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const AdminDataContext = createContext(null);

export const AdminDataProvider = ({ children }) => {
  const { user, profile, loadingAuth, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const { 
    allUsers, 
    loadingAdminData, 
    error,
    fetchAllUsersDataForAdmin, 
    updateServiceStatus: originalUpdateServiceStatus,
    setAllUsers 
  } = useAdminDataHook();

  // Task 1: Fix race condition with auth profile verification and add guards
  useEffect(() => {
    // 1. Auth Profile Check: Wait for auth loading to finish
    if (loadingAuth) {
      return;
    }

    // 2. Strict Guards: Check if user exists AND is explicitly an admin
    // We check both the context isAdmin flag and the profile role for safety
    const isUserAdmin = user && (profile?.role === 'admin' || isAdmin);

    if (!user || !isUserAdmin) {
      if (allUsers.length > 0) {
        setAllUsers([]); // Clear any stale admin data if permissions are lost
      }
      return;
    }

    // 3. Error Handling: Wrap fetch in try-catch
    const fetchData = async () => {
      try {
        await fetchAllUsersDataForAdmin();
      } catch (err) {
        console.error("[AdminDataContext] Failed to fetch admin data:", err);
        toast({
          title: "Data Fetch Error",
          description: "Could not load admin data. Please try refreshing the page.",
          variant: "destructive"
        });
      }
    };

    fetchData();

  }, [loadingAuth, profile, user, isAdmin, fetchAllUsersDataForAdmin, setAllUsers, toast, allUsers.length]);

  const updateServiceStatus = useCallback(async (userIdToUpdate, date, status) => {
    // Safeguard
    if (!user || (profile?.role !== 'admin' && !isAdmin)) {
       console.warn("Attempted to update service status without admin permissions");
       toast({
         title: "Permission Denied",
         description: "You do not have permission to perform this action.",
         variant: "destructive"
       });
       return;
    }
    try {
      return await originalUpdateServiceStatus(userIdToUpdate, date, status);
    } catch (error) {
      console.error("[AdminDataContext] Update service status failed:", error);
      toast({
         title: "Update Failed",
         description: "Failed to update service status.",
         variant: "destructive"
      });
    }
  }, [originalUpdateServiceStatus, user, profile, isAdmin, toast]);
  
  const contextValue = useMemo(() => ({
    allUsers,
    updateServiceStatus,
    loadingAdminData,
    error,
    fetchAllUsersDataForAdmin
  }), [
    allUsers, updateServiceStatus, loadingAdminData, error, fetchAllUsersDataForAdmin
  ]);

  // 4. Loading State: Show spinner while verifying auth/profile
  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[hsl(var(--brand-dark-mode-bg))] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--brand-accent-red))]" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <AdminDataContext.Provider value={contextValue}>
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = () => {
  const context = useContext(AdminDataContext);
  if (context === null) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
};