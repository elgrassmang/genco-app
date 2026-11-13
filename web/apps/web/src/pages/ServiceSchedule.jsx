import React, { useState, useEffect } from 'react';
    import { Calendar, Bell } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useData } from '@/contexts/DataContext';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { useNavigate } from 'react-router-dom';

    const ServiceSchedule = () => {
      const { profile, plan } = useData();
      const { toast } = useToast();
      const navigate = useNavigate();
      const [nextPickupDate, setNextPickupDate] = useState('');

      useEffect(() => {
        if (profile && profile.pickupday) {
          const getNextPickup = (pickupDayStr) => {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const targetDay = days.indexOf(pickupDayStr);
            if (targetDay === -1) return "Invalid pickup day in profile";
            
            let nextDate = new Date();
            let dayDifference = (targetDay - nextDate.getDay() + 7) % 7;
            if (dayDifference === 0 && nextDate.getHours() >= 12) { 
                dayDifference = 7;
            } else if (dayDifference === 0 && nextDate.getHours() < 12) {
            }
            nextDate.setDate(nextDate.getDate() + dayDifference);
            
            if (plan?.name && plan.name.toLowerCase().includes('biweekly')) {
                const today = new Date();
                const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
                const currentWeekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                
                const nextPickupWeekNumber = Math.ceil(( (nextDate.getTime() - firstDayOfYear.getTime()) / 86400000 + firstDayOfYear.getDay() + 1) / 7 )

                if (nextPickupWeekNumber % 2 !== currentWeekNumber % 2) { 
                    nextDate.setDate(nextDate.getDate() + 7);
                }
            }
            return nextDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          };
          setNextPickupDate(getNextPickup(profile.pickupday));
        }
      }, [profile, plan]);

      const handleSetReminder = () => {
        toast({
          title: "Reminder Set!",
          description: `We'll remind you about your pickup on ${nextPickupDate}. (Simulated)`,
          className: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
        });
      };

      if (!profile) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-[hsl(var(--foreground))] text-xl mb-4">Please complete your profile to view your schedule.</p>
            <Button onClick={() => navigate('/profile-setup')} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
              Go to Profile Setup
            </Button>
          </div>
        );
      }
      
      if (!plan) {
         return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-[hsl(var(--foreground))] text-xl mb-4">You don't have an active plan. Please select one to see your schedule.</p>
            <Button onClick={() => navigate('/plan-selection')} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
              Choose a Plan
            </Button>
          </div>
        );
      }


      return (
        <motion.div 
          className="container mx-auto py-8 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-2xl mx-auto bg-[hsl(var(--card))] glassmorphism shadow-xl border-[hsl(var(--border))]">
            <CardHeader className="text-center">
              <Calendar className="mx-auto h-16 w-16 text-[hsl(var(--primary))] mb-4" />
              <CardTitle className="text-3xl font-bold text-[hsl(var(--card-foreground))]">Your Service Schedule</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6 text-[hsl(var(--card-foreground))]">
              <p className="text-xl text-[hsl(var(--foreground))]">
                Hello, <span className="font-semibold text-[hsl(var(--primary))]">{profile.full_name || 'Valued Customer'}</span>!
              </p>
              {nextPickupDate && profile.pickupday ? (
                <>
                  <p className="text-2xl text-[hsl(var(--muted-foreground))]">
                    Your next bin roll-out is scheduled for:
                  </p>
                  <p className="text-4xl font-bold text-[hsl(var(--primary))] bg-[hsl(var(--background))] py-4 px-6 rounded-lg inline-block shadow-inner">
                    {nextPickupDate}
                  </p>
                  <CardDescription className="text-[hsl(var(--muted-foreground))]">
                    This is based on your <span className="font-medium text-[hsl(var(--foreground))]">{plan.name}</span> and <span className="font-medium text-[hsl(var(--foreground))]">{profile.pickupday}</span> pickup.
                  </CardDescription>
                  <Button onClick={handleSetReminder} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9] text-[hsl(var(--primary-foreground))]">
                    <Bell className="mr-2 h-4 w-4" /> Set Reminder (Simulated)
                  </Button>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] italic">
                    “Genco Can Co. is scheduled to roll your bins on {nextPickupDate}. Just bin-ness.”
                  </p>
                </>
              ) : (
                <p className="text-xl text-[hsl(var(--muted-foreground))]">Please ensure your pickup day is set in your profile to see your schedule.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    export default ServiceSchedule;