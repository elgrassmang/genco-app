import React from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { CheckCircle } from 'lucide-react';
    import { motion } from 'framer-motion';

    const PlanAlreadyActiveState = ({ planName }) => {
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
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <CardTitle className="text-2xl font-bold text-[hsl(var(--foreground))]">Plan Already Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-[hsl(var(--muted-foreground))]">
                Your <strong className="text-[hsl(var(--foreground))]">{planName}</strong> plan is already active.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/dashboard')} className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      );
    };

    export default PlanAlreadyActiveState;