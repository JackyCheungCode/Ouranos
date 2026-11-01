import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, Bot, CheckCircle2, ChevronRight, CircleHelp,
  Cloud, Database, ExternalLink, KeyRound, Search, Settings2, ShieldCheck,
  Sparkles, Workflow, X
} from 'lucide-react'
import './SystemIntegrationsApp.css'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Section = 'data' | 'ai' | 'logs'
type Provider = { key: string; name: string; category: string; description: string; channels: string; docs: string; group: 'data' | 'ai' }
type DataConnection = {provider_key:string;status:string;is_enabled:boolean;last_tested_at:string|null;last_error:string|null}
type AiConfig = {provider_key:string;provider_name:string;model_name:string;is_default:boolean;is_enabled:boolean;status:string;last_tested_at:string|null;last_error:string|null;base_url:string|null}

const dataProviders: Provider[] = [
  { key:'apify', name:'Apify', category:'网页采集平台', description:'通过 Actors 运行可配置的数据发现和网页采集任务。', channels:'Google 搜索 · Google Maps · 公开网站', docs:'https://docs.apify.com/', group:'data' },
  { key:'brightdata', name:'Bright Data', category:'网页数据基础设施', description:'搜索结果、网页数据集及公开网页访问基础设施。', channels:'搜索引擎 · 公开网页', docs:'https://docs.brightdata.com/', group:'data' },
  { key:'octoparse', name:'Octoparse', category:'网页数据采集', description:'管理结构化网站采集任务与数据导出流程。', channels:'商业目录 · 企业网站', docs:'https://www.octoparse.com/', group:'data' },
  { key:'firecrawl', name:'Firecrawl', category:'网站抓取与提取', description:'抓取企业官网并将页面内容提取为结构化数据。', channels:'企业官网 · 联系页面 · 产品页面', docs:'https://docs.firecrawl.dev/', group:'data' },
  { key:'phantombuster', name:'PhantomBuster', category:'自动化工作流', description:'在平台规则和账户授权范围内执行社交渠道自动化。', channels:'LinkedIn · 社交平台', docs:'https://hub.phantombuster.com/', group:'data' },
  { key:'texau', name:'TexAu', category:'自动化工作流', description:'编排获准使用的社交、网页数据工作流。', channels:'社交渠道 · 自动化流程', docs:'https://texau.com/', group:'data' },
  { key:'kuajingmofang', name:'跨境魔方', category:'跨境电商数据', description:'接入可用的店铺、品牌和跨境电商企业数据接口。', channels:'跨境店铺 · 品牌 · 卖家', docs:'', group:'data' },
]

const aiProviders: Provider[] = [
  { key:'works-ai', name:'Works AI', category:'Ouranos 内置 AI', description:'Ouranos 默认 AI 服务入口，用于搜索计划、线索分析与工作流编排。具体模型路由由平台运行环境提供。', channels:'Works AI 默认模型', docs:'', group:'ai' },
  { key:'openai', name:'OpenAI', category:'大语言模型', description:'用于客户画像理解、搜索计划、企业摘要与线索评分。', channels:'GPT 系列模型', docs:'https://platform.openai.com/docs', group:'ai' },
  { key:'anthropic', name:'Anthropic', category:'大语言模型', description:'用于复杂企业研究、信息归纳和多步骤推理。', channels:'Claude 系列模型', docs:'https://docs.anthropic.com/', group:'ai' },
  { key:'google-ai', name:'Google AI', category:'大语言模型', description:'用于文本理解、信息抽取和多模态分析。', channels:'Gemini 系列模型', docs:'https://ai.google.dev/gemini-api/docs', group:'ai' },
  { key:'deepseek', name:'DeepSeek', category:'大语言模型', description:'用于低成本文本分析、分类与结构化提取。', channels:'DeepSeek 系列模型', docs:'https://api-docs.deepseek.com/', group:'ai' },
  { key:'openrouter', name:'OpenRouter', category:'模型聚合服务', description:'通过统一接口管理多个模型供应商与模型选择。', channels:'多供应商模型路由', docs:'https://openrouter.ai/docs', group:'ai' },
]

const integrationLogs = [
  { time:'—', provider:'—', action:'尚无集成活动', result:'等待连接配置' },
]

export default function SystemIntegrationsApp() {
  const { workspace } = useAuth()
  const [dataConnections,setDataConnections] = useState<DataConnection[]>([])
  const [aiConfigs,setAiConfigs] = useState<AiConfig[]>([])
  const [dbLoading,setDbLoading] = useState(false)
  const [dbError,setDbError] = useState('')
  const [section, setSection] = useState<Section>('data')
  const [selectedKey, setSelectedKey] = useState('apify')
  const [query, setQuery] = useState('')
  const [showDisabledHint, setShowDisabledHint] = useState(false)
  const refreshConnections = async()=>{
    if(!supabase||!workspace)return
    setDbLoading(true);setDbError('')
    const [dataResult,aiResult]=await Promise.all([
      supabase.from('integration_connections').select('provider_key,status,is_enabled,last_tested_at,last_error').eq('workspace_id',workspace.id),
      supabase.from('ai_model_configs').select('provider_key,provider_name,model_name,is_default,is_enabled,status,last_tested_at,last_error,base_url').eq('workspace_id',workspace.id)
    ])
    if(dataResult.error)setDbError(dataResult.error.message);else setDataConnections((dataResult.data||[]) as DataConnection[])
    if(aiResult.error)setDbError(aiResult.error.message);else setAiConfigs((aiResult.data||[]) as AiConfig[])
    setDbLoading(false)
  }
  useEffect(()=>{void refreshConnections()},[workspace?.id])
  const providers = section === 'ai' ? aiProviders : dataProviders
  const selected = useMemo(() => [...dataProviders, ...aiProviders].find(item => item.key === selectedKey) ?? providers[0], [selectedKey, providers])
  const selectedDataConnection = dataConnections.find(item=>item.provider_key===selectedKey)
  const selectedAiConfigs = aiConfigs.filter(item=>item.provider_key===selectedKey)
  const selectedDefaultAi = selectedAiConfigs.find(item=>item.is_default) || selectedAiConfigs[0]
  const selectedConnection = selected?.group==='ai' ? selectedAiConfigs.find(item=>item.status==='connected'&&item.is_enabled) : dataConnections.find(item=>item.provider_key===selectedKey&&item.status==='connected'&&item.is_enabled)
  const configuredConnection = selected?.group==='ai' ? selectedDefaultAi : selectedDataConnection
  const connectedCount = dataConnections.filter(item=>item.status==='connected'&&item.is_enabled).length + aiConfigs.filter(item=>item.status==='connected'&&item.is_enabled).length
  const testDates=[...dataConnections,...aiConfigs].map(item=>item.last_tested_at).filter((value):value is string=>Boolean(value)).sort()
  const latestTest = testDates[testDates.length-1]
  const filtered = providers.filter(item => (item.name + item.category + item.description + item.channels).toLowerCase().includes(query.toLowerCase()))
  const chooseSection = (next: Section) => {
    setSection(next)
    setSelectedKey(next === 'ai' ? 'works-ai' : 'apify')
    setQuery('')
    setShowDisabledHint(false)
  }

  return <div className="integrations-app">
    <div className="int-app-header">
      <div>
        <div className="int-eyebrow">SETTINGS / SYSTEM INTEGRATIONS</div>
        <h1>系统集成</h1>
        <p>统一管理外部数据服务、自动化平台和 AI 模型连接。</p>
      </div>
      <div className="int-header-actions">
        <span className="int-security-chip"><ShieldCheck size={14}/> 服务端凭证管理</span>
        <button className="int-primary" onClick={() => setShowDisabledHint(true)}>新增集成 <span>＋</span></button>
      </div>
    </div>

    <div className="int-stat-strip">
      <div><span>数据服务商</span><b>07</b><small>计划接入</small></div>
      <div><span>AI 服务商</span><b>06</b><small>可配置模型</small></div>
      <div><span>已连接服务</span><b>{String(connectedCount).padStart(2,'0')}</b><small>来自当前工作空间数据库</small></div>
      <div><span>最近连接测试</span><b>{latestTest?new Date(latestTest).toLocaleDateString():'—'}</b><small>{latestTest?new Date(latestTest).toLocaleTimeString():'暂无测试记录'}</small></div>
    </div>

    <div className="int-tabs">
      <button className={section === 'data' ? 'active' : ''} onClick={() => chooseSection('data')}><Database size={15}/> 数据采集服务 <span>7</span></button>
      <button className={section === 'ai' ? 'active' : ''} onClick={() => chooseSection('ai')}><Sparkles size={15}/> AI 模型服务 <span>{aiProviders.length}</span></button>
      <button className={section === 'logs' ? 'active' : ''} onClick={() => chooseSection('logs')}><Activity size={15}/> 集成日志</button>
    </div>

    {section !== 'logs' ? <div className="int-workarea">
      <section className="int-list-pane">
        <div className="int-list-toolbar">
          <div className="int-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索服务商..."/></div>
          <button className="int-filter-button"><Settings2 size={15}/> 筛选</button>
        </div>
        <div className="int-list-labels"><span>服务商</span><span>连接状态</span><span>配置</span></div>
        <div className="int-provider-list">
          {filtered.map(provider => {const connection=provider.key==='works-ai'?null:provider.group==='ai'?aiConfigs.find(item=>item.provider_key===provider.key&&item.is_default)||aiConfigs.find(item=>item.provider_key===provider.key):dataConnections.find(item=>item.provider_key===provider.key);const status=provider.key==='works-ai'?'built-in':connection?.status||'not_configured';return <button key={provider.key} className={'int-provider-row ' + (selectedKey === provider.key ? 'selected' : '')} onClick={() => {setSelectedKey(provider.key);setShowDisabledHint(false)}}>
            <span className={'int-provider-icon ' + (provider.group === 'ai' ? 'ai' : '')}>{provider.group === 'ai' ? <Bot size={17}/> : <Cloud size={17}/>}</span>
            <span className="int-provider-main"><b>{provider.name}</b><small>{provider.category}</small></span>
            <span className={status==='connected'?'int-connected':status==='configured'?'int-configured':provider.key==='works-ai'?'int-connected':'int-not-connected'}><i/> {status==='connected'?'已连接':status==='configured'?'已配置':status==='error'?'连接异常':provider.key==='works-ai'?'内置默认':'未配置'}</span>
            <ChevronRight size={15} className="int-row-chevron"/>
          </button>)}
          {!filtered.length && <div className="int-no-results">没有匹配的服务商</div>}
        </div>
        <div className="int-list-footer">显示 {filtered.length} 项，共 {providers.length} 项</div>
      </section>

      <section className="int-detail-pane">
        {selected && <>
          <div className="int-detail-head">
            <div className="int-detail-brand">
              <span className={'int-detail-icon ' + (selected.group === 'ai' ? 'ai' : '')}>{selected.group === 'ai' ? <Bot size={23}/> : <Cloud size={23}/>}</span>
              <div><div className="int-eyebrow">{selected.group === 'ai' ? 'AI PROVIDER' : 'DATA PROVIDER'}</div><h2>{selected.name}</h2><p>{selected.category}</p></div>
            </div>
            <span className={selected.key==='works-ai'?'int-status built-in':selectedConnection?'int-status connected':configuredConnection?.status==='error'?'int-status error':'int-status'}><i/> {selected.key==='works-ai'?'内置默认':selectedConnection?'已连接':configuredConnection?.status==='configured'?'已配置':configuredConnection?.status==='error'?'连接异常':'未配置'}</span>
          </div>
          <p className="int-description">{selected.description}</p>
          <div className="int-detail-tabs"><span className="active">连接信息</span><span>高级设置</span><span>使用记录</span></div>
          <div className="int-config-section">
            <div className="int-section-title"><h3>服务配置</h3><span>连接参数</span></div>
            <div className="int-config-row"><span>服务商</span><b>{selected.name}</b></div>
            <div className="int-config-row"><span>支持渠道 / 能力</span><b>{selected.channels}</b></div>
            {selected.group === 'ai' && <><div className="int-config-row"><span>模型名称</span><b>{selected.key==='works-ai'?'Works AI 默认模型':selectedAiConfigs.length?selectedAiConfigs.map(item=>item.model_name).join('、'):'尚未配置模型'}</b></div><div className="int-config-row"><span>默认模型</span><b>{selected.key==='works-ai'?'Works AI':selectedDefaultAi?.model_name||'未设置'}</b></div></>}
            {selected.key !== "works-ai" && <div className="int-config-row"><span>API 凭证</span><b className="int-credential-state"><KeyRound size={13}/> {configuredConnection?'已安全保存（Vault）':'尚未配置'}</b></div>}
            {selected.key !== "works-ai" && <div className="int-config-row"><span>密钥存储</span><b>Supabase Vault（服务端）</b></div>}
            <div className="int-config-row"><span>最近测试</span><b>{configuredConnection?.last_tested_at?new Date(configuredConnection.last_tested_at).toLocaleString():'从未测试'}</b></div>{configuredConnection?.last_error&&<div className="int-config-row"><span>最近错误</span><b className="int-error-text">{configuredConnection.last_error}</b></div>}
          </div>
          {dbError&&<div className="int-db-error">{dbError}</div>}{dbLoading&&<div className="int-db-loading">正在读取当前工作空间连接配置…</div>}<div className="int-connection-actions">
            {selected.key !== "works-ai" && <button className="int-primary" onClick={() => setShowDisabledHint(true)}>配置连接 <ArrowRight size={14}/></button>}
            {selected.docs && <a href={selected.docs} target="_blank" rel="noreferrer">查看官方文档 <ExternalLink size={13}/></a>}
          </div>
          <div className="int-info-box"><ShieldCheck size={17}/><span>{selected.key === "works-ai" ? "Works AI 是 Ouranos 默认模型入口，无需在此录入第三方 API Key。可在 AI 搜索计划中直接选用。" : "连接状态和模型清单已从当前工作空间数据库读取。API Key 的安全录入、更新、删除和真实连接测试将在下一阶段通过服务端 Vault 接口开放。"}</span></div>
        </>}
      </section>
    </div> : <section className="int-log-panel">
      <div className="int-log-toolbar"><div><h2>集成日志</h2><p>查看连接测试、API 调用和异常记录。</p></div><button className="int-filter-button"><Settings2 size={14}/> 筛选</button></div>
      <div className="int-log-table"><div className="int-log-head"><span>时间</span><span>服务商</span><span>操作</span><span>结果</span></div>{integrationLogs.map((log,index)=><div className="int-log-row" key={index}><span>{log.time}</span><span>{log.provider}</span><span>{log.action}</span><span>{log.result}</span></div>)}</div>
      <div className="int-log-empty"><Activity size={22}/><b>暂无集成日志</b><span>连接服务商后，测试结果和调用记录会显示在这里。</span></div>
    </section>}

    {showDisabledHint && <div className="int-hint-overlay" role="dialog" aria-modal="true" aria-label="连接配置说明">
      <div className="int-hint-dialog"><button className="int-hint-close" onClick={() => setShowDisabledHint(false)} aria-label="关闭"><X size={17}/></button><span className="int-hint-icon"><KeyRound size={21}/></span><h3>安全凭证服务正在接入</h3><p>登录和工作空间上下文已接通，当前页面已读取真实连接配置。下一阶段将开放服务端 API Key 保存、更新、删除与连接测试；密钥始终只保存在 Supabase Vault，不会返回浏览器。</p><div className="int-hint-checks"><span><CheckCircle2 size={14}/> 数据库配置结构已建立</span><span><CheckCircle2 size={14}/> Vault 服务端密钥接口已部署</span><span><Workflow size={14}/> 用户认证与连接测试待接入</span></div><button className="int-primary full" onClick={() => setShowDisabledHint(false)}>知道了</button></div>
    </div>}
  </div>
}
