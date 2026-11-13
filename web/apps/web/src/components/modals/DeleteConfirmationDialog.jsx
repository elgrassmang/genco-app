import React, { useState } from 'react';
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
import { Loader2, Trash2, Archive, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";

const DeleteConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  customer, 
  onArchive, 
  onDelete 
}) => {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null); // 'archive' or 'delete'

  if (!customer) return null;

  const handleArchiveClick = async (e) => {
    e.preventDefault();
    setLoading(true);
    setActionType('archive');
    try {
      await onArchive(customer);
      // The parent component should handle closing the dialog upon success if desired,
      // but usually we close it here after the promise resolves.
      onOpenChange(false);
    } catch (error) {
      console.error("Archive failed", error);
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleDeleteClick = async (e) => {
    e.preventDefault();
    setLoading(true);
    setActionType('delete');
    try {
      await onDelete(customer);
      onOpenChange(false);
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[hsl(var(--brand-dark-mode-bg))]/95 backdrop-blur-xl border-[hsl(var(--brand-deep-red))]/30 text-foreground sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Manage Customer Account
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-3">
            <p>
              Choose an action for <span className="font-bold text-foreground">{customer.fullname}</span>.
            </p>
            <div className="text-sm bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-amber-200/90">
              <strong>Recommendation:</strong> Archive the user to hide them from the dashboard while preserving their data.
            </div>
            <p className="text-xs text-red-400/80 mt-2">
              <strong>Warning:</strong> Delete is permanent. Firestore record will be removed. To fully revoke login access, you must also delete the user manually from the Firebase Auth Console.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel 
            disabled={loading}
            className="mt-0 bg-transparent border-[hsl(var(--brand-deep-red))]/30 hover:bg-[hsl(var(--brand-deep-red))]/10"
          >
            Cancel
          </AlertDialogCancel>
          
          <Button
            onClick={handleArchiveClick}
            disabled={loading}
            variant="outline"
            className="bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-400"
          >
            {loading && actionType === 'archive' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            {loading && actionType === 'archive' ? 'Archiving...' : 'Archive User'}
          </Button>

          <Button
            onClick={handleDeleteClick}
            disabled={loading}
            className="bg-[hsl(var(--brand-deep-red))] hover:bg-red-700 text-white border-0"
          >
            {loading && actionType === 'delete' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {loading && actionType === 'delete' ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;