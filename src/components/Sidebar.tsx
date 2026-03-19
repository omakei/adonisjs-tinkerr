import { useEffect, useState } from 'react'
import type { RecentProject } from '../types/ipc'

interface SidebarProps {
  currentProject: RecentProject | null
  onProjectSelect: (project: RecentProject) => void
}

export default function Sidebar({ currentProject, onProjectSelect }: SidebarProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecents()
  }, [])

  async function loadRecents() {
    try {
      const projects = await window.tinkerr.listRecentProjects()
      setRecentProjects(projects)
    } catch {
      // Ignore — store may be empty
    }
  }

  async function handleOpenProject() {
    setOpening(true)
    setError(null)
    try {
      const project = await window.tinkerr.openProject()
      if (project) {
        onProjectSelect(project)
        await loadRecents()
      } else if (project === null) {
        // User picked a folder but it's not an AdonisJS project
        setError('Not an AdonisJS project. Ensure package.json has @adonisjs/core and adonisrc.ts exists.')
      }
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setOpening(false)
    }
  }

  function versionColor(version: string) {
    if (version.startsWith('6') || version.startsWith('v6')) return 'var(--badge-v6)'
    if (version.startsWith('7') || version.startsWith('v7')) return 'var(--badge-v7)'
    return 'var(--text-muted)'
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.logo}>⚡ Tinkerr</span>
      </div>

      <button
        style={styles.openButton}
        onClick={handleOpenProject}
        disabled={opening}
      >
        {opening ? '...' : '+ Open Project'}
      </button>

      {error && (
        <p style={styles.error}>{error}</p>
      )}

      <div style={styles.projectListLabel}>Recent</div>

      <ul style={styles.projectList}>
        {recentProjects.length === 0 && (
          <li style={styles.emptyHint}>No recent projects</li>
        )}
        {recentProjects.map((project) => {
          const isActive = currentProject?.path === project.path
          return (
            <li
              key={project.path}
              style={{
                ...styles.projectItem,
                ...(isActive ? styles.projectItemActive : {}),
              }}
              onClick={() => onProjectSelect(project)}
              title={project.path}
            >
              <span style={styles.projectName}>{project.name}</span>
              <span
                style={{
                  ...styles.versionBadge,
                  backgroundColor: versionColor(project.version),
                }}
              >
                {project.version}
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 14px 12px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    color: 'var(--text-primary)',
  },
  openButton: {
    margin: '12px 10px 4px',
    padding: '7px 12px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: '12px',
    transition: 'background 0.15s',
  },
  error: {
    margin: '8px 10px',
    padding: '6px 8px',
    background: 'rgba(244,71,71,0.12)',
    border: '1px solid rgba(244,71,71,0.3)',
    borderRadius: 'var(--radius)',
    color: 'var(--error)',
    fontSize: '11px',
    lineHeight: 1.4,
  },
  projectListLabel: {
    padding: '12px 14px 4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
  },
  projectList: {
    listStyle: 'none',
    flex: 1,
    overflowY: 'auto',
  },
  emptyHint: {
    padding: '10px 14px',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    cursor: 'pointer',
    borderRadius: '0',
    transition: 'background 0.1s',
    gap: '8px',
  },
  projectItemActive: {
    background: 'var(--bg-active)',
  },
  projectName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '13px',
  },
  versionBadge: {
    flexShrink: 0,
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#fff',
  },
}
