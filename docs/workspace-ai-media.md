# Workspace AI response media

The Workspace AI response renderer uses the existing AI providers and conversation flow. Image and video search run separately after an answer is displayed; media-provider errors do not fail or replace the answer.

## Netlify environment variables

Configure these in the Netlify site environment. Do not use a `VITE_` prefix, add the values to frontend code, or commit them:

- `YOUTUBE_API_KEY` — server-side key for YouTube Data API v3 video search and availability checks. Enable only the YouTube Data API v3 for this key.
- `UNSPLASH_ACCESS_KEY` — server-side Unsplash API access key for relevant photo search.

The media function also verifies the signed-in user with the existing Supabase configuration (`SUPABASE_URL` and `SUPABASE_ANON_KEY`; the current `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values are accepted as fallbacks).

If either media key is unset, that provider is skipped. The Workspace now requests image and video references for every non-empty AI answer; searches include the prompt and a short answer excerpt. This deliberately increases provider usage and latency: each answer can use one Unsplash search and up to two YouTube Data API calls. Unsplash searches use `GET https://api.unsplash.com/search/photos` with `query`, `per_page=3`, `content_filter=high`, and a server-side `Authorization: Client-ID …` header. The `/api/workspace/images?query=...` endpoint returns only image URL, alt text, photographer name, photographer profile URL, and original photo URL. Attribution links include `utm_source=facemexsocial&utm_medium=referral`; the image card keeps attribution links available on hover or keyboard focus rather than showing a photographer caption. Unsplash results are cached in memory for five minutes and concurrent identical searches are deduplicated.

If a provider times out, fails, or returns no suitable results, the text response still renders normally. Unsplash rate limits return HTTP 429 with a bounded `Retry-After`; other provider errors return a safe unavailable response. YouTube cards are shown for up to two distinct public, embeddable videos with usable thumbnails; one valid result is displayed when only one is available. Two videos require `YOUTUBE_API_KEY`, available quota, and two valid results.

## Deploy and verify

Deploy the Netlify site after setting the environment variables. The Workspace reply flow calls the authenticated `/api/workspace/media` endpoint, which can return both relevant Unsplash images and YouTube lessons. The dedicated `/api/workspace/images` route is also available and uses the same Unsplash search helper. Sign in to the deployed app and try an instructional prompt (for example, “How do I make crispy fried chicken with rice?”) and a general fact prompt (for example, “What is the capital of South Africa?”). The first may include relevant media when provider credentials and results are available; the second should remain a concise text response.

The YouTube search uses API quota, so keep the media planner enabled only for requests likely to benefit from demonstrations or lessons and monitor quota usage in Google Cloud.
