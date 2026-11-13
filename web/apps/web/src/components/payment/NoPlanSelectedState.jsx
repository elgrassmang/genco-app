import React from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { AlertTriangle } from 'lucide-react';
    import { motion } from 'framer-motion';

    const NoPlanSelectedState = () => {
      const navigate = useNavigate();
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-md shadow-xl bg-[hsl(var(--card))] border-[hsl(var(--border))] glassmorphism">
            <CardHeader className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-3" />
              <CardTitle className="text-2xl font-bold text-[hsl(var(--foreground))]">No Plan Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-[hsl(var(--muted-foreground))]">
                It seems no plan is currently selected for payment. Please select a plan first.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button onClick={() => navigate('/plan-selection')} className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
                Select a Plan
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full border-[hsl(var(--border))]">
                Back to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      );
    };

    export default NoPlanSelectedState;