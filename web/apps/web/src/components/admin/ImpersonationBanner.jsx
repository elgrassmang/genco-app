import React from 'react';
import { Eye, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ImpersonationBanner = () => {
  const { adminViewMode, exitImpersonation } = useAuth();
  const navigate = useNavigate();
  const [exiting, setExiting] = React.useState(false);

  const handleExit = async () => {
    setExiting(true);
    // Add small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    exitImpersonation();
    setExiting(false);
    navigate('/admin/customers');
  };

  return (
    <AnimatePresence>
      {adminViewMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-yellow-400 text-yellow-950 sticky top-0 z-50 shadow-md border-b border-yellow-500/30"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm md:text-base">
            <div className="flex items-center gap-3 font-medium">
              <div className="bg-yellow-100 p-1.5 rounded-full">
                <Eye className="h-4 w-4 text-yellow-700" />
              </div>
              <span className="hidden sm:inline">Currently viewing as:</span>
              <span className="font-bold border-b border-yellow-700/20 pb-0.5">
                {adminViewMode.userName || 'User'} ({adminViewMode.userRole})
              </span>
            </div>
            
            <Button
              onClick={handleExit}
              disabled={exiting}
              size="sm"
              variant="ghost"
              className="hover:bg-yellow-500/20 text-yellow-900 font-semibold border border-yellow-600/20 hover:border-yellow-600/40"
            >
              {exiting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exiting...
                </>
              ) : (
                <>
                  Exit View <LogOut className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImpersonationBanner;