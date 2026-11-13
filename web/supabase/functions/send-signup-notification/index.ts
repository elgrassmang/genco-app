import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); 
    const ADMIN_EMAIL = "support@gencocans.com";

    serve(async (req) => {
      if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not set in environment variables.");
        return new Response(
          JSON.stringify({ error: "Email API key not configured." }),
          { status: 500, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } }
        );
      }

      try {
        const { record } = await req.json(); 
        const userEmail = record?.email;
        const userId = record?.id;

        if (!userEmail || !userId) {
          return new Response(
            JSON.stringify({ error: "User email or ID missing in webhook payload." }),
            { status: 400, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } }
          );
        }

        const emailPayload = {
          from: "Just Bin-ness <noreply@justbinness.com>", 
          to: [ADMIN_EMAIL],
          subject: `New User Signup: ${userEmail}`,
          html: `
            <p>A new user has signed up on Just Bin-ness:</p>
            <ul>
              <li><strong>User ID:</strong> ${userId}</li>
              <li><strong>Email:</strong> ${userEmail}</li>
            </ul>
            <p>Please check the admin dashboard for more details.</p>
          `,
        };
        
        console.log("Sending email with payload:", JSON.stringify(emailPayload));

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error(`Resend API error: ${res.status} ${res.statusText}`, errorBody);
          return new Response(
            JSON.stringify({ error: "Failed to send notification email.", details: errorBody }),
            { status: 500, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } }
          );
        }
        
        const data = await res.json();
        console.log("Email sent successfully:", data);

        return new Response(JSON.stringify({ message: "Notification email sent.", data }), {
          headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
        });

      } catch (error) {
        console.error("Error processing request:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
        });
      }
    });