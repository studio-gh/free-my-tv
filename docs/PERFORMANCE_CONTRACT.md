# TV Studio performance contract

Performance is a product feature, not a polish pass. The target is a launcher that feels faster than the stock Philips Android TV home screen, especially during D-pad movement and opening the home screen.

## Non-negotiable rules

1. D-pad and focus are local-only. Focus movement, selection, back, and menu open/close must never wait on network requests, image downloads, JSON parsing, disk I/O or authentication.
2. No synchronous I/O on the UI thread. Network, API requests, image decoding, file access, large JSON parsing and cache writes run on bounded background executors. Return only minimum UI updates to the main thread.
3. Render from cache first. Launch quickly with cached cards, saved agenda and saved ambient-mode selection. Refresh in the background. A slow API must not leave the screen blank or delay first navigation.
4. Bound concurrency. Use bounded thread pools and queues, request timeouts, cancellation and deduplication. Do not start duplicate image fetches for the same URL. Cancel off-screen work when practical.
5. Use small images first. Request appropriately sized thumbnails for cards. Decode to target dimensions, avoid retaining large originals in the view tree, and apply explicit memory/cache policies. Never decode full-resolution family photos to paint a thumbnail.
6. No work inside drawing. The drawing method, focus handlers and frame callbacks must not perform network, disk or expensive processing. Precompute drawing state and reuse drawing objects where practical.
7. No aggressive animation. Keep transitions short and optional; avoid blur/filter effects on every frame. Prefer cached/precomputed backdrops. A slideshow must not decode the next image synchronously or block navigation.
8. Degrade cleanly. Show last-good data and lightweight placeholders during refresh. Handle offline/API failures without retry storms or repeatedly invalidating the whole home screen.
9. Feature flags and rollback. New photo integration stays isolated behind a setting/feature flag until tested on Philips 65PUG7406/78 Android TV 11. Preserve the original launcher and existing fast path.
10. Measure before claiming speed. Record cold-start to first interactive frame, D-pad focus response and memory use on the physical TV. Compare against the stock launcher with the same startup conditions. Do not claim a numeric improvement without measurements.

## Acceptance test matrix

- Cold start: home becomes interactive using cached content without waiting for network.
- D-pad: rapid movement across rows does not hitch, lose focus, or start image decoding on the main thread.
- Slow/offline network: navigation feels the same as online; cached content remains available.
- Images: repeated rows/cards reuse cached thumbnails and do not cause unbounded memory growth.
- Agenda: refresh never blocks drawing and preserves last-known-good data on transient failures.
- Photo ambience: selecting a mood changes preference immediately; authentication/loading occurs after selection in the background; Back returns instantly to launcher.
- Restart: cached home renders first, background services resume safely, and the original launcher can still be selected.

A CI pass confirms build/static checks only; real responsiveness must be measured on the TV.
