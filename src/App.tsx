import { AuthProvider, useAuth } from './lib/auth'
import AuthScreen from './lib/auth-screen'
import AppShell from './platform/AppShell'
import './index.css'
import './platform/platform.css'

function AppContent() {
  const { user, workspace, loading, configured } = useAuth()
  if (!configured) return <AuthScreen />
  if (loading) return <div className="platform-loading">正在载入工作空间…</div>
  if (!user || !workspace) return <AuthScreen />
  return <AppShell user={user} workspace={workspace} />
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}
