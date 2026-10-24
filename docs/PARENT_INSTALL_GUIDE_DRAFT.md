# Parent Installation Guide — Draft

**Status:** Draft for a future signed family release. No production APK is published from this implementation branch. Do not install a debug CI APK as an upgrade to an existing family installation.

## Before installing

1. Get the APK only from the official release page linked by the project maintainers. The release must identify the version, release date, APK checksum, and signing certificate fingerprint.
2. Compare the published SHA-256 checksum with the downloaded APK using a trusted checksum tool. If it differs, delete the file and stop.
3. Confirm that Android reports the expected package and signer for an update. An update must be signed by the same trusted certificate as the installed app (or use a verified, supported signing-key rotation). If Android says the app is incompatible or asks you to uninstall the existing app, cancel. Uninstalling can remove local profiles and saved progress.
4. Keep Google Play Protect enabled. Android may show an unfamiliar-developer warning for an app distributed outside Google Play. Continue only if the release and signer have been independently verified from the official release information.
5. If Play Protect identifies malware or blocks the APK for a security reason, cancel installation and do not override the warning. Report the release for investigation.

## Install or update

1. Open the verified APK on the Android device.
2. If prompted, allow your file manager or browser to install apps from this source for this installation.
3. Review Android's package/update confirmation. Check that it is an update to the existing app when applicable. Cancel if the package, signer, or version is unexpected.
4. Approve installation through Android's installer. The app does not install updates silently.
5. After installation, return to Settings and turn off the temporary “Allow from this source” permission if it is no longer needed. Leave Play Protect on.

## First launch and saved profiles

1. Open My Magical Kitchen and confirm that the version shown matches the release notes.
2. Check the child profiles, saved recipe progress, favorites, achievements, and preferences before deleting any older app data.
3. If profiles or progress are missing, stop using the app and preserve the device state. Do not uninstall or clear storage; contact the project maintainer with the app version and a description of the issue.

## Stop and get help if

- The APK did not come from the official release page or its checksum is missing/mismatched.
- The signer fingerprint differs from the published release information.
- Android requests uninstalling the current app to install the update.
- Play Protect reports malware or another specific security threat.
- Existing profiles or progress disappear after the update.
- The installation asks for permissions unrelated to the documented app behavior.


## One-time transition from the currently installed debug APK

The owner confirmed that no saved app data needs migration. The supplied/current APK was identified as debug-signed; the first release signed with the new permanent key cannot update that installation in place. Keep the existing app installed until the new signed APK is built and verified. Before installing that first release, explain that uninstalling the debug build clears its local app data; the owner has accepted this clean-install path. After that first install, future APK releases must use the same `aaria-v3-release` signing key and must be tested as in-place updates. Do not use this exception to bypass a malware-specific Play Protect warning.

## Release-specific information to add before publication

- Official release page: **Not available yet**
- Version and release date: **Not available yet**
- APK SHA-256: **Not available yet**
- Signing certificate fingerprint: **Not available yet**
- Supported Android versions/devices: **Pending device validation**
- Support contact: **Pending maintainer details**

This draft is not a substitute for verifying a specific APK. It must be completed with signed-release details and reviewed against current Android prompts before family distribution.
