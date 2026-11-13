import React, { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { CheckCircle, Star } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useToast } from '@/components/ui/use-toast';
    import { getPlans as getAppPlans, getStripePriceId } from '@/config/plans';

    const LOGO_URL = "https://storage.googleapis.com/hostinger-horizons-assets-prod/6771a81f-bd0f-4d27-ba89-72f47e1d63bc/65f88e0b61f5b39c1a448ceaecb453da.png";

    const InitialPlanSelection = () => {
      const navigate = useNavigate();
      const { toast } = useToast();
      const [plansToDisplay, setPlansToDisplay] = useState([]);

      useEffect(() => {
        setPlansToDisplay(getAppPlans());
      }, []);


      const handleSelectPlan = (plan) => {
        const stripePriceId = getStripePriceId(plan.id);
        if (!stripePriceId || (import.meta.env.MODE === 'production' && (stripePriceId.startsWith('price_live_YOUR_') || stripePriceId.startsWith('price_test_')))) {
            toast({
                title: "Configuration Incomplete",
                description: `The Stripe Price ID for ${plan.name} is not configured for live mode. Please contact support.`,
                variant: "destructive",
                duration: 7000
            });
            console.error(`Stripe Price ID for plan ${plan.id} (${plan.name}) is not configured for ${import.meta.env.MODE} mode.`);
            return; 
        }

        const planToStore = { ...plan, stripePriceId };
        localStorage.setItem('selectedPlanId_initial', plan.id); 
        localStorage.setItem('selectedPlan_initial_details', JSON.stringify(planToStore)); 
        toast({ title: "Plan Selected", description: `You've selected the ${plan.name}. Let's get you signed up!` });
        navigate('/welcome');
      };

      return (
        <motion.div 
          className="w-full py-10 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center justify-center auth-gradient-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
            className="flex flex-col items-center text-center"
          >
            <img src={LOGO_URL} alt="Just Bin-ness Logo" className="h-20 sm:h-24 md:h-28 w-auto mb-4 md:mb-6" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-[hsl(var(--brand-cream))] tracking-tight">
              Welcome to Just Bin-ness!
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-[hsl(var(--brand-cream))/0.85] mb-8 md:mb-12 max-w-2xl">
              Your trash & recycling, handled. First, pick a plan that suits you.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 w-full max-w-7xl plan-card-grid">
            {plansToDisplay.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                className="w-full" 
              >
                <Card className={`relative flex flex-col h-full shadow-2xl transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[hsl(var(--brand-accent-red))/0.6]
                  ${plan.popular ? 'border-2 border-[hsl(var(--brand-accent-red))] bg-[hsl(var(--brand-dark)/0.9)]' : 'bg-[hsl(var(--brand-dark)/0.8)]'} 
                  text-[hsl(var(--brand-cream))] rounded-xl overflow-hidden group`}>
                  
                  {plan.popular && (
                    <div className="absolute top-0 right-0 overflow-hidden w-24 h-24 md:w-28 md:h-28 z-10">
                      <div className="absolute transform rotate-45 bg-[hsl(var(--brand-accent-red))] text-center text-[hsl(var(--brand-cream))] font-semibold py-1 right-[-30px] top-[18px] md:right-[-25px] md:top-[22px] w-[140px] shadow-md text-xs">
                        <Star className="h-3 w-3 inline-block mr-0.5 -mt-0.5" />
                        POPULAR
                      </div>
                    </div>
                  )}

                  <CardHeader className="text-center pt-8 pb-2 px-5">
                    <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-[hsl(var(--brand-cream))]">{plan.name}</CardTitle>
                    <CardDescription className="text-3xl md:text-4xl font-extrabold text-[hsl(var(--brand-cream))] py-1 group-hover:text-[hsl(var(--brand-accent-red))] transition-colors">
                      {plan.price}
                    </CardDescription>
                    <p className="text-xs text-[hsl(var(--brand-cream))/0.7] mt-0.5">
                      {plan.billing_clarifier ? plan.billing_clarifier : 'All plans billed monthly'}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-grow px-6 pb-5 pt-2">
                    <ul className="space-y-2.5 md:space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm md:text-base">
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 mr-2.5 mt-0.5 shrink-0" />
                          <span className="text-[hsl(var(--brand-cream))/0.9]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="px-6 pb-6 pt-4 mt-auto">
                    <Button 
                      onClick={() => handleSelectPlan(plan)} 
                      className={`w-full text-base md:text-lg py-3 font-semibold rounded-lg transition-all duration-300 transform group-hover:scale-105
                        ${plan.popular ? 'bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))] text-[hsl(var(--brand-cream))]' : 'bg-transparent border-2 border-[hsl(var(--brand-accent-red))] text-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))]'} 
                         `}
                    >
                      {plan.name}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5}}
           >
             <Button variant="link" onClick={() => navigate('/welcome')} className="mt-10 md:mt-14 text-sm sm:text-base text-[hsl(var(--brand-cream))/0.75] hover:text-[hsl(var(--brand-cream))] hover:underline">
                Already have an account or want to sign up later? Log In / Create Account
            </Button>
           </motion.div>
        </motion.div>
      );
    };

    export default InitialPlanSelection;