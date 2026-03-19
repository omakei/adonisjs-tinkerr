import { useEffect, useState } from 'react'
import ActivityBar from './components/ActivityBar'
import SidePanel from './components/SidePanel'
import Editor from './components/Editor'
import OutputPanel from './components/OutputPanel'
import Footer from './components/Footer'
import { useExecution } from './hooks/useExecution'
import { useSettings } from './hooks/useSettings'
import type { RecentProject } from './types/ipc'
import './types/ipc'

export default function App() {
  const [currentProject, setCurrentProject] = useState<RecentProject | null>(null)
  const [activePanel, setActivePanel] = useState<'recent' | 'settings' | null>(null)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const { isRunning, result, run } = useExecution()
  const { settings, updateSetting } = useSettings()

  useEffect(() => {
    loadRecents()
  }, [])

  async function loadRecents() {
    try {
      const projects = await window.tinkerr.listRecentProjects()
      setRecentProjects(projects)
    } catch {}
  }

  async function handleOpenProject() {
    setOpening(true)
    setOpenError(null)
    try {
      const project = await window.tinkerr.openProject()
      if (project) {
        setCurrentProject(project)
        await loadRecents()
      } else if (project === null) {
        setOpenError('Not an AdonisJS project. Ensure package.json has @adonisjs/core and adonisrc.ts exists.')
        setActivePanel('recent')
        setTimeout(() => setOpenError(null), 10_000)
      }
    } catch (err: unknown) {
      setOpenError((err as Error).message)
      setActivePanel('recent')
      setTimeout(() => setOpenError(null), 10_000)
    } finally {
      setOpening(false)
    }
  }

  function handlePanelToggle(panel: 'recent' | 'settings') {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  function handleProjectSelect(project: RecentProject) {
    setCurrentProject(project)
  }

  function handleRun(code: string) {
    if (!currentProject) return
    run(currentProject.path, code)
  }

  const isRight = settings.outputPosition === 'right'

  return (
    <div style={styles.root}>
      <div style={styles.body}>
        <ActivityBar
          activePanel={activePanel}
          onPanelToggle={handlePanelToggle}
          onOpenProject={handleOpenProject}
          opening={opening}
        />

        {activePanel && (
          <SidePanel
            activeView={activePanel}
            recentProjects={recentProjects}
            currentProject={currentProject}
            openError={openError}
            onProjectSelect={handleProjectSelect}
            settings={settings}
            onUpdateSetting={updateSetting}
          />
        )}

        <div
          style={{
            ...styles.content,
            flexDirection: isRight ? 'row' : 'column',
          }}
        >
          <Editor
            isRunning={isRunning}
            currentProject={currentProject}
            onRun={handleRun}
            fontSize={settings.editorFontSize}
            fontFamily={settings.editorFontFamily}
            fontLigatures={settings.editorFontLigatures}
            quickSuggestions={settings.editorQuickSuggestions}
            acceptOnEnter={settings.editorAcceptOnEnter}
            tabCompletion={settings.editorTabCompletion}
            parameterHints={settings.editorParameterHints}
            monacoTheme={settings.theme === 'dark' ? 'vs-dark' : 'vs'}
          />
          <OutputPanel
            result={result}
            isRunning={isRunning}
            outputPosition={settings.outputPosition}
            onTogglePosition={() =>
              updateSetting('outputPosition', isRight ? 'bottom' : 'right')
            }
          />
        </div>
      </div>

      <Footer currentProject={currentProject} result={result} />

      <style>{globalAnimations}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg-primary)',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
}

const globalAnimations = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .project-item:hover {
    background: var(--bg-hover) !important;
  }
`
