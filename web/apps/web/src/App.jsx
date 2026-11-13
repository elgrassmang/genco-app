import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import WelcomeScreen from '@/pages/WelcomeScreen';
import UserProfileSetup from '@/pages/UserProfileSetup';
import PlanSelection from '@/pages/PlanSelection';
import PaymentPage from '@/pages/PaymentPage';
import ServiceSchedule from '@/pages/ServiceSchedule';
import CustomerDashboard from '@/pages/CustomerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import WorkerDashboard from '@/pages/WorkerDashboard'; 
import AuthLayout from '@/components/layouts/AuthLayout';
import AppLayout from '@/components/layouts/AppLayout';
import AdminLayout from '@/components/layouts/AdminLayout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider, useData } from '@/contexts/DataContext';
import { AdminDataProvider } from '@/contexts/AdminDataContext'; 
import SignupSuccessPage from '@/pages/SignupSuccessPage';
import SignupPage from '@/pages/SignupPage';

import AdminCustomers from '@/pages/admin/AdminCustomers';
import CustomerDetails from '@/pages/CustomerDetails';
import AdminRoutes from '@/pages/admin/AdminRoutes';
import AdminBilling from '@/pages/admin/AdminBilling';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loadingAuth, profile: authProfile, adminViewMode } = useAuth(); 
  const { profile: dataProfile, loadingData: dataContextLoadingData, initialDataLoaded } = useData();
  const routeLocation = useLocation(); 

  const profile = authProfile || dataProfile;
  const isLoading = loadingAuth || (!initialDataLoaded && user);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }
  
  if (!adminViewMode) {
      if (user && !user.email?.endsWith('@gencocans.com') && profile?.role !== 'worker') {
        if (initialDataLoaded && (!profile || !profile.fullname || !profile.serviceaddress) && routeLocation.pathname !== '/profile-setup') {
          return <Navigate to="/profile-setup" state={{ from: routeLocation.pathname }} replace />;
        }
      }

      if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        return <Navigate to="/dashboard" replace />; 
      }
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loadingAuth } = useAuth();

  if (loadingAuth) {
     return (
      <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />; 
  }
  return children;
}

function AppRoutes() {
  const { user, loadingAuth, isAdmin, profile: authProfile, adminViewMode } = useAuth();
  const { profile: dataProfile, initialDataLoaded } = useData();
  const location = useLocation(); 
  
  const profile = authProfile || dataProfile;

  const getDashboardComponent = () => {
     if (adminViewMode) {
         switch(adminViewMode.userRole) {
             case 'worker': return <WorkerDashboard />;
             case 'admin': return <AdminDashboard />;
             default: return <CustomerDashboard />;
         }
     }

     return profile?.role === 'worker' ? <WorkerDashboard /> : <CustomerDashboard />;
  };

  return (
    <>
      <ImpersonationBanner />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup-success" element={<SignupSuccessPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {getDashboardComponent()}
            </ProtectedRoute>
          } />
          <Route path="/dashboard/worker" element={
            <ProtectedRoute allowedRoles={['worker', 'admin']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/plan-selection" element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <PlanSelection />
            </ProtectedRoute>
          } />
          <Route path="/profile-setup" element={
            <ProtectedRoute>
              <UserProfileSetup />
            </ProtectedRoute>
          } />
          <Route path="/payment" element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <PaymentPage />
            </ProtectedRoute>
          } />
          <Route path="/schedule" element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <ServiceSchedule />
            </ProtectedRoute>
          } />
        </Route>
        
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
          <Route path="/admin/customers/:customerId" element={<AdminRoute><CustomerDetails /></AdminRoute>} />
          <Route path="/admin/routes" element={<AdminRoute><AdminRoutes /></AdminRoute>} />
          <Route path="/admin/billing" element={<AdminRoute><AdminBilling /></AdminRoute>} />
        </Route>

        <Route 
          path="/" 
          element={
            loadingAuth ? (
              <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[hsl(var(--primary))]"></div>
              </div>
            ) : user ? (
              adminViewMode ? <Navigate to="/dashboard" replace /> :
              isAdmin ? <Navigate to="/admin" replace /> :
              profile?.role === 'worker' ? <Navigate to="/dashboard/worker" replace /> :
              initialDataLoaded ? ( 
                (!profile || !profile.fullname || !profile.serviceaddress) && profile?.role !== 'worker' ? 
                <Navigate to="/profile-setup" state={{ from: location.pathname === '/' ? '/dashboard' : location.pathname }} replace /> : 
                <Navigate to="/dashboard" replace />
              ) : (
                <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[hsl(var(--primary))]"></div>
                </div>
              )
            ) : (
              <Navigate to="/welcome" replace />
            )
          } 
        />
        <Route 
          path="*" 
          element={
            loadingAuth ? null : user ? <Navigate to="/dashboard" replace /> : <Navigate to="/welcome" replace />
          } 
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AdminDataProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AdminDataProvider>
        <Toaster />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;