# TV Studio · Home layout

## Product decision

The first screen area belongs to the user's photo ambience, not a movie or series recommendation. Film and series discovery begins below the fold and is revealed when the user presses Down from the top/photo area. Do not place a cinematic movie still in the primary hero area.

## Initial viewport: Google Photos ambience

- The large hero area is the **Fotos / Modo descanso** space.
- It should display the currently selected photo ambience when a supported photo source is connected; it must not use a fabricated sample as if it were a real Google Photos connection.
- Show a compact, remote-operable mood selector: **Família**, **Visitas**, **Calma**, **Arte**.
- Indicate the selected mood and connection/source state clearly. If Google Photos API access is unavailable, show an honest fallback state and a route to the supported native Android/Google TV Ambient Mode setup. Do not pretend in-app album switching works until an end-to-end implementation is verified.
- The first viewport keeps the app shelf and essential system affordances reachable without a network wait.
- The photo itself may load asynchronously; focus, clock/system UI and remote input must remain responsive.

## Down navigation: entertainment discovery

- Pressing **Down** from the photo area scrolls/transitions to the entertainment section.
- The next section begins with **Filmes** and **Séries**, followed by recommended titles from the existing catalogue/recommendation pipeline.
- Film/series cards must not displace the photo ambience from the initial hero area.
- Focus order follows visual order. The focused card must be visible; Back/Up returns to the photo area without waiting for network or image decode.
- Cached titles appear immediately. Refreshes and poster/backdrop decoding happen off the UI thread.

## Remote interaction contract

- D-pad focus changes locally and immediately.
- Down from the photo hero moves to entertainment discovery; Up returns to the photo hero.
- Left/right changes the selected mood while the mood selector has focus. OK opens mood configuration only if that action is backed by a working flow.
- Back exits any sub-view immediately.
- No API, OAuth, disk, bitmap decode or animation may block remote navigation.

## Implementation status and release gates

This file records the approved layout direction; it is **not proof that the UI or Google Photos integration has been implemented**. The current native photo pipeline supports locally imported photos, not direct Google Photos albums. Direct album switching depends on validating a supported API path; the Google Photos Ambient API has a partner-program access gate.

Before marking this feature done:
1. Implement the photo-first home layout in `HomeView`.
2. Verify that Down enters the film/series section and Up returns to the photo area.
3. Test mood selection only against a real supported source; otherwise show the native-mode fallback honestly.
4. Run CI and inspect the generated APK.
5. Test D-pad response, cold launch, image loading and rollback on Philips 65PUG7406/78 (Android TV 11).
6. Preserve the Original launcher rollback path.
