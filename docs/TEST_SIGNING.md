# Test signing key

The test APK uses a separate Android application ID (`io.freemytv.paineltest3`). Its signing key is not the production release key.

Do not generate or distribute a private signing key through a public GitHub Actions artifact. Create it on your own computer, then store its values as repository Actions secrets.

## 1. Generate the key locally

Use the JDK 17 already required for Android builds:

```bash
keytool -genkeypair -keystore tv-studio-test.keystore -alias tvstudio -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=TV Studio Test"
```

When prompted, choose a strong store password. When asked for the key password, press Enter to use the same password. Keep both the keystore and password private. The keystore filename is ignored by Git.

## 2. Encode the keystore

Linux:

```bash
base64 -w0 tv-studio-test.keystore
```

macOS:

```bash
base64 < tv-studio-test.keystore | tr -d '\\n'
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("tv-studio-test.keystore")) | Set-Clipboard
```

Copy the complete Base64 value. Do not commit it or paste it into an issue, pull request or chat.

## 3. Add repository secrets

In GitHub, open **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|---|---|
| `TV_STUDIO_TEST_KEYSTORE_BASE64` | The Base64 value from step 2 |
| `TV_STUDIO_TEST_KEYSTORE_PASSWORD` | The password chosen in step 1 |

The workflow uses the same password for the keystore and key.

## 4. Verify

Run the **Check** workflow. The Android job should:
1. Decode the existing test keystore.
2. Build the isolated test package.
3. Upload `TV-Studio-Test-APK` only when persistent signing is configured.

Without these secrets, CI still builds a disposable validation APK but does not upload it. This keeps compilation checks independent from release signing.

Never use this test key to sign a production release. Production signing must have its own separately managed key and release process.
