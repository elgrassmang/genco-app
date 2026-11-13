import React, { useEffect } from 'react';
    import { Link, useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { useAuth } from '@/contexts/AuthContext';
    import { useData } from '@/contexts/DataContext';
    import { motion } from 'framer-motion';
    import { User, ShoppingCart, CalendarDays, CreditCard, Edit3, AlertTriangle, Loader2, LogOut, Info } from 'lucide-react';

    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: i * 0.1,
          duration: 0.5,
          ease: "easeOut"
        }
      })
    };

    const DashboardProfileCard = ({ profile, user, index }) => (
      <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-xl h-full flex flex-col glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold text-[hsl(var(--primary))]">Your Profile</CardTitle>
            <User className="h-6 w-6 text-[hsl(var(--primary))]" />
          </CardHeader>
          <CardContent className="pt-4 space-y-1 flex-grow text-[hsl(var(--card-foreground))]">
            <p><strong className="text-[hsl(var(--foreground))]">Name:</strong> {profile?.fullname || profile?.full_name || 'Not set'}</p>
            <p><strong className="text-[hsl(var(--foreground))]">Email:</strong> {profile?.email || user?.email}</p>
            <p><strong className="text-[hsl(var(--foreground))]">Phone:</strong> {profile?.phone || 'Not set'}</p>
            <p><strong className="text-[hsl(var(--foreground))]">Address:</strong> {profile?.serviceaddress || 'Not set'}</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors">
              <Link to="/profile-setup"><Edit3 className="mr-2 h-4 w-4" /> Edit Profile</Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );

    const DashboardPlanCard = ({ plan, loadingData, initialDataLoaded, redirectToCustomerPortal, isSubscriptionProcessing, navigate, index }) => {
      const renderContent = () => {
        if (loadingData && !initialDataLoaded && !plan) {
          return (
            <CardContent className="pt-4 flex items-center justify-center h-24 text-[hsl(var(--muted-foreground))]">
              <Loader2 className="h-6 w-6 text-[hsl(var(--primary))] animate-spin" />
              <p className="ml-2">Loading plan details...</p>
            </CardContent>
          );
        }

        if (!plan) {
          return (
            <CardContent className="pt-4 text-[hsl(var(--card-foreground))]">
              <div className="flex items-center text-[hsl(var(--destructive))]">
                <AlertTriangle className="mr-2 h-5 w-5" />
                <p className="font-semibold">No active plan found.</p>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Please select a plan to activate your service.
              </p>
              <Button onClick={() => navigate('/plan-selection')} className="mt-4 w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
                <ShoppingCart className="mr-2 h-4 w-4" /> Select a Plan
              </Button>
            </CardContent>
          );
        }
        return (
          <CardContent className="pt-4 space-y-2 text-[hsl(var(--card-foreground))]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Plan Name:</span>
              <span className="font-semibold">{plan.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Price:</span>
              <span className="font-semibold">{plan.price || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Status:</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                plan.status === 'active' ? 'bg-green-600/80 text-white' : 
                plan.status === 'selected' ? 'bg-yellow-500/80 text-black' : 
                plan.status === 'cancelled' ? 'bg-red-600/80 text-white' :
                'bg-gray-500/80 text-white'
              }`}>
                {plan.status ? plan.status.charAt(0).toUpperCase() + plan.status.slice(1) : 'N/A'}
              </span>
            </div>
            {plan.stripe_subscription_id && plan.status === 'active' && (
               <Button 
                onClick={redirectToCustomerPortal} 
                disabled={isSubscriptionProcessing}
                className="mt-4 w-full bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))/0.9] text-[hsl(var(--secondary-foreground))]"
              >
                {isSubscriptionProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Manage Billing
              </Button>
            )}
             {plan.status === 'selected' && (!plan.stripe_subscription_id || plan.stripe_subscription_id === '') && (
              <Button onClick={() => navigate('/payment')} className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white">
                <CreditCard className="mr-2 h-4 w-4" /> Proceed to Payment
              </Button>
            )}
             {plan.status === 'cancelled' && (
                 <p className="text-sm text-[hsl(var(--destructive))] mt-2 flex items-center"><Info className="h-4 w-4 mr-1" /> Your subscription is cancelled. Select a new plan to reactivate.</p>
            )}
          </CardContent>
        );
      };
      
      return (
        <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-xl h-full flex flex-col glassmorphism">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-semibold text-[hsl(var(--primary))]">Service Plan</CardTitle>
              <ShoppingCart className="h-6 w-6 text-[hsl(var(--primary))]" />
            </CardHeader>
            <div className="flex-grow">
                {renderContent()}
            </div>
            <CardFooter>
              {plan && plan.status !== 'cancelled' && (
                 <Button asChild variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors">
                   <Link to="/plan-selection"><Edit3 className="mr-2 h-4 w-4" /> Change Plan</Link>
                 </Button>
              )}
               {plan && plan.status === 'cancelled' && ( 
                 <Button onClick={() => navigate('/plan-selection')} className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
                     <ShoppingCart className="mr-2 h-4 w-4" /> Select a New Plan
                 </Button>
              )}
           </CardFooter>
          </Card>
        </motion.div>
      );
    };

    const DashboardScheduleCard = ({ profile, index }) => (
      <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants} className="md:col-span-2">
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-xl h-full flex flex-col glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-semibold text-[hsl(var(--primary))]">Service Schedule</CardTitle>
            <CalendarDays className="h-6 w-6 text-[hsl(var(--primary))]" />
          </CardHeader>
          <CardContent className="pt-4 flex-grow text-[hsl(var(--card-foreground))]">
            {profile?.pickupday ? (
              <p>Your bins will be handled on <strong className="text-[hsl(var(--foreground))]">{profile.pickupday.charAt(0).toUpperCase() + profile.pickupday.slice(1)}s</strong>.</p>
            ) : (
              <p className="text-[hsl(var(--muted-foreground))]">Your pickup day is not set. Please complete your profile.</p>
            )}
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">We'll notify you of any changes to your schedule.</p>
          </CardContent>
           <CardFooter>
            <Button asChild variant="outline" className="w-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors">
              <Link to="/schedule"><CalendarDays className="mr-2 h-4 w-4" /> View Full Schedule</Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );


    const CustomerDashboard = () => {
      const { user, logout, profile: authProfile, viewedUser, adminViewMode } = useAuth();
      const { 
        profile: dataProfile, 
        plan, 
        loadingData, 
        initialDataLoaded, 
        redirectToCustomerPortal, 
        isSubscriptionProcessing, 
        fetchUserPlan,
        fetchUserProfile
      } = useData();
      const navigate = useNavigate();

      // If impersonating, use viewedUser ID. If fetching own, use authProfile/dataProfile
      // We need to trigger a fetch if the viewed ID is different from the currently loaded data profile ID
      
      const activeUserId = viewedUser?.uid || user?.id;

      // Determine which profile object to display. 
      // Note: useData usually holds the profile for the logged in user. 
      // If we are impersonating, we must ensure fetchUserProfile was called with the impersonated ID.
      const effectiveProfile = (adminViewMode ? dataProfile : (authProfile || dataProfile));

      useEffect(() => {
        if (activeUserId && !loadingData && initialDataLoaded) {
          // Fetch data for the active user (logged in or impersonated)
          // We check if the currently loaded profile ID matches the target ID to avoid loops/redundant fetches
          if (dataProfile?.id !== activeUserId) {
             fetchUserProfile(activeUserId);
             fetchUserPlan(activeUserId);
          }
        }
      }, [activeUserId, loadingData, initialDataLoaded, dataProfile, fetchUserPlan, fetchUserProfile]);


      useEffect(() => {
        if (!loadingData && initialDataLoaded) {
          if (!user) { 
            navigate('/welcome');
          } else if (user && (!effectiveProfile || effectiveProfile.isTemporary || !effectiveProfile.fullname || effectiveProfile.fullname === 'Not Set' || !effectiveProfile.serviceaddress || effectiveProfile.serviceaddress === 'Not Set') && effectiveProfile?.role !== 'worker') {
            // Don't redirect if impersonating, we want to see the state as is
            if (!adminViewMode) {
                navigate('/profile-setup', { state: { from: '/dashboard' }});
            }
          }
        }
      }, [user, loadingData, initialDataLoaded, effectiveProfile, navigate, adminViewMode]);

      const handleLogout = async () => {
        await logout();
        navigate('/welcome');
      };
      
      if (loadingData && !initialDataLoaded) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--background))] p-4">
            <Loader2 className="h-16 w-16 text-[hsl(var(--primary))] animate-spin" />
            <p className="ml-4 text-xl text-[hsl(var(--foreground))]">Loading your dashboard...</p>
          </div>
        );
      }


      return (
        <div className="min-h-screen bg-[hsl(var(--background))] p-4 sm:p-6 md:p-8">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <header className="mb-8 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--brand-deep-red))] to-[hsl(var(--brand-accent-red))] mb-2">
                {adminViewMode ? (
                    <>Viewing as: {viewedUser.userName}</>
                ) : (
                    <>Welcome, {effectiveProfile?.fullname || effectiveProfile?.full_name || user?.email?.split('@')[0] || 'Valued Customer'}!</>
                )}
              </h1>
              <p className="text-lg text-[hsl(var(--muted-foreground))]">Manage your trash concierge service with ease.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardProfileCard profile={effectiveProfile} user={viewedUser} index={0} />
              <DashboardPlanCard 
                plan={plan} 
                loadingData={loadingData} 
                initialDataLoaded={initialDataLoaded}
                redirectToCustomerPortal={redirectToCustomerPortal} 
                isSubscriptionProcessing={isSubscriptionProcessing}
                navigate={navigate}
                index={1}
              />
              <DashboardScheduleCard profile={effectiveProfile} index={2} />
            </div>
             <motion.div 
                custom={3} 
                initial="hidden" 
                animate="visible" 
                variants={cardVariants} 
                className="mt-8 text-center"
            >
                {!adminViewMode && (
                    <Button 
                        onClick={handleLogout} 
                        variant="destructive" 
                        className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.9] text-[hsl(var(--destructive-foreground))] py-3 px-6 text-lg"
                    >
                        <LogOut className="mr-2 h-5 w-5" /> Log Out
                    </Button>
                )}
            </motion.div>
          </motion.div>
        </div>
      );
    };

    export default CustomerDashboard;