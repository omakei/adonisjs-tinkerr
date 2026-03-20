import { IpcMain } from 'electron'
import { executeInWorker, killWorkerForProject } from './worker_manager'
import type { ExecuteCodePayload, ExecutionResult } from '../types/ipc'

export function registerExecutorHandlers(ipcMain: IpcMain) {
  ipcMain.handle('execute-code', async (_event, payload: ExecuteCodePayload) => {
    return executeCode(payload)
  })

  // Allow the renderer to explicitly kill a project's worker (e.g. on project switch)
  ipcMain.handle('kill-worker', (_event, projectPath: string) => {
    killWorkerForProject(projectPath)
  })
}

async function executeCode(payload: ExecuteCodePayload): Promise<ExecutionResult> {
  const { projectPath, code, nodeVersion } = payload
  const startTime = Date.now()

  try {
    return await executeInWorker(projectPath, code, startTime, nodeVersion)
  } catch (err: unknown) {
    const e = err as Error
    return {
      success: false,
      error: { message: e.message, stack: e.stack ?? '' },
      logs: [],
      queries: [],
      duration: Date.now() - startTime,
    }
  }
}
