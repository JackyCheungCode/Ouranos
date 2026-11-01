import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bot, Building2, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Database, Globe2, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Target, Users, Workflow, Inbox, UserRoundCheck, Pencil, Trash2, Ban, Save, X } from 'lucide-react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './LeadFinderApp.css'
import { countries as countryCatalog } from './countries'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import LeadDiscoveryWizard from './LeadDiscoveryWizard'

type Tab = 'search' | 'tasks' | 'review'
type TargetType = 'companies' | 'contacts' | 'both'
type Country = { code:string; name:string; flag:string; geoName:string }
type Channel = { id:string; name:string; detail:string; logo:string; providers:string[]; status:string }
type ChannelGroup = { id:string; title:string; description:string; channels:Channel[] }
type AvailableAiModel = {provider_key:string;provider_name:string;model_name:string;is_default:boolean}
type SearchTask = {id:string;name:string;criteria:string;createdAt:string;channels:number;status:string;statusKey:string;discoveredCount:number;companyCount:number;contactCount:number;actualCost:number|null;modelName:string;targetProfile:Record<string,unknown>;targetCount:number}
type TaskLog = {id:string;message:string;status:string;created_at:string;details:Record<string,unknown>}
type InboxRecord = { id:string; record_type:'company'|'contact'; review_status:string; display_name:string; country_name:string|null; website:string|null; email:string|null; phone:string|null; job_title:string|null; ai_score:number|null; ai_summary:string|null; discovered_at:string; normalized_domain:string|null; normalized_email:string|null; source_record_id:string|null; lead_source_records?:{provider_key:string;channel_key:string;source_url:string|null;source_title:string|null}|null }

const countries:Country[] = countryCatalog


const channelGroups:ChannelGroup[] = [
 {id:'social',title:'社交媒体与职业社交',description:'企业主页、品牌账号、创始人及采购决策人',channels:[
  {id:'linkedin',name:'LinkedIn',detail:'公司主页、员工、职位与专业联系人',logo:'linkedin',providers:['Apify','PhantomBuster','TexAu'],status:'需验证授权与平台规则'},
  {id:'facebook',name:'Facebook',detail:'企业主页、商家信息、公开帖子',logo:'facebook',providers:['Apify','PhantomBuster','TexAu'],status:'公开数据 / 授权范围'},
  {id:'instagram',name:'Instagram',detail:'品牌账号、商业主页、公开内容',logo:'instagram',providers:['Apify','PhantomBuster','TexAu'],status:'公开数据 / 授权范围'},
  {id:'tiktok',name:'TikTok',detail:'品牌账号、创作者、公开短视频线索',logo:'tiktok',providers:['Apify','Bright Data'],status:'按地区与接口能力验证'},
  {id:'youtube',name:'YouTube',detail:'品牌频道、企业视频与商务联系线索',logo:'youtube',providers:['Apify','Bright Data'],status:'公开频道数据'},
  {id:'x',name:'X（Twitter）',detail:'品牌账号、企业动态与公开互动',logo:'x',providers:['Apify','Bright Data'],status:'按授权与接口验证'},
  {id:'pinterest',name:'Pinterest',detail:'品牌主页、商品与视觉内容',logo:'pinterest',providers:['Apify','Bright Data'],status:'公开页面采集'},
  {id:'reddit',name:'Reddit',detail:'品牌讨论、行业社群与需求信号',logo:'reddit',providers:['Apify','Bright Data'],status:'公开内容 / API 条款'},
  {id:'threads',name:'Threads',detail:'品牌账号与公开社交内容',logo:'threads',providers:['Apify'],status:'能力需逐项验证'},
  {id:'telegram',name:'Telegram',detail:'公开频道、企业社群与联系方式',logo:'telegram',providers:['Apify'],status:'仅公开频道 / 授权范围'},
  {id:'vk',name:'VK',detail:'俄语市场企业与品牌社交主页',logo:'vk',providers:['Apify','Bright Data'],status:'能力需逐项验证'},
 ]},
 {id:'search',title:'搜索引擎与地图',description:'搜索结果、本地企业、商家地址与官网发现',channels:[
  {id:'google-search',name:'Google Search',detail:'关键词搜索、企业官网与采购意向页面',logo:'google',providers:['Apify','Bright Data'],status:'搜索结果数据服务'},
  {id:'google-maps',name:'Google Maps',detail:'本地企业、商家类别、电话与地址',logo:'googlemaps',providers:['Apify','Bright Data'],status:'按服务商产品与条款验证'},
  {id:'bing',name:'Microsoft Bing',detail:'网页、企业与本地商业搜索',logo:'bing',providers:['Bright Data','Apify'],status:'搜索结果 / 公开网页'},
  {id:'yandex',name:'Yandex',detail:'俄罗斯及周边市场搜索与地图',logo:'yandex',providers:['Apify','Bright Data'],status:'按地区验证'},
  {id:'baidu',name:'百度',detail:'中国大陆网页与企业信息搜索',logo:'baidu',providers:['Apify','Octoparse'],status:'按站点与条款验证'},
  {id:'naver',name:'Naver',detail:'韩国搜索、企业与本地商家',logo:'naver',providers:['Apify','Bright Data'],status:'按接口验证'},
  {id:'yelp',name:'Yelp',detail:'本地商家、服务企业与评价信息',logo:'yelp',providers:['Apify','Bright Data'],status:'公开数据 / API 优先'},
  {id:'apple-maps',name:'Apple Maps',detail:'商家位置与本地企业发现',logo:'apple',providers:['Apify'],status:'能力需逐项验证'},
 ]},
 {id:'b2b',title:'B2B 采购与供应商平台',description:'进口商、采购商、制造商、批发商及供应商',channels:[
  {id:'alibaba',name:'Alibaba.com',detail:'全球供应商、产品与企业线索',logo:'alibaba',providers:['Apify','Octoparse'],status:'页面 / 授权方式验证'},
  {id:'made-in-china',name:'Made-in-China',detail:'中国制造商、供应商与产品目录',logo:'',providers:['Apify','Octoparse'],status:'公开页面采集'},
  {id:'globalsources',name:'Global Sources',detail:'采购商、供应商与展会企业',logo:'',providers:['Apify','Octoparse'],status:'公开页面采集'},
  {id:'tradekey',name:'TradeKey',detail:'全球买家、卖家与贸易询盘',logo:'',providers:['Apify','Octoparse'],status:'公开页面采集'},
  {id:'ec21',name:'EC21',detail:'国际贸易企业与产品目录',logo:'',providers:['Apify','Octoparse'],status:'公开页面采集'},
  {id:'kompass',name:'Kompass',detail:'全球企业名录与行业分类',logo:'',providers:['Apify','Octoparse'],status:'需遵循数据许可'},
  {id:'europages',name:'Europages',detail:'欧洲企业、制造商与经销商',logo:'',providers:['Apify','Octoparse'],status:'公开页面 / 许可验证'},
  {id:'thomasnet',name:'Thomasnet',detail:'北美工业供应商与制造商',logo:'',providers:['Apify','Bright Data'],status:'公开页面 / 许可验证'},
  {id:'indiamart',name:'IndiaMART',detail:'印度供应商、批发商与制造商',logo:'',providers:['Apify','Octoparse'],status:'按站点规则验证'},
  {id:'1688',name:'1688',detail:'中国大陆供应商与批发商',logo:'',providers:['Apify','Octoparse'],status:'授权与访问方式验证'},
 ]},
 {id:'ecommerce',title:'电商平台与跨境店铺',description:'品牌、卖家、店铺、商品与经营类目',channels:[
  {id:'amazon',name:'Amazon',detail:'品牌、卖家、店铺与商品目录',logo:'amazon',providers:['Apify','Bright Data','跨境魔方'],status:'按市场与数据产品验证'},
  {id:'ebay',name:'eBay',detail:'商家、品牌与商品经营者',logo:'ebay',providers:['Apify','Bright Data'],status:'公开数据 / API 优先'},
  {id:'walmart',name:'Walmart Marketplace',detail:'美国市场品牌与第三方卖家',logo:'walmart',providers:['Apify','Bright Data'],status:'按数据集验证'},
  {id:'etsy',name:'Etsy',detail:'独立品牌、手工品卖家与店铺',logo:'etsy',providers:['Apify','Bright Data'],status:'公开页面 / API 优先'},
  {id:'shopify',name:'Shopify 独立店铺',detail:'Shopify 商家、品牌官网与商品',logo:'shopify',providers:['Apify','Bright Data','Firecrawl'],status:'店铺发现与网站抓取'},
  {id:'aliexpress',name:'AliExpress',detail:'跨境卖家、品牌与商品线索',logo:'aliexpress',providers:['Apify','跨境魔方'],status:'能力需逐项验证'},
  {id:'temu',name:'Temu',detail:'平台商家与商品经营线索',logo:'',providers:['Apify','跨境魔方'],status:'能力需逐项验证'},
  {id:'tiktok-shop',name:'TikTok Shop',detail:'店铺、品牌与跨境卖家',logo:'tiktok',providers:['Apify','跨境魔方'],status:'按地区与接口验证'},
  {id:'shopee',name:'Shopee',detail:'东南亚及台湾地区店铺',logo:'',providers:['Apify','跨境魔方'],status:'按市场与数据产品验证'},
  {id:'lazada',name:'Lazada',detail:'东南亚电商品牌与卖家',logo:'',providers:['Apify','跨境魔方'],status:'按市场与数据产品验证'},
  {id:'mercadolibre',name:'Mercado Libre',detail:'拉美电商卖家与品牌',logo:'',providers:['Apify','跨境魔方'],status:'能力需逐项验证'},
 ]},
 {id:'web',title:'企业官网与公开网页',description:'公司官网、产品、联系页面及网站技术信息',channels:[
  {id:'company-sites',name:'企业官方网站',detail:'About、Contact、Products、Wholesale 页面',logo:'chrome',providers:['Firecrawl','Apify','Octoparse','Bright Data'],status:'网站抓取与结构化提取'},
  {id:'directories',name:'企业黄页 / 商业目录',detail:'行业名录、公司目录与本地黄页',logo:'',providers:['Apify','Octoparse','Bright Data'],status:'逐站点检查许可'},
  {id:'news',name:'新闻与媒体网站',detail:'企业新闻、融资、扩张与采购动态',logo:'',providers:['Firecrawl','Apify','Bright Data'],status:'公开网页'},
  {id:'job-sites',name:'招聘网站',detail:'招聘职位、扩张信号与企业规模线索',logo:'',providers:['Apify','Bright Data'],status:'公开职位 / 条款验证'},
  {id:'whois',name:'域名 / DNS 信息',detail:'域名注册与网站基础信息（可用字段受限）',logo:'cloudflare',providers:['Apify','Bright Data'],status:'公开字段与隐私限制'},
  {id:'review-sites',name:'评价 / 点评网站',detail:'企业评价、产品口碑与门店信息',logo:'trustpilot',providers:['Apify','Octoparse'],status:'公开页面 / API 优先'},
 ]},
 {id:'trade',title:'贸易、进出口与企业数据库',description:'贸易记录、海关数据、企业注册与商业信息',channels:[
  {id:'trade-records',name:'进出口 / 海关数据',detail:'进口商、出口商、货运与产品线索',logo:'',providers:['跨境魔方','Apify'],status:'取决于数据授权与覆盖国家'},
  {id:'company-registry',name:'企业注册信息',detail:'注册主体、企业状态与公开登记资料',logo:'',providers:['Apify','Bright Data'],status:'各国登记机关差异较大'},
  {id:'business-data',name:'商业数据库 / 信用信息',detail:'企业规模、营收区间与商业关系',logo:'',providers:['Apify'],status:'需购买数据许可或独立 API'},
  {id:'exhibitors',name:'展会 / 参展商名录',detail:'参展企业、品牌、采购商与行业活动',logo:'',providers:['Apify','Octoparse','Firecrawl'],status:'公开展商目录'},
 ]},
]

const providers = [
 {name:'Apify',category:'多渠道采集执行',description:'Actors 可覆盖搜索、地图、社媒公开页面及网站采集，具体取决于 Actor 与授权。',channels:'Google · Maps · 社媒 · 网站'},
 {name:'Bright Data',category:'网页数据基础设施',description:'搜索结果与公开网页数据产品，具体平台覆盖以已购买的数据产品为准。',channels:'搜索引擎 · 公开网页'},
 {name:'Octoparse',category:'结构化网页采集',description:'适合配置型网站采集与商业目录数据抽取，不代表所有站点均可访问。',channels:'企业网站 · 商业目录'},
 {name:'Firecrawl',category:'网站抓取与提取',description:'用于官网发现后的网页抓取、页面解析与结构化信息补全。',channels:'企业官网 · 联系页 · 产品页'},
 {name:'PhantomBuster',category:'社交自动化工作流',description:'社交工作流能力受平台条款、账户授权及产品更新影响。',channels:'LinkedIn · 社交渠道'},
 {name:'TexAu',category:'自动化工作流',description:'自动化工作流平台，具体渠道按当前可用模块与授权核验。',channels:'社交渠道 · 自动化'},
 {name:'跨境魔方',category:'跨境电商数据',description:'用于跨境店铺、品牌与卖家数据；以实际 API 套餐覆盖范围为准。',channels:'跨境店铺 · 品牌 · 卖家'},
]
const workflow = [
 {title:'多渠道发现企业',detail:'按画像分发到已配置的数据源，收集企业名称、网站和来源证据。',icon:Search},
 {title:'企业识别与去重',detail:'优先使用域名、企业标识、电话及名称地址相似度识别重复企业。',icon:ShieldCheck},
 {title:'企业信息补全',detail:'提取官网介绍、产品、公开企业邮箱、电话、地址和社交链接。',icon:Building2},
 {title:'联系人发现',detail:'围绕已确认企业寻找采购、管理及业务负责人，并建立关联。',icon:Users},
 {title:'AI 分析与待审核',detail:'评估匹配度和可信度，结果先进入待处理线索，等待人工审核。',icon:Inbox},
]
const defaultModel = 'Works AI'

function Logo({slug,name}:{slug:string;name:string}) {
 const [failed,setFailed] = useState(false)
 return slug && !failed ? <img className="lead-channel-logo" src={'https://cdn.simpleicons.org/'+slug} alt="" onError={()=>setFailed(true)}/> : <span className="lead-channel-logo-fallback">{name.slice(0,1)}</span>
}
function CountryMap({selected}:{selected:Country[]}) {
 const [geo,setGeo] = useState<FeatureCollection<Geometry> | null>(null)
 useEffect(()=>{let alive=true;fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson').then(r=>r.json()).then(data=>{if(alive)setGeo(data)}).catch(()=>{if(alive)setGeo(null)});return()=>{alive=false}},[])
 const selectedNames = new Set(selected.map(c=>c.geoName.toLowerCase()))
 const selectedCodes = new Set(selected.map(c=>c.code))
 const style = (feature?:Feature):PathOptions => {
  const props = feature?.properties as Record<string,string> | undefined
  const name = (props?.ADMIN || props?.name || props?.NAME || '').toLowerCase()
  const code = props?.ISO_A2 || props?.ISO3166_1_Alpha_2 || props?.ISO2 || ''
  const picked = selectedCodes.has(code) || selectedNames.has(name) || (name==='china' && selected.some(c=>c.code==='CN')) || (name.includes('hong kong') && selected.some(c=>c.code==='HK')) || (name.includes('macao') && selected.some(c=>c.code==='MO')) || (name==='taiwan' && selected.some(c=>c.code==='TW'))
  return {color:picked?'#714b67':'#c8c4c8',weight:picked?1.5:.55,fillColor:picked?'#a887a0':'#e8e6e8',fillOpacity: picked ? 0.72 : 0.32}
 }
 return <div className="lead-map-shell">
  <MapContainer center={[24,5]} zoom={1.35} minZoom={1} maxZoom={7} scrollWheelZoom={false} worldCopyJump style={{height:300,width:'100%'}}>
   <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
   {geo && <GeoJSON key={selected.map(c=>c.code).sort().join(',')} data={geo} style={style} onEachFeature={(feature,layer:Layer)=>{const p=feature.properties as Record<string,string>;layer.bindTooltip(p?.ADMIN || p?.name || '')}}/>}
  </MapContainer>
  <div className="lead-map-caption"><span><i/> 已选国家 / 地区</span><span>OpenStreetMap · GeoJSON 边界</span></div>
  {!geo && <div className="lead-map-loading">地图边界加载中；请检查网络连接。</div>}
 </div>
}

export default function LeadFinderApp() {
 const { user, workspace } = useAuth()
 const [inboxRecords,setInboxRecords] = useState<InboxRecord[]>([])
 const [inboxLoading,setInboxLoading] = useState(false)
 const [inboxError,setInboxError] = useState('')
 const [duplicateCandidates,setDuplicateCandidates] = useState<{id:string;record_id:string;candidate_record_id:string;match_type:string;confidence:number;resolution:string}[]>([])
 const [tab,setTab] = useState<Tab>('search')
 const [product,setProduct] = useState('')
 const [industry,setIndustry] = useState('')
 const [selectedCountries,setSelectedCountries] = useState<string[]>([])
 const [countryQuery,setCountryQuery] = useState('')
 const [countryOpen,setCountryOpen] = useState(false)
 const [targetType,setTargetType] = useState<TargetType>('both')
 const [quantity,setQuantity] = useState('500')
 const [keywords,setKeywords] = useState('')
 const [selectedChannels,setSelectedChannels] = useState<string[]>(channelGroups.flatMap(g=>g.channels.map(c=>c.id)))
 const [expandedGroups,setExpandedGroups] = useState<string[]>(['social','search'])
 const [channelQuery,setChannelQuery] = useState('')
 const [showPlan,setShowPlan] = useState(false)
 const [selectedModel,setSelectedModel] = useState(defaultModel)
 const [availableModels,setAvailableModels] = useState<AvailableAiModel[]>([])
 useEffect(()=>{
  if(!supabase||!workspace){setAvailableModels([]);setSelectedModel(defaultModel);return}
  let alive=true
  supabase.from('ai_model_configs').select('provider_key,provider_name,model_name,is_default').eq('workspace_id',workspace.id).eq('status','connected').eq('is_enabled',true).order('is_default',{ascending:false}).then(({data})=>{
   if(!alive)return
   const models=(data||[]) as AvailableAiModel[];setAvailableModels(models)
   if(selectedModel!==defaultModel&&!models.some(m=>selectedModel===m.provider_key+':'+m.model_name))setSelectedModel(defaultModel)
  })
  return ()=>{alive=false}
 },[workspace?.id])
 const [tasks,setTasks] = useState<SearchTask[]>([])
 const [tasksLoading,setTasksLoading] = useState(false)
 const [taskError,setTaskError] = useState('')
 const [taskSubmitting,setTaskSubmitting] = useState(false)
 const [launchTaskId,setLaunchTaskId] = useState<string|null>(null)
 const [launchBusy,setLaunchBusy] = useState(false)
 const [launchConsent,setLaunchConsent] = useState(false)
 const [launchError,setLaunchError] = useState('')
 const [activeTask,setActiveTask] = useState<string|null>(null)
 const [editingTask,setEditingTask] = useState<SearchTask|null>(null)
 const [editName,setEditName] = useState('')
 const [editCriteria,setEditCriteria] = useState('')
 const [editTargetCount,setEditTargetCount] = useState('100')
 const [taskActionBusy,setTaskActionBusy] = useState(false)
 const [taskLogs,setTaskLogs] = useState<TaskLog[]>([])
 const [taskLogsLoading,setTaskLogsLoading] = useState(false)
 const [reviewFilter,setReviewFilter] = useState('all')
 const refreshTasks=async()=>{
  if(!supabase||!workspace){setTasks([]);return}
  setTasksLoading(true);setTaskError('')
  const {data,error}=await supabase.from('lead_search_tasks').select('id,name,status,target_profile,selected_channels,target_count,discovered_count,unique_company_count,unique_contact_count,actual_cost,created_at').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(100)
  if(error)setTaskError(error.message)
  else setTasks((data||[]).map(row=>{const profile=(row.target_profile||{}) as Record<string,unknown>;const statusKey=row.status;return {id:row.id,name:row.name,criteria:String(profile.criteria||''),createdAt:new Date(row.created_at).toLocaleString(),channels:(row.selected_channels||[]).length,statusKey,status:statusKey==='draft'?'草稿 / 待配置数据源':statusKey==='queued'?'排队中':statusKey==='running'?'执行中':statusKey==='completed'?'已完成':statusKey==='failed'?'失败':statusKey==='cancelled'?'已取消':'已暂停',discoveredCount:row.discovered_count||0,companyCount:row.unique_company_count||0,contactCount:row.unique_contact_count||0,actualCost:row.actual_cost,modelName:String(profile.ai_model||defaultModel),targetProfile:profile,targetCount:Number(row.target_count)||100}}))
  setTasksLoading(false)
 }
 useEffect(()=>{void refreshTasks()},[workspace?.id])
 const refreshTaskLogs=async(taskId:string)=>{if(!supabase||!workspace)return;setTaskLogsLoading(true);const {data,error}=await supabase.from('integration_events').select('id,message,status,created_at,details').eq('workspace_id',workspace.id).eq('action','update').contains('details',{event_type:'lead_task_log',task_id:taskId}).order('created_at',{ascending:false}).limit(150);if(!error)setTaskLogs((data||[]) as TaskLog[]);setTaskLogsLoading(false)}
 useEffect(()=>{if(!activeTask||!workspace?.id)return;void refreshTaskLogs(activeTask);const timer=window.setInterval(()=>{void refreshTasks();void refreshTaskLogs(activeTask)},3000);return()=>window.clearInterval(timer)},[activeTask,workspace?.id])
 const refreshInbox = async()=>{
  if(!supabase||!workspace)return
  setInboxLoading(true);setInboxError('')
  const [recordsResult,duplicatesResult]=await Promise.all([
   supabase.from('lead_inbox_records').select('id,record_type,review_status,display_name,country_name,website,email,phone,job_title,ai_score,ai_summary,discovered_at,normalized_domain,normalized_email,source_record_id,lead_source_records(provider_key,channel_key,source_url,source_title)').eq('workspace_id',workspace.id).order('discovered_at',{ascending:false}).limit(500),
   supabase.from('lead_inbox_duplicate_candidates').select('id,record_id,candidate_record_id,match_type,confidence,resolution').eq('workspace_id',workspace.id).eq('resolution','unresolved').order('confidence',{ascending:false}).limit(500)
  ])
  if(recordsResult.error)setInboxError(recordsResult.error.message);else setInboxRecords((recordsResult.data||[]) as unknown as InboxRecord[])
  if(!duplicatesResult.error)setDuplicateCandidates((duplicatesResult.data||[]) as typeof duplicateCandidates)
  setInboxLoading(false)
 }
 useEffect(()=>{if(tab==='review')void refreshInbox()},[tab,workspace?.id])
 const reviewRecord = async(record:InboxRecord,status:'pending'|'approved'|'rejected'|'duplicate',action:'approve'|'reject'|'mark_duplicate'|'unmark_duplicate')=>{
  if(!supabase||!workspace||!user)return
  const updatePayload:Record<string,unknown>={review_status:status,reviewed_by:user.id,reviewed_at:new Date().toISOString()};if(status==='pending')updatePayload.duplicate_of=null
  const {error}=await supabase.from('lead_inbox_records').update(updatePayload).eq('id',record.id).eq('workspace_id',workspace.id)
  if(error){setInboxError(error.message);return}
  await supabase.from('lead_inbox_review_events').insert({workspace_id:workspace.id,record_id:record.id,actor_id:user.id,action})
  await refreshInbox()
 }
 const promoteRecord = async(record:InboxRecord)=>{
  if(!supabase)return
  const {error}=await supabase.rpc('promote_lead_inbox_record',{p_record_id:record.id})
  if(error){setInboxError(error.message);return}
  await refreshInbox()
 }
 const resolveDuplicate = async(id:string,resolution:'same_entity'|'different_entity')=>{
  if(!supabase||!workspace||!user)return
  const workspaceId=workspace.id;const userId=user.id
  const candidate=duplicateCandidates.find(item=>item.id===id)
  const {error}=await supabase.from('lead_inbox_duplicate_candidates').update({resolution,resolved_by:userId,resolved_at:new Date().toISOString()}).eq('id',id)
  if(error){setInboxError(error.message);return}
  if(resolution==='same_entity'&&candidate){const {error:recordError}=await supabase.from('lead_inbox_records').update({review_status:'duplicate',duplicate_of:candidate.candidate_record_id,reviewed_by:userId,reviewed_at:new Date().toISOString()}).eq('id',candidate.record_id).eq('workspace_id',workspaceId);if(recordError){setInboxError(recordError.message);return}await supabase.from('lead_inbox_review_events').insert({workspace_id:workspaceId,record_id:candidate.record_id,actor_id:userId,action:'mark_duplicate',note:'人工确认与候选记录为同一主体'})}
  await refreshInbox()
 }
 const selectedCountryItems = countries.filter(c=>selectedCountries.includes(c.code))
 const selectedNames = useMemo(()=>channelGroups.flatMap(g=>g.channels).filter(c=>selectedChannels.includes(c.id)).map(c=>c.name),[selectedChannels])
 const activeTaskData = tasks.find(t=>t.id===activeTask)
 const statusTone=(key:string)=>key==='completed'?'success':key==='failed'?'danger':key==='running'?'info':key==='queued'?'warning':key==='cancelled'?'muted':'draft'
 const launchTaskData=tasks.find(t=>t.id===launchTaskId)
 const confirmLaunch=async()=>{
  if(!supabase||!workspace||!launchTaskId||!launchConsent)return
  setLaunchBusy(true);setLaunchError('')
  const {data,error}=await supabase.functions.invoke('enqueue-lead-search',{body:{workspace_id:workspace.id,task_id:launchTaskId,confirm_cost:true}})
  if(error||data?.error){setLaunchError(data?.error||error?.message||'无法启动搜索任务');setLaunchBusy(false);return}
  setLaunchTaskId(null);setLaunchConsent(false);setLaunchBusy(false);await refreshTasks()
 }
 const saveTaskEdit=async()=>{if(!supabase||!workspace||!editingTask)return;setTaskActionBusy(true);setTaskError('');const targetProfile={...editingTask.targetProfile,criteria:editCriteria,quantity:editTargetCount};const {error}=await supabase.from('lead_search_tasks').update({name:editName.trim(),target_profile:targetProfile,target_count:Math.max(1,Number(editTargetCount)||1),updated_at:new Date().toISOString()}).eq('id',editingTask.id).eq('workspace_id',workspace.id).eq('status','draft');if(error)setTaskError(error.message);else{setEditingTask(null);await refreshTasks()}setTaskActionBusy(false)}
 const cancelTask=async(task:SearchTask)=>{if(!supabase||!workspace||!window.confirm('确定取消任务“'+task.name+'”吗？已提交到第三方服务商的运行可能无法即时停止，仍可能产生费用。'))return;setTaskActionBusy(true);setTaskError('');const now=new Date().toISOString();const {error:runError}=await supabase.from('lead_task_runs').update({status:'cancelled',locked_by:null,lease_expires_at:null,completed_at:now,error_message:'Cancelled by workspace user'}).eq('task_id',task.id).eq('workspace_id',workspace.id).in('status',['queued','running']);if(runError){setTaskError(runError.message);setTaskActionBusy(false);return}const {error}=await supabase.from('lead_search_tasks').update({status:'cancelled',completed_at:now,updated_at:now}).eq('id',task.id).eq('workspace_id',workspace.id).in('status',['queued','running','draft']);if(error)setTaskError(error.message);else{await supabase.from('integration_events').insert({workspace_id:workspace.id,provider_key:'ouranos',provider_name:'Ouranos 搜索任务',action:'update',status:'pending',message:'用户已取消搜索任务',created_by:user?.id||null,details:{event_type:'lead_task_log',task_id:task.id,stage:'cancelled'}});await refreshTasks()}setTaskActionBusy(false)}
 const deleteTask=async(task:SearchTask)=>{if(!supabase||!workspace||!window.confirm('确定永久删除任务“'+task.name+'”吗？任务执行记录将一并删除，已发现的线索和来源证据会保留。'))return;setTaskActionBusy(true);setTaskError('');const {error}=await supabase.from('lead_search_tasks').delete().eq('id',task.id).eq('workspace_id',workspace.id);if(error)setTaskError(error.message);else{if(activeTask===task.id)setActiveTask(null);await refreshTasks()}setTaskActionBusy(false)}
 const beginTaskEdit=(task:SearchTask)=>{setEditingTask(task);setEditName(task.name);setEditCriteria(task.criteria);setEditTargetCount(String(task.targetCount))}
 const retryTask=async(task:SearchTask)=>{if(!supabase||!workspace)return;setTaskActionBusy(true);setTaskError('');const now=new Date().toISOString();const {error:runError}=await supabase.from('lead_task_runs').update({status:'queued',attempt_count:0,provider_job_id:null,provider_status:null,provider_cursor:null,output_cursor:null,error_message:null,retryable:true,next_retry_at:null,locked_by:null,lease_expires_at:null,completed_at:null,started_at:null,updated_at:now}).eq('task_id',task.id).eq('workspace_id',workspace.id).eq('status','failed');if(runError){setTaskError(runError.message);setTaskActionBusy(false);return}const {error}=await supabase.from('lead_search_tasks').update({status:'draft',completed_at:null,cost_approved:false,cost_approved_at:null,cost_approved_by:null,updated_at:now}).eq('id',task.id).eq('workspace_id',workspace.id).eq('status','failed');if(error)setTaskError(error.message);else await refreshTasks();setTaskActionBusy(false)}
 const toggleCountry = (code:string)=>setSelectedCountries(current=>current.includes(code)?current.filter(c=>c!==code):[...current.filter(c=>c!==code),code])
 const toggleChannel = (id:string)=>setSelectedChannels(current=>current.includes(id)?current.filter(c=>c!==id):[...current,id])
 const canPlan = Boolean(product.trim()||industry.trim()||keywords.trim())
 const createTask = async()=>{
  if(!supabase||!workspace||!user)return
  setTaskSubmitting(true);setTaskError('')
  const criteria=[selectedCountryItems.length?selectedCountryItems.map(c=>c.name).join('、'):'全球',industry,product,targetType==='companies'?'企业':targetType==='contacts'?'联系人':'企业 + 联系人'].filter(Boolean).join(' · ')
  const taskName=product.trim()||industry.trim()||'全球潜在客户搜索'
  const {data,error}=await supabase.from('lead_search_tasks').insert({
   workspace_id:workspace.id,created_by:user.id,name:taskName,status:'draft',
   target_profile:{product,industry,countries:selectedCountryItems.map(c=>({code:c.code,name:c.name})),target_type:targetType,quantity,keywords,ai_model:selectedModel,criteria},
   selected_channels:selectedChannels,target_count:quantity==='custom'?500:Number(quantity)
  }).select('id,name,status,selected_channels,created_at').single()
  if(error){setTaskError(error.message);setTaskSubmitting(false);return}
  const task:SearchTask={id:data.id,name:data.name,criteria,createdAt:new Date(data.created_at).toLocaleString(),channels:(data.selected_channels||[]).length,status:'草稿 / 待配置数据源',statusKey:'draft',discoveredCount:0,companyCount:0,contactCount:0,actualCost:null,modelName:selectedModel,targetProfile:{product,industry,countries:selectedCountryItems.map(x=>({code:x.code,name:x.name})),target_type:targetType,quantity,keywords,ai_model:selectedModel,criteria},targetCount:quantity==='custom'?500:Number(quantity)}
  setTasks(current=>[task,...current]);setActiveTask(task.id);setShowPlan(false);setTab('tasks');setTaskSubmitting(false)
 }
 const visibleChannels = channelGroups.map(g=>({...g,channels:g.channels.filter(c=>(c.name+c.detail+c.providers.join('')).toLowerCase().includes(channelQuery.toLowerCase()))})).filter(g=>g.channels.length)

 return <div className="lead-workspace">
  <div className="lead-page-head"><div><div className="lead-eyebrow">PROSPECTING / LEAD DISCOVERY</div><h1>潜在客户搜索</h1><p>跨渠道发现目标企业与联系人，经过人工审核后再转入正式客户目录。</p></div><div className="lead-head-actions"><span className="lead-mode-pill"><Sparkles size={14}/> AI 智能规划</span></div></div>
  <div className="lead-tabs" role="tablist" aria-label="潜在客户搜索导航">
   <button className={tab==='search'?'active':''} onClick={()=>{setTab('search');setActiveTask(null)}}><Target size={16}/> 创建搜索</button>
   <button className={tab==='tasks'?'active':''} onClick={()=>{setTab('tasks');setActiveTask(null)}}><Workflow size={16}/> 搜索任务 <span>{tasks.length}</span></button>
   <button className={tab==='review'?'active':''} onClick={()=>{setTab('review');setActiveTask(null)}}><Inbox size={16}/> 待处理线索 <span>{inboxRecords.filter(r=>r.review_status!=='promoted').length}</span></button>
  </div>

  {tab==='search'&&<LeadDiscoveryWizard workspaceId={workspace?.id||''} userId={user?.id||''} onTaskCreated={()=>{void refreshTasks();setTab('tasks')}}/>}

  {tab==='tasks'&&<div className="lead-content-panel">{activeTaskData?<div className="lead-task-detail"><button className="lead-back-button" onClick={()=>setActiveTask(null)}><ArrowLeft size={15}/> 返回任务列表</button><div className="lead-task-title-row"><div><span className="lead-step">SEARCH TASK</span><h2>{activeTaskData.name}</h2><p>{activeTaskData.criteria}</p></div><span className={'lead-status '+statusTone(activeTaskData.statusKey)}>{activeTaskData.status}</span></div><div className="lead-task-detail-actions">{activeTaskData.statusKey==='draft'&&<><button className="lead-quiet-button" disabled={taskActionBusy} onClick={()=>beginTaskEdit(activeTaskData)}><Pencil size={14}/> 编辑</button><button className="lead-primary-button small" onClick={()=>{setLaunchTaskId(activeTaskData.id);setLaunchConsent(false);setLaunchError('')}}>开始搜索</button></>}{(activeTaskData.statusKey==='queued'||activeTaskData.statusKey==='running')&&<button className="lead-task-start danger" disabled={taskActionBusy} onClick={()=>void cancelTask(activeTaskData)}><Ban size={13}/> 取消任务</button>}{activeTaskData.statusKey==='failed'&&<button className="lead-primary-button small" disabled={taskActionBusy} onClick={()=>void retryTask(activeTaskData)}><RefreshCw size={13}/> 重试任务</button>}{!['queued','running'].includes(activeTaskData.statusKey)&&<button className="lead-task-start danger" disabled={taskActionBusy} onClick={()=>void deleteTask(activeTaskData)}><Trash2 size={13}/> 删除任务</button>}</div>{editingTask?.id===activeTaskData.id&&<div className="lead-cost-confirm lead-task-edit"><div className="lead-task-edit-head"><h3>编辑搜索任务</h3><button className="lead-quiet-button" onClick={()=>setEditingTask(null)} aria-label="关闭"><X size={14}/></button></div><label>任务名称<input value={editName} onChange={e=>setEditName(e.target.value)} maxLength={120}/></label><label>搜索条件摘要<input value={editCriteria} onChange={e=>setEditCriteria(e.target.value)} maxLength={500}/></label><label>目标记录数量<input type="number" min="1" max="100000" value={editTargetCount} onChange={e=>setEditTargetCount(e.target.value)}/></label><div><button className="lead-primary-button small" disabled={taskActionBusy||!editName.trim()||Number(editTargetCount)<1} onClick={()=>void saveTaskEdit()}><Save size={13}/>{taskActionBusy?'正在保存…':'保存修改'}</button><button className="lead-quiet-button" disabled={taskActionBusy} onClick={()=>setEditingTask(null)}>取消</button></div></div>}{launchTaskId===activeTaskData.id&&<div className="lead-cost-confirm"><h3>启动搜索任务：{activeTaskData.name}</h3><p>第三方服务商可能按 Actor 运行、抓取条数或 API 用量收费。</p><label><input type="checkbox" checked={launchConsent} onChange={e=>setLaunchConsent(e.target.checked)}/> 我已了解并同意本次任务可能产生第三方 API 费用。</label>{launchError&&<div className="lead-review-error">{launchError}</div>}<div><button className="lead-primary-button small" disabled={!launchConsent||launchBusy} onClick={()=>void confirmLaunch()}>{launchBusy?'正在提交…':'确认费用并启动'}</button><button className="lead-quiet-button" disabled={launchBusy} onClick={()=>setLaunchTaskId(null)}>返回</button></div></div>}{taskError&&<div className="lead-review-error">{taskError}</div>}<div className="lead-notice"><CircleHelp size={18}/><div><b>{activeTaskData.statusKey==='draft'?'任务草稿，尚未启动':activeTaskData.statusKey==='queued'?'任务已进入执行队列':activeTaskData.statusKey==='running'?'搜索任务正在执行':activeTaskData.statusKey==='completed'?'搜索任务已完成':activeTaskData.statusKey==='failed'?'搜索任务执行失败':'任务已取消'}</b><p>{activeTaskData.statusKey==='running'?'执行日志会自动刷新，展示 Worker 领取、参数校验、服务商提交和结果获取进度。':'搜索结果只会进入待处理线索，经过人工审核后才能转入正式目录。'}</p></div></div><div className="lead-task-metrics"><div><b>{activeTaskData.discoveredCount}</b><span>发现记录</span></div><div><b>{activeTaskData.companyCount}</b><span>唯一企业</span></div><div><b>{activeTaskData.contactCount}</b><span>联系人</span></div><div><b>{activeTaskData.channels}</b><span>选择渠道</span></div></div><div className="lead-card"><h3>任务信息</h3><div className="lead-summary-list"><span>任务编号</span><b>{activeTaskData.id}</b><span>创建时间</span><b>{activeTaskData.createdAt}</b><span>搜索条件</span><b>{activeTaskData.criteria}</b><span>AI 模型</span><b>{activeTaskData.modelName}</b><span>实际费用</span><b>{activeTaskData.actualCost===null?'待统计':activeTaskData.actualCost}</b></div></div><div className="lead-card lead-task-log-card"><div className="lead-task-log-heading"><div><h3>执行日志</h3><p>自动刷新 · 最新日志优先</p></div><button className="lead-quiet-button" onClick={()=>void refreshTaskLogs(activeTaskData.id)}><RefreshCw size={13}/> 刷新日志</button></div>{taskLogsLoading&&!taskLogs.length?<div className="lead-empty-state">正在读取执行日志…</div>:taskLogs.length?<div className="lead-task-log-list">{taskLogs.map(log=><div className="lead-task-log-item" key={log.id}><i className={'log-dot '+((log.status==='failure'||log.status==='error')?'error':log.status==='success'?'success':'info')}/><time>{new Date(log.created_at).toLocaleString()}</time><span>{log.message}</span>{typeof log.details?.channel_key==='string'&&<small>{String(log.details.channel_key)}</small>}</div>)}</div>:<div className="lead-empty-state"><h3>{activeTaskData.statusKey==='running'||activeTaskData.statusKey==='queued'?'等待 Worker 写入执行日志':'暂无执行日志'}</h3><p>任务进入执行队列后，领取、参数验证、服务商调用和结果处理会记录在这里。</p></div>}</div></div>:<><div className="lead-content-heading"><div><h2>搜索任务</h2><p>查看已创建的客户发现任务。</p></div><div className="lead-task-head-actions"><button className="lead-quiet-button" onClick={()=>void refreshTasks()}><RefreshCw size={13}/> 刷新</button><button className="lead-primary-button small" onClick={()=>{setTab('search');setShowPlan(false)}}><Plus size={15}/> 新建搜索</button></div></div>{taskError&&<div className="lead-review-error">{taskError}</div>}{tasksLoading?<div className="lead-empty-state">正在读取任务…</div>:tasks.length?<div className="lead-task-list">{tasks.map(task=><div className="lead-task-row" key={task.id}><button className="lead-task-open" onClick={()=>setActiveTask(task.id)}><span className="lead-task-symbol"><Target size={18}/></span><span className="lead-task-copy"><b>{task.name}</b><small>{task.criteria} · {task.createdAt} · 已发现 {task.discoveredCount} 条</small></span><span className={'lead-status '+statusTone(task.statusKey)}>{task.status}</span><ArrowRight size={16}/></button></div>)}</div>:<div className="lead-empty-state"><span><Search size={24}/></span><h3>还没有搜索任务</h3><p>定义目标客户并生成 AI 搜索计划。</p><button className="lead-primary-button" onClick={()=>setTab('search')}>创建第一个搜索 <ArrowRight size={15}/></button></div>}</>}</div>}

  {tab==='review'&&<div className="lead-content-panel"><div className="lead-content-heading"><div><h2>待处理线索</h2><p>真实数据库记录。审核、去重后，只有你主动转入才会创建正式企业或联系人。</p></div><span className="lead-status pending"><Inbox size={13}/> {inboxRecords.filter(r=>r.review_status==='pending').length} 条待审核</span></div><div className="lead-review-toolbar"><div className="lead-review-filters"><button className={reviewFilter==='all'?'selected':''} onClick={()=>setReviewFilter('all')}>全部（{inboxRecords.length}）</button><button className={reviewFilter==='companies'?'selected':''} onClick={()=>setReviewFilter('companies')}>企业</button><button className={reviewFilter==='contacts'?'selected':''} onClick={()=>setReviewFilter('contacts')}>联系人</button><button className={reviewFilter==='duplicates'?'selected':''} onClick={()=>setReviewFilter('duplicates')}>疑似重复（{duplicateCandidates.length}）</button><button className={reviewFilter==='approved'?'selected':''} onClick={()=>setReviewFilter('approved')}>已审核</button></div><button className="lead-quiet-button" onClick={()=>void refreshInbox()}><Database size={14}/> 刷新</button></div>{inboxError&&<div className="lead-review-error">{inboxError}</div>}{inboxLoading?<div className="lead-empty-state"><span><Clock3 size={24}/></span><h3>正在读取待处理线索…</h3></div>:<div className="lead-inbox-list">{inboxRecords.filter(r=>reviewFilter==='all'?r.review_status!=='promoted':reviewFilter==='companies'?r.record_type==='company'&&r.review_status!=='promoted':reviewFilter==='contacts'?r.record_type==='contact'&&r.review_status!=='promoted':reviewFilter==='duplicates'?duplicateCandidates.some(d=>d.record_id===r.id||d.candidate_record_id===r.id)||r.review_status==='duplicate':reviewFilter==='approved'?r.review_status==='approved':true).map(record=>{const related=duplicateCandidates.filter(d=>d.record_id===record.id||d.candidate_record_id===record.id);const source=record.lead_source_records;return <article className="lead-inbox-card" key={record.id}><div className="lead-inbox-card-head"><span className="lead-inbox-type">{record.record_type==='company'?<Building2 size={14}/>:<Users size={14}/>} {record.record_type==='company'?'企业':'联系人'}</span><span className={'lead-inbox-status '+record.review_status}>{record.review_status==='pending'?'待审核':record.review_status==='approved'?'已通过':record.review_status==='rejected'?'已拒绝':record.review_status==='duplicate'?'疑似重复':'已转入'}</span><time>{new Date(record.discovered_at).toLocaleString()}</time></div><div className="lead-inbox-main"><div><h3>{record.display_name}</h3><p>{[record.job_title,record.country_name,record.website].filter(Boolean).join(' · ')||'暂无补充信息'}</p><div className="lead-inbox-details">{record.email&&<span>{record.email}</span>}{record.phone&&<span>{record.phone}</span>}{record.normalized_domain&&<span>{record.normalized_domain}</span>}</div><small className="lead-inbox-source">来源：{source?source.provider_key+' / '+source.channel_key:'待关联来源证据'} {source?.source_url&&<a href={source.source_url} target="_blank" rel="noreferrer">查看原始来源</a>}</small></div>{record.ai_score!==null&&<span className="lead-inbox-score">{Math.round(record.ai_score)}<small>AI 分</small></span>}</div>{related.length>0&&<div className="lead-inbox-duplicates"><b><ShieldCheck size={13}/> {related.length} 条疑似重复关系</b>{related.map(d=><div key={d.id}><span>{d.match_type} · 匹配度 {Math.round(d.confidence)}%</span><button onClick={()=>void resolveDuplicate(d.id,'same_entity')}>确认重复</button><button onClick={()=>void resolveDuplicate(d.id,'different_entity')}>不是重复</button></div>)}</div>}<div className="lead-inbox-actions">{record.review_status==='duplicate'&&<button onClick={()=>void reviewRecord(record,'pending','unmark_duplicate')}>恢复待审核</button>}{record.review_status==='pending'&&<><button onClick={()=>void reviewRecord(record,'approved','approve')}><CheckCircle2 size={13}/> 审核通过</button><button onClick={()=>void reviewRecord(record,'rejected','reject')}>拒绝</button><button onClick={()=>void reviewRecord(record,'duplicate','mark_duplicate')}>标记重复</button></>}{record.review_status==='approved'&&<button className="promote" onClick={()=>void promoteRecord(record)}><UserRoundCheck size={13}/> 手动转入{record.record_type==='company'?'企业目录':'联系人库'}</button>}</div></article>})}{!inboxRecords.some(r=>reviewFilter==='all'?r.review_status!=='promoted':reviewFilter==='companies'?r.record_type==='company'&&r.review_status!=='promoted':reviewFilter==='contacts'?r.record_type==='contact'&&r.review_status!=='promoted':reviewFilter==='duplicates'?duplicateCandidates.some(d=>d.record_id===r.id||d.candidate_record_id===r.id)||r.review_status==='duplicate':reviewFilter==='approved'?r.review_status==='approved':true)&&<div className="lead-empty-state"><span><Inbox size={25}/></span><h3>暂无符合条件的线索</h3><p>搜索任务产生的记录会保存在这里。当前没有演示数据；接入搜索适配器后将自动写入待审核队列。</p><button className="lead-primary-button" onClick={()=>setTab('search')}>创建搜索任务 <ArrowRight size={15}/></button></div>}</div>}<div className="lead-review-flow"><span>搜索发现</span><ArrowRight size={14}/><b>待处理线索</b><ArrowRight size={14}/><span>人工审核 / 去重</span><ArrowRight size={14}/><span>手动转入正式目录</span></div></div>}


 </div>
}
