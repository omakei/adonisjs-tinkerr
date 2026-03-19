import { useState, useRef, useEffect } from 'react'
import type { RecentProject } from '../types/ipc'
import type { AppSettings } from '../hooks/useSettings'

const FONT_FAMILIES = [
  { label: 'Cascadia Code', value: 'Cascadia Code', liga: true },
  { label: 'Cascadia Mono', value: 'Cascadia Mono', liga: false },
  { label: 'Fira Code', value: 'Fira Code', liga: true },
  { label: 'JetBrains Mono', value: 'JetBrains Mono', liga: true },
  { label: 'Monaspace Neon', value: 'Monaspace Neon', liga: true },
  { label: 'Iosevka', value: 'Iosevka', liga: true },
  { label: 'Consolas', value: 'Consolas', liga: false },
  { label: 'Source Code Pro', value: 'Source Code Pro', liga: false },
  { label: 'Courier New', value: 'Courier New', liga: false },
]

interface SidePanelProps {
  activeView: 'recent' | 'settings'
  recentProjects: RecentProject[]
  currentProject: RecentProject | null
  openError: string | null
  onProjectSelect: (project: RecentProject) => void
  settings: AppSettings
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export default function SidePanel({
  activeView,
  recentProjects,
  currentProject,
  openError,
  onProjectSelect,
  settings,
  onUpdateSetting,
}: SidePanelProps) {
  return (
    <div style={styles.panel}>
      {activeView === 'recent' ? (
        <RecentView
          projects={recentProjects}
          currentProject={currentProject}
          openError={openError}
          onSelect={onProjectSelect}
        />
      ) : (
        <SettingsView settings={settings} onUpdateSetting={onUpdateSetting} />
      )}
    </div>
  )
}

// ── Recent Projects View ──────────────────────────────────────────────────────

function RecentView({
  projects,
  currentProject,
  openError,
  onSelect,
}: {
  projects: RecentProject[]
  currentProject: RecentProject | null
  openError: string | null
  onSelect: (p: RecentProject) => void
}) {
  function versionColor(version: string) {
    if (version.startsWith('6') || version.startsWith('v6')) return 'var(--badge-v6)'
    if (version.startsWith('7') || version.startsWith('v7')) return 'var(--badge-v7)'
    return 'var(--text-muted)'
  }

  return (
    <>
      <div style={styles.panelHeader}>Recent Projects</div>

      {openError && <p style={styles.error}>{openError}</p>}

      <ul style={styles.projectList}>
        {projects.length === 0 && (
          <li style={styles.emptyHint}>No recent projects</li>
        )}
        {projects.map((project) => {
          const isActive = currentProject?.path === project.path
          return (
            <li
              key={project.path}
              className="project-item"
              style={{
                ...styles.projectItem,
                ...(isActive ? styles.projectItemActive : {}),
              }}
              onClick={() => onSelect(project)}
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
    </>
  )
}

// ── Settings View ─────────────────────────────────────────────────────────────

function SettingsView({
  settings,
  onUpdateSetting,
}: {
  settings: AppSettings
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}) {
  return (
    <div style={styles.settingsBody}>
      <div style={styles.panelHeader}>Settings</div>

      <div style={styles.settingsContent}>
        <SettingGroup label="Appearance">
          <SettingRow label="Theme">
            <ToggleGroup
              value={settings.theme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
              onChange={(v) => onUpdateSetting('theme', v as AppSettings['theme'])}
            />
          </SettingRow>
        </SettingGroup>

        <SettingGroup label="Layout">
          <SettingRow label="Output panel">
            <ToggleGroup
              value={settings.outputPosition}
              options={[
                { value: 'right', label: 'Right' },
                { value: 'bottom', label: 'Bottom' },
              ]}
              onChange={(v) => onUpdateSetting('outputPosition', v as AppSettings['outputPosition'])}
            />
          </SettingRow>
        </SettingGroup>

        <SettingGroup label="Editor">
          <SettingRow label="Font family">
            <FontPicker
              value={settings.editorFontFamily}
              onChange={(v) => onUpdateSetting('editorFontFamily', v)}
            />
          </SettingRow>

          <SettingRow label="Font ligatures">
            <ToggleGroup
              value={settings.editorFontLigatures ? 'on' : 'off'}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
              onChange={(v) => onUpdateSetting('editorFontLigatures', v === 'on')}
            />
          </SettingRow>

          <SettingRow label="Font size">
            <div style={styles.fontSizeRow}>
              <input
                type="range"
                min={10}
                max={24}
                step={1}
                value={settings.editorFontSize}
                onChange={(e) => onUpdateSetting('editorFontSize', Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.fontSizeValue}>{settings.editorFontSize}px</span>
            </div>
          </SettingRow>
        </SettingGroup>

        <SettingGroup label="Suggestions">
          <SettingRow label="Quick suggestions">
            <ToggleGroup
              value={settings.editorQuickSuggestions ? 'on' : 'off'}
              options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              onChange={(v) => onUpdateSetting('editorQuickSuggestions', v === 'on')}
            />
          </SettingRow>
          <SettingRow label="Accept on Enter">
            <ToggleGroup
              value={settings.editorAcceptOnEnter ? 'on' : 'off'}
              options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              onChange={(v) => onUpdateSetting('editorAcceptOnEnter', v === 'on')}
            />
          </SettingRow>
          <SettingRow label="Tab completion">
            <ToggleGroup
              value={settings.editorTabCompletion ? 'on' : 'off'}
              options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              onChange={(v) => onUpdateSetting('editorTabCompletion', v === 'on')}
            />
          </SettingRow>
          <SettingRow label="Parameter hints">
            <ToggleGroup
              value={settings.editorParameterHints ? 'on' : 'off'}
              options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
              onChange={(v) => onUpdateSetting('editorParameterHints', v === 'on')}
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  )
}

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
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

  const current = FONT_FAMILIES.find((f) => f.value === value) ?? FONT_FAMILIES[0]

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)} style={styles.fontPickerBtn}>
        <span style={{ fontFamily: `'${current.value}', monospace`, fontSize: 12, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current.label}
        </span>
        {current.liga && <span style={styles.ligaBadge}>liga</span>}
        <span style={styles.chevron}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{ ...styles.fontDropdown, top: dropPos.top, left: dropPos.left, width: dropPos.width }}
        >
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.value}
              onClick={() => { onChange(f.value); setOpen(false) }}
              style={{ ...styles.fontOption, ...(f.value === value ? styles.fontOptionActive : {}) }}
            >
              <span style={{ fontFamily: `'${f.value}', monospace`, flex: 1, textAlign: 'left' }}>
                {f.label}
              </span>
              {f.liga && <span style={styles.ligaBadge}>liga</span>}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.settingGroup}>
      <div style={styles.settingGroupLabel}>{label}</div>
      {children}
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.settingRow}>
      <span style={styles.settingLabel}>{label}</span>
      <div style={styles.settingControl}>{children}</div>
    </div>
  )
}

function ToggleGroup({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div style={styles.toggleGroup}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            ...styles.toggleBtn,
            ...(value === opt.value ? styles.toggleBtnActive : {}),
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 220,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    height: 48,
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
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
    color: 'var(--text-primary)',
  },
  versionBadge: {
    flexShrink: 0,
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#fff',
  },
  settingsBody: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  settingsContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  settingGroup: {
    marginBottom: 4,
  },
  settingGroupLabel: {
    padding: '10px 14px 4px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.9px',
    color: 'var(--text-muted)',
  },
  settingRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '6px 14px',
  },
  settingLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  settingControl: {
    display: 'flex',
    alignItems: 'center',
  },
  toggleGroup: {
    display: 'flex',
    gap: 2,
    background: 'var(--bg-primary)',
    borderRadius: 6,
    padding: 2,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    padding: '4px 0',
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'transparent',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 0.12s, color 0.12s',
    fontWeight: 400,
  },
  toggleBtnActive: {
    background: 'var(--bg-panel)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  fontPickerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    width: '100%',
    padding: '5px 8px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.12s',
  },
  chevron: {
    fontSize: 9,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  fontDropdown: {
    position: 'fixed',
    zIndex: 9999,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    overflow: 'hidden auto',
    maxHeight: 280,
    display: 'flex',
    flexDirection: 'column',
  },
  fontOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '7px 10px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.08s, color 0.08s',
  },
  fontOptionActive: {
    background: 'var(--bg-active)',
    color: 'var(--text-primary)',
  },
  ligaBadge: {
    flexShrink: 0,
    fontSize: 9,
    fontFamily: 'var(--font-ui)',
    letterSpacing: '0.3px',
    padding: '1px 4px',
    borderRadius: 3,
    background: 'rgba(0,120,212,0.18)',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  fontSizeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  slider: {
    flex: 1,
    cursor: 'pointer',
  },
  fontSizeValue: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    minWidth: 28,
    textAlign: 'right',
  },
}
