import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, CreditCard, User, FileText, Activity, Clock, Send, ShieldAlert, BadgeDollarSign } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import ServiceHistory from '@/components/admin/ServiceHistory';
import StaffNotes from '@/components/admin/StaffNotes';
import FollowUpModal from '@/components/modals/FollowUpModal';

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFollowUp, setShowFollowUp] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', customerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCustomer({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast({ title: "Error", description: "Customer not found.", variant: "destructive" });
        }
      } catch (err) {
        console.error("Error fetching customer:", err);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) fetchCustomer();
  }, [customerId, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--brand-accent-red))]" />
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!customer) return null;

  const isLead = customer.role === 'lead' || customer.status === 'lead' || customer.subscription_status === 'inactive';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/customers')} className="pl-0 text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
        </Button>
      </div>

      {/* Header */}
      <div className="bg-[hsl(var(--brand-dark-mode-bg))]/80 border border-[hsl(var(--brand-deep-red))]/20 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
         <div className="flex gap-5">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--brand-deep-red))]/20 flex items-center justify-center text-[hsl(var(--brand-accent-red))] text-2xl font-bold border border-[hsl(var(--brand-deep-red))]/30">
               {customer.fullname ? customer.fullname.substring(0, 2).toUpperCase() : '??'}
            </div>
            <div>
               <h1 className="text-2xl font-bold text-[hsl(var(--brand-cream))] flex items-center gap-3">
                  {customer.fullname}
                  <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                     isLead ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                     customer.subscription_status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                     'bg-gray-500/20 text-gray-400'
                  }`}>
                     {isLead ? 'Lead' : 'Active Customer'}
                  </span>
               </h1>
               <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {customer.email}</span>
                  <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {customer.phone || 'No phone'}</span>
                  <span className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {customer.street_address ? `${customer.street_address}, ${customer.city}` : customer.serviceaddress}</span>
               </div>
            </div>
         </div>

         <div className="flex flex-col gap-3 min-w-[200px]">
             {isLead && (
               <Button onClick={() => setShowFollowUp(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Send className="w-4 h-4" /> Send Follow Up Offer
               </Button>
             )}
             <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">Delete Account</Button>
         </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border border-[hsl(var(--brand-deep-red))]/20 w-full md:w-auto grid grid-cols-4 md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Staff Notes</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <div className="mt-6">
           <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Quick Details Card */}
                 <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/20">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-[hsl(var(--brand-accent-red))]" /> Account Info</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-medium text-[hsl(var(--brand-cream))]">{customer.plan?.name || 'None'}</span>
                       </div>
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-muted-foreground">Pickup Day</span>
                          <span className="font-medium text-[hsl(var(--brand-cream))]">{customer.pickupday || 'Unassigned'}</span>
                       </div>
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-muted-foreground">Gate Code</span>
                          <span className="font-medium text-[hsl(var(--brand-cream))]">{customer.gate_code || 'N/A'}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-muted-foreground">Joined</span>
                          <span className="font-medium text-[hsl(var(--brand-cream))]">{customer.createdAt?.seconds ? format(new Date(customer.createdAt.seconds * 1000), 'MMM d, yyyy') : '-'}</span>
                       </div>
                    </CardContent>
                 </Card>

                 {/* Notifications Prefs */}
                 <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/20">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> Preferences</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                       <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                          <span className="text-sm">Email Notifications</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${customer.emailNotifications !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                             {customer.emailNotifications !== false ? 'Enabled' : 'Disabled'}
                          </span>
                       </div>
                       <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                          <span className="text-sm">SMS Notifications</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${customer.smsNotifications ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                             {customer.smsNotifications ? 'Enabled' : 'Disabled'}
                          </span>
                       </div>
                    </CardContent>
                 </Card>
              </div>
           </TabsContent>

           <TabsContent value="history">
              <ServiceHistory customerId={customerId} />
           </TabsContent>

           <TabsContent value="notes">
              <StaffNotes customerId={customerId} />
           </TabsContent>

           <TabsContent value="billing">
              <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/20">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BadgeDollarSign className="w-5 h-5 text-green-500" /> Billing Overview</CardTitle>
                    <CardDescription>Payment methods and invoices.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="p-4 text-center text-muted-foreground bg-black/20 rounded-lg border border-dashed border-white/10">
                       <p>Stripe integration required for full billing history.</p>
                       <p className="text-sm mt-2">Subscription ID: {customer.subscriptionId || 'N/A'}</p>
                    </div>
                 </CardContent>
              </Card>
           </TabsContent>
        </div>
      </Tabs>

      <FollowUpModal open={showFollowUp} onOpenChange={setShowFollowUp} customer={customer} />
    </div>
  );
};

export default CustomerDetails;