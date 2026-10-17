const DEFAULT_AUTHENTICATED_ROUTE = '/ai/job-assistant';
const SCREEN_SHARE_PATH = /^\/screen-share(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})?$/i;

export function getAuthenticatedReturnTo(search: string) {
  const returnTo = new URLSearchParams(search).get('returnTo');
  if (!returnTo) return DEFAULT_AUTHENTICATED_ROUTE;

  const pathname = returnTo.split(/[?#]/, 1)[0];
  if (
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    !SCREEN_SHARE_PATH.test(pathname)
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  return returnTo;
}
