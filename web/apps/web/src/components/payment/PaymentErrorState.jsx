import React from 'react';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { AlertTriangle, RefreshCw } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';

    const PaymentErrorState = ({ errorMessage, onRetry, selectedPlanDetails }) => {
      const navigate = useNavigate();
      const canRetry = typeof onRetry === 'function' && selectedPlanDetails && selectedPlanDetails.stripePriceIdFromConfig && !selectedPlanDetails.stripePriceIdFromConfig.includes('YOUR_');

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-500 via-pink-500 to-rose-600"
        >
          <Card className="w-full max-w-lg shadow-2xl bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] glassmorphism">
            <CardHeader className="text-center">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">Payment Error</CardTitle>
              <CardDescription className="text-md text-[hsl(var(--muted-foreground))]">
                We encountered an issue processing your payment or subscription setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg text-[hsl(var(--foreground))]">
                {errorMessage || "An unexpected error occurred."}
              </p>
              {selectedPlanDetails && (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Attempting to subscribe to: <span className="font-semibold">{selectedPlanDetails.name}</span>
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              {canRetry && (
                <Button
                  onClick={onRetry}
                  className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/plan-selection')}
                className="w-full sm:w-auto border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              >
                Change Plan
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Back to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      );
    };

    export default PaymentErrorState;