import React, { useState } from 'react';
    import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; 
    import { Menu, X, LogOut, User, LayoutDashboard, CreditCard, CalendarDays, ShieldCheck, Sun, Moon } from 'lucide-react';
    import { useAuth } from '@/contexts/AuthContext';
    import { useTheme } from '@/contexts/ThemeContext';
    import { motion, AnimatePresence } from 'framer-motion';

    const LOGO_URL = "https://storage.googleapis.com/hostinger-horizons-assets-prod/6771a81f-bd0f-4d27-ba89-72f47e1d63bc/65f88e0b61f5b39c1a448ceaecb453da.png";


    const AppLayout = () => {
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
      const { user, logout, isAdmin } = useAuth();
      const { theme, toggleTheme } = useTheme();
      const navigate = useNavigate();
      const location = useLocation(); 

      const handleLogout = async () => {
        await logout();
        navigate('/welcome');
      };

      const navLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Manage Plan', href: '/plan-selection', icon: CreditCard },
        { name: 'Service Schedule', href: '/schedule', icon: CalendarDays },
        { name: 'My Profile', href: '/profile-setup', icon: User },
      ];

      if (isAdmin) {
        navLinks.push({ name: 'Admin Panel', href: '/admin', icon: ShieldCheck });
      }
      
      return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(var(--brand-cream))/0.2] bg-[hsl(var(--brand-dark))] px-4 sm:px-6 shadow-md">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2">
                <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
                <span className="text-xl font-semibold text-[hsl(var(--brand-cream))] hidden sm:inline-block">Just Bin-ness</span>
              </Link>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {location.pathname !== '/dashboard' && (
                 <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/dashboard')} 
                  className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))] hidden md:flex items-center gap-2"
                  aria-label="Go to Dashboard"
                >
                  <LayoutDashboard className="h-5 w-5" /> 
                  <span className="hidden lg:inline">Dashboard</span>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))] hidden md:flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> 
                  <span className="hidden lg:inline">Admin</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme} 
                className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))]"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))]">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="text-[hsl(var(--brand-cream))] hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))]">
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-[hsl(var(--brand-dark))] p-0 text-[hsl(var(--brand-cream))] border-l border-[hsl(var(--brand-cream))/0.2]">
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-[hsl(var(--brand-cream))/0.2]">
                      <Link to="/dashboard" className="flex items-center gap-2 mb-4" onClick={() => setMobileMenuOpen(false)}>
                        <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
                        <span className="text-xl font-semibold text-[hsl(var(--brand-cream))]">Just Bin-ness</span>
                      </Link>
                      {user && <p className="text-sm text-[hsl(var(--brand-cream))/0.8]">Welcome, {user.email?.split('@')[0]}</p>}
                    </div>
                    <nav className="flex-grow p-4 space-y-2">
                      {navLinks.map((link) => (
                        <Link
                          key={link.name}
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium hover:bg-[hsl(var(--brand-accent-red))] hover:text-[hsl(var(--brand-cream))] transition-colors duration-150 ${location.pathname === link.href ? 'bg-[hsl(var(--brand-accent-red))] text-[hsl(var(--brand-cream))]' : 'text-[hsl(var(--brand-cream))/0.9]'}`}
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
                      <Button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full bg-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-deep-red))] text-[hsl(var(--brand-cream))] flex items-center gap-2">
                        <LogOut className="h-5 w-5" /> Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>
          
          <div className="flex flex-1 w-full">
            <main 
              className="flex-1 w-full overflow-y-auto p-4 sm:p-6 md:p-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname + theme} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      );
    };

    export default AppLayout;