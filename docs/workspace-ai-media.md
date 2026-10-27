# Workspace AI response media

The Workspace requests media only when it is relevant. Image and video searches run independently after the answer is available, so provider errors do not replace the text response. Returned media is attached to the originating assistant message.

## Render environment

Set these private environment variables on the existing FaceMeX Render API service:

- `UNSPLASH_ACCESS_KEY` for image search through Unsplash.
- `YOUTUBE_API_KEY` for video search through YouTube Data API v3.
- `CLIENT_ORIGIN` should include the production frontend origins, separated by commas: `https://facemexsocial.com,https://facemexsocial.netlify.app`.

Never put either media key in a `VITE_` variable, the frontend repository, or browser-visible configuration.

## API routes

- `GET /api/media/images/search?query=...` returns up to three Unsplash images with hotlinked image URLs and photographer/photo attribution.
- `GET /api/youtube/search?q=...&limit=2&duration=medium` returns up to two real YouTube results with title, video ID, channel, thumbnail, and watch URL.

Both routes use the backend's existing bearer-token authentication and its exact-origin CORS policy. The frontend calls them through the shared configured `API_URL` client. The Netlify functions are not used for these searches.

## Verification

Run `npm run test:media` in the backend repository and the frontend's focused response tests/build. On the deployed site, sign in and request a topic that benefits from images, then explicitly request relevant videos. Browser network requests should target the configured Render API; image requests must return only Unsplash-hosted image URLs, and video results must contain YouTube IDs and thumbnails. Missing keys or provider failures leave the text answer intact and return safe JSON errors.
