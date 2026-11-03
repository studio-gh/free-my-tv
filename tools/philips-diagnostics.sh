#!/usr/bin/env bash
# Read-only inventory for Philips Android TV / Google TV.
# Usage: tools/philips-diagnostics.sh <adb-serial>
# Example: tools/philips-diagnostics.sh 192.168.1.50:5555

set -Eeuo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: $0 <adb-serial>" >&2
  echo "Example: $0 192.168.1.50:5555" >&2
  exit 2
fi

serial=$1
adb_bin=${ADB:-adb}

if ! command -v "$adb_bin" >/dev/null 2>&1; then
  echo "adb was not found. Install Android platform-tools and try again." >&2
  exit 127
fi

state=$("$adb_bin" -s "$serial" get-state 2>&1) || {
  echo "TV is not connected as an authorized ADB device: $serial" >&2
  echo "Connect first with: adb connect $serial" >&2
  exit 1
}
if [[ "$state" != "device" ]]; then
  echo "ADB device is not ready ($state)." >&2
  exit 1
fi

section() {
  printf '\n## %s\n' "$1"
}

read_device() {
  local label=$1
  shift
  printf '%-25s ' "$label"
  if ! "$adb_bin" -s "$serial" shell "$@" 2>/dev/null | tr -d '\r' | sed '/^[[:space:]]*$/d'; then
    printf '%s\n' "unavailable"
  fi
}

section "Device"
read_device "Manufacturer:" getprop ro.product.manufacturer
read_device "Brand:" getprop ro.product.brand
read_device "Model:" getprop ro.product.model
read_device "Device:" getprop ro.product.device
read_device "Android release:" getprop ro.build.version.release
read_device "SDK:" getprop ro.build.version.sdk
read_device "Build fingerprint:" getprop ro.build.fingerprint
read_device "Display:" wm size
read_device "Memory:" free -m

section "Resolved home activity"
if ! "$adb_bin" -s "$serial" shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME 2>&1; then
  "$adb_bin" -s "$serial" shell pm resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME 2>&1 || true
fi

section "Package state"
echo "Disabled packages:"
"$adb_bin" -s "$serial" shell pm list packages -d 2>&1 | tr -d '\r' | sort || true

section "Philips and MediaTek system packages"
packages=(
  org.droidtv
  org.droidtv.ambisvc
  org.droidtv.ui.strings
  org.droidtv.tv.packageinfo
  org.droidtv.icp
  org.droidtv.gel
  org.droidtv.eum
  org.droidtv.homeintentresolver
  org.droidtv.globalkey
  org.droidtv.playtv
  org.droidtv.hdmiservice
  org.droidtv.channels
  org.droidtv.tvsystemui
  org.droidtv.tvpowermanagerservice
  org.droidtv.tv.tptvservice
  org.droidtv.lkb
  org.droidtv.xtv
  org.droidtv.settings
  org.droidtv.menudataapp
  org.droidtv.aurora
  com.mediatek.tv.service
  com.mediatek.tvinput
  com.mediatek.network
  com.mediatek.wwtv.tvcenter
  com.mediatek.wwtv.setupwizard
  com.mediatek.tv.factory
  mediatek.factorymenu.ui
  com.tpv.xmic.ots.cms.client
)

installed=$("$adb_bin" -s "$serial" shell pm list packages 2>/dev/null | tr -d '\r' || true)
disabled=$("$adb_bin" -s "$serial" shell pm list packages -d 2>/dev/null | tr -d '\r' || true)

for package in "${packages[@]}"; do
  if grep -Fxq "package:$package" <<<"$installed"; then
    if grep -Fxq "package:$package" <<<"$disabled"; then
      status="DISABLED"
    else
      status="enabled"
    fi
    flags=$("$adb_bin" -s "$serial" shell dumpsys package "$package" 2>/dev/null | grep -m1 -E 'pkgFlags=|flags=' | tr -d '\r' || true)
    printf '%-42s %-9s %s\n' "$package" "$status" "${flags:-flags unavailable}"
  else
    printf '%-42s %s\n' "$package" "not installed"
  fi
done

section "Casting and core media services"
echo "Listening TCP sockets (port 8009 is commonly used by Cast):"
"$adb_bin" -s "$serial" shell netstat -ltn 2>&1 | tr -d '\r' | grep -E '(^|[.:])8009([[:space:]]|$)' || echo "No 8009 listener reported (or netstat unavailable)."
echo "Relevant processes:"
"$adb_bin" -s "$serial" shell ps -A 2>&1 | tr -d '\r' | grep -E 'mediashell|com\.google\.android\.gms' || echo "No matching process reported."

section "Report boundary"
echo "Read-only inventory. No package state, HOME setting, network setting, or device data was changed."
echo "Review the complete output before proposing any device-side action."
