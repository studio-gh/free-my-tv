# Living Room OS roadmap

This file is the project backlog because GitHub Issues is disabled on this repository.

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
