# Workspace AI response media

The Workspace AI response displays media only after its text answer is available. Media searches run independently so provider failures do not replace or delay the answer. Results are attached to the assistant message that requested them.

## Images: Unsplash through Netlify

Configure `UNSPLASH_ACCESS_KEY` in the Netlify site environment for deployment. For local Vite development, put it in an untracked server-side `.env.local` file. Do not use a `VITE_` prefix, put the key in frontend code, or commit it.

The authenticated `POST /api/workspace/media` endpoint is routed by `netlify.toml` to the Netlify `workspace-media` function. That function uses the shared Unsplash search helper to call `https://api.unsplash.com/search/photos` with a server-side `Authorization: Client-ID …` header. It returns up to three validated Unsplash image URLs with photographer and photo attribution links. It does not call Wikimedia or another image provider.

The function verifies the signed-in user using the existing Supabase configuration (`SUPABASE_URL` and `SUPABASE_ANON_KEY`; the current `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` names are accepted as fallbacks). If the Unsplash key is missing, results are empty; if Unsplash fails, the answer remains available without images. Unsplash results are cached in memory for five minutes and concurrent identical searches are deduplicated.

## Videos: YouTube through Render

YouTube searches use the existing Render backend route, `GET /api/youtube/search`. The Workspace calls it through the same `API_URL` and authenticated API client used by the app's Watch and lesson-search features. The YouTube API key must remain in the Render backend's existing environment variable; this frontend repository does not need or receive the key. Do not configure a YouTube search key in Netlify for this flow.

The reply card accepts up to two valid results from the backend, including the actual video title, ID, channel, thumbnail, and watch link. If the Render route or its YouTube provider is unavailable, no video cards are shown and the text answer is unaffected.

## Routing and deployment

The `/api/workspace/media` redirect in `netlify.toml` is forced and placed before the single-page-app fallback, so the image request is handled by the Netlify function rather than frontend HTML. The Render `/api/youtube/search` request is made directly to the configured backend origin; it is not routed through Netlify.

The Vite development server exposes `/api/workspace/media` using the same Netlify function handler. Restart `npm run dev` after changing local server-side environment configuration.

To verify a deployment, sign in and ask a question that benefits from images, then explicitly ask for relevant videos. In the browser network panel, image searches should target the same-origin `/api/workspace/media` route and video searches should target the configured Render origin at `/api/youtube/search`. Confirm that response cards display only returned results and that failures leave the text answer intact.
