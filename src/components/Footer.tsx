import type { RecentProject, ExecutionResult } from '../types/ipc'

interface FooterProps {
  currentProject: RecentProject | null
  result: ExecutionResult | null
}

export default function Footer({ currentProject, result }: FooterProps) {
  const nodeVersion = window.tinkerr.nodeVersion

  const memoryMB = result?.memoryUsed != null
    ? (result.memoryUsed / 1024 / 1024).toFixed(1)
    : null

  return (
    <div style={styles.footer}>
      <Stat label="AdonisJS" value={currentProject ? currentProject.version : '—'} />
      <Divider />
      <Stat label="Node" value={nodeVersion} />
      {result != null && (
        <>
          <Divider />
          <Stat label="Last run" value={`${result.duration}ms`} />
          {memoryMB != null && (
            <>
              <Divider />
              <Stat label="Heap" value={`${memoryMB} MB`} />
            </>
          )}
        </>
      )}
      {currentProject && (
        <span style={styles.projectName} title={currentProject.path}>
          {currentProject.name}
        </span>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={styles.stat}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </span>
  )
}

function Divider() {
  return <span style={styles.divider}>·</span>
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 14px',
    height: 32,
    background: 'var(--bg-panel)',
    borderTop: '1px solid var(--border)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    flexShrink: 0,
    userSelect: 'none',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  label: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  value: {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  divider: {
    color: 'var(--border)',
  },
  projectName: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 200,
    cursor: 'default',
  },
}
