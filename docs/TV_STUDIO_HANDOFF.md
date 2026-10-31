# TV Studio handoff

## Official product name
TV Studio is the product name from this point forward. “Free My TV” is the upstream project name and a historical codebase reference only; do not use it as the product name in new UI, PR titles, installation copy, release notes, or planning docs.

## Repository status
- Current repo URL: https://github.com/studio-gh/free-my-tv
- The GitHub connector used to update this project does not expose a repository rename action.
- Do not claim the repo URL is `studio-gh/tv-studio` until the owner renames it in GitHub and the new URL is verified.
- Once renamed, update any references to the old repository path in workflows, docs, README, and links.

## Current work
- PR #1: https://github.com/studio-gh/free-my-tv/pull/1
- PR #2: https://github.com/studio-gh/free-my-tv/pull/2
- Current PR #2 has CI success on code commit `08784213c13c2a8de5117d7e553a250fb0334060`. Follow-up documentation and naming commits also ran in CI; verify latest workflow before release.
- Test APK artifacts remain test builds and are not stable releases.
- Existing test build has shown the family agenda on the Philips TV, but the revised build needs a device smoke test.

## Product decisions
- TV Studio is a living-room experience for two people, with shared agenda, entertainment discovery, local preferences and watchlist.
- Use TMDB for the catalogue and label its ratings accurately.
- IMDb / Rotten Tomatoes scores need an authorised, stable source; never scrape or invent scores.
- Do not claim to read universal viewing history across streaming apps.
- Keep user data local by default, preserve the original launcher, and keep a rollback path.

## Release gate
Do not promote or install the new build as permanent until:
1. Relevant CI jobs are green on current PR head.
2. New and empty calendar responses are verified, and network errors preserve the last known good agenda.
3. Remote navigation and restart are tested on Philips 65PUG7406/78, Android TV 11.
4. Original launcher recovery is confirmed.

## Saturday handoff · 31 Oct 2026

### Verified CI
- Run 82: `41205307305`, both jobs concluded successfully.
- Android job: SDK setup passed; persistent signing step concluded successfully but reported the required secrets are absent; APK build and upload were intentionally skipped.
- Web validation passed.
- No workflow artifacts were produced. This is a green validation workflow, not an APK build.

### Build validation
- `tools/check.sh` now checks that literal native `Symbols.draw/warm` references have matching PNG assets under `app/assets/symbols`.
- The Android job uses the same shared script via the build validation path in the repository. Re-run CI after changes to verify it.
- The icon generator includes the planned household concepts, but the generated assets still do not exist. Keep the currently bundled icons in the Home until the PNGs are created and checked in.
- Do not describe the four final visual icons as delivered yet.

### Remaining release blockers
1. Configure `TV_STUDIO_TEST_KEYSTORE_BASE64` and `TV_STUDIO_TEST_KEYSTORE_PASSWORD` as repository Actions secrets, without sharing either value in chat or committing the keystore.
2. Generate and commit the final household mood PNGs, then verify each asset is present and rendered.
3. Build and inspect the signed test APK, validate its package ID and signature, and install/launch only the isolated test package on Philips 65PUG7406/78.
4. Capture and review the actual TV screen. CI success alone is not device acceptance.

### Safety
- Preserve production package `io.freemytv` and Philips system launcher.
- Do not reuse old artifact `12840644804`; it was signed with an ephemeral key and did not pass visual acceptance.
