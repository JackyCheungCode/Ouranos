import { useMemo, useState } from 'react'
import { Activity, ChevronDown, ChevronRight, CircleHelp, Home, Layers3, Moon, Search, Settings, Sun } from 'lucide-react'
import { apps, groups, initialFavorites, recentIds } from './apps/registry'
import type { AppItem } from './apps/types'
import AppTile from './apps/components/AppTile'
import './index.css'

export default function App() {
  const [active, setActive] = useState<AppItem | null>(null)
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const [favorites, setFavorites] = useState(initialFavorites)
  const [recent, setRecent] = useState(recentIds)
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() => apps.filter(app => {
    const matchesGroup = filter === 'all' || (filter === 'favorites' ? favorites.includes(app.id) : filter === 'recent' ? recent.includes(app.id) : app.group === filter)
    return matchesGroup && (app.name + ' ' + app.subtitle + ' ' + app.description).toLowerCase().includes(query.toLowerCase())
  }), [filter, favorites, recent, query])
  const toggleFavorite = (id: string) => setFavorites(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id])
  const openApp = (app: AppItem) => { setActive(app); setRecent(value => [app.id, ...value.filter(id => id !== app.id)].slice(0, 8)) }
  const Icon = active?.icon
  return <div className={dark ? 'ouranos dark' : 'ouranos'}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><span/><span/><span/></div><span>ouranos</span><span className="brand-edition">ENTERPRISE</span></div>
      <div className="top-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search apps, companies, contacts..."/></div>
      <div className="top-actions"><button className="icon-button" title="Help"><CircleHelp size={18}/></button><button className="icon-button" title="Toggle theme" onClick={() => setDark(value => !value)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="profile"><span>J</span><span className="profile-name">Justin</span><ChevronDown size={14}/></button></div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <button className="workspace-switch"><span className="workspace-avatar">O</span><span className="workspace-text"><b>Ouranos Workspace</b><small>Enterprise plan</small></span><ChevronDown size={15}/></button>
        <div className="side-label">WORKSPACE</div>
        <button className={'side-link ' + (!active && filter === 'all' ? 'selected' : '')} onClick={() => {setActive(null);setFilter('all')}}><Home size={17}/><span>Apps</span><span className="side-count">{apps.length}</span></button>
        <button className="side-link" onClick={() => {setActive(null);setFilter('favorites')}}><Layers3 size={17}/><span>Favorites</span></button>
        <button className="side-link" onClick={() => {setActive(null);setFilter('recent')}}><Activity size={17}/><span>Recent</span></button>
        <div className="side-label side-label-spaced">APP CATEGORIES</div>
        {groups.map(group => <button key={group.id} className={'side-link ' + (filter === group.id ? 'selected' : '')} onClick={() => {setActive(null);setFilter(group.id)}}><span className="category-dot"/><span>{group.title}</span></button>)}
        <div className="sidebar-bottom"><button className="side-link"><Settings size={17}/><span>Settings</span></button></div>
      </aside>
      <main className="main">
        {active ? <div className="module-page">
          <div className="breadcrumbs"><button onClick={() => setActive(null)}><Layers3 size={15}/> Apps</button><ChevronRight size={14}/><span>{active.name}</span></div>
          <div className="module-heading"><div className="module-heading-left"><span className="app-icon large" style={{background:active.color}}>{Icon && <Icon size={27}/>}</span><div><div className="eyebrow">{groups.find(group => group.id === active.group)?.title}</div><h1>{active.name}</h1><p>{active.description}</p></div></div></div>
          <div className="module-tabs"><button className="active">Overview</button><button>Records</button><button>Activities</button><button>Configuration</button></div>
          <div className="module-welcome"><div><span className="eyebrow">MODULE WORKSPACE</span><h2>Welcome to {active.name}</h2><p>{active.description} This is the dedicated workspace for this application.</p></div><div className="module-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core">{Icon && <Icon size={36}/>}</div></div></div>
          <div className="section-heading"><div><h3>At a glance</h3><p>Sample workspace indicators</p></div></div>
          <div className="metric-grid">{['Total records','Created this month','Needs attention','Completion'].map(label => <div className="metric-card" key={label}><span>{label}</span><b>—</b><small>Waiting for live data</small></div>)}</div>
          <div className="empty-panel"><h3>Your {active.name} workspace starts here</h3><p>Manage records, workflows and team activity here. Demo interface only; no live data connected.</p><button className="text-button" onClick={() => setActive(null)}>Back to all apps</button></div>
        </div> : <div className="launcher">
          <div className="welcome-row"><div><div className="eyebrow">OURANOS WORKSPACE</div><h1>Good morning, Justin <span>✦</span></h1><p>Everything you need to discover, understand and grow your business.</p></div></div>
          <div className="app-section"><div className="section-heading"><div><h2>{filter === 'all' ? 'All applications' : filter === 'favorites' ? 'Favorites' : filter === 'recent' ? 'Recently opened' : groups.find(group => group.id === filter)?.title}</h2><p>{filtered.length} applications</p></div></div><div className="app-grid">{filtered.map(app => <AppTile key={app.id} app={app} onOpen={openApp} favorite={favorites.includes(app.id)} onFavorite={toggleFavorite}/>)}</div></div>
          <div className="launcher-footer"><span>OURANOS ENTERPRISE</span><span>One workspace. Every opportunity.</span><span>v0.1.0 · Preview</span></div>
        </div>}
      </main>
    </div>
  </div>
}
