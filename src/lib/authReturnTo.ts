const DEFAULT_AUTHENTICATED_ROUTE = '/ai/job-assistant';
const SCREEN_SHARE_PATH = /^\/screen-share(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})?$/i;
const EMAIL_ASSISTANT_PATH = /^\/email-assistant\/?$/i;

export function getAuthenticatedReturnTo(search: string, fallbackPath = '') {
  const returnTo = new URLSearchParams(search).get('returnTo') || fallbackPath;
  if (!returnTo) return DEFAULT_AUTHENTICATED_ROUTE;

  const pathname = returnTo.split(/[?#]/, 1)[0];
  if (
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    (!SCREEN_SHARE_PATH.test(pathname) && !EMAIL_ASSISTANT_PATH.test(pathname))
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  return returnTo;
}
