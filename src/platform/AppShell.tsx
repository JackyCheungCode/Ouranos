import { useState } from 'react'
import { Bell, ChevronDown, ChevronRight, CircleHelp, Grid2X2, Home, LogOut, Menu, Search, Settings, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Workspace } from '../lib/auth'
import { platformApps, type PlatformApp, type PlatformAppId } from './appRegistry'
import { usePlatformRouter } from './router'
import ModulePlaceholder from './ModulePlaceholder'
import LeadFinderApp from '../apps/lead-finder/LeadFinderApp'
import SystemSettingsModule from './SystemSettingsModule'

type Props = { user: User; workspace: Workspace }

function BrandMark() {
  return <span className="odoo-brand-mark" aria-hidden="true"><i/><i/><i/></span>
}
function AppIcon({ app, size = 22 }: { app: PlatformApp; size?: number }) {
  return <span className="platform-app-icon" style={{ background: app.color }}><i className={app.icon} style={{ fontSize: size }} aria-hidden="true"/></span>
}
function AppLauncher({ onOpen }: { onOpen: (id: PlatformAppId) => void }) {
  return <div className="platform-home">
    <div className="platform-home-heading"><div><h1>工作空间</h1></div></div>
    <section className="platform-app-section">
      <div className="platform-section-title"><div><span>应用</span></div><span className="platform-app-count">{platformApps.length} 个</span></div>
      <div className="platform-app-grid">{platformApps.map(app =>
        <button className="platform-app-card" key={app.id} onClick={() => onOpen(app.id)}>
          <div className="platform-card-top"><AppIcon app={app} size={24}/></div>
          <div className="platform-card-copy"><h2>{app.name}</h2></div>
          <div className="platform-card-bottom"><span>{app.category}</span><span className="platform-card-open">打开 <ChevronRight size={14}/></span></div>
        </button>
      )}</div>
    </section>
  </div>
}

export default function AppShell({ user, workspace }: Props) {
  const { route, navigate } = usePlatformRouter()
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const active = route.appId ? platformApps.find(app => app.id === route.appId) ?? null : null
  const initials = (user.email || 'U').slice(0, 1).toUpperCase()
  const openApp = (id: PlatformAppId) => {
    navigate({ appId: id, section: 'home', providerKey: 'apify' })
    setLauncherOpen(false); setSidebarOpen(false); setMenuOpen(false)
  }
  const goHome = () => {
    navigate({ appId: null, section: 'home', providerKey: 'apify' })
    setSidebarOpen(false)
  }
  return <div className="ouranos-platform">
    <header className="platform-topbar">
      <div className="platform-brand-area">
        <button className="platform-sidebar-trigger" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? '隐藏侧边栏' : '打开侧边栏'} title={sidebarOpen ? '隐藏侧边栏' : '打开侧边栏'}><Menu size={20}/></button>
        <button className="platform-brand" onClick={goHome} aria-label="返回工作空间"><BrandMark/><span>ouranos</span><small>20</small></button>
        <span className="platform-brand-divider"/>
        <button className="platform-launcher-trigger" onClick={() => setLauncherOpen(v => !v)} aria-label="应用菜单"><Grid2X2 size={19}/></button>
        {active && <><ChevronRight className="platform-top-chevron" size={15}/><span className="platform-current-app">{active.name}</span></>}
      </div>
      <div className="platform-top-center"/>
      <div className="platform-top-actions">
        <button className="platform-top-icon" onClick={() => setSearchOpen(v => !v)} title="搜索"><Search size={18}/></button>
        <button className="platform-top-icon" title="帮助"><CircleHelp size={18}/></button>
        <button className="platform-top-icon platform-notification" title="通知"><Bell size={18}/><i/></button>
        <span className="platform-top-divider"/>
        <button className="platform-user" onClick={() => setMenuOpen(v => !v)}><span>{initials}</span><b>{user.email || '用户'}</b><ChevronDown size={14}/></button>
      </div>
      {searchOpen && <div className="platform-search-pop"><Search size={16}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索…" onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }}/><button onClick={() => { setSearch(''); setSearchOpen(false) }}><X size={15}/></button></div>}
      {menuOpen && <><button className="platform-dismiss" onClick={() => setMenuOpen(false)}/><div className="platform-user-menu">
        <div className="platform-user-menu-head"><span>{initials}</span><div><b>{user.email || '用户'}</b><small>{workspace.name}</small></div></div>
        <button onClick={() => openApp('settings')}><Settings size={15}/> 工作空间设置</button>
        <button className="platform-logout" onClick={async () => { const { supabase } = await import('../lib/supabase'); await supabase?.auth.signOut() }}><LogOut size={15}/> 退出登录</button>
      </div></>}
    </header>
    {sidebarOpen && <><button className="platform-sidebar-backdrop" aria-label="关闭侧边栏" onClick={() => setSidebarOpen(false)}/><aside className="platform-sidebar-drawer">
      <div className="platform-sidebar-drawer-head"><span>工作空间</span><button onClick={() => setSidebarOpen(false)} aria-label="关闭菜单"><X size={16}/></button></div>
      <button className={!active ? 'selected' : ''} onClick={goHome}><Home size={18}/> 工作空间</button>
      <div className="platform-sidebar-drawer-label">应用</div>
      {platformApps.map(app => <button key={app.id} className={active?.id === app.id ? 'selected' : ''} onClick={() => openApp(app.id)}><i className={app.icon} aria-hidden="true"/><span>{app.name}</span><ChevronRight size={14}/></button>)}
    </aside></>}
    {launcherOpen && <><button className="platform-launcher-backdrop" onClick={() => setLauncherOpen(false)}/><div className="platform-launcher-menu">
      <div className="platform-launcher-menu-title"><b>应用</b><small>OURANOS</small></div>
      {platformApps.map(app => <button key={app.id} onClick={() => openApp(app.id)}><AppIcon app={app} size={18}/><span>{app.name}</span><ChevronRight size={14}/></button>)}
    </div></>}
    <div className="platform-body"><main className="platform-main">
      {active ? (active.id === 'settings'
        ? <SystemSettingsModule route={route} navigate={navigate} onHome={goHome}/>
        : active.id === 'lead-development' ? <LeadFinderApp/>
        : <ModulePlaceholder app={active} onHome={goHome}/>)
        : <AppLauncher onOpen={openApp}/>}
    </main></div>
  </div>
}
