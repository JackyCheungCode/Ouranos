import { useEffect, useState } from 'react'
import { CheckCircle2, Database, Plus, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
type Provider={key:string;name:string;group:'data'|'ai'}
type Selection={id:string;adapter_key:string;channel_key:string;is_enabled:boolean;config:Record<string,unknown>;discovery_adapter_catalog:{adapter_name:string;external_actor_id:string;adapter_version:string;verification_status:string;input_schema:Record<string,unknown>;provider_key:string}}
const channels=[['linkedin','LinkedIn'],['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['x','X'],['pinterest','Pinterest'],['reddit','Reddit'],['threads','Threads'],['telegram','Telegram'],['vk','VK'],['google-search','Google Search'],['google-maps','Google Maps'],['bing','Microsoft Bing'],['yandex','Yandex'],['baidu','百度'],['naver','Naver'],['yelp','Yelp'],['apple-maps','Apple Maps'],['alibaba','Alibaba.com'],['made-in-china','Made-in-China'],['globalsources','Global Sources'],['tradekey','TradeKey'],['ec21','EC21'],['kompass','Kompass'],['europages','Europages'],['thomasnet','Thomasnet'],['indiamart','IndiaMART'],['1688','1688'],['amazon','Amazon'],['ebay','eBay'],['walmart','Walmart'],['etsy','Etsy'],['shopify','Shopify'],['aliexpress','AliExpress'],['temu','Temu'],['tiktok-shop','TikTok Shop'],['shopee','Shopee'],['lazada','Lazada'],['mercadolibre','Mercado Libre'],['company-sites','企业官方网站'],['directories','企业黄页 / 商业目录'],['news','新闻与媒体网站'],['job-sites','招聘网站'],['whois','域名 / DNS 信息'],['review-sites','评价 / 点评网站'],['trade-records','进出口 / 海关数据'],['company-registry','企业注册信息'],['business-data','商业数据库 / 信用信息'],['exhibitors','展会 / 参展商名录']]
const examples:Record<string,{id:string;config:string;hint:string}>={
 brightdata:{id:'dataset_id',config:'{"dataset_id":"YOUR_DATASET_ID"}',hint:'填写 Bright Data Dataset ID。input payload 和输出字段以该 Dataset 的 schema 为准。'},
 octoparse:{id:'template_name',config:'{"template_name":"YOUR_TEMPLATE_NAME"}',hint:'填写 Octoparse AgentTools 模板名称。参数结构需符合模板的 inputSchema。'},
 firecrawl:{id:'operation',config:'{"operation":"crawl"}',hint:'选择 search、scrape 或 crawl。不同操作使用不同输入字段。'},
 phantombuster:{id:'agent_id',config:'{"agent_id":"YOUR_AGENT_ID"}',hint:'填写 PhantomBuster Agent ID。argument 结构必须符合该 Agent 的参数定义。'},
 texau:{id:'endpoint_path',config:'{"endpoint_path":"/YOUR_ACTION","inquiry_path":"/YOUR_ACTION_inquiry"}',hint:'填写 TexAu action 路径和异步 inquiry 路径；每个 action 独立定义 schema。'},
 kuajingmofang:{id:'endpoint_path',config:'{"endpoint_path":"/YOUR_ENDPOINT","max_cost":20}',hint:'填写跨境魔方已核实的 API 路径和单次人民币费用上限；每个接口独立定价。'}
}
export default function ManualAdapterManager({provider,canRegister}:{provider:Provider;canRegister:boolean}){
 const {workspace}=useAuth()
 const [name,setName]=useState('')
 const [channel,setChannel]=useState('google-maps')
 const [externalId,setExternalId]=useState('')
 const [configText,setConfigText]=useState(examples[provider.key]?.config||'{}')
 const [inputSchema,setInputSchema]=useState('{"type":"object","properties":{},"required":[]}')
 const [inputDefaults,setInputDefaults]=useState('{}')
 const [inputMapping,setInputMapping]=useState('{}')
 const [outputMapping,setOutputMapping]=useState('{"company_name":"name"}')
 const [outputSchema,setOutputSchema]=useState('{}')
 const [pricing,setPricing]=useState('{}')
 const [executionMode,setExecutionMode]=useState('async')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [rows,setRows]=useState<Selection[]>([])
 const [loading,setLoading]=useState(false)
 const load=async()=>{
  if(!supabase||!workspace)return
  setLoading(true)
  const {data,error:queryError}=await supabase.from('workspace_adapter_selections').select('id,adapter_key,channel_key,is_enabled,config,discovery_adapter_catalog!inner(adapter_name,external_actor_id,adapter_version,verification_status,input_schema,provider_key)').eq('workspace_id',workspace.id).eq('discovery_adapter_catalog.provider_key',provider.key).order('priority',{ascending:true})
  if(queryError)setError(queryError.message);else setRows((data||[]) as unknown as Selection[])
  setLoading(false)
 }
 useEffect(()=>{setName('');setChannel('google-maps');setExternalId('');setConfigText(examples[provider.key]?.config||'{}');setError('');setMessage('');void load()},[provider.key,workspace?.id])
 const register=async()=>{
  if(!supabase||!workspace||!canRegister)return
  setBusy(true);setError('');setMessage('')
  try{
   const parse=(text:string,label:string)=>{try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>}catch{throw new Error(label+' 必须是有效的 JSON 对象')}}
   const config=parse(configText,'适配器配置');if(provider.key==='brightdata')config.dataset_id=externalId.trim();if(provider.key==='octoparse')config.template_name=externalId.trim();if(provider.key==='firecrawl')config.operation=externalId.trim();if(provider.key==='phantombuster')config.agent_id=externalId.trim();if(provider.key==='texau'||provider.key==='kuajingmofang')config.endpoint_path=externalId.trim();const schema=parse(inputSchema,'输入 Schema');const defaults=parse(inputDefaults,'输入默认值');const inMap=parse(inputMapping,'搜索条件映射');const outMap=parse(outputMapping,'输出字段映射');const outSchema=parse(outputSchema,'输出 Schema');const price=parse(pricing,'计费模型')
   if(!name.trim()||!externalId.trim())throw new Error('请填写适配器名称和资源 ID')
   if(!outMap.company_name&&!outMap.contact_name)throw new Error('输出映射至少需要 company_name 或 contact_name')
   const {data,error:invokeError}=await supabase.functions.invoke('register-provider-adapter',{body:{workspace_id:workspace.id,provider_key:provider.key,channel_key:channel,adapter_name:name.trim(),external_id:externalId.trim(),config,input_schema:schema,output_schema:outSchema,input_defaults:defaults,input_mapping:inMap,field_mapping:outMap,pricing_model:price,execution_mode:executionMode,max_concurrency:1,supported_record_types:['company','contact']}})
   if(invokeError||data?.error)throw new Error(data?.error||invokeError?.message||'适配器注册失败')
   setMessage('适配器已登记到当前工作空间，默认关闭。请核对字段映射后再启用。');setName('');setExternalId('');await load()
  }catch(e){setError(e instanceof Error?e.message:'适配器注册失败')}finally{setBusy(false)}
 }
 const toggle=async(row:Selection)=>{
  if(!supabase||!workspace)return
  const mapping=row.config?.field_mapping as Record<string,unknown>|undefined
  if(!row.is_enabled&&(!mapping?.company_name&&!mapping?.contact_name)){setError('请先配置 company_name 或 contact_name 输出映射。');return}
  setBusy(true);const {error:updateError}=await supabase.from('workspace_adapter_selections').update({is_enabled:!row.is_enabled,updated_at:new Date().toISOString()}).eq('id',row.id).eq('workspace_id',workspace.id)
  if(updateError)setError(updateError.message);else setMessage(row.is_enabled?'适配器已停用':'适配器已启用')
  await load();setBusy(false)
 }
 const remove=async(row:Selection)=>{
  if(!supabase||!workspace||!window.confirm('移除当前工作空间中的适配器？历史运行记录会保留。'))return
  setBusy(true);const {error:removeError}=await supabase.from('workspace_adapter_selections').delete().eq('id',row.id).eq('workspace_id',workspace.id)
  if(removeError)setError(removeError.message);else setMessage('适配器已移除')
  await load();setBusy(false)
 }
 const example=examples[provider.key]
 return <div className="manual-adapter-manager">
  <div className="apify-actor-heading"><div><h3><Database size={15}/> {provider.name} 渠道适配器</h3><p>一个服务商可以有多个渠道适配器；每个适配器保存自己的输入 Schema、字段映射、执行方式和计费规则。</p></div><span><ShieldCheck size={12}/> 独立 Schema / 配置</span></div>
  {!canRegister&&<div className="apify-actor-warning">请先在上方保存 API Key 并通过连接测试，再登记渠道适配器。</div>}
  <div className="manual-adapter-form">
   <div className="manual-adapter-grid"><label>适配器名称<input value={name} onChange={e=>setName(e.target.value)} placeholder="例如：LinkedIn 公司搜索"/></label><label>获客渠道<select value={channel} onChange={e=>setChannel(e.target.value)}>{channels.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>资源 ID / 操作标识<input value={externalId} onChange={e=>setExternalId(e.target.value)} placeholder={example?.id||'Provider resource ID'}/></label><label>执行方式<select value={executionMode} onChange={e=>setExecutionMode(e.target.value)}><option value="async">异步任务</option><option value="sync">同步请求</option></select></label></div>
   <small className="manual-adapter-hint">{example?.hint}</small>
   <label>服务商配置 JSON<textarea rows={2} value={configText} onChange={e=>setConfigText(e.target.value)}/></label>
   <div className="manual-adapter-grid"><label>输入 Schema JSON<textarea rows={4} value={inputSchema} onChange={e=>setInputSchema(e.target.value)}/></label><label>输出 Schema JSON<textarea rows={4} value={outputSchema} onChange={e=>setOutputSchema(e.target.value)}/></label><label>输入默认值 JSON<textarea rows={3} value={inputDefaults} onChange={e=>setInputDefaults(e.target.value)}/></label><label>搜索条件映射 JSON<textarea rows={3} value={inputMapping} onChange={e=>setInputMapping(e.target.value)}/></label><label>输出字段映射 JSON<textarea rows={3} value={outputMapping} onChange={e=>setOutputMapping(e.target.value)}/></label><label>计费模型 JSON<textarea rows={3} value={pricing} onChange={e=>setPricing(e.target.value)}/></label></div>
   <button className="apify-save-inputs" disabled={!canRegister||busy} onClick={()=>void register()}><Plus size={13}/> {busy?'处理中…':'登记该渠道适配器'}</button>
  </div>
  {error&&<div className="int-db-error">{error}</div>}{message&&<div className="int-credential-feedback"><CheckCircle2 size={13}/>{message}</div>}
  <div className="apify-actor-list-head"><b>已登记适配器</b><button onClick={()=>void load()} disabled={loading}><RefreshCw size={12}/> 刷新</button></div>
  {loading?<div className="apify-actor-empty">读取适配器…</div>:!rows.length?<div className="apify-actor-empty">该服务商尚未登记渠道适配器。</div>:<div className="apify-actor-list">{rows.map(row=><article className="apify-actor-card" key={row.id}><div className="apify-actor-card-head"><div><b>{row.discovery_adapter_catalog.adapter_name}</b><small>{row.channel_key} · {row.discovery_adapter_catalog.external_actor_id} · {row.discovery_adapter_catalog.verification_status}</small></div><span className={row.is_enabled?'enabled':'disabled'}>{row.is_enabled?'已启用':'待配置'}</span></div><div className="apify-actor-actions"><button onClick={()=>void toggle(row)} disabled={busy}>{row.is_enabled?<ToggleRight size={14}/>:<ToggleLeft size={14}/>} {row.is_enabled?'停用':'启用'}</button><button className="remove" onClick={()=>void remove(row)} disabled={busy}><Trash2 size={13}/> 移除</button></div></article>)}</div>}
 </div>
}
