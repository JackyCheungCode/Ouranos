import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ExternalLink, HelpCircle, Loader2, MapPin, Search, ShieldCheck, Sparkles, MessageCircle, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { divIcon } from 'leaflet'
import type { PathOptions } from 'leaflet'
import { countries } from './countries'
import './LeadDiscoveryWizard.css'

type Props = { workspaceId: string; userId: string; onTaskCreated: () => void }
type Actor = { id: string; name: string; username: string; title: string; description: string; url: string; stats?: { totalUsers?: number; actorReviewRating?: number; actorReviewCount?: number }; currentPricingInfo?: Record<string, unknown> }
type SchemaField = { title?: string; description?: string; type?: string | string[]; editor?: string; default?: unknown; prefill?: unknown; example?: unknown; placeholderValue?: string; enum?: unknown[]; items?: SchemaField; properties?: Record<string, SchemaField>; required?: string[]; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; minItems?: number; maxItems?: number; pattern?: string; format?: string }
type JsonSchema = { properties?: Record<string, SchemaField>; required?: string[] }
type MapLocation = { lat:number; lon:number; label:string }
type ChatMessage = { role:'user'|'assistant'; content:string }
const marketMarkerIcon=divIcon({className:'ldw-map-marker',html:'<span></span>',iconSize:[22,22],iconAnchor:[11,11]})
const platformGroups = [
 { label: '搜索引擎与地图', items: [['google-maps','Google Maps','google maps business places'],['google-search','Google Search','google search results'],['bing','Bing','bing search results'],['yelp','Yelp','yelp business'] ] },
 { label: '社交媒体', items: [['instagram','Instagram','instagram profiles'],['facebook','Facebook','facebook pages'],['linkedin','LinkedIn','linkedin companies'],['tiktok','TikTok','tiktok profiles'],['youtube','YouTube','youtube channels'],['x','X / Twitter','twitter profiles'] ] },
 { label: 'B2B 与供应商平台', items: [['alibaba','Alibaba.com','alibaba suppliers'],['made-in-china','Made-in-China','made in china suppliers'],['globalsources','Global Sources','global sources suppliers'],['indiamart','IndiaMART','indiamart suppliers'] ] },
 { label: '电商平台', items: [['amazon','Amazon','amazon sellers products'],['ebay','eBay','ebay sellers'],['walmart','Walmart','walmart marketplace sellers'],['etsy','Etsy','etsy shops'],['shopify','Shopify 独立店铺','shopify stores'],['aliexpress','AliExpress','aliexpress sellers'],['temu','Temu','temu sellers'],['shopee','Shopee','shopee stores'],['lazada','Lazada','lazada sellers'] ] },
 { label: '企业网站与商业数据', items: [['company-sites','企业官方网站','company website contacts'],['directories','企业商业目录','business directory'],['exhibitors','展会参展商','exhibitor directory'],['trade-records','进出口贸易数据','import export trade data'],['company-registry','企业注册信息','company registry'] ] },
] as const
const providerByPlatform: Record<string, string[]> = {
 'google-maps':['Apify','Bright Data'], 'google-search':['Apify','Bright Data'], 'bing':['Bright Data','Apify'], yelp:['Apify','Bright Data'],
 linkedin:['Apify','PhantomBuster','TexAu'], facebook:['Apify','PhantomBuster','Bright Data'], instagram:['Apify','PhantomBuster','Bright Data'], tiktok:['Apify','Bright Data'], youtube:['Apify','Bright Data'], x:['Apify','Bright Data'],
 alibaba:['Apify','Octoparse'], 'made-in-china':['Apify','Octoparse'], globalsources:['Apify','Octoparse'], indiamart:['Apify','Octoparse'],
 amazon:['Apify','Bright Data','跨境魔方'], ebay:['Apify','Bright Data'], walmart:['Apify','Bright Data'], etsy:['Apify','Bright Data'], shopify:['Apify','Firecrawl','Bright Data'], aliexpress:['Apify','跨境魔方'], temu:['Apify','跨境魔方'], shopee:['Apify','跨境魔方'], lazada:['Apify','跨境魔方'],
 'company-sites':['Firecrawl','Apify','Octoparse','Bright Data'], directories:['Apify','Octoparse','Bright Data'], exhibitors:['Apify','Firecrawl','Octoparse'], 'trade-records':['跨境魔方'], 'company-registry':['Apify','Bright Data']
}
const platformDomains:Record<string,string> = {'google-maps':'maps.google.com','google-search':'google.com',bing:'bing.com',yelp:'yelp.com',instagram:'instagram.com',facebook:'facebook.com',linkedin:'linkedin.com',tiktok:'tiktok.com',youtube:'youtube.com',x:'x.com',alibaba:'alibaba.com','made-in-china':'made-in-china.com',globalsources:'globalsources.com',indiamart:'indiamart.com',amazon:'amazon.com',ebay:'ebay.com',walmart:'walmart.com',etsy:'etsy.com',shopify:'shopify.com',aliexpress:'aliexpress.com',temu:'temu.com',shopee:'shopee.com',lazada:'lazada.com','company-sites':'google.com',directories:'yelp.com',exhibitors:'10times.com','trade-records':'importyeti.com','company-registry':'opencorporates.com'}
const providerDomains:Record<string,string> = {Apify:'apify.com','Bright Data':'brightdata.com',Octoparse:'octoparse.com',Firecrawl:'firecrawl.dev',PhantomBuster:'phantombuster.com',TexAu:'texau.com'}
const platformLogo=(id:string)=>'https://www.google.com/s2/favicons?domain='+encodeURIComponent(platformDomains[id]||'google.com')+'&sz=64'
const providerLogo=(name:string)=>providerDomains[name]?'https://www.google.com/s2/favicons?domain='+encodeURIComponent(providerDomains[name])+'&sz=64':''
const searchTerms: Record<string,string> = Object.fromEntries(platformGroups.flatMap(g=>g.items.map(([id,,term])=>[id,term])))
const portCatalog = [
 ['USLAX','Los Angeles, United States'],['USLGB','Long Beach, United States'],['USNYC','New York, United States'],['USMIA','Miami, United States'],['CAVAN','Vancouver, Canada'],['CATOR','Toronto, Canada'],['CNSHA','Shanghai, China'],['CNNGB','Ningbo, China'],['CNSZX','Shenzhen, China'],['CNYTN','Yantian, China'],['HKHKG','Hong Kong'],['SGSIN','Singapore'],['KRPUS','Busan, South Korea'],['JPTYO','Tokyo, Japan'],['JPYOK','Yokohama, Japan'],['TWKHH','Kaohsiung, Taiwan'],['NLRTM','Rotterdam, Netherlands'],['DEHAM','Hamburg, Germany'],['BEANR','Antwerp, Belgium'],['GBFXT','Felixstowe, United Kingdom'],['AEJEA','Jebel Ali, United Arab Emirates'],['AEDXB','Dubai, United Arab Emirates'],['INMUN','Mundra, India'],['INNSA','Nhava Sheva, India'],['BRSSZ','Santos, Brazil'],['MXZLO','Manzanillo, Mexico'],['AUSYD','Sydney, Australia'],['ZADUR','Durban, South Africa'],['ESBCN','Barcelona, Spain'],['FRLEH','Le Havre, France']
] as const

const providerDescriptions: Record<string,string> = { Apify:'搜索 Apify Store 中可用的 Actors，并读取每个 Actor 自己的输入 Schema。', 'Bright Data':'数据集 / Scraper 产品目录与专属输入参数。', Octoparse:'模板任务与参数 Schema。', Firecrawl:'网站搜索、抓取与提取操作。', PhantomBuster:'Agent 工作流及参数。', TexAu:'自动化 Action 与参数。', '跨境魔方':'跨境电商数据 API 与接口参数。' }
const schemaKeys = (schema: JsonSchema) => Object.entries(schema.properties || {})
const stableStringify=(value:unknown):string=>Array.isArray(value)?'['+value.map(stableStringify).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value as Record<string,unknown>).sort().map(k=>JSON.stringify(k)+':'+stableStringify((value as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(value)??'null'
const fieldTitleZh:Record<string,string>={searchStringsArray:'搜索关键词',searchString:'搜索关键词',searchTerms:'搜索关键词',searchQuery:'搜索查询',query:'搜索查询',locationQuery:'搜索地点',location:'搜索地点',categoryFilterWords:'商家类别关键词',startUrls:'起始网址',customGeolocation:'自定义地理位置',maxCrawledPlacesPerSearch:'每个搜索词最大采集数量',maxResults:'最大结果数量',maxItems:'最大采集数量',includeNearbyPlaces:'包含附近地点',include_nearby_places:'包含附近地点',scrapeContacts:'采集联系方式',scrape_contacts:'采集联系方式',custom_geolocation:'自定义地理位置',keywords:'搜索关键词',max_result_per_keyword:'每个搜索词最大采集数量',proxyConfiguration:'代理配置',language:'语言',country:'国家',countryCode:'国家代码',city:'城市',state:'州 / 省',region:'地区'}
const titlePhraseZh:Record<string,string>={'search terms':'搜索关键词','search term':'搜索关键词','search query':'搜索查询','location':'搜索地点','maximum results':'最大结果数量','max results':'最大结果数量','max crawled places per search':'每个搜索词最大采集数量','start urls':'起始网址','place categories':'商家类别','include nearby places':'包含附近地点','scrape contacts':'采集联系方式','custom geolocation':'自定义地理位置','proxy configuration':'代理配置'}
const keyTokenZh:Record<string,string>={search:'搜索',string:'文本',strings:'关键词',term:'关键词',terms:'关键词',keyword:'关键词',keywords:'关键词',query:'查询',location:'地点',country:'国家',code:'代码',city:'城市',state:'州省',region:'地区',category:'类别',categories:'类别',filter:'筛选',words:'词语',start:'起始',urls:'网址',url:'网址',max:'最大',maximum:'最大',number:'数量',count:'数量',crawled:'采集',places:'商家',place:'商家',per:'每',include:'包含',nearby:'附近',scrape:'采集',contacts:'联系方式',contact:'联系人',custom:'自定义',geo:'地理',geolocation:'地理位置',proxy:'代理',configuration:'配置',language:'语言',results:'结果',items:'项目',pages:'页面',page:'页面',limit:'上限',radius:'半径',distance:'距离',sort:'排序',order:'顺序',date:'日期',website:'网站',email:'邮箱',phone:'电话',company:'公司',business:'企业',name:'名称',type:'类型',format:'格式',output:'输出',input:'输入',review:'评价',rating:'评分',stars:'星级',coordinates:'坐标',latitude:'纬度',longitude:'经度',requests:'请求',request:'请求',concurrency:'并发',timeout:'超时',depth:'深度',browser:'浏览器',cookies:'Cookie',headers:'请求头',selector:'选择器',extract:'提取',fields:'字段'}
const localizeTitle=(key:string,field:SchemaField)=>{const title=String(field.title||'').trim();const exact=fieldTitleZh[key]||titlePhraseZh[title.toLowerCase()]||titlePhraseZh[key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').toLowerCase()];if(exact)return exact;const source=title||key;const phrase=source.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').toLowerCase();const translated=phrase.split(' ').map(token=>keyTokenZh[token]).filter(Boolean);return translated.length?translated.join(''):'Actor 参数'}
const localizeDescription=(key:string,field:SchemaField)=>({searchStringsArray:'请输入需要搜索的关键词。',keywords:'请输入一个或多个搜索关键词，每行一项。',location:'请输入采集目标所在的国家、城市或具体地区。',locationQuery:'请输入采集目标所在的国家、城市或具体地区。',max_result_per_keyword:'设置每个搜索关键词最多采集的商家数量。',maxCrawledPlacesPerSearch:'设置每个搜索关键词最多采集的商家数量。',categoryFilterWords:'填写用于筛选商家类别的关键词。',startUrls:'填写 Actor 开始访问的网页地址。',customGeolocation:'按 Actor 要求填写自定义地理范围或坐标。',custom_geolocation:'按 Actor 要求填写自定义地理范围或坐标。',includeNearbyPlaces:'设置是否同时采集指定地点附近的商家。',include_nearby_places:'设置是否同时采集指定地点附近的商家。',scrapeContacts:'设置是否采集商家公开联系方式。',scrape_contacts:'设置是否采集商家公开联系方式。'} as Record<string,string>)[key]||('请根据该字段的要求填写。'+(field.description?' 原始说明：'+field.description:'' ))
const localizeEnum=(value:unknown)=>({true:'是',false:'否',daily:'每天',weekly:'每周',monthly:'每月',popular:'热门',relevance:'相关度',newest:'最新',oldest:'最早',ascending:'升序',descending:'降序'} as Record<string,string>)[String(value).toLowerCase()]||String(value)
const fieldType=(field:SchemaField)=>Array.isArray(field.type)?field.type.find(x=>x!=='null')||'string':field.type||'string'
const deriveSchemaRequirements=(schema:JsonSchema)=>{const requiredFields=new Set<string>(schema.required||[]);const props=schema.properties||{};const searchEntryPattern=/^(searchstringsarray|searchterms?|searchstrings?|searchqueries?|searchquery|keywords?|categoryfilterwords|placecategories|categories|starturls?|googlemapsurls)$/i;const searchEntries=Object.keys(props).filter(key=>searchEntryPattern.test(key));const atLeastOneGroups:string[][]=[];if(searchEntries.length>1)atLeastOneGroups.push(searchEntries);else if(searchEntries.length===1)requiredFields.add(searchEntries[0]);for(const [key,field] of Object.entries(props)){const description=(key+' '+String(field.title||'')+' '+String(field.description||'')).toLowerCase();if(/^(location|locationquery|location_query|searchlocation)$/i.test(key)&&/geographic area to search|location to search|search location/.test(description))requiredFields.add(key);if(/required|must provide|cannot be empty|is mandatory/.test(description))requiredFields.add(key);}return {requiredFields,atLeastOneGroups}}
const schemaPathLabel=(schema:JsonSchema,path:string)=>{let properties=schema.properties||{};return path.replace(/\[(\d+)\]/g,'.$1').split('.').map(part=>{if(/^\d+$/.test(part))return '第'+part+'项';const field=properties[part];const label=field?localizeTitle(part,field):'Actor 参数';properties=field?.properties||{};return label}).join(' / ')}
const schemaPathAnchor=(path:string)=>'schema-field-'+encodeURIComponent(path).replace(/%/g,'-')
const isEmptyRequired=(value:unknown)=>value===undefined||value===null||value===''||(Array.isArray(value)&&value.length===0)||(typeof value==='object'&&value!==null&&!Array.isArray(value)&&Object.keys(value as object).length===0)
const getDefaultValue = (field: SchemaField, required=false) => field.default ?? (fieldType(field)==='boolean' ? false : fieldType(field)==='array' ? (required?'':field.editor==='stringList'?'':'[]') : fieldType(field)==='object' ? (required?'':'{}') : '')
const nominatim = async (params: Record<string,string>) => {
 const url = new URL('https://nominatim.openstreetmap.org/search')
 Object.entries({format:'jsonv2',addressdetails:'1',dedupe:'1',limit:'30',...params}).forEach(([k,v])=>url.searchParams.set(k,v))
 const response = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) })
 if (!response.ok) throw new Error('OpenStreetMap 地点服务暂时不可用')
 return await response.json() as Array<{ place_id:number; display_name:string; name?:string; lat?:string; lon?:string; address?:Record<string,string>; type?:string; class?:string; osm_type?:string; osm_id?:number }>
}

const osmRegions = async (countryCode:string,countryName:string) => {
 const query = `[out:json][timeout:15];area["ISO3166-1"="${countryCode}"]["admin_level"="2"]->.country;(relation(area.country)["boundary"="administrative"]["admin_level"~"3|4|5|6"];way(area.country)["boundary"="administrative"]["admin_level"~"3|4|5|6"];);out tags center;`
 let lastError:unknown
 for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter']){
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',Accept:'application/json'},body:new URLSearchParams({data:query}).toString(),signal:AbortSignal.timeout(12000)})
   if(!response.ok)throw new Error('OpenStreetMap 地区服务暂时不可用（HTTP '+response.status+'）')
   const body=await response.json() as {elements?:Array<{id:number;tags?:Record<string,string>;center?:{lat:number;lon:number}}> }
   const unique=new Map<string,{place_id:number;name:string;display_name:string;lat?:number;lon?:number}>()
   for(const item of body.elements||[]){
    const name=item.tags?.['name:zh']||item.tags?.['name:en']||item.tags?.name
    if(name&&!unique.has(name.toLocaleLowerCase()))unique.set(name.toLocaleLowerCase(),{place_id:item.id,name,display_name:name,lat:item.center?.lat,lon:item.center?.lon})
   }
   const results=[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name))
   if(results.length)return results
   throw new Error(countryName+' 暂无可用的行政区边界数据')
  }catch(error){lastError=error}
 }
 throw lastError instanceof Error?lastError:new Error('OpenStreetMap 地区数据暂时不可用')
}

function MapFocus({location}:{location:MapLocation|null}) {
 const map=useMap()
 useEffect(()=>{if(location)map.flyTo([location.lat,location.lon],location.label?7:2,{duration:.7})},[map,location])
 return null
}

function MarketMap({selected,location}:{selected:typeof countries;location:MapLocation|null}) {
 const [geo,setGeo]=useState<FeatureCollection<Geometry>|null>(null)
 useEffect(()=>{let active=true;fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw new Error('country boundary unavailable');return r.json()}).then(data=>{if(active)setGeo(data)}).catch(()=>{if(active)setGeo(null)});return()=>{active=false}},[])
 const codes=new Set(selected.map(c=>c.code))
 const style=(feature?:Feature):PathOptions=>{
  const p=feature?.properties as Record<string,string>|undefined
  const code=p?.ISO_A2||p?.ISO3166_1_Alpha_2||p?.ISO2||''
  const picked=codes.has(code)
  return {color:picked?'#76556f':'#c9c4ca',weight:picked?1.5:.55,fillColor:picked?'#a887a0':'#e9e6ea',fillOpacity:picked?.72:.3}
 }
 return <div className="ldw-map"><MapContainer center={location?[location.lat,location.lon]:[24,5]} zoom={location?5:1.25} minZoom={1} maxZoom={12} scrollWheelZoom={false} worldCopyJump style={{height:220,width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{geo&&<GeoJSON key={selected.map(c=>c.code).sort().join(',')} data={geo} style={style}/>}<MapFocus location={location}/>{location&&<Marker position={[location.lat,location.lon]} icon={marketMarkerIcon}><Popup>{location.label}</Popup></Marker>}</MapContainer><div>{location?'地图已定位：'+location.label:'OpenStreetMap · 选择城市或行政区后自动定位'}</div></div>
}

export default function LeadDiscoveryWizard({ workspaceId, userId, onTaskCreated }: Props) {
 const [channel,setChannel] = useState('google-maps')
 const [provider,setProvider] = useState('Apify')
 const [countryCode,setCountryCode] = useState('')
 const [selectedCountries,setSelectedCountries] = useState<string[]>([])
 const [countryQuery,setCountryQuery] = useState('')
 const [countryOpen,setCountryOpen] = useState(false)
 const [region,setRegion] = useState('__all__')
 const [regionManual,setRegionManual] = useState('')
 const [regionLoadError,setRegionLoadError] = useState('')
 const [mapLocation,setMapLocation] = useState<MapLocation|null>(null)
 const [expandedPlatformGroup,setExpandedPlatformGroup] = useState('搜索引擎与地图')
 const [showAllActors,setShowAllActors] = useState(false)
 const [expandedHelp,setExpandedHelp] = useState<Record<string,boolean>>({})
 const [city,setCity] = useState('')
 const [cityQuery,setCityQuery] = useState('')
 const [cityResults,setCityResults] = useState<Array<{place_id:number;display_name:string;name?:string;lat?:string;lon?:string}>>([])
 const [regionResults,setRegionResults] = useState<Array<{place_id:number;display_name:string;name?:string;lat?:number;lon?:number}>>([])
 const [locationBusy,setLocationBusy] = useState(false)
 const [citySearchBusy,setCitySearchBusy] = useState(false)
 const [actorQuery,setActorQuery] = useState('')
 const [actors,setActors] = useState<Actor[]>([])
 const [actorBusy,setActorBusy] = useState(false)
 const [actor,setActor] = useState<Actor|null>(null)
 const [schema,setSchema] = useState<JsonSchema|null>(null)
 const [schemaBusy,setSchemaBusy] = useState(false)
 const [values,setValues] = useState<Record<string,unknown>>({})
 const [aiModel,setAiModel] = useState('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
 const [aiRequest,setAiRequest] = useState('')
 const [aiBusy,setAiBusy] = useState(false)
 const [aiGenerated,setAiGenerated] = useState<Record<string,unknown>|null>(null)
 const [aiSummary,setAiSummary] = useState('')
 const [aiStrategy,setAiStrategy] = useState('')
 const [aiWarnings,setAiWarnings] = useState<string[]>([])
 const [aiError,setAiError] = useState('')
 const [aiApplied,setAiApplied] = useState(false)
 const [aiAnalyzedContext,setAiAnalyzedContext] = useState('')
 const [chatMessages,setChatMessages] = useState<ChatMessage[]>([{role:'assistant',content:'你好！请先描述你想寻找什么客户或数据。我会识别目标平台并搜索可用 Actor，把候选项放在对话里供你选择。你选定后，我再读取它的真实 Schema，与你一起填写参数。'}])
 const [chatInput,setChatInput] = useState('')
 const [recognizedPlatform,setRecognizedPlatform] = useState('')
 const [aiMissingInformation,setAiMissingInformation] = useState<string[]>([])
 const [aiFieldExplanations,setAiFieldExplanations] = useState<Record<string,string>>({})
 const [manualConfigOpen,setManualConfigOpen] = useState(false)
 const [autoAnalysisKey,setAutoAnalysisKey] = useState('')
 const [keywords,setKeywords] = useState('')
 const [product,setProduct] = useState('')
 const [industry,setIndustry] = useState('')
 const [targetType,setTargetType] = useState<'companies'|'contacts'|'both'>('both')
 const [targetCount,setTargetCount] = useState('100')
 const [maxCost,setMaxCost] = useState('10')
 const [taskName,setTaskName] = useState('')
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const [showRequestPreview,setShowRequestPreview] = useState(true)
 const aiContextKey=useMemo(()=>stableStringify({channel,provider,actor_id:actor?.id||'',schema,aiModel,aiRequest,countryCode,selectedCountries,region,regionManual,city,taskName,product,industry,keywords,targetType,targetCount,maxCost}),[channel,provider,actor?.id,schema,aiModel,aiRequest,countryCode,selectedCountries,region,regionManual,city,taskName,product,industry,keywords,targetType,targetCount,maxCost])
 const schemaValidation=useMemo(()=>{
  const errors:Record<string,string>={}
  const payload:Record<string,unknown>={}
  const requirements=deriveSchemaRequirements(schema||{})
  const validateField=(field:SchemaField,value:unknown,path:string,required:boolean):unknown=>{
   if(isEmptyRequired(value)){if(required)errors[path]='此字段为必填项，不能为空';return undefined}
   const type=fieldType(field)
   if(type==='array'||type==='object'){
    if(typeof value==='string'){try{value=JSON.parse(value)}catch{errors[path]=type==='array'?'请输入有效 JSON 数组':'请输入有效 JSON 对象';return undefined}}
    if(type==='array'&&!Array.isArray(value)){errors[path]='必须是 JSON 数组';return undefined}
    if(type==='object'&&(!value||typeof value!=='object'||Array.isArray(value))){errors[path]='必须是 JSON 对象';return undefined}
   }
   if(isEmptyRequired(value)){if(required)errors[path]='必填内容不能为空';return undefined}
   if(type==='string'&&typeof value!=='string'){errors[path]='必须填写文本';return undefined}
   if(type==='boolean'&&typeof value!=='boolean'){errors[path]='必须选择是或否';return undefined}
   if(type==='number'||type==='integer'){const n=Number(value);if(!Number.isFinite(n)){errors[path]='必须填写有效数字';return undefined}if(type==='integer'&&!Number.isInteger(n)){errors[path]='必须填写整数';return undefined}if(field.minimum!==undefined&&n<field.minimum){errors[path]='不能小于 '+field.minimum;return undefined}if(field.maximum!==undefined&&n>field.maximum){errors[path]='不能大于 '+field.maximum;return undefined}value=n}
   if(typeof value==='string'){if(field.minLength!==undefined&&value.length<field.minLength){errors[path]='至少 '+field.minLength+' 个字符';return undefined}if(field.maxLength!==undefined&&value.length>field.maxLength){errors[path]='最多 '+field.maxLength+' 个字符';return undefined}if(field.pattern){try{if(!new RegExp(field.pattern).test(value)){errors[path]='格式不符合要求';return undefined}}catch{errors[path]='Schema 格式规则无效';return undefined}}if(field.format==='uri'&&!/^https?:\/\//i.test(value)){errors[path]='请输入有效网址';return undefined}if(field.format==='email'&&!/^\S+@\S+\.\S+$/.test(value)){errors[path]='请输入有效邮箱地址';return undefined}}
   if(field.enum?.length&&!field.enum.some(option=>JSON.stringify(option)===JSON.stringify(value))){errors[path]='请选择有效选项';return undefined}
   if(Array.isArray(value)){if(field.minItems!==undefined&&value.length<field.minItems){errors[path]='至少需要 '+field.minItems+' 项';return undefined}if(field.maxItems!==undefined&&value.length>field.maxItems){errors[path]='最多允许 '+field.maxItems+' 项';return undefined}if(field.items)value.forEach((item,index)=>validateField(field.items!,item,path+'['+(index+1)+']',false))}
   if(type==='object'&&field.properties){const obj=value as Record<string,unknown>;for(const [key,child] of Object.entries(field.properties))validateField(child,obj[key],path+'.'+key,(field.required||[]).includes(key))}
   return value
  }
  for(const [key,field] of schemaKeys(schema||{})){const value=validateField(field,values[key],key,requirements.requiredFields.has(key));const hasNestedErrors=Object.keys(errors).some(path=>path===key||path.startsWith(key+'.')||path.startsWith(key+'['));if(!hasNestedErrors&&!isEmptyRequired(value))payload[key]=value}
  for(const group of requirements.atLeastOneGroups){if(group.every(key=>isEmptyRequired(payload[key]))){errors[group[0]]='搜索入口至少填写一项：'+group.map(key=>localizeTitle(key,schema?.properties?.[key]||{})).join(' / ')}}
  return {errors,payload,valid:Object.keys(errors).length===0}
 },[schema,values])
 useEffect(()=>{if(aiGenerated&&aiAnalyzedContext&&aiAnalyzedContext!==aiContextKey){setAiApplied(false);setAiError('市场或搜索任务配置已变化。之前的 AI 分析不能直接应用，请重新分析。')}},[aiContextKey])
 const availableProviders = providerByPlatform[channel] || ['Apify']
 const selectedCountry = countries.find(c=>c.code===countryCode)
 const selectedCountryItems = countries.filter(c=>selectedCountries.includes(c.code))
 const toggleCountry = (code:string) => {
  const next=selectedCountries.includes(code)?selectedCountries.filter(x=>x!==code):[...selectedCountries,code]
  setSelectedCountries(next)
  if(!next.length){setCountryCode('');setRegion('');setCity('')}
  else if(!next.includes(countryCode)||!countryCode||!selectedCountries.includes(code))setCountryCode(next[next.length-1])
 }

 useEffect(()=>{ setProvider(availableProviders[0] || 'Apify'); setActor(null); setSchema(null); setActors([]); setValues({});  setError(''); setNotice('') },[channel])
 useEffect(()=>{ setActor(null);setSchema(null);setValues({});setError('');setNotice('') },[provider])
 useEffect(()=>{const group=platformGroups.find(g=>g.items.some(([id])=>id===channel));if(group)setExpandedPlatformGroup(group.label)},[channel])
 useEffect(()=>{
  let active=true
  if(!countryCode){setRegionResults([]);setRegion('__all__');setRegionManual('');setCity('');setMapLocation(null);setRegionLoadError('');setLocationBusy(false);return}
  const countryName=selectedCountry?.geoName||selectedCountry?.name||countryCode
  setLocationBusy(true);setRegion('__all__');setRegionManual('');setCity('');setCityQuery('');setMapLocation(null);setRegionLoadError('')
  const timer=setTimeout(async()=>{
   const [regions,geocode]=await Promise.allSettled([
    osmRegions(countryCode,countryName),
    nominatim({q:countryName,featureType:'country',limit:'1'})
   ])
   if(active){
    if(regions.status==='fulfilled'){setRegionResults(regions.value);setRegion('__all__')}
    else{setRegionResults([]);setRegion('__all__');setRegionLoadError(regions.reason instanceof Error?regions.reason.message:'行政区加载失败，可手动输入。')}
    if(geocode.status==='fulfilled'&&geocode.value[0]?.lat&&geocode.value[0]?.lon){
     const item=geocode.value[0];setMapLocation({lat:Number(item.lat),lon:Number(item.lon),label:countryName})
    }else setMapLocation(null)
    setLocationBusy(false)
   }
  },250)
  return()=>{active=false;clearTimeout(timer)}
 },[countryCode])
 const searchCities = async () => {
  if(!cityQuery.trim()||!countryCode)return
  setCitySearchBusy(true);setError('')
  try {
   const q=[cityQuery,region!=='__all__'?region:'',selectedCountry?.geoName].filter(Boolean).join(', ')
   const results=await nominatim({q,countrycodes:countryCode.toLowerCase(),featureType:'city',limit:'8'})
   setCityResults(results.slice(0,8).map(x=>({place_id:x.place_id,display_name:x.display_name,name:x.name||x.display_name.split(',')[0],lat:x.lat,lon:x.lon})))
   if(!results.length)setNotice('OpenStreetMap 没有找到匹配城市，请调整名称再搜索。')
  }catch(e){setError(e instanceof Error?e.message:'城市搜索失败')}
  finally{setCitySearchBusy(false)}
 }

 const searchActors = async (queryOverride?:string) => {
  setActorBusy(true);setError('');setNotice('')
  try {
   const term=(queryOverride||actorQuery).trim() || searchTerms[channel] || channel
   const url=new URL('https://api.apify.com/v2/store')
   url.searchParams.set('search',term);url.searchParams.set('limit','20');url.searchParams.set('sortBy','popularity');url.searchParams.set('responseFormat','full')
   const response=await fetch(url.toString(),{headers:{Accept:'application/json'}})
   if(!response.ok)throw new Error('Apify Store 搜索失败，请稍后重试')
   const body=await response.json();const items=(body.data?.items || []) as Actor[]
   setActors(items);if(!items.length)setNotice('没有找到匹配的 Actor。可以调整关键词再搜索。')
  }catch(e){setError(e instanceof Error?e.message:'无法搜索 Apify Store')}
  finally{setActorBusy(false)}
 }
 const selectActor = async (item: Actor) => {
  if(!supabase){setError('Supabase 尚未配置，请先完成系统连接。');return}
  setActor(item);setSchema(null);setValues({});setAiGenerated(null);setAiSummary('');setAiStrategy('');setAiWarnings([]);setAiMissingInformation([]);setAiFieldExplanations({});setAiApplied(false);setAiAnalyzedContext('');setAutoAnalysisKey('');setAiError('');setSchemaBusy(true);setError('');setNotice('');
  setChatMessages(current=>[current[0],...current.filter(message=>message.role==='user'),{role:'assistant',content:'已选择 '+(item.title||item.name)+'。我正在读取它的真实输入 Schema，随后会根据参数要求继续与你确认。'}])
  const actorId=item.username+'~'+item.name
  const {data,error:invokeError}=await supabase.functions.invoke('apify-actor-schema',{body:{workspace_id:workspaceId,actor_id:actorId,channel_key:channel}})
  if(invokeError||data?.error){setError(data?.error||invokeError?.message||'读取 Actor Schema 失败');setActor(null);setSchemaBusy(false);return}
  const nextSchema=(data.input_schema || {}) as JsonSchema
  const requirements=deriveSchemaRequirements(nextSchema)
   const initial=Object.fromEntries(schemaKeys(nextSchema).map(([key,field])=>[key,getDefaultValue(field,requirements.requiredFields.has(key))]))
  setSchema(nextSchema);setValues(initial);
  setNotice('已读取 Actor 最新输入 Schema。以下字段由 Actor 定义，尚未启动采集。')
  setSchemaBusy(false)
 }
 const renderField = ([key,field]:[string,SchemaField]) => {
  const type=fieldType(field)
  const requirements=deriveSchemaRequirements(schema||{})
  const required=requirements.requiredFields.has(key)
  const groupRequired=requirements.atLeastOneGroups.some(group=>group.includes(key))
  const value=values[key] ?? getDefaultValue(field,required)
  const set=(v:unknown)=>setValues(current=>({...current,[key]:v}))
  const enumValues=field.enum || []
  const semantic=key.toLowerCase()
  const countryField=/country|countrycode|country_code/.test(semantic)
  const regionField=/^(state|region|province|stateorprovince)$/.test(semantic)||/stateorprovince|regionname|province/.test(semantic)
  const cityField=/^city$|cityname|city_name/.test(semantic)
  const portField=/port|seaport|unlocode/.test(semantic)
  const showHelp=Boolean(expandedHelp[key])
  const fieldErrors=Object.entries(schemaValidation.errors).filter(([path])=>path===key||path.startsWith(key+'.')||path.startsWith(key+'['))
  const fieldError=fieldErrors.length>0
  const constraints=[field.minimum!==undefined?'≥ '+field.minimum:'',field.maximum!==undefined?'≤ '+field.maximum:'',field.minLength!==undefined?'最少 '+field.minLength+' 字符':'',field.maxLength!==undefined?'最多 '+field.maxLength+' 字符':'',field.minItems!==undefined?'至少 '+field.minItems+' 项':'',field.maxItems!==undefined?'最多 '+field.maxItems+' 项':'',field.pattern?'正则格式':'',field.format?field.format:''].filter(Boolean)
  return <label id={schemaPathAnchor(key)} className={'ldw-field ldw-schema-field '+(fieldError?'has-error':'')} key={key}>
   <span className="ldw-field-heading"><span className="ldw-field-label">{localizeTitle(key,field)}{required&&<b> * 必填</b>}{groupRequired&&<b> * 至少填写一项</b>}</span><small className="ldw-field-type">{Array.isArray(field.type)?field.type.join(' / '):(field.type||'text')}</small>{constraints.length>0&&<small className="ldw-constraint-chip">{constraints.join(' · ')}</small>}<button type="button" className="ldw-help-button" aria-expanded={showHelp} onClick={e=>{e.preventDefault();setExpandedHelp(current=>({...current,[key]:!current[key]}))}}><HelpCircle size={13}/>{showHelp?'收起说明':'字段说明'}</button></span>
   {enumValues.length>0?<select value={String(value)} onChange={e=>set(e.target.value)}><option value="">请选择</option>{enumValues.map(option=><option key={String(option)} value={String(option)}>{localizeEnum(option)}</option>)}</select>
   :countryField?<select value={String(value)} onChange={e=>{const next=e.target.value;set(next);const found=countries.find(c=>c.code===next||c.geoName===next);if(found){setCountryCode(found.code);setSelectedCountries(current=>current.includes(found.code)?current:[...current,found.code])}}}><option value="">选择国家</option>{countries.map(c=><option key={c.code} value={/code/.test(semantic)?c.code:c.geoName}>{c.flag} {c.name}</option>)}</select>
   :regionField?<select value={String(value)} onChange={e=>set(e.target.value)} disabled={!countryCode||locationBusy}><option value="">全部地区（不限制）</option>{regionResults.map(r=><option key={r.place_id} value={r.name||r.display_name}>{r.name||r.display_name}</option>)}</select>
   :cityField?<><div className="ldw-city-search-row"><input value={cityQuery||String(value)} onChange={e=>{setCityQuery(e.target.value);set('')}} placeholder="输入城市名称…"/><button type="button" onClick={()=>void searchCities()} disabled={!countryCode||citySearchBusy}><Search size={12}/>{citySearchBusy?'搜索中':'搜索'}</button></div>{cityResults.length>0&&<div className="ldw-city-results">{cityResults.map(item=><button type="button" key={item.place_id} onClick={()=>{set(item.name||item.display_name);setCityQuery('');setCityResults([])}}><MapPin size={13}/><span>{item.display_name}</span></button>)}</div>}</>
   :portField?<select value={String(value)} onChange={e=>set(e.target.value)}><option value="">选择港口</option>{portCatalog.map(([code,name])=><option key={code} value={code}>{name} · {code}</option>)}</select>
   :type==='boolean'?<input type="checkbox" checked={Boolean(value)} onChange={e=>set(e.target.checked)}/>
    :type==='integer'||type==='number'?<input type="number" min={field.minimum} max={field.maximum} step={type==='integer'?1:'any'} value={String(value)} placeholder={typeof field.placeholderValue==='string'?field.placeholderValue:(typeof field.example==='string'?field.example:(Array.isArray(field.prefill)?'例如：'+field.prefill.slice(0,3).join('、'):''))} aria-invalid={Boolean(fieldError)} onChange={e=>set(e.target.value)}/>
   :type==='array'&&field.editor==='stringList'?<textarea rows={3} value={Array.isArray(value)?value.join('\n'):String(value)} onChange={e=>set(e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))} placeholder={Array.isArray(field.example)?'例如：'+field.example.slice(0,3).join('、'):'每行填写一项'}/>
   :type==='array'||type==='object'?<textarea rows={3} value={String(value)} onChange={e=>set(e.target.value)} placeholder={type==='array'?'请输入 JSON 数组':'请输入 JSON 对象'}/>
    :<input type={field.format==='uri'?'url':field.format==='email'?'email':field.format==='date'?'date':field.format==='date-time'?'datetime-local':'text'} minLength={field.minLength} maxLength={field.maxLength} pattern={field.pattern} value={String(value)} aria-invalid={Boolean(fieldError)} onChange={e=>set(e.target.value)}/>}
   <small className="ldw-field-key">Actor 原始字段：{key}</small>{fieldErrors.map(([path,message])=><small className="ldw-field-error" key={path}>{path===key?'':schemaPathLabel(schema||{},path)+'：'}{message}</small>)}{showHelp&&<small className="ldw-field-help">{localizeDescription(key,field)}</small>}
  </label>
 }
 const analyzeActorInput = async () => {
  if(!supabase||!actor||!schema){setAiError('请先选择 Actor 并成功读取 Schema。');return}
  setAiBusy(true);setAiError('');setAiGenerated(null);setAiApplied(false)
  try{
   const {data:sessionData,error:sessionError}=await supabase.auth.getSession()
   if(sessionError||!sessionData.session?.access_token)throw new Error('登录状态已失效，请重新登录。')
   const response=await fetch('https://ouranos-ai-assistant.xg-y.workers.dev',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+sessionData.session.access_token},
    body:JSON.stringify({
     model:aiModel,user_request:aiRequest,channel,
     actor_id:actor.username+'~'+actor.name,actor_name:actor.title,
     actor_schema:schema,
     market:{countries:selectedCountryItems.map(c=>({code:c.code,name:c.name,geoName:c.geoName})),country:selectedCountry?.geoName||'',region:region==='__all__'?'':region,city},
     task_limits:{task_name:taskName,product,industry,keywords,target_type:targetType,target_count:Number(targetCount),max_cost_usd:Number(maxCost)}
    })
   })
   const result=await response.json()
   if(!response.ok||!result?.ok)throw new Error(result?.error||'AI 分析失败，请稍后重试。')
   setAiGenerated(result.actor_input as Record<string,unknown>)
   setAiSummary(String(result.summary||''));setAiStrategy(String(result.strategy||''))
   setAiWarnings(Array.isArray(result.warnings)?result.warnings.map(String):[]);setAiAnalyzedContext(aiContextKey)
  }catch(e){setAiError(e instanceof Error?e.message:'AI 分析失败，请稍后重试。')}
  finally{setAiBusy(false)}
 }
 const applyAiGenerated = () => {
  if(!aiGenerated||!schema)return
  if(aiAnalyzedContext!==aiContextKey){setAiError('市场或搜索任务配置已变化，请重新运行 AI 分析后再填入参数。');return}
  const mapped=Object.fromEntries(Object.entries(aiGenerated).map(([key,value])=>{
   const field=schema.properties?.[key];const type=field?fieldType(field):'string'
   if(type==='array'&&field?.editor==='stringList')return [key,Array.isArray(value)?value:[]]
   if(type==='array'||type==='object')return [key,JSON.stringify(value,null,2)]
   return [key,value]
  }))
  setValues(current=>({...current,...mapped}));setAiApplied(true)
  setNotice('AI 参数已填入 Schema 表单。请检查最终 JSON 和必填项校验结果。')
 }
 const sendAssistantTurn = async (messages:ChatMessage[], requestText:string, schemaOverride?:JsonSchema, actorOverride?:Actor) => {
  const activeSchema=schemaOverride||schema
  const activeActor=actorOverride||actor
  const mode=activeSchema&&activeActor?'conversation':'intent'
  if(!supabase){setAiError('Supabase 尚未配置，请先完成系统连接。');return}
  setAiBusy(true);setAiError('')
  try{
   const {data:sessionData,error:sessionError}=await supabase.auth.getSession()
   if(sessionError||!sessionData.session?.access_token)throw new Error('登录状态已失效，请重新登录。')
   const supportedPlatforms=platformGroups.flatMap(group=>group.items.map(([id,name])=>({id,name})))
   const response=await fetch('https://ouranos-ai-assistant.xg-y.workers.dev',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+sessionData.session.access_token},
    body:JSON.stringify({
     mode,model:aiModel,user_request:requestText,conversation:messages.slice(-20),
     supported_platforms:supportedPlatforms,channel,actor_id:activeActor?activeActor.username+'~'+activeActor.name:'',actor_name:activeActor?.title||'',actor_description:activeActor?.description||'',
     actor_schema:activeSchema,
     previous_actor_input:activeSchema?schemaValidation.payload:{},
     market:{countries:selectedCountryItems.map(c=>({code:c.code,name:c.name,geoName:c.geoName})),country:selectedCountry?.geoName||'',region:region==='__all__'?'':region,city},
     task_limits:{task_name:taskName,product,industry,keywords,target_type:targetType,target_count:Number(targetCount),max_cost_usd:Number(maxCost)}
    })
   })
   const result=await response.json()
   if(!response.ok||!result?.ok)throw new Error(result?.error||'AI 暂时无法处理这条消息，请稍后重试。')
   if(mode==='intent'){
    if(result.platform_id){
     const platform=supportedPlatforms.find(item=>item.id===result.platform_id)
     if(platform){
      setChannel(platform.id);setRecognizedPlatform(platform.name)
      if(providerByPlatform[platform.id]?.includes('Apify')){
       const term=[searchTerms[platform.id]||platform.name,requestText.slice(0,160)].filter(Boolean).join(' ')
       setActorQuery(term);setActorBusy(true)
       try{
        const storeUrl=new URL('https://api.apify.com/v2/store')
        storeUrl.searchParams.set('search',term);storeUrl.searchParams.set('limit','20');storeUrl.searchParams.set('sortBy','popularity');storeUrl.searchParams.set('responseFormat','full')
        const storeResponse=await fetch(storeUrl.toString(),{headers:{Accept:'application/json'}})
        if(!storeResponse.ok)throw new Error('无法读取 Apify Store 候选 Actor，请稍后重试。')
        const storeBody=await storeResponse.json()
        const candidates=(storeBody.data?.items||[]) as Actor[]
        setActors(candidates)
        setChatMessages(current=>[...current,{role:'assistant',content:candidates.length?'已识别平台：'+platform.name+'。我找到了 '+candidates.length+' 个候选 Actor。请直接在下面选择一个；也可以修改搜索词重新查找。选择后我会读取它的 Schema，并继续帮你配置。':'已识别平台：'+platform.name+'，但暂时没有找到候选 Actor。你可以修改下面的搜索词再试一次。'}])
       }finally{setActorBusy(false)}
      }else{
       setChatMessages(current=>[...current,{role:'assistant',content:'已识别平台：'+platform.name+'。当前暂未接入该平台的 Actor 搜索，请选择已支持 Apify 的平台，或稍后再试。'}])
      }
      setAiSummary(String(result.summary||''));return
     }
    }
    setAiSummary(String(result.summary||''))
    setChatMessages(current=>[...current,{role:'assistant',content:String(result.assistant_message||'我已理解你的需求。请继续补充目标平台或采集范围。')}])
    return
   }
   const generated=(result.actor_input||{}) as Record<string,unknown>
   setAiGenerated(generated)
   setAiSummary(String(result.summary||''));setAiStrategy(String(result.strategy||''))
   setAiWarnings(Array.isArray(result.warnings)?result.warnings.map(String):[])
   setAiMissingInformation(Array.isArray(result.missing_information)?result.missing_information.map(String):[])
   setAiFieldExplanations(result.field_explanations&&typeof result.field_explanations==='object'?result.field_explanations as Record<string,string>:{})
   const mapped=Object.fromEntries(Object.entries(generated).map(([key,value])=>{
    const field=activeSchema?.properties?.[key];const type=field?fieldType(field):'string'
    if(type==='array'&&field?.editor==='stringList')return [key,Array.isArray(value)?value:[]]
    if(type==='array'||type==='object')return [key,JSON.stringify(value,null,2)]
    return [key,value]
   }))
   setValues(current=>({...current,...mapped}))
   setAiApplied(true);setAiAnalyzedContext(aiContextKey)
   setChatMessages(current=>[...current,{role:'assistant',content:String(result.assistant_message||'参数预览已更新。请检查下面的参数和待确认事项。')}])
  }catch(error){setAiError(error instanceof Error?error.message:'AI 对话失败，请稍后重试。')}
  finally{setAiBusy(false)}
 }
 const submitChat = async () => {
  const message=chatInput.trim()
  if(!message||aiBusy)return
  const next=[...chatMessages,{role:'user' as const,content:message}]
  setChatMessages(next);setChatInput('')
  const requestText=aiRequest||message
  if(!aiRequest)setAiRequest(message)
  await sendAssistantTurn(next,requestText)
 }
 useEffect(()=>{
  if(!schema||!actor||!aiRequest||aiBusy)return
  const key=actor.id+':'+aiContextKey
  if(autoAnalysisKey===key||aiAnalyzedContext===aiContextKey)return
  setAutoAnalysisKey(key)
  void sendAssistantTurn(chatMessages,aiRequest)
 },[schema,actor?.id,aiContextKey])
 const startSearch = async () => {
  if(!supabase){setError('Supabase 尚未配置，请先完成系统连接。');return}
  if(!workspaceId||!userId){setError('当前工作空间或用户会话不可用，请重新登录后重试。');return}
  if(!schema||!actor)return
  if(aiApplied&&aiAnalyzedContext!==aiContextKey){setError('市场或搜索任务配置已变化，之前的 AI 参数已过期。请重新分析并确认参数，或重新检查后再提交。');return}
  if(!schemaValidation.valid){setError('请先修正 Schema 字段中的 '+Object.keys(schemaValidation.errors).length+' 项校验问题。');return}
  if(!Number.isFinite(Number(maxCost))||Number(maxCost)<=0){setError('请设置大于 0 的单次费用上限。');return}
  setBusy(true);setError('')
  try {
   const actorInput:Record<string,unknown>={...schemaValidation.payload}
    const taskTitle=taskName.trim()||product.trim()||keywords.trim()||actor.title
   const actorId=actor.username+'~'+actor.name
    const schemaHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stableStringify(schema))).then(d=>[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join(''))
    const profile={criteria:taskTitle,keywords,product,industry,countries:selectedCountryItems.map(c=>({code:c.code,name:c.name,geoName:c.geoName})),regions:region&&region!=='__all__'?[region]:[],cities:city?[city]:[],target_type:targetType,provider,actor_id:actorId,actor_input:actorInput,actor_input_schema:schema,actor_schema_hash:schemaHash,location:{countries:selectedCountryItems.map(c=>c.geoName),country:selectedCountry?.geoName||'',region:region==='__all__'?'':region,city},source_channel:channel,ai_analysis:aiGenerated?{model:aiModel,user_request:aiRequest,conversation:chatMessages,summary:aiSummary,strategy:aiStrategy,actor_input:actorInput,field_explanations:aiFieldExplanations,missing_information:aiMissingInformation,warnings:aiWarnings,analyzed_at:new Date().toISOString()}:null}
   const {data:task,error:taskError}=await supabase.from('lead_search_tasks').insert({workspace_id:workspaceId,created_by:userId,name:taskTitle,status:'draft',target_profile:profile,selected_channels:[channel],target_count:Number(targetCount)}).select('id').single()
   if(taskError)throw new Error(taskError.message)
   const adapterKey='apify-'+channel+'-'+(actor.username+'-'+actor.name).toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,110)
   const config={field_mapping:{},max_cost:Number(maxCost),max_items:Number(targetCount)}
   const {error:selectionError}=await supabase.from('workspace_adapter_selections').upsert({workspace_id:workspaceId,adapter_key:adapterKey,channel_key:channel,is_enabled:true,priority:10,config,created_by:userId,updated_at:new Date().toISOString()},{onConflict:'workspace_id,adapter_key'})
   if(selectionError)throw new Error('搜索任务已保存，但适配器配置失败：'+selectionError.message)
   const {data:queued,error:queueError}=await supabase.functions.invoke('enqueue-lead-search',{body:{workspace_id:workspaceId,task_id:task.id,confirm_cost:true}})
   if(queueError||queued?.error)throw new Error(queued?.error||queueError?.message||'启动搜索失败')
   setNotice('搜索任务已成功进入队列。')
   onTaskCreated()
  }catch(e){setError(e instanceof Error?e.message:'无法创建搜索任务')}
  finally{setBusy(false)}
 }
 const pricingLabel = (item:Actor) => {
  const pricing=item.currentPricingInfo || {}
  const model=String(pricing.pricingModel || '以 Actor 页面为准')
  const unit=pricing.unitName ? ' / '+String(pricing.unitName) : ''
  const price=pricing.pricePerUnitUsd ? ' · $'+String(pricing.pricePerUnitUsd)+unit : ''
  return model+price
 }
 return <div className="ldw-shell">
  <section className="ldw-card ldw-ai-step ldw-chat-card ldw-chat-first">
   <div className="ldw-step-title"><span><MessageCircle size={16}/></span><div><h3>AI 采集助手</h3><p>描述业务目标，AI 将识别平台并搜索候选 Actor；你在对话中选择后，AI 再读取 Schema 并填写参数。</p></div></div>
   <div className="ldw-chat-history" aria-live="polite">{chatMessages.map((message,index)=><div key={index} className={'ldw-chat-message '+message.role}><span>{message.role==='assistant'?'AI 助手':'你'}</span><p>{message.content}</p></div>)}{aiBusy&&<div className="ldw-chat-message assistant"><span>AI 助手</span><p className="ldw-chat-thinking"><Loader2 size={13}/> 正在理解需求并搜索可用 Actor…</p></div>}</div>
   {!actor&&recognizedPlatform&&<div className="ldw-ai-actor-picker"><div className="ldw-ai-actor-search"><input value={actorQuery} onChange={e=>setActorQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void searchActors()}}} placeholder="搜索 Actor，例如 amazon seller scraper"/><button type="button" onClick={()=>void searchActors()} disabled={actorBusy||!actorQuery.trim()}>{actorBusy?<Loader2 size={13}/>:<Search size={13}/>} 搜索 Actor</button></div>{actorBusy&&<p>正在搜索 Apify Store…</p>}{actors.length>0&&<div className="ldw-ai-actor-options"><b>选择一个 Actor（{actors.length}）</b><p>由你决定使用哪个采集器。AI 会在你选择后读取真实 Schema 并继续对话。</p>{actors.slice(0,8).map(item=><button type="button" key={item.id} onClick={()=>void selectActor(item)} disabled={schemaBusy}><span><b>{item.title||item.name}</b><small>{item.description||item.username+\'/\'+item.name}</small><small>{pricingLabel(item)}</small></span><span>选择 <ArrowRight size={12}/></span></button>)}</div>}</div>}
   <div className="ldw-chat-composer"><textarea rows={3} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submitChat()}}} placeholder="例如：我销售手机数据线，想寻找美国亚马逊上相关品类的卖家…" /><button type="button" onClick={()=>void submitChat()} disabled={!chatInput.trim()||aiBusy}><Send size={14}/> 发送</button></div>
   {aiError&&<div className="ldw-error">{aiError}</div>}
   {recognizedPlatform&&<div className="ldw-platform-detected"><Check size={14}/> 已识别平台：<b>{recognizedPlatform}</b>{actor&&<span> · 当前选择：{actor.title}</span>}</div>}
   {!actor&&actors.length>0&&<div className="ldw-ai-actor-options"><b>可选采集器</b><p>AI 正在评估这些候选项；你也可以直接指定一个。</p>{actors.slice(0,5).map(item=><button type="button" key={item.id} onClick={()=>void selectActor(item)} disabled={schemaBusy}><span><b>{item.title||item.name}</b><small>{item.description||item.username+'/'+item.name}</small></span><span>选择 <ArrowRight size={12}/></span></button>)}</div>}
   {schema&&actor&&<div className="ldw-ai-live-preview">
    <div className="ldw-ai-result-heading"><b>实时参数预览</b><span>{actor.title} · {pricingLabel(actor)}</span></div>
    {aiSummary&&<div className="ldw-ai-summary"><b>需求理解</b><p>{aiSummary}</p></div>}
    {aiStrategy&&<div className="ldw-ai-summary"><b>采集策略</b><p>{aiStrategy}</p></div>}
    <div className="ldw-ai-preview-status"><span>Schema 校验：{schemaValidation.valid?'通过':'待完善'}</span><span>已生成字段：{Object.keys(schemaValidation.payload).length} / {schemaKeys(schema).length}</span><span>待确认：{aiMissingInformation.length}</span></div>
    {aiMissingInformation.length>0&&<div className="ldw-ai-warnings"><b>还需要确认</b><ul>{aiMissingInformation.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
    {aiWarnings.length>0&&<div className="ldw-ai-warnings"><b>能力或参数提醒</b><ul>{aiWarnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div>}
    {Object.keys(aiFieldExplanations).length>0&&<div className="ldw-ai-explanations"><b>字段生成说明</b>{Object.entries(aiFieldExplanations).map(([key,explanation])=><div key={key}><span>{localizeTitle(key,schema.properties?.[key]||{})}</span><small>{String(explanation)}</small></div>)}</div>}
    <div className="ldw-request-preview"><div className="ldw-request-preview-heading"><b>最终提交数据</b><span>{Object.keys(schemaValidation.payload).length} 个字段</span></div><pre>{JSON.stringify(schemaValidation.payload,null,2)}</pre><div className={schemaValidation.valid?'ldw-validation-ok':'ldw-validation-error'}>{schemaValidation.valid?'Schema 校验通过':'请修正 '+Object.keys(schemaValidation.errors).length+' 项字段问题'}</div></div>
    {aiApplied&&<div className="ldw-validation-ok">AI 已将参数同步到 Actor Schema。你可以展开下方手动配置修改字段，提交预览会同步更新。</div>}
   </div>}
   {!schema&&<div className="ldw-chat-hint">描述目标后，系统会搜索候选 Actor。你可以直接在本对话中选择，AI 随后读取 Schema 并配置参数。</div>}
   <div className="ldw-submit-row"><span>确认后将使用上方展示的同一份 Schema 参数提交并启动采集。</span><button disabled={!schema||!actor||busy||!schemaValidation.valid||aiMissingInformation.length>0||aiBusy} onClick={()=>void startSearch()}>{busy?<><Loader2 size={15}/> 正在创建…</>:'确认提交数据并启动采集'} <ArrowRight size={15}/></button></div>
  </section>
  <button type="button" className="ldw-manual-toggle" aria-expanded={manualConfigOpen} onClick={()=>setManualConfigOpen(value=>!value)}><span><b>手动配置（Actor Schema）</b><small>{actor?'当前 Actor：'+actor.title+' · 仅显示该 Actor 定义的输入参数':'选择 Actor 后，这里将显示它的 Schema 参数'}</small></span><span>{manualConfigOpen?'收起参数':'展开参数'} <ChevronDown size={15}/></span></button>
  {manualConfigOpen&&<div className="ldw-manual-config-body">
   {schema&&actor?<section className="ldw-card">
    <div className="ldw-schema-heading"><div><b>{actor.title}</b><small>{schemaKeys(schema).length} 个输入字段 · 来自 Actor 最新构建的真实 Schema</small><small>{pricingLabel(actor)}</small></div><span><ShieldCheck size={13}/> Schema 已读取</span></div>
    {Object.keys(schemaValidation.errors).length>0&&<div className="ldw-schema-error-summary" role="alert"><div><b>发现 {Object.keys(schemaValidation.errors).length} 项需要修正</b><span>点击错误可跳转到对应字段。</span></div><ol>{Object.entries(schemaValidation.errors).map(([path,message])=><li key={path}><a href={'#'+schemaPathAnchor(path.split('.')[0].split('[')[0])}>{schemaPathLabel(schema,path)}</a><span>{message}</span></li>)}</ol></div>}
    <div className="ldw-form-grid">{schemaKeys(schema).map(renderField)}</div>
    <div className="ldw-request-preview"><div className="ldw-request-preview-heading"><b>最终提交数据预览</b><span>{Object.keys(schemaValidation.payload).length} 个字段</span></div><pre>{JSON.stringify(schemaValidation.payload,null,2)}</pre><div className={schemaValidation.valid?'ldw-validation-ok':'ldw-validation-error'}>{schemaValidation.valid?'Schema 校验通过':`请修正 ${Object.keys(schemaValidation.errors).length} 项字段问题`}</div></div>
   </section>:<div className="ldw-chat-hint">尚未选择 Actor。请先在上方 AI 对话中描述需求，你可以在上方对话中选择合适的 Actor。</div>}
  </div>}
  {error&&<div className="ldw-error">{error}</div>}{notice&&<div className="ldw-notice">{notice}</div>}
 </div>
}
