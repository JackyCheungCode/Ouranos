import { useState } from 'react'
import {
  Activity, Bell, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Command, Grid2X2, Home, LayoutGrid, LogOut, Menu, Search, Settings,
  Sparkles, X
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Workspace } from '../lib/auth'
import { platformApps, type PlatformApp, type PlatformAppId } from './appRegistry'

type Props = { user: User; workspace: Workspace }

function BrandMark() {
  return <span className="odoo-brand-mark" aria-hidden="true"><i/><i/><i/></span>
}

function AppIcon({ app, size = 22 }: { app: PlatformApp; size?: number }) {
  const Icon = app.icon
  return <span className="platform-app-icon" style={{ background: app.color }}><Icon size={size} strokeWidth={1.8}/></span>
}

function AppLauncher({ onOpen }: { onOpen: (id: PlatformAppId) => void }) {
  return <div className="platform-home">
    <div className="platform-home-heading">
      <div>
        <div className="platform-eyebrow">OURANOS WORKSPACE</div>
        <h1>工作空间</h1>
        <p>选择一个应用，开始你的工作。</p>
      </div>
      <div className="platform-home-meta"><span className="platform-live-dot"/> 模块化工作平台</div>
    </div>
    <section className="platform-app-section">
      <div className="platform-section-title"><div><span>应用程序</span><small>APPLICATIONS</small></div><span className="platform-app-count">03 个应用</span></div>
      <div className="platform-app-grid">
        {platformApps.map((app, index) => (
          <button className="platform-app-card" key={app.id} onClick={() => onOpen(app.id)}>
            <div className="platform-card-top"><AppIcon app={app} size={25}/><span className="platform-card-index">0{index + 1}</span></div>
            <div className="platform-card-copy"><h2>{app.name}</h2><span>{app.englishName}</span><p>{app.description}</p></div>
            <div className="platform-card-bottom"><span>{app.category}</span><span className="platform-card-open">打开应用 <ChevronRight size={15}/></span></div>
          </button>
        ))}
      </div>
    </section>
    <div className="platform-home-foot"><span>OURANOS · ENTERPRISE WORKSPACE</span><span>模块化架构 · 持续演进</span></div>
  </div>
}

function ModulePlaceholder({ app, onHome }: { app: PlatformApp; onHome: () => void }) {
  const Icon = app.icon
  return <div className="platform-module">
    <div className="platform-breadcrumb"><button onClick={onHome}><Grid2X2 size={14}/> 应用</button><ChevronRight size={13}/><span>{app.name}</span></div>
    <div className="platform-module-title">
      <AppIcon app={app} size={25}/>
      <div><h1>{app.name}</h1><p>{app.tagline}</p></div>
    </div>
    <div className="platform-placeholder">
      <div className="platform-placeholder-art"><span/><span/><span/><Icon size={32}/></div>
      <div className="platform-eyebrow">MODULE FOUNDATION</div>
      <h2>{app.name}模块已就绪</h2>
      <p>当前阶段仅搭建应用入口与模块化页面框架，业务功能将在后续阶段逐步设计和接入。</p>
      <span className="platform-coming-soon"><Activity size={13}/> 功能规划中</span>
    </div>
  </div>
}

export default function AppShell({ user, workspace }: Props) {
  const [activeApp, setActiveApp] = useState<PlatformAppId | null>(null)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const active = activeApp ? platformApps.find(app => app.id === activeApp) ?? null : null
  const initials = (user.email || 'U').slice(0, 1).toUpperCase()

  const openApp = (id: PlatformAppId) => {
    setActiveApp(id)
    setLauncherOpen(false)
    setMenuOpen(false)
  }
  const goHome = () => { setActiveApp(null); setLauncherOpen(false) }

  return <div className="ouranos-platform">
    <header className="platform-topbar">
      <div className="platform-brand-area">
        <button className="platform-brand" onClick={goHome} aria-label="返回工作空间"><BrandMark/><span>ouranos</span><small>20</small></button>
        <span className="platform-brand-divider"/>
        <button className="platform-launcher-trigger" onClick={() => setLauncherOpen(value => !value)} aria-label="应用菜单"><Grid2X2 size={19}/></button>
        {active && <><ChevronRight className="platform-top-chevron" size={15}/><span className="platform-current-app">{active.name}</span></>}
      </div>
      <div className="platform-top-center">
        {active && <nav className="platform-app-menu"><button className="is-active">工作台</button><button disabled>概览</button></nav>}
      </div>
      <div className="platform-top-actions">
        <button className="platform-top-icon" onClick={() => setSearchOpen(value => !value)} title="搜索"><Search size={18}/></button>
        <button className="platform-top-icon" title="帮助"><CircleHelp size={18}/></button>
        <button className="platform-top-icon platform-notification" title="通知"><Bell size={18}/><i/></button>
        <span className="platform-top-divider"/>
        <button className="platform-user" onClick={() => setMenuOpen(value => !value)}><span>{initials}</span><b>{user.email || '用户'}</b><ChevronDown size={14}/></button>
      </div>
      {searchOpen && <div className="platform-search-pop"><Search size={16}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索应用和功能…" onKeyDown={e => {if(e.key === 'Escape') setSearchOpen(false)}}/><button onClick={() => {setSearch('');setSearchOpen(false)}}><X size={15}/></button></div>}
      {menuOpen && <><button className="platform-dismiss" onClick={() => setMenuOpen(false)}/><div className="platform-user-menu"><div className="platform-user-menu-head"><span>{initials}</span><div><b>{user.email || '用户'}</b><small>{workspace.name}</small></div></div><button onClick={() => window.location.reload()}><Settings size={15}/> 账户与工作空间</button><button className="platform-logout" onClick={async () => { const { supabase } = await import('../lib/supabase'); await supabase?.auth.signOut() }}><LogOut size={15}/> 退出登录</button></div></>}
    </header>

    {launcherOpen && <><button className="platform-launcher-backdrop" onClick={() => setLauncherOpen(false)}/><div className="platform-launcher-menu"><div className="platform-launcher-menu-title"><b>应用程序</b><small>OURANOS</small></div>{platformApps.map(app => <button key={app.id} onClick={() => openApp(app.id)}><AppIcon app={app} size={18}/><span>{app.name}</span><ChevronRight size={14}/></button>)}</div></>}

    <div className="platform-body">
      <aside className={'platform-rail ' + (sidebarCollapsed ? 'is-collapsed' : '')}>
        <button className="platform-rail-toggle" onClick={() => setSidebarCollapsed(value => !value)} title="折叠侧边栏">{sidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}</button>
        <button className={'platform-rail-item ' + (!active ? 'selected' : '')} onClick={goHome} title="工作空间"><Home size={19}/><span>工作空间</span></button>
        <div className="platform-rail-label">{sidebarCollapsed ? '·' : '应用'}</div>
        {platformApps.map(app => { const Icon = app.icon; return <button key={app.id} className={'platform-rail-item ' + (activeApp === app.id ? 'selected' : '')} onClick={() => openApp(app.id)} title={app.name}><Icon size={19}/><span>{app.name}</span></button> })}
        <div className="platform-rail-bottom"><button className="platform-rail-item" title="系统帮助"><CircleHelp size={18}/><span>帮助中心</span></button></div>
      </aside>
      <main className="platform-main">
        {active ? <ModulePlaceholder app={active} onHome={goHome}/> : <AppLauncher onOpen={openApp}/>}
      </main>
    </div>
  </div>
}
