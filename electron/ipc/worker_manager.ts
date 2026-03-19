/**
 * Manages persistent AdonisJS worker processes — one per project path.
 *
 * Instead of spawning a fresh Node process on every execution (which pays
 * the full AdonisJS boot cost each time), the worker boots the app once and
 * stays alive, accepting code execution requests via stdin and returning
 * results via stdout as newline-delimited JSON.
 *
 * Workers are automatically killed after IDLE_TIMEOUT_MS of inactivity.
 */
import { spawn, ChildProcess } from 'child_process'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import path from 'path'
import fs from 'fs'
import { parse as parseDotenv } from 'dotenv'
import { buildWorkerContent } from './worker_template'
import type { ExecutionResult } from '../types/ipc'

const IDLE_TIMEOUT_MS     = 5 * 60 * 1000 // 5 minutes
const BOOT_TIMEOUT_MS     = 60_000         // 60s — app boot can be slow on first run
const EXECUTION_TIMEOUT_MS = 30_000

// ── Internal types ──────────────────────────────────────────────────────────

interface PendingExecution {
  resolve: (result: ExecutionResult) => void
  startTime: number
  timeoutHandle: ReturnType<typeof setTimeout>
}

interface WorkerState {
  process: ChildProcess
  pending: Map<string, PendingExecution>
  idleTimer: ReturnType<typeof setTimeout> | null
  // Resolves when the worker sends { type: 'ready' }
  readyPromise: Promise<void>
  // Internal — used to resolve/reject readyPromise
  _readyResolve: () => void
  _readyReject: (err: Error) => void
  _bootTimeout: ReturnType<typeof setTimeout>
  // Partial stdout line buffer
  buffer: string
}

const workers = new Map<string, WorkerState>()

// ── Public API ──────────────────────────────────────────────────────────────

export async function executeInWorker(
  projectPath: string,
  code: string,
  startTime: number
): Promise<ExecutionResult> {
  let state = workers.get(projectPath)

  if (!state) {
    try {
      state = spawnWorker(projectPath)
      workers.set(projectPath, state)
    } catch (err: unknown) {
      const e = err as Error
      return {
        success: false,
        error: { message: `Failed to start worker: ${e.message}`, stack: e.stack ?? '' },
        logs: [],
        queries: [],
        duration: Date.now() - startTime,
      }
    }
  }

  // Wait for the app to finish booting
  try {
    await state.readyPromise
  } catch (err: unknown) {
    const e = err as Error
    workers.delete(projectPath)
    return {
      success: false,
      error: { message: `Worker failed to boot: ${e.message}`, stack: e.stack ?? '' },
      logs: [],
      queries: [],
      duration: Date.now() - startTime,
    }
  }

  // Pause idle timer while executing
  if (state.idleTimer) clearTimeout(state.idleTimer)

  const id = Math.random().toString(36).slice(2, 10)

  return new Promise<ExecutionResult>((resolve) => {
    const timeoutHandle = setTimeout(() => {
      state!.pending.delete(id)
      if (state!.pending.size === 0) resetIdleTimer(projectPath, state!)
      resolve({
        success: false,
        error: { message: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s`, stack: '' },
        logs: [],
        queries: [],
        duration: Date.now() - startTime,
      })
    }, EXECUTION_TIMEOUT_MS)

    state!.pending.set(id, {
      resolve: (result) => {
        clearTimeout(timeoutHandle)
        if (state!.pending.size === 0) resetIdleTimer(projectPath, state!)
        resolve(result)
      },
      startTime,
      timeoutHandle,
    })

    // Send code directly — the worker executes it via AsyncFunction
    state!.process.stdin!.write(JSON.stringify({ id, code }) + '\n')
  })
}

/** Kill the worker for a specific project (e.g. when project is changed). */
export function killWorkerForProject(projectPath: string): void {
  killWorker(projectPath)
}

/** Kill all workers — call on app quit. */
export function killAllWorkers(): void {
  for (const projectPath of [...workers.keys()]) {
    killWorker(projectPath)
  }
}

// ── Worker lifecycle ────────────────────────────────────────────────────────

function spawnWorker(projectPath: string): WorkerState {
  const tinkerrDir = path.join(projectPath, '.tinkerr')
  fs.mkdirSync(tinkerrDir, { recursive: true })

  // Write the static worker script (same content every time — no user code)
  const workerPath = path.join(tinkerrDir, 'worker.mjs')
  fs.writeFileSync(workerPath, buildWorkerContent(), 'utf-8')

  const tsLoaderArgs = findTypeScriptLoaderArgs(projectPath)
  const projectEnv  = loadProjectEnv(projectPath)

  const child = spawn(
    'node',
    [...tsLoaderArgs, '--experimental-vm-modules', workerPath],
    {
      cwd: projectPath,
      env: { ...process.env, ...projectEnv, NODE_NO_WARNINGS: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  )

  let _readyResolve!: () => void
  let _readyReject!: (err: Error) => void

  const readyPromise = new Promise<void>((res, rej) => {
    _readyResolve = res
    _readyReject  = rej
  })

  const _bootTimeout = setTimeout(() => {
    _readyReject(new Error('Worker boot timed out'))
    killWorker(projectPath)
  }, BOOT_TIMEOUT_MS)

  const state: WorkerState = {
    process: child,
    pending: new Map(),
    idleTimer: null,
    readyPromise,
    _readyResolve,
    _readyReject,
    _bootTimeout,
    buffer: '',
  }

  child.stdout.on('data', (chunk: Buffer) => {
    state.buffer += chunk.toString()
    const lines = state.buffer.split('\n')
    state.buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try { handleWorkerMessage(projectPath, state, JSON.parse(trimmed)) } catch {}
    }
  })

  child.on('exit', () => {
    clearTimeout(state._bootTimeout)
    if (state.idleTimer) clearTimeout(state.idleTimer)
    workers.delete(projectPath)

    // Reject all in-flight executions
    for (const [, pending] of state.pending) {
      clearTimeout(pending.timeoutHandle)
      pending.resolve({
        success: false,
        error: { message: 'Worker process exited unexpectedly', stack: '' },
        logs: [],
        queries: [],
        duration: Date.now() - pending.startTime,
      })
    }
    state.pending.clear()
  })

  resetIdleTimer(projectPath, state)
  return state
}

function handleWorkerMessage(projectPath: string, state: WorkerState, msg: Record<string, unknown>) {
  if (msg.type === 'ready') {
    clearTimeout(state._bootTimeout)
    state._readyResolve()
    return
  }

  if (msg.type === 'boot-error') {
    clearTimeout(state._bootTimeout)
    const err = msg.error as { message?: string } | undefined
    state._readyReject(new Error(err?.message ?? 'Worker boot failed'))
    return
  }

  if (msg.type === 'result') {
    const id = msg.id as string
    const pending = state.pending.get(id)
    if (!pending) return
    state.pending.delete(id)

    const { type: _t, id: _id, ...result } = msg
    pending.resolve(result as unknown as ExecutionResult)
  }
}

function resetIdleTimer(projectPath: string, state: WorkerState) {
  if (state.idleTimer) clearTimeout(state.idleTimer)
  state.idleTimer = setTimeout(() => killWorker(projectPath), IDLE_TIMEOUT_MS)
}

function killWorker(projectPath: string) {
  const state = workers.get(projectPath)
  if (!state) return
  workers.delete(projectPath)
  if (state.idleTimer) clearTimeout(state.idleTimer)
  state.process.kill('SIGTERM')
  setTimeout(() => {
    if (!state.process.killed) state.process.kill('SIGKILL')
  }, 3000)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function findTypeScriptLoaderArgs(projectPath: string): string[] {
  const require = createRequire(path.join(projectPath, 'package.json'))

  try {
    const tsxCjs = require.resolve('tsx/esm')
    const tsxMjs = tsxCjs.replace(/\.cjs$/, '.mjs')
    const loaderPath = fs.existsSync(tsxMjs) ? tsxMjs : tsxCjs
    return ['--import', pathToFileURL(loaderPath).href]
  } catch { /* tsx not installed */ }

  try {
    const tsNodeEsm = require.resolve('ts-node/esm.mjs')
    return ['--loader', pathToFileURL(tsNodeEsm).href]
  } catch { /* ts-node not installed */ }

  return []
}

function loadProjectEnv(projectPath: string): Record<string, string> {
  const envPath = path.join(projectPath, '.env')
  if (!fs.existsSync(envPath)) return {}
  try {
    return parseDotenv(fs.readFileSync(envPath, 'utf-8'))
  } catch {
    return {}
  }
}
