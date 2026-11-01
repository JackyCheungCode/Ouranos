import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Code2, Database, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type SchemaProperty={type?:string;title?:string;description?:string;default?:unknown;enum?:unknown[];editor?:string}
type ActorSchema={title?:string;description?:string;properties?:Record<string,SchemaProperty>;required?:string[]}
type Selection={id:string;adapter_key:string;channel_key:string;is_enabled:boolean;priority:number;config:Record<string,unknown>;discovery_adapter_catalog:{adapter_name:string;external_actor_id:string;adapter_version:string;input_schema:ActorSchema;output_schema:Record<string,unknown>;verification_status:string}}
const channelOptions=[['linkedin','LinkedIn'],['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['x','X'],['pinterest','Pinterest'],['reddit','Reddit'],['threads','Threads'],['telegram','Telegram'],['vk','VK'],['google-search','Google Search'],['google-maps','Google Maps'],['bing','Microsoft Bing'],['yandex','Yandex'],['baidu','百度'],['naver','Naver'],['yelp','Yelp'],['apple-maps','Apple Maps'],['alibaba','Alibaba.com'],['made-in-china','Made-in-China'],['globalsources','Global Sources'],['tradekey','TradeKey'],['ec21','EC21'],['kompass','Kompass'],['europages','Europages'],['thomasnet','Thomasnet'],['indiamart','IndiaMART'],['1688','1688'],['amazon','Amazon'],['ebay','eBay'],['walmart','Walmart'],['etsy','Etsy'],['shopify','Shopify'],['aliexpress','AliExpress'],['temu','Temu'],['tiktok-shop','TikTok Shop'],['shopee','Shopee'],['lazada','Lazada'],['mercadolibre','Mercado Libre'],['company-sites','企业官方网站'],['directories','企业黄页 / 商业目录'],['news','新闻与媒体网站'],['job-sites','招聘网站'],['whois','域名 / DNS 信息'],['review-sites','评价 / 点评网站'],['trade-records','进出口 / 海关数据'],['company-registry','企业注册信息'],['business-data','商业数据库 / 信用信息'],['exhibitors','展会 / 参展商名录']]
export default function ApifyActorManager({canSync}:{canSync:boolean}){
 const {workspace}=useAuth()
 const [channel,setChannel]=useState('google-maps')
 const [actorId,setActorId]=useState('')
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [selections,setSelections]=useState<Selection[]>([])
 const [mappingDrafts,setMappingDrafts]=useState<Record<string,string>>({})
 const [inputDrafts,setInputDrafts]=useState<Record<string,Record<string,string|boolean>>>({})
 const [inputMappingDrafts,setInputMappingDrafts]=useState<Record<string,string>>({})
 const load=async()=>{
  if(!supabase||!workspace)return
  setLoading(true);setError('')
  const {data,error:queryError}=await supabase.from('workspace_adapter_selections')
   .select('id,adapter_key,channel_key,is_enabled,priority,config,discovery_adapter_catalog!inner(adapter_name,external_actor_id,adapter_version,input_schema,output_schema,verification_status,provider_key)')
   .eq('workspace_id',workspace.id).eq('discovery_adapter_catalog.provider_key','apify').order('priority',{ascending:true})
  if(queryError)setError(queryError.message)
  else{
   const rows=(data||[]) as unknown as Selection[]
   setSelections(rows)
   setMappingDrafts(Object.fromEntries(rows.map(row=>[row.id,JSON.stringify(row.config?.field_mapping||{},null,2)])))
   setInputMappingDrafts(Object.fromEntries(rows.map(row=>[row.id,JSON.stringify(row.config?.input_mapping||{},null,2)])))
   setInputDrafts(Object.fromEntries(rows.map(row=>{const schema=row.discovery_adapter_catalog.input_schema||{};const saved=(row.config?.input_defaults||{}) as Record<string,unknown>;const values=Object.fromEntries(Object.entries(schema.properties||{}).map(([key,field])=>{const value=saved[key]??field.default??(field.type==='boolean'?false:field.type==='array'?'[]':field.type==='object'?'{}':'');return [key,typeof value==='boolean'?value:typeof value==='string'?value:JSON.stringify(value)]}));return [row.id,values as Record<string,string|boolean>]})))
  }
  setLoading(false)
 }
 useEffect(()=>{void load()},[workspace?.id])
 const sync=async()=>{
  if(!supabase||!workspace||!actorId.trim())return
  setBusy(true);setError('');setMessage('')
  const {data,error:invokeError}=await supabase.functions.invoke('apify-actor-schema',{body:{workspace_id:workspace.id,actor_id:actorId.trim(),channel_key:channel}})
  if(invokeError||data?.error){setError(data?.error||invokeError?.message||'Actor Schema 同步失败');setBusy(false);return}
  setMessage(`已读取 ${data.actor_name} 的输入结构（${Object.keys(data.input_schema?.properties||{}).length} 个输入字段）。尚未启用，需先检查字段映射。`)
  setActorId('');await load();setBusy(false)
 }
 const saveMapping=async(row:Selection)=>{
  if(!supabase||!workspace)return
  let mapping:Record<string,unknown>
  try{const parsed=JSON.parse(mappingDrafts[row.id]||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();mapping=parsed as Record<string,unknown>}
  catch{setError('字段映射必须是有效的 JSON 对象');return}
  setBusy(true);setError('')
  const {error:updateError}=await supabase.from('workspace_adapter_selections').update({config:{...(row.config||{}),field_mapping:mapping},updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage('字段映射已保存。')
  await load();setBusy(false)
 }
 const saveInputMapping=async(row:Selection)=>{
  if(!supabase||!workspace)return
  let mapping:Record<string,string>
  try{const parsed=JSON.parse(inputMappingDrafts[row.id]||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.values(parsed).some(value=>typeof value!=='string'))throw new Error();mapping=parsed as Record<string,string>}
  catch{setError('搜索条件映射必须是 JSON 对象，值应为搜索画像字段路径');return}
  setBusy(true);setError('')
  const {error:updateError}=await supabase.from('workspace_adapter_selections').update({config:{...(row.config||{}),input_mapping:mapping},updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage('搜索条件映射已保存。任务创建时会将产品、国家、关键词等标准字段映射到 Actor 专属输入参数。')
  await load();setBusy(false)
 }
 const saveInputDefaults=async(row:Selection)=>{
  if(!supabase||!workspace)return
  const schema=row.discovery_adapter_catalog.input_schema||{};const fields=Object.entries(schema.properties||{});const raw=inputDrafts[row.id]||{};const output:Record<string,unknown>={}
  try{
   for(const [key,field] of fields){
    const value=raw[key]??''
    if(schema.required?.includes(key)&&(value===''||value===undefined||value===null))throw new Error(`必填字段未填写：${field.title||key}`)
    if(field.type==='boolean')output[key]=Boolean(value)
    else if(field.type==='integer'){if(value!=='')output[key]=Number(value)}
    else if(field.type==='array'||field.type==='object'){if(String(value).trim())output[key]=JSON.parse(String(value))}
    else if(value!=='')output[key]=String(value)
   }
  }catch(e){setError(e instanceof Error?e.message:'Actor 输入参数格式错误');return}
  setBusy(true);setError('')
  const {error:updateError}=await supabase.from('workspace_adapter_selections').update({config:{...(row.config||{}),input_defaults:output},updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage('Actor 专属输入参数已保存。创建任务时可将 AI 生成参数与这些默认值合并。')
  await load();setBusy(false)
 }
 const toggle=async(row:Selection)=>{
  if(!supabase||!workspace)return
  const mapping=row.config?.field_mapping
  if(!row.is_enabled&&(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||!(mapping as Record<string,unknown>).company_name&&!(mapping as Record<string,unknown>).contact_name)){setError('请先配置并保存 company_name 或 contact_name 输出映射，再启用该 Actor。');return}
  setBusy(true);setError('')
  const {error:updateError}=await supabase.from('workspace_adapter_selections').update({is_enabled:!row.is_enabled,updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage(row.is_enabled?'Actor 已停用。':'Actor 已启用，可参与该渠道的搜索调度。')
  await load();setBusy(false)
 }
 const remove=async(row:Selection)=>{
  if(!supabase||!workspace||!window.confirm('从当前工作空间移除此 Actor 配置？全局 Actor Schema 会保留。'))return
  setBusy(true);const {error:removeError}=await supabase.from('workspace_adapter_selections').delete().eq('id',row.id).eq('workspace_id',workspace.id)
  if(removeError)setError(removeError.message);else setMessage('Actor 配置已移除。')
  await load();setBusy(false)
 }
 return <div className="apify-actor-manager">
  <div className="apify-actor-heading"><div><h3><Code2 size={15}/> Apify Actor 配置</h3><p>每个渠道可绑定不同 Actor。字段表单来自 Actor 自身 Schema，不使用统一的假设字段。</p></div><span><ShieldCheck size={12}/> Actor Schema 动态读取</span></div>
  {!canSync&&<div className="apify-actor-warning">请先在上方保存 Apify API Token 并完成连接测试。同步 Schema 只读取 Actor 元数据，不会启动采集或产生 Actor 运行费用。</div>}
  <div className="apify-actor-sync-form"><label>获客渠道<select value={channel} onChange={e=>setChannel(e.target.value)}>{channelOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="actor-id-field">Actor ID<input value={actorId} onChange={e=>setActorId(e.target.value)} placeholder="例如：compass/google-maps-extractor"/></label><button disabled={!canSync||busy||!actorId.trim()} onClick={()=>void sync()}><RefreshCw size={13}/> {busy?'处理中…':'读取 Actor Schema'}</button></div>
  {error&&<div className="int-db-error">{error}</div>}{message&&<div className="int-credential-feedback"><CheckCircle2 size={13}/>{message}</div>}
  <div className="apify-actor-list-head"><b>工作空间 Actor 列表</b><button onClick={()=>void load()} disabled={loading}><RefreshCw size={12}/> 刷新</button></div>
  {loading?<div className="apify-actor-empty">读取 Actor 配置…</div>:!selections.length?<div className="apify-actor-empty"><Database size={18}/><b>尚未添加 Actor</b><span>输入 Apify Store 中的 Actor ID，系统将读取其独立输入 Schema。</span></div>:<div className="apify-actor-list">{selections.map(row=>{const schema=row.discovery_adapter_catalog.input_schema||{};const fields=Object.entries(schema.properties||{});return <article className="apify-actor-card" key={row.id}><div className="apify-actor-card-head"><div><b>{row.discovery_adapter_catalog.adapter_name}</b><small>{row.discovery_adapter_catalog.external_actor_id} · {row.channel_key} · build {row.discovery_adapter_catalog.adapter_version}</small></div><span className={row.is_enabled?'enabled':'disabled'}>{row.is_enabled?'已启用':'待配置'}</span></div><details><summary>输入字段 Schema（{fields.length}）<ChevronDown size={13}/></summary><div className="apify-schema-fields">{fields.map(([key,field])=><div key={key}><b>{field.title||key}</b><code>{key} · {field.type||'unknown'}{schema.required?.includes(key)?' · required':''}</code>{field.description&&<small>{field.description}</small>}</div>)}</div></details><details className="apify-input-details"><summary>Actor 专属输入参数（{fields.length} 个字段）<ChevronDown size={13}/></summary><div className="apify-input-grid">{fields.map(([key,field])=>{const value=inputDrafts[row.id]?.[key]??'';const required=schema.required?.includes(key);return <label className="apify-dynamic-field" key={key}><span>{field.title||key}{required?' *':''}</span>{field.enum?.length?<select value={String(value)} onChange={e=>setInputDrafts(current=>({...current,[row.id]:{...(current[row.id]||{}),[key]:e.target.value}}))}><option value="">请选择</option>{field.enum.map(item=><option key={String(item)} value={String(item)}>{String(item)}</option>)}</select>:field.type==='boolean'?<input type="checkbox" checked={Boolean(value)} onChange={e=>setInputDrafts(current=>({...current,[row.id]:{...(current[row.id]||{}),[key]:e.target.checked}}))}/>:field.type==='array'||field.type==='object'?<textarea rows={2} value={String(value)} onChange={e=>setInputDrafts(current=>({...current,[row.id]:{...(current[row.id]||{}),[key]:e.target.value}}))} placeholder={field.type==='array'?'[]':'{}'}/>:<input type={field.type==='integer'?'number':'text'} value={String(value)} onChange={e=>setInputDrafts(current=>({...current,[row.id]:{...(current[row.id]||{}),[key]:e.target.value}}))} placeholder={field.default===undefined?'':String(field.default)}/ >}{field.description&&<small>{field.description}</small>}</label>})}</div><button className="apify-save-inputs" disabled={busy} onClick={()=>void saveInputDefaults(row)}>保存 Actor 输入参数</button></details><label className="apify-mapping-label">搜索条件映射 <small>Actor 输入字段 → 搜索画像字段路径，例如 {"{\"searchStringsArray\":\"keywords\",\"locationQuery\":\"countries\"}"}</small><textarea rows={2} value={inputMappingDrafts[row.id]||'{}'} onChange={e=>setInputMappingDrafts(current=>({...current,[row.id]:e.target.value}))}/><button className="apify-save-inputs" disabled={busy} onClick={()=>void saveInputMapping(row)}>保存搜索条件映射</button></label><label className="apify-mapping-label">输出字段映射 <small>左侧为 Ouranos 标准字段，右侧为 Actor 输出字段名，例如 {"{\"company_name\":\"name\",\"website\":\"websiteUrl\"}"}</small><textarea rows={3} value={mappingDrafts[row.id]||'{}'} onChange={e=>setMappingDrafts(current=>({...current,[row.id]:e.target.value}))}/></label><div className="apify-actor-actions"><button onClick={()=>void saveMapping(row)} disabled={busy}>保存字段映射</button><button onClick={()=>void toggle(row)} disabled={busy}>{row.is_enabled?<ToggleRight size={14}/>:<ToggleLeft size={14}/>} {row.is_enabled?'停用':'启用'}</button><button className="remove" onClick={()=>void remove(row)} disabled={busy}><Trash2 size={13}/> 移除</button></div></article>})}</div>}
 </div>
}
