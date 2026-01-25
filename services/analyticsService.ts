
import * as amplitude from '@amplitude/analytics-browser';

// Amplitude Project API Key for tracking user behavior and analysis performance.
// Widening type to string to fix TS comparison errors with literal values.
const AMPLITUDE_API_KEY: string = '8c569f20ca5426865a69e55e0223f1de';

export const analytics = {
  init: () => {
    // Standard initialization check for API key presence and placeholder validation.
    if (AMPLITUDE_API_KEY && AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY') {
      amplitude.init(AMPLITUDE_API_KEY, undefined, {
        defaultTracking: true,
      });
    }
  },

  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    console.debug(`[Analytics] ${eventName}`, properties);
    if (AMPLITUDE_API_KEY && AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY') {
      amplitude.track(eventName, properties);
    }
  },

  identifyUser: (userId: string) => {
    if (AMPLITUDE_API_KEY && AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY') {
      amplitude.setUserId(userId);
    }
  }
};
