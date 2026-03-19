import { useState, useEffect } from 'react'

export interface AppSettings {
  outputPosition: 'right' | 'bottom'
  editorFontSize: number
  editorFontFamily: string
  editorFontLigatures: boolean
  editorQuickSuggestions: boolean
  editorAcceptOnEnter: boolean
  editorTabCompletion: boolean
  editorParameterHints: boolean
  theme: 'dark' | 'light'
}

const DEFAULTS: AppSettings = {
  outputPosition: 'right',
  editorFontSize: 14,
  editorFontFamily: 'Cascadia Code',
  editorFontLigatures: true,
  editorQuickSuggestions: true,
  editorAcceptOnEnter: true,
  editorTabCompletion: true,
  editorParameterHints: true,
  theme: 'dark',
}

const STORAGE_KEY = 'tinkerr:settings'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {}
    return DEFAULTS
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return { settings, updateSetting }
}
