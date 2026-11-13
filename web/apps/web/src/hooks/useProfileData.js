import { useState, useCallback } from 'react';
    import { supabase } from '@/lib/supabaseClient';
    import { useToast } from '@/components/ui/use-toast';

    export const useProfileData = (userId) => {
      const { toast } = useToast();
      const [profile, setProfile] = useState(null);
      const [loadingProfile, setLoadingProfile] = useState(false);

      const fetchUserProfile = useCallback(async (idToFetch) => {
        if (!idToFetch) {
          setProfile(null);
          return null;
        }
        setLoadingProfile(true);
        console.log(`[useProfileData] fetchUserProfile: Fetching profile for user ${idToFetch}`);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, fullname, email, phone, serviceaddress, pickupday, isgated, notes, created_at, updated_at')
          .eq('id', idToFetch)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('[useProfileData] fetchUserProfile: Error fetching profile:', error);
          toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" });
          setProfile(null);
        } else if (error && error.code === 'PGRST116') {
          console.log(`[useProfileData] fetchUserProfile: No profile found for user ${idToFetch} (PGRST116). This is normal for new users.`);
          setProfile(null);
        } else {
          console.log(`[useProfileData] fetchUserProfile: Profile data received for ${idToFetch}:`, data);
          setProfile(data);
        }
        setLoadingProfile(false);
        return data;
      }, [toast]);

      const saveProfile = async (profileData, currentAuthUser) => {
        if (!currentAuthUser || !currentAuthUser.id) {
          toast({title: "Error", description: "You must be logged in with a valid user ID to save a profile.", variant: "destructive"});
          console.error("[useProfileData] saveProfile: User or user.id is missing.");
          return null;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[useProfileData] saveProfile: Error fetching session:", sessionError);
          toast({ title: "Session Error", description: "Could not verify current session for profile save.", variant: "destructive" });
          return null;
        }
        
        if (!sessionData.session) {
            console.log("[useProfileData] saveProfile: No active session found by supabase.auth.getSession().");
            toast({title: "Session Error", description: "No active user session found. Please log in again.", variant: "destructive"});
            return null;
        }
        
        if (sessionData.session.user.id !== currentAuthUser.id) {
            console.error("[useProfileData] saveProfile: Session user ID does not match currentAuthUser ID. This should not happen.");
            toast({title: "Session Mismatch", description: "User ID mismatch. Please refresh and try again.", variant: "destructive"});
            return null;
        }
        
        setLoadingProfile(true);
        console.log(`[useProfileData] saveProfile: Attempting to save profile for user ${currentAuthUser.id} with data:`, profileData);
        
        const dataToSave = { 
          id: currentAuthUser.id, 
          updated_at: new Date().toISOString(),
          fullname: profileData.fullname,
          email: currentAuthUser.email, 
          phone: profileData.phone,
          serviceaddress: profileData.serviceaddress,
          pickupday: profileData.pickupday,
          isgated: profileData.isgated,
          notes: profileData.notes,
        };
        
        if (profileData.created_at) {
            dataToSave.created_at = profileData.created_at;
        } else {
             dataToSave.created_at = new Date().toISOString();
        }


        const { data, error } = await supabase
          .from('profiles')
          .upsert(dataToSave, { onConflict: 'id', defaultToNull: false })
          .select()
          .single();

        if (error) {
          console.error('[useProfileData] saveProfile: Error saving profile:', error);
          toast({ title: "Profile Save Error", description: `Database operation failed: ${error.message}. Check console for details.`, variant: "destructive" });
          setLoadingProfile(false);
          return null;
        }
        
        console.log(`[useProfileData] saveProfile: Profile saved successfully for ${currentAuthUser.id}:`, data);
        setProfile(data); 
        toast({ title: "Profile Saved", description: "Your profile has been updated successfully." });
        setLoadingProfile(false);
        return data;
      };

      return { profile, loadingProfile, fetchUserProfile, saveProfile, setProfile };
    };