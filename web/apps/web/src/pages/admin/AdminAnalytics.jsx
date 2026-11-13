import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminData } from '@/contexts/AdminDataContext';
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const SimpleBarChart = ({ data, color = "bg-blue-500" }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="flex items-end gap-2 h-40 w-full pt-4">
       {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
             <div 
               className={`w-full rounded-t-sm transition-all duration-500 ${color} opacity-70 group-hover:opacity-100`} 
               style={{ height: `${(d.value / max) * 100}%` }}
             />
             <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.label}</span>
          </div>
       ))}
    </div>
  );
};

const AdminAnalytics = () => {
  const { allUsers } = useAdminData();
  const [timeRange, setTimeRange] = useState('month');

  // Metrics Calculation (Mocked logic based on available data)
  const activeCustomers = allUsers.filter(u => u.subscription_status === 'active').length;
  const leads = allUsers.filter(u => u.role === 'lead' || u.status === 'lead').length;
  const totalRevenue = activeCustomers * 49; // Mock avg revenue
  
  // Mock Data for Charts
  const workerPerformance = [
    { label: 'Mike', value: 145 },
    { label: 'Sarah', value: 132 },
    { label: 'John', value: 98 },
    { label: 'Emma', value: 165 },
    { label: 'David', value: 120 },
  ];

  const signupTrends = [
    { label: 'Wk 1', value: 12 },
    { label: 'Wk 2', value: 19 },
    { label: 'Wk 3', value: 15 },
    { label: 'Wk 4', value: 24 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 pb-12"
    >
       <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[hsl(var(--brand-cream))]">Analytics Dashboard</h1>
          <Select value={timeRange} onValueChange={setTimeRange}>
             <SelectTrigger className="w-[180px] bg-[hsl(var(--brand-dark-mode-bg))]/50">
                <SelectValue placeholder="Time Range" />
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
             </SelectContent>
          </Select>
       </div>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 border-[hsl(var(--brand-deep-red))]/20">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Customers</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">{activeCustomers}</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
             </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 border-[hsl(var(--brand-deep-red))]/20">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Est. Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Based on active plans</p>
             </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 border-[hsl(var(--brand-deep-red))]/20">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
                <Activity className="h-4 w-4 text-amber-500" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">{leads}</div>
                <p className="text-xs text-muted-foreground">Potential conversions</p>
             </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/70 border-[hsl(var(--brand-deep-red))]/20">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">98.5%</div>
                <p className="text-xs text-muted-foreground">Service reliability</p>
             </CardContent>
          </Card>
       </div>

       {/* Charts Section */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/60 border-[hsl(var(--brand-deep-red))]/20">
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Bins Cleaned by Worker</CardTitle>
             </CardHeader>
             <CardContent>
                <SimpleBarChart data={workerPerformance} color="bg-[hsl(var(--brand-accent-red))]" />
             </CardContent>
          </Card>

          <Card className="bg-[hsl(var(--brand-dark-mode-bg))]/60 border-[hsl(var(--brand-deep-red))]/20">
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> New Signups (Weekly)</CardTitle>
             </CardHeader>
             <CardContent>
                <SimpleBarChart data={signupTrends} color="bg-green-500" />
             </CardContent>
          </Card>
       </div>
    </motion.div>
  );
};

export default AdminAnalytics;