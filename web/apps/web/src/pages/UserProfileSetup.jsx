import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { UserCircle, Save, Home, ArrowRight, Loader2 } from 'lucide-react';
import { parseLegacyAddress } from '@/utils/geocoding';

const UserProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile: authContextProfile, updateUserContextProfile } = useAuth();
  const { 
    profile: dataContextProfile, 
    plan: currentPlan, 
    saveProfile: saveDataProfile, 
    loadingData, 
    fetchUserProfile: fetchDataProfile, 
    initialDataLoaded,
    setProfile: setDataContextProfileState
  } = useData();
  const { toast } = useToast();
  
  const existingProfile = authContextProfile || dataContextProfile;

  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    street_address: '',
    city: '',
    state: 'FL',
    zip_code: '',
    pickupday: '',
    isgated: false,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !existingProfile && initialDataLoaded) {
      fetchDataProfile(user.id);
    }
    if (existingProfile) {
      // Logic to handle legacy address vs new fields
      let street = existingProfile.street_address || '';
      let city = existingProfile.city || '';
      let state = existingProfile.state || 'FL';
      let zip = existingProfile.zip_code || '';

      // If new fields are missing but legacy exists, try to parse
      if ((!street || !city || !zip) && existingProfile.serviceaddress && existingProfile.serviceaddress !== 'Not Set') {
         const parsed = parseLegacyAddress(existingProfile.serviceaddress);
         if (parsed) {
           street = parsed.street_address || street;
           city = parsed.city || city;
           state = parsed.state || state;
           zip = parsed.zip_code || zip;
         }
      }

      setFormData({
        fullname: existingProfile.fullname && existingProfile.fullname !== 'Not Set' ? existingProfile.fullname : '',
        phone: existingProfile.phone || '',
        street_address: street,
        city: city,
        state: state,
        zip_code: zip,
        pickupday: existingProfile.pickupday || '',
        isgated: existingProfile.isgated || false,
        notes: existingProfile.notes || ''
      });
    }
  }, [user, existingProfile, initialDataLoaded, fetchDataProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save your profile.", variant: "destructive" });
      return;
    }

    // Validation
    const requiredFields = ['fullname', 'street_address', 'city', 'state', 'zip_code', 'pickupday'];
    const missing = requiredFields.filter(field => !formData[field]);

    if (missing.length > 0) {
      toast({ title: "Missing Information", description: "Please fill in all address fields and pickup day.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    // Construct data, including legacy serviceaddress for safety
    const fullServiceAddress = `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
    
    const profileDataToSave = { 
      ...formData, 
      serviceaddress: fullServiceAddress, // Maintain backward compatibility
      email: user.email, 
      id: user.uid 
    };
    
    const savedProfileData = await saveDataProfile(profileDataToSave);
    setIsSubmitting(false);

    if (savedProfileData) {
      updateUserContextProfile(savedProfileData); 
      setDataContextProfileState(savedProfileData);
      toast({ title: 'Profile Saved', description: 'Your profile has been successfully updated.' });
      
      const from = location.state?.from;
      if (from && from !== '/profile-setup') {
        navigate(from, { replace: true });
      } else if (currentPlan && currentPlan.status === 'active') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/plan-selection', { replace: true });
      }
    } else {
      toast({ title: 'Error Saving Profile', description: 'Could not save your profile. Please try again.', variant: 'destructive'});
    }
  };
  
  if (loadingData && !initialDataLoaded && !existingProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 text-[hsl(var(--primary))] animate-spin" />
      </div>
    );
  }

  const isProfileEffectivelyEmpty = !existingProfile || existingProfile.isTemporary || existingProfile.fullname === 'Not Set';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl shadow-xl bg-[hsl(var(--card))] border-[hsl(var(--border))] glassmorphism">
        <CardHeader className="text-center">
          <UserCircle className="mx-auto h-16 w-16 text-[hsl(var(--primary))] mb-3" />
          <CardTitle className="text-3xl font-bold text-[hsl(var(--foreground))]">
            {isProfileEffectivelyEmpty ? 'Complete Your Profile' : 'Update Your Profile'}
          </CardTitle>
          <CardDescription className="text-md text-[hsl(var(--muted-foreground))]">
            Please provide your details to set up your trash concierge service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullname">Full Name</Label>
                <Input id="fullname" name="fullname" value={formData.fullname} onChange={handleChange} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" />
              </div>
            </div>

            {/* Address Group */}
            <div className="space-y-3 pt-2 p-4 bg-secondary/20 rounded-lg border border-border/50">
               <Label className="text-base font-semibold">Service Address</Label>
               <div className="space-y-3">
                 <div>
                   <Label htmlFor="street_address" className="text-xs text-muted-foreground">Street Address</Label>
                   <Input 
                      id="street_address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleChange}
                      placeholder="123 Main St"
                      required
                   />
                 </div>
                 <div className="flex gap-4 flex-col md:flex-row">
                    <div className="flex-[2]">
                       <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                       <Input 
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Key West"
                          required
                       />
                    </div>
                    <div className="flex-[1]">
                       <Label htmlFor="state" className="text-xs text-muted-foreground">State</Label>
                       <Input 
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="FL"
                          maxLength={2}
                          required
                       />
                    </div>
                    <div className="flex-[1.5]">
                       <Label htmlFor="zip_code" className="text-xs text-muted-foreground">Zip Code</Label>
                       <Input 
                          id="zip_code"
                          name="zip_code"
                          value={formData.zip_code}
                          onChange={handleChange}
                          placeholder="33040"
                          required
                       />
                    </div>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pickupday">Preferred Pickup Day</Label>
                <Select name="pickupday" value={formData.pickupday} onValueChange={(value) => handleSelectChange('pickupday', value)} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                      <SelectItem key={day} value={day.toLowerCase()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-3 pt-8">
                <Checkbox id="isgated" name="isgated" checked={formData.isgated} onCheckedChange={(checked) => handleSelectChange('isgated', checked)} />
                <Label htmlFor="isgated" className="font-medium">Is your community gated?</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="e.g., Gate code is #1234, bins are behind the side fence..." />
            </div>
            
            <CardFooter className="flex justify-end p-0 pt-6">
              <Button type="submit" className="text-lg px-8 py-3" disabled={isSubmitting || (loadingData && !initialDataLoaded && !existingProfile)}>
                {isSubmitting || (loadingData && !initialDataLoaded && !existingProfile) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isProfileEffectivelyEmpty ? 'Save & Continue' : 'Update Profile'}
                {!(isSubmitting || (loadingData && !initialDataLoaded && !existingProfile)) && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserProfileSetup;