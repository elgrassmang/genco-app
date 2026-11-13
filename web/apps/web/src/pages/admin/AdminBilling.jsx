import React, { useEffect } from 'react';
    import { DollarSign, Filter, Search } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { motion } from 'framer-motion';
    import { useAdminData } from '@/contexts/AdminDataContext'; 
    import { useToast } from '@/components/ui/use-toast';
    import { useAuth } from '@/contexts/AuthContext';
    import { useNavigate } from 'react-router-dom';

    const AdminBilling = () => {
      const { allUsers, error } = useAdminData(); 
      const { toast } = useToast();
      const { isAdmin } = useAuth();
      const navigate = useNavigate();
      const [searchTerm, setSearchTerm] = React.useState('');
      const [filterStatus, setFilterStatus] = React.useState('all');
      const [filteredTransactions, setFilteredTransactions] = React.useState([]);

      useEffect(() => {
        if (!isAdmin) {
            navigate('/dashboard');
        }
      }, [isAdmin, navigate]);

      const mockTransactions = React.useMemo(() => {
        if (!allUsers) return [];
        return allUsers.flatMap(user => {
          if (user.plan && user.plan.price) {
            let amount = 0;
            try {
              const priceString = user.plan.price; 
              const numericPart = priceString.replace(/[^0-9.]/g, ''); 
              amount = parseFloat(numericPart);
              if (isNaN(amount)) amount = 0;
            } catch (e) {
              console.error("Error parsing plan price for mock transaction:", user.plan.price, e);
              amount = 0;
            }

            return [{
              id: `txn_${user.id}_${user.plan.plan_id || 'no_plan_id'}`,
              customerName: user.fullname || 'N/A', 
              customerEmail: user.email,
              planName: user.plan.name,
              amount: amount,
              date: user.plan.updated_at ? new Date(user.plan.updated_at).toLocaleDateString() : (user.plan.created_at ? new Date(user.plan.created_at).toLocaleDateString() : new Date().toLocaleDateString()),
              status: user.plan.status === 'active' || user.plan.status === 'trialing' ? 'Paid' : (user.plan.status === 'canceled' ? 'Cancelled' : 'Pending'), 
            }];
          }
          return [];
        });
      }, [allUsers]);

      React.useEffect(() => {
        let transactions = mockTransactions;
        if (searchTerm) {
          transactions = transactions.filter(txn =>
            txn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.planName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (filterStatus !== 'all') {
          transactions = transactions.filter(txn => txn.status.toLowerCase() === filterStatus.toLowerCase());
        }
        setFilteredTransactions(transactions);
      }, [mockTransactions, searchTerm, filterStatus]);

      const billingStatusOptions = ["all", "Paid", "Pending", "Cancelled"];

      const totalRevenue = filteredTransactions
        .filter(txn => txn.status === 'Paid')
        .reduce((sum, txn) => sum + txn.amount, 0);

      if (error) {
        return <div className="p-6 text-red-500">Error loading billing data: {error.message}</div>;
      }

      return (
        <motion.div
          className="space-y-10 w-full"
          initial={{ opacity: 0, y:20 }}
          animate={{ opacity: 1, y:0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--brand-cream))]">Billing Management</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base font-medium text-[hsl(var(--brand-cream))/0.8]">Total Revenue (Filtered)</CardTitle>
                  <DollarSign className="h-6 w-6 text-[hsl(var(--brand-accent-red))]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
                </CardContent>
            </Card>
            <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base font-medium text-[hsl(var(--brand-cream))/0.8]">Total Transactions</CardTitle>
                  <DollarSign className="h-6 w-6 text-[hsl(var(--brand-accent-red))]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{filteredTransactions.length}</div>
                </CardContent>
            </Card>
          </div>

          <Card className="bg-[hsl(var(--brand-dark)/0.7)] glassmorphism shadow-xl">
            <CardHeader className="space-y-6 p-6">
              <div>
                <CardTitle className="text-2xl text-[hsl(var(--brand-cream))]">Transaction List</CardTitle>
                <CardDescription className="text-[hsl(var(--brand-cream))/0.8] mt-1">
                  This is a simplified view based on user plan status. Actual Stripe integration would provide more robust data.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full sm:w-auto">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--brand-accent-red))]" />
                  <Input
                    type="search"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-11 w-full bg-[hsl(var(--brand-dark)/0.5)] border-[hsl(var(--brand-deep-red))/0.5] text-white placeholder-[hsl(var(--brand-cream))/0.6] focus:border-[hsl(var(--brand-accent-red))]"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11 bg-[hsl(var(--brand-dark)/0.5)] border-[hsl(var(--brand-deep-red))/0.5] text-white focus:border-[hsl(var(--brand-accent-red))]">
                    <Filter className="h-4 w-4 mr-2 text-[hsl(var(--brand-accent-red))] inline" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--brand-dark))] border-[hsl(var(--brand-deep-red))] text-[hsl(var(--brand-cream))]">
                    {billingStatusOptions.map(status => (
                      <SelectItem key={status} value={status} className="hover:!bg-[hsl(var(--brand-accent-red))]">{status === 'all' ? 'All Statuses' : status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(var(--brand-deep-red))/0.4] hover:bg-[hsl(var(--brand-dark))/0.5]">
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8]">Customer</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8]">Email</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8]">Plan</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8] text-right">Amount</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8] text-center">Date</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8] text-center">Status</TableHead>
                      <TableHead className="text-[hsl(var(--brand-cream))/0.8] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? filteredTransactions.map((txn) => (
                      <TableRow key={txn.id} className="border-[hsl(var(--brand-deep-red))/0.4] hover:bg-[hsl(var(--brand-dark))/0.5]">
                        <TableCell className="font-medium text-white">{txn.customerName}</TableCell>
                        <TableCell className="text-[hsl(var(--brand-cream))/0.9]">{txn.customerEmail}</TableCell>
                        <TableCell className="text-[hsl(var(--brand-cream))/0.9]">{txn.planName}</TableCell>
                        <TableCell className="text-[hsl(var(--brand-cream))/0.9] text-right">${txn.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-[hsl(var(--brand-cream))/0.9] text-center">{txn.date}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full
                            ${txn.status === 'Paid' ? 'bg-green-500/20 text-green-400' :
                              txn.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              txn.status === 'Cancelled' ? 'bg-gray-500/20 text-gray-400' : 
                              'bg-red-500/20 text-red-400'}`}>
                            {txn.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[hsl(var(--brand-cream))/0.8] border-[hsl(var(--brand-accent-red))] hover:bg-[hsl(var(--brand-accent-red))/0.3] hover:text-white"
                            onClick={() => toast({ title: "Action", description: `Viewing details for transaction ${txn.id}`})}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-[hsl(var(--brand-cream))/0.7] py-12">
                          No transactions found matching your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    export default AdminBilling;