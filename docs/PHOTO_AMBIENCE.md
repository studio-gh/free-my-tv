# TV Studio · Modo descanso

## Product goal

Let a person choose the TV's ambient-photo mood directly from the TV Studio home screen using the TV remote. Each mood should correspond to an existing Google Photos collection or album selected by the user.

## Recommended architecture

### Layer 1: TV Studio mood selector

Add a “Modo descanso” entry to the launcher. Keep the initial selector simple and remote-first:

- Família
- Visitas
- Calma
- Arte

The selector stores a small local preference mapping mood IDs to authorised collection identifiers. It should not store photo content or account credentials.

### Layer 2: Google Photos ambient media

First evaluate the official Google Photos Ambient API, designed for ambient experiences on TVs and photo frames:
https://developers.google.com/photos/ambient/guides/about

Confirm API access, app registration, OAuth for TV / limited-input devices, quota and policy requirements before implementing production code. Use the minimum scopes and a proper device/TV authentication flow.

Important API distinction:
- The Ambient API is the first candidate for a TV slideshow.
- The Google Photos Picker API is a user-mediated selection flow, not a general-purpose API for listing every existing album.
- The Google Photos Library API is scoped to media/albums created by the app; do not assume it can browse the user's entire historical library.

References:
- Ambient API: https://developers.google.com/photos/ambient/guides/about
- Photos APIs overview: https://developers.google.com/photos/overview/about
- Picker API: https://developers.google.com/photos/picker/guides/get-started-picker

### Layer 3: Native Ambient Mode fallback

If the Ambient API cannot be used without disproportionate verification, access or maintenance burden, preserve a graceful fallback to the TV's built-in Google TV / Android TV Ambient Mode. The user can configure Google Photos albums through the system's supported settings, but TV Studio may not be able to switch those albums itself.

Google's documented setup:
https://support.google.com/googletv/answer/10070821

This fallback is free and avoids building a second photo-storage pipeline. It is not equivalent to in-app mood switching, so the UI must describe it honestly.

## Performance requirements

- The mood picker must respond immediately to D-pad input and update its selected state locally.
- Album authentication, API calls, metadata parsing, image downloads, image decoding and cache writes must run off the UI thread.
- Start with a locally cached thumbnail or last frame. Never block the launcher while the first photo loads.
- Use a bounded executor, request deduplication, cancellation for superseded selections and explicit image-size limits.
- Keep slideshow transitions subtle, avoid continuous expensive blur, and pre-decode only a small number of next images.
- Back must return to the launcher immediately even while a photo is loading. Loading failures must not trap focus.
- Keep the feature behind a preference or feature flag until validated on the Philips 65PUG7406/78 Android TV 11.

## Mood semantics

- **Família:** family moments, everyday photos, trips together.
- **Visitas:** broadly shareable travel, landscapes and art. Avoid private albums.
- **Calma:** sea, nature, muted landscapes and quiet photography.
- **Arte:** artwork, photography and visual inspiration.

These are labels and user preferences, not inferred or auto-classified content. The user chooses the album for each mood.

## Security and privacy

- Never commit OAuth client secrets, access tokens, refresh tokens or account data.
- Never send family photos to an AI model or third-party service as part of this feature.
- Request only the minimum API scopes required.
- Keep account connection and album selection explicit and user-controlled.
- Provide disconnect/reset behavior and clear errors for revoked permissions.
- Do not log photo URLs or tokens.
- Avoid a backend unless the official OAuth flow or API requirements make it necessary; if one is required, use a minimal server-side component and secret storage, not public static hosting secrets.

## Implementation stages

1. **API feasibility:** verify current Ambient API access requirements, scopes, OAuth flow, quota and whether user-selected existing albums can be represented and switched per mood.
2. **Device proof:** validate auth and a slideshow on the Philips 65PUG7406/78 (Android TV 11), with remote navigation and clean exit.
3. **Mood selector:** implement the four presets and persist local mapping only after the API path is confirmed.
4. **Resilience:** test expired auth, offline state, empty albums, unavailable media, app restart and rollback.
5. **Release gate:** CI green and physical TV test before distributing a new APK. Keep the original launcher restorable.

## Acceptance criteria

- User can choose a mood from TV Studio with the remote.
- Mood selection survives app restart.
- Each mood displays only its explicitly assigned collection.
- The app never claims it can enumerate all Google Photos albums unless verified against the official API.
- If direct switching is not supported, the app provides a clear native-settings fallback rather than a fake control.
- No credentials or family media are committed to the public repository.
