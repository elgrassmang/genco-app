import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { sendFollowUpEmail } from '@/utils/notificationService';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const FollowUpModal = ({ open, onOpenChange, customer }) => {
  const [loading, setLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('10');
  const [customMessage, setCustomMessage] = useState("We'd love to help keep your bins clean and smelling fresh! Use this exclusive code to get started.");
  const { toast } = useToast();

  const handleSend = async () => {
    setLoading(true);
    try {
      // Generate unique code: GENCO + First 3 letters of name + Random 3 digits
      const codeBase = customer.fullname ? customer.fullname.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() : 'NEW';
      const randomNum = Math.floor(100 + Math.random() * 900);
      const discountCode = `GENCO-${codeBase}-${randomNum}`;

      // 1. Send Email
      const result = await sendFollowUpEmail(customer, discountCode, discountPercent, customMessage);

      if (result.success) {
        // 2. Update Customer Record
        const userRef = doc(db, 'users', customer.id);
        const followUpEntry = {
          date: new Date().toISOString(),
          discountCode,
          discountPercentage: discountPercent,
          message: customMessage,
          status: 'sent'
        };

        await updateDoc(userRef, {
          followUpHistory: arrayUnion(followUpEntry),
          lastContactDate: new Date().toISOString()
        });

        toast({ title: "Follow-Up Sent", description: `Email sent to ${customer.email} with code ${discountCode}` });
        onOpenChange(false);
      } else {
        throw new Error("Email sending failed");
      }
    } catch (error) {
      console.error("Follow-up error:", error);
      toast({ title: "Error", description: "Failed to send follow-up.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(var(--brand-dark))] text-[hsl(var(--brand-cream))] border-[hsl(var(--brand-deep-red))]/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[hsl(var(--brand-accent-red))]" /> Send Lead Follow-Up
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--brand-cream))/0.7]">
            Send a personalized offer to {customer?.fullname}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Discount Offer</Label>
            <Select value={discountPercent} onValueChange={setDiscountPercent}>
              <SelectTrigger className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30">
                <SelectValue placeholder="Select discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5% Off First Month</SelectItem>
                <SelectItem value="10">10% Off First Month</SelectItem>
                <SelectItem value="15">15% Off First Month</SelectItem>
                <SelectItem value="20">20% Off First Month</SelectItem>
                <SelectItem value="50">50% Off First Month (Aggressive)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Personalized Message</Label>
            <Textarea 
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 min-h-[100px]"
            />
          </div>

          <div className="bg-[hsl(var(--brand-accent-red))]/10 p-3 rounded border border-[hsl(var(--brand-accent-red))]/20 flex items-center gap-3">
             <Tag className="w-5 h-5 text-[hsl(var(--brand-accent-red))]" />
             <div className="text-sm">
                <p className="font-bold">Auto-Generated Code Preview:</p>
                <p className="font-mono text-muted-foreground">GENCO-XXX-123</p>
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSend} disabled={loading} className="bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))] text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FollowUpModal;