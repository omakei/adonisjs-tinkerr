// Shared IPC types used by the Electron main process.
// The renderer uses src/types/ipc.ts which additionally declares window.tinkerr.

export interface RecentProject {
  path: string
  name: string
  version: string
  lastOpened: string
  nodeVersion?: string
}

export interface SqlQuery {
  sql: string
  bindings: unknown[]
  duration: number | null
}

export interface ConsoleLog {
  level: 'log' | 'error' | 'warn'
  args: unknown[]
}

export interface ExecutionResult {
  success: boolean
  result?: unknown
  error?: {
    message: string
    stack: string
  }
  logs: ConsoleLog[]
  queries: SqlQuery[]
  duration: number
  memoryUsed?: number
}

export interface ExecuteCodePayload {
  projectPath: string
  code: string
  nodeVersion?: string
}
