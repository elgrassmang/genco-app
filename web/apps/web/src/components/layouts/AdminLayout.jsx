import React, { useState, useEffect } from 'react';
    import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
    import { Menu, X, LogOut, LayoutDashboard, Users, Route as RouteIcon, CreditCard, Home, ChevronLeft, ChevronRight, Sun, Moon, ShieldCheck } from 'lucide-react';
    import { useAuth } from '@/contexts/AuthContext';
    import { useTheme } from '@/contexts/ThemeContext';
    import { motion, AnimatePresence } from 'framer-motion';

    const LOGO_URL = "https://storage.googleapis.com/hostinger-horizons-assets-prod/6771a81f-bd0f-4d27-ba89-72f47e1d63bc/65f88e0b61f5b39c1a448ceaecb453da.png";

    const AdminLayout = () => {
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
      const [isSidebarOpen, setIsSidebarOpen] = useState(true);
      const { user, logout, isAdmin, loadingAuth } = useAuth();
      const { theme, toggleTheme } = useTheme();
      const location = useLocation();
      const navigate = useNavigate();

      useEffect(() => {
        if (!loadingAuth && !isAdmin) {
          navigate('/dashboard');
        }
      }, [loadingAuth, isAdmin, navigate]);

      const handleLogout = async () => {
        await logout();
        navigate('/welcome');
      };

      const navLinks = [
        { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Customers', href: '/admin/customers', icon: Users },
        { name: 'Routes', href: '/admin/routes', icon: RouteIcon },
        { name: 'Billing', href: '/admin/billing', icon: CreditCard },
        { name: 'Back to App', href: '/dashboard', icon: Home },
      ];

      const sidebarVariants = {
        open: { width: '260px', padding: '1rem', opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        closed: { width: '80px', padding: '1rem', opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
      };

      const contentVariants = {
        expanded: { marginLeft: '260px', transition: { type: 'spring', stiffness: 300, damping: 25 } },
        collapsed: { marginLeft: '80px', transition: { type: 'spring', stiffness: 300, damping: 25 } },
      };
      
      const mobileContentVariants = {
        initial: { marginLeft: '0px' },
      };

      if (loadingAuth) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading Admin Panel...</div>;
      }

      if (!isAdmin) {
        return null; // Will redirect via useEffect
      }

      return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[hsl(var(--brand-cream))/0.2] bg-[hsl(var(--brand-dark))] px-4 sm:px-6 shadow-md text-[hsl(var(--brand-cream))]">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-white mr-2">
                {isSidebarOpen ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                <span className="sr-only">Toggle sidebar</span>
              </Button>
              <Link to="/admin" className="flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-[hsl(var(--brand-accent-red))]" />
                <span className="text-xl font-semibold hidden sm:inline-block">Admin Panel</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm hidden lg:inline">Welcome, {user?.email || 'Admin'}</span>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme} 
                className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))]"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-white">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-white">
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] bg-[hsl(var(--brand-dark))] p-0 text-[hsl(var(--brand-cream))] flex flex-col">
                   <div className="p-5 border-b border-[hsl(var(--brand-cream))/0.2]">
                      <Link to="/admin" className="flex items-center gap-3 mb-4" onClick={() => setMobileMenuOpen(false)}>
                        <ShieldCheck className="h-8 w-8 text-[hsl(var(--brand-accent-red))]" />
                        <span className="text-xl font-semibold">Admin Panel</span>
                      </Link>
                       {user && <p className="text-sm text-[hsl(var(--brand-cream))/0.8]">Admin: {user.email}</p>}
                    </div>
                  <nav className="flex-grow p-4 space-y-2">
                    {navLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors duration-150
                          ${location.pathname === link.href ? 'bg-[hsl(var(--brand-accent-red))] text-white' : 'hover:bg-[hsl(var(--brand-accent-red))/0.8] hover:text-white'}`}
                      >
                        <link.icon className="h-5 w-5" />
                        {link.name}
                      </Link>
                    ))}
                  </nav>
                  <div className="p-4 mt-auto border-t border-[hsl(var(--brand-cream))/0.2]">
                     <Button 
                        onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} 
                        className="w-full mb-2 bg-transparent border border-[hsl(var(--brand-cream))/0.5] hover:bg-[hsl(var(--brand-accent-red))] text-[hsl(var(--brand-cream))] flex items-center gap-2"
                      >
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />} 
                        Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                      </Button>
                    <Button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))] text-white flex items-center gap-2">
                      <LogOut className="h-5 w-5" /> Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>
          
          <div className="flex flex-1 w-full">
            <motion.aside 
              variants={sidebarVariants}
              initial={false}
              animate={isSidebarOpen ? "open" : "closed"}
              className="hidden md:flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] z-30 bg-[hsl(var(--brand-dark))] text-[hsl(var(--brand-cream))] border-r border-[hsl(var(--brand-cream))/0.1] overflow-y-auto overflow-x-hidden shadow-lg"
            >
              <nav className="flex-grow space-y-1.5 pt-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    title={link.name}
                    className={`flex items-center mx-2 rounded-lg px-3 py-3 transition-colors duration-150 group
                      ${location.pathname === link.href ? 'bg-[hsl(var(--brand-accent-red))] text-white shadow-inner' : 'hover:bg-[hsl(var(--brand-accent-red))/0.8] hover:text-white'}
                      ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
                  >
                    <link.icon className={`h-6 w-6 shrink-0 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`} />
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2, delay: 0.1 }}
                          className="whitespace-nowrap text-sm font-medium"
                        >
                          {link.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                ))}
              </nav>
               <div className={`p-2 mt-auto border-t border-[hsl(var(--brand-cream))/0.1] ${isSidebarOpen ? 'mx-2' : ''}`}>
                <Button 
                  onClick={handleLogout} 
                  variant="ghost"
                  title="Logout"
                  className={`w-full text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-white flex items-center gap-2 ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-0'}`}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <AnimatePresence>
                    {isSidebarOpen && (
                       <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2, delay: 0.1 }}
                          className="whitespace-nowrap text-sm font-medium"
                        >
                          Logout
                        </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </motion.aside>

            <motion.main 
              layout 
              variants={window.innerWidth >= 768 ? contentVariants : mobileContentVariants} 
              initial={false}
              animate={isSidebarOpen ? "expanded" : "collapsed"}
              className="flex-1 w-full overflow-y-auto p-6 md:p-8 lg:p-10"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname + theme}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </motion.main>
          </div>
        </div>
      );
    };

    export default AdminLayout;