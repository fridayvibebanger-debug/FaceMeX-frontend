# FaceMeX private screen sharing

Private multi-user sharing uses LiveKit Cloud for SFU media transport and the
existing Supabase Auth project for identity and session metadata. Session
approval is enforced by the Netlify function; the browser never receives
LiveKit API secrets or Supabase service-role credentials.

The sharing API runs as the Netlify Function
`netlify/functions/screen-share.js`; it does not run on the separate Render
backend. Set its secrets in the FaceMeX **Netlify site** environment variables
for the deploy contexts used by the production site, then redeploy. Values set
only in Render are not visible to this function.

## Deployment configuration

Apply both
`supabase/migrations/202610150001_facemex_screen_share_sessions.sql` and
`supabase/migrations/202610160001_facemex_screen_share_guest_participants.sql`
to the existing Supabase project. Enable **Anonymous Sign-Ins** in the
Supabase Dashboard under **Authentication → Sign In / Providers → Anonymous
Sign-Ins** to allow guests to create a limited Supabase identity. Configure
these values as **server-side Netlify environment variables** for the functions
runtime:

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
ten invited viewers, and participant tokens are valid for five minutes.
Guests join with Supabase anonymous authentication, submit a display name, and
remain pending until the host approves them. Only registered FaceMeX accounts
can create or control sessions. Approved guests and registered viewers can
publish microphone audio and in-room chat data, but cannot publish screen or
camera video. The host can publish microphone audio and the screen share.
These grants are issued only after the server verifies the authenticated
participant's approval. The invitation URL alone never grants room access.
Anonymous guest identities are normal Supabase Auth users; configure a suitable
retention/cleanup policy for abandoned anonymous accounts. In the FaceMeX
frontend, anonymous identities are restricted to the invited meeting route;
other protected workspace routes send them to sign-in.

Meeting chat uses LiveKit data messages and is intentionally ephemeral; chat
history is not stored after participants leave. Participants and speaking
indicators reflect the connected LiveKit room. Screen-share quality defaults
to Auto and can be changed to Standard or High; changing quality republishes
the current capture with the selected encoding limits. Actual capture quality
is still subject to the selected display, browser, hardware, and network.

The host must explicitly start sharing, and pausing or ending the session
disconnects participants through LiveKit. Each start or resume uses a fresh
LiveKit room name so a previously issued token cannot rejoin the active room.

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
