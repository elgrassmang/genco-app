import React, { useEffect, useState, useCallback } from 'react';
import { Users, Filter, Search, RotateCw, Map as MapIcon, Loader2, PlayCircle, XCircle, Clock, Milestone, CheckCircle, AlertTriangle, Edit, Warehouse, MoveVertical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminData } from '@/contexts/AdminDataContext';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminRouteMap from '@/components/admin/AdminRouteMap';
import { geocodeAddress, validateCoordinates } from '@/utils/geocoding';
import { optimizeRoute, recalculateRouteMetrics, DEFAULT_START_POINT, formatDuration } from '@/utils/routeOptimization';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import EditCustomerModal from '@/components/modals/EditCustomerModal';

const AdminRoutes = () => {
  const { allUsers, error, fetchAllUsersDataForAdmin } = useAdminData();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState('all');
  const [filteredRouteCustomers, setFilteredRouteCustomers] = useState([]);
  
  // Optimization & Routing State
  const [startPoint, setStartPoint] = useState(DEFAULT_START_POINT);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeStats, setRouteStats] = useState(null);
  
  // Map State
  const [geocodingId, setGeocodingId] = useState(null);
  
  // Drag & Drop State
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Constants
  const pickupDays = ["all", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Auth Check
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Initial Filter Logic (Resets on day/search change)
  useEffect(() => {
    let customers = allUsers?.filter(user => (user.street_address || user.serviceaddress) && user.pickupday) || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      customers = customers.filter(user =>
        (user.fullname?.toLowerCase() || '').includes(term) ||
        (user.serviceaddress?.toLowerCase() || '').includes(term) ||
        (user.street_address?.toLowerCase() || '').includes(term)
      );
    }
    
    if (filterDay !== 'all') {
      customers = customers.filter(user => user.pickupday === filterDay);
    }
    
    // Sort roughly by ID or name initially to keep stable
    customers.sort((a, b) => (a.fullname || '').localeCompare(b.fullname || ''));

    setFilteredRouteCustomers(customers);
    // Reset route stats when filter changes
    setRouteStats(null);
  }, [allUsers, searchTerm, filterDay]);

  // Derived Markers for Map (from filtered/ordered list)
  const mapMarkers = filteredRouteCustomers
    .filter(c => validateCoordinates(c.lat, c.lng))
    .map((c, index) => ({
      id: c.id,
      name: c.fullname,
      address: c.street_address ? `${c.street_address}, ${c.city}` : c.serviceaddress,
      status: c.subscription_status || 'active',
      isGated: c.isgated,
      lat: parseFloat(c.lat),
      lon: parseFloat(c.lng),
      sequence: index + 1 // Add sequence for visual
    }));

  const handleStartPointSelect = (point) => {
    setStartPoint(point);
    toast({
      title: "Start Point Updated",
      description: `Starting route from: ${point.name}`,
    });
    // Trigger re-calc is manual (or handled by effect if we wanted). 
    // Here we'll just let the user re-optimize or it updates next action.
  };

  const resetStartPoint = () => {
    setStartPoint(DEFAULT_START_POINT);
  };

  const handleGeocodeCustomer = async (customer) => {
    if (geocodingId) return; 

    if (!customer.street_address || !customer.city || !customer.zip_code) {
       toast({ title: "Address Incomplete", description: "Edit customer to add missing address fields.", variant: "destructive" });
       return;
    }

    setGeocodingId(customer.id);
    try {
      const result = await geocodeAddress(customer.street_address, customer.city, customer.state || 'FL', customer.zip_code);
      
      if (result) {
        const userRef = doc(db, 'users', customer.id);
        await updateDoc(userRef, {
          lat: result.lat,
          lng: result.lon,
          geocoded_at: result.geocoded_at,
          formatted_address: result.formatted_address 
        });
        
        toast({ title: "Geocoding Success", description: "Coordinates updated." });
        fetchAllUsersDataForAdmin();
      } else {
        toast({ title: "Geocoding Failed", description: "Could not find coordinates for this address.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Geocoding error", e);
      toast({ title: "Error", description: "Failed to update coordinates.", variant: "destructive" });
    } finally {
      setGeocodingId(null);
    }
  };

  const handleOptimizeRoute = async () => {
    const missingCoords = filteredRouteCustomers.filter(c => !validateCoordinates(c.lat, c.lng));
    
    if (missingCoords.length > 0) {
      toast({ 
        title: "Missing Coordinates", 
        description: `${missingCoords.length} customers need to be geocoded first.`, 
        variant: "destructive" 
      });
      return;
    }

    if (filteredRouteCustomers.length < 1) {
       toast({ title: "Not enough stops", description: "Need at least 1 stop to optimize.", variant: "warning" });
       return;
    }

    setIsOptimizing(true);
    try {
      // 1. Run Optimization Service (Now using GraphHopper Matrix)
      const optimized = await optimizeRoute(startPoint, filteredRouteCustomers);
      
      // 2. Update State
      setFilteredRouteCustomers(optimized);
      
      // 3. Stats derived from optimization result (which now includes estimated travel time)
      const lastStop = optimized[optimized.length - 1];
      setRouteStats({
         distance: lastStop.cumulativeDistance,
         time: lastStop.estArrivalMin
      });

      toast({ title: "Route Optimized", description: `Optimized via GraphHopper Matrix.` });
    } catch (err) {
      console.error("Optimization failed:", err);
      toast({ title: "Optimization Failed", description: "Could not calculate optimal route.", variant: "destructive" });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    e.dataTransfer.setData("text/html", e.target.parentNode);
    e.dataTransfer.setDragImage(e.target.parentNode, 20, 20);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = async (e, index) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === index) return;

    // Reorder array
    const newOrder = [...filteredRouteCustomers];
    const [draggedItem] = newOrder.splice(draggedRowIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setFilteredRouteCustomers(newOrder);
    setDraggedRowIndex(null);

    // Recalculate metrics (async now for GraphHopper, but using sync fallback in display for speed)
    // To properly update times, we would call optimizeRoute or a specialized recalc function.
    // For visual drag drop, we rely on the component re-render with new order.
    // We can trigger a background recalculation:
    try {
        const reCalculated = await recalculateRouteMetrics(startPoint, newOrder);
        setFilteredRouteCustomers(reCalculated);
    } catch (e) {
        console.warn("Metrics update failed", e);
    }
  };

  // Callback from Map (GraphHopper Full Directions Stats)
  const handleRouteCalculated = useCallback((stats) => {
    // This updates the badge with the full polyline info (accurate)
    setRouteStats(stats);
  }, []);

  const handleEditClick = (customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleEditSuccess = async () => {
     try {
       await fetchAllUsersDataForAdmin();
       toast({ title: "Data Refreshed", description: "Customer list updated." });
     } catch (e) {
       console.error("Refresh failed", e);
     }
  };

  if (error) {
    return <div className="p-6 text-red-500">Error loading routes: {error.message}</div>;
  }

  return (
    <motion.div
      className="space-y-6 w-full pb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[hsl(var(--brand-cream))]">Route Management</h1>
           <p className="text-[hsl(var(--brand-cream))/0.6]">Optimize daily pickups via GraphHopper AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        
        {/* Left Column: Map & Controls */}
        <div className="space-y-6 flex flex-col">
          <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism border-[hsl(var(--brand-deep-red))/0.3]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--brand-cream))] flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Filter className="w-4 h-4 text-[hsl(var(--brand-accent-red))]" />
                   Filters & Start Point
                </div>
                {startPoint.id !== DEFAULT_START_POINT.id && (
                  <Button variant="ghost" size="sm" onClick={resetStartPoint} className="h-6 text-xs text-muted-foreground hover:text-white">
                    Reset Start
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Start Point Display */}
               <div className="bg-[hsl(var(--brand-dark))] p-3 rounded-md border border-[hsl(var(--brand-deep-red))/0.3] flex items-center gap-3">
                  <div className="bg-red-900/50 p-2 rounded-full">
                     <Warehouse className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-grow">
                     <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Starting From</p>
                     <p className="text-sm font-medium text-[hsl(var(--brand-cream))]">{startPoint.name}</p>
                     <p className="text-[10px] text-muted-foreground truncate">{startPoint.address}</p>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative flex-grow">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search customer..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-9 bg-[hsl(var(--brand-dark)/0.5)] border-[hsl(var(--brand-deep-red))/0.5]"
                   />
                 </div>
                 <Select value={filterDay} onValueChange={setFilterDay}>
                   <SelectTrigger className="w-full sm:w-[180px] bg-[hsl(var(--brand-dark)/0.5)] border-[hsl(var(--brand-deep-red))/0.5]">
                     <SelectValue placeholder="Select Day" />
                   </SelectTrigger>
                   <SelectContent>
                     {pickupDays.map(day => (
                       <SelectItem key={day} value={day}>{day === 'all' ? 'All Days' : day}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div className="flex flex-wrap gap-2 pt-2 border-t border-[hsl(var(--brand-deep-red))/0.2]">
                  {isOptimizing ? (
                     <Button variant="disabled" className="gap-2">
                       <Loader2 className="w-4 h-4 animate-spin" /> Optimizing...
                     </Button>
                  ) : (
                     <Button 
                       onClick={handleOptimizeRoute} 
                       disabled={filteredRouteCustomers.length === 0}
                       className="bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))] text-white gap-2 shadow-lg shadow-red-900/20"
                     >
                       <PlayCircle className="w-4 h-4" />
                       Optimize Route
                     </Button>
                  )}
                  
                  {/* Route Stats Badge */}
                  <AnimatePresence>
                    {(routeStats) && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 ml-auto bg-[hsl(var(--brand-dark))] px-3 py-2 rounded-md border border-[hsl(var(--brand-accent-red))]/30 shadow-inner"
                      >
                         <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--brand-cream))]">
                           <Milestone className="w-4 h-4 text-blue-400" />
                           <span className="font-mono">
                             {routeStats.distance} km
                           </span>
                         </div>
                         <div className="w-px h-4 bg-gray-600" />
                         <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--brand-cream))]">
                           <Clock className="w-4 h-4 text-green-400" />
                           <span className="font-mono">
                              {typeof routeStats.time === 'string' ? routeStats.time : `${routeStats.time}m`}
                           </span>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism border-[hsl(var(--brand-deep-red))/0.3] overflow-hidden flex-grow flex flex-col min-h-[500px]">
            <div className="relative flex-grow w-full h-full">
              <AdminRouteMap 
                startPoint={startPoint}
                markers={mapMarkers}
                isOptimizing={isOptimizing}
                onRouteCalculated={handleRouteCalculated}
                onStartPointSelect={handleStartPointSelect}
              />
            </div>
            <div className="bg-[hsl(var(--brand-deep-red))] text-white text-xs py-1 px-3 flex justify-between">
               <span>Total on Map: {mapMarkers.length}</span>
               <span>{filteredRouteCustomers.length - mapMarkers.length} missing coordinates</span>
            </div>
          </Card>
        </div>

        {/* Right Column: Customer List */}
        <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism border-[hsl(var(--brand-deep-red))/0.3] h-[800px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-[hsl(var(--brand-cream))] flex items-center justify-between">
                <span>Route Sequence</span>
                <span className="text-sm font-normal px-2 py-1 bg-[hsl(var(--brand-accent-red))/0.2] rounded border border-[hsl(var(--brand-accent-red))/0.3]">
                   {filteredRouteCustomers.length} stops
                </span>
              </CardTitle>
              <CardDescription className="text-[hsl(var(--brand-cream))/0.7]">
                Drag and drop rows to manually reorder.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden p-0 flex-grow">
              <div className="h-full overflow-y-auto">
                <Table>
                  <TableHeader className="bg-[hsl(var(--brand-dark))/0.8] sticky top-0 z-10">
                    <TableRow className="border-[hsl(var(--brand-deep-red))/0.4]">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.9] w-[50px]">Seq</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.9]">Customer</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.9]">Est. Arrival</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.9] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRouteCustomers.length > 0 ? (
                      filteredRouteCustomers.map((user, index) => {
                        const hasCoords = validateCoordinates(user.lat, user.lng);
                        const isMigrated = !!user.street_address;
                        
                        return (
                          <TableRow 
                             key={user.id} 
                             className={`border-[hsl(var(--brand-deep-red))/0.2] hover:bg-[hsl(var(--brand-deep-red))/0.1] cursor-move group ${draggedRowIndex === index ? 'opacity-50 bg-blue-900/20' : ''}`}
                             draggable
                             onDragStart={(e) => handleDragStart(e, index)}
                             onDragOver={(e) => handleDragOver(e, index)}
                             onDrop={(e) => handleDrop(e, index)}
                          >
                            <TableCell className="w-[40px] px-2 text-muted-foreground">
                               <MoveVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </TableCell>
                            <TableCell className="font-bold text-[hsl(var(--brand-cream))] text-center">
                              <span className="bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded text-xs border border-blue-500/30">
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-[hsl(var(--brand-cream))] font-medium text-sm">{user.fullname}</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                   {isMigrated ? `${user.street_address}` : user.serviceaddress}
                                </span>
                                {user.distanceFromLast && (
                                   <div className="flex items-center gap-1 text-[10px] text-green-400 mt-0.5">
                                      <ArrowRight className="w-3 h-3" /> {user.distanceFromLast} km
                                   </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-[hsl(var(--brand-cream))/0.8]">
                               {user.estArrivalMin ? (
                                 <span className="font-mono text-xs">{formatDuration(user.estArrivalMin)}</span>
                               ) : (
                                 <span className="text-xs text-muted-foreground">-</span>
                               )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                  onClick={() => handleEditClick(user)}
                                  title="Edit Customer"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>

                                {!hasCoords && isMigrated && (
                                   <Button 
                                     size="sm" 
                                     variant="outline" 
                                     className="h-7 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-900/20"
                                     onClick={() => handleGeocodeCustomer(user)}
                                     disabled={geocodingId === user.id}
                                   >
                                      {geocodingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Geo'}
                                   </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-[hsl(var(--brand-cream))/0.5] py-12">
                          No customers found for this filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
        </Card>
      </div>

      <EditCustomerModal 
         open={showEditModal} 
         onOpenChange={setShowEditModal} 
         customer={selectedCustomer} 
         onSuccess={handleEditSuccess}
      />
    </motion.div>
  );
};

export default AdminRoutes;