import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

    const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    serve(async (req) => {
      const signature = req.headers.get('Stripe-Signature');
      const body = await req.text();
      const webhookSigningSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');

      let event;
      try {
        if (!signature || !webhookSigningSecret) {
          console.error('Webhook Error: Missing Stripe signature or signing secret.');
          return new Response('Webhook Error: Missing Stripe signature or signing secret.', { status: 400 });
        }
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSigningSecret, undefined, Stripe.createSubtleCryptoProvider());
      } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }

      console.log('Received Stripe event:', event.type, event.data.object.id);

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const subscriptionId = session.subscription;
            const planId = session.metadata?.plan_id; 
            const planName = session.metadata?.plan_name;
            const planPrice = session.metadata?.plan_price;
            const stripePriceId = session.metadata?.stripe_price_id;


            if (!userId || !subscriptionId || !planId || !planName || !planPrice || !stripePriceId) {
              console.error('Webhook Error: Missing metadata in checkout.session.completed', session);
              return new Response('Webhook Error: Missing metadata.', { status: 400 });
            }
            
            console.log(`Processing checkout.session.completed for user ${userId}, subscription ${subscriptionId}`);

            const { data: existingPlan, error: fetchError } = await supabaseAdmin
              .from('user_plans')
              .select('id')
              .eq('user_id', userId)
              .eq('stripe_subscription_id', subscriptionId)
              .maybeSingle();

            if (fetchError) {
                console.error('Error fetching existing plan:', fetchError);
            }
            
            if (existingPlan) {
                console.log(`Subscription ${subscriptionId} already processed. Updating status.`);
                 const { error: updateError } = await supabaseAdmin
                    .from('user_plans')
                    .update({ status: 'active' })
                    .eq('id', existingPlan.id);
                if (updateError) throw updateError;
            } else {
                console.log(`No existing plan found for subscription ${subscriptionId}. Creating new one.`);
                 const { error: insertError } = await supabaseAdmin
                    .from('user_plans')
                    .upsert({
                        user_id: userId,
                        plan_id: planId,
                        name: planName,
                        price: planPrice,
                        stripe_price_id: stripePriceId,
                        stripe_subscription_id: subscriptionId,
                        status: 'active',
                    }, { onConflict: 'user_id, stripe_subscription_id' });
                 if (insertError) throw insertError;
            }
            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;
            if (subscriptionId) {
              console.log(`Processing invoice.payment_succeeded for subscription ${subscriptionId}`);
              const { error } = await supabaseAdmin
                .from('user_plans')
                .update({ status: 'active' })
                .eq('stripe_subscription_id', subscriptionId);
              if (error) throw error;
            }
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;
            if (subscriptionId) {
              console.log(`Processing invoice.payment_failed for subscription ${subscriptionId}`);
              const { error } = await supabaseAdmin
                .from('user_plans')
                .update({ status: 'payment_failed' }) 
                .eq('stripe_subscription_id', subscriptionId);
              if (error) throw error;
            }
            break;
          }
          
          case 'customer.subscription.updated': {
            const subscription = event.data.object;
            console.log(`Processing customer.subscription.updated for subscription ${subscription.id}`);
            const newStatus = subscription.status; 
            const planId = subscription.items.data[0]?.price?.lookup_key || subscription.items.data[0]?.price?.id;
            
            const { error } = await supabaseAdmin
              .from('user_plans')
              .update({ 
                status: newStatus,
                plan_id: planId, 
              })
              .eq('stripe_subscription_id', subscription.id);
            if (error) throw error;
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            console.log(`Processing customer.subscription.deleted for subscription ${subscription.id}`);
            const { error } = await supabaseAdmin
              .from('user_plans')
              .update({ status: 'cancelled' })
              .eq('stripe_subscription_id', subscription.id);
            if (error) throw error;
            break;
          }

          default:
            console.log(`Unhandled event type ${event.type}`);
        }
      } catch (error) {
        console.error('Error processing webhook event:', error);
        return new Response(`Webhook handler failed: ${error.message || error}`, { status: 500 });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    });