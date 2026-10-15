# FaceMeX private screen sharing

Private multi-user sharing uses LiveKit Cloud for SFU media transport and the
existing Supabase Auth project for identity and session metadata. Session
approval is enforced by the Netlify function; the browser never receives
LiveKit API secrets or Supabase service-role credentials.

## Deployment configuration

Apply `supabase/migrations/202610150001_facemex_screen_share_sessions.sql` to
the existing Supabase project. Configure these values as **server-side Netlify
environment variables** for the functions runtime:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LIVEKIT_URL` (the LiveKit Cloud WebSocket URL)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Never use `VITE_` prefixes for the service-role or LiveKit secret values. The
frontend uses its existing Supabase Auth session and sends only its short-lived
Supabase access token to `/.netlify/functions/screen-share`.

For local end-to-end testing, run the app through Netlify Dev (with the values
above in a local, untracked environment file) so Netlify Functions and the
`/api/screen-share` rewrite are available. Vite alone does not execute Netlify
Functions. Do not put real credentials in this repository.

## Cost and operations

LiveKit Cloud pricing is usage-based and can change. Its billing documentation
meters realtime media sessions by session time and transferred data; it rounds
each session to at least 10 seconds and data transfer to 0.01 GB increments.
Check the current [LiveKit Cloud pricing](https://livekit.com/pricing) and
[billing metering](https://docs.livekit.io/deploy/admin/billing/) before
enabling the feature for users. This implementation does not assume a free
tier or provision a LiveKit project.

Each invitation expires after four hours, each room is limited to one host and
ten invited viewers, and viewer tokens are valid for five minutes. Viewers
cannot publish media or data. The host must explicitly start sharing, and
pausing or ending the session disconnects participants through LiveKit. Each
start or resume uses a fresh LiveKit room name so a previously issued token
cannot rejoin the active room.

The scheduled `screen-share-cleanup` function runs once per minute. It ends
expired sessions, revokes their invitations, deletes their LiveKit rooms, and
pauses sessions whose host has been disconnected for at least 20 seconds.
Deployments must support Netlify Scheduled Functions for expiry and abandoned
room cleanup to run automatically. API requests also enforce expiry, but that
alone cannot disconnect participants who are already connected to LiveKit.

Removing one viewer disconnects their current LiveKit participant and prevents
new tokens from being issued. A token already issued to that viewer remains
valid until its five-minute expiry; this is the maximum window for that token
to rejoin before it expires. Ending or pausing a session closes the room for
all participants and uses a fresh room on the next start.
