import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Code2, Database, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type SchemaProperty={type?:string;title?:string;description?:string;default?:unknown;enum?:unknown[];editor?:string}
type ActorSchema={title?:string;description?:string;properties?:Record<string,SchemaProperty>;required?:string[]}
type Selection={id:string;adapter_key:string;channel_key:string;is_enabled:boolean;priority:number;config:Record<string,unknown>;discovery_adapter_catalog:{adapter_name:string;external_actor_id:string;adapter_version:string;input_schema:ActorSchema;output_schema:Record<string,unknown>;verification_status:string}}
const channelOptions=[['google-maps','Google Maps'],['google-search','Google Search'],['linkedin','LinkedIn'],['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['amazon','Amazon'],['alibaba','Alibaba'],['shopify','Shopify'],['company-websites','企业官网'],['b2b-directories','B2B 企业目录']]
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
 const toggle=async(row:Selection)=>{
  if(!supabase||!workspace)return
  const mapping=row.config?.field_mapping
  if(!row.is_enabled&&(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||!Object.keys(mapping as object).length)){setError('请先配置并保存至少一个输出字段映射，再启用该 Actor。');return}
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
  {loading?<div className="apify-actor-empty">读取 Actor 配置…</div>:!selections.length?<div className="apify-actor-empty"><Database size={18}/><b>尚未添加 Actor</b><span>输入 Apify Store 中的 Actor ID，系统将读取其独立输入 Schema。</span></div>:<div className="apify-actor-list">{selections.map(row=>{const schema=row.discovery_adapter_catalog.input_schema||{};const fields=Object.entries(schema.properties||{});return <article className="apify-actor-card" key={row.id}><div className="apify-actor-card-head"><div><b>{row.discovery_adapter_catalog.adapter_name}</b><small>{row.discovery_adapter_catalog.external_actor_id} · {row.channel_key} · build {row.discovery_adapter_catalog.adapter_version}</small></div><span className={row.is_enabled?'enabled':'disabled'}>{row.is_enabled?'已启用':'待配置'}</span></div><details><summary>输入字段 Schema（{fields.length}）<ChevronDown size={13}/></summary><div className="apify-schema-fields">{fields.map(([key,field])=><div key={key}><b>{field.title||key}</b><code>{key} · {field.type||'unknown'}{schema.required?.includes(key)?' · required':''}</code>{field.description&&<small>{field.description}</small>}</div>)}</div></details><label className="apify-mapping-label">输出字段映射 <small>左侧为 Ouranos 标准字段，右侧为 Actor 输出字段名，例如 {"{\"company_name\":\"name\",\"website\":\"websiteUrl\"}"}</small><textarea rows={3} value={mappingDrafts[row.id]||'{}'} onChange={e=>setMappingDrafts(current=>({...current,[row.id]:e.target.value}))}/></label><div className="apify-actor-actions"><button onClick={()=>void saveMapping(row)} disabled={busy}>保存字段映射</button><button onClick={()=>void toggle(row)} disabled={busy}>{row.is_enabled?<ToggleRight size={14}/>:<ToggleLeft size={14}/>} {row.is_enabled?'停用':'启用'}</button><button className="remove" onClick={()=>void remove(row)} disabled={busy}><Trash2 size={13}/> 移除</button></div></article>})}</div>}
 </div>
}
