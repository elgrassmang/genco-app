import React from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { motion } from 'framer-motion';
    import { CheckCircle } from 'lucide-react';

    const SignupSuccessPage = () => {
      const navigate = useNavigate();

      return (
        <motion.div
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[hsl(var(--brand-deep-red))] to-[hsl(var(--brand-dark))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md shadow-2xl bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
            <CardHeader className="text-center items-center flex flex-col">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <CardTitle className="text-3xl font-bold">Account Created!</CardTitle>
              <CardDescription className="text-md text-[hsl(var(--muted-foreground))] pt-2">
                Thank you for signing up with Just Bin-ness!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-[hsl(var(--foreground))]">
                To complete your account setup and access your dashboard, please log in with your new credentials.
              </p>
              <Button 
                onClick={() => navigate('/welcome')} 
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]"
              >
                Proceed to Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    export default SignupSuccessPage;