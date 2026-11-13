import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '@/lib/firebaseClient'; 
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(null);

const defaultCustomerProfile = (uid, email, additionalData = {}) => ({
  id: uid, 
  email: email, 
  role: 'customer', 
  isTemporary: true,
  fullname: additionalData.fullname || 'Not Set',
  // New Address Fields
  street_address: additionalData.street_address || '',
  city: additionalData.city || '',
  state: additionalData.state || 'FL',
  zip_code: additionalData.zip_code || '',
  // Legacy support/Display
  serviceaddress: additionalData.serviceaddress || 'Not Set',
  phone: '',
  pickupday: '',
  isgated: false,
  notes: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

const useProfileFetcherLogic = (setLoadingAuth, setProfileState, setIsAdminState, toast) => {
  const fetchProfileWithRetries = useCallback(async (currentAuthUser, attempt = 1) => {
    if (!currentAuthUser?.uid) {
      setProfileState(null);
      if (attempt === 1) setLoadingAuth(false);
      return null;
    }
    if (!db) {
      console.error("[AuthContext:fetchProfileWithRetries] Firestore (db) is not initialized.");
      toast({ title: "Firebase Error", description: "Database service not available.", variant: "destructive", duration: 7000 });
      setProfileState(null);
      if (attempt === 1) setLoadingAuth(false);
      return null;
    }
    
    try {
      const userDocRef = doc(db, "users", currentAuthUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const profileData = { id: userDocSnap.id, ...userDocSnap.data(), isTemporary: false };
        setProfileState(profileData);
        
        const isEmailAdmin = currentAuthUser.email?.endsWith('@gencocans.com');
        const isRoleAdmin = profileData.role === 'admin';
        setIsAdminState(isEmailAdmin || isRoleAdmin);

        return profileData;
      } else {
        if (attempt <= 3) { 
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          return fetchProfileWithRetries(currentAuthUser, attempt + 1);
        }
        console.warn(`[AuthContext:fetchProfileWithRetries] Profile not found for user ${currentAuthUser.uid} after ${attempt} attempts. Creating temporary profile.`);
        const tempProfile = defaultCustomerProfile(currentAuthUser.uid, currentAuthUser.email);
        setProfileState(tempProfile);
        setIsAdminState(currentAuthUser.email?.endsWith('@gencocans.com') || false);
        return tempProfile;
      }
    } catch (error) {
      console.error("[AuthContext:fetchProfileWithRetries] Error fetching profile:", error);
      let description = "Could not load your profile.";
      if (error.code === 'unavailable' || error.message.toLowerCase().includes('offline')) {
        description = "Failed to get profile: client is offline or network issue.";
      } else if (error.code === 'permission-denied' || error.message.toLowerCase().includes('insufficient permissions')) {
        description = "Cannot access profile: Insufficient permissions. Please check Firestore rules.";
      }
      toast({ title: "Profile Error", description, variant: "destructive", duration: 7000 });
      setProfileState(null);
      return null;
    } finally {
      if (attempt === 1) setLoadingAuth(false); 
    }
  }, [setLoadingAuth, setProfileState, setIsAdminState, toast]);
  return fetchProfileWithRetries;
};

const useAuthStateObserverLogic = (setLoadingAuth, setUserState, setIsAdminState, setProfileState, fetchUserProfile, toast, setAdminViewMode) => {
  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false);
      toast({ title: "Firebase Auth Error", description: "Firebase Auth not initialized. Check config.", variant: "destructive" });
      return () => {};
    }
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          setUserState(authUser);
          setIsAdminState(authUser.email?.endsWith('@gencocans.com') || false);
          await fetchUserProfile(authUser);
        } else {
          setUserState(null);
          setProfileState(null); 
          setIsAdminState(false);
          setLoadingAuth(false);
          setAdminViewMode(null); // Clear impersonation on logout/session end
          localStorage.removeItem('adminViewMode');
        }
      } catch (err) {
        console.error("Error in auth state change handler:", err);
        setLoadingAuth(false);
      }
    }, (error) => {
       console.error("[AuthContext:onAuthStateChanged] Error:", error);
       toast({ title: "Authentication Error", description: "Session verification issue.", variant: "destructive" });
       setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [setLoadingAuth, setUserState, setIsAdminState, setProfileState, fetchUserProfile, toast, setAdminViewMode]);
};

const handleAuthError = (error, toast, setLoadingAuthFlag, operationType = "Operation") => {
  let specificErrorType = null;
  let description = error.message;
  
  const errorMappings = {
    'auth/invalid-credential': { type: 'invalid_credentials', msg: "Account not found or incorrect password." },
    'auth/user-not-found': { type: 'invalid_credentials', msg: "Account not found or incorrect password." },
    'auth/wrong-password': { type: 'invalid_credentials', msg: "Account not found or incorrect password." },
    'auth/user-disabled': { type: 'user_disabled', msg: "This account has been disabled." },
    'auth/email-already-in-use': { type: 'email_already_in_use', msg: "This email is already registered." },
    'auth/weak-password': { type: 'weak_password', msg: "Password is too weak." },
    'unavailable': { msg: `${operationType} failed: Client is offline or network issue.` },
    'permission-denied': { msg: `${operationType} DB error: Insufficient permissions. Check Firestore rules.` }
  };

  const mapping = errorMappings[error.code] || (error.message.toLowerCase().includes('offline') ? errorMappings['unavailable'] : null) || (error.message.toLowerCase().includes('insufficient permissions') ? errorMappings['permission-denied'] : null);

  if (mapping) {
    specificErrorType = mapping.type || specificErrorType;
    description = mapping.msg || description;
  }

  toast({ title: `${operationType} Failed`, description, variant: "destructive", duration: 7000 });
  if (setLoadingAuthFlag) setLoadingAuthFlag(false);
  return { ...error, specificType: specificErrorType };
};

const useAuthActionsLogic = (setLoadingAuth, setUserState, setIsAdminState, fetchUserProfile, setProfileState, toast) => {
  const login = useCallback(async (email, password) => {
    if (!auth) {
      toast({ title: "Firebase Error", description: "Auth service unavailable.", variant: "destructive" });
      return { error: { message: "Firebase Auth not initialized." } };
    }
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUserState(userCredential.user);
      setIsAdminState(userCredential.user.email?.endsWith('@gencocans.com') || false);
      const fetchedProfile = await fetchUserProfile(userCredential.user);
      toast({ title: "Login Successful", description: "Welcome back!" });
      return { user: userCredential.user, profile: fetchedProfile, error: null };
    } catch (error) {
      const processedError = handleAuthError(error, toast, setLoadingAuth, "Login");
      return { error: processedError };
    } 
  }, [setLoadingAuth, setUserState, setIsAdminState, fetchUserProfile, toast]);

  const signup = useCallback(async (email, password, additionalData = {}) => {
    if (!auth || !db) {
      toast({ title: "Firebase Error", description: "Auth or DB service unavailable.", variant: "destructive" });
      return { error: { message: "Firebase not initialized." } };
    }
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Prepare initial data with address fields if present
        const initialProfileData = { 
          ...defaultCustomerProfile(firebaseUser.uid, firebaseUser.email, additionalData), 
          isTemporary: false 
        };
        
        await setDoc(userDocRef, initialProfileData);
        
        setUserState(firebaseUser);
        setProfileState(initialProfileData);
        setIsAdminState(firebaseUser.email?.endsWith('@gencocans.com') || false);
        
        try {
          await sendEmailVerification(firebaseUser);
          toast({ title: "Account Created!", description: "Please check your email to verify your account.", duration: 10000 });
        } catch (verificationError) {
          console.error("Error sending verification email:", verificationError);
          toast({ title: "Account Created", description: "Profile created, but failed to send verification email.", variant: "warning", duration: 10000 });
        }
        setLoadingAuth(false);
        return { user: firebaseUser, error: null, profile: initialProfileData };
      } else {
         toast({ title: "Signup Issue", description: "User not fully created.", variant: "destructive"});
         setLoadingAuth(false);
         return { error: { message: "User creation failed post-auth."}};
      }
    } catch (error) {
      const processedError = handleAuthError(error, toast, setLoadingAuth, "Signup");
      return { error: processedError };
    }
  }, [setLoadingAuth, setUserState, setIsAdminState, setProfileState, toast]);

  const logout = useCallback(async () => {
    if (!auth) {
      toast({ title: "Firebase Error", description: "Auth service unavailable.", variant: "destructive" });
      return;
    }
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoadingAuth(false); 
    }
  }, [setLoadingAuth, toast]);
  return { login, signup, logout };
};

const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState(() => {
    // Initialize from local storage if available
    const savedMode = localStorage.getItem('adminViewMode');
    return savedMode ? JSON.parse(savedMode) : null;
  });
  const { toast } = useToast();

  const fetchUserProfile = useProfileFetcherLogic(setLoadingAuth, setProfile, setIsAdmin, toast);
  useAuthStateObserverLogic(setLoadingAuth, setUser, setIsAdmin, setProfile, fetchUserProfile, toast, setAdminViewMode);
  const authActions = useAuthActionsLogic(setLoadingAuth, setUser, setIsAdmin, fetchUserProfile, setProfile, toast);

  const updateUserContextProfile = useCallback((updatedProfileData) => {
    setProfile(prevProfile => {
      const newProfile = { 
        ...prevProfile, 
        ...updatedProfileData, 
        id: user?.uid || prevProfile?.id, 
        isTemporary: prevProfile?.isTemporary && !updatedProfileData.fullname ? true : false
      };
      if (updatedProfileData.fullname && updatedProfileData.fullname !== 'Not Set') {
        newProfile.isTemporary = false;
      }
      return newProfile;
    });
  }, [user]);

  // --- Impersonation Logic ---
  const startImpersonation = useCallback((userId, userName, userRole, userEmail) => {
    if (!isAdmin) {
      toast({ 
        title: "Access Denied", 
        description: "Only administrators can start impersonation mode.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Safety check: Prevent impersonating self (loops) or other critical errors
    if (userId === user.uid && userRole === 'admin') {
       toast({ title: "Action Not Required", description: "You are already viewing as yourself." });
       return;
    }

    const viewModeData = { userId, userName, userRole, userEmail };
    setAdminViewMode(viewModeData);
    localStorage.setItem('adminViewMode', JSON.stringify(viewModeData));
    
    console.log(`[Impersonation] Admin ${user.email} started impersonating ${userEmail} (${userRole})`);
    
    toast({
      title: "Viewing as User",
      description: `You are now viewing the dashboard as ${userName}.`,
      variant: "default",
      className: "bg-yellow-500 text-white border-yellow-600"
    });
  }, [isAdmin, user, toast]);

  const exitImpersonation = useCallback(() => {
    setAdminViewMode(null);
    localStorage.removeItem('adminViewMode');
    toast({
      title: "Impersonation Ended",
      description: "Returned to your admin dashboard.",
      variant: "default"
    });
  }, [toast]);
  
  useEffect(() => {
    if (!loadingAuth &&!user) {
        localStorage.removeItem('selectedPlanId_initial');
        localStorage.removeItem('selectedPlan_initial_details');
    }
  }, [user, loadingAuth]);

  // Derived Values
  const viewedUser = adminViewMode ? { ...adminViewMode, uid: adminViewMode.userId, id: adminViewMode.userId, email: adminViewMode.userEmail } : user;

  return { 
    user, 
    viewedUser, // Use this in dashboards to support impersonation
    profile, 
    isAdmin, 
    loadingAuth, 
    adminViewMode, // Exposed for routing and UI
    startImpersonation,
    exitImpersonation,
    ...authActions, 
    fetchUserProfile, 
    updateUserContextProfile 
  };
};

export const AuthProvider = ({ children }) => {
  const authValues = useFirebaseAuth();
  return <AuthContext.Provider value={authValues}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};