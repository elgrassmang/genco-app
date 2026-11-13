import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Wand2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { parseLegacyAddress } from '@/utils/geocoding';

const EditCustomerModal = ({ open, onOpenChange, customer, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    fullname: '',
    street_address: '',
    city: '',
    state: 'FL',
    zip_code: '',
    pickupday: '',
    role: '',
    serviceaddress: '' // Keep for reference
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      // Pre-populate fields, defaulting to empty strings to avoid uncontrolled inputs
      const street = customer.street_address || '';
      const city = customer.city || '';
      const state = customer.state || 'FL';
      const zip = customer.zip_code || '';

      setFormData({
        fullname: customer.fullname || '',
        street_address: street,
        city: city,
        state: state,
        zip_code: zip,
        // Handle variations in field naming
        pickupday: customer.pickupday || customer.pickup_day || '', 
        role: customer.role || 'customer',
        serviceaddress: customer.serviceaddress || ''
      });
      setErrors({});
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific error on change
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFixLegacy = () => {
      const parsed = parseLegacyAddress(formData.serviceaddress);
      if (parsed) {
          setFormData(prev => ({
              ...prev,
              street_address: parsed.street_address || prev.street_address,
              city: parsed.city || prev.city,
              state: parsed.state || prev.state,
              zip_code: parsed.zip_code || prev.zip_code
          }));
          toast({ title: "Address Parsed", description: "Legacy address parsed into fields. Please verify before saving." });
      } else {
          toast({ title: "Parse Failed", description: "Could not parse address automatically. Please enter manually.", variant: "destructive" });
      }
  };

  const validate = () => {
      const newErrors = {};
      if (!formData.fullname) newErrors.fullname = "Name is required";
      if (!formData.street_address) newErrors.street_address = "Street is required";
      if (!formData.city) newErrors.city = "City is required";
      if (!formData.state) newErrors.state = "State is required";
      if (!formData.zip_code) newErrors.zip_code = "Zip is required";
      if (!formData.pickupday) newErrors.pickupday = "Pickup day is required";
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Admin Verification
    if (!isAdmin) {
        toast({ title: "Permission Denied", description: "You need admin privileges to perform this action.", variant: "destructive" });
        return;
    }

    if (!customer?.id) return;
    
    if (!validate()) {
        toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    try {
      // Use 'users' collection
      const userRef = doc(db, "users", customer.id);
      
      const fullAddress = `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;

      const updateData = {
        fullname: formData.fullname,
        street_address: formData.street_address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        serviceaddress: fullAddress, // Maintain backward compatibility
        pickupday: formData.pickupday,
        role: formData.role,
        updated_at: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);

      toast({
        title: "Success",
        description: "Customer profile updated successfully.",
        variant: "default",
      });

      if (onSuccess) {
          onSuccess({ ...customer, ...updateData });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      let msg = "Failed to update profile.";
      if (error.code === 'permission-denied') msg = "Permission denied. Check Firestore security rules.";
      else if (error.code === 'unavailable') msg = "Network error. Please check your connection.";
      
      toast({
        title: "Update Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  const showLegacyFix = (!formData.street_address || !formData.city) && formData.serviceaddress && formData.serviceaddress.length > 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[hsl(var(--brand-dark-mode-bg))]/95 backdrop-blur-xl border-[hsl(var(--brand-deep-red))]/30 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--brand-accent-red))]">Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer address and details. All address fields are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullname">Full Name</Label>
            <Input
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              placeholder="John Doe"
              className={`bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 ${errors.fullname ? 'border-red-500' : ''}`}
            />
            {errors.fullname && <span className="text-xs text-red-500">{errors.fullname}</span>}
          </div>
          
          {/* Address Section */}
          <div className="space-y-3 p-4 bg-black/20 rounded-lg border border-[hsl(var(--brand-deep-red))]/20">
             <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-[hsl(var(--brand-cream))]">Address Details</Label>
                {showLegacyFix && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleFixLegacy}
                        className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 gap-1"
                    >
                        <Wand2 className="w-3 h-3" /> Fix Legacy Address
                    </Button>
                )}
             </div>
             
             <div className="space-y-2">
                <div>
                   <Label htmlFor="street_address" className="text-xs text-muted-foreground">Street</Label>
                   <Input
                      id="street_address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleChange}
                      placeholder="123 Key West Blvd"
                      className={`bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 ${errors.street_address ? 'border-red-500' : ''}`}
                   />
                   {errors.street_address && <span className="text-xs text-red-500">{errors.street_address}</span>}
                </div>
                
                <div className="flex gap-3">
                    <div className="flex-[2]">
                       <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                       <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Key West"
                          className={`bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 ${errors.city ? 'border-red-500' : ''}`}
                       />
                       {errors.city && <span className="text-xs text-red-500">{errors.city}</span>}
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
                          className={`bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 ${errors.state ? 'border-red-500' : ''}`}
                       />
                       {errors.state && <span className="text-xs text-red-500">{errors.state}</span>}
                    </div>
                    <div className="flex-[1.5]">
                       <Label htmlFor="zip_code" className="text-xs text-muted-foreground">Zip</Label>
                       <Input
                          id="zip_code"
                          name="zip_code"
                          value={formData.zip_code}
                          onChange={handleChange}
                          placeholder="33040"
                          className={`bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 ${errors.zip_code ? 'border-red-500' : ''}`}
                       />
                       {errors.zip_code && <span className="text-xs text-red-500">{errors.zip_code}</span>}
                    </div>
                </div>
             </div>
             {formData.serviceaddress && (
                 <div className="text-[10px] text-muted-foreground italic">
                     Legacy: {formData.serviceaddress}
                 </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupday">Pickup Day</Label>
              <Select 
                value={formData.pickupday} 
                onValueChange={(val) => handleSelectChange('pickupday', val)}
              >
                <SelectTrigger className={`bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 ${errors.pickupday ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pickupday && <span className="text-xs text-red-500">{errors.pickupday}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => handleSelectChange('role', val)}
              >
                <SelectTrigger className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-[hsl(var(--brand-deep-red))]/30 hover:bg-[hsl(var(--brand-deep-red))]/10"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isAdmin}
              className="bg-[hsl(var(--brand-deep-red))] hover:bg-[hsl(var(--brand-accent-red))]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;