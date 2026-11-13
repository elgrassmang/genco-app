import React from 'react';
    import SignupForm from '@/components/SignupForm';
    import { Link } from 'react-router-dom';

    export default function SignupPage() {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
           <div className="absolute top-4 left-4">
            <Link to="/welcome" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              &larr; Back to Welcome
            </Link>
          </div>
          <div className="w-full max-w-md">
            <SignupForm />
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/welcome" className="font-semibold text-primary hover:text-primary/80">
              Log in
            </Link>
          </p>
        </div>
      );
    }