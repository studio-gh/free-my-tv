# Philips compatibility diagnostics

This is a **read-only** inventory for TV Studio's primary validation device: Philips 65PUG7406/78 (Android TV 11).

It does not change the launcher, package state, Wi-Fi, inputs, accounts, or device settings. It does not read saved Wi-Fi credentials, Google account data, or personal media.

## Run

1. On the TV, enable Developer options and USB debugging.
2. Connect the TV from a computer on the same network:

   ```bash
   adb connect <TV_IP>:5555
   adb devices
   ```

3. Run the diagnostic:

   ```bash
   bash tools/philips-diagnostics.sh <TV_IP>:5555
   ```

   Example:

   ```bash
   bash tools/philips-diagnostics.sh 192.168.1.50:5555
   ```

4. Save the terminal output locally if you want to attach it to a GitHub issue or share it for review. Check it for device identifiers before publishing.

## What it reports

- Manufacturer, model, Android release, SDK, build fingerprint, display size and available memory.
- The activity Android currently resolves for the HOME intent.
- Packages currently disabled.
- Installed/enabled state and package flags for known Philips / TP Vision and MediaTek system components.
- A limited Cast diagnostic: TCP port 8009 and the media / Google Play services processes.

A missing package is reported as not installed. A command the firmware does not support is reported as unavailable; neither result is interpreted as proof that a package is safe to disable.

## Philips safety baseline

The TV Detox field notes are useful as a second source, not as an automatic package list. Philips firmware varies by model and region. In particular:

- Keep Philips / TP Vision components related to HOME resolution, global keys, Live TV, HDMI inputs, TV System UI, power management, settings, and factory/service menus protected.
- Treat `org.droidtv.eum` and `org.droidtv.aurora` as protected. Disabling either has been reported to destabilize `xtv`.
- Keep MediaTek TV service, input, network, setup, and factory components protected.
- Never infer safety from a package name alone. Check the exact device, package flags, dependencies, and behavior.
- If package flags or inventory cannot be read, the result is **unknown**, not safe.
- Never uninstall system packages. Any future package change must be separately reviewed, logged, reversible, and explicitly approved.

Reference: [Potowai/android-tv-detox](https://github.com/Potowai/android-tv-detox), especially its debloating guide and case-study notes. TV Studio's own safety contract remains authoritative for changes made by this project.

## Acceptance checklist after any future approved change

- [ ] HOME resolves to the intended component.
- [ ] Home button opens TV Studio as expected.
- [ ] Original Philips launcher can be restored.
- [ ] Live TV opens and channels remain available.
- [ ] HDMI 1 / HDMI 2 inputs open and switch correctly.
- [ ] Remote navigation, global keys, volume and power behavior remain intact.
- [ ] Wi-Fi reconnects after a reboot.
- [ ] Casting is available when the device supports and the household uses it.
- [ ] No Philips / MediaTek system component has been disabled unexpectedly.
- [ ] The TV completes a normal restart without a boot loop or recovery screen.

Physical-device testing is mandatory. CI can validate the script and source code; it cannot certify Philips firmware behavior.
