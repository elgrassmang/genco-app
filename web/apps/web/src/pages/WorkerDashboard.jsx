import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Camera, MapPin, Navigation, CalendarDays, LogOut, AlertTriangle, Loader2, RefreshCw, List, Map as MapIcon, Crosshair, Filter, Warehouse, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Map Components
import MapContainer from '@/components/worker/MapContainer';
import WorkerMarker from '@/components/worker/WorkerMarker';
import RoutePolyline from '@/components/worker/RoutePolyline';

// Custom Hooks & Utils
import { useGeocoding } from '@/hooks/useGeocoding';
import { useWorkerLocation } from '@/hooks/useWorkerLocation';
import { optimizeRoute, DEFAULT_START_POINT, formatDuration } from '@/utils/routeOptimization';
import { sendJobStartEmail, sendJobCompletionEmail } from '@/utils/notificationService';

const NYC_CENTER = [40.7128, -74.0060];

const WorkerDashboard = () => {
  const { user, profile, loadingAuth, logout, viewedUser, adminViewMode } = useAuth();
  const [allAssignedJobs, setAllAssignedJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]); 
  const [completedJobs, setCompletedJobs] = useState(new Set());
  const [dataLoading, setDataLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [mapView, setMapView] = useState(true);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Optimization State
  const [startPoint, setStartPoint] = useState(DEFAULT_START_POINT);
  const [isRouteOptimizing, setIsRouteOptimizing] = useState(false);
  const [routeStarted, setRouteStarted] = useState(false);
  
  const [viewFullWeek, setViewFullWeek] = useState(() => {
    return localStorage.getItem('workerViewFullWeek') === 'true';
  });

  const fileInputRefs = useRef({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const { geocodeAddresses, isLoading: isGeocoding, progress: geocodeProgress } = useGeocoding();
  const { location: workerLocation, isLoading: locatingWorker, getCurrentLocation } = useWorkerLocation();

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

  useEffect(() => {
    localStorage.setItem('workerViewFullWeek', viewFullWeek);
  }, [viewFullWeek]);

  const activeWorkerId = viewedUser?.uid || user?.uid;

  const fetchAndProcessJobs = useCallback(async () => {
    if (!activeWorkerId) return;
    
    const isWorker = profile?.role === 'worker' || profile?.role === 'employee';
    const isAdmin = profile?.role === 'admin';
    
    if (!isWorker && !isAdmin) {
       toast({ title: "Access Denied", description: "Worker access only.", variant: "destructive" });
       navigate('/dashboard');
       return;
    }

    setDataLoading(true);
    setInitError(null);

    try {
      await getCurrentLocation();

      const usersRef = collection(db, 'users');
      const qUsers = query(usersRef, where('assignedWorkerId', '==', activeWorkerId));
      
      let usersSnapshot;
      try {
        usersSnapshot = await getDocs(qUsers);
      } catch (err) {
         if (err.code === 'failed-precondition') throw new Error("Database index missing. Please contact admin.");
         throw err;
      }

      const allCustomers = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => !c.isArchived && c.subscription_status === 'active');
      
      setAllAssignedJobs(allCustomers);

      const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(today); endOfDay.setHours(23,59,59,999);
      
      const logsRef = collection(db, 'service_logs');
      const qLogs = query(
        logsRef, 
        where('worker_id', '==', activeWorkerId),
        where('completed_at', '>=', startOfDay.toISOString()), 
        where('completed_at', '<=', endOfDay.toISOString())
      );
      
      const logsSnapshot = await getDocs(qLogs);
      const completedIds = new Set(logsSnapshot.docs.map(doc => doc.data().customer_id));
      setCompletedJobs(completedIds);

    } catch (err) {
      console.error("Error loading dashboard:", err);
      setInitError("Failed to load your assigned route. Please try again.");
    } finally {
      setDataLoading(false);
    }
  }, [activeWorkerId, profile, today, getCurrentLocation, navigate, toast]);

  useEffect(() => {
    if (!loadingAuth && activeWorkerId) {
      fetchAndProcessJobs();
    } else if (!loadingAuth && !activeWorkerId) {
      navigate('/dashboard');
    }
  }, [activeWorkerId, loadingAuth, fetchAndProcessJobs, navigate]);

  useEffect(() => {
    const processFilteredJobs = async () => {
      if (!allAssignedJobs.length) {
        setActiveJobs([]);
        return;
      }
      setIsRouteOptimizing(true);
      
      let filtered = allAssignedJobs;
      if (!viewFullWeek) {
        filtered = allAssignedJobs.filter(job => job.pickup_day === currentDayName || job.pickupday === currentDayName);
      }
      
      if (filtered.length > 0) {
        const jobsWithCoords = await geocodeAddresses(filtered);
        const jobsWithStatus = jobsWithCoords.map(job => ({
            ...job,
            isCompleted: completedJobs.has(job.id),
            status: completedJobs.has(job.id) ? 'completed' : 'pending',
            isTodayTask: (job.pickup_day === currentDayName || job.pickupday === currentDayName)
        }));

        const optimized = await optimizeRoute(startPoint, jobsWithStatus);
        setActiveJobs(optimized);
      } else {
        setActiveJobs([]);
      }
      setIsRouteOptimizing(false);
    };
    processFilteredJobs();
  }, [allAssignedJobs, viewFullWeek, currentDayName, completedJobs, geocodeAddresses, startPoint]);

  useEffect(() => {
    if (mapView && mapInstance) {
      const timer = setTimeout(() => mapInstance.invalidateSize(), 200);
      return () => clearTimeout(timer);
    }
  }, [mapView, mapInstance]);

  const handleStartRoute = async () => {
    setRouteStarted(true);
    toast({ title: "Route Started", description: "Notifying next customer..." });
    
    // Find next pending customer
    const nextJob = activeJobs.find(j => !j.isCompleted);
    if (nextJob) {
        await sendJobStartEmail(nextJob, profile?.fullname || "Your Technician", "15");
        toast({ title: "Notification Sent", description: `Emailed ${nextJob.fullname} that you are en route.` });
    }
  };

  const handlePhotoCapture = async (customerId, customerName, customerEmail) => {
    const fileInput = fileInputRefs.current[customerId];
    if (!fileInput?.files?.[0]) return;
    
    if (adminViewMode) {
        toast({ title: "Impersonation Mode", description: "Uploading photo as impersonated user.", variant: "warning" });
    }

    const file = fileInput.files[0];
    setUploadingPhotos(prev => ({ ...prev, [customerId]: true }));

    try {
      const gpsCoords = await getCurrentLocation(); 
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${customerId}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(filename, file, { contentType: file.type, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('service-photos')
        .getPublicUrl(filename);
      const publicUrl = urlData.publicUrl;

      await addDoc(collection(db, 'service_logs'), {
          customer_id: customerId,
          worker_id: activeWorkerId,
          photo_url: publicUrl,
          status: 'completed',
          completed_at: new Date().toISOString(),
          location_coords: gpsCoords ? `${gpsCoords.lat},${gpsCoords.lng}` : null,
          impersonated_by: adminViewMode ? user.uid : null
      });

      setCompletedJobs(prev => new Set([...prev, customerId]));
      setActiveJobs(prev => prev.map(job => 
        job.id === customerId 
          ? { ...job, isCompleted: true, status: 'completed' } 
          : job
      ));

      toast({ title: "Success! ✅", description: `Pickup completed for ${customerName}` });
      
      // Send Notification
      const nextJob = activeJobs.find(j => j.id !== customerId && !j.isCompleted); // Simplified logic
      const currentJob = activeJobs.find(j => j.id === customerId);
      
      // Completion email
      await sendJobCompletionEmail(currentJob, profile?.fullname || "Technician", publicUrl);
      
      // Notify NEXT customer if auto-notify is enabled (optional enhancement)
      if (nextJob && routeStarted) {
         await sendJobStartEmail(nextJob, profile?.fullname || "Technician", "15");
      }

      fileInput.value = '';

    } catch (err) {
      console.error("Upload/Log error:", err);
      toast({ title: "Operation Failed", description: "Could not upload photo or save log.", variant: "destructive" });
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/welcome');
  };

  const todayCount = useMemo(() => {
    return allAssignedJobs.filter(j => j.pickup_day === currentDayName || j.pickupday === currentDayName).length;
  }, [allAssignedJobs, currentDayName]);
  
  const totalDistance = activeJobs.length > 0 ? activeJobs[activeJobs.length - 1].cumulativeDistance : 0;

  if (loadingAuth || dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[hsl(var(--brand-dark-mode-bg))]">
        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--brand-accent-red))]" />
      </div>
    );
  }

  if (initError) {
    return (
       <div className="flex flex-col items-center justify-center h-screen bg-[hsl(var(--brand-dark-mode-bg))] p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">{initError}</p>
        <div className="flex gap-4"><Button onClick={fetchAndProcessJobs} variant="default">Retry</Button></div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--brand-dark-mode-bg))] pb-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto py-6 px-4">
        <Card className="mb-6 shadow-2xl bg-card/90 backdrop-blur-sm border-[hsl(var(--brand-accent-red))]/30">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-3xl font-bold text-[hsl(var(--brand-accent-red))]">
                {adminViewMode ? `Viewing as: ${adminViewMode.userName}` : (profile?.fullname || 'Worker')}
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {formattedDate} • {todayCount} tasks today
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
               {!routeStarted && activeJobs.length > 0 && (
                   <Button onClick={handleStartRoute} className="bg-green-600 hover:bg-green-700 text-white animate-pulse">
                      <PlayCircle className="w-4 h-4 mr-2" /> Start Route
                   </Button>
               )}
               <Button 
                    variant={!viewFullWeek ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewFullWeek(false)}
                    className="h-8 text-xs px-3"
                  >
                    Today
                  </Button>
                  <Button 
                    variant={viewFullWeek ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewFullWeek(true)}
                    className="h-8 text-xs px-3"
                  >
                    Full Week
                  </Button>

              <Button variant="outline" size="icon" onClick={fetchAndProcessJobs} title="Refresh Route">
                <RefreshCw className="h-4 w-4" />
              </Button>
              {!adminViewMode && (
                <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-red-400">
                  <LogOut className="h-5 w-5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                 <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                    <Warehouse className="h-3 w-3" /> Start: {startPoint.name}
                 </div>
              </div>
              <Button
                variant={mapView ? "secondary" : "default"}
                onClick={() => setMapView(!mapView)}
                className="w-[140px] h-8 text-xs flex items-center justify-center gap-2"
              >
                {mapView ? <><List className="h-3 w-3" /> List View</> : <><MapIcon className="h-3 w-3" /> Map View</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {activeJobs.length === 0 ? (
          <div className="text-center py-20"><CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" /><h3 className="text-3xl font-bold mb-3 text-foreground">All Clear!</h3></div>
        ) : (
          <>
            <div className={mapView ? 'block' : 'hidden'}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                <Card className="shadow-2xl overflow-hidden border-[hsl(var(--brand-accent-red))]/20 relative">
                  <CardContent className="p-0 relative h-[500px]">
                     <MapContainer 
                        center={startPoint ? [startPoint.lat, startPoint.lng] : NYC_CENTER} 
                        zoom={13} 
                        className="h-full w-full bg-slate-100"
                        onMapReady={setMapInstance}
                     >
                       {workerLocation && <WorkerMarker worker={{ isCurrentUser: true, fullname: "You", coords: [workerLocation.lat, workerLocation.lng], status: 'active' }} />}
                       <WorkerMarker worker={{ fullname: startPoint.name, serviceaddress: "Start Point", coords: [startPoint.lat, startPoint.lng], status: 'start' }} />
                       {activeJobs.map(job => <WorkerMarker key={job.id} worker={job} />)}
                       {activeJobs.length > 0 && <RoutePolyline startLocation={[startPoint.lat, startPoint.lng]} stops={activeJobs} />}
                     </MapContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className={!mapView ? 'block' : 'hidden'}>
               <div className="space-y-4">
                  {activeJobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`glassmorphism p-5 rounded-lg border-l-4 transition-all shadow-md relative ${
                          job.isCompleted ? 'border-green-500 bg-green-500/5' : 'border-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-accent-red))]/5'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mt-2">
                          <div className="flex items-start gap-4">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${job.isCompleted ? 'bg-green-100 text-green-700' : 'bg-[hsl(var(--brand-deep-red))] text-white'}`}>
                              {job.sequence || index + 1}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">{job.fullname} {job.isgated && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">Gated</span>}</h3>
                              <p className="text-muted-foreground">{job.serviceaddress}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                             {job.isCompleted ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-500 rounded-md font-medium"><CheckCircle className="h-5 w-5" /> Completed</div>
                             ) : (
                               <>
                                 <Button 
                                    variant="outline"
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.coords ? job.coords[0] : 0},${job.coords ? job.coords[1] : 0}`, '_blank')}
                                    className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                                    disabled={!job.coords}
                                 >
                                   <Navigation className="h-4 w-4 mr-2" /> Maps
                                 </Button>
                                 <input type="file" accept="image/*" capture="environment" ref={(el) => (fileInputRefs.current[job.id] = el)} onChange={() => handlePhotoCapture(job.id, job.fullname, job.email)} className="hidden" />
                                 <Button onClick={() => fileInputRefs.current[job.id]?.click()} disabled={uploadingPhotos[job.id]} className="bg-[hsl(var(--brand-deep-red))] hover:bg-[hsl(var(--brand-accent-red))] min-w-[140px]">
                                   {uploadingPhotos[job.id] ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                                   {uploadingPhotos[job.id] ? "Uploading..." : "Complete"}
                                 </Button>
                               </>
                             )}
                          </div>
                        </div>
                      </motion.div>
                  ))}
               </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default WorkerDashboard;