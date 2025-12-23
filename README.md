# Simply FRP GUI

A lightweight desktop application for managing FRP (Fast Reverse Proxy) tunnels on Linux. Expose local development services to the internet without touching config files or the command line.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Linux-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-28-blue.svg)

[![Get it from the Snap Store](https://snapcraft.io/en/dark/install.svg)](https://snapcraft.io/simply-frp-gui)

## Features

### Core
- **Simple Interface** - Add, edit, and remove tunnels with a clean UI
- **One-Click Start/Stop** - Control FRP with a single button
- **Individual Tunnel Control** - Enable/disable specific tunnels without removing them
- **Real-Time Logs** - View FRP output as it happens
- **Dark Theme** - Easy on the eyes

### System Integration
- **System Tray** - Minimize to tray with status indicator (Running/Stopped)
- **Start on Boot** - Optionally launch at login
- **Desktop Notifications** - Get notified on connection/disconnection events
- **Application Menu** - File menu with import/export, standard keyboard shortcuts

### Security
- **Encrypted Token Storage** - Auth tokens encrypted using system keychain
- **Secure Config Files** - Config files have restricted permissions (600)
- **Connection Testing** - Test server connectivity before starting

### Configuration
- **Config Preview** - Live preview of generated frpc.toml
- **Export/Import** - Backup and restore your tunnel configurations
- **Port Range Selection** - Define allowed remote port range with dropdown selection
- **Auto-Reconnect** - Automatically reconnects on connection failure

### Convenience
- **Quick Link Access** - Click link icon to copy or open tunnel address in browser
- **Auto-Install frpc** - The .deb package automatically installs frpc
- **Persistent Config** - Settings survive restarts

## Installation

### From Snap Store (Recommended)

```bash
sudo snap install simply-frp-gui
```

### From .deb Package

Download: [simply-frp-gui_0.1.1_amd64.deb](https://github.com/ryonwhyte/Simply-FRP-GUI-Client/raw/main/release/simply-frp-gui_0.1.1_amd64.deb)

```bash
sudo dpkg -i simply-frp-gui_0.1.1_amd64.deb

# If there are dependency issues
sudo apt-get install -f
```

The installer automatically downloads and installs the **latest version** of `frpc` if not present.

### From AppImage

```bash
chmod +x Simply-FRP-GUI-0.1.1.AppImage
./Simply-FRP-GUI-0.1.1.AppImage
```

Note: AppImage requires manual frpc installation.

## Usage

### First-Time Setup

1. **Open the App** - Launch "Simply FRP GUI" from your applications menu

2. **Configure Server Settings** - Click the Settings button:

   | Field | Description | Example |
   |-------|-------------|---------|
   | Server Address | Your FRP server hostname or IP | `frp.example.com` |
   | Server Port | FRP server bind port | `7000` (default) |
   | Auth Token | Token configured on your FRP server | `your-secret-token` |
   | Remote Port Range | Min/max ports for tunnel selection | `6000-6100` |

3. **Test Connection** - Click "Test" to verify server connectivity

4. **Save Settings** - Click "Save" to store your configuration

### Adding a Tunnel

1. Click **"+ Add Tunnel"** on the main screen

2. Fill in the tunnel details:

   | Field | Description | Example |
   |-------|-------------|---------|
   | Tunnel Name | Identifier (auto-generated if blank) | `web-server` |
   | Local IP | Where your service runs | `127.0.0.1` |
   | Local Port | Your service's port | `3000` |
   | Remote Port | Select from available ports | `6001` |

3. Click **"Add"** to save

### Managing Tunnels

- **Enable/Disable** - Toggle individual tunnels on/off without deleting
- **Edit** - Click "Edit" to modify tunnel settings
- **Delete** - Click "Delete" to remove a tunnel
- **Quick Link** - Click the link icon (↗) to copy or open the tunnel URL

### Starting the Connection

1. Click **"Start FRP"** to establish tunnels
2. Watch the **Logs** panel for connection status
3. The status bar shows **Running** (green) when connected
4. The app minimizes to system tray - look for the tray icon

### Accessing Your Service

Once running, your local service is accessible at:
```
http://your-frp-server:remote-port
```

### System Tray

- **Left-click** tray icon to show the window
- **Right-click** for quick menu (Start/Stop FRP, Quit)
- Tray tooltip shows current status

### Import/Export Config

- **File > Export Config** - Save tunnel configuration to JSON file
- **File > Import Config** - Load tunnels from a backup file
- Note: Auth tokens are NOT exported for security

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Import Config |
| `Ctrl+S` | Export Config |
| `Ctrl+Q` | Quit |
| `Ctrl+R` | Reload |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "frpc not found" | Install frpc: `sudo apt install frp` or reinstall the .deb |
| "Connection refused" | Check if your local service is running |
| "Auth failed" | Verify the auth token matches your FRP server config |
| "Port already in use" | Choose a different remote port |
| Test shows "Failed" | Check server address/port, firewall rules |

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/ryonwhyte/Simply-FRP-GUI-Client.git
cd Simply-FRP-GUI-Client

# Install dependencies
npm install

# Generate icons
npm run icons

# Start development mode
npm run dev
```

### Project Structure

```
simply-frp-gui/
├── electron/
│   ├── main.ts           # Electron main process, tray, menu
│   ├── preload.ts        # IPC bridge
│   ├── config-manager.ts # Settings, encryption, import/export
│   └── frpc-manager.ts   # FRP process control, auto-reconnect
├── src/
│   ├── App.tsx           # Main React component
│   ├── styles.css        # Global styles
│   └── components/
│       ├── Settings.tsx  # Settings with config preview
│       ├── TunnelList.tsx # Tunnel table with toggles
│       ├── TunnelForm.tsx
│       ├── LogViewer.tsx
│       └── StatusBar.tsx
├── build/
│   ├── postinst          # Debian post-install script
│   └── postrm            # Debian post-remove script
└── resources/
    └── icon.*            # App icons
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode with hot reload |
| `npm run build:linux` | Build .deb and AppImage packages |
| `npm run build:win` | Build Windows installer |
| `npm run build:mac` | Build macOS .dmg |
| `npm run icons` | Regenerate icons from SVG |
| `npm run typecheck` | Run TypeScript type checking |

## Configuration

### App Config Location

Settings are stored in:
```
~/.config/simply-frp-gui/config/config.json
```

### Generated frpc.toml

The app generates a valid `frpc.toml` configuration:

```toml
serverAddr = "frp.example.com"
serverPort = 7000

auth.method = "token"
auth.token = "your-token"

[[proxies]]
name = "web-server"
type = "tcp"
localIP = "127.0.0.1"
localPort = 3000
remotePort = 6001
```

## Requirements

### Runtime

- Linux (Ubuntu 22.04+ recommended)
- GTK 3
- frpc (auto-installed with .deb)

### FRP Server

You need access to an FRP server. Options:
- Self-host using [fatedier/frp](https://github.com/fatedier/frp)
- Use a hosted FRP service

## Tech Stack

- **Framework**: Electron 28
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Packaging**: electron-builder

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Ryon Whyte

## Acknowledgments

- [fatedier/frp](https://github.com/fatedier/frp) - The FRP project
