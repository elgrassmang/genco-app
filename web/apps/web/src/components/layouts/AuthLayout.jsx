import React from 'react';
    import { Outlet } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Toaster } from '@/components/ui/toaster';
    import { useTheme } from '@/contexts/ThemeContext';


    const AuthLayout = () => {
      const { theme } = useTheme();

      return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 auth-gradient-bg text-foreground transition-colors duration-300`}>
          <motion.div
            key={theme} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <Outlet />
          </motion.div>
          <Toaster />
        </div>
      );
    };

    export default AuthLayout;