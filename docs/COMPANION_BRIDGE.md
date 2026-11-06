# TV Studio Companion Bridge

Status: architecture specification, not an installed service.

## Purpose

Let MaxxKindle 2.0 on the Fire 7 control and inspect the Philips 65PUG7406/78 running TV Studio, without changing TV Studio's launcher lifecycle or exposing the TV's ADB port to the home network.

The bridge is an optional companion process on the MacBook. It connects to the TV through the Mac's ADB client and exposes a small authenticated HTTP API to MaxxKindle on the trusted home LAN.

The TV remains independently usable when the MacBook, Fire tablet, bridge, or Wi-Fi is unavailable.

## Existing architecture and constraints

- TV Studio is a plain Java Android TV app built by `build.sh`; it has no Gradle project or embedded network server.
- `Adb.java` connects to the TV's own ADB daemon at `127.0.0.1:5555`. This is loopback inside the TV, not a remote API.
- `HomeMode.java` owns the reversible TV Studio / Original launcher switch and watchdog. The bridge must not invoke mode switching or package disabling.
- The Philips target is documented in this repository as 65PUG7406/78 running Android TV 11. Validate the live device before relying on exact firmware behavior.
- Android 11 wireless debugging uses pairing and can require renewed setup after TV restart. Do not assume port 5555 remains available permanently.
- Existing TV Studio features and the Original launcher rollback must remain unaffected.

## Deployment topology

```text
Fire 7 / MaxxKindle
       |
       | authenticated requests over trusted home Wi-Fi
       v
MacBook / Companion Bridge
       |
       | ADB client connection, paired/authorized by the owner
       v
Philips Android TV / TV Studio
```

The bridge runs on the MacBook as an optional local service. The first prototype should be started manually, with a visible status/log and an explicit stop action. A background login service can be considered only after the manual prototype is stable.

Do not put a listener or an ADB server into the TV Studio Android app in the first milestone. Do not expose ADB directly to the LAN or internet.

## Security requirements

1. Bind the HTTP listener only to the MacBook's LAN interface or an explicitly selected private interface. Never bind to `0.0.0.0` by default.
2. No internet port forwarding, public tunnel, cloud relay, or remote exposure.
3. Require a one-time pairing flow initiated by the owner. Generate a high-entropy random token on the MacBook; show it as a QR code or short-lived pairing code. The token must not be committed, logged, or placed in a URL.
4. Store the token in the MacBook user's private application data with owner-only file permissions. Allow revocation and re-pairing.
5. Require authentication for every command. Reject missing, invalid, expired, or revoked credentials.
6. Apply strict CORS/origin checks for the MaxxKindle client, request size limits, timeouts, and rate limits.
7. Use an explicit command allowlist. Never expose a general-purpose shell endpoint, arbitrary ADB command endpoint, file access, package manager, settings writer, or launcher-mode switch.
8. Validate every parameter against a fixed schema. Do not interpolate user-supplied strings into shell commands.
9. Show a connection/pairing state in both clients. A failed or offline bridge must not leave apparently active controls.
10. Keep logs minimal: timestamps, operation names, duration and result only. Never log tokens, personal calendar data, media titles, or arbitrary command output.

For the first LAN prototype, use a short-lived pairing secret plus authenticated requests over the private network. Before unattended use, add HTTPS with a locally generated certificate and a clear certificate-pinning flow, or another reviewed secure transport. Do not silently downgrade to unauthenticated HTTP.

## API contract (v1)

All endpoints are under `/api/v1`. JSON responses include `ok`, `data` or a stable `error.code`; never return raw ADB output.

### Read-only

- `GET /health`: bridge version, uptime, paired-client state, ADB connection state. No device identifiers beyond the configured friendly TV name.
- `GET /tv/status`: reachable/unreachable, last successful contact, Android version and TV Studio package-installed state.
- `GET /tv/now-playing`: only if the user has explicitly enabled TV Studio's existing Now Playing permission and the implementation can read a supported, non-sensitive status. Otherwise return `unsupported`; never scrape another app's private data.
- `GET /tv/apps`: optional allowlisted app identifiers and display names, derived from the installed launcher intents. No package manager controls.

### Allowlisted actions

- `POST /tv/remote`: one of `up`, `down`, `left`, `right`, `select`, `back`, `home`, `menu`.
- `POST /tv/volume`: one of `up`, `down`, `mute`.
- `POST /tv/launch`: an app ID from the bridge's current allowlist only. Reject arbitrary package names and deep links.
- `POST /tv/refresh-status`: request a bounded status refresh.

The bridge must return a clear unsupported response for commands the Philips firmware or current TV Studio build cannot safely perform. Do not report success merely because a shell process was launched; verify the command result where possible.

## Command implementation boundary

Use the MacBook's ADB client as the transport. Keep ADB interaction in one isolated adapter module. The adapter may run only fixed, reviewed commands for the actions above.

Before enabling a command, validate it on the Philips TV with a manual ADB session and record:
- command and expected effect;
- supported Android/Philips firmware range;
- observed success/failure response;
- whether the TV must be awake;
- whether it still works after a TV restart and ADB re-pair.

The bridge must never call TV Studio's internal mode-switch implementation. It must not disable apps, alter HOME resolution, modify Wi-Fi, or change TV picture, sound, account, input or system settings.

## MaxxKindle interaction contract

- Normal MaxxKindle dashboard: no full remote control. At most a small TV connection indicator.
- The user explicitly toggles **TV Studio mode** to enter the TV control experience.
- TV Studio mode presents the full-screen remote and TV-specific controls.
- Back/Exit returns to the normal MaxxKindle dashboard and removes the remote from view.
- If the TV or bridge is offline, show the disconnected state and a reconnect action; disable commands that cannot work.
- The remote is an interface state, not a persistent dashboard panel.

## Performance and resilience

- Status polling is low frequency and pauses while the TV mode is closed or the tablet is asleep.
- Use bounded timeouts and a single in-flight request per command class.
- Cache the last known status with a timestamp; label stale data as stale.
- Never block MaxxKindle navigation while the bridge connects.
- Bridge restart, Wi-Fi loss, Mac sleep, TV standby and ADB disconnection must fail closed and recover without repeated command storms.
- MaxxKindle and the TV must remain useful independently when the bridge is unavailable.

## Delivery plan

### Milestone 1: protocol and diagnostics
- [x] Confirm TV Studio has no external companion API today.
- [x] Confirm the existing TV-side ADB client is loopback-only.
- [ ] Confirm current Philips IP, ADB pairing state and firmware with a read-only diagnostic.
- [ ] Confirm the MacBook can reach the TV over the same trusted LAN.

### Milestone 2: MacBook bridge prototype
- [ ] Choose a lightweight runtime already available on the MacBook (prefer Python standard library unless the repository's existing tooling gives a better reason).
- [ ] Implement health/status endpoints only.
- [ ] Add local pairing and token revocation.
- [ ] Test offline, invalid-token, Mac sleep and TV restart behavior.

### Milestone 3: safe controls
- [ ] Add directional/select/back/home remote commands after device validation.
- [ ] Add volume controls after device validation.
- [ ] Add allowlisted app launch after validating Philips launch intents.
- [ ] Keep shell access private to the adapter; never expose it over HTTP.

### Milestone 4: MaxxKindle client
- [ ] Build the TV Studio mode screen and remote.
- [ ] Keep the remote hidden outside TV Studio mode.
- [ ] Add connection, pairing and offline states.
- [ ] Test on the Fire 7 (1024x600, 1 GB RAM) with low-frequency polling.

### Release gates
- Manual pairing and revocation work.
- No unauthenticated command is accepted.
- No arbitrary shell/ADB command is exposed.
- TV Studio / Original mode and watchdog behavior are unchanged.
- TV control is tested on the physical Philips 65PUG7406/78.
- MacBook sleep, TV standby, Wi-Fi loss and bridge restart recover cleanly.
- The Fire 7 remains a normal tablet and all existing Kindle, Spotify and YouTube apps remain untouched.
