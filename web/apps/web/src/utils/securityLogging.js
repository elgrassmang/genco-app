/**
 * Utility for security event logging
 */
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LOG_COLLECTION = 'security_logs';

/**
 * Logs a security event to Firestore
 * @param {string} type - Event type (e.g., 'signup_attempt', 'rate_limit', 'honeypot')
 * @param {Object} data - Additional data to log
 */
export const logSecurityEvent = async (type, data = {}) => {
  try {
    // Sanitize sensitive data before logging
    const sanitizedData = { ...data };
    
    // Remove passwords or tokens if they accidentally got passed
    if (sanitizedData.password) delete sanitizedData.password;
    if (sanitizedData.token) delete sanitizedData.token; // Don't log full recaptcha tokens if not needed
    if (sanitizedData.confirmPassword) delete sanitizedData.confirmPassword;

    await addDoc(collection(db, LOG_COLLECTION), {
      type,
      ...sanitizedData,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    // Silent fail for logging to not disrupt user flow
    console.error('Failed to log security event:', error);
  }
};