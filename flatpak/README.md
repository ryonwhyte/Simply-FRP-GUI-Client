# Flatpak / Flathub Submission

This directory contains files for publishing Simply FRP GUI to Flathub.

## Files

- `com.ryonwhyte.SimplyFrpGui.yml` - Flatpak manifest
- `com.ryonwhyte.SimplyFrpGui.desktop` - Desktop entry
- `com.ryonwhyte.SimplyFrpGui.metainfo.xml` - AppStream metadata

## Prerequisites

```bash
# Install Flatpak and builder
flatpak install -y flathub org.flatpak.Builder

# Add Flathub repo
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Install required runtimes
flatpak install flathub org.freedesktop.Platform//24.08
flatpak install flathub org.freedesktop.Sdk//24.08
flatpak install flathub org.freedesktop.Sdk.Extension.node20//24.08
flatpak install flathub org.electronjs.Electron2.BaseApp//24.08
```

## Generate npm Sources (Required)

Flathub requires offline builds. Generate the npm dependency sources:

```bash
# Install the generator
pip install flatpak-node-generator

# Generate sources from package-lock.json
cd /path/to/Simply-FRP-GUI-Client
flatpak-node-generator npm package-lock.json -o flatpak/generated-sources.json
```

## Build Locally

```bash
cd flatpak

# Build
flatpak run org.flatpak.Builder --force-clean build-dir com.ryonwhyte.SimplyFrpGui.yml

# Install and test
flatpak run org.flatpak.Builder --user --install --force-clean build-dir com.ryonwhyte.SimplyFrpGui.yml
flatpak run com.ryonwhyte.SimplyFrpGui
```

## Validate Before Submission

```bash
# Lint the manifest
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.ryonwhyte.SimplyFrpGui.yml

# Validate metainfo
appstreamcli validate com.ryonwhyte.SimplyFrpGui.metainfo.xml

# Validate desktop file
desktop-file-validate com.ryonwhyte.SimplyFrpGui.desktop
```

## Submit to Flathub

### 1. Ensure Prerequisites
- [ ] Screenshots committed to `screenshots/` folder
- [ ] Git tag `v0.1.1` created and pushed
- [ ] `generated-sources.json` created
- [ ] Local build works
- [ ] Linter passes

### 2. Fork Flathub Repository
1. Go to https://github.com/flathub/flathub
2. Click "Fork" (uncheck "Copy the master branch only")
3. Clone your fork:
   ```bash
   git clone --branch new-pr https://github.com/YOUR_USERNAME/flathub.git
   cd flathub
   ```

### 3. Create Submission Branch
```bash
git checkout -b add-com.ryonwhyte.SimplyFrpGui
```

### 4. Add Manifest Files
Copy the manifest and supporting files:
```bash
mkdir com.ryonwhyte.SimplyFrpGui
cp /path/to/Simply-FRP-GUI-Client/flatpak/com.ryonwhyte.SimplyFrpGui.yml com.ryonwhyte.SimplyFrpGui/
cp /path/to/Simply-FRP-GUI-Client/flatpak/generated-sources.json com.ryonwhyte.SimplyFrpGui/
```

### 5. Commit and Push
```bash
git add com.ryonwhyte.SimplyFrpGui/
git commit -m "Add com.ryonwhyte.SimplyFrpGui"
git push origin add-com.ryonwhyte.SimplyFrpGui
```

### 6. Create Pull Request
1. Go to https://github.com/flathub/flathub/pulls
2. Create PR from your branch to `new-pr` (NOT master)
3. Title: "Add com.ryonwhyte.SimplyFrpGui"
4. Wait for review feedback

### 7. After Approval
- Flathub creates `github.com/flathub/com.ryonwhyte.SimplyFrpGui`
- Accept GitHub invite (requires 2FA)
- Future updates go directly to that repo

## Updating the App

For future releases:
1. Update version in `package.json`
2. Add `<release>` entry in metainfo
3. Create git tag
4. Regenerate `generated-sources.json` if deps changed
5. Update tag in manifest
6. Push to flathub repo

## Resources

- [Flathub Docs](https://docs.flathub.org/)
- [Flathub Matrix](https://matrix.to/#/#flathub:matrix.org)
- [Flathub Discourse](https://discourse.flathub.org/)
