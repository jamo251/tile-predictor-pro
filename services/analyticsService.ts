import * as amplitude from '@amplitude/analytics-browser';

const AMPLITUDE_API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY?.trim() ?? '';

function isAnalyticsEnabled(): boolean {
  return AMPLITUDE_API_KEY.length > 0 && AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_API_KEY';
}

export const analytics = {
  init: () => {
    if (isAnalyticsEnabled()) {
      amplitude.init(AMPLITUDE_API_KEY, undefined, {
        defaultTracking: true,
      });
    }
  },

  trackEvent: (eventName: string, properties?: Record<string, unknown>) => {
    console.debug(`[Analytics] ${eventName}`, properties);
    if (isAnalyticsEnabled()) {
      amplitude.track(eventName, properties);
    }
  },

  identifyUser: (userId: string) => {
    if (isAnalyticsEnabled()) {
      amplitude.setUserId(userId);
    }
  },
};
