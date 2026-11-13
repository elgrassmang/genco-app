const plans = [
      {
        id: 'plan_conch_weekly',
        name: 'Conch Weekly',
        price: '$15/week', 
        billing_clarifier: 'Billed monthly at $60',
        popular: true, 
        description: 'Our most frequent service! Weekly curbside trash & recycle pickup. Perfect for active households. Up to two 96-gallon cans.',
        features: [
          'Consistent weekly trash pickup',
          'Convenient weekly recycle pickup',
          'Capacity: Up to two 96-gallon cans',
          'Reliable standard curbside service'
        ],
        stripePriceId: 'price_1RGOr3FXYUzgQg5jMwmTE838', 
        stripeTestPriceId: 'price_1RGOr3FXYUzgQg5jMwmTE838' 
      },
      {
        id: 'plan_duval_biweekly',
        name: 'Duval Biweekly',
        price: '$20/week', 
        billing_clarifier: 'Billed monthly at $80 (approx. 4 service weeks/mo)',
        description: 'Balanced & budget-friendly. Biweekly residential trash & recycle curbside service. Generous capacity with up to four 96-gallon cans.',
        features: [
          'Convenient biweekly trash pickup',
          'Easy biweekly recycle pickup',
          'Capacity: Up to four 96-gallon cans',
          'Ideal for moderate waste needs'
        ],
        stripePriceId: 'price_1RGOryFXYUzgQg5j4mjXlKaU',
        stripeTestPriceId: 'price_1RGOryFXYUzgQg5j4mjXlKaU'
      },
      {
        id: 'plan_airbnb_host',
        name: 'Vacation Rental',
        price: '$25/week',
        billing_clarifier: 'Billed monthly at $100',
        description: 'Keep your rental pristine! Flexible trash & recycle service tailored for vacation rentals, including options for on-demand pickups.',
        features: [
          'Guest-ready flexible scheduling',
          'On-demand pickup options',
          'Perfect for vacation rentals & STRs',
          'Dedicated priority support'
        ],
        stripePriceId: 'price_1RHWo7FXYUzgQg5juQVHIv4Q',
        stripeTestPriceId: 'price_1RHWo7FXYUzgQg5juQVHIv4Q'
      },
      {
        id: 'plan_res_apt_condo',
        name: 'Res. Apt./Condo',
        price: '$25/week',
        billing_clarifier: 'Billed monthly at $100',
        description: 'Streamlined for community living. Specialized trash service designed for residential apartments and condos.',
        features: [
          'Tailored for apartments/condos',
          'Regular, dependable scheduled pickups',
          'Space-efficient & compact solution',
          'Promotes a clean community environment'
        ],
        stripePriceId: 'price_1RMCjoFXYUzgQg5juiQEfzT8',
        stripeTestPriceId: 'price_1RMCjoFXYUzgQg5juiQEfzT8'
      }
    ];
    
    export const getPlans = () => plans;
    
    export const getPlanById = (id) => plans.find(plan => plan.id === id);
    
    export const getStripePriceId = (planId) => {
      const plan = getPlanById(planId);
      if (!plan) return null;
    
      const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
      const isLiveKey = stripePublishableKey.startsWith('pk_live_');
      const isTestKey = stripePublishableKey.startsWith('pk_test_');
    
      if (isLiveKey) {
        if (!plan.stripePriceId || plan.stripePriceId.includes('_YOUR_') || plan.stripePriceId.startsWith('price_test_')) {
          console.warn(`[PlansConfig] Stripe Live Key is in use, but Live Stripe Price ID for plan "${plan.name}" (${plan.id}) appears to be a placeholder or a Test ID: "${plan.stripePriceId}". Please ensure it's a correct Live Price ID.`);
          return plan.stripePriceId; 
        }
        return plan.stripePriceId;
      } else if (isTestKey) {
        if (!plan.stripeTestPriceId || plan.stripeTestPriceId.includes('_YOUR_') || plan.stripeTestPriceId.startsWith('price_live_')) {
           console.warn(`[PlansConfig] Stripe Test Key is in use, but Test Stripe Price ID for plan "${plan.name}" (${plan.id}) appears to be a placeholder or a Live ID: "${plan.stripeTestPriceId}". Please ensure it's a correct Test Price ID.`);
           return plan.stripeTestPriceId; 
        }
        return plan.stripeTestPriceId;
      } else {
        const isProductionEnv = import.meta.env.MODE === 'production';
        console.warn(`[PlansConfig] Stripe Publishable Key type is indeterminate. Defaulting based on import.meta.env.MODE (${import.meta.env.MODE}).`);
        if (isProductionEnv) {
          return plan.stripePriceId;
        }
        return plan.stripeTestPriceId;
      }
    };
    
    export const getDefaultPlan = () => plans.find(plan => plan.popular) || plans[0];