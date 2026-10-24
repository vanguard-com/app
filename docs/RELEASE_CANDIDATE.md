# Release candidate verification

Verified 24 October 2026. [Phase 8 PR #10](https://github.com/vanguard-com/app/pull/10) merged
at **11:19 Singapore time**. The original implementation plan ends at Phase 8; the next stage
is physical acceptance and signed distribution, rather than another planned feature phase.

## Verified builds

| Evidence                 | Source                                                                      | Result                                                                  |
| ------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Merged main              | `e5874c4ec284abde87705666c2d183acee28826c`                                  | Phase 8 merged                                                          |
| Main CI                  | [40057818814](https://github.com/vanguard-com/app/actions/runs/40057818814) | Passed                                                                  |
| Main Android APK and AAB | [40057818844](https://github.com/vanguard-com/app/actions/runs/40057818844) | Passed; merged manifest, ELF and APK zip checks passed                  |
| iOS Release archive      | [40055634172](https://github.com/vanguard-com/app/actions/runs/40055634172) | Passed, unsigned; source `93148f3` has the same Git tree as merged main |

The matching source tree is `6573d8542bbd3af975660067ccb82e18739319b8`. This associates the
existing iOS evidence with the merged source without claiming a separate main iOS run.
The [machine-readable record](release-evidence/phase8-build-verification.json) preserves
run/artifact IDs and measured artifact details. These facts apply to the listed source,
not automatically to future builds.

### Android artifact inspection

The published `lumi-e5874c4.apk` was downloaded and independently inspected:

- 217,199,140 bytes; ARM64 only; embedded JavaScript bundle present.
- All 51 ARM64 native libraries have ELF load-segment alignment of at least 16,384 bytes.
- Uncompressed library entries also have 16,384-byte ZIP alignment.
- CI separately checked both APK and AAB and ran Android `zipalign` successfully.

APK SHA-256:

```text
a3458cf870fe2b4c2527394ded363e714ed3ecd8d82589e1a15d08cd45f925a0
```

This is a release-mode **test-key APK**, not a Play-signed release. Alignment checks do not
prove operation on a 16 KB-page device. The AAB is also test-key signed; do not submit it to Play.

### iOS artifact inspection

The build evidence contains `com.vanguard.lumi`, version 1.0.0, build 1, minimum iOS 16.4,
SDK `iphoneos26.5` and Xcode build setting `2660`. The archive check verified embedded JS,
required purpose strings, required-reason API entries and removal of development discovery.
It is an **unsigned Release archive**; no installable IPA or TestFlight upload is implied.

The exported archive contains 18 privacy manifests. Its Google Data Transport manifest
declares `OtherDiagnosticData` for `Analytics`, with `Linked = false` and `Tracking = false`.
The app-level collected-data array is empty, but that does not erase SDK declarations.
See the [actual exported manifests](release-evidence/phase8-ios-privacy-manifests.json) and
[store privacy worksheet](STORE_PRIVACY.md). A signed archive and final provider practices
still need review before submitting forms.

## Install and test Android now

1. On an ARM64 Android 10+ phone, open the
   [latest test APK](https://github.com/vanguard-com/app/releases/download/android-latest/lumi-latest.apk).
   Allow your browser to install it when Android asks. No Expo or store account is needed.
2. Read the release notes on [android-latest](https://github.com/vanguard-com/app/releases/tag/android-latest)
   to identify its source commit. This alias changes after later main builds; the hash above
   applies only to `e5874c4`, not every future `lumi-latest.apk`.
3. For this exact snapshot while its artifact is retained, use the APK artifact attached to
   [run 40057818844](https://github.com/vanguard-com/app/actions/runs/40057818844). Extract the
   APK from the downloaded ZIP. Artifacts expire after 14 days and may require GitHub login.
4. Complete [the ten Phase 8 checks](PHASE_8.md#physical-release-acceptance), especially:
   onboarding and skipped permissions; TalkBack/large text/landscape; record with audio;
   playback; Save and Share with Photos denied; volume keys; offline guidance; model handling;
   and sustained camera use. Record device, OS, actual build and failures in the acceptance form.

For iPhone, use the signed local Xcode route in [RELEASE.md](RELEASE.md) until owner accounts
are connected. An unsigned GitHub archive cannot be installed directly on an iPhone.

## Remaining release work

The repository is not linked to an EAS project: `app.json` has no `extra.eas.projectId`.
No Expo token or Apple team ID is configured in this cloud session. This describes the current
workspace configuration; it does not assert that the owner has no accounts elsewhere.

Use [RELEASE.md](RELEASE.md) to connect the actual owner account/project and dedicated signing
credentials when ready. No account was created, paid build queued or store submission made.
Signed AAB/IPA validation, real-device acceptance, real screenshots/feature graphic and final
store privacy/rating forms remain pending. There are no new physical-device test results.

Both owner-approved GitHub policy and support URLs returned HTTP 200 without authentication
after merge. Keep these URLs until the website is ready. See [STORE_LISTING.md](STORE_LISTING.md).
