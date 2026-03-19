import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('tinkerr', {
  openProject: () => ipcRenderer.invoke('open-project'),

  executeCode: (payload: { projectPath: string; code: string }) =>
    ipcRenderer.invoke('execute-code', payload),

  listRecentProjects: () => ipcRenderer.invoke('list-recent-projects'),

  getProjectTypes: (projectPath: string) =>
    ipcRenderer.invoke('get-project-types', projectPath),

  nodeVersion: process.version,
})
