import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
    import { corsHeaders } from "../_shared/cors.ts";

    console.log("New User Alert Edge Function initializing");

    serve(async (req) => {
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
      }

      try {
        const { record: newUser } = await req.json();
        const adminEmail = Deno.env.get("ADMIN_EMAIL_ADDRESS");

        if (!adminEmail) {
          console.error("ADMIN_EMAIL_ADDRESS secret is not set.");
          return new Response(JSON.stringify({ error: "Admin email not configured." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }

        if (!newUser || !newUser.email) {
          console.error("New user data or email is missing in the request.");
          return new Response(JSON.stringify({ error: "Invalid user data." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        console.log(`New user signed up: ${newUser.email}`);
        console.log(`Admin email to notify: ${adminEmail}`);

        // Placeholder for email sending logic
        // Replace this with actual email sending using Resend, SMTP, etc.
        const emailSubject = `New User Signup: ${newUser.email}`;
        const emailBody = `
          <p>A new user has signed up for Just Bin-ness!</p>
          <p><strong>Email:</strong> ${newUser.email}</p>
          <p><strong>User ID:</strong> ${newUser.id}</p>
          <p><strong>Signed Up At:</strong> ${new Date(newUser.created_at).toLocaleString()}</p>
          <p>Please check the admin dashboard for more details.</p>
        `;

        console.log("Simulating email send:");
        console.log("To:", adminEmail);
        console.log("Subject:", emailSubject);
        console.log("Body:", emailBody);
        
        // Example: Using Resend (you'll need to install their SDK or use fetch with their API)
        // const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // You'd set this as a secret
        // if (RESEND_API_KEY) {
        //   const res = await fetch("https://api.resend.com/emails", {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/json",
        //       "Authorization": `Bearer ${RESEND_API_KEY}`,
        //     },
        //     body: JSON.stringify({
        //       from: "Just Bin-ness <noreply@yourdomain.com>", // Replace with your verified sending domain on Resend
        //       to: [adminEmail],
        //       subject: emailSubject,
        //       html: emailBody,
        //     }),
        //   });
        //   if (!res.ok) {
        //     const errorData = await res.json();
        //     console.error("Failed to send email via Resend:", errorData);
        //     throw new Error(`Resend API Error: ${errorData.message}`);
        //   }
        //   console.log("Email notification sent successfully via Resend.");
        // } else {
        //   console.warn("RESEND_API_KEY not set. Skipping actual email send.");
        // }


        return new Response(JSON.stringify({ message: "Alert processed, email sending simulated." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      } catch (error) {
        console.error("Error processing new user alert:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    });