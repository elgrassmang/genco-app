import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = 'https://uqeofinlznwgvkyygtjk.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZW9maW5sem53Z3ZreXlndGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzE1NjEsImV4cCI6MjA2MjIwNzU2MX0.0BQlPsDUbTk9Mp-oZJsS9uGl-bOq4ZPJZvirNfamKxE';

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);