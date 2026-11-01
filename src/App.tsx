import { useMemo, useState } from 'react'
import { Activity, ChevronDown, ChevronRight, CircleHelp, Home, Layers3, Menu, Moon, Search, Settings, Sun } from 'lucide-react'
import { apps, groups, initialFavorites, recentIds } from './apps/registry'
import type { AppItem } from './apps/types'
import AppTile from './apps/components/AppTile'
import LeadFinderApp from './apps/lead-finder/LeadFinderApp'
import SystemIntegrationsApp from './apps/system-integrations/SystemIntegrationsApp'
import './index.css'
import { AuthProvider, useAuth } from './lib/auth'
import AuthScreen from './lib/auth-screen'

function AuthenticatedApp() {
  const { user, workspace, signOut } = useAuth()
  const [active, setActive] = useState<AppItem | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [favorites, setFavorites] = useState(initialFavorites)
  const [recent, setRecent] = useState(recentIds)
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() => apps.filter(app => {
    const matchesGroup = filter === 'all' || (filter === 'favorites' ? favorites.includes(app.id) : filter === 'recent' ? recent.includes(app.id) : app.group === filter)
    return matchesGroup && (app.name + ' ' + app.subtitle + ' ' + app.description).toLowerCase().includes(query.toLowerCase())
  }), [filter, favorites, recent, query])
  const groupedApps = groups.map(group => ({ ...group, apps: filtered.filter(app => app.group === group.id) })).filter(group => group.apps.length > 0)
  const toggleFavorite = (id: string) => setFavorites(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id])
  const openApp = (app: AppItem) => { setActive(app); setRecent(value => [app.id, ...value.filter(id => id !== app.id)].slice(0, 8)); setSidebarOpen(false) }
  const selectFilter = (nextFilter: string) => { setActive(null); setFilter(nextFilter); setSidebarOpen(false) }
  const Icon = active?.icon
  const pageTitle = filter === 'all' ? '全部应用' : filter === 'favorites' ? '我的收藏' : filter === 'recent' ? '最近使用' : groups.find(group => group.id === filter)?.title
  return <div className={dark ? 'ouranos dark' : 'ouranos'}>
    <header className="topbar">
      <button className="menu-toggle" title={sidebarOpen ? '隐藏侧边栏' : '展开侧边栏'} aria-label={sidebarOpen ? '隐藏侧边栏' : '展开侧边栏'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(value => !value)}><Menu size={21}/></button>
      <div className="brand"><div className="brand-mark"><span/><span/><span/></div><span>ouranos</span><span className="brand-edition">企业版</span><span className="workspace-label">{workspace.name}</span></div>
      <div className={'top-search ' + (searchOpen ? 'is-open' : '')}>
        {searchOpen && <input autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {if(event.key === 'Escape') setSearchOpen(false)}} placeholder="搜索应用、公司、联系人..."/>}
        <button className="search-toggle" title={searchOpen ? '关闭搜索' : '搜索'} aria-label={searchOpen ? '关闭搜索' : '搜索'} onClick={() => {setSearchOpen(value => !value); if(searchOpen) setQuery('')}}><Search size={19}/></button>
      </div>
      <div className="top-actions"><button className="icon-button" title="帮助"><CircleHelp size={18}/></button><button className="icon-button" title="切换主题" onClick={() => setDark(value => !value)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="profile" title="点击退出登录" onClick={()=>void signOut()}><span>{(user.email||'U').slice(0,1).toUpperCase()}</span><span className="profile-name">{user.email||'账户'}</span><ChevronDown size={14}/></button></div>
    </header>
    <div className={'layout ' + (!sidebarOpen ? 'sidebar-collapsed' : '')}>
      {sidebarOpen && <>
        <button className="sidebar-backdrop" aria-label="关闭侧边栏" onClick={() => setSidebarOpen(false)}/>
        <aside className="sidebar">
          <div className="side-label">工作空间</div>
          <button className={'side-link ' + (!active && filter === 'all' ? 'selected' : '')} onClick={() => selectFilter('all')}><Home size={17}/><span>全部应用</span><span className="side-count">{apps.length}</span></button>
          <button className={'side-link ' + (filter === 'favorites' ? 'selected' : '')} onClick={() => selectFilter('favorites')}><Layers3 size={17}/><span>我的收藏</span></button>
          <button className={'side-link ' + (filter === 'recent' ? 'selected' : '')} onClick={() => selectFilter('recent')}><Activity size={17}/><span>最近使用</span></button>
          <div className="side-label side-label-spaced">应用分类</div>
          {groups.map(group => <button key={group.id} className={'side-link ' + (filter === group.id ? 'selected' : '')} onClick={() => selectFilter(group.id)}><span className="category-dot"/><span>{group.title}</span></button>)}
          <div className="sidebar-bottom"><button className="side-link" onClick={() => {setActive(apps.find(app => app.id === 'settings') ?? null);setSidebarOpen(false)}}><Settings size={17}/><span>设置</span></button></div>
        </aside>
      </>}
      <main className="main">
        {active?.id === 'lead-finder' ? <div className="module-page"><div className="breadcrumbs"><button onClick={() => setActive(null)}><Layers3 size={15}/> 全部应用</button><ChevronRight size={14}/><span>{active.name}</span></div><LeadFinderApp /></div> : active?.id === 'integrations' ? <div className="module-page"><div className="breadcrumbs"><button onClick={() => setActive(null)}><Layers3 size={15}/> 全部应用</button><ChevronRight size={14}/><span>{active.name}</span></div><SystemIntegrationsApp /></div> : active ? <div className="module-page">
          <div className="breadcrumbs"><button onClick={() => setActive(null)}><Layers3 size={15}/> 全部应用</button><ChevronRight size={14}/><span>{active.name}</span></div>
          <div className="module-heading"><div className="module-heading-left"><span className="app-icon large" style={{background:active.color}}>{Icon && <Icon size={27}/>}</span><div><div className="eyebrow">{groups.find(group => group.id === active.group)?.title}</div><h1>{active.name}</h1><p>{active.description}</p></div></div></div>
          <div className="module-tabs"><button className="active">概览</button><button>数据记录</button><button>活动</button><button>配置</button></div>
          <div className="module-welcome"><div><span className="eyebrow">应用工作区</span><h2>欢迎使用{active.name}</h2><p>{active.description} 这里是该应用的专属工作区。</p></div><div className="module-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core">{Icon && <Icon size={36}/>}</div></div></div>
          <div className="section-heading"><div><h3>数据概览</h3><p>工作区示例指标</p></div></div>
          <div className="metric-grid">{['记录总数','本月新增','待处理事项','完成率'].map(label => <div className="metric-card" key={label}><span>{label}</span><b>—</b><small>等待接入实时数据</small></div>)}</div>
          <div className="empty-panel"><h3>{active.name}工作区已就绪</h3><p>在这里管理数据记录、工作流程和团队活动。目前为演示界面，尚未连接实时数据。</p><button className="text-button" onClick={() => setActive(null)}>返回全部应用</button></div>
        </div> : <div className="launcher">
          <div className="welcome-row"><div><div className="eyebrow">OURANOS 工作空间</div><h1>早上好，欢迎回来 <span>✦</span></h1><p>发现客户、洞察市场、拓展业务所需的一切，尽在一个工作空间。</p></div></div>
          <div className="app-section"><div className="section-heading"><div><h2>{pageTitle}</h2><p>共找到 {filtered.length} 个应用</p></div></div>
            {groupedApps.length ? groupedApps.map(group => <section className="category-section" key={group.id}><div className="category-heading"><div><h3>{group.title}</h3><p>{group.subtitle}</p></div><span>{group.apps.length} 个应用</span></div><div className="app-grid">{group.apps.map(app => <AppTile key={app.id} app={app} onOpen={openApp} favorite={favorites.includes(app.id)} onFavorite={toggleFavorite}/>)}</div></section>) : <div className="empty-search"><h3>没有找到匹配的应用</h3><p>请尝试其他关键词。</p></div>}
          </div>
          <div className="launcher-footer"><span>OURANOS 企业版</span><span>一个工作空间，连接每一次商机。</span><span>v0.1.0 · 预览版</span></div>
        </div>}
      </main>
    </div>
  </div>
}

function AppContent() {
  const { user, workspace, loading, configured } = useAuth()
  if (!configured) return <AuthScreen />
  if (loading) return <div className="auth-loading">正在载入工作空间…</div>
  if (!user || !workspace) return <AuthScreen />
  return <AuthenticatedApp />
}

export default function App() { return <AuthProvider><AppContent /></AuthProvider> }
