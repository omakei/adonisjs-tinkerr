// Use require() directly so TypeScript's esModuleInterop wrapping
// doesn't interfere — Electron intercepts require('electron') in the
// main process to return the full API.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, BrowserWindow, ipcMain } = require('electron') as typeof import('electron')
import path from 'path'
import { registerProjectHandlers } from './ipc/project_handler'
import { registerExecutorHandlers } from './ipc/executor_handler'
import { registerTypesHandlers } from './ipc/types_handler'
import { registerNvmHandlers } from './ipc/nvm_handler'
import { killAllWorkers } from './ipc/worker_manager'

function createWindow() {
  // Evaluate isDev here (after app is ready) rather than at module top level
  const isDev = !app.isPackaged

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  registerProjectHandlers(ipcMain)
  registerExecutorHandlers(ipcMain)
  registerTypesHandlers(ipcMain)
  registerNvmHandlers(ipcMain)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  killAllWorkers()
})
