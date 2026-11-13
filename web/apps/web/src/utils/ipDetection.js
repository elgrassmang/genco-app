/**
 * Utility to detect client IP address using external service
 */

/**
 * Fetches the client's public IP address
 * @returns {Promise<string|null>} - The IP address or null if failed
 */
export const getClientIP = async () => {
  try {
    // Try primary service
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error('Primary IP service failed');
    
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Primary IP detection failed, trying fallback...');
    
    try {
      // Fallback service
      const response = await fetch('https://api64.ipify.org?format=json');
      if (!response.ok) throw new Error('Fallback IP service failed');
      
      const data = await response.json();
      return data.ip;
    } catch (fallbackError) {
      console.error('All IP detection services failed:', fallbackError);
      return 'unknown-ip';
    }
  }
};