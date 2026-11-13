import React from 'react';
    import { Link } from 'react-router-dom';
    import { Users, MapPin, DollarSign, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { motion } from 'framer-motion';
    import { useData } from '@/contexts/DataContext';
    import { useAuth } from '@/contexts/AuthContext';

    const AdminDashboard = () => {
      const { allUsers } = useData();
      const { adminViewMode } = useAuth();

      const totalCustomers = allUsers?.length || 0;
      const activeSubscriptions = allUsers?.filter(u => u.plan).length || 0;
      
      const upcomingPickupsToday = allUsers?.filter(u => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return u.pickupDay === today;
      }).length || 0;

      const issuesReported = 0; 

      const summaryCards = [
        { title: 'Total Customers', value: totalCustomers, icon: <Users className="h-7 w-7 text-[hsl(var(--brand-accent-red))]" />, link: '/admin/customers', color: 'text-blue-400' },
        { title: 'Active Subscriptions', value: activeSubscriptions, icon: <CheckCircle2 className="h-7 w-7 text-[hsl(var(--brand-accent-red))]" />, link: '/admin/billing', color: 'text-green-400' },
        { title: 'Pickups Today', value: upcomingPickupsToday, icon: <MapPin className="h-7 w-7 text-[hsl(var(--brand-accent-red))]" />, link: '/admin/routes', color: 'text-yellow-400' },
        { title: 'Issues Reported', value: issuesReported, icon: <AlertTriangle className="h-7 w-7 text-[hsl(var(--brand-accent-red))]" />, link: '#', color: 'text-red-400' },
      ];

      const quickActions = [
        { label: 'Manage Customers', path: '/admin/customers', icon: <Users /> },
        { label: 'View Routes', path: '/admin/routes', icon: <MapPin /> },
        { label: 'Billing Overview', path: '/admin/billing', icon: <DollarSign /> },
      ];

      return (
        <motion.div 
          className="space-y-10 w-full" 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--brand-cream))]">
              {adminViewMode ? `Admin Dashboard (Viewing as ${adminViewMode.userName})` : 'Admin Dashboard'}
            </h1>
            <p className="text-base text-[hsl(var(--brand-cream))/0.7]">
              Welcome back, Admin! Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            {summaryCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism shadow-lg hover:shadow-[hsl(var(--brand-accent-red))/0.5] transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-6">
                    <CardTitle className="text-base font-medium text-[hsl(var(--brand-cream))/0.8]">{card.title}</CardTitle>
                    {card.icon}
                  </CardHeader>
                  <CardContent className="pb-6 px-6">
                    <div className={`text-4xl font-bold text-white`}>{card.value}</div>
                    <Link to={card.link} className="text-sm text-[hsl(var(--brand-accent-red))] hover:underline mt-1 inline-block">
                      View Details
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <motion.div 
              className="lg:col-span-2 xl:col-span-2" 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism shadow-lg h-full">
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-[hsl(var(--brand-cream))]">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  {quickActions.map(action => (
                    <Button 
                      key={action.label} 
                      variant="outline" 
                      className="w-full justify-start gap-3 text-base py-6 text-[hsl(var(--brand-cream))/0.8] border-[hsl(var(--brand-accent-red))/0.7] hover:bg-[hsl(var(--brand-accent-red))/0.3] hover:text-white"
                      asChild
                    >
                      <Link to={action.path}>{action.icon && React.cloneElement(action.icon, {className: "h-5 w-5"})} {action.label}</Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              className="lg:col-span-3 xl:col-span-3" 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism shadow-lg h-full">
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-[hsl(var(--brand-cream))]">System Status Overview</CardTitle>
                  <CardDescription className="text-[hsl(var(--brand-cream))/0.8] mt-1">
                    A quick glance at key operational metrics. (Simulated data)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                   <div className="flex items-center justify-between p-4 bg-[hsl(var(--brand-dark)/0.5)] rounded-lg">
                        <div>
                            <p className="text-base font-medium text-[hsl(var(--brand-cream))/0.8]">Service Uptime</p>
                            <p className="text-3xl font-bold text-green-400 mt-1">99.9%</p>
                        </div>
                        <BarChart3 className="h-10 w-10 text-green-400"/>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-[hsl(var(--brand-dark)/0.5)] rounded-lg">
                        <div>
                            <p className="text-base font-medium text-[hsl(var(--brand-cream))/0.8]">Avg. Response Time</p>
                            <p className="text-3xl font-bold text-blue-400 mt-1">120ms</p>
                        </div>
                        <BarChart3 className="h-10 w-10 text-blue-400"/>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-[hsl(var(--brand-dark)/0.5)] rounded-lg">
                        <div>
                            <p className="text-base font-medium text-[hsl(var(--brand-cream))/0.8]">New Signups (Last 7 Days)</p>
                            <p className="text-3xl font-bold text-yellow-400 mt-1">{(allUsers?.length || 0) > 5 ? 5 : (allUsers?.length || 0) }</p>
                        </div>
                        <Users className="h-10 w-10 text-yellow-400"/>
                   </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      );
    };

    export default AdminDashboard;