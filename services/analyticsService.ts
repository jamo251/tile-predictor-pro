import * as amplitude from '@amplitude/analytics-browser';

// In a real app, you'd use an environment variable or a public key.
// Placeholder key - replace with your actual Amplitude API key.
const AMPLITUDE_API_KEY = 'YOUR_AMPLITUDE_API_KEY';

export const analytics = {
  init: () => {
    if (AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY') {
      amplitude.init(AMPLITUDE_API_KEY, undefined, {
        defaultTracking: true,
      });
    }
  },

  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    console.debug(`[Analytics] ${eventName}`, properties);
    if (AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY') {
      amplitude.track(eventName, properties);
    }
  },

  identifyUser: (userId: string) => {
    if (AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY') {
      amplitude.setUserId(userId);
    }
  }
};
