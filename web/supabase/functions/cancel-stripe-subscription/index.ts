import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
    import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    serve(async (req) => {
      if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } });
      }

      try {
        const { subscription_id: subscriptionId } = await req.json();

        if (!subscriptionId) {
          return new Response(JSON.stringify({ error: 'Subscription ID is required.' }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
          });
        }
        
        console.log(`Attempting to cancel Stripe subscription: ${subscriptionId}`);
        const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
        console.log(`Stripe subscription ${subscriptionId} cancelled successfully.`);

        const { error: dbError } = await supabaseAdmin
          .from('user_plans')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId);

        if (dbError) {
          console.error('Error updating subscription status in DB:', dbError);
          
        }

        return new Response(JSON.stringify({ success: true, subscription: deletedSubscription }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        });
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to cancel subscription.' }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        });
      }
    });