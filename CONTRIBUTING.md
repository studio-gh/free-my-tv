# Contributing to TV Studio

TV Studio is developed in small, reviewable changes. The original TV launcher must remain recoverable.

## Before changing code

1. Read [the performance contract](docs/PERFORMANCE_CONTRACT.md).
2. Read [the safety rules](CLAUDE.md) before touching Android package or HOME behavior.
3. Check the current open pull requests and branch state.
4. Keep unrelated work in separate branches and pull requests.

## Local checks

For Android changes, use JDK 17 and Android build-tools 34 with platform android-34:

```bash
tools/check.sh android
```

For webOS and Tizen changes:

```bash
tools/check.sh web
```

For all checks:

```bash
tools/check.sh
```

The Philips inventory is read-only:

```bash
bash tools/philips-diagnostics.sh <TV_IP>:5555
```

Never run device-changing commands as part of a diagnostic or CI check.

## Pull request expectations

- One purpose per pull request.
- Explain user-visible behavior and the risk/rollback path.
- Include tests actually run and their results.
- Do not claim physical-device validation unless the exact TV model and test are recorded.
- Keep generated binaries, local configuration, signing material, API keys and personal data out of Git.
- Prefer removing duplication over adding another abstraction or helper.
- Keep comments focused on non-obvious constraints; do not narrate straightforward code.

## Release discipline

CI success means the automated checks passed. It does not mean an APK was produced or a physical TV test passed. Report those states separately. Test APKs must remain clearly identified as test builds.
