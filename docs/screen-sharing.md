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
Supabase access token in an authenticated `POST` to Netlify's canonical
`/.netlify/functions/screen-share` route. The `/api/screen-share` rewrite
remains as a compatibility alias for older clients. Netlify externalizes and
packages the server-only Supabase and LiveKit SDK dependencies for the
function runtime; deploy the updated `netlify.toml` and function together.
Hosts can copy an invitation URL or use the browser's native share sheet. When
the host runs on localhost, the shared URL uses the production FaceMeX origin
(`https://facemexsocial.com`) so other users do not receive an unreachable
localhost link.

## Selected-frame AI assistance

While sharing, the host can capture one downscaled frame and open it in the
existing FaceMeX workspace in a separate tab. The frame is passed through
temporary browser-local storage, consumed once, and expires after five minutes
if unused. No video frames are sent continuously, and capturing a frame does
not submit it automatically: the host reviews the attachment and sends it
through the existing workspace composer and AI request flow. The original
sharing tab remains open so the host can stop or end the session independently.

For local end-to-end testing, run the app through Netlify Dev (with the values
above in a local, untracked environment file) so Netlify Functions and the
`/.netlify/functions/screen-share` route are available. Vite alone does not
execute Netlify Functions. Do not put real credentials in this repository.

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

Removing one viewer marks them removed, disconnects their current LiveKit
participant, and rotates the active room so an already-issued token for the
previous room cannot access the host's subsequently shared screen. Such a
token remains valid for its original room until its five-minute expiry, but
that room no longer carries the active session. If room rotation fails, the
operation reports an error; the host should end the session before sharing
again. Ending or pausing a session closes the room for all participants and
uses a fresh room on the next start.
