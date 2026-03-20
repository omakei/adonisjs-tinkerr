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

export interface TypeDefinition {
  filePath: string
  content: string
}

// Teach TypeScript about the window.tinkerr API exposed by the preload script
declare global {
  interface Window {
    tinkerr: {
      openProject: () => Promise<RecentProject | null>
      executeCode: (payload: ExecuteCodePayload) => Promise<ExecutionResult>
      listRecentProjects: () => Promise<RecentProject[]>
      getProjectTypes: (projectPath: string) => Promise<TypeDefinition[]>
      listNvmVersions: () => Promise<string[]>
      setProjectNodeVersion: (projectPath: string, version: string | null) => Promise<RecentProject>
      nodeVersion: string
    }
  }
}
