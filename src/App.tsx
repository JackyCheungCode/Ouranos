import { useMemo, useState } from 'react'
import {
  Activity, BarChart3, Bot, Building2, CalendarClock, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, ClipboardList, Cloud, Command, Contact, Database, FileText,
  Filter, Globe2, Home, LayoutDashboard, Mail, Menu, Moon, MoreHorizontal, Network,
  Plus, Search, Send, Settings, ShieldCheck, Sparkles, Sun, Target, TrendingUp, Users,
  WandSparkles, Workflow, X, Zap, Star, ArrowUpRight, BriefcaseBusiness, Boxes, Layers3
} from 'lucide-react'
import './index.css'

type AppItem = { id: string; name: string; subtitle: string; group: string; icon: any; color: string; description: string }
const groups = [
  { id: 'workspace', title: 'Workspace', subtitle: 'Your work, all in one place' },
  { id: 'prospecting', title: 'Prospecting', subtitle: 'Discover your next customer' },
  { id: 'sales', title: 'Sales', subtitle: 'Turn opportunities into revenue' },
  { id: 'data', title: 'Data Intelligence', subtitle: 'Build a trusted data foundation' },
  { id: 'ai', title: 'AI Intelligence', subtitle: 'Research and automate with AI' },
  { id: 'marketing', title: 'Marketing', subtitle: 'Reach the right audience' },
  { id: 'analytics', title: 'Analytics', subtitle: 'Understand business performance' },
  { id: 'admin', title: 'Administration', subtitle: 'Configure your workspace' },
]
const apps: AppItem[] = [
  { id:'dashboard',name:'Dashboard',subtitle:'Overview',group:'workspace',icon:LayoutDashboard,color:'#714B67',description:'A live overview of your prospecting, sales activity and team performance.' },
  { id:'activities',name:'My Activities',subtitle:'Tasks & reminders',group:'workspace',icon:CalendarClock,color:'#E08B36',description:'Your daily priorities, follow-ups and reminders in one focused inbox.' },
  { id:'lead-finder',name:'Lead Finder',subtitle:'Find prospects',group:'prospecting',icon:Target,color:'#167D9A',description:'Discover target companies by country, industry, product and business profile.' },
  { id:'companies',name:'Company Database',subtitle:'Company profiles',group:'prospecting',icon:Building2,color:'#4776B8',description:'A searchable database of companies, websites, locations and business details.' },
  { id:'contacts',name:'Contact Finder',subtitle:'Decision makers',group:'prospecting',icon:Contact,color:'#239B82',description:'Find purchasing managers, executives and other relevant business contacts.' },
  { id:'market-intel',name:'Market Intelligence',subtitle:'Explore markets',group:'prospecting',icon:Globe2,color:'#A16BB5',description:'Research market demand, industry trends, country opportunities and risks.' },
  { id:'competitors',name:'Competitor Finder',subtitle:'Competitive landscape',group:'prospecting',icon:Network,color:'#C16D4A',description:'Map competitors, comparable suppliers, brands and market participants.' },
  { id:'crm',name:'CRM',subtitle:'Customer relationships',group:'sales',icon:Users,color:'#714B67',description:'Manage accounts, contacts, customer history and ownership.' },
  { id:'pipeline',name:'Sales Pipeline',subtitle:'Deal stages',group:'sales',icon:Workflow,color:'#168A9A',description:'Track every opportunity from new lead to negotiation and closed deal.' },
  { id:'quotations',name:'Quotations',subtitle:'Pricing & offers',group:'sales',icon:FileText,color:'#C18A32',description:'Prepare, organize and track customer quotations and commercial terms.' },
  { id:'sales-activities',name:'Activities',subtitle:'Calls & meetings',group:'sales',icon:ClipboardList,color:'#4776B8',description:'Record calls, meetings, emails and the next customer touchpoint.' },
  { id:'data-hub',name:'Data Hub',subtitle:'Unified datasets',group:'data',icon:Database,color:'#4776B8',description:'Import, organize and browse datasets collected from multiple sources.' },
  { id:'providers',name:'Data Providers',subtitle:'Sources & APIs',group:'data',icon:Cloud,color:'#168A9A',description:'Manage connected data sources, provider status, usage and costs.' },
  { id:'enrichment',name:'Data Enrichment',subtitle:'Complete records',group:'data',icon:WandSparkles,color:'#A16BB5',description:'Enrich company and contact records with additional business information.' },
  { id:'cleaning',name:'Data Cleaning',subtitle:'Quality & deduplication',group:'data',icon:Check,color:'#239B82',description:'Normalize, validate and deduplicate company and contact records.' },
  { id:'trade',name:'Trade Intelligence',subtitle:'Import & export signals',group:'data',icon:Boxes,color:'#C16D4A',description:'Explore trade activity, product codes, buyers, suppliers and trade patterns.' },
  { id:'copilot',name:'AI Copilot',subtitle:'Your AI assistant',group:'ai',icon:Sparkles,color:'#714B9B',description:'Ask questions and get help navigating data and workflows across Ouranos.' },
  { id:'research',name:'AI Research',subtitle:'Deep company research',group:'ai',icon:Bot,color:'#4776B8',description:'Generate evidence-based company, product, industry and market research.' },
  { id:'scoring',name:'Lead Scoring',subtitle:'Prioritize prospects',group:'ai',icon:TrendingUp,color:'#239B82',description:'Score leads against your ideal customer profile and explain each score.' },
  { id:'agents',name:'AI Agents',subtitle:'Automated workflows',group:'ai',icon:Zap,color:'#D28A36',description:'Orchestrate multi-step research, enrichment and lead qualification workflows.' },
  { id:'email-marketing',name:'Email Marketing',subtitle:'Campaign delivery',group:'marketing',icon:Mail,color:'#4776B8',description:'Create targeted email campaigns and monitor delivery and engagement.' },
  { id:'sequences',name:'Email Sequences',subtitle:'Automated follow-up',group:'marketing',icon:Send,color:'#239B82',description:'Build timed follow-up sequences with clear approval and opt-out controls.' },
  { id:'campaigns',name:'Campaigns',subtitle:'Manage initiatives',group:'marketing',icon:Layers3,color:'#C16D4A',description:'Coordinate market, product, event and customer acquisition campaigns.' },
  { id:'templates',name:'Templates',subtitle:'Reusable content',group:'marketing',icon:FileText,color:'#A16BB5',description:'Store reusable outreach, quotation, research and AI prompt templates.' },
  { id:'sales-analytics',name:'Sales Analytics',subtitle:'Sales performance',group:'analytics',icon:BarChart3,color:'#168A9A',description:'Analyze sales activity, conversion, pipeline health and team performance.' },
  { id:'market-analytics',name:'Market Analytics',subtitle:'Market performance',group:'analytics',icon:Globe2,color:'#4776B8',description:'Understand prospect distribution, industry coverage and market opportunities.' },
  { id:'users',name:'Users & Teams',subtitle:'People & organization',group:'admin',icon:Users,color:'#714B67',description:'Manage workspace members, teams, ownership and organizational structure.' },
  { id:'permissions',name:'Permissions',subtitle:'Roles & access',group:'admin',icon:ShieldCheck,color:'#239B82',description:'Configure role-based access and control who can view or change data.' },
  { id:'settings',name:'Settings',subtitle:'Workspace setup',group:'admin',icon:Settings,color:'#68758A',description:'Configure workspace preferences, defaults and business settings.' },
  { id:'integrations',name:'Integrations',subtitle:'Connect services',group:'admin',icon:Network,color:'#C18A4A',description:'Connect external tools and configure approved integrations.' },
]
const recentIds = ['lead-finder','companies','crm','market-intel']
const initialFavorites = ['dashboard','lead-finder','crm','research']

function AppTile({ app, onOpen, favorite, onFavorite }: { app: AppItem; onOpen: (app: AppItem)=>void; favorite: boolean; onFavorite: (id:string)=>void }) {
  const Icon = app.icon
  return <div className="app-tile-wrap">
    <button className="app-tile" onClick={()=>onOpen(app)}>
      <span className="app-icon" style={{background:app.color}}><Icon size={23} strokeWidth={1.8}/></span>
      <span className="app-tile-name">{app.name}</span>
      <span className="app-tile-sub">{app.subtitle}</span>
    </button>
    <button className={'favorite-toggle '+(favorite?'is-favorite':'')} aria-label="Toggle favorite" onClick={()=>onFavorite(app.id)}><Star size={13} fill={favorite?'currentColor':'none'}/></button>
  </div>
}

export default function App() {
  const [active, setActive] = useState<AppItem|null>(null)
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(initialFavorites)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState(false)
  const filtered = useMemo(()=>apps.filter(a => (filter==='all'||(filter==='favorites'?favorites.includes(a.id):a.group===filter)) && (a.name+' '+a.subtitle+' '+a.description).toLowerCase().includes(query.toLowerCase())),[query,filter,favorites])
  const toggleFavorite = (id:string) => setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])
  const openApp = (app:AppItem) => { setActive(app); setNotice(false) }
  const groupApps = (group:string) => filtered.filter(a=>a.group===group)
  const recent = recentIds.map(id=>apps.find(a=>a.id===id)!).filter(Boolean)
  return <div className={dark?'ouranos dark':'ouranos'}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><span/><span/><span/></div><span>ouranos</span><span className="brand-edition">ENTERPRISE</span></div>
      <div className="top-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search apps, companies, contacts..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <button className="icon-button" title="Help"><CircleHelp size={18}/></button>
        <button className="icon-button" title="Toggle theme" onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
        <button className="profile"><span>J</span><span className="profile-name">Justin</span><ChevronDown size={14}/></button>
      </div>
    </header>
    <div className="layout">
      <aside className={sidebarOpen?'sidebar':'sidebar collapsed'}>
        <button className="workspace-switch"><span className="workspace-avatar">O</span><span className="workspace-text"><b>Ouranos Workspace</b><small>Enterprise plan</small></span><ChevronDown size={15}/></button>
        <div className="side-label">WORKSPACE</div>
        <button className={!active?'side-link selected':'side-link'} onClick={()=>setActive(null)}><Home size={17}/> <span>Apps</span><span className="side-count">{apps.length}</span></button>
        <button className="side-link" onClick={()=>{setFilter('favorites');setActive(null)}}><Star size={17}/> <span>Favorites</span></button>
        <button className="side-link" onClick={()=>{setFilter('all');setActive(null)}}><Activity size={17}/> <span>Recent</span></button>
        <div className="side-label side-label-spaced">APP CATEGORIES</div>
        {groups.map(g=><button key={g.id} className={'side-link '+(filter===g.id?'selected':'')} onClick={()=>{setFilter(g.id);setActive(null)}}><span className="category-dot" style={{background:({'workspace':'#8c6b85','prospecting':'#168ca3','sales':'#239b82','data':'#4776b8','ai':'#a16bb5','marketing':'#d28a36','analytics':'#168ca3','admin':'#8490a3'} as any)[g.id]}}/><span>{g.title}</span></button>)}
        <div className="sidebar-bottom"><div className="storage-card"><div className="storage-title"><span>Workspace usage</span><MoreHorizontal size={15}/></div><div className="storage-bar"><i/></div><small>Starter data workspace</small></div><button className="side-link"><Settings size={17}/><span>Settings</span></button></div>
      </aside>
      <main className="main">
        {active ? <div className="module-page">
          <div className="breadcrumbs"><button onClick={()=>setActive(null)}><Layers3 size={15}/> Apps</button><ChevronRight size={14}/><span>{active.name}</span></div>
          <div className="module-heading"><div className="module-heading-left"><span className="app-icon large" style={{background:active.color}}>{(()=>{const I=active.icon;return <I size={27}/>})()}</span><div><div className="eyebrow">{groups.find(g=>g.id===active.group)?.title}</div><h1>{active.name}</h1><p>{active.description}</p></div></div><button className="primary-button" onClick={()=>setNotice(true)}><Plus size={16}/> Create new</button></div>
          {notice&&<div className="notice"><Check size={16}/> This module is ready for the next implementation phase. Demo interface only; no live data connected.<button onClick={()=>setNotice(false)}><X size={14}/></button></div>}
          <div className="module-tabs"><button className="active">Overview</button><button>Records</button><button>Activities</button><button>Configuration</button></div>
          <div className="module-welcome"><div><span className="eyebrow">MODULE WORKSPACE</span><h2>Welcome to {active.name}</h2><p>{active.description} This is the dedicated workspace for this application.</p><button className="secondary-button" onClick={()=>setNotice(true)}>Explore module <ArrowUpRight size={15}/></button></div><div className="module-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><active.icon size={36}/></div><Sparkles className="art-spark" size={20}/></div></div>
          <div className="section-heading"><div><h3>At a glance</h3><p>Sample workspace indicators</p></div><button className="quiet-button"><MoreHorizontal size={18}/></button></div>
          <div className="metric-grid"><div className="metric-card"><span>Total records</span><b>—</b><small>Connect a data source to begin</small></div><div className="metric-card"><span>Created this month</span><b>—</b><small>Waiting for live data</small></div><div className="metric-card"><span>Needs attention</span><b>—</b><small>No pending items</small></div><div className="metric-card"><span>Completion</span><b>—</b><small>Activity will appear here</small></div></div>
          <div className="empty-panel"><div className="empty-icon"><BriefcaseBusiness size={23}/></div><h3>Your {active.name} workspace starts here</h3><p>Use this space to manage your {active.name.toLowerCase()} records, workflows and team activity. Sample content will be replaced with connected data in a later phase.</p><button className="text-button" onClick={()=>setActive(null)}><ChevronLeft size={15}/> Back to all apps</button></div>
        </div> : <div className="launcher">
          <div className="welcome-row"><div><div className="eyebrow">SUNDAY, NOVEMBER 1, 2026</div><h1>Good morning, Justin <span>✦</span></h1><p>Everything you need to discover, understand and grow your business.</p></div><button className="customize-button"><Settings size={15}/> Customize</button></div>
          <div className="quick-stats"><div className="quick-stat"><span className="stat-icon purple"><Target size={17}/></span><div><small>Prospects discovered</small><b>1,284 <em>+12.8%</em></b></div></div><div className="quick-stat"><span className="stat-icon teal"><Building2 size={17}/></span><div><small>Companies in database</small><b>8,492 <em>+8.2%</em></b></div></div><div className="quick-stat"><span className="stat-icon amber"><Activity size={17}/></span><div><small>Active opportunities</small><b>36 <em>+4.5%</em></b></div></div><div className="quick-stat"><span className="stat-icon blue"><Zap size={17}/></span><div><small>AI tasks completed</small><b>96 <em>+18.4%</em></b></div></div></div>
          {favorites.length>0&&filter==='all'&&!query&&<section className="app-section"><div className="section-heading"><div><h2>Favorites</h2><p>Your most-used applications</p></div><span className="section-count">{favorites.length} apps</span></div><div className="app-grid">{apps.filter(a=>favorites.includes(a.id)).map(a=><AppTile key={a.id} app={a} onOpen={openApp} favorite={true} onFavorite={toggleFavorite}/>)}</div></section>}
          {filter==='all'||filter==='favorites' ? groups.filter(g=>filter==='all'||groupApps(g.id).length>0).map(g=>{const items=groupApps(g.id);return items.length?<section className="app-section" key={g.id}><div className="section-heading"><div><h2>{g.title}</h2><p>{g.subtitle}</p></div><button className="view-all" onClick={()=>setFilter(g.id)}>View all <ChevronRight size={14}/></button></div><div className="app-grid">{items.map(a=><AppTile key={a.id} app={a} onOpen={openApp} favorite={favorites.includes(a.id)} onFavorite={toggleFavorite}/>)}</div></section>:null}) : <section className="app-section"><div className="section-heading"><div><h2>{groups.find(g=>g.id===filter)?.title||'Search results'}</h2><p>{filtered.length} applications</p></div><button className="view-all" onClick={()=>setFilter('all')}>All apps <ChevronRight size={14}/></button></div><div className="app-grid">{filtered.map(a=><AppTile key={a.id} app={a} onOpen={openApp} favorite={favorites.includes(a.id)} onFavorite={toggleFavorite}/>)}</div></section>}
          {query&&filtered.length===0&&<div className="empty-search"><Search size={28}/><h3>No apps found</h3><p>Try another keyword or clear your search.</p><button className="secondary-button" onClick={()=>setQuery('')}>Clear search</button></div>}
          <div className="launcher-footer"><span>OURANOS ENTERPRISE</span><span>One workspace. Every opportunity.</span><span>v0.1.0 · Preview</span></div>
        </div>}
      </main>
    </div>
  </div>
}
