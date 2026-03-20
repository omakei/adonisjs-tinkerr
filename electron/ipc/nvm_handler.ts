import { IpcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

export function registerNvmHandlers(ipcMain: IpcMain) {
  ipcMain.handle('list-nvm-versions', () => listNvmVersions())
}

export function listNvmVersions(): string[] {
  return process.platform === 'win32'
    ? discoverWindowsNvm()
    : discoverUnixNvm()
}

function discoverWindowsNvm(): string[] {
  const nvmHome = process.env.NVM_HOME
  if (!nvmHome || !fs.existsSync(nvmHome)) return []

  try {
    return fs
      .readdirSync(nvmHome)
      .filter((d) => /^v\d+\.\d+\.\d+$/.test(d))
      .filter((d) => fs.existsSync(path.join(nvmHome, d, 'node.exe')))
      .sort(semverDesc)
  } catch {
    return []
  }
}

function discoverUnixNvm(): string[] {
  const nvmDir = process.env.NVM_DIR ?? path.join(os.homedir(), '.nvm')
  const versionsDir = path.join(nvmDir, 'versions', 'node')
  if (!fs.existsSync(versionsDir)) return []

  try {
    return fs
      .readdirSync(versionsDir)
      .filter((d) => /^v\d+\.\d+\.\d+$/.test(d))
      .filter((d) => fs.existsSync(path.join(versionsDir, d, 'bin', 'node')))
      .sort(semverDesc)
  } catch {
    return []
  }
}

/** Resolve the absolute path to the node binary for the given NVM version. */
export function resolveNodeBinary(version: string): string {
  if (process.platform === 'win32') {
    const nvmHome = process.env.NVM_HOME
    if (nvmHome) {
      const bin = path.join(nvmHome, version, 'node.exe')
      if (fs.existsSync(bin)) return bin
    }
  } else {
    const nvmDir = process.env.NVM_DIR ?? path.join(os.homedir(), '.nvm')
    const bin = path.join(nvmDir, 'versions', 'node', version, 'bin', 'node')
    if (fs.existsSync(bin)) return bin
  }
  return 'node'
}

/**
 * Check whether the given NVM node version satisfies the project's engines.node
 * requirement. Returns a human-readable error string if incompatible, or null
 * if compatible (or if no engines.node field is present).
 */
export function checkNodeEnginesCompatibility(
  projectPath: string,
  nodeVersion: string
): string | null {
  const pkgPath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(pkgPath)) return null

  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  } catch {
    return null
  }

  const engines = pkg.engines as Record<string, string> | undefined
  const required = engines?.node
  if (!required) return null

  const version = nodeVersion.replace(/^v/, '')
  if (satisfiesRange(version, required)) return null

  return (
    `Node ${nodeVersion} does not satisfy this project's engine requirement (node ${required}).\n` +
    `Please select a compatible Node version from the picker.`
  )
}

// ── Minimal semver range evaluator ──────────────────────────────────────────
// Handles the subset of range syntax used in engines fields:
//   >=X.Y.Z  >X.Y.Z  <=X.Y.Z  <X.Y.Z  ^X.Y.Z  ~X.Y.Z  X.Y.Z
// Space-separated conditions are treated as AND (e.g. ">=18 <20").

function satisfiesRange(version: string, range: string): boolean {
  return range.split(/\s+/).filter(Boolean).every((cond) => satisfiesCondition(version, cond))
}

function satisfiesCondition(version: string, condition: string): boolean {
  const m = condition.match(/^(>=|<=|>|<|\^|~|=?)v?(.+)$/)
  if (!m) return true
  const [, op, ver] = m
  switch (op) {
    case '>=': return semverGte(version, ver)
    case '>':  return semverGt(version, ver)
    case '<=': return semverGte(ver, version)
    case '<':  return semverGt(ver, version)
    case '^': {
      const [maj] = parseSemver(ver)
      return semverGte(version, ver) && parseSemver(version)[0] === maj
    }
    case '~': {
      const [maj, min] = parseSemver(ver)
      const [vmaj, vmin] = parseSemver(version)
      return semverGte(version, ver) && vmaj === maj && vmin === min
    }
    default: return version === ver
  }
}

function parseSemver(v: string): [number, number, number] {
  const m = v.replace(/^v/, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
  if (!m) return [0, 0, 0]
  return [+m[1], +(m[2] ?? 0), +(m[3] ?? 0)]
}

function semverGte(a: string, b: string): boolean {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true
    if (pa[i] < pb[i]) return false
  }
  return true
}

function semverGt(a: string, b: string): boolean {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true
    if (pa[i] < pb[i]) return false
  }
  return false
}

function semverDesc(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i]
  }
  return 0
}
