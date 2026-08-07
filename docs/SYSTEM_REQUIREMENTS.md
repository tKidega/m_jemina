# System Requirements

Requirements for building and running the **Jemi-na Shopping App** (`m_jemina`) on this machine and on a clean developer machine.

## Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores (x86_64) | 8 cores |
| RAM | 16 GB | 32 GB (Gradle daemon is configured at `-Xmx4096m`) |
| Disk | 30 GB free | 60 GB+ (SDK + emulator system images are large) |

## Software — Required

| Component | Version | Notes |
|-----------|---------|-------|
| Windows | 10 / 11 | Also macOS/Linux, but this machine is Windows |
| Node.js | **>= 22.11.0** | Enforced via `engines` in `package.json` |
| npm | 10.x+ | Bundled with Node 22 |
| JDK | **21 (LTS)** | Toolchain target. `JAVA_HOME` must point to a JDK 21 |
| Android Studio | Latest stable | For SDK manager + emulator (optional but recommended) |
| Android SDK | Platform API 36 | `compileSdk`/`targetSdk` = 36 per React Native 0.85 |
| Build Tools | 36.0.0 | Declared by React Native 0.85 |
| Android NDK | **27.1.12297006** | Pinned by React Native 0.85 (`ndkVersion`) |
| Android platform-tools | Latest | `adb`, `emulator` on `PATH` |
| Git | 2.x | Version control |

## Software — Runtime Versions (React Native 0.85 defaults)

These are resolved by the React Native Gradle plugin from `node_modules/react-native/gradle/libs.versions.toml`:

- AGP: 8.12.0
- Kotlin: 2.1.20
- Gradle wrapper: 9.3.1 (see note below about offline distribution)
- compileSdk / targetSdk: 36
- minSdk: 24
- NDK: 27.1.12297006

> ⚠️ Gradle 9.3.1 is newer than the RN template's default (8.x). The wrapper distribution URL points at a **local file** to avoid flaky network downloads — see `docs/CONFIGURATION.md`.

## Android Emulator (for testing)

Any AVD with API level 24-36 works. Recommended AVDs already configured on this machine:

| AVD | API Level |
|-----|-----------|
| Pixel_7_API_30 | 30 |
| Pixel_7_Pro_API_31 | 31 |
| Pixel_8_API_34 | 34 |
| Pixel_9_Pro_XL_API_35 | 35 |

## Environment Variables

Required on Windows (see `docs/CONFIGURATION.md` for current values):

| Variable | Purpose |
|----------|---------|
| `JAVA_HOME` | Must resolve to a JDK 21 installation |
| `ANDROID_HOME` | Android SDK root |
| `ANDROID_SDK_ROOT` | Same as `ANDROID_HOME` (legacy alias) |
| `PATH` | Must include `%ANDROID_HOME%\platform-tools` |

## Developer Tools (optional)

- VS Code with the React Native + TypeScript extensions
- Android Studio (project lives under `android/`)
- Xcode + CocoaPods — required **only** for iOS builds (not configured on this Windows machine)

## Production / Deployment (future)

- Device storage: ~120 MB APK + data
- Minimum OS: Android 7.0 (API 24)
- Internet connection required to reach the Jemi-na API (not yet wired)
- Push notifications, analytics and crash reporting are not yet integrated
