import { useRef, useState, useEffect } from 'react'
import MonacoEditor, { OnMount, useMonaco } from '@monaco-editor/react'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import type { RecentProject } from '../types/ipc'

interface EditorProps {
  isRunning: boolean
  currentProject: RecentProject | null
  onRun: (code: string) => void
  fontSize: number
  fontFamily: string
  fontLigatures: boolean
  quickSuggestions: boolean
  acceptOnEnter: boolean
  tabCompletion: boolean
  parameterHints: boolean
  monacoTheme: string
}

const DEFAULT_CODE = `// Load a model and run a query
// Example (adjust import path to your project structure):
//
// const { default: User } = await import('#models/user')
// const users = await User.query().limit(10)
// return users

`

async function registerProjectTypes(monaco: Monaco, projectPath: string) {
  const js = monaco.languages.typescript.javascriptDefaults

  js.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    strict: false,
  })

  js.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })

  try {
    const types = await window.tinkerr.getProjectTypes(projectPath)
    js.setExtraLibs(
      types.map(({ filePath, content }) => ({ filePath, content }))
    )
  } catch {
    // non-fatal — editor still works without types
  }
}

export default function Editor({ isRunning, currentProject, onRun, fontSize, fontFamily, fontLigatures, quickSuggestions, acceptOnEnter, tabCompletion, parameterHints, monacoTheme }: EditorProps) {
  const [code, setCode] = useState(DEFAULT_CODE)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monaco = useMonaco()

  useEffect(() => {
    if (!monaco || !currentProject) return
    registerProjectTypes(monaco, currentProject.path)
  }, [monaco, currentProject?.path])

  const handleMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance

    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        if (!isRunning && currentProject) {
          onRun(editorInstance.getValue())
        }
      }
    )

    editorInstance.focus()
  }

  function handleRun() {
    const value = editorRef.current?.getValue() ?? code
    onRun(value)
  }

  const canRun = !isRunning && currentProject !== null

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <span style={styles.projectLabel}>
          {currentProject
            ? `${currentProject.name} (${currentProject.version})`
            : 'No project loaded'}
        </span>
        <button
          style={{
            ...styles.runButton,
            ...(canRun ? {} : styles.runButtonDisabled),
          }}
          onClick={handleRun}
          disabled={!canRun}
          title="Run (Ctrl+Enter)"
        >
          {isRunning ? (
            <>
              <span style={styles.spinner} />
              Running...
            </>
          ) : (
            '▶ Run'
          )}
        </button>
      </div>

      <div style={styles.editorContainer}>
        {!currentProject && (
          <div style={styles.overlay}>
            <p style={styles.overlayText}>
              Open an AdonisJS project to start tinkering
            </p>
          </div>
        )}
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
          theme={monacoTheme}
          value={code}
          onChange={(val) => setCode(val ?? '')}
          onMount={handleMount}
          options={{
            fontSize,
            fontFamily: `'${fontFamily}', 'Cascadia Code', 'Fira Code', Consolas, monospace`,
            fontLigatures,
            lineHeight: Math.round(fontSize * 1.6),
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            tabSize: 2,
            quickSuggestions: quickSuggestions ? { other: true, comments: false, strings: true } : false,
            suggestOnTriggerCharacters: quickSuggestions,
            acceptSuggestionOnEnter: acceptOnEnter ? 'on' : 'off',
            tabCompletion: tabCompletion ? 'on' : 'off',
            wordBasedSuggestions: quickSuggestions ? 'currentDocument' : 'off',
            parameterHints: { enabled: parameterHints },
            suggest: {
              insertMode: 'replace',
              filterGraceful: true,
              showKeywords: true,
              showSnippets: true,
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showClasses: true,
              showModules: true,
              showProperties: true,
              showVariables: true,
            },
            formatOnType: true,
            formatOnPaste: true,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            readOnly: !currentProject,
          }}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    borderRight: '1px solid var(--border)',
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    height: 48,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    gap: '8px',
    flexShrink: 0,
  },
  projectLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  runButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '12px',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  runButtonDisabled: {
    background: 'var(--text-muted)',
  },
  spinner: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  editorContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(30,30,30,0.85)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  overlayText: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
}
