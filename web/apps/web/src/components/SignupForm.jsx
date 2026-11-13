import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import emailjs from 'emailjs-com';

// Security Utilities
import { executeRecaptcha } from '@/utils/recaptcha';
import { getClientIP } from '@/utils/ipDetection';
import { checkRateLimit, incrementAttempt } from '@/utils/rateLimiting';
import { logSecurityEvent } from '@/utils/securityLogging';

const VALID_ZIPS = ['33040', '33041', '33045'];

// Fallback keys if env vars are missing
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_placeholder';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_placeholder';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'public_key_placeholder';

export default function SignupForm() {
  const { signup } = useAuth();
  const { toast } = useToast();
  
  // Basic Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Security State
  const [honeypot, setHoneypot] = useState(''); // Hidden field for bots
  const [clientIP, setClientIP] = useState(null);
  
  // Address State
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: 'FL',
    zip: ''
  });

  // Validation State
  const [zipError, setZipError] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(''); // 'validating', 'recaptcha', 'creating', 'notifying'

  // Load IP on mount
  useEffect(() => {
    const fetchIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    fetchIP();
  }, []);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    
    // Clear zip error when user starts typing
    if (name === 'zip') {
      setZipError('');
    }
    
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const validateZipCode = (value) => {
    const cleanZip = value?.trim();
    if (!cleanZip) return false;
    
    if (!VALID_ZIPS.includes(cleanZip)) {
      setZipError("Sorry, Genco Can Co. does not service your area yet.");
      return false;
    }
    return true;
  };

  const handleZipBlur = () => {
    if (address.zip) {
      validateZipCode(address.zip);
    }
  };

  const validatePasswordStrength = (pwd) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*]/.test(pwd)) return "Password must contain at least one special character (!@#$%^&*).";
    return null;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const sendNewCustomerNotification = async (userData, retryCount = 0) => {
    try {
      const templateParams = {
        to_name: 'Nick',
        to_email: 'nick@gencocans.com',
        customer_email: userData.email,
        customer_address: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
        signup_time: new Date().toLocaleString(),
        admin_link: `${window.location.origin}/admin/customers`, // General list link
        customer_profile_link: `${window.location.origin}/admin/customers?id=${userData.uid}` // Specific link if supported
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      
      console.log('Email notification sent successfully');
      return true;
    } catch (err) {
      console.error(`Email sending failed (Attempt ${retryCount + 1}):`, err);
      
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Exponential-ish backoff
        return sendNewCustomerNotification(userData, retryCount + 1);
      }
      
      // If all retries fail, return false but don't throw to allow signup completion
      return false;
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    
    // 1. Honeypot Check (Instant Reject)
    if (honeypot) {
      console.warn("Bot detected via honeypot");
      await logSecurityEvent('honeypot_triggered', { ip: clientIP, email });
      setMsg("Please check your email to verify your account.");
      return;
    }

    // 2. Client-Side Input Validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }
    
    if (!address.street || !address.city || !address.state || !address.zip) {
      setError("Please fill in all address fields.");
      return;
    }

    // Zip Code Validation (Strict Check)
    if (!validateZipCode(address.zip)) {
      // Error is set inside validateZipCode
      return;
    }

    setLoading(true);
    setLoadingStage('checking_security');

    try {
      // 3. Rate Limit Check
      const rateLimitStatus = await checkRateLimit(clientIP);
      if (!rateLimitStatus.allowed) {
        await logSecurityEvent('rate_limit_blocked', { ip: clientIP, email });
        throw new Error(`Too many signup attempts. Please try again in ${rateLimitStatus.remainingTime} minutes.`);
      }

      // 4. reCAPTCHA Execution
      setLoadingStage('verifying_human');
      let recaptchaToken;
      try {
        recaptchaToken = await executeRecaptcha('signup');
        if (!recaptchaToken) throw new Error("Verification failed");
      } catch (recaptchaErr) {
        console.error("Recaptcha error:", recaptchaErr);
        await logSecurityEvent('recaptcha_failure', { ip: clientIP, error: recaptchaErr.message });
      }

      // 5. Account Creation
      setLoadingStage('creating_account');
      
      const additionalData = {
        street_address: address.street,
        city: address.city,
        state: address.state,
        zip_code: address.zip,
        serviceaddress: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
        securityMeta: {
          signupIP: clientIP,
          recaptchaScore: 'unchecked_client_side', 
          signupTimestamp: new Date().toISOString()
        }
      };

      const result = await signup(email, password, additionalData);
      
      if (result.error) {
        await incrementAttempt(clientIP, email);
        throw new Error(result.error.message || "Signup failed");
      }

      // 6. Send Email Notification
      setLoadingStage('notifying');
      const emailSent = await sendNewCustomerNotification(result.user);
      
      if (!emailSent) {
        toast({
          title: "Notification Warning",
          description: "Signup successful, but admin notification email failed to send.",
          variant: "warning"
        });
      }

      // 7. Success Logging
      await logSecurityEvent('signup_success', { ip: clientIP, email });

      setMsg(`Success! Welcome ${result.user.email}. Please check your email to verify your account.`);
      
      // Clear sensitive data
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAddress({ street: '', city: '', state: 'FL', zip: '' });
      setClientIP(null);
      setZipError('');

    } catch (error) {
      console.error("Signup failed:", error.message);
      setError(error.message);
      await logSecurityEvent('signup_error', { ip: clientIP, email, error: error.message });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const getLoadingText = () => {
    switch(loadingStage) {
      case 'checking_security': return 'Checking security...';
      case 'verifying_human': return 'Verifying...';
      case 'creating_account': return 'Creating account...';
      case 'notifying': return 'Sending notifications...';
      default: return 'Processing...';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md mx-auto shadow-xl bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Create your Account</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Join us by filling out the form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {msg && (
            <Alert variant="default" className="mb-4 bg-green-50 border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{msg}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Honeypot Field */}
            <div className="hidden opacity-0 w-0 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website-field">Website</label>
              <input
                id="website-field"
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex="-1"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-signup">Email</Label>
              <Input 
                id="email-signup"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@example.com" 
                required 
                disabled={loading}
              />
            </div>
            
            {/* Address Group */}
            <div className="space-y-3 pt-2">
               <Label className="text-base font-semibold text-primary">Service Address</Label>
               <div className="space-y-2">
                 <div>
                   <Label htmlFor="street-signup" className="text-xs text-muted-foreground">Street Address</Label>
                   <Input 
                      id="street-signup"
                      name="street"
                      value={address.street}
                      onChange={handleAddressChange}
                      placeholder="123 Main St"
                      required
                      disabled={loading}
                   />
                 </div>
                 <div className="flex gap-2">
                    <div className="flex-[2]">
                       <Label htmlFor="city-signup" className="text-xs text-muted-foreground">City</Label>
                       <Input 
                          id="city-signup"
                          name="city"
                          value={address.city}
                          onChange={handleAddressChange}
                          placeholder="Key West"
                          required
                          disabled={loading}
                       />
                    </div>
                    <div className="flex-[1]">
                       <Label htmlFor="state-signup" className="text-xs text-muted-foreground">State</Label>
                       <Input 
                          id="state-signup"
                          name="state"
                          value={address.state}
                          onChange={handleAddressChange}
                          placeholder="FL"
                          maxLength={2}
                          required
                          disabled={loading}
                       />
                    </div>
                    <div className="flex-[1.5]">
                       <Label htmlFor="zip-signup" className="text-xs text-muted-foreground flex items-center justify-between">
                         Zip Code
                       </Label>
                       <Input 
                          id="zip-signup"
                          name="zip"
                          value={address.zip}
                          onChange={handleAddressChange}
                          onBlur={handleZipBlur}
                          placeholder="33040"
                          required
                          disabled={loading}
                          className={`${zipError ? 'border-red-500 ring-red-200' : ''}`}
                       />
                    </div>
                 </div>
                 {/* Zip Validation Message */}
                 <div className="text-[11px] leading-tight">
                    {zipError ? (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {zipError}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        We currently service: {VALID_ZIPS.join(', ')}
                      </span>
                    )}
                    {zipError && (
                      <div className="text-muted-foreground mt-1">
                        We currently service: {VALID_ZIPS.join(', ')}
                      </div>
                    )}
                 </div>
               </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="password-signup">Password</Label>
              <Input 
                id="password-signup"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                disabled={loading}
              />
              <p className="text-[10px] text-muted-foreground">
                Min 8 chars, 1 uppercase, 1 number, 1 special char.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password-signup">Confirm Password</Label>
              <Input 
                id="confirm-password-signup"
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-4" 
              disabled={loading || !!zipError || (address.zip && !VALID_ZIPS.includes(address.zip))}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getLoadingText()}
                </>
              ) : 'Sign Up'}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4 leading-tight">
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="https://policies.google.com/privacy" className="underline hover:text-primary">Privacy Policy</a> and{' '}
              <a href="https://policies.google.com/terms" className="underline hover:text-primary">Terms of Service</a> apply.
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}