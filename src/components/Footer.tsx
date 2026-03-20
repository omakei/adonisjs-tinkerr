import { useEffect, useRef, useState } from 'react'
import type { RecentProject, ExecutionResult } from '../types/ipc'

interface FooterProps {
  currentProject: RecentProject | null
  result: ExecutionResult | null
  nvmVersions: string[]
  onNodeVersionChange: (version: string | null) => void
}

export default function Footer({ currentProject, result, nvmVersions, onNodeVersionChange }: FooterProps) {
  const systemNodeVersion = window.tinkerr.nodeVersion

  const memoryMB = result?.memoryUsed != null
    ? (result.memoryUsed / 1024 / 1024).toFixed(1)
    : null

  // The displayed node version: project-specific if set, otherwise system
  const displayVersion = currentProject?.nodeVersion ?? systemNodeVersion

  return (
    <div style={styles.footer}>
      <Stat label="AdonisJS" value={currentProject ? currentProject.version : '—'} />
      <Divider />
      {currentProject && nvmVersions.length > 0 ? (
        <NodeVersionPicker
          versions={nvmVersions}
          selected={currentProject.nodeVersion ?? null}
          systemVersion={systemNodeVersion}
          onChange={onNodeVersionChange}
        />
      ) : (
        <Stat label="Node" value={displayVersion} />
      )}
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

// ── Node version picker ──────────────────────────────────────────────────────

function NodeVersionPicker({
  versions,
  selected,
  systemVersion,
  onChange,
}: {
  versions: string[]
  selected: string | null
  systemVersion: string
  onChange: (version: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ bottom: 0, left: 0 })

  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setDropPos({ bottom: window.innerHeight - r.top + 4, left: r.left })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const label = selected ?? systemVersion

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} style={styles.nodePickerBtn}>
        <span style={styles.nodeStatLabel}>Node</span>
        <span style={styles.nodeStatValue}>{label}</span>
        <span style={styles.nodeChevron}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{ ...styles.nodeDrop, bottom: dropPos.bottom, left: dropPos.left }}
        >
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            style={{
              ...styles.nodeOption,
              ...(selected === null ? styles.nodeOptionActive : {}),
            }}
          >
            <span style={styles.nodeOptionVersion}>System</span>
            <span style={styles.nodeOptionSub}>{systemVersion}</span>
          </button>
          {versions.map((v) => (
            <button
              key={v}
              onClick={() => { onChange(v); setOpen(false) }}
              style={{
                ...styles.nodeOption,
                ...(selected === v ? styles.nodeOptionActive : {}),
              }}
            >
              <span style={styles.nodeOptionVersion}>{v}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ── Shared primitives ────────────────────────────────────────────────────────

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

// ── Styles ───────────────────────────────────────────────────────────────────

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
  nodePickerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 3,
    transition: 'background 0.1s',
  },
  nodeStatLabel: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  nodeStatValue: {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  nodeChevron: {
    fontSize: 14,
    lineHeight: 1,
    color: 'var(--text-secondary)',
  },
  nodeDrop: {
    position: 'fixed',
    zIndex: 9999,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.4)',
    overflow: 'hidden auto',
    maxHeight: 260,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 140,
  },
  nodeOption: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    padding: '6px 12px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.08s, color 0.08s',
  },
  nodeOptionActive: {
    background: 'var(--bg-active)',
    color: 'var(--text-primary)',
  },
  nodeOptionVersion: {
    fontFamily: 'var(--font-mono)',
    flex: 1,
  },
  nodeOptionSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
  },
}
