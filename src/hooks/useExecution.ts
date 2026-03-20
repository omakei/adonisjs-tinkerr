import { useState, useCallback } from 'react'
import type { ExecutionResult } from '../types/ipc'

interface UseExecutionReturn {
  isRunning: boolean
  result: ExecutionResult | null
  run: (projectPath: string, code: string, nodeVersion?: string) => Promise<void>
  clear: () => void
}

export function useExecution(): UseExecutionReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)

  const run = useCallback(async (projectPath: string, code: string, nodeVersion?: string) => {
    if (isRunning) return
    setIsRunning(true)
    setResult(null)

    try {
      const execResult = await window.tinkerr.executeCode({ projectPath, code, nodeVersion })
      setResult(execResult)
    } catch (err: unknown) {
      const e = err as Error
      // IPC-level failure (e.g. main process crashed)
      setResult({
        success: false,
        error: {
          message: e.message ?? 'Unknown IPC error',
          stack: e.stack ?? '',
        },
        logs: [],
        queries: [],
        duration: 0,
      })
    } finally {
      setIsRunning(false)
    }
  }, [isRunning])

  const clear = useCallback(() => {
    setResult(null)
  }, [])

  return { isRunning, result, run, clear }
}
