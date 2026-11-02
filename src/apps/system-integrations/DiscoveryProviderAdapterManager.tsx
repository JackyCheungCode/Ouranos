import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleHelp, Database, ExternalLink, Loader2, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type ProviderKey='brightdata'|'firecrawl'
type SchemaField={type?:string;title?:string;description?:string;default?:unknown;enum?:unknown[];items?:SchemaField;properties?:Record<string,SchemaField>;required?:string[];editor?:string;minimum?:number;maximum?:number}
type JsonSchema={type?:string;title?:string;properties?:Record<string,SchemaField>;required?:string[]}
type Dataset={id:string;name:string;description:string;input_schema?:JsonSchema|null}
type Props={provider:{key:string;name:string};canConfigure:boolean}
const channels=[['google-search','Google Search'],['google-maps','Google Maps'],['linkedin','LinkedIn'],['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['x','X'],['reddit','Reddit'],['company-sites','企业官方网站'],['directories','企业商业目录'],['news','新闻与媒体网站'],['job-sites','招聘网站'],['exhibitors','展会参展商'],['amazon','Amazon'],['shopify','Shopify 独立站']]
const firecrawlSchemas:Record<string,JsonSchema>={
 search:{type:'object',required:['query'],properties:{query:{type:'string',title:'搜索关键词',description:'描述要发现的企业、品牌或商业网站。',default:''},limit:{type:'integer',title:'结果数量',description:'每次搜索返回的最大结果数。',default:10,minimum:1,maximum:100},sources:{type:'array',title:'搜索来源',description:'可选 web、news、images。',editor:'stringList',default:['web']},country:{type:'string',title:'国家代码',description:'可选的两位国家代码，例如 JP、US。'},scrapeOptions:{type:'object',title:'结果抓取选项',description:'Firecrawl ScrapeOptions JSON。'}}},
 scrape:{type:'object',required:['url'],properties:{url:{type:'string',title:'目标网址',description:'要提取的企业官网或联系页面，必须包含 https://。'},formats:{type:'array',title:'输出格式',description:'可选 markdown、html、links、screenshot 或 json。',editor:'stringList',default:['markdown']},onlyMainContent:{type:'boolean',title:'仅提取正文',default:true},waitFor:{type:'integer',title:'页面等待时间（毫秒）',default:0,minimum:0,maximum:30000},includeTags:{type:'array',title:'包含 HTML 标签',editor:'stringList'},excludeTags:{type:'array',title:'排除 HTML 标签',editor:'stringList'}}},
 crawl:{type:'object',required:['url'],properties:{url:{type:'string',title:'网站起始网址',description:'从该企业网站开始发现和抓取页面。'},limit:{type:'integer',title:'最大页面数',default:100,minimum:1,maximum:10000},maxDiscoveryDepth:{type:'integer',title:'最大链接深度',default:2,minimum:0,maximum:20},includePaths:{type:'array',title:'仅抓取路径',description:'每行一个正则路径规则。',editor:'stringList'},excludePaths:{type:'array',title:'排除路径',editor:'stringList'},crawlEntireDomain:{type:'boolean',title:'遍历整个域名',default:false},allowExternalLinks:{type:'boolean',title:'允许外部链接',default:false},allowSubdomains:{type:'boolean',title:'允许子域名',default:false},scrapeOptions:{type:'object',title:'页面提取选项',description:'例如 {"formats":["markdown"]}。'}}}
}
const defaultMapping=(operation:string)=>operation==='search'?{company_name:'title',website:'url',source_url:'url',description:'description'}:{company_name:'metadata.title',website:'metadata.sourceURL',source_url:'metadata.sourceURL',description:'markdown'}
export default function DiscoveryProviderAdapterManager({provider,canConfigure}:Props){
 const {workspace}=useAuth()
 const [channel,setChannel]=useState('company-sites')
 const [operation,setOperation]=useState('search')
 const [datasets,setDatasets]=useState<Dataset[]>([])
 const [datasetId,setDatasetId]=useState('')
 const [datasetSchema,setDatasetSchema]=useState<JsonSchema|null>(null)
 const [query,setQuery]=useState('')
 const [loading,setLoading]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [adapters,setAdapters]=useState<Array<{id:string;adapter_key:string;channel_key:string;is_enabled:boolean;config:Record<string,unknown>;catalog:{adapter_name:string;external_actor_id:string;verification_status:string;maintenance_status:string}}>>([])
 const loadAdapters=async()=>{
  if(!supabase||!workspace)return
  const {data,error:e}=await supabase.from('workspace_adapter_selections').select('id,adapter_key,channel_key,is_enabled,config,discovery_adapter_catalog!inner(adapter_name,external_actor_id,verification_status,maintenance_status,provider_key)').eq('workspace_id',workspace.id).eq('discovery_adapter_catalog.provider_key',provider.key).order('priority')
  if(e)setError(e.message);else setAdapters((data||[]) as unknown as typeof adapters)
 }
 const loadDatasets=async()=>{
  if(!supabase||!workspace)return
  setLoading(true);setError('')
  try{const {data,error:e}=await supabase.functions.invoke('discovery-provider-catalog',{body:{workspace_id:workspace.id,action:'brightdata_datasets'}});if(e||data?.error)throw new Error(data?.error||e?.message||'无法读取 Bright Data Dataset');const rows=(data.items||[]) as Dataset[];setDatasets(rows);if(!datasetId&&rows[0]){setDatasetId(rows[0].id);setDatasetSchema(rows[0].input_schema||null)}}catch(e){setError(e instanceof Error?e.message:'Dataset 目录读取失败')}finally{setLoading(false)}
 }
 useEffect(()=>{setError('');setMessage('');void loadAdapters();if(provider.key==='brightdata'&&canConfigure)void loadDatasets()},[provider.key,workspace?.id,canConfigure])
 const selectedDataset=datasets.find(item=>item.id===datasetId)
 const filteredDatasets=useMemo(()=>datasets.filter(item=>(item.name+' '+item.id+' '+item.description).toLowerCase().includes(query.toLowerCase())),[datasets,query])
 const register=async()=>{
  if(!supabase||!workspace||!canConfigure)return
  setBusy(true);setError('');setMessage('')
  try{
   let externalId='',name='',config:Record<string,unknown>={},schema:JsonSchema={},mapping:Record<string,string>={}
   if(provider.key==='firecrawl'){
    externalId='firecrawl-'+operation;name='Firecrawl '+({search:'Search 网页搜索',scrape:'Scrape 单页抓取',crawl:'Crawl 网站爬取'} as Record<string,string>)[operation];config={operation};schema=firecrawlSchemas[operation];mapping=defaultMapping(operation)
   }else{
    const dataset=selectedDataset;if(!dataset)throw new Error('请先选择 Bright Data Dataset')
    externalId=dataset.id;name=dataset.name;config={dataset_id:dataset.id,format:'json'}
    const original=dataset.input_schema
    schema=original?.properties?original:{type:'object',required:['input'],properties:{input:{type:'array',title:'采集输入列表',description:'按照所选 Dataset 的输入要求填写 URL 或搜索关键词对象。',items:{type:'object'},editor:'json'}}}
    mapping={company_name:'name',website:'url',source_url:'url',description:'description'}
   }
   const {data,error:e}=await supabase.functions.invoke('register-provider-adapter',{body:{workspace_id:workspace.id,provider_key:provider.key,channel_key:channel,adapter_name:name,external_id:externalId,config,input_schema:schema,output_schema:{type:'object'},input_defaults:{},input_mapping:{},field_mapping:mapping,pricing_model:{currency:'USD'},execution_mode:'async',max_concurrency:2,supported_record_types:['company','contact'],docs_url:provider.key==='firecrawl'?'https://docs.firecrawl.dev/':'https://docs.brightdata.com/'}});
   if(e||data?.error)throw new Error(data?.error||e?.message||'登记失败')
   setMessage('适配器已登记。完成样本测试与客户输出审核后，才可在发现任务中启用。');await loadAdapters()
  }catch(e){setError(e instanceof Error?e.message:'适配器登记失败')}finally{setBusy(false)}
 }
 const operationOptions=[['search','Search · 搜索网页'],['scrape','Scrape · 抓取单页'],['crawl','Crawl · 抓取整站']]
 return <section className="provider-adapter-manager">
  <header><div><span className="api-settings-eyebrow">DISCOVERY ADAPTERS</span><h3>{provider.name} 采集器</h3></div><button type="button" onClick={()=>{void loadAdapters();if(provider.key==='brightdata')void loadDatasets()}} disabled={loading}><RefreshCw size={13}/>刷新</button></header>
  {!canConfigure&&<div className="provider-adapter-note"><ShieldCheck size={14}/>请先在 API 集成设置中保存凭证并通过连接测试。</div>}
  {provider.key==='firecrawl'?<div className="provider-adapter-form">
   <label>采集操作<select value={operation} onChange={e=>setOperation(e.target.value)}>{operationOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <div className="provider-adapter-schema-preview"><b>输入 Schema</b><span>{Object.keys(firecrawlSchemas[operation].properties||{}).length} 个参数 · 自动生成中文表单</span><pre>{JSON.stringify(firecrawlSchemas[operation],null,2)}</pre></div>
  </div>:<div className="provider-adapter-form">
   <div className="provider-adapter-toolbar"><div><b>Bright Data Dataset</b><small>{datasets.length} 个可用数据集</small></div><button type="button" onClick={()=>void loadDatasets()} disabled={loading}><RefreshCw size={13}/>{loading?'读取中':'同步目录'}</button></div>
   <div className="provider-adapter-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索 Dataset 名称或 ID"/></div>
   <label>选择 Dataset<select value={datasetId} onChange={e=>{setDatasetId(e.target.value);setDatasetSchema(datasets.find(x=>x.id===e.target.value)?.input_schema||null)}}><option value="">请选择 Dataset</option>{filteredDatasets.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
   {selectedDataset&&<div className="provider-adapter-dataset"><b>{selectedDataset.name}</b><small>{selectedDataset.description||selectedDataset.id}</small><span>{datasetSchema?Object.keys(datasetSchema.properties||{}).length+' 个 Schema 字段':'平台未返回参数 Schema，将使用通用输入列表'}</span></div>}
  </div>}
  {error&&<div className="api-settings-error">{error}</div>}{message&&<div className="provider-adapter-success"><CheckCircle2 size={14}/>{message}</div>}
  <button className="provider-adapter-register" type="button" disabled={!canConfigure||busy||(provider.key==='brightdata'&&!selectedDataset)} onClick={()=>void register()}><Plus size={14}/>{busy?'正在登记…':'登记到线索发现'}</button>
  <div className="provider-adapter-list"><b>已登记适配器</b>{adapters.length?adapters.map(item=><article key={item.id}><div><b>{item.catalog.adapter_name}</b><small>{item.channel_key} · {item.catalog.external_actor_id}</small></div><span className={item.catalog.verification_status==='verified'?'verified':'pending'}>{item.catalog.verification_status==='verified'?'已审核':'待审核'}</span></article>):<p>尚未登记采集器。</p>}</div>
  <small className="provider-adapter-footnote"><CircleHelp size={12}/> 登记不会自动启用；需要先检查真实样本，避免把网页文章误认成客户。</small>
 </section>
}
