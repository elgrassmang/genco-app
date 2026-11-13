import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, User, Clock, CheckCircle, Image as ImageIcon, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

const ServiceHistory = ({ customerId }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!customerId) return;
      setLoading(true);
      try {
        // Fetch logs where customer_id matches
        const logsRef = collection(db, 'service_logs');
        const q = query(
          logsRef, 
          where('customer_id', '==', customerId),
          orderBy('completed_at', 'desc'),
          limit(20)
        );
        
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(logs);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [customerId]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-lg border border-dashed border-gray-700">
         <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
         <p>No service history found for this customer yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <Card key={service.id} className="bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/20 overflow-hidden">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start">
            {/* Date Badge */}
            <div className="flex flex-col items-center justify-center bg-[hsl(var(--brand-dark))] border border-[hsl(var(--brand-deep-red))]/30 rounded-md p-3 min-w-[80px]">
               <span className="text-xs text-muted-foreground uppercase font-bold">{service.completed_at ? format(new Date(service.completed_at), 'MMM') : '-'}</span>
               <span className="text-2xl font-bold text-[hsl(var(--brand-cream))]">{service.completed_at ? format(new Date(service.completed_at), 'dd') : '-'}</span>
               <span className="text-xs text-muted-foreground">{service.completed_at ? format(new Date(service.completed_at), 'yyyy') : '-'}</span>
            </div>

            {/* Content */}
            <div className="flex-grow space-y-2">
               <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[hsl(var(--brand-cream))] flex items-center gap-2">
                     <CheckCircle className="w-4 h-4 text-green-500" /> Service Completed
                  </h4>
                  <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">
                     {service.completed_at ? format(new Date(service.completed_at), 'h:mm a') : ''}
                  </span>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[hsl(var(--brand-cream))/0.8]">
                  <div className="flex items-center gap-2">
                     <User className="w-4 h-4 text-muted-foreground" />
                     <span>Worker: {service.worker_id ? 'Assigned Worker' : 'Unknown'}</span> 
                  </div>
                  {service.duration && (
                     <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Duration: {service.duration} min</span>
                     </div>
                  )}
               </div>

               {service.notes && (
                  <p className="text-sm italic text-muted-foreground bg-black/20 p-2 rounded border border-white/5">
                     "{service.notes}"
                  </p>
               )}
            </div>

            {/* Photo Thumbnail */}
            {service.photo_url && (
               <div className="shrink-0">
                  <div 
                    className="w-24 h-24 rounded-md overflow-hidden border border-[hsl(var(--brand-deep-red))]/30 cursor-pointer relative group"
                    onClick={() => setSelectedImage(service.photo_url)}
                  >
                     <img src={service.photo_url} alt="Proof of service" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white" />
                     </div>
                  </div>
               </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
         <DialogContent className="max-w-4xl bg-black/90 border-none p-0 overflow-hidden text-white">
            <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[50vh]">
               <img src={selectedImage} alt="Full size" className="max-h-[85vh] max-w-full object-contain" />
               <button 
                 onClick={() => setSelectedImage(null)}
                 className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>
               <a 
                 href={selectedImage} 
                 target="_blank" 
                 rel="noreferrer"
                 download
                 className="absolute bottom-4 right-4 p-2 bg-[hsl(var(--brand-accent-red))] hover:bg-red-700 rounded-md text-white flex items-center gap-2 text-sm font-medium"
               >
                 <Download className="w-4 h-4" /> Open Original
               </a>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceHistory;