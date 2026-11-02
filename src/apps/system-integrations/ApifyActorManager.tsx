import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, CheckCircle2, ChevronRight, Code2, Database, ExternalLink, Plus, RefreshCw, Search, Settings2, ShieldCheck, Trash2, Save, Play, X, Power, Layers3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type SchemaProperty={type?:string;title?:string;description?:string;default?:unknown;enum?:unknown[];editor?:string;format?:string;minimum?:number;maximum?:number}
type ActorSchema={title?:string;description?:string;properties?:Record<string,SchemaProperty>;required?:string[]}
type Catalog={adapter_name:string;external_actor_id:string;adapter_version:string;input_schema:ActorSchema;output_schema:Record<string,unknown>;verification_status:string;maintenance_status:string;supported_record_types:string[];capabilities:Record<string,unknown>}
type Selection={id:string;adapter_key:string;channel_key:string;is_enabled:boolean;priority:number;config:Record<string,unknown>;discovery_adapter_catalog:Catalog}
type StoreActor={id:string;name:string;username:string;description:string;url:string;stats:Record<string,unknown>}
type DetailTab='defaults'|'test'|'review'|'schema'
const channelOptions=[['linkedin','LinkedIn'],['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['x','X'],['pinterest','Pinterest'],['reddit','Reddit'],['threads','Threads'],['telegram','Telegram'],['vk','VK'],['google-search','Google Search'],['google-maps','Google Maps'],['bing','Microsoft Bing'],['yandex','Yandex'],['baidu','百度'],['naver','Naver'],['yelp','Yelp'],['apple-maps','Apple Maps'],['alibaba','Alibaba.com'],['made-in-china','Made-in-China'],['globalsources','Global Sources'],['tradekey','TradeKey'],['ec21','EC21'],['kompass','Kompass'],['europages','Europages'],['thomasnet','Thomasnet'],['indiamart','IndiaMART'],['1688','1688'],['amazon','Amazon'],['ebay','eBay'],['walmart','Walmart'],['etsy','Etsy'],['shopify','Shopify'],['aliexpress','AliExpress'],['temu','Temu'],['tiktok-shop','TikTok Shop'],['shopee','Shopee'],['lazada','Lazada'],['mercadolibre','Mercado Libre'],['company-sites','企业官方网站'],['directories','企业黄页 / 商业目录'],['news','新闻与媒体网站'],['job-sites','招聘网站'],['whois','域名 / DNS 信息'],['review-sites','评价 / 点评网站'],['trade-records','进出口 / 海关数据'],['company-registry','企业注册信息'],['business-data','商业数据库 / 信用信息'],['exhibitors','展会 / 参展商名录']]
const channelName=(key:string)=>channelOptions.find(([value])=>value===key)?.[1]||key
const toDraft=(value:unknown):string|boolean=>typeof value==='boolean'?value:typeof value==='string'?value:value===undefined||value===null?'':JSON.stringify(value)
const parseDrafts=(schema:ActorSchema,drafts:Record<string,string|boolean>)=>{
 const output:Record<string,unknown>={}
 for(const [key,field] of Object.entries(schema.properties||{})){
  const value=drafts[key]??''
  if(value===''||value===undefined||value===null)continue
  if(field.type==='boolean')output[key]=Boolean(value)
  else if(field.type==='integer'||field.type==='number'){const n=Number(value);if(!Number.isFinite(n))throw new Error(`字段格式不正确：${field.title||key}`);output[key]=n}
  else if(field.type==='array'||field.type==='object'){try{output[key]=JSON.parse(String(value))}catch{throw new Error(`字段必须是有效的 JSON：${field.title||key}`)}}
  else output[key]=String(value)
 }
 for(const key of schema.required||[])if(output[key]===undefined)throw new Error(`必填字段未填写：${schema.properties?.[key]?.title||key}`)
 return output
}
export default function ApifyActorManager({canSync}:{canSync:boolean}){
 const {workspace}=useAuth()
 const [channel,setChannel]=useState('google-maps')
 const [actorId,setActorId]=useState('')
 const [storeQuery,setStoreQuery]=useState('')
 const [storeResults,setStoreResults]=useState<StoreActor[]>([])
 const [storeBusy,setStoreBusy]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [selections,setSelections]=useState<Selection[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [listQuery,setListQuery]=useState('')
 const [detailTab,setDetailTab]=useState<DetailTab>('defaults')
 const [inputDrafts,setInputDrafts]=useState<Record<string,Record<string,string|boolean>>>({})
 const [testDrafts,setTestDrafts]=useState<Record<string,Record<string,string|boolean>>>({})
 const [reviewTypes,setReviewTypes]=useState<Record<string,string[]>>({})
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({})
 const [reviewRunIds,setReviewRunIds]=useState<Record<string,string>>({})
 const [testResults,setTestResults]=useState<Record<string,{run_id:string|null;status:string;sample:unknown[];items_count:number|null}>>({})
 const [testBusy,setTestBusy]=useState(false)
 const load=async()=>{
  if(!supabase||!workspace)return
  setLoading(true);setError('')
  const {data,error:queryError}=await supabase.from('workspace_adapter_selections')
   .select('id,adapter_key,channel_key,is_enabled,priority,config,discovery_adapter_catalog!inner(adapter_name,external_actor_id,adapter_version,input_schema,output_schema,verification_status,maintenance_status,supported_record_types,capabilities,provider_key)')
   .eq('workspace_id',workspace.id).eq('discovery_adapter_catalog.provider_key','apify').order('priority',{ascending:true})
  if(queryError)setError(queryError.message)
  else{
   const rows=(data||[]) as unknown as Selection[]
   setSelections(rows)
   setSelectedId(current=>rows.some(row=>row.id===current)?current:rows[0]?.id||'')
   setReviewTypes(current=>({...Object.fromEntries(rows.map(row=>[row.id,row.discovery_adapter_catalog.verification_status==='verified'?(row.discovery_adapter_catalog.supported_record_types||[]):[]])),...current}))
   setReviewNotes(current=>({...Object.fromEntries(rows.map(row=>[row.id,String((row.discovery_adapter_catalog.capabilities?.output_review as Record<string,unknown>|undefined)?.review_note||'')])),...current}))
   setInputDrafts(current=>({...current,...Object.fromEntries(rows.map(row=>{const schema=row.discovery_adapter_catalog.input_schema||{};const saved=(row.config?.input_defaults||{}) as Record<string,unknown>;return [row.id,Object.fromEntries(Object.entries(schema.properties||{}).map(([key,field])=>[key,toDraft(saved[key]??field.default??(field.type==='boolean'?false:field.type==='array'?'[]':field.type==='object'?'{}':''))]))]}))}))
  }
  setLoading(false)
 }
 useEffect(()=>{void load()},[workspace?.id])
 const selected=selections.find(row=>row.id===selectedId)||null
 const channelRows=useMemo(()=>channelOptions.map(([key,label])=>({key,label,count:selections.filter(row=>row.channel_key===key).length})),[selections,channel])
 const visibleRows=useMemo(()=>selections.filter(row=>(row.channel_key===channel)&&(row.discovery_adapter_catalog.adapter_name+' '+row.discovery_adapter_catalog.external_actor_id).toLowerCase().includes(listQuery.toLowerCase())),[selections,channel,listQuery])
 const stats=useMemo(()=>({all:selections.length,enabled:selections.filter(row=>row.is_enabled).length,verified:selections.filter(row=>row.discovery_adapter_catalog.verification_status==='verified').length,pending:selections.filter(row=>row.discovery_adapter_catalog.verification_status!=='verified').length}),[selections])
 const invoke=async(body:Record<string,unknown>)=>{
  if(!supabase||!workspace)throw new Error('工作空间或 Supabase 会话不可用')
  const {data,error:invokeError}=await supabase.functions.invoke('apify-actor-schema',{body:{workspace_id:workspace.id,channel_key:channel,...body}})
  if(invokeError||data?.error)throw new Error(data?.error||invokeError?.message||'Apify 请求失败')
  return data
 }
 const searchStore=async()=>{
  if(storeQuery.trim().length<2){setError('请输入至少 2 个字符的 Actor 名称或关键词');return}
  setStoreBusy(true);setError('');setMessage('');setStoreResults([])
  try{const data=await invoke({action:'search',search_query:storeQuery.trim()});setStoreResults((data.items||[]) as StoreActor[]);if(!data.items?.length)setMessage('没有找到匹配的 Actor，请调整关键词。')}
  catch(e){setError(e instanceof Error?e.message:'Apify Store 搜索失败')}
  finally{setStoreBusy(false)}
 }
 const addActor=async(id:string)=>{
  if(!id.trim())return
  setBusy(true);setError('');setMessage('')
  try{const data=await invoke({action:'schema',actor_id:id.trim()});setActorId('');setMessage(`已添加 ${data.actor_name}，读取到 ${Object.keys(data.input_schema?.properties||{}).length} 个输入字段。当前保持停用，完成测试和审核后再启用。`);setStoreResults([]);await load()}
  catch(e){setError(e instanceof Error?e.message:'读取 Actor Schema 失败')}
  finally{setBusy(false)}
 }
 const saveDefaults=async(row:Selection)=>{
  if(!supabase||!workspace)return
  let defaults:Record<string,unknown>
  try{defaults=parseDrafts(row.discovery_adapter_catalog.input_schema,inputDrafts[row.id]||{})}
  catch(e){setError(e instanceof Error?e.message:'参数格式错误');return}
  setBusy(true);setError('')
  const {error:updateError}=await supabase.from('workspace_adapter_selections').update({config:{...(row.config||{}),input_defaults:defaults},updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage('默认配置已保存。之后创建该渠道的搜索任务时会自动载入这些参数。')
  await load();setBusy(false)
 }
 const runTest=async(row:Selection)=>{
  if(!window.confirm('将使用当前测试参数真实启动一次 Apify Actor 运行。Apify 可能按该 Actor 的计费方式收费，是否继续？'))return
  let testInput:Record<string,unknown>
  try{testInput=parseDrafts(row.discovery_adapter_catalog.input_schema,testDrafts[row.id]||inputDrafts[row.id]||{})}
  catch(e){setError(e instanceof Error?e.message:'测试参数格式错误');return}
  setTestBusy(true);setError('');setMessage('')
  try{
   const data=await invoke({action:'test',actor_id:row.discovery_adapter_catalog.external_actor_id,test_input:testInput})
   const result={run_id:data.run_id||null,status:String(data.status||'UNKNOWN'),sample:Array.isArray(data.sample)?data.sample:[],items_count:typeof data.items_count==='number'?data.items_count:null}
   setTestResults(current=>({...current,[row.id]:result}))
   if(result.run_id)setReviewRunIds(current=>({...current,[row.id]:result.run_id||''}))
   setMessage(`测试运行已提交：${result.status}。Run ID 已填入审核表单；测试结果不会自动批准 Actor。`)
  }catch(e){setError(e instanceof Error?e.message:'Actor 测试失败')}
  finally{setTestBusy(false)}
 }
 const approveOutput=async(row:Selection)=>{
  if(!supabase||!workspace)return
  const types=reviewTypes[row.id]||[];const note=(reviewNotes[row.id]||'').trim();const sampleRunId=(reviewRunIds[row.id]||'').trim()
  if(!types.length){setError('请至少选择一种经过样本确认的客户记录类型。');return}
  if(note.length<12){setError('请记录你检查过的 Actor 返回样本及客户字段，至少 12 个字符。');return}
  if(!sampleRunId){setError('请先运行测试并填写 Run ID。');return}
  if(!window.confirm('请确认你已实际检查当前 Build 的返回样本，确认其输出是真实企业档案或联系人资料，而不是商品、帖子、评论或普通搜索结果。审核通过后该 Actor 将被开放执行。'))return
  setBusy(true);setError('');setMessage('')
  const {data,error:invokeError}=await supabase.functions.invoke('review-discovery-adapter',{body:{workspace_id:workspace.id,adapter_key:row.adapter_key,expected_version:row.discovery_adapter_catalog.adapter_version,action:'approve',supported_record_types:types,review_note:note,sample_run_id:sampleRunId}})
  if(invokeError||data?.error)setError(data?.error||invokeError?.message||'Actor 审核失败')
  else setMessage('Actor 客户输出审核通过。请确认工作空间启用开关后再用于搜索。')
  await load();setBusy(false)
 }
 const toggle=async(row:Selection)=>{
  if(!supabase||!workspace)return
  const catalog=row.discovery_adapter_catalog
  if(!row.is_enabled&&(catalog.verification_status!=='verified'||catalog.maintenance_status!=='maintained'||!Array.isArray(catalog.supported_record_types)||!catalog.supported_record_types.some(type=>type==='company'||type==='contact'))){setError('该 Actor 尚未通过客户资料输出审核或维护状态检查，不能启用。');return}
  setBusy(true);setError('')
  const {error:updateError}=await supabase.from('workspace_adapter_selections').update({is_enabled:!row.is_enabled,updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage(row.is_enabled?'Actor 已停用。':'Actor 已启用，可参与该渠道的搜索调度。')
  await load();setBusy(false)
 }
 const remove=async(row:Selection)=>{
  if(!supabase||!workspace||!window.confirm(`从当前工作空间移除“${row.discovery_adapter_catalog.adapter_name}”？全局 Actor Schema 和其他工作空间配置会保留。`))return
  setBusy(true);const {error:removeError}=await supabase.from('workspace_adapter_selections').delete().eq('id',row.id).eq('workspace_id',workspace.id)
  if(removeError)setError(removeError.message);else{setMessage('Actor 已从当前工作空间移除。');if(selectedId===row.id)setSelectedId('')}
  await load();setBusy(false)
 }
 const setField=(id:string,key:string,value:string|boolean,kind:'default'|'test')=>{
  const setter=kind==='default'?setInputDrafts:setTestDrafts
  setter(current=>({...current,[id]:{...(current[id]||inputDrafts[id]||{}),[key]:value}}))
 }
 const renderFields=(row:Selection,kind:'default'|'test')=>{
  const schema=row.discovery_adapter_catalog.input_schema||{};const values=kind==='default'?inputDrafts[row.id]||{}:testDrafts[row.id]||inputDrafts[row.id]||{}
  return <div className="odoo-actor-fields">{Object.entries(schema.properties||{}).map(([key,field])=>{
   const required=schema.required?.includes(key);const value=values[key]??''
   return <label className="odoo-actor-field" key={key}><span>{field.title||key}{required&&<i>*</i>}</span>
    {field.enum?.length?<select value={String(value)} onChange={e=>setField(row.id,key,e.target.value,kind)}><option value="">请选择</option>{field.enum.map(item=><option key={String(item)} value={String(item)}>{String(item)}</option>)}</select>
    :field.type==='boolean'?<span className="odoo-actor-switch"><input type="checkbox" checked={Boolean(value)} onChange={e=>setField(row.id,key,e.target.checked,kind)}/>启用</span>
    :field.type==='array'||field.type==='object'?<textarea rows={3} value={String(value)} onChange={e=>setField(row.id,key,e.target.value,kind)} placeholder={field.type==='array'?'[]':'{}'}/>
    :<input type={field.type==='integer'||field.type==='number'?'number':'text'} value={String(value)} onChange={e=>setField(row.id,key,e.target.value,kind)} placeholder={field.default===undefined?'':String(field.default)} />}
    <small>{field.description||`参数名：${key} · 类型：${field.type||'未指定'}`}</small>
   </label>
  })}</div>
 }
 const statusText=(row:Selection)=>row.discovery_adapter_catalog.verification_status==='verified'?'已审核':row.discovery_adapter_catalog.verification_status==='rejected'?'已拒绝':'待审核'
 return <div className="odoo-actor-manager">
  <header className="odoo-actor-topbar"><div><div className="odoo-actor-eyebrow">DATA SOURCES / APIFY</div><h2>Actor 配置</h2><p>按渠道管理采集 Actor、参数默认值、测试运行与客户输出审核。</p></div><button className="odoo-actor-refresh" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>刷新</button></header>
  <div className="odoo-actor-kpis"><div><span>已配置 Actor</span><b>{stats.all}</b></div><div><span>已审核</span><b>{stats.verified}</b></div><div><span>已启用</span><b>{stats.enabled}</b></div><div><span>待审核</span><b>{stats.pending}</b></div></div>
  {!canSync&&<div className="odoo-actor-alert"><AlertCircle size={16}/>请先在「系统集成」中保存 Apify API Token 并完成连接测试。搜索、读取 Schema 和测试运行均需要有效连接。</div>}
  <section className="odoo-actor-add">
   <div className="odoo-actor-section-title"><div><h3><Search size={16}/>搜索 Apify Actor</h3><p>先选择目标渠道，再从 Apify Store 搜索并添加 Actor。添加后默认停用。</p></div><span className="odoo-actor-muted-tag">渠道绑定：{channelName(channel)}</span></div>
   <div className="odoo-actor-add-grid"><label>搜索渠道<select value={channel} onChange={e=>{setChannel(e.target.value);setStoreResults([]);setSelectedId('')}}>{channelOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="odoo-actor-searchbox">Actor 名称 / 关键词<input value={storeQuery} onChange={e=>setStoreQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchStore()}} placeholder="例如 google maps scraper、linkedin leads"/></label><button disabled={!canSync||storeBusy||busy} onClick={()=>void searchStore()}><Search size={14}/>{storeBusy?'搜索中…':'搜索 Actor'}</button></div>
   <div className="odoo-actor-manual"><span>也可以直接输入 Actor ID</span><input value={actorId} onChange={e=>setActorId(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void addActor(actorId)}} placeholder="username/actor-name 或 username~actor-name"/><button disabled={!canSync||busy||!actorId.trim()} onClick={()=>void addActor(actorId)}><Plus size={14}/>读取 Schema 并添加</button></div>
   {storeResults.length>0&&<div className="odoo-actor-search-results"><div className="odoo-actor-results-head">搜索结果 <span>{storeResults.length} 个</span></div>{storeResults.map(item=><article key={item.id}><div><b>{item.name}</b><small>{item.id}</small><p>{item.description||'该 Actor 暂无简介'}</p>{item.url&&<a href={item.url} target="_blank" rel="noreferrer">查看 Store <ExternalLink size={11}/></a>}</div><button disabled={busy||!canSync||selections.some(row=>row.channel_key===channel&&row.discovery_adapter_catalog.external_actor_id.replace('/','~').toLowerCase()===item.id.toLowerCase())} onClick={()=>void addActor(item.id)}><Plus size={13}/>添加到{channelName(channel)}</button></article>)}</div>}
  </section>
  {(error||message)&&<div className={error?'odoo-actor-feedback error':'odoo-actor-feedback success'}>{error?<AlertCircle size={14}/>:<CheckCircle2 size={14}/>}<span>{error||message}</span><button onClick={()=>{setError('');setMessage('')}} aria-label="关闭"><X size={13}/></button></div>}
  <div className="odoo-actor-workspace">
   <aside className="odoo-actor-sidebar"><div className="odoo-actor-side-title"><Layers3 size={14}/>搜索渠道</div>{channelRows.map(row=><button key={row.key} className={channel===row.key?'active':''} onClick={()=>{setChannel(row.key);setSelectedId('')}}><span>{row.label}</span><small>{row.count}</small></button>)}<div className="odoo-actor-side-hint">选择渠道查看已绑定的 Actor。一个 Actor 可通过不同渠道配置分别绑定。</div></aside>
   <section className="odoo-actor-list-pane"><div className="odoo-actor-list-toolbar"><div><b>{channelName(channel)}</b><span>{visibleRows.length} 个 Actor</span></div><label><Search size={13}/><input value={listQuery} onChange={e=>setListQuery(e.target.value)} placeholder="筛选当前渠道"/></label></div>
    {loading?<div className="odoo-actor-empty">正在读取 Actor…</div>:visibleRows.length===0?<div className="odoo-actor-empty"><Database size={22}/><b>该渠道还没有 Actor</b><span>在上方搜索 Apify Store，添加适合此渠道的数据源。</span></div>:<div className="odoo-actor-list">{visibleRows.map(row=><button key={row.id} className={'odoo-actor-row '+(selectedId===row.id?'selected':'')} onClick={()=>{setSelectedId(row.id);setDetailTab('defaults')}}><span className="odoo-actor-row-icon"><Code2 size={16}/></span><span className="odoo-actor-row-main"><b>{row.discovery_adapter_catalog.adapter_name}</b><small>{row.discovery_adapter_catalog.external_actor_id}</small><em>{row.discovery_adapter_catalog.input_schema?.properties?Object.keys(row.discovery_adapter_catalog.input_schema.properties).length:0} 个参数 · Build {row.discovery_adapter_catalog.adapter_version}</em></span><span className={'odoo-actor-status '+(row.discovery_adapter_catalog.verification_status==='verified'?'verified':'pending')}>{statusText(row)}</span><span className={'odoo-actor-enabled '+(row.is_enabled?'on':'')}>{row.is_enabled?'启用':'停用'}</span><ChevronRight size={15}/></button>)}</div>}
   </section>
   <section className="odoo-actor-detail-pane">{selected?<><div className="odoo-actor-detail-head"><div><div className="odoo-actor-eyebrow">ACTOR DETAIL / {channelName(selected.channel_key)}</div><h3>{selected.discovery_adapter_catalog.adapter_name}</h3><p>{selected.discovery_adapter_catalog.external_actor_id} · Build {selected.discovery_adapter_catalog.adapter_version}</p></div><button className="odoo-actor-icon-button" onClick={()=>void remove(selected)} disabled={busy} title="移除 Actor"><Trash2 size={15}/></button></div>
    <div className="odoo-actor-detail-status"><span className={selected.discovery_adapter_catalog.verification_status==='verified'?'verified':'pending'}><ShieldCheck size={13}/>{statusText(selected)}</span><span className={selected.is_enabled?'enabled':'disabled'}><Activity size={13}/>{selected.is_enabled?'工作空间已启用':'工作空间已停用'}</span><button disabled={busy} onClick={()=>void toggle(selected)}><Power size={13}/>{selected.is_enabled?'停用':'启用'}</button></div>
    <nav className="odoo-actor-detail-tabs">{([['defaults','默认配置'],['test','测试运行'],['review','客户输出审核'],['schema','Schema 字段']] as [DetailTab,string][]).map(([key,label])=><button key={key} className={detailTab===key?'active':''} onClick={()=>setDetailTab(key)}>{label}</button>)}</nav>
    {detailTab==='defaults'&&<div className="odoo-actor-tab-content"><div className="odoo-actor-section-title"><div><h4>Actor 默认参数</h4><p>保存后，新建该渠道搜索任务会自动载入。任务中的临时修改不会覆盖这里的默认值。</p></div></div>{renderFields(selected,'default')}<div className="odoo-actor-form-footer"><span>{Object.keys(selected.discovery_adapter_catalog.input_schema?.properties||{}).length} 个 Schema 参数</span><button disabled={busy} onClick={()=>void saveDefaults(selected)}><Save size={14}/>保存默认配置</button></div></div>}
    {detailTab==='test'&&<div className="odoo-actor-tab-content"><div className="odoo-actor-test-warning"><AlertCircle size={14}/>测试会真实启动 Apify Actor，可能产生第三方费用。请先将测试数量、页数或结果上限设为较小值。</div><div className="odoo-actor-section-title"><div><h4>测试参数</h4><p>从默认配置复制一份测试参数。此处编辑不会修改已保存的默认配置。</p></div><button className="odoo-actor-secondary" onClick={()=>setTestDrafts(current=>({...current,[selected.id]:{...(inputDrafts[selected.id]||{})}}))}>恢复默认值</button></div>{renderFields(selected,'test')}<div className="odoo-actor-form-footer"><span>运行完成后自动读取最多 5 条样本</span><button disabled={testBusy||!canSync} onClick={()=>void runTest(selected)}><Play size={14}/>{testBusy?'正在运行…':'运行测试'}</button></div>{testResults[selected.id]&&<div className="odoo-actor-test-result"><div><b>最近一次测试</b><span className={testResults[selected.id].status==='SUCCEEDED'?'verified':'pending'}>{testResults[selected.id].status}</span></div><small>Run ID：{testResults[selected.id].run_id||'未返回'} · 样本：{testResults[selected.id].sample.length} 条</small><pre>{JSON.stringify(testResults[selected.id].sample,null,2)}</pre></div>}</div>}
    {detailTab==='review'&&<div className="odoo-actor-tab-content"><div className="odoo-actor-section-title"><div><h4>客户输出审核</h4><p>只有确认输出真实企业或联系人资料，才允许进入搜索任务。</p></div></div><div className="odoo-actor-review-status">当前状态：<b>{selected.discovery_adapter_catalog.verification_status}</b> · 维护：<b>{selected.discovery_adapter_catalog.maintenance_status}</b></div><div className="odoo-actor-review-types"><label><input type="checkbox" checked={(reviewTypes[selected.id]||[]).includes('company')} onChange={e=>setReviewTypes(current=>({...current,[selected.id]:e.target.checked?[...(current[selected.id]||[]),'company']:(current[selected.id]||[]).filter(type=>type!=='company')}))}/>企业档案</label><label><input type="checkbox" checked={(reviewTypes[selected.id]||[]).includes('contact')} onChange={e=>setReviewTypes(current=>({...current,[selected.id]:e.target.checked?[...(current[selected.id]||[]),'contact']:(current[selected.id]||[]).filter(type=>type!=='contact')}))}/>联系人档案</label></div><label className="odoo-actor-wide-field">测试 Run ID<input value={reviewRunIds[selected.id]||''} onChange={e=>setReviewRunIds(current=>({...current,[selected.id]:e.target.value}))} placeholder="运行测试后自动填入，也可粘贴 Apify Run ID"/></label><label className="odoo-actor-wide-field">审核备注<textarea rows={4} value={reviewNotes[selected.id]||''} onChange={e=>setReviewNotes(current=>({...current,[selected.id]:e.target.value}))} placeholder="说明样本中实际出现的企业 / 联系人字段，例如企业名称、官网、地址和公开电话。至少 12 个字符。"/></label><div className="odoo-actor-review-tip">请勿将商品、帖子、评论、视频或普通搜索片段误判为企业 / 联系人客户档案。</div><button className="odoo-actor-review-button" disabled={busy} onClick={()=>void approveOutput(selected)}><ShieldCheck size={14}/>{selected.discovery_adapter_catalog.verification_status==='verified'?'更新审核状态':'审核通过并开放 Actor'}</button></div>}
    {detailTab==='schema'&&<div className="odoo-actor-tab-content"><div className="odoo-actor-section-title"><div><h4>输入 Schema</h4><p>字段名保留 Actor 原始 key，表单标签优先显示 Schema title。</p></div></div><div className="odoo-actor-schema-list">{Object.entries(selected.discovery_adapter_catalog.input_schema?.properties||{}).map(([key,field])=><article key={key}><div><b>{field.title||key}</b>{selected.discovery_adapter_catalog.input_schema?.required?.includes(key)&&<i>必填</i>}</div><code>{key} · {field.type||'unknown'}{field.enum?.length?' · enum':''}</code><p>{field.description||'无字段说明'}</p>{Boolean(field.enum?.length)&&<small>可选值：{(field.enum||[]).map(String).join(' / ')}</small>}</article>)}</div></div>}
   </>:<div className="odoo-actor-empty"><Settings2 size={22}/><b>选择一个 Actor</b><span>从左侧列表选择 Actor，查看和编辑它的配置。</span></div>}</section>
  </div>
 </div>
}
