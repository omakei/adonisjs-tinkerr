interface ActivityBarProps {
  activePanel: 'recent' | 'settings' | null
  onPanelToggle: (panel: 'recent' | 'settings') => void
  onOpenProject: () => void
  opening: boolean
}

function IconBtn({
  onClick,
  tooltip,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  tooltip: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      className="icon-btn"
      data-tooltip={tooltip}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        flexShrink: 0,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        borderRadius: 0,
        transition: 'color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function FolderIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
      <path d="M2 19v-7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function RecentIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function ActivityBar({
  activePanel,
  onPanelToggle,
  onOpenProject,
  opening,
}: ActivityBarProps) {
  return (
    <div style={styles.bar}>
      <div style={styles.logoArea}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </div>

      <div style={styles.topIcons}>
        <IconBtn
          tooltip={opening ? 'Opening…' : 'Open Project'}
          onClick={onOpenProject}
          disabled={opening}
          active={false}
        >
          <FolderIcon />
        </IconBtn>

        <IconBtn
          tooltip="Recent Projects"
          active={activePanel === 'recent'}
          onClick={() => onPanelToggle('recent')}
        >
          <RecentIcon />
        </IconBtn>
      </div>

      <div style={styles.bottomIcons}>
        <IconBtn
          tooltip="Settings"
          active={activePanel === 'settings'}
          onClick={() => onPanelToggle('settings')}
        >
          <SettingsIcon />
        </IconBtn>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    width: 48,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflow: 'visible',
    zIndex: 10,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    flexShrink: 0,
    borderBottom: '1px solid var(--border)',
  },
  topIcons: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    paddingTop: 4,
  },
  bottomIcons: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 8,
  },
}
