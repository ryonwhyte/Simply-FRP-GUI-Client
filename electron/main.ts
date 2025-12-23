import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import { FrpcManager } from './frpc-manager'
import { ConfigManager } from './config-manager'

let mainWindow: BrowserWindow | null = null
let frpcManager: FrpcManager | null = null
let configManager: ConfigManager | null = null
let tray: Tray | null = null
let isQuitting: boolean = false

// Determine if we're in development or production
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

function getIconPath() {
  if (isDev) {
    return join(__dirname, '../resources/icon.png')
  }
  return join(app.getAppPath(), 'resources', 'icon.png')
}

function createAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Config...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              title: 'Import Configuration',
              filters: [{ name: 'JSON', extensions: ['json'] }],
              properties: ['openFile']
            })
            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const data = readFileSync(result.filePaths[0], 'utf-8')
                const importResult = configManager?.importConfig(data)
                if (importResult?.success) {
                  mainWindow?.webContents.send('config:reload')
                }
              } catch (error) {
                dialog.showErrorBox('Import Failed', String(error))
              }
            }
          }
        },
        {
          label: 'Export Config...',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow!, {
              title: 'Export Configuration',
              defaultPath: 'frp-gui-config.json',
              filters: [{ name: 'JSON', extensions: ['json'] }]
            })
            if (!result.canceled && result.filePath) {
              try {
                const exportData = configManager?.exportConfig()
                if (exportData) {
                  writeFileSync(result.filePath, exportData)
                }
              } catch (error) {
                dialog.showErrorBox('Export Failed', String(error))
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Simply FRP GUI',
          click: () => {
            const version = app.getVersion()
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Simply FRP GUI',
              message: 'Simply FRP GUI',
              detail: `Version ${version}\n\nA lightweight desktop client for managing FRP (Fast Reverse Proxy) tunnels. Easily configure and control secure tunnels to expose local services.\n\nBuilt with Electron + React\n\nAuthor: Ryon Whyte\nLicense: MIT`
            })
          }
        },
        {
          label: 'FRP Documentation',
          click: () => {
            shell.openExternal('https://github.com/fatedier/frp')
          }
        }
      ]
    }
  ]

  // Add dev tools in development mode
  if (isDev) {
    const viewMenu = template.find(m => m.label === 'View')
    if (viewMenu && Array.isArray(viewMenu.submenu)) {
      viewMenu.submenu.push(
        { type: 'separator' },
        { role: 'toggleDevTools' }
      )
    }
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createTray() {
  if (tray) return

  const iconPath = getIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 22, height: 22 }))

  updateTrayMenu()

  tray.setToolTip('Simply FRP GUI - Stopped')

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })
}

function updateTrayMenu() {
  if (!tray) return

  const isRunning = frpcManager?.getStatus().running ?? false

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => mainWindow?.show()
    },
    { type: 'separator' },
    {
      label: isRunning ? 'Stop FRP' : 'Start FRP',
      click: () => {
        if (isRunning) {
          frpcManager?.stop()
        } else {
          frpcManager?.start()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        frpcManager?.stop()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip(isRunning ? 'Simply FRP GUI - Running' : 'Simply FRP GUI - Stopped')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Simply FRP GUI'
  })

  // Initialize managers
  configManager = new ConfigManager()
  frpcManager = new FrpcManager(configManager)

  // Load the app
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load from the dist folder relative to the app
    // app.getAppPath() returns the correct path even in packaged apps
    const indexPath = join(app.getAppPath(), 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  // Debug: Log the path being loaded (can remove later)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorCode} - ${errorDescription}`)
  })

  // Create app menu and system tray
  createAppMenu()
  createTray()

  // Forward frpc logs to renderer
  frpcManager.on('log', (log: string) => {
    mainWindow?.webContents.send('frpc:log', log)
  })

  frpcManager.on('status', (status: string) => {
    mainWindow?.webContents.send('frpc:status', status)
    updateTrayMenu()
  })

  frpcManager.on('error', (error: string) => {
    mainWindow?.webContents.send('frpc:error', error)
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers

// Config handlers
ipcMain.handle('config:get', async () => {
  return configManager?.getConfig()
})

ipcMain.handle('config:save', async (_event, config) => {
  return configManager?.saveConfig(config)
})

// Tunnel handlers
ipcMain.handle('tunnels:add', async (_event, tunnel) => {
  return configManager?.addTunnel(tunnel)
})

ipcMain.handle('tunnels:update', async (_event, id, tunnel) => {
  return configManager?.updateTunnel(id, tunnel)
})

ipcMain.handle('tunnels:remove', async (_event, id) => {
  return configManager?.removeTunnel(id)
})

// FRP control handlers
ipcMain.handle('frpc:start', async () => {
  return frpcManager?.start()
})

ipcMain.handle('frpc:stop', async () => {
  return frpcManager?.stop()
})

ipcMain.handle('frpc:restart', async () => {
  return frpcManager?.restart()
})

ipcMain.handle('frpc:status', async () => {
  return frpcManager?.getStatus()
})

ipcMain.handle('frpc:testConnection', async (_event, host: string, port: number) => {
  return frpcManager?.testConnection(host, port)
})

// Export/Import config
ipcMain.handle('config:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export Configuration',
    defaultPath: 'frp-gui-config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (!result.canceled && result.filePath) {
    try {
      const exportData = configManager?.exportConfig()
      if (exportData) {
        writeFileSync(result.filePath, exportData)
        return { success: true }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
  return { success: false, error: 'Cancelled' }
})

ipcMain.handle('config:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Import Configuration',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = readFileSync(result.filePaths[0], 'utf-8')
      return configManager?.importConfig(data)
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
  return { success: false, error: 'Cancelled' }
})

// Auto-start on boot
ipcMain.handle('app:setAutoStart', async (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true
  })
  return true
})

ipcMain.handle('app:getAutoStart', async () => {
  const settings = app.getLoginItemSettings()
  return settings.openAtLogin
})

// App lifecycle
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  frpcManager?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  frpcManager?.stop()
  if (tray) {
    tray.destroy()
    tray = null
  }
})
