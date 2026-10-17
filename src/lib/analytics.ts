
/**
 * FaceMeX analytics compatibility layer.
 * Tracking is currently a no-op until a real analytics provider is connected.
 */

export function initializeAnalytics(..._args: unknown[]): void {}

export function trackAppOpen(..._args: unknown[]): void {}

export function isAnalyticsConfigured(): boolean {
  return false;
}

export function getAnalyticsConsent(): 'granted' | 'denied' {
  return 'denied';
}

export function setAnalyticsConsent(..._args: unknown[]): void {}

export function trackEvent(..._args: unknown[]): void {}

export function trackButtonClick(..._args: unknown[]): void {}

export function trackError(..._args: unknown[]): void {}

export function trackFeatureUse(..._args: unknown[]): void {}

export function trackImageAnalysis(..._args: unknown[]): void {}

export function trackLinkClick(..._args: unknown[]): void {}

export function trackUpload(..._args: unknown[]): void {}

export function trackWorkspaceOpen(..._args: unknown[]): void {}

export function trackWorkspacePrompt(..._args: unknown[]): void {}

export function trackWorkspaceResponse(..._args: unknown[]): void {}
