/**
 * Utility for client-side rate limiting using Firestore
 * Note: In a production environment with strict security requirements,
 * rate limiting should be enforced via server-side rules or Cloud Functions.
 */
import { db } from '@/lib/firebaseClient';
import { collection, addDoc, query, where, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';

const ATTEMPTS_COLLECTION = 'signup_attempts';
const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS = 3;

/**
 * Checks if an IP has exceeded the rate limit
 * @param {string} ip - Client IP address
 * @returns {Promise<{allowed: boolean, remainingTime?: number}>}
 */
export const checkRateLimit = async (ip) => {
  if (!ip || ip === 'unknown-ip') return { allowed: true };

  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
    const tenMinutesAgoTimestamp = Timestamp.fromDate(tenMinutesAgo);

    const q = query(
      collection(db, ATTEMPTS_COLLECTION),
      where('ip', '==', ip),
      where('timestamp', '>=', tenMinutesAgoTimestamp)
    );

    const snapshot = await getDocs(q);
    const count = snapshot.size;

    if (count >= MAX_ATTEMPTS) {
      return { 
        allowed: false,
        remainingTime: WINDOW_MINUTES // Simple estimation
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open if check fails to prevent blocking legitimate users during outages
    return { allowed: true };
  }
};

/**
 * Records a new attempt for rate limiting
 * @param {string} ip - Client IP address
 * @param {string} email - Email attempted (optional, for correlation)
 */
export const incrementAttempt = async (ip, email = '') => {
  if (!ip || ip === 'unknown-ip') return;

  try {
    await addDoc(collection(db, ATTEMPTS_COLLECTION), {
      ip,
      email_hash: email ? btoa(email) : null, // Simple encoding, just for rough correlation
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to record rate limit attempt:', error);
  }
};