import React from 'react';
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
import { ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

const RoleChangeDialog = ({ 
  open, 
  onOpenChange, 
  data, 
  onConfirm, 
  loading 
}) => {
  if (!data) return null;

  const { customer, newRole } = data;
  
  // Format role names for display
  const formatRole = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
  
  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'text-[hsl(var(--brand-accent-red))]';
      case 'worker': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[hsl(var(--brand-dark-mode-bg))]/95 backdrop-blur-xl border-[hsl(var(--brand-deep-red))]/30 text-foreground sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Change User Permissions
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-4 pt-2">
            <div>
              Are you sure you want to change the role for <span className="font-bold text-foreground">{customer.fullname}</span>?
            </div>
            
            <div className="flex items-center justify-center gap-4 py-4 bg-[hsl(var(--brand-deep-red))]/10 rounded-lg border border-[hsl(var(--brand-deep-red))]/20">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Current Role</div>
                <div className={`font-bold ${getRoleColor(customer.role)}`}>{formatRole(customer.role)}</div>
              </div>
              
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-50" />
              
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">New Role</div>
                <div className={`font-bold ${getRoleColor(newRole)}`}>{formatRole(newRole)}</div>
              </div>
            </div>

            {newRole === 'admin' && (
              <div className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 p-2 rounded">
                <strong>Warning:</strong> Admin users have full access to all system data and settings.
              </div>
            )}
            
            {customer.role === 'admin' && newRole !== 'admin' && (
               <div className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 p-2 rounded">
                <strong>Warning:</strong> You are demoting an admin. They will lose access to the admin dashboard immediately.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className="bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Change
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RoleChangeDialog;