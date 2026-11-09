# TV Studio Photos Worker

This service stores selected photos in Cloudflare R2 and exposes a private manifest for TV Studio.

## Cloudflare setup

1. Create a Cloudflare R2 bucket named `tv-studio-photos`.
2. From this folder, create the Worker using Wrangler or connect the repository in Workers Builds.
3. Add the R2 binding named `TV_PHOTOS` and point it to `tv-studio-photos`.
4. Add Worker secrets:
   - `ADMIN_PIN`: a long, unique PIN used by the phone panel.
   - `TV_TOKEN`: a different long, unique token used by the TV.
5. Deploy the Worker.

Do not put either secret in GitHub or in the public panel files.

## API

- `GET /api/health`
- `POST /api/photos/upload` (multipart fields: `file`, `collection`, optional `name`; header `X-Admin-Pin`)
- `GET /api/manifest` (header `X-TV-Token` or `X-Admin-Pin`)
- `GET /api/photo/:id?collection=family` (header `X-TV-Token` or `X-Admin-Pin`)

Collections: `family`, `visits`, `travel`, `art`.

## Google Photos Picker

The mobile panel is prepared for the Picker API flow. The OAuth client ID is a public browser identifier and belongs in `panel/config.js`; no client secret belongs in the browser. The Google Cloud OAuth consent screen and authorized origin must be configured before connecting Google Photos.

The Picker API selection and R2 upload flow will be enabled after the OAuth client ID is configured. The shared album URL itself is not an API credential and is not used by this service.
