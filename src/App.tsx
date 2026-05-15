import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { TypingPractice } from './pages/TypingPractice'
import { SpeakingPractice } from './pages/SpeakingPractice'
import { DifficultReview } from './pages/DifficultReview'
import { Settings } from './pages/Settings'
import { useEffect } from 'react'
import { useSettingsStore } from './store/useSettingsStore'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice/:batchId" element={<TypingPractice />} />
        <Route path="/speak/:batchId" element={<SpeakingPractice />} />
        <Route path="/review" element={<DifficultReview />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
