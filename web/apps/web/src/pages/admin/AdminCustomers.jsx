import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Filter, Search, Edit, Trash2, Eye, RefreshCw, Loader2, UserCheck, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminData } from '@/contexts/AdminDataContext'; 
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EditCustomerModal from '@/components/modals/EditCustomerModal';
import DeleteConfirmationDialog from '@/components/modals/DeleteConfirmationDialog';
import RoleChangeDialog from '@/components/modals/RoleChangeDialog';
import { db } from '@/lib/firebaseClient';
import { doc, updateDoc, writeBatch, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';

const AdminCustomers = () => {
  const { allUsers, error, loadingAdminData, fetchAllUsersDataForAdmin } = useAdminData(); 
  const { isAdmin, loadingAuth, user: currentUser, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Local state for filtering and display
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [localCustomers, setLocalCustomers] = useState([]);
  
  // Worker Assignment State
  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Role Change State
  const [roleChangeData, setRoleChangeData] = useState(null); // { customer, newRole }
  const [roleUpdating, setRoleUpdating] = useState(false);
  
  // Impersonation Loading State
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!loadingAuth && !isAdmin) {
      navigate('/dashboard');
    }
  }, [loadingAuth, isAdmin, navigate]);

  // Sync local customers with context data initially
  useEffect(() => {
    if (allUsers) {
      // Filter out archived users (isArchived !== true)
      const activeUsers = allUsers.filter(u => u.isArchived !== true);
      setLocalCustomers(activeUsers);
    }
  }, [allUsers]);

  // Fetch Workers
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!isAdmin) return;
      setWorkersLoading(true);
      try {
        const q = query(collection(db, "users"), where("role", "in", ["worker", "employee"]));
        const snapshot = await getDocs(q);
        const workerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWorkers(workerList);
      } catch (err) {
        console.error("Failed to fetch workers", err);
        toast({ title: "Worker List Error", description: "Could not load workers list.", variant: "destructive" });
      } finally {
        setWorkersLoading(false);
      }
    };
    fetchWorkers();
  }, [isAdmin, toast]);

  // Filter logic
  const filteredCustomers = useMemo(() => {
    let customers = localCustomers || [];
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      customers = customers.filter(user =>
        (user.fullname?.toLowerCase() || '').includes(lowerTerm) || 
        (user.email?.toLowerCase() || '').includes(lowerTerm) ||
        (user.serviceaddress?.toLowerCase() || '').includes(lowerTerm) 
      );
    }
    
    if (filterPlan !== 'all') {
      customers = customers.filter(user => user.plan?.plan_id === filterPlan); 
    }
    
    return customers;
  }, [localCustomers, searchTerm, filterPlan]);

  // Derive unique plans for filter dropdown
  const planOptions = useMemo(() => {
    const plans = [{ id: 'all', name: 'All Plans' }];
    if (localCustomers.length > 0) {
      const uniquePlans = new Map();
      localCustomers.forEach(user => {
        if (user.plan && user.plan.plan_id && !uniquePlans.has(user.plan.plan_id)) { 
          uniquePlans.set(user.plan.plan_id, user.plan.name);
        }
      });
      uniquePlans.forEach((name, id) => plans.push({ id, name }));
    }
    return plans;
  }, [localCustomers]);

  // --- Handlers ---

  const handleImpersonate = async (customer) => {
    if (impersonatingId) return;
    setImpersonatingId(customer.id);
    
    // Slight delay to show loading state for UX
    await new Promise(resolve => setTimeout(resolve, 600));
    
    startImpersonation(customer.id, customer.fullname || 'User', customer.role || 'customer', customer.email);
    setImpersonatingId(null);
    navigate('/dashboard'); // Navigate to the impersonated dashboard
  };

  // 1. Role Change Handlers
  const handleRoleChangeRequest = (customer, newRole) => {
    if (customer.id === currentUser.uid && newRole !== 'admin') {
      toast({
        title: "Warning",
        description: "You cannot remove your own admin privileges from here for safety.",
        variant: "destructive"
      });
      return;
    }
    setRoleChangeData({ customer, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeData) return;
    
    setRoleUpdating(true);
    const { customer, newRole } = roleChangeData;

    try {
      const userRef = doc(db, "users", customer.id);
      
      await updateDoc(userRef, { 
        role: newRole,
        roleUpdatedAt: serverTimestamp(),
        roleUpdatedBy: currentUser.uid
      });

      // Optional: Audit Log
      try {
        await addDoc(collection(db, "audit_logs"), {
          action: "ROLE_CHANGE",
          targetUserId: customer.id,
          targetUserName: customer.fullname,
          oldRole: customer.role,
          newRole: newRole,
          changedBy: currentUser.uid,
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.warn("Failed to create audit log", logError);
      }

      // Update local state immediately
      setLocalCustomers(prev => prev.map(c => 
        c.id === customer.id ? { ...c, role: newRole } : c
      ));

      toast({ 
        title: "Role Updated", 
        description: `User permissions updated to ${newRole}.`,
        variant: "default"
      });

    } catch (err) {
      console.error("Role update error:", err);
      toast({ 
        title: "Update Failed", 
        description: "Could not update user role. Check permissions.", 
        variant: "destructive" 
      });
    } finally {
      setRoleUpdating(false);
      setRoleChangeData(null);
    }
  };

  // 2. Assignment Handlers
  const handleAssignmentChange = (customer, workerId) => {
    if (workerId === 'unassigned') {
      setPendingAssignment({
        customer,
        workerId: null,
        workerName: null,
        type: 'clear'
      });
    } else {
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        setPendingAssignment({
          customer,
          workerId: worker.id,
          workerName: worker.fullname || worker.email,
          type: 'assign'
        });
      }
    }
  };

  const confirmAssignment = async () => {
    if (!pendingAssignment) return;
    
    setAssigningLoading(true);
    const { customer, workerId, workerName, type } = pendingAssignment;

    try {
      const userRef = doc(db, "users", customer.id);
      
      const updateData = {
        assignedWorkerId: workerId,
        assignedWorkerName: workerName
      };

      await updateDoc(userRef, updateData);

      // Update local state immediately
      setLocalCustomers(prev => prev.map(c => 
        c.id === customer.id ? { ...c, ...updateData } : c
      ));

      toast({ 
        title: type === 'assign' ? "Worker Assigned" : "Assignment Cleared", 
        description: type === 'assign' ? `Customer assigned to ${workerName}` : "Worker assignment removed.",
        variant: "default"
      });

    } catch (err) {
      console.error("Assignment error:", err);
      toast({ title: "Assignment Failed", description: "Could not update worker assignment.", variant: "destructive" });
    } finally {
      setAssigningLoading(false);
      setPendingAssignment(null);
    }
  };

  // 3. General Action Handlers
  const handleView = (customer) => {
    // Navigate to full details page
    navigate(`/admin/customers/${customer.id}`);
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleDeleteClick = (customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  };

  // Callback from EditCustomerModal
  const handleEditSuccess = async (updatedCustomer) => {
    setLocalCustomers(prev => 
      prev.map(c => c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c)
    );
    try {
      await fetchAllUsersDataForAdmin();
    } catch (err) {
      console.error("Background refresh failed", err);
    }
  };

  const handleRefresh = useCallback(() => {
    if (!loadingAuth && isAdmin && currentUser) {
        try {
            fetchAllUsersDataForAdmin();
        } catch (err) {
            console.error("Manual refresh failed", err);
            toast({
                title: "Refresh Error",
                description: "Failed to refresh data.",
                variant: "destructive"
            });
        }
    }
  }, [loadingAuth, isAdmin, currentUser, fetchAllUsersDataForAdmin, toast]);

  const handleArchiveCustomer = async (customer) => {
    if (!currentUser || !isAdmin) return;

    try {
      const userRef = doc(db, "users", customer.id);
      await updateDoc(userRef, {
        isArchived: true,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "User Archived",
        description: "User archived successfully.",
        variant: "default",
      });

      setLocalCustomers(prev => prev.filter(c => c.id !== customer.id));
      
    } catch (error) {
      console.error("Error archiving user:", error);
      toast({
        title: "Archive Failed",
        description: "Failed to archive user.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!currentUser || !isAdmin) return;

    try {
      const batch = writeBatch(db);
      const userRef = doc(db, "users", customer.id);
      batch.delete(userRef);

      const plansQuery = query(
        collection(db, "userPlans"), 
        where("userId", "==", customer.id)
      );
      const planDocs = await getDocs(plansQuery);
      planDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({
        title: "User Deleted",
        description: "Firestore record removed.",
        variant: "default",
      });

      setLocalCustomers(prev => prev.filter(c => c.id !== customer.id));

    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  // Helper for Initials Badge
  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--brand-accent-red))]" />
        <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-lg">
        <h3 className="text-xl font-bold text-red-500 mb-2">Error Loading Customers</h3>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={fetchAllUsersDataForAdmin} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8 w-full pb-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--brand-cream))]">
          Customer Management
        </h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={loadingAdminData}
          className="border-[hsl(var(--brand-accent-red))]/30 hover:bg-[hsl(var(--brand-accent-red))]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingAdminData ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 backdrop-blur-md border-[hsl(var(--brand-deep-red))]/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
              <Users className="h-5 w-5 text-[hsl(var(--brand-accent-red))]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{localCustomers.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 backdrop-blur-md border-[hsl(var(--brand-deep-red))]/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Filtering</CardTitle>
              <Filter className="h-5 w-5 text-[hsl(var(--brand-accent-red))]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{filteredCustomers.length}</div>
            </CardContent>
          </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 backdrop-blur-md border-[hsl(var(--brand-deep-red))]/20 shadow-xl overflow-hidden">
        <CardHeader className="space-y-6 p-6 border-b border-[hsl(var(--brand-deep-red))]/10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-[hsl(var(--brand-cream))]">Customer Directory</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                View, edit, and manage all registered customer accounts.
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-grow sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30 focus:border-[hsl(var(--brand-accent-red))]"
                />
              </div>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-full sm:w-[180px] bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader className="bg-[hsl(var(--brand-deep-red))]/10">
                  <TableRow className="border-b border-[hsl(var(--brand-deep-red))]/20 hover:bg-transparent">
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold">Name</TableHead>
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold w-[160px]">Account Type</TableHead>
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold">Email</TableHead>
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold w-[220px]">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" /> Dispatcher
                      </div>
                    </TableHead>
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold">Address</TableHead>
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold">Pickup Day</TableHead>
                    <TableHead className="text-[hsl(var(--brand-accent-red))] font-semibold text-center w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAdminData && localCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Loading customer data...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length > 0 ? (
                    <AnimatePresence>
                      {filteredCustomers.map((user) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-[hsl(var(--brand-deep-red))]/10 hover:bg-[hsl(var(--brand-deep-red))]/5 transition-colors group"
                        >
                          <TableCell className="font-medium text-foreground py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[hsl(var(--brand-deep-red))]/20 flex items-center justify-center text-[hsl(var(--brand-accent-red))] text-xs font-bold shrink-0">
                                {user.fullname ? user.fullname.substring(0,2).toUpperCase() : '??'}
                              </div>
                              <div className="flex flex-col">
                                <span>{user.fullname || 'N/A'}</span>
                                {user.assignedWorkerName && (
                                  <span 
                                    className="inline-flex md:hidden items-center text-[10px] text-blue-400 font-medium"
                                    title={`Assigned to ${user.assignedWorkerName}`}
                                  >
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    {user.assignedWorkerName}
                                  </span>
                                )}
                              </div>
                              {user.assignedWorkerName && (
                                <div 
                                  className="hidden md:flex bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5 text-[10px] font-semibold items-center gap-1 cursor-help whitespace-nowrap"
                                  title={`Assigned to: ${user.assignedWorkerName}`}
                                >
                                  {getInitials(user.assignedWorkerName)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                             <Select
                               value={user.role || 'customer'}
                               onValueChange={(val) => handleRoleChangeRequest(user, val)}
                               disabled={roleUpdating && roleChangeData?.customer?.id === user.id}
                             >
                               <SelectTrigger 
                                 className={`w-[130px] h-8 text-xs border-0 ring-1 ring-inset ring-[hsl(var(--brand-deep-red))]/20 bg-[hsl(var(--brand-dark-mode-bg))]/30 ${
                                   user.role === 'admin' ? 'text-[hsl(var(--brand-accent-red))]' : ''
                                 }`}
                               >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-[hsl(var(--brand-accent-red))]' : user.role === 'worker' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                    <SelectValue />
                                  </div>
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="customer">Customer</SelectItem>
                                 <SelectItem value="worker">Worker</SelectItem>
                                 <SelectItem value="admin">Admin</SelectItem>
                               </SelectContent>
                             </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Select 
                               value={user.assignedWorkerId || "unassigned"} 
                               onValueChange={(val) => handleAssignmentChange(user, val)}
                               disabled={workersLoading}
                            >
                               <SelectTrigger className="w-full md:w-[200px] h-8 text-xs bg-[hsl(var(--brand-dark-mode-bg))]/50 border-[hsl(var(--brand-deep-red))]/30">
                                 <SelectValue placeholder="Unassigned" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="unassigned" className="text-muted-foreground italic">Unassigned</SelectItem>
                                 {workersLoading ? (
                                   <div className="p-2 text-xs text-center flex items-center justify-center gap-2">
                                     <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                                   </div>
                                 ) : workers.map(w => (
                                   <SelectItem key={w.id} value={w.id} className="text-xs">
                                     <span className="flex items-center gap-2">
                                       <span className="font-mono text-[10px] bg-slate-800 rounded px-1">{getInitials(w.fullname || w.email)}</span>
                                       {w.fullname || w.email}
                                     </span>
                                   </SelectItem>
                                 ))}
                                 <div className="border-t my-1" />
                                 <SelectItem value="unassigned" className="text-xs text-red-400 focus:text-red-400">
                                   <span className="flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear Assignment</span>
                                 </SelectItem>
                               </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate" title={user.serviceaddress}>
                            {user.street_address ? `${user.street_address}, ${user.city}` : (user.serviceaddress || 'N/A')}
                          </TableCell>
                          <TableCell>
                            {(user.pickupday || user.pickup_day) ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {user.pickupday || user.pickup_day}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Not Set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleView(user)}
                                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleImpersonate(user)}
                                    disabled={impersonatingId === user.id}
                                    className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                                  >
                                    {impersonatingId === user.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Users className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View as this User</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEdit(user)}
                                    className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit User</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteClick(user)}
                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete/Archive</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No customers found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Assignment */}
      <AlertDialog open={!!pendingAssignment} onOpenChange={(open) => !open && setPendingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAssignment?.type === 'clear' ? "Clear Worker Assignment?" : "Confirm Worker Assignment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAssignment?.type === 'clear' 
                ? `Are you sure you want to remove the assigned worker from ${pendingAssignment?.customer?.fullname}?`
                : `Are you sure you want to assign ${pendingAssignment?.customer?.fullname} to ${pendingAssignment?.workerName}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assigningLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmAssignment();
              }}
              disabled={assigningLoading}
              className="bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))]"
            >
              {assigningLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pendingAssignment?.type === 'clear' ? "Clear Assignment" : "Confirm Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      
      <EditCustomerModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        customer={selectedCustomer}
        onSuccess={handleEditSuccess}
      />
      
      {/* Role Change Confirmation Dialog */}
      <RoleChangeDialog 
        open={!!roleChangeData}
        onOpenChange={(open) => !open && setRoleChangeData(null)}
        data={roleChangeData}
        onConfirm={confirmRoleChange}
        loading={roleUpdating}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        customer={selectedCustomer}
        onArchive={handleArchiveCustomer}
        onDelete={handleDeleteCustomer}
      />
    </motion.div>
  );
};

export default AdminCustomers;