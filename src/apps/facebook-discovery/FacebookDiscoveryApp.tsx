import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Clock3, Database, ExternalLink, Loader2, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import './FacebookDiscoveryApp.css'

type SchemaField = { title?:string; description?:string; type?:string|string[]; editor?:string; default?:unknown; prefill?:unknown; example?:unknown; enum?:unknown[]; minimum?:number; maximum?:number; required?:string[]; items?:SchemaField }
type ActorSchema = { title?:string; properties?:Record<string,SchemaField>; required?:string[] }
type Mode = { id:string; title:string; actorValue:string; group:string; description:string; inputs:string[]; requiresCookies?:boolean; recommendedCookies?:boolean }
type RawRecord = { id:string; source_title:string|null; source_url:string|null; raw_payload:Record<string,unknown>; discovered_at:string; task_id:string|null }
type Task = { id:string; name:string; status:string; discovered_count:number; created_at:string; target_profile:Record<string,unknown> }

const ACTOR_ID='get-leads~all-in-one-facebook-scraper'
const MODES:Mode[]=[
 {id:'pages',title:'主页发现',actorValue:'facebook-pages-scraper',group:'客户与企业发现',description:'发现企业主页，获取类别、粉丝、官网和公开商务联系方式。',inputs:['pages','searchQueries','locations','resultsPerPage','minFollowers','verifiedOnly','minReviewCount','includeTransparency','includeWebsiteEnrichment']},
 {id:'search',title:'关键词搜索',actorValue:'facebook-search-scraper',group:'客户与企业发现',description:'按行业、产品和地区关键词发现 Facebook 企业主页。',inputs:['searchQueries','resultsPerPage','loginCookies'],requiresCookies:true},
 {id:'posts',title:'帖子采集',actorValue:'facebook-posts-scraper',group:'内容与互动信号',description:'抓取主页帖子、发布时间、互动数据和内容。',inputs:['pages','resultsPerPage','loginCookies'],recommendedCookies:true},
 {id:'groups',title:'社群发现',actorValue:'facebook-groups-scraper',group:'内容与互动信号',description:'采集公开群组中的帖子、作者和互动信息。',inputs:['groupUrls','resultsPerPage','loginCookies'],requiresCookies:true},
 {id:'comments',title:'评论与用户互动',actorValue:'facebook-comments-scraper',group:'内容与互动信号',description:'采集评论文本、评论者公开资料和互动信息。',inputs:['pages','resultsPerPage','loginCookies','includeNestedComments','enrichCommentLikes'],requiresCookies:true},
 {id:'reviews',title:'评价与口碑',actorValue:'facebook-reviews-scraper',group:'内容与互动信号',description:'采集主页评价、推荐状态和评价者信息。',inputs:['pages','resultsPerPage','loginCookies'],requiresCookies:true},
 {id:'events',title:'活动发现',actorValue:'facebook-events-scraper',group:'商业机会与商品',description:'发现活动名称、组织者、时间、地点和响应人数。',inputs:['pages','eventSearchQueries','resultsPerPage']},
 {id:'marketplace',title:'Marketplace 商品',actorValue:'facebook-marketplace-scraper',group:'商业机会与商品',description:'搜索商品列表、价格、卖家和商品地区。',inputs:['marketplaceQueries','marketplaceLocation','resultsPerPage','loginCookies']},
 {id:'reels',title:'Reels 短视频',actorValue:'facebook-reels-scraper',group:'商业机会与商品',description:'采集短视频文案、作者、发布时间和互动数。',inputs:['pages','resultsPerPage','loginCookies'],requiresCookies:true},
 {id:'ads',title:'广告情报',actorValue:'facebook-ads-scraper',group:'商业机会与商品',description:'分析 Meta 广告素材、广告主、投放日期和目标地区。',inputs:['searchQueries','pages','resultsPerPage','loginCookies'],requiresCookies:true},
 {id:'all-in-one',title:'多模式组合采集',actorValue:'facebook-scraper',group:'组合采集',description:'一次运行组合多个发现入口。建议先从单模式小批量开始。',inputs:['pages','searchQueries','locations','groupUrls','eventSearchQueries','marketplaceQueries','marketplaceLocation','resultsPerPage','loginCookies'],requiresCookies:true},
 {id:'data-extractor',title:'轻量数据提取',actorValue:'facebook-data-extractor',group:'组合采集',description:'使用 Actor 的轻量数据提取模式，字段以实际 Schema 为准。',inputs:['pages','searchQueries','locations','groupUrls','eventSearchQueries','marketplaceQueries','marketplaceLocation','resultsPerPage','loginCookies']}
]
const FIELD_LABELS:Record<string,string>={scrapeMode:'采集模式',pages:'Facebook 主页 / 页面',searchQueries:'搜索关键词',locations:'国家 / 城市',groupUrls:'Facebook 群组链接',eventSearchQueries:'活动关键词',marketplaceQueries:'商品关键词',marketplaceLocation:'商品所在地区',resultsPerPage:'每个入口最多抓取数量',loginCookies:'Facebook 登录 Cookie',includeNestedComments:'包含评论回复',enrichCommentLikes:'补充评论点赞数',minFollowers:'最低粉丝数',verifiedOnly:'仅认证主页',minReviewCount:'最低评价数量',includeTransparency:'获取主页透明度信息',includeWebsiteEnrichment:'补充官网联系方式',facebookAppToken:'Meta Graph API Token'}
const FIELD_HELP:Record<string,string>={pages:'填写主页名称、@用户名或 Facebook 主页链接；每行一项。',searchQueries:'填写行业、产品、服务或目标客户关键词；每行一项。',locations:'填写城市、州/省或国家；每行一项。',groupUrls:'粘贴你有权访问的公开群组链接；每行一项。',eventSearchQueries:'填写活动主题或活动关键词；每行一项。',marketplaceQueries:'填写想搜索的商品关键词；每行一项。',marketplaceLocation:'填写 Marketplace 地区标识或城市名称，按 Actor Schema 的要求。',resultsPerPage:'建议先选 20 或 50 验证结果，再提高数量。最多 500 条 / 输入。',loginCookies:'仅在需要登录的模式使用。系统通过 Supabase Vault 加密保存，仅在启动 Actor 时短暂读取，不写入任务参数或日志。',facebookAppToken:'仅用于 Meta 广告透明度扩展字段；不是 Facebook 登录 Cookie。请勿在不需要时填写。'}
const COOKIE_MODES=new Set(MODES.filter(m=>m.requiresCookies).map(m=>m.id))
const asType=(field:SchemaField)=>Array.isArray(field.type)?field.type.find(t=>t!=='null')||'string':field.type||'string'
const empty=(v:unknown)=>v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0)
const stringify=(v:unknown)=>typeof v==='string'?v:JSON.stringify(v)
const defaultFor=(field:SchemaField)=>field.default??field.prefill??(asType(field)==='boolean'?false:asType(field)==='array'?[]:asType(field)==='integer'||asType(field)==='number'?'': '')
const modeGroups=[...new Set(MODES.map(m=>m.group))]

export default function FacebookDiscoveryApp({ onOpenPersonalSearch }: { onOpenPersonalSearch: () => void }) {
 const {user,workspace}=useAuth()
 const [tab,setTab]=useState<'wizard'|'tasks'|'results'>('wizard')
 const [step,setStep]=useState(1)
 const [modeId,setModeId]=useState('pages')
 const [schema,setSchema]=useState<ActorSchema|null>(null)
 const [adapterKey,setAdapterKey]=useState('')
 const [schemaBusy,setSchemaBusy]=useState(false)
 const [schemaError,setSchemaError]=useState('')
 const [values,setValues]=useState<Record<string,unknown>>({})
 const [cookieValue,setCookieValue]=useState('')
 const [maxCost,setMaxCost]=useState('5')
 const [taskName,setTaskName]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [records,setRecords]=useState<RawRecord[]>([])
 const [tasks,setTasks]=useState<Task[]>([])
 const [dataBusy,setDataBusy]=useState(false)
 const [dataError,setDataError]=useState('')
 const [selectedRecord,setSelectedRecord]=useState<RawRecord|null>(null)
 const [showAdvanced,setShowAdvanced]=useState(false)
 const mode=MODES.find(m=>m.id===modeId)||MODES[0]
 const props=schema?.properties||{}
 const required=new Set(schema?.required||[])
 const visibleKeys=useMemo(()=>{
  const allowed=new Set(mode.inputs)
  const keys=Object.keys(props).filter(key=>allowed.has(key)||required.has(key)||key==='scrapeMode')
  return keys
 },[schema,modeId])
 const advancedKeys=useMemo(()=>Object.keys(props).filter(key=>!visibleKeys.includes(key)&&key!=='facebookAppToken'),[schema,visibleKeys])
 const actorModeValue=useMemo(()=>{
  const field=props.scrapeMode
  if(!field)return mode.actorValue
  const options=field.enum||[]
  const match=options.find(v=>String(v)===mode.actorValue)||options.find(v=>String(v).toLowerCase().includes(mode.id.replace('-','')))
  return match===undefined?mode.actorValue:match
 },[schema,modeId])
 const missingRequired=useMemo(()=>[...required].filter(key=>key!=='loginCookies'&&empty(values[key])&&key!=='scrapeMode'),[schema,values])
 const hasModeInput=mode.inputs.some(key=>key!=='loginCookies'&&key!=='facebookAppToken'&&Object.prototype.hasOwnProperty.call(props,key))
 const needsCookie=mode.requiresCookies||required.has('loginCookies')
 const cookieReady=!needsCookie||cookieValue.trim().length>0
 const schemaReady=Boolean(schema&&props.scrapeMode&&hasModeInput)
 const resultColumns=useMemo(()=>{
  const keys=new Set<string>()
  records.slice(0,30).forEach(record=>Object.keys(record.raw_payload||{}).forEach(key=>keys.add(key)))
  return [...keys].filter(key=>!['__metadata','_meta'].includes(key)).slice(0,8)
 },[records])

 const loadSchema=async()=>{
  if(!supabase||!workspace?.id){setSchemaError('请先登录并选择工作空间。');return}
  setSchemaBusy(true);setSchemaError('');setNotice('')
  try{
   const {data,error:invokeError}=await supabase.functions.invoke('apify-actor-schema',{body:{workspace_id:workspace.id,actor_id:ACTOR_ID,channel_key:'facebook',supported_record_types:['company'],raw_results_only:true}})
   if(invokeError||data?.error)throw new Error(data?.error||invokeError?.message||'读取 Actor Schema 失败')
   const next=data?.input_schema as ActorSchema
   if(!next?.properties||!Object.keys(next.properties).length)throw new Error('Actor 没有返回可用的输入 Schema。')
   setSchema(next);setAdapterKey(String(data.adapter_key||''));setValues(Object.fromEntries(Object.entries(next.properties).map(([key,field])=>[key,defaultFor(field)])))
   setNotice('已读取 '+String(data.version||'最新构建')+' 的真实 Schema。所有输入字段均以 Actor 返回的字段名和类型为准。')
  }catch(e){setSchemaError(e instanceof Error?e.message:'读取 Actor Schema 失败')}
  finally{setSchemaBusy(false)}
 }
 useEffect(()=>{if(workspace?.id)void loadSchema()},[workspace?.id])
 useEffect(()=>{setValues(current=>({...current,scrapeMode:actorModeValue}));setCookieValue('');setError('');setNotice('')},[modeId,actorModeValue])
 const chooseMode=(id:string)=>{setModeId(id);setTab('wizard');setError('')}
 const setField=(key:string,value:unknown)=>setValues(current=>({...current,[key]:value}))
 const actorInput=()=>{
  const input:Record<string,unknown>={}
  for(const key of Object.keys(props)){
   if(key==='loginCookies'||key==='facebookAppToken')continue
   const value=values[key]
   if(value!==undefined&&!empty(value))input[key]=value
   else if(required.has(key))input[key]=value
  }
  if(props.scrapeMode)input.scrapeMode=actorModeValue
  return input
 }
 const validate=()=>{
  if(!schemaReady)return 'Actor Schema 尚未完整加载，请刷新 Schema。'
  const modeField=props.scrapeMode
  if(modeField?.enum?.length&&!modeField.enum.some(option=>String(option)===String(actorModeValue)))return '当前 Actor Schema 暂不支持「'+mode.title+'」模式，请刷新 Schema 或选择其他模式。'
  for(const [key,field] of Object.entries(props)){const value=values[key];if(empty(value))continue;const type=asType(field);if((type==='integer'||type==='number')&&(!Number.isFinite(Number(value))||(type==='integer'&&!Number.isInteger(Number(value)))))return (FIELD_LABELS[key]||field.title||key)+' 必须填写有效数值。';if((type==='integer'||type==='number')&&field.minimum!==undefined&&Number(value)<field.minimum)return (FIELD_LABELS[key]||field.title||key)+' 不能小于 '+field.minimum+'。';if((type==='integer'||type==='number')&&field.maximum!==undefined&&Number(value)>field.maximum)return (FIELD_LABELS[key]||field.title||key)+' 不能大于 '+field.maximum+'。';if(field.enum?.length&&!field.enum.some(option=>String(option)===String(value)))return (FIELD_LABELS[key]||field.title||key)+' 不是有效选项。'}
  if(missingRequired.length)return '请补充必填项：'+missingRequired.map(k=>FIELD_LABELS[k]||props[k]?.title||k).join('、')
  if(!cookieReady)return '当前模式需要 Facebook 登录 Cookie。'\n  if(cookieValue.trim()&&(!/c_user\\s*=/.test(cookieValue)||!/xs\\s*=/.test(cookieValue)))return 'Cookie 格式不完整，请同时提供 c_user 和 xs。'
  if(!Number.isFinite(Number(maxCost))||Number(maxCost)<=0)return '请设置大于 0 的单次费用上限。'
  if(modeId==='pages'&&empty(values.pages)&&empty(values.searchQueries))return '主页链接或搜索关键词至少填写一项。'
  if(modeId==='search'&&empty(values.searchQueries))return '请填写至少一个搜索关键词。'
  if(modeId==='groups'&&empty(values.groupUrls))return '请填写至少一个群组链接。'
  if(modeId==='marketplace'&&empty(values.marketplaceQueries))return '请填写至少一个商品关键词。'
  return ''
 }
 const startScrape=async()=>{
  const issue=validate();if(issue){setError(issue);setStep(2);return}
  if(!supabase||!workspace?.id||!user?.id){setError('登录状态或工作空间不可用，请重新登录。');return}
  setBusy(true);setError('');setNotice('')
  let cookieSecretId:string|null=null
  try{
   if(cookieValue.trim()){
    const {data:secretId,error:secretError}=await supabase.rpc('integration_secret_create',{p_secret:cookieValue.trim(),p_name:'Facebook Actor Cookie · '+mode.id,p_description:'仅供本次 Facebook Actor 抓取启动时使用'})
    if(secretError||!secretId)throw new Error(secretError?.message||'Cookie 加密保存失败')
    cookieSecretId=String(secretId)
   }
   const input=actorInput()
   const taskTitle=taskName.trim()||'Facebook '+mode.title+' · '+new Date().toLocaleString()
   const profile={criteria:taskTitle,source_channel:'facebook',provider_key:'apify',actor_id:ACTOR_ID,adapter_key:adapterKey,actor_input:input,actor_input_schema:schema,actor_schema_hash:'runtime-schema',raw_results_only:true,facebook_cookie_secret_ref:cookieSecretId,max_cost:Number(maxCost),mode_id:modeId,mode_title:mode.title}
   const {data:task,error:taskError}=await supabase.from('lead_search_tasks').insert({workspace_id:workspace.id,created_by:user.id,name:taskTitle,status:'draft',target_profile:profile,selected_channels:['facebook'],target_count:Number(values.resultsPerPage||50)}).select('id').single()
   if(taskError)throw new Error(taskError.message)
   const {data:queued,error:queueError}=await supabase.functions.invoke('enqueue-lead-search',{body:{workspace_id:workspace.id,task_id:task.id,confirm_cost:true}})
   if(queueError||queued?.error)throw new Error(queued?.error||queueError?.message||'任务进入队列失败')
   setCookieValue('');setNotice('抓取任务已成功启动。完成后可在「抓取结果」查看 Actor 原始返回记录。');setTab('wizard');setStep(4);await refreshData()
  }catch(e){
   if(cookieSecretId)await supabase.rpc('integration_secret_delete',{p_secret_id:cookieSecretId})
   setError(e instanceof Error?e.message:'启动抓取失败')
  }finally{setBusy(false)}
 }
 const refreshData=async()=>{
  if(!supabase||!workspace?.id)return
  setDataBusy(true);setDataError('')
  try{
   const [recordResult,taskResult]=await Promise.all([
    supabase.from('lead_source_records').select('id,source_title,source_url,raw_payload,discovered_at,task_id').eq('workspace_id',workspace.id).eq('channel_key','facebook').order('discovered_at',{ascending:false}).limit(300),
    supabase.from('lead_search_tasks').select('id,name,status,discovered_count,created_at,target_profile').eq('workspace_id',workspace.id).contains('selected_channels',['facebook']).order('created_at',{ascending:false}).limit(100)
   ])
   if(recordResult.error)throw recordResult.error
   if(taskResult.error)throw taskResult.error
   setRecords((recordResult.data||[]) as RawRecord[]);setTasks((taskResult.data||[]) as Task[])
  }catch(e){setDataError(e instanceof Error?e.message:'读取抓取结果失败')}
  finally{setDataBusy(false)}
 }
 useEffect(()=>{void refreshData()},[workspace?.id])
 const fieldControl=(key:string,field:SchemaField)=>{
  const type=asType(field);const value=values[key]??defaultFor(field);const requiredField=required.has(key)
  const label=FIELD_LABELS[key]||field.title||key
  if(key==='loginCookies')return <label className="fb-field" key={key}><span>{label}{requiredField?' * 必填':' · 需要登录的模式'}</span><textarea rows={3} value={cookieValue} onChange={e=>setCookieValue(e.target.value)} placeholder="c_user=...; xs=..."/><small>{FIELD_HELP[key]}</small></label>
  if(key==='facebookAppToken')return <label className="fb-field" key={key}><span>{label}（可选）</span><input type="password" autoComplete="off" value={String(values[key]||'')} onChange={e=>setField(key,e.target.value)} placeholder="不需要广告透明度扩展字段时留空"/><small>{FIELD_HELP[key]}</small></label>
  if(field.enum?.length)return <label className="fb-field" key={key}><span>{label}{requiredField?' * 必填':''}</span><select value={String(value??'')} onChange={e=>setField(key,e.target.value)}><option value="">请选择</option>{field.enum.map(option=><option key={String(option)} value={String(option)}>{String(option)}</option>)}</select><small>{field.description||FIELD_HELP[key]||'根据 Actor Schema 选择一个选项。'}</small></label>
  if(type==='boolean')return <label className="fb-field fb-toggle" key={key}><span><b>{label}{requiredField?' * 必填':''}</b><small>{field.description||'开启或关闭此项功能。'}</small></span><input type="checkbox" checked={Boolean(value)} onChange={e=>setField(key,e.target.checked)}/></label>
  if(type==='integer'||type==='number'){
   const presets=key==='resultsPerPage'?[10,20,50,100,200,500].filter(n=>(field.minimum===undefined||n>=field.minimum)&&(field.maximum===undefined||n<=field.maximum)):[]
   return <label className="fb-field" key={key}><span>{label}{requiredField?' * 必填':''}</span>{presets.length?<select value={String(value||50)} onChange={e=>setField(key,Number(e.target.value))}>{presets.map(n=><option key={n} value={n}>{n} 条</option>)}</select>:<input type="number" min={field.minimum} max={field.maximum} value={String(value)} onChange={e=>setField(key,e.target.value===''?'':Number(e.target.value))}/>}<small>{field.description||FIELD_HELP[key]||'按 Schema 限制设置数值。'}{field.minimum!==undefined?' 最小值 '+field.minimum+'.':''}{field.maximum!==undefined?' 最大值 '+field.maximum+'.':''}</small></label>
  }
  if(type==='array'||field.editor==='stringList'||key==='pages'||key==='searchQueries'||key==='groupUrls'||key==='eventSearchQueries'||key==='marketplaceQueries'||key==='locations'){
   const list=Array.isArray(value)?value:[]
   return <label className="fb-field" key={key}><span>{label}{requiredField?' * 必填':''}</span><textarea rows={3} value={list.map(String).join('\n')} onChange={e=>setField(key,e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))} placeholder={key==='pages'?'每行填写一个 Facebook 主页名称或链接':key==='groupUrls'?'每行粘贴一个公开群组链接':'每行填写一项'}/><small>{field.description||FIELD_HELP[key]||'每行填写一项，系统会按 Actor 要求转换为数组。'}</small></label>
  }
  return <label className="fb-field" key={key}><span>{label}{requiredField?' * 必填':''}</span><input value={String(value??'')} onChange={e=>setField(key,e.target.value)} placeholder={field.example!==undefined?String(field.example):'请输入'+label}/><small>{field.description||FIELD_HELP[key]||'按 Actor Schema 的字段说明填写。'}</small></label>
 }
 return <div className="fb-app">
  <aside className="fb-side"><div className="fb-brand"><b>f</b><span><strong>Facebook</strong><small>运维和发现</small></span></div><label>FACEBOOK 工作区</label><button className={tab==='wizard'?'fb-side-active':''} onClick={()=>setTab('wizard')}>⌕　新建抓取</button><button className={tab==='tasks'?'fb-side-active':''} onClick={()=>setTab('tasks')}>◷　抓取任务</button><button className={tab==='results'?'fb-side-active':''} onClick={()=>setTab('results')}>▤　抓取结果</button><p>仅采集公开可见内容或账号有权访问的数据。登录 Cookie 使用 Vault 安全保存，不写入抓取结果。</p></aside>
  <main className="fb-main">
   <header><div><small>FACEBOOK DATA WORKSPACE</small><h1>{tab==='wizard'?'新建 Facebook 抓取':tab==='tasks'?'抓取任务':'抓取结果'}</h1><p>先选择目标，再根据 Actor 最新 Schema 自动生成简洁表单。</p></div><div className="fb-head-actions"><a href="https://apify.com/get-leads/all-in-one-facebook-scraper" target="_blank" rel="noreferrer">Actor 文档 <ExternalLink size={13}/></a><button onClick={()=>void loadSchema()} disabled={schemaBusy}><RefreshCw size={14}/> 刷新 Schema</button></div></header>
   <div className="fb-toolbar"><button className={tab==='wizard'?'active':''} onClick={()=>setTab('wizard')}>创建抓取</button><button className={tab==='tasks'?'active':''} onClick={()=>{setTab('tasks');void refreshData()}}>抓取任务</button><button className={tab==='results'?'active':''} onClick={()=>{setTab('results');void refreshData()}}>抓取结果</button><span>{schemaBusy?<><Loader2 size={13}/> 正在读取 Actor Schema</>:schema?'Schema 已同步 · '+Object.keys(props).length+' 个字段':'等待 Schema'}</span></div>
   {schemaError&&<div className="fb-alert error">{schemaError}</div>}{notice&&<div className="fb-alert success">{notice}</div>}{error&&<div className="fb-alert error">{error}</div>}
   {tab==='wizard'&&<><div className="fb-stepper">{['选择模式','填写条件','确认启动','结果汇总'].map((label,index)=><button key={label} className={step===index+1?'current':step>index+1?'done':''} onClick={()=>{if(index===0)setStep(1);else if(index===1&&schema)setStep(2);else if(index===2&&schema)setStep(3);else if(index===3)setTab('tasks')}}><i>{step>index+1?<Check size={14}/>:index+1}</i><span>{label}</span></button>)}</div>
    {step===1&&<section className="fb-card"><div className="fb-section-head"><div><h2>你想发现哪类 Facebook 数据？</h2><p>选择一种抓取模式，系统将自动筛选对应字段。</p></div><span>{MODES.length} 种能力</span></div>{modeGroups.map(group=><div className="fb-mode-group" key={group}><h3>{group}</h3><div className="fb-mode-grid">{MODES.filter(m=>m.group===group).map(item=><button key={item.id} className={modeId===item.id?'selected':''} onClick={()=>chooseMode(item.id)}><b>{item.title}</b><small>{item.description}</small><span>{item.requiresCookies?'需要登录 Cookie':item.recommendedCookies?'建议登录 Cookie':'公开数据模式'}</span></button>)}</div></div>)}<div className="fb-step-footer"><button className="fb-secondary" onClick={onOpenPersonalSearch}>个人用户资料搜索 <ArrowRight size={14}/></button><button className="fb-primary" onClick={()=>setStep(2)} disabled={!schema}>下一步：填写条件 <ArrowRight size={15}/></button></div></section>}
    {step===2&&<section className="fb-card"><div className="fb-section-head"><div><h2>填写{mode.title}条件</h2><p>{mode.description}</p></div><span>{mode.requiresCookies?'需要登录':'无需登录'}</span></div>{!schema?<div className="fb-loading"><Loader2 size={16}/> 正在获取真实 Actor Schema…</div>:<><div className="fb-schema-meta"><ShieldCheck size={15}/> 已读取 Actor 最新构建 Schema · {Object.keys(props).length} 个参数 · 必填项自动校验</div><div className="fb-fields">{visibleKeys.filter(k=>k!=='scrapeMode'&&props[k]).map(key=>fieldControl(key,props[key]))}</div>{advancedKeys.length>0&&<div className="fb-advanced"><button onClick={()=>setShowAdvanced(v=>!v)}>{showAdvanced?'收起高级参数':'显示高级参数（'+advancedKeys.length+' 项）'} <ChevronDown size={14}/></button>{showAdvanced&&<div className="fb-fields">{advancedKeys.map(key=>fieldControl(key,props[key]))}</div>}</div>}<label className="fb-field fb-task-name"><span>任务名称（可选）</span><input value={taskName} onChange={e=>setTaskName(e.target.value)} placeholder={'Facebook '+mode.title}/></label><label className="fb-field fb-task-name"><span>单次费用上限（美元）</span><select value={maxCost} onChange={e=>setMaxCost(e.target.value)}>{['1','3','5','10','20','50'].map(v=><option key={v} value={v}>US$ {v}</option>)}</select><small>实际费用由 Apify 按 Actor 定价和返回结果结算；系统会尽可能按上限控制可计费结果量。</small></label></>}<div className="fb-step-footer"><button className="fb-secondary" onClick={()=>setStep(1)}><ArrowLeft size={14}/> 上一步</button><button className="fb-primary" onClick={()=>{const issue=validate();if(issue)setError(issue);else{setError('');setStep(3)}}} disabled={!schema||schemaBusy}>下一步：确认任务 <ArrowRight size={15}/></button></div></section>}
    {step===4&&<section className="fb-card"><div className="fb-section-head"><div><h2>抓取任务已启动</h2><p>Actor 已接收任务，系统正在等待结果并自动保存原始记录。</p></div><span>执行中</span></div><div className="fb-result-summary"><div><b>{tasks[0]?.status==='completed'?'已完成':tasks[0]?.status==='failed'?'失败':'进行中'}</b><span>任务状态</span></div><div><b>{tasks[0]?.discovered_count||0}</b><span>任务已发现记录</span></div><div><b>{records.filter(record=>record.task_id===tasks[0]?.id).length}</b><span>已加载原始结果</span></div></div><div className="fb-cost-warning">无需停留在此页面等待。任务将在后台继续运行；完成后可以在抓取结果中查看 Actor 实际返回的全部字段。</div><div className="fb-step-footer"><button className="fb-secondary" onClick={()=>{setTab('tasks');void refreshData()}}>查看任务状态 <ArrowRight size={14}/></button><button className="fb-primary" onClick={()=>{setTab('results');void refreshData()}}>查看抓取结果 <ArrowRight size={15}/></button></div></section>}
    {step===3&&<section className="fb-card"><div className="fb-section-head"><div><h2>确认抓取任务</h2><p>检查模式、目标范围和费用上限。点击开始后才会调用 Apify Actor。</p></div><span>启动前确认</span></div><div className="fb-confirm-list"><div><span>抓取模式</span><b>{mode.title}</b></div><div><span>Actor</span><b>{ACTOR_ID}</b></div><div><span>Schema 字段</span><b>{Object.keys(actorInput()).length} 项有效参数</b></div><div><span>结果上限</span><b>{String(values.resultsPerPage||50)} 条 / 输入</b></div><div><span>登录 Cookie</span><b>{cookieValue.trim()?'已安全保存后注入':needsCookie?'尚未提供':'不需要'}</b></div><div><span>费用上限</span><b>US$ {maxCost}</b></div></div><details className="fb-json-preview"><summary>查看最终提交参数（不包含 Cookie）</summary><pre>{JSON.stringify(actorInput(),null,2)}</pre></details><div className="fb-cost-warning">Actor 按实际返回结果收费；费用上限为执行控制值，不代表固定报价。不要提交你无权访问的数据。</div><div className="fb-step-footer"><button className="fb-secondary" onClick={()=>setStep(2)}><ArrowLeft size={14}/> 修改参数</button><button className="fb-primary" onClick={()=>void startScrape()} disabled={busy||!schemaReady}>{busy?<><Loader2 size={15}/> 正在创建任务…</>:<><Play size={15}/> 确认并开始抓取</>}</button></div></section>}</>}
   {tab==='tasks'&&<section className="fb-card"><div className="fb-section-head"><div><h2>Facebook 抓取任务</h2><p>查看运行状态、采集数量和任务配置。</p></div><button className="fb-refresh" onClick={()=>void refreshData()} disabled={dataBusy}><RefreshCw size={14}/> 刷新</button></div>{dataBusy?<div className="fb-loading"><Loader2 size={16}/> 正在加载任务…</div>:dataError?<div className="fb-alert error">{dataError}</div>:tasks.length===0?<div className="fb-empty"><Database size={28}/><b>暂无抓取任务</b><span>创建第一个 Facebook 发现任务后会显示在这里。</span></div>:<div className="fb-task-list">{tasks.map(task=><button key={task.id} onClick={()=>{setTab('results');void refreshData()}}><div><b>{task.name}</b><small>{String(task.target_profile?.mode_title||'Facebook')} · {new Date(task.created_at).toLocaleString()}</small></div><span className={'fb-status '+task.status}>{task.status==='completed'?'已完成':task.status==='running'||task.status==='queued'?'执行中':task.status==='failed'?'失败':task.status}</span><strong>{task.discovered_count||0} 条结果</strong></button>)}</div>}</section>}
   {tab==='results'&&<section className="fb-card"><div className="fb-section-head"><div><h2>抓取结果汇总</h2><p>按 Actor 实际返回字段动态展示，不要求结果必须匹配联系人或企业字段。</p></div><button className="fb-refresh" onClick={()=>void refreshData()} disabled={dataBusy}><RefreshCw size={14}/> 刷新</button></div>{dataBusy?<div className="fb-loading"><Loader2 size={16}/> 正在加载原始结果…</div>:dataError?<div className="fb-alert error">{dataError}</div>:records.length===0?<div className="fb-empty"><Database size={28}/><b>暂时没有抓取结果</b><span>任务完成后，Actor 的原始记录会显示在这里。</span></div>:<><div className="fb-result-summary"><div><b>{records.length}</b><span>已加载记录</span></div><div><b>{tasks.filter(t=>t.status==='completed').length}</b><span>已完成任务</span></div><div><b>{resultColumns.length}</b><span>动态数据字段</span></div></div><div className="fb-table-wrap"><table className="fb-result-table"><thead><tr><th>记录</th>{resultColumns.map(key=><th key={key}>{FIELD_LABELS[key]||key}</th>)}<th>采集时间</th></tr></thead><tbody>{records.map(record=><tr key={record.id} onClick={()=>setSelectedRecord(record)}><td><b>{record.source_title||'未命名记录'}</b><small>{record.source_url||record.id}</small></td>{resultColumns.map(key=><td key={key}>{typeof record.raw_payload?.[key]==='object'?JSON.stringify(record.raw_payload[key]):String(record.raw_payload?.[key]??'—')}</td>)}<td>{new Date(record.discovered_at).toLocaleString()}</td></tr>)}</tbody></table></div></>}</section>}
   {selectedRecord&&<div className="fb-modal-backdrop" onClick={()=>setSelectedRecord(null)}><section className="fb-record-modal" onClick={e=>e.stopPropagation()}><div><b>{selectedRecord.source_title||'Actor 原始记录'}</b><button onClick={()=>setSelectedRecord(null)}>关闭</button></div>{selectedRecord.source_url&&<a href={selectedRecord.source_url} target="_blank" rel="noreferrer">{selectedRecord.source_url}</a>}<pre>{JSON.stringify(selectedRecord.raw_payload,null,2)}</pre></section></div>}
  </main>
 </div>
}
