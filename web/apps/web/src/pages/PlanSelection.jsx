import React, { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { CheckCircle, Star, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
    import { useAuth } from '@/contexts/AuthContext';
    import { useData } from '@/contexts/DataContext';
    import { useToast } from '@/components/ui/use-toast';
    import { motion } from 'framer-motion';
    import { getPlans as getAppPlans, getStripePriceId, getPlanById } from '@/config/plans';

    const PlanSelection = () => {
      const navigate = useNavigate();
      const { user } = useAuth();
      const { profile, plan: currentPlanDetails, savePlan, loadingData, initialDataLoaded } = useData();
      const { toast } = useToast();
      const [selectedPlanId, setSelectedPlanId] = useState(null);
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [plansToDisplay, setPlansToDisplay] = useState([]);

      useEffect(() => {
        setPlansToDisplay(getAppPlans());
      }, []);

      useEffect(() => {
        if (currentPlanDetails?.plan_id) {
          setSelectedPlanId(currentPlanDetails.plan_id);
        } else {
          setSelectedPlanId(null); 
        }
      }, [currentPlanDetails]);

      const handleSelectPlan = async (planToSelect) => {
        console.log("[PlanSelection] handleSelectPlan initiated for:", planToSelect.name, "ID:", planToSelect.id);
        setIsSubmitting(true); 
        setSelectedPlanId(planToSelect.id);

        if (!user) {
          toast({ title: "Authentication Error", description: "You must be logged in to select a plan.", variant: "destructive" });
          console.error("[PlanSelection] User not authenticated.");
          setIsSubmitting(false);
          return;
        }
        
        const fullPlanDetailsFromConfig = getPlanById(planToSelect.id);
        if (!fullPlanDetailsFromConfig) {
            toast({ title: "Error", description: "Selected plan details not found in configuration.", variant: "destructive" });
            console.error(`[PlanSelection] Plan details for ID ${planToSelect.id} not found in config/plans.js.`);
            setIsSubmitting(false);
            return;
        }
        console.log("[PlanSelection] Full plan details from config:", fullPlanDetailsFromConfig);

        const stripePriceIdForEnv = getStripePriceId(planToSelect.id); 
        console.log("[PlanSelection] Stripe Price ID for environment:", stripePriceIdForEnv);

        if (!stripePriceIdForEnv || stripePriceIdForEnv.includes('YOUR_')) {
            const envMode = import.meta.env.MODE;
            toast({
                title: "Configuration Incomplete",
                description: `The Stripe Price ID for ${planToSelect.name} is a placeholder or missing for the current environment (${envMode}). Please ensure it is correctly set in the plans configuration.`,
                variant: "destructive",
                duration: 10000 
            });
            console.error(`[PlanSelection] Stripe Price ID for plan ${planToSelect.id} (${planToSelect.name}) is not configured for ${envMode} mode. Attempted to use: ${stripePriceIdForEnv}. Check src/config/plans.js.`);
            setIsSubmitting(false);
            return; 
        }

        const planDataToSave = {
          id: fullPlanDetailsFromConfig.id, 
          name: fullPlanDetailsFromConfig.name,
          price: fullPlanDetailsFromConfig.price,
          stripePriceId: fullPlanDetailsFromConfig.stripePriceId, 
          stripeTestPriceId: fullPlanDetailsFromConfig.stripeTestPriceId,
          status: 'selected' 
        };
        
        console.log("[PlanSelection] Attempting to save plan data:", planDataToSave);
        const savedPlan = await savePlan(planDataToSave); 
        
        if (savedPlan) {
          console.log("[PlanSelection] Plan saved successfully:", savedPlan);
          toast({ title: "Plan Selected", description: `You've selected the ${planToSelect.name}. Proceed to payment if required.` });
          
          const isProfileComplete = profile && profile.fullname && profile.fullname !== 'Not Set' && profile.serviceaddress && profile.serviceaddress !== 'Not Set';
          console.log("[PlanSelection] Profile complete status:", isProfileComplete, "Profile:", profile);
          if (!isProfileComplete) {
            console.log("[PlanSelection] Navigating to /profile-setup with state from: /payment");
            navigate('/profile-setup', { state: { from: '/payment', selectedPlanId: planToSelect.id } });
          } else {
            console.log("[PlanSelection] Navigating to /payment");
            navigate('/payment');
          }
        } else {
          console.error("[PlanSelection] Failed to save plan selection. savePlan returned:", savedPlan);
          toast({ title: "Error Saving Plan", description: "Could not save your plan selection. Please check console for errors and try again.", variant: "destructive" });
        }
        setIsSubmitting(false);
      };
      
      if (loadingData && !initialDataLoaded) {
        return (
          <div className="flex items-center justify-center min-h-screen p-4">
            <Loader2 className="h-12 w-12 text-[hsl(var(--primary))] animate-spin" />
            <p className="ml-3 text-lg text-[hsl(var(--foreground))]">Loading plans...</p>
          </div>
        );
      }
      
      const handleBackToDashboard = () => {
        console.log("[PlanSelection] Navigating to /dashboard");
        navigate('/dashboard');
      }

      return (
        <motion.div 
          className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--brand-deep-red))] to-[hsl(var(--brand-accent-red))] mb-3">
              Choose Your Plan
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              {currentPlanDetails && currentPlanDetails.status !== 'cancelled' ? `You are currently on the ${currentPlanDetails.name} plan.` : "Select the perfect trash concierge service for your needs."}
            </p>
             {currentPlanDetails && currentPlanDetails.status === 'cancelled' && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md flex items-center justify-center max-w-md mx-auto dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Your previous subscription was cancelled. Select a new plan to reactivate service.
                </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 w-full max-w-7xl">
            {plansToDisplay.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1, ease: "easeOut" }}
                className="w-full"
              >
                <Card className={`relative flex flex-col h-full shadow-xl transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[hsl(var(--primary))/0.5]
                  ${plan.id === selectedPlanId && currentPlanDetails?.status !== 'cancelled' ? 'border-2 border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]'} 
                  bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] rounded-xl overflow-hidden glassmorphism group`}>
                  
                  {plan.popular && (
                     <div className="absolute top-0 right-0 overflow-hidden w-24 h-24 md:w-28 md:h-28 z-10">
                      <div className="absolute transform rotate-45 bg-[hsl(var(--primary))] text-center text-[hsl(var(--primary-foreground))] font-semibold py-1 right-[-30px] top-[18px] md:right-[-25px] md:top-[22px] w-[140px] shadow-md text-xs">
                        <Star className="h-3 w-3 inline-block mr-0.5 -mt-0.5" />
                        POPULAR
                      </div>
                    </div>
                  )}

                  <CardHeader className="text-center pt-8 pb-2 px-5">
                    <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">{plan.name}</CardTitle>
                    <CardDescription className="text-3xl md:text-4xl font-extrabold text-[hsl(var(--primary))] py-1 group-hover:text-[hsl(var(--primary))/0.8] transition-colors">
                      {plan.price}
                    </CardDescription>
                     <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                       {plan.billing_clarifier ? plan.billing_clarifier : 'All plans billed monthly'}
                     </p>
                  </CardHeader>
                  <CardContent className="flex-grow px-6 pb-5 pt-2">
                    <ul className="space-y-2.5 md:space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm md:text-base">
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-2.5 mt-0.5 shrink-0" />
                          <span className="text-[hsl(var(--muted-foreground))]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="px-6 pb-6 pt-4 mt-auto">
                    <Button 
                      onClick={() => handleSelectPlan(plan)} 
                      disabled={isSubmitting || (plan.id === selectedPlanId && currentPlanDetails?.status === 'active')}
                      className={`w-full text-base md:text-lg py-3 font-semibold rounded-lg transition-all duration-300 transform group-hover:scale-105
                        ${plan.id === selectedPlanId && currentPlanDetails?.status === 'active' ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' : 
                         plan.popular ? 'bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]' : 
                         'bg-transparent border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))]'}
                      `}
                    >
                      {isSubmitting && selectedPlanId === plan.id ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      {plan.id === selectedPlanId && currentPlanDetails?.status === 'active' ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5}}
           >
             <Button variant="outline" onClick={handleBackToDashboard} className="mt-10 md:mt-14 text-base border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
           </motion.div>
        </motion.div>
      );
    };

    export default PlanSelection;