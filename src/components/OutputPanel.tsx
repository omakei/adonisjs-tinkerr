import { useState } from 'react'
import type { ExecutionResult, SqlQuery, ConsoleLog } from '../types/ipc'

// ── Collapsible JSON Tree ────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | undefined | JsonValue[] | { [k: string]: JsonValue }

interface JsonNodeProps {
  value: JsonValue
  depth?: number
}

function JsonNode({ value, depth = 0 }: JsonNodeProps) {
  const [open, setOpen] = useState(depth < 2)

  if (value === null) return <span style={jsonStyles.null}>null</span>
  if (value === undefined) return <span style={jsonStyles.undef}>undefined</span>
  if (typeof value === 'boolean') return <span style={jsonStyles.bool}>{String(value)}</span>
  if (typeof value === 'number') return <span style={jsonStyles.num}>{value}</span>
  if (typeof value === 'string') return <span style={jsonStyles.str}>"{value}"</span>

  const isArray = Array.isArray(value)
  const entries = isArray
    ? (value as JsonValue[]).map((v, i) => [String(i), v] as [string, JsonValue])
    : Object.entries(value as Record<string, JsonValue>)

  const open_bracket = isArray ? '[' : '{'
  const close_bracket = isArray ? ']' : '}'
  const count = entries.length

  if (count === 0) {
    return <span style={jsonStyles.bracket}>{open_bracket}{close_bracket}</span>
  }

  const indent = '  '.repeat(depth)
  const childIndent = '  '.repeat(depth + 1)

  return (
    <span>
      <button style={jsonStyles.toggle} onClick={() => setOpen((o) => !o)}>
        <span style={jsonStyles.caret}>{open ? '▾' : '▸'}</span>
        <span style={jsonStyles.bracket}>{open_bracket}</span>
        {!open && (
          <>
            <span style={jsonStyles.ellipsis}> {count} {isArray ? 'item' : 'key'}{count !== 1 ? 's' : ''} </span>
            <span style={jsonStyles.bracket}>{close_bracket}</span>
          </>
        )}
      </button>
      {open && (
        <span>
          {'\n'}
          {entries.map(([key, val], i) => (
            <span key={key}>
              {childIndent}
              {!isArray && <span style={jsonStyles.key}>"{key}": </span>}
              <JsonNode value={val} depth={depth + 1} />
              {i < count - 1 && <span style={jsonStyles.comma}>,</span>}
              {'\n'}
            </span>
          ))}
          {indent}
          <span style={jsonStyles.bracket}>{close_bracket}</span>
        </span>
      )}
    </span>
  )
}

function JsonTree({ value }: { value: unknown }) {
  return (
    <pre style={styles.jsonOutput}>
      <JsonNode value={value as JsonValue} />
    </pre>
  )
}

const jsonStyles: Record<string, React.CSSProperties> = {
  str:    { color: 'var(--json-string, #98c379)' },
  num:    { color: 'var(--json-number, #d19a66)' },
  bool:   { color: 'var(--json-bool, #56b6c2)' },
  null:   { color: 'var(--json-null, #abb2bf)' },
  undef:  { color: 'var(--json-null, #abb2bf)' },
  key:    { color: 'var(--json-key, #e06c75)' },
  bracket:{ color: 'var(--text-secondary)' },
  comma:  { color: 'var(--text-secondary)' },
  ellipsis: { color: 'var(--text-muted)', fontStyle: 'italic' },
  caret: {
    display: 'inline-block',
    width: '10px',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  toggle: {
    all: 'unset',
    cursor: 'pointer',
    display: 'inline',
  },
}

// ── Layout icons ─────────────────────────────────────────────────────────────

function PanelRightIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={1} y={1} width={14} height={14} rx={2} />
      <line x1={10} y1={2} x2={10} y2={14} />
    </svg>
  )
}

function PanelBottomIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={1} y={1} width={14} height={14} rx={2} />
      <line x1={2} y1={10} x2={14} y2={10} />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type TabId = 'result' | 'sql' | 'console'

interface OutputPanelProps {
  result: ExecutionResult | null
  isRunning: boolean
  outputPosition: 'right' | 'bottom'
  onTogglePosition: () => void
}

export default function OutputPanel({ result, isRunning, outputPosition, onTogglePosition }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('result')

  const queryCount = result?.queries.length ?? 0
  const logCount = result?.logs.length ?? 0
  const hasError = result != null && !result.success

  const panelSizeStyle: React.CSSProperties =
    outputPosition === 'right'
      ? { width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)' }
      : { height: 260, flexShrink: 0, borderTop: '1px solid var(--border)' }

  return (
    <div style={{ ...styles.panel, ...panelSizeStyle }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Output</span>
        {result && <span style={styles.duration}>{result.duration}ms</span>}
        {isRunning && <span style={styles.runningBadge}>Running...</span>}
        <button
          onClick={onTogglePosition}
          title={outputPosition === 'right' ? 'Move panel to bottom' : 'Move panel to right'}
          style={styles.layoutToggle}
        >
          {outputPosition === 'right' ? <PanelBottomIcon /> : <PanelRightIcon />}
        </button>
      </div>

      {/* Tab bar — always visible */}
      <div style={styles.tabBar}>
        <Tab
          id="result"
          label="Result"
          active={activeTab === 'result'}
          hasError={hasError}
          onClick={() => setActiveTab('result')}
        />
        <Tab
          id="sql"
          label="SQL"
          count={queryCount}
          active={activeTab === 'sql'}
          onClick={() => setActiveTab('sql')}
        />
        <Tab
          id="console"
          label="Console"
          count={logCount}
          active={activeTab === 'console'}
          onClick={() => setActiveTab('console')}
        />
      </div>

      {/* Content */}
      <div style={styles.content}>
        {!result && !isRunning && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Run your code to see output here.</p>
          </div>
        )}

        {isRunning && !result && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Running…</p>
          </div>
        )}

        {result && activeTab === 'result' && (
          <div style={styles.tabContent}>
            {result.success ? (
              typeof result.result === 'object' && result.result !== null
                ? <JsonTree value={result.result} />
                : <pre style={styles.jsonOutput}>{formatValue(result.result)}</pre>
            ) : (
              <div style={styles.errorBlock}>
                <p style={styles.errorMessage}>{result.error?.message}</p>
                {result.error?.stack && (
                  <pre style={styles.errorStack}>{result.error.stack}</pre>
                )}
              </div>
            )}
          </div>
        )}

        {result && activeTab === 'sql' && (
          <div style={styles.tabContent}>
            {queryCount === 0 ? (
              <p style={styles.noItems}>No queries executed.</p>
            ) : (
              <ul style={styles.queryList}>
                {result.queries.map((q, i) => (
                  <QueryRow key={i} query={q} />
                ))}
              </ul>
            )}
          </div>
        )}

        {result && activeTab === 'console' && (
          <div style={styles.tabContent}>
            {logCount === 0 ? (
              <p style={styles.noItems}>No console output.</p>
            ) : (
              <ul style={styles.logList}>
                {result.logs.map((log, i) => (
                  <LogRow key={i} log={log} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab ──────────────────────────────────────────────────────────────────────

function Tab({
  label,
  count,
  active,
  hasError,
  onClick,
}: {
  id: TabId
  label: string
  count?: number
  active: boolean
  hasError?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {}),
      }}
    >
      <span style={active ? styles.tabLabelActive : styles.tabLabel}>{label}</span>
      {hasError && (
        <span style={styles.errorDot} />
      )}
      {count !== undefined && count > 0 && (
        <span style={{ ...styles.tabBadge, ...(active ? styles.tabBadgeActive : {}) }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function QueryRow({ query }: { query: SqlQuery }) {
  const durationColor =
    query.duration === null
      ? 'var(--text-muted)'
      : query.duration < 10
      ? 'var(--sql-fast)'
      : query.duration < 100
      ? 'var(--sql-medium)'
      : 'var(--sql-slow)'

  return (
    <li style={styles.queryItem}>
      <pre style={styles.sqlText}>{formatSql(query.sql)}</pre>
      {query.bindings.length > 0 && (
        <div style={styles.bindings}>Bindings: {JSON.stringify(query.bindings)}</div>
      )}
      <div style={{ ...styles.queryDuration, color: durationColor }}>
        {query.duration !== null ? `${query.duration.toFixed(2)}ms` : '—'}
      </div>
    </li>
  )
}

function LogRow({ log }: { log: ConsoleLog }) {
  const color =
    log.level === 'error' ? 'var(--log-error)'
    : log.level === 'warn' ? 'var(--log-warn)'
    : 'var(--log-log)'

  return (
    <li style={styles.logItem}>
      <span style={{ ...styles.logLevel, color }}>[{log.level}]</span>
      <pre style={{ ...styles.logArgs, color }}>
        {log.args.map((a, i) =>
          typeof a === 'object' && a !== null
            ? <span key={i}>{i > 0 ? ' ' : ''}<JsonNode value={a as JsonValue} /></span>
            : <span key={i}>{i > 0 ? ' ' : ''}{formatValue(a)}</span>
        )}
      </pre>
    </li>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function formatSql(sql: string): string {
  const keywords = ['FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES',
    'SET', 'ON', 'AND', 'OR']
  let formatted = sql
  for (const kw of keywords) {
    formatted = formatted.replace(new RegExp(`\\b${kw}\\b`, 'g'), `\n${kw}`)
  }
  return formatted.trim()
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 10px 0 14px',
    height: 36,
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-secondary)',
  },
  duration: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  runningBadge: {
    fontSize: '11px',
    color: 'var(--accent)',
    animation: 'pulse 1s ease-in-out infinite',
  },
  layoutToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px',
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    borderRadius: 'var(--radius)',
    transition: 'color 0.15s',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'stretch',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 14px',
    height: 32,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    borderRadius: 0,
    transition: 'color 0.12s, border-color 0.12s',
    flexShrink: 0,
  },
  tabActive: {
    borderBottomColor: 'var(--accent)',
  },
  tabLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  tabLabelActive: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  tabBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  tabBadgeActive: {
    color: 'var(--text-secondary)',
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--error)',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  tabContent: {
    padding: '12px 14px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  jsonOutput: {
    color: 'var(--text-primary)',
    fontSize: '12px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  errorBlock: {
    background: 'rgba(244,71,71,0.08)',
    border: '1px solid rgba(244,71,71,0.2)',
    borderRadius: 'var(--radius)',
    padding: '10px',
  },
  errorMessage: {
    color: 'var(--error)',
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: '6px',
  },
  errorStack: {
    color: 'var(--text-secondary)',
    fontSize: '11px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
  noItems: {
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  queryList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  queryItem: {
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius)',
    padding: '8px 10px',
    border: '1px solid var(--border-subtle)',
  },
  sqlText: {
    color: 'var(--text-primary)',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
    marginBottom: '4px',
  },
  bindings: {
    color: 'var(--text-secondary)',
    fontSize: '11px',
    marginBottom: '4px',
    fontFamily: 'var(--font-mono)',
  },
  queryDuration: {
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'right',
  },
  logList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  logItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    fontSize: '12px',
  },
  logLevel: {
    flexShrink: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 600,
    paddingTop: '1px',
  },
  logArgs: {
    flex: 1,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
}
