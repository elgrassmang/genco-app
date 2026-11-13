import React, { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { motion, AnimatePresence } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { useAuth } from '@/contexts/AuthContext';
    import { useToast } from "@/components/ui/use-toast";
    import { Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
    import { useTheme } from '@/contexts/ThemeContext';

    const LOGO_URL = "https://storage.googleapis.com/hostinger-horizons-assets-prod/6771a81f-bd0f-4d27-ba89-72f47e1d63bc/65f88e0b61f5b39c1a448ceaecb453da.png";

    const WelcomeScreen = () => {
      const [authMode, setAuthMode] = useState('login');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [showConfirmPassword, setShowConfirmPassword] = useState(false);
      const [isLoading, setIsLoading] = useState(false);

      const { login, signup, user, loadingAuth } = useAuth();
      const { theme } = useTheme();
      const navigate = useNavigate();
      const { toast } = useToast();

      useEffect(() => {
        if (!loadingAuth && user) {
          navigate('/'); 
        }
      }, [user, loadingAuth, navigate]);

      const togglePasswordVisibility = () => setShowPassword(!showPassword);
      const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

      const commonInputClasses = "bg-[hsl(var(--brand-cream))]/10 border-2 border-[hsl(var(--brand-cream))]/20 placeholder-gray-400 text-[hsl(var(--brand-cream))] focus:border-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] transition-all duration-300 ease-in-out";
      const commonLabelClasses = "text-[hsl(var(--brand-cream))]/80 text-sm font-medium";
      const commonIconClasses = "text-gray-400 group-focus-within:text-[hsl(var(--primary))] transition-colors duration-300";

      const motionVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } }
      };

      const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const { error: loginError, user: loggedInUser } = await login(email, password);
        setIsLoading(false);
        if (loggedInUser) {
          navigate('/');
        } else if (loginError) {
          if (loginError.specificType === 'invalid_credentials') {
            setTimeout(() => setAuthMode('signup'), 2000);
          }
        }
      };

      const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
          toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
          return;
        }
        if (password.length < 6) {
          toast({ title: "Password Too Short", description: "Password must be at least 6 characters long.", variant: "destructive" });
          return;
        }
        setIsLoading(true);
        const { error: signupError, user: signedUpUser, session } = await signup(email, password);
        setIsLoading(false);
        if (signedUpUser || session) { 
            if (signedUpUser?.id) {
                 navigate('/profile-setup');
            } else {
                toast({ title: "Confirmation Email Sent", description: "Please check your email to confirm your account.", duration: 10000});
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setAuthMode('login');
            }
        } else if (signupError) {
          if (signupError.specificType === 'user_already_registered') {
             setTimeout(() => setAuthMode('login'), 2000);
          }
        }
      };

      const renderFormFields = () => {
        const fields = (
          <>
            <motion.div key="email" variants={motionVariants} className="space-y-2 group">
              <Label htmlFor="email" className={commonLabelClasses}>Email Address</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${commonIconClasses}`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`pl-10 ${commonInputClasses}`}
                  aria-label="Email Address"
                />
              </div>
            </motion.div>

            <motion.div key="password" variants={motionVariants} className="space-y-2 group">
              <Label htmlFor="password" className={commonLabelClasses}>Password</Label>
              <div className="relative">
                <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${commonIconClasses}`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`pl-10 ${commonInputClasses}`}
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[hsl(var(--primary))] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </motion.div>

            {authMode === 'signup' && (
              <motion.div key="confirmPassword" variants={motionVariants} className="space-y-2 group">
                <Label htmlFor="confirmPassword" className={commonLabelClasses}>Confirm Password</Label>
                <div className="relative">
                  <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${commonIconClasses}`} />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`pl-10 ${commonInputClasses}`}
                    aria-label="Confirm Password"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[hsl(var(--primary))] transition-colors"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        );
        return fields;
      };


      if (loadingAuth && !user) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[hsl(var(--primary))]"></div>
          </div>
        );
      }


      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-[hsl(var(--brand-cream))]">
          <motion.main 
            key={authMode + theme}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
            className="w-full max-w-md bg-[hsl(var(--brand-dark))]/50 backdrop-blur-lg shadow-2xl rounded-xl p-8 space-y-8 border border-[hsl(var(--brand-cream))]/10"
          >
            <div className="text-center space-y-3">
             <img src={LOGO_URL} alt="Just Bin-ness Logo" className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg border-2 border-[hsl(var(--brand-accent-red))]" />
              <motion.h1 
                className="text-4xl font-bold tracking-tight text-[hsl(var(--brand-cream))]"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.1, duration: 0.5 } }}
              >
                Just Bin-ness
              </motion.h1>
              <motion.p 
                className="text-[hsl(var(--brand-cream))]/80 text-lg"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.2, duration: 0.5 } }}
              >
                {authMode === 'login' ? 'Sign in to your Genco Account.' : 'Create a new Genco Account.'}
              </motion.p>
            </div>

            <form onSubmit={authMode === 'login' ? handleLoginSubmit : handleSignupSubmit} className="space-y-6">
              <AnimatePresence mode="popLayout">
                {renderFormFields()}
              </AnimatePresence>

              <motion.div
                key="submitButton"
                initial={{ opacity:0, y:10 }}
                animate={{ opacity:1, y:0, transition: { delay: authMode === 'signup' ? 0.3 : 0.2 } }}
              >
                <Button
                  type="submit"
                  className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--brand-accent-red))] text-[hsl(var(--primary-foreground))] font-semibold py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-opacity-75"
                  disabled={isLoading}
                  aria-live="polite"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[hsl(var(--primary-foreground))] mr-3"></div>
                      Processing...
                    </div>
                  ) : (authMode === 'login' ? 'Log In' : 'Sign Up')}
                </Button>
              </motion.div>
            </form>

            <motion.div 
              className="text-center"
              initial={{ opacity:0 }}
              animate={{ opacity:1, transition: { delay: authMode === 'signup' ? 0.4 : 0.3 } }}
            >
              <Button
                variant="link"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-[hsl(var(--brand-cream))]/70 hover:text-[hsl(var(--brand-cream))] font-medium transition-colors duration-300 text-sm"
              >
                {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
              </Button>
            </motion.div>
          </motion.main>
           <footer className="mt-8 text-center text-xs text-[hsl(var(--brand-cream))]/60">
             &copy; {new Date().getFullYear()} Genco Pura Olive Oil Company. All Rights Reserved.
           </footer>
        </div>
      );
    };

    export default WelcomeScreen;