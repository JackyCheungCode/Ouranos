import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bot, Building2, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, Database, Globe2, Linkedin, MapPin, Plus, Search,
  Settings2, ShieldCheck, Sparkles, Target, Users, Workflow, X
} from 'lucide-react'
import './LeadFinderApp.css'

type Tab = 'search' | 'tasks' | 'sources'
type TargetType = 'companies' | 'contacts' | 'both'

type SearchTask = {
  id: string
  name: string
  criteria: string
  createdAt: string
  channels: number
  status: '待接入数据源'
}

const channels = [
  { id: 'google', name: 'Google 搜索 / 地图', detail: '企业官网、当地企业、进口商与经销商', icon: Search },
  { id: 'linkedin', name: 'LinkedIn', detail: '企业主页、管理人员与采购决策人', icon: Linkedin },
  { id: 'websites', name: '独立站', detail: '品牌官网、制造商、批发商与 DTC 企业', icon: Globe2 },
  { id: 'ecommerce', name: 'Amazon / 电商平台', detail: '品牌、卖家、店铺及产品经营者', icon: Building2 },
  { id: 'b2b', name: 'B2B 平台', detail: '进口商、采购商、供应商与批发商', icon: Users },
  { id: 'social', name: 'Facebook / Instagram', detail: '品牌商、零售商与社交电商企业', icon: Users },
  { id: 'crossborder', name: '跨境电商店铺数据', detail: '跨境卖家、店铺、品牌及经营品类', icon: Database },
  { id: 'other', name: '其他网站', detail: '行业目录、商业名录及公开网站', icon: Globe2 },
]

const providers = [
  { name: 'Apify', category: '多渠道采集执行', description: '通过适用的 Actors 执行搜索、地图及网站数据采集。', channels: 'Google · Maps · 网站' },
  { name: 'Bright Data', category: '网页数据基础设施', description: '获取搜索结果和公开网页数据，支持大规模数据工作流。', channels: '搜索 · 公开网页' },
  { name: 'Octoparse', category: '结构化网页采集', description: '执行配置好的网站数据采集任务。', channels: '网站 · 商业目录' },
  { name: 'Firecrawl', category: '网站发现与补全', description: '抓取企业网站并提取结构化页面内容。', channels: '企业官网 · 联系页面' },
  { name: 'PhantomBuster', category: '社交自动化工作流', description: '在平台允许和账户授权范围内运行社交渠道工作流。', channels: 'LinkedIn · 社交渠道' },
  { name: 'TexAu', category: '自动化工作流', description: '编排获准使用的社交与网页自动化任务。', channels: '社交渠道 · 自动化' },
  { name: '跨境魔方', category: '跨境电商数据', description: '接入可用的店铺、品牌和跨境电商企业数据接口。', channels: '跨境店铺 · 品牌' },
]

const workflow = [
  { title: '多渠道发现企业', detail: '按客户画像分发到已启用的数据源，收集企业名称、网站和来源。', icon: Search },
  { title: '企业识别与去重', detail: '优先使用域名、企业标识、电话及名称地址相似度识别重复企业。', icon: ShieldCheck },
  { title: '企业信息补全', detail: '提取官网介绍、产品、公开企业邮箱、电话、地址和社交链接。', icon: Building2 },
  { title: '联系人发现', detail: '围绕已确认企业寻找采购、管理及业务负责人，并建立关联。', icon: Users },
  { title: 'AI 分析与客户入库', detail: '评估匹配度和数据可信度，保留证据来源后进入潜在客户库。', icon: Sparkles },
]

export default function LeadFinderApp() {
  const [tab, setTab] = useState<Tab>('search')
  const [product, setProduct] = useState('')
  const [industry, setIndustry] = useState('')
  const [countries, setCountries] = useState('全球')
  const [targetType, setTargetType] = useState<TargetType>('both')
  const [quantity, setQuantity] = useState('500')
  const [keywords, setKeywords] = useState('')
  const [selectedChannels, setSelectedChannels] = useState(channels.map(item => item.id))
  const [showPlan, setShowPlan] = useState(false)
  const [tasks, setTasks] = useState<SearchTask[]>([])
  const [activeTask, setActiveTask] = useState<string | null>(null)

  const selectedNames = useMemo(() => channels.filter(item => selectedChannels.includes(item.id)).map(item => item.name), [selectedChannels])
  const activeTaskData = tasks.find(task => task.id === activeTask)

  const toggleChannel = (id: string) => setSelectedChannels(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const selectAllChannels = () => setSelectedChannels(current => current.length === channels.length ? [] : channels.map(item => item.id))

  const createTask = () => {
    const task: SearchTask = {
      id: `LD-${String(Date.now()).slice(-7)}`,
      name: product.trim() || industry.trim() || '全球潜在客户搜索',
      criteria: [countries, industry, product, targetType === 'companies' ? '企业' : targetType === 'contacts' ? '联系人' : '企业 + 联系人'].filter(Boolean).join(' · '),
      createdAt: new Date().toLocaleString(),
      channels: selectedChannels.length,
      status: '待接入数据源',
    }
    setTasks(current => [task, ...current])
    setActiveTask(task.id)
    setShowPlan(false)
    setTab('tasks')
  }

  const canPlan = Boolean(product.trim() || industry.trim() || keywords.trim())

  return (
    <div className="lead-workspace">
      <div className="lead-page-head">
        <div>
          <div className="lead-eyebrow">PROSPECTING / LEAD DISCOVERY</div>
          <h1>潜在客户搜索</h1>
          <p>从全球多渠道发现目标企业，补全企业信息并寻找关键联系人。</p>
        </div>
        <div className="lead-head-actions">
          <span className="lead-mode-pill"><Sparkles size={14}/> AI 智能规划</span>
          <button className="lead-quiet-button" onClick={() => setTab('sources')}><Settings2 size={15}/> 数据源配置</button>
        </div>
      </div>

      <div className="lead-tabs" role="tablist" aria-label="潜在客户搜索导航">
        <button className={tab === 'search' ? 'active' : ''} onClick={() => { setTab('search'); setActiveTask(null) }}><Target size={16}/> 创建搜索</button>
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => { setTab('tasks'); setActiveTask(null) }}><Workflow size={16}/> 搜索任务 <span>{tasks.length}</span></button>
        <button className={tab === 'sources' ? 'active' : ''} onClick={() => setTab('sources')}><Database size={16}/> 数据源管理</button>
      </div>

      {tab === 'search' && !showPlan && (
        <div className="lead-search-layout">
          <section className="lead-main-column">
            <div className="lead-card">
              <div className="lead-card-heading">
                <div><span className="lead-step">STEP 01</span><h2>定义目标客户</h2><p>告诉 Ouranos 你想寻找什么样的企业和联系人。</p></div>
                <span className="lead-step-icon"><Target size={19}/></span>
              </div>
              <div className="lead-form-grid">
                <label className="lead-field lead-field-wide">
                  <span>产品 / 服务关键词 <b>*</b></span>
                  <input value={product} onChange={event => setProduct(event.target.value)} placeholder="例如：汽车配件、太阳能组件、工业泵..." />
                </label>
                <label className="lead-field">
                  <span>目标行业</span>
                  <input value={industry} onChange={event => setIndustry(event.target.value)} placeholder="例如：汽车零部件、能源、制造业" />
                </label>
                <label className="lead-field">
                  <span>目标国家 / 地区</span>
                  <input value={countries} onChange={event => setCountries(event.target.value)} placeholder="全球，或输入国家 / 地区" />
                </label>
                <div className="lead-field lead-field-wide">
                  <span>搜索对象</span>
                  <div className="lead-segmented">
                    <button className={targetType === 'companies' ? 'selected' : ''} onClick={() => setTargetType('companies')}><Building2 size={15}/> 企业</button>
                    <button className={targetType === 'contacts' ? 'selected' : ''} onClick={() => setTargetType('contacts')}><Users size={15}/> 联系人</button>
                    <button className={targetType === 'both' ? 'selected' : ''} onClick={() => setTargetType('both')}><Users size={15}/> 企业 + 联系人</button>
                  </div>
                </div>
                <label className="lead-field">
                  <span>目标企业数量</span>
                  <select value={quantity} onChange={event => setQuantity(event.target.value)}>
                    <option value="100">最多 100 家</option><option value="500">约 500 家</option><option value="1000">约 1,000 家</option><option value="5000">5,000 家以上</option><option value="custom">稍后设定</option>
                  </select>
                </label>
                <label className="lead-field">
                  <span>补充搜索关键词</span>
                  <input value={keywords} onChange={event => setKeywords(event.target.value)} placeholder="进口商、批发商、经销商..." />
                </label>
              </div>
            </div>

            <div className="lead-card">
              <div className="lead-card-heading">
                <div><span className="lead-step">STEP 02</span><h2>选择发现渠道</h2><p>默认启用全部渠道，AI 会根据目标客户动态规划搜索。</p></div>
                <button className="lead-link-button" onClick={selectAllChannels}>{selectedChannels.length === channels.length ? '取消全选' : '全部启用'}</button>
              </div>
              <div className="lead-channel-grid">
                {channels.map(channel => {
                  const Icon = channel.icon
                  const checked = selectedChannels.includes(channel.id)
                  return <button key={channel.id} className={'lead-channel-option ' + (checked ? 'checked' : '')} onClick={() => toggleChannel(channel.id)} aria-pressed={checked}>
                    <span className="lead-channel-icon"><Icon size={17}/></span>
                    <span className="lead-channel-copy"><b>{channel.name}</b><small>{channel.detail}</small></span>
                    <span className="lead-check">{checked && <Check size={13}/>}</span>
                  </button>
                })}
              </div>
              <div className="lead-selection-foot"><span>已启用 {selectedChannels.length} / {channels.length} 个渠道</span><span>数据源实际可用性以连接配置和授权为准</span></div>
            </div>

            <div className="lead-card lead-flow-card">
              <div className="lead-card-heading">
                <div><span className="lead-step">STEP 03</span><h2>自动执行流程</h2><p>Ouranos 按照企业优先的顺序组织多轮搜索。</p></div>
                <span className="lead-auto-label"><Bot size={14}/> 自动工作流</span>
              </div>
              <div className="lead-mini-flow">
                {workflow.map((item, index) => {
                  const Icon = item.icon
                  return <div className="lead-mini-step" key={item.title}><span className="lead-mini-number">{index + 1}</span><span className="lead-mini-icon"><Icon size={16}/></span><span><b>{item.title}</b><small>{item.detail}</small></span>{index < workflow.length - 1 && <ArrowRight className="lead-mini-arrow" size={15}/>}</div>
                })}
              </div>
            </div>
            <div className="lead-submit-row">
              <span><ShieldCheck size={15}/> 创建计划不会立即调用外部 API</span>
              <button className="lead-primary-button" disabled={!canPlan || selectedChannels.length === 0} onClick={() => setShowPlan(true)}>生成 AI 搜索计划 <ArrowRight size={16}/></button>
            </div>
          </section>

          <aside className="lead-side-column">
            <div className="lead-side-card lead-side-highlight">
              <span className="lead-side-icon"><Sparkles size={18}/></span>
              <h3>AI 搜索规划器</h3>
              <p>根据目标客户画像，规划搜索渠道、企业识别、信息补全和联系人发现顺序。</p>
              <div className="lead-side-stat"><span>搜索模式</span><b>AI 自动规划</b></div>
              <div className="lead-side-stat"><span>市场范围</span><b>{countries || '待设置'}</b></div>
              <div className="lead-side-stat"><span>目标数量</span><b>{quantity === 'custom' ? '稍后设定' : quantity + ' 家'}</b></div>
            </div>
            <div className="lead-side-card">
              <h3>将收集的客户资料</h3>
              <div className="lead-data-tags">{['公司名称','国家 / 地区','官方网站','企业邮箱','联系电话','社交媒体','联系人 / 职位','产品品类','公司地址','公司规模','来源渠道','发现时间'].map(item => <span key={item}>{item}</span>)}</div>
            </div>
            <div className="lead-side-note"><CircleHelp size={16}/><span>企业和联系人会分开建档，通过关联关系连接。每条数据都保留来源和验证状态。</span></div>
          </aside>
        </div>
      )}

      {tab === 'search' && showPlan && (
        <div className="lead-plan-view">
          <button className="lead-back-button" onClick={() => setShowPlan(false)}><ArrowLeft size={15}/> 返回修改条件</button>
          <div className="lead-plan-hero">
            <span className="lead-plan-mark"><Sparkles size={22}/></span>
            <div><span className="lead-step">AI SEARCH PLAN</span><h2>搜索计划已生成</h2><p>这是根据当前条件生成的执行方案预览。确认后会创建任务记录；真实采集需先配置服务商连接。</p></div>
          </div>
          <div className="lead-plan-grid">
            <div className="lead-card">
              <h3>目标客户画像</h3>
              <div className="lead-summary-list"><span>产品 / 服务</span><b>{product || '未指定'}</b><span>行业</span><b>{industry || '由关键词识别'}</b><span>国家 / 地区</span><b>{countries || '全球'}</b><span>搜索对象</span><b>{targetType === 'companies' ? '企业' : targetType === 'contacts' ? '联系人' : '企业 + 联系人'}</b><span>目标数量</span><b>{quantity === 'custom' ? '稍后设定' : quantity + ' 家'}</b><span>补充关键词</span><b>{keywords || '无'}</b></div>
            </div>
            <div className="lead-card">
              <h3>已选择的发现渠道</h3>
              <div className="lead-plan-chips">{selectedNames.map(name => <span key={name}><CheckCircle2 size={13}/>{name}</span>)}</div>
              <div className="lead-plan-hint"><ShieldCheck size={15}/> AI 将优先使用可用且已授权的数据源；未连接的渠道会标记为待配置，不会假定已执行。</div>
            </div>
          </div>
          <div className="lead-card">
            <h3>计划执行顺序</h3>
            <div className="lead-plan-steps">{workflow.map((item, index) => { const Icon = item.icon; return <div className="lead-plan-step" key={item.title}><span>{index + 1}</span><Icon size={18}/><div><b>{item.title}</b><small>{item.detail}</small></div></div> })}</div>
          </div>
          <div className="lead-submit-row"><span><Clock3 size={15}/> 任务创建后可在「搜索任务」中查看状态</span><button className="lead-primary-button" onClick={createTask}>创建搜索任务 <ArrowRight size={16}/></button></div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="lead-content-panel">
          {activeTaskData ? (
            <div className="lead-task-detail">
              <button className="lead-back-button" onClick={() => setActiveTask(null)}><ArrowLeft size={15}/> 返回任务列表</button>
              <div className="lead-task-title-row"><div><span className="lead-step">SEARCH TASK</span><h2>{activeTaskData.name}</h2><p>{activeTaskData.criteria}</p></div><span className="lead-status pending"><Clock3 size={13}/> 待接入数据源</span></div>
              <div className="lead-notice"><CircleHelp size={18}/><div><b>任务已创建，尚未开始真实采集</b><p>当前版本已完成前端任务流程。连接服务商 API、后端任务队列和数据存储后，才能启动真实搜索。</p></div></div>
              <div className="lead-task-metrics"><div><b>0</b><span>发现记录</span></div><div><b>0</b><span>唯一企业</span></div><div><b>0</b><span>联系人</span></div><div><b>{activeTaskData.channels}</b><span>选择渠道</span></div></div>
              <div className="lead-card"><h3>执行阶段</h3><div className="lead-plan-steps">{workflow.map((item, index) => {const Icon = item.icon;return <div className="lead-plan-step muted" key={item.title}><span>{index + 1}</span><Icon size={18}/><div><b>{item.title}</b><small>{item.detail}</small></div><em>等待后端接入</em></div>})}</div></div>
              <div className="lead-card"><h3>任务信息</h3><div className="lead-summary-list"><span>任务编号</span><b>{activeTaskData.id}</b><span>创建时间</span><b>{activeTaskData.createdAt}</b><span>搜索条件</span><b>{activeTaskData.criteria}</b><span>状态</span><b>待接入数据源</b></div></div>
            </div>
          ) : (
            <>
              <div className="lead-content-heading"><div><h2>搜索任务</h2><p>查看已创建的客户发现任务及其执行阶段。</p></div><button className="lead-primary-button small" onClick={() => {setTab('search');setShowPlan(false)}}><Plus size={15}/> 新建搜索</button></div>
              {tasks.length ? <div className="lead-task-list">{tasks.map(task => <button className="lead-task-row" key={task.id} onClick={() => setActiveTask(task.id)}><span className="lead-task-symbol"><Target size={18}/></span><span className="lead-task-copy"><b>{task.name}</b><small>{task.criteria} · {task.createdAt}</small></span><span className="lead-status pending"><Clock3 size={12}/>{task.status}</span><ArrowRight size={16}/></button>)}</div> : <div className="lead-empty-state"><span><Search size={24}/></span><h3>还没有搜索任务</h3><p>定义目标客户并生成搜索计划，创建你的第一个多渠道发现任务。</p><button className="lead-primary-button" onClick={() => setTab('search')}>创建第一个搜索 <ArrowRight size={15}/></button></div>}
            </>
          )}
        </div>
      )}

      {tab === 'sources' && (
        <div className="lead-content-panel">
          <div className="lead-content-heading"><div><h2>数据源管理</h2><p>统一查看七家数据服务商的连接状态与职责。当前尚未配置真实 API 凭证。</p></div><span className="lead-status pending"><Clock3 size={13}/> 0 / 7 已连接</span></div>
          <div className="lead-provider-grid">{providers.map(provider => <div className="lead-provider-card" key={provider.name}><div className="lead-provider-top"><span className="lead-provider-logo">{provider.name.slice(0, 1)}</span><span className="lead-status pending">未连接</span></div><h3>{provider.name}</h3><span className="lead-provider-category">{provider.category}</span><p>{provider.description}</p><div className="lead-provider-channels">{provider.channels}</div><button className="lead-provider-action" onClick={() => window.alert('数据源连接配置将在后续后端接入阶段开放。请勿在前端填写或保存 API Key。')}>查看连接要求 <ArrowRight size={14}/></button></div>)}</div>
          <div className="lead-security-note"><ShieldCheck size={17}/><span>安全提示：API Key 只能保存在服务端密钥管理中，不会放入浏览器、前端代码或 Git 仓库。</span></div>
        </div>
      )}
    </div>
  )
}
