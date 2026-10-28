# Living Room OS roadmap

This file is the project backlog because GitHub Issues is disabled on this repository.

## P0 · Performance contract

- [ ] Meet the non-negotiable rules and on-device acceptance tests in `docs/PERFORMANCE_CONTRACT.md`.
- [ ] Measure cold start, D-pad response and memory on the Philips TV before claiming the launcher is faster than stock.
- [ ] Keep image, agenda and photo API work off the UI thread; launch from cache and refresh in the background.

## P0 · Calendar integration reliability

- [ ] Review PR #1 and PR #2 together; avoid duplicate or contradictory commits.
- [ ] Preserve last successful events on network/server failure, while allowing a valid empty feed to clear old events.
- [ ] Confirm local timezone, all-day events, “Hoje” and “Amanhã”.
- [ ] Keep the two-minute refresh bounded and only while the launcher is active.
- [ ] Check that drawer/home repaint happens when events change.
- [ ] Run both existing CI jobs and inspect the test APK artifact.
- [ ] Perform device-side smoke test on Philips 65PUG7406/78 (Android TV 11) before changing the recommended build.
- [ ] Document rollback to Original launcher.

Acceptance: no crash/frame hitch, new events appear after refresh, valid empty results clear old events, transient failures retain the last good agenda, and the original launcher remains restorable.

## P1 · TV Studio Modo descanso: álbuns por mood

Goal: let the user switch between curated photo moods directly from the TV Studio launcher with the TV remote, using the user's existing Google Photos albums.

- [ ] Verify the Google Photos Ambient API requirements, access eligibility, OAuth flow for TV / limited-input devices, quotas, policy and attribution before committing to production implementation.
- [ ] Prototype the smallest end-to-end integration on Android TV: authenticate one Google account, retrieve the authorised ambient media and render a slideshow.
- [ ] Add a remote-first “Modo descanso” selector with presets: Família, Visitas, Calma and Arte.
- [ ] Map each preset to a user-selected Google Photos collection/album where the API and account permissions support it; persist only preset-to-collection identifiers locally.
- [ ] Keep a fallback that opens the native Google TV / Android TV Ambient Mode settings for album selection if in-app album listing or switching is not supported.
- [ ] Keep photo tokens and OAuth credentials out of the APK source, repository, logs and URLs; request only the minimum scopes and provide a disconnect/reset path.
- [ ] Handle expired permissions, unavailable media, offline mode and an empty album without crashing or trapping remote focus.
- [ ] Preserve TV Studio's original-launcher rollback path and test burn-in-safe slideshow behavior on Philips 65PUG7406/78 (Android TV 11).

Mood defaults:
- **Família:** family moments and everyday photos.
- **Visitas:** shareable travel, landscapes and art; avoid private albums.
- **Calma:** sea, nature and quiet photography.
- **Arte:** artwork and visual inspiration.

Technical constraint: Google Photos Picker API is a user-mediated media selection flow, while the Library API is limited to content created by the app. Do not assume either API can freely enumerate every existing Google Photos album. Validate the dedicated Ambient API before choosing the implementation. The native system Ambient Mode is the no-cost fallback and can already display user-selected Google Photos albums on supported devices.

## P1 · Brazil-first discovery and watchlist

- [ ] Set the product default region to BR and language to pt-BR where appropriate, without silently overriding explicit TV settings.
- [ ] Add/use concise filters for film, series, documentaries, genre, runtime and decade.
- [ ] Show TMDB rating as TMDB, year/runtime and confirmed Brazilian streaming providers.
- [ ] Add title search and an accessible detail view.
- [ ] Add a local persisted “Quero ver” list.
- [ ] Support “Guiga”, “Rê” and “Nós dois” preference labels without requiring accounts.
- [ ] Keep navigation remote-first and network work off the rendering thread.
- [ ] Cache results and make offline state understandable.

Data integrity:
- IMDb and Rotten Tomatoes scores must only be shown when a permitted, stable source and necessary attribution are available. Never scrape or fabricate scores.
- An installed app does not imply a subscription.
- Do not claim to know watching history from Netflix, Prime Video, Disney+ or another app unless a supported integration exposes it.
- Keep preferences local by default, with export/delete behavior documented.

## P2 · Couple-friendly discovery

- [ ] Local “Guiga / Rê / Nós dois” feedback.
- [ ] Explainable suggestions based on explicit choices.
- [ ] “Surpreenda-nos” mode with filters and a next-round option.
- [ ] Session length filters for short / medium / long.

## P3 · Companion and integrations

- [ ] Tested deep links per streaming app with safe fallback.
- [ ] Lightweight phone companion for shared list and voting.
- [ ] Temporary QR pairing; never expose API tokens.
- [ ] Read-only Calendar integration only while the minimal public feed remains safe and useful.
- [ ] Smart-home controls only after device compatibility is known and the user opts in.

## Release gates

- CI green for all relevant jobs.
- Device smoke test on Philips 65PUG7406/78 / Android TV 11, including restart and remote navigation.
- No focus jumps; no UI-thread network work; cache/offline fallback works.
- New calendar events appear, valid empty feed clears old items, network failure preserves last good data.
- Original launcher remains restorable; test APKs are never promoted silently.
- No credentials, private viewing history or sensitive family information are committed.
