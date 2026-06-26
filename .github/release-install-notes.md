## Install ESP Board Vault

Download the installer for your operating system. The `.blockmap` and `latest*.yml` files are auto-update metadata and are not needed for a manual install.

### Windows

1. Download the [Windows x64 installer](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-windows-x64.exe), or the [Windows x64 portable zip](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-windows-x64.zip).
2. Run the installer, or extract the zip file.
3. Launch **ESP Board Vault** from the Start menu, or run **ESP Board Vault.exe** from the extracted portable folder.

### macOS

1. Download the correct package for your Mac:
   - Apple Silicon Macs with M1, M2, M3, or newer chips: [macos-arm64 DMG](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-macos-arm64.dmg), or the [macos-arm64 zip](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-macos-arm64.zip) if the DMG does not mount.
   - Intel Macs: [macos-x64 DMG](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-macos-x64.dmg).
2. For DMG downloads, open the `.dmg` file and drag **ESP Board Vault** into **Applications**.
3. For ZIP downloads, extract the zip file and move **ESP Board Vault.app** into **Applications**.
4. Launch **ESP Board Vault** from **Applications**.

If macOS blocks the app because it is not notarized, Control-click the app, choose **Open**, and confirm. You can also allow it from **System Settings > Privacy & Security**.

Portable option for Intel Macs: download the [macos-x64 zip](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-macos-x64.zip), extract it, and launch **ESP Board Vault.app**.

### Linux

Ubuntu or Debian:

1. Download the [Ubuntu/Debian package](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-linux-amd64.deb).
2. Install it with your software installer, or run:

   ```bash
   sudo apt install ./ESP.Board.Vault-{{VERSION}}-linux-amd64.deb
   ```

3. Launch **ESP Board Vault** from your app menu, or run:

   ```bash
   esp-board-vault
   ```

Ubuntu / WSL troubleshooting: if the app installs but fails to launch with `error while loading shared libraries: libasound.so.2: cannot open shared object file`, install the ALSA runtime package and try again:

```bash
sudo apt update
sudo apt install libasound2t64
```

On older Ubuntu releases, use:

```bash
sudo apt install libasound2
```

Most Linux distributions:

1. Download the [Linux AppImage](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-linux-x86_64.AppImage).
2. Launch **ESP Board Vault** by making the AppImage executable and running it:

   ```bash
   chmod +x ESP.Board.Vault-{{VERSION}}-linux-x86_64.AppImage
   ./ESP.Board.Vault-{{VERSION}}-linux-x86_64.AppImage
   ```

Portable archive option: download the [Linux x64 tarball](https://github.com/{{REPOSITORY}}/releases/download/{{TAG_NAME}}/ESP.Board.Vault-{{VERSION}}-linux-x64.tar.gz), extract it, and run **esp-board-vault** from the extracted folder.

### Updating

The Windows installer and Linux AppImage builds can update themselves in-app. Open **Settings > Updates**, then either enable **Check for updates on startup** or use **Check for updates now**. When a new version is found, choose **Download & install** — the app downloads the update, restarts, and relaunches on the new version. Your local vault data is kept separately from the app files and remains in place across updates.

The portable zip, Linux `.deb`, Linux tarball, and macOS builds do not self-update. For those, download the newest release for your operating system and install it over your current version:

- Windows portable zip: download the newest zip, extract it, and replace your old portable folder.
- macOS DMG: download the newest matching `macos-*.dmg`, drag **ESP Board Vault** into **Applications**, and choose **Replace** if macOS asks.
- macOS zip: download the newest matching `macos-*.zip`, extract it, move **ESP Board Vault.app** into **Applications**, and choose **Replace** if macOS asks.
- Linux `.deb`: download the newest package and run `sudo apt install ./ESP.Board.Vault-{{VERSION}}-linux-amd64.deb`.
- Linux tarball: download the newest tarball, extract it, and replace your old extracted folder.

### Source Code

The automatically generated **Source code (zip)** and **Source code (tar.gz)** downloads contain the project source for developers. They are not prebuilt desktop app installers.
