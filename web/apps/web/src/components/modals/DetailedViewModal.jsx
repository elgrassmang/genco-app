import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Mail, Phone, Shield, CreditCard, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

const DetailedViewModal = ({ open, onOpenChange, customer }) => {
  if (!customer) return null;

  const DetailItem = ({ icon: Icon, label, value, className = "" }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--brand-dark-mode-bg))]/50 border border-[hsl(var(--brand-deep-red))]/20 ${className}`}>
      <div className="p-2 rounded-full bg-[hsl(var(--brand-deep-red))]/20 text-[hsl(var(--brand-accent-red))]">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[hsl(var(--brand-dark-mode-bg))]/95 backdrop-blur-xl border-[hsl(var(--brand-deep-red))]/30 text-foreground">
        <DialogHeader className="border-b border-[hsl(var(--brand-deep-red))]/20 pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-[hsl(var(--brand-accent-red))]">
            <User className="w-6 h-6" />
            Customer Profile
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Detailed view for {customer.fullname}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--brand-accent-red))] uppercase tracking-wider mb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem 
                icon={User} 
                label="Full Name" 
                value={customer.fullname} 
              />
              <DetailItem 
                icon={Mail} 
                label="Email Address" 
                value={customer.email} 
              />
              <DetailItem 
                icon={Phone} 
                label="Phone Number" 
                value={customer.phone} 
              />
              <DetailItem 
                icon={Shield} 
                label="Role" 
                value={customer.role} 
                className="capitalize"
              />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--brand-accent-red))] uppercase tracking-wider mb-2">
              Service Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem 
                icon={MapPin} 
                label="Service Address" 
                value={customer.serviceaddress} 
                className="md:col-span-2"
              />
              <DetailItem 
                icon={Calendar} 
                label="Pickup Day" 
                value={customer.pickup_day} 
              />
              <DetailItem 
                icon={CreditCard} 
                label="Plan Status" 
                value={customer.subscription_status} 
                className={customer.subscription_status === 'active' ? 'border-green-500/30 bg-green-500/10' : ''}
              />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--brand-accent-red))] uppercase tracking-wider mb-2">
              Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem 
                icon={Clock} 
                label="Joined On" 
                value={customer.created_at ? format(new Date(customer.created_at), 'PPP pp') : 'Unknown'} 
              />
              <DetailItem 
                icon={User} 
                label="Customer ID" 
                value={customer.id} 
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[hsl(var(--brand-deep-red))]/20">
          <Button 
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-[hsl(var(--brand-deep-red))]/50 hover:bg-[hsl(var(--brand-deep-red))]/20"
          >
            Close Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailedViewModal;