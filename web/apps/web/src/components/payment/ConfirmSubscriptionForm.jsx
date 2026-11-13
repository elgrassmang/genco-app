import React from 'react';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { CreditCard, Loader2, AlertTriangle } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';

    const ConfirmSubscriptionForm = ({
      selectedPlanDetails,
      profile,
      isLoading,
      isStripeLoading,
      isProceedDisabled,
      effectiveStripePriceId,
      onProceedToStripe,
      onNavigate
    }) => {
      const VITE_STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      const isStripeKeyPlaceholder = !VITE_STRIPE_PUBLISHABLE_KEY || VITE_STRIPE_PUBLISHABLE_KEY.includes('YOUR_');
      const isPriceIdPlaceholder = effectiveStripePriceId && (effectiveStripePriceId.startsWith('price_live_YOUR_') || effectiveStripePriceId.startsWith('price_test_YOUR_'));

      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl bg-[hsl(var(--card))] border-[hsl(var(--border))] glassmorphism">
            <CardHeader className="text-center">
              <CreditCard className="mx-auto h-12 w-12 text-[hsl(var(--primary))] mb-3" />
              <CardTitle className="text-2xl font-bold text-[hsl(var(--foreground))]">Confirm Your Subscription</CardTitle>
              <CardDescription className="text-md text-[hsl(var(--muted-foreground))]">
                You are about to subscribe to the <strong className="text-[hsl(var(--foreground))]">{selectedPlanDetails.name}</strong> plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))]">
                <span className="text-lg font-medium text-[hsl(var(--foreground))]">{selectedPlanDetails.name}</span>
                <span className="text-xl font-semibold text-[hsl(var(--primary))]">{selectedPlanDetails.price}</span>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                You will be redirected to Stripe to complete your payment securely.
                Your service will activate upon successful payment.
              </p>
              {profile && (!profile.fullname || !profile.serviceaddress) && (
                <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md flex items-center dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span>Your profile is incomplete. Please <Button variant="link" className="p-0 h-auto text-yellow-700 dark:text-yellow-300 underline" onClick={() => onNavigate('/profile-setup')}>complete it</Button> for uninterrupted service.</span>
                </div>
              )}
              {isStripeKeyPlaceholder && (
                 <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-center dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span>Payment system configuration is incomplete. Please contact support.</span>
                </div>
              )}
              {isPriceIdPlaceholder && (
                 <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-center dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span>Plan payment configuration is incomplete for this plan. Please contact support.</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                onClick={onProceedToStripe} 
                disabled={isLoading || isStripeLoading || isProceedDisabled || isStripeKeyPlaceholder || isPriceIdPlaceholder}
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))] text-lg py-3"
              >
                {isLoading || isStripeLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                Proceed to Payment
              </Button>
              <Button variant="outline" onClick={() => onNavigate('/plan-selection')} className="w-full border-[hsl(var(--border))]">
                Change Plan
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      );
    };
    export default ConfirmSubscriptionForm;