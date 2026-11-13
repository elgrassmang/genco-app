import emailjs from 'emailjs-com';
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Configuration (In production, these should be in .env)
const SERVICE_ID = "service_genco_main"; 
const TEMPLATE_ID_FOLLOWUP = "template_lead_followup";
const TEMPLATE_ID_JOB_START = "template_job_start";
const TEMPLATE_ID_JOB_COMPLETE = "template_job_complete";
const PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY"; // Placeholder

// Helper to log notification to Firestore
const logNotification = async (customerId, type, status, email, message, extras = {}) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      customerId,
      type,
      status,
      sentTo: email,
      message,
      sentAt: serverTimestamp(),
      ...extras
    });
  } catch (err) {
    console.error("Failed to log notification:", err);
  }
};

export const sendFollowUpEmail = async (customer, discountCode, discountPercentage, message) => {
  if (!customer?.email) return { success: false, error: "No email address" };

  try {
    // In a real app, this would call EmailJS
    // await emailjs.send(SERVICE_ID, TEMPLATE_ID_FOLLOWUP, {
    //   to_email: customer.email,
    //   to_name: customer.fullname,
    //   discount_code: discountCode,
    //   discount_percent: discountPercentage,
    //   message: message
    // }, PUBLIC_KEY);

    console.log(`[MOCK EMAIL] Sending Follow Up to ${customer.email} with code ${discountCode}`);

    await logNotification(customer.id, 'lead_followup', 'success', customer.email, message, { discountCode });
    return { success: true };
  } catch (error) {
    console.error("Email send failed:", error);
    await logNotification(customer.id, 'lead_followup', 'failed', customer.email, message, { error: error.message });
    return { success: false, error };
  }
};

export const sendJobStartEmail = async (customer, workerName, etaMinutes) => {
  if (!customer?.email || customer.emailNotifications === false) return { success: false, skipped: true };

  try {
    console.log(`[MOCK EMAIL] Job Start: Sending to ${customer.email}, Worker: ${workerName}, ETA: ${etaMinutes}m`);
    
    await logNotification(customer.id, 'job_start', 'success', customer.email, `Worker ${workerName} is en route.`);
    return { success: true };
  } catch (error) {
    await logNotification(customer.id, 'job_start', 'failed', customer.email, "Job start notification failed", { error: error.message });
    return { success: false, error };
  }
};

export const sendJobCompletionEmail = async (customer, workerName, photoUrl) => {
  if (!customer?.email || customer.emailNotifications === false) return { success: false, skipped: true };

  try {
    console.log(`[MOCK EMAIL] Job Complete: Sending to ${customer.email}. Photo: ${photoUrl}`);

    await logNotification(customer.id, 'job_completion', 'success', customer.email, `Service completed by ${workerName}.`, { photoUrl });
    return { success: true };
  } catch (error) {
    await logNotification(customer.id, 'job_completion', 'failed', customer.email, "Job completion notification failed", { error: error.message });
    return { success: false, error };
  }
};