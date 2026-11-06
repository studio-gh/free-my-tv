# TV Studio Companion Bridge

Status: architecture specification, not an installed service.

## Purpose

Let MaxxKindle 2.0 on the Fire 7 control the Philips 65PUG7406/78 directly over the trusted home Wi-Fi, even when the MacBook is switched off. The MacBook is an optional additional client, never a required bridge.

## Preferred architecture: direct Android TV Remote Protocol

First investigate and validate the TV's built-in Android TV Remote Service (Remote Protocol v2). Compatible Android TV devices commonly expose:
- TCP 6467 for certificate-based pairing with an on-screen PIN.
- TCP 6466 for the encrypted remote-control channel after pairing.

This is preferable to a custom server on the TV or a MacBook relay: the Fire 7 can be the remote client, pairing is explicitly approved on the TV, and commands use the TV's existing remote-control service. Do not assume the Philips firmware supports it until we test the actual set.

The protocol uses TLS, a client certificate, protobuf-framed messages and a pairing handshake. The client certificate/private key must be generated and stored locally on the Fire 7, protected from export, and revocable by unpairing on the TV if supported. No shared static password, unauthenticated HTTP endpoint, internet tunnel, or cloud relay.

### Discovery and validation gates

1. On the Philips TV, confirm Android version/build and whether the Android TV Remote Service package is installed/enabled.
2. From a device on the same Wi-Fi, perform read-only checks that ports 6466 and 6467 are reachable. Do not enable ADB or alter TV settings just to make the test pass.
3. Confirm the TV displays a pairing PIN and accepts a new client certificate.
4. Pair one test client and validate a small set of commands: directional navigation, select, back, home, volume, power state and app launch.
5. Test after TV standby, full restart, router restart and IP address change.
6. Record exactly which commands work on this Philips firmware. Unsupported functions stay hidden in the UI.

The Android TV Remote Protocol is a remote-control interface, not a general ADB shell. Do not represent it as capable of changing arbitrary settings, reading private app data, or controlling every system function.

## Fallback if native remote service is unavailable

Only if the Philips does not expose a compatible native remote service, evaluate a small opt-in TV-side companion component inside TV Studio. It must have a tightly allowlisted API and explicit pairing. This is a separate design and security review, not permission to add a general-purpose shell endpoint.

A MacBook-hosted relay is a last-resort optional fallback for occasions when the MacBook is on. It must never be required for ordinary TV control.

## Existing TV Studio architecture and safety constraints

- TV Studio is a plain Java Android TV app built by `build.sh`; it has no Gradle project or embedded network server.
- `Adb.java` connects to the TV's own ADB daemon at `127.0.0.1:5555`. This is loopback inside the TV, not a remote API.
- `HomeMode.java` owns the reversible TV Studio / Original launcher switch and watchdog. The remote client must not invoke mode switching or package disabling.
- The repository documents Philips 65PUG7406/78 as Android TV 11; verify the actual installed firmware before relying on it.
- Preserve TV Studio and the Original launcher rollback. Do not modify TV picture, sound, Wi-Fi, accounts, inputs, or system settings as part of pairing.

## MaxxKindle interaction contract

- Normal MaxxKindle dashboard: no full remote control. At most a small TV connection indicator.
- The user explicitly toggles **TV Studio mode** to enter the TV control experience.
- TV Studio mode presents the full-screen remote and TV-specific controls.
- Back/Exit returns to the normal MaxxKindle dashboard and removes the remote from view.
- If the TV is offline or unreachable, show a clear disconnected state and a reconnect action; disable commands that cannot work.
- The remote is a contextual mode, not a persistent dashboard panel.

## MacBook integration

The MacBook remains an optional companion:
- When on, MaxxKindle may expose MacBook status, remote desktop and other separately paired controls.
- When off, TV control and the Fire 7's normal tablet functions continue working.
- MacBook services must not be a dependency for the TV connection.

## Performance and resilience

- The Fire 7 has limited memory and a 1024x600 display. Keep the remote client lightweight; avoid heavy animations, background polling and large libraries.
- Connect only while TV Studio mode is open, or perform a very low-frequency health check while the compact connection indicator is visible.
- Use bounded timeouts, reconnect backoff and a single in-flight request per command class.
- Never block MaxxKindle navigation while discovering or reconnecting to the TV.
- Cache the last known friendly name and pairing state locally; label stale connection data accurately.
- TV standby, Wi-Fi loss, router restart and TV reboot must fail gracefully without command storms.

## Delivery plan

### Milestone 1: verify native Philips remote service
- [x] Confirm TV Studio currently has no external companion API.
- [x] Confirm the existing TV-side ADB client is loopback-only.
- [ ] Confirm the actual TV firmware and Android TV Remote Service package/state.
- [ ] Test TCP 6466/6467 reachability on the home LAN.
- [ ] Confirm on-screen PIN pairing from a test client.
- [ ] Validate core remote commands and reconnection behavior.

### Milestone 2: MaxxKindle remote client
- [ ] Implement the Android TV Remote Protocol client in the lightest suitable Android app layer.
- [ ] Generate and securely store a unique client certificate on the Fire 7.
- [ ] Provide explicit pairing, disconnect and re-pair controls.
- [ ] Add the TV Studio mode screen and full-screen remote.
- [ ] Keep the remote hidden outside TV Studio mode.
- [ ] Test performance on the Fire 7 (1024x600, 1 GB RAM).

### Milestone 3: optional MacBook companion
- [ ] Pair the MacBook independently.
- [ ] Add Mac status and remote desktop features only when the MacBook is available.
- [ ] Keep TV control independent of all MacBook services.

### Fallback milestone: TV-side bridge
- [ ] Only if native Remote Protocol is unavailable, review a TV Studio-side service with explicit pairing, authenticated requests, strict command allowlist, no arbitrary shell/ADB, and a documented off switch.
- [ ] Preserve the Original launcher and watchdog unchanged.

## Release gates

- Fire 7 controls the Philips TV while the MacBook is fully off.
- Pairing requires the owner to approve the on-screen PIN.
- No general-purpose shell or arbitrary ADB endpoint is exposed.
- No public internet access, port forwarding or cloud relay is required.
- TV Studio / Original mode and watchdog behavior remain unchanged.
- TV standby, Wi-Fi loss, router restart and TV reboot recover cleanly.
- The remote is only visible while TV Studio mode is active.
- Kindle, Spotify, YouTube and the Fire 7's general tablet use remain untouched.
