/**
 * Utility to handle Google reCAPTCHA v3 token generation
 */

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

/**
 * Executes reCAPTCHA and returns a token
 * @param {string} action - The action name for analytics (e.g., 'signup', 'login')
 * @returns {Promise<string>} - The reCAPTCHA token
 */
export const executeRecaptcha = async (action = 'submit') => {
  return new Promise((resolve, reject) => {
    try {
      if (!window.grecaptcha) {
        reject(new Error('reCAPTCHA has not loaded'));
        return;
      }

      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(SITE_KEY, { action })
          .then((token) => {
            resolve(token);
          })
          .catch((error) => {
            console.error('reCAPTCHA execution failed:', error);
            reject(error);
          });
      });
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      reject(error);
    }
  });
};