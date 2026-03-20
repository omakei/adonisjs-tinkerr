import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('tinkerr', {
  openProject: () => ipcRenderer.invoke('open-project'),

  executeCode: (payload: { projectPath: string; code: string; nodeVersion?: string }) =>
    ipcRenderer.invoke('execute-code', payload),

  listRecentProjects: () => ipcRenderer.invoke('list-recent-projects'),

  getProjectTypes: (projectPath: string) =>
    ipcRenderer.invoke('get-project-types', projectPath),

  listNvmVersions: () => ipcRenderer.invoke('list-nvm-versions'),

  setProjectNodeVersion: (projectPath: string, version: string | null) =>
    ipcRenderer.invoke('set-project-node-version', projectPath, version),

  nodeVersion: process.version,
})
