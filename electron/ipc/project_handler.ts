import { dialog, IpcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import Store from 'electron-store'
import type { RecentProject } from '../types/ipc'

interface StoreSchema {
  recentProjects: RecentProject[]
}

const store = new Store<StoreSchema>({
  defaults: { recentProjects: [] },
})

export function registerProjectHandlers(ipcMain: IpcMain) {
  ipcMain.handle('open-project', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open AdonisJS Project',
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const projectPath = result.filePaths[0]
    const detected = detectAdonisProject(projectPath)

    if (!detected) {
      return null
    }

    saveRecentProject(detected)
    return detected
  })

  ipcMain.handle('list-recent-projects', () => {
    const projects = store.get('recentProjects')
    // Refresh versions in case the format changed or packages were updated
    const refreshed = projects.map((p) => {
      const detected = detectAdonisProject(p.path)
      return detected ? { ...p, version: detected.version } : p
    })
    store.set('recentProjects', refreshed)
    return refreshed
  })
}

function detectAdonisProject(projectPath: string): RecentProject | null {
  // Check for package.json with @adonisjs/core dependency
  const pkgPath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(pkgPath)) return null

  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  } catch {
    return null
  }

  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined ?? {}),
    ...(pkg.devDependencies as Record<string, string> | undefined ?? {}),
  }

  const coreVersion = deps['@adonisjs/core']
  if (!coreVersion) return null

  // Check for adonisrc file (confirms it's a proper AdonisJS project)
  const hasRc =
    fs.existsSync(path.join(projectPath, 'adonisrc.ts')) ||
    fs.existsSync(path.join(projectPath, 'adonisrc.json')) ||
    fs.existsSync(path.join(projectPath, '.adonisrc.json'))

  if (!hasRc) return null

  const version = extractFullVersion(projectPath, coreVersion)
  const name = (pkg.name as string | undefined) ?? path.basename(projectPath)

  return {
    path: projectPath,
    name,
    version,
    lastOpened: new Date().toISOString(),
  }
}

function extractFullVersion(projectPath: string, rangeString: string): string {
  // Prefer the actual installed version from node_modules
  const installedPkgPath = path.join(projectPath, 'node_modules', '@adonisjs', 'core', 'package.json')
  if (fs.existsSync(installedPkgPath)) {
    try {
      const installed = JSON.parse(fs.readFileSync(installedPkgPath, 'utf-8'))
      if (typeof installed.version === 'string') return installed.version
    } catch { /* fall through */ }
  }

  // Fall back to parsing the semver range for a full X.Y.Z version
  const match = rangeString.match(/(\d+\.\d+\.\d+)/)
  if (match) return match[1]

  // Last resort: just the major version number
  const majorMatch = rangeString.match(/(\d+)/)
  return majorMatch ? majorMatch[1] : '?'
}

function saveRecentProject(project: RecentProject) {
  const existing = store.get('recentProjects')

  // Remove duplicate (same path), add new entry at the front, cap at 10
  const updated = [
    project,
    ...existing.filter((p) => p.path !== project.path),
  ].slice(0, 10)

  store.set('recentProjects', updated)
}
