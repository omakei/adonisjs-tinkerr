import { IpcMain } from 'electron'
import path from 'path'
import fs from 'fs'

export interface TypeDefinition {
  filePath: string
  content: string
}

const MAX_FILE_SIZE = 512 * 1024 // 512 KB per file
const MAX_FILES = 400

function collectDts(
  dir: string,
  baseVirtualPath: string,
  results: TypeDefinition[],
  limit: { count: number },
  skipDirs: string[] = []
) {
  if (limit.count >= MAX_FILES || !fs.existsSync(dir)) return

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (limit.count >= MAX_FILES) break
    if (skipDirs.includes(entry.name)) continue

    const fullPath = path.join(dir, entry.name)
    const virtualPath = `${baseVirtualPath}/${entry.name}`

    if (entry.isDirectory()) {
      collectDts(fullPath, virtualPath, results, limit, skipDirs)
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      try {
        const stat = fs.statSync(fullPath)
        if (stat.size > MAX_FILE_SIZE) continue
        const content = fs.readFileSync(fullPath, 'utf-8')
        results.push({ filePath: virtualPath, content })
        limit.count++
      } catch {
        // skip unreadable files
      }
    }
  }
}

function collectTs(
  dir: string,
  baseVirtualPath: string,
  results: TypeDefinition[],
  limit: { count: number }
) {
  if (limit.count >= MAX_FILES || !fs.existsSync(dir)) return

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (limit.count >= MAX_FILES) break
    const fullPath = path.join(dir, entry.name)
    const virtualPath = `${baseVirtualPath}/${entry.name}`

    if (entry.isDirectory()) {
      collectTs(fullPath, virtualPath, results, limit)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts'))) {
      try {
        const stat = fs.statSync(fullPath)
        if (stat.size > MAX_FILE_SIZE) continue
        const content = fs.readFileSync(fullPath, 'utf-8')
        results.push({ filePath: virtualPath, content })
        limit.count++
      } catch {
        // skip
      }
    }
  }
}

export function registerTypesHandlers(ipcMain: IpcMain) {
  ipcMain.handle('get-project-types', async (_event, projectPath: string) => {
    const results: TypeDefinition[] = []
    const limit = { count: 0 }
    const nodeModules = path.join(projectPath, 'node_modules')
    const skipDirs = ['node_modules', '__tests__', 'test', 'tests', 'examples', 'example']

    // 1. All @adonisjs/* packages — prefer build/ subdir which has .d.ts files
    const adonisDir = path.join(nodeModules, '@adonisjs')
    if (fs.existsSync(adonisDir)) {
      for (const pkg of fs.readdirSync(adonisDir)) {
        const pkgBase = `file:///node_modules/@adonisjs/${pkg}`
        const buildDir = path.join(adonisDir, pkg, 'build')
        if (fs.existsSync(buildDir)) {
          collectDts(buildDir, `${pkgBase}/build`, results, limit, skipDirs)
        } else {
          collectDts(path.join(adonisDir, pkg), pkgBase, results, limit, skipDirs)
        }
      }
    }

    // 2. Vinejs (validation), if installed
    const vineDir = path.join(nodeModules, '@vinejs')
    if (fs.existsSync(vineDir)) {
      for (const pkg of fs.readdirSync(vineDir)) {
        const buildDir = path.join(vineDir, pkg, 'build')
        const base = `file:///node_modules/@vinejs/${pkg}`
        collectDts(fs.existsSync(buildDir) ? buildDir : path.join(vineDir, pkg), base, results, limit, skipDirs)
      }
    }

    // 3. Lucid ORM (may be outside @adonisjs scope in older versions)
    const lucidDir = path.join(nodeModules, '@adonisjs', 'lucid')
    if (!fs.existsSync(lucidDir)) {
      // try standalone lucid
      const standaloneLucid = path.join(nodeModules, 'lucid')
      collectDts(standaloneLucid, 'file:///node_modules/lucid', results, limit, skipDirs)
    }

    // 4. @types/node — core Node.js types
    const typesNodeDir = path.join(nodeModules, '@types', 'node')
    collectDts(typesNodeDir, 'file:///node_modules/@types/node', results, limit, [])

    // 5. Project source files: app/, contracts/, start/, config/, types/
    for (const srcDir of ['app', 'contracts', 'start', 'config', 'types']) {
      collectTs(
        path.join(projectPath, srcDir),
        `file:///project/${srcDir}`,
        results,
        limit
      )
    }

    return results
  })
}
