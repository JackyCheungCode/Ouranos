import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ExternalLink, HelpCircle, Loader2, MapPin, Search, ShieldCheck, Sparkles, MessageCircle, Send, UserRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { divIcon } from 'leaflet'
import type { PathOptions } from 'leaflet'
import { countries } from './countries'
import './LeadDiscoveryWizard.css'
import type { DiscoveryPageDefinition } from './DiscoveryPageHub'

type Props = { workspaceId: string; userId: string; onTaskCreated: (taskId?:string) => void | Promise<void>; page: DiscoveryPageDefinition }
type Actor = { id: string; name: string; username: string; title: string; description: string; url: string; adapterKey?:string; stats?: { totalUsers?: number; actorReviewRating?: number; actorReviewCount?: number }; currentPricingInfo?: Record<string, unknown> }
type SchemaField = { title?: string; description?: string; type?: string | string[]; editor?: string; default?: unknown; prefill?: unknown; example?: unknown; placeholderValue?: string; enum?: unknown[]; items?: SchemaField; properties?: Record<string, SchemaField>; required?: string[]; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; minItems?: number; maxItems?: number; pattern?: string; format?: string }
type JsonSchema = { properties?: Record<string, SchemaField>; required?: string[] }
type MapLocation = { lat:number; lon:number; label:string }
type ChatMessage = { role:'user'|'assistant'; content:string }
type DirectoryPlatform = { platform_key:string; platform_name:string; category_key:string; search_terms:string; description:string; sort_order:number }
type DirectoryProvider = { provider_key:string; provider_name:string; provider_type:string; description:string; is_active:boolean; sort_order:number }
type ProviderAdapterRow={adapter_key:string;config:Record<string,unknown>;discovery_adapter_catalog:{adapter_name:string;external_actor_id:string;input_schema:JsonSchema;verification_status:string;maintenance_status:string;is_active:boolean;provider_key:string;pricing_model?:Record<string,unknown>}}
const marketMarkerIcon=divIcon({className:'ldw-map-marker',html:'<span></span>',iconSize:[22,22],iconAnchor:[11,11]})
const facebookProfileActors = [
 {username:'silentflow',name:'facebook-search-profiles-scraper',title:'Silentflow · Facebook 个人资料搜索',description:'支持关键词、城市及国家/地区匹配；可补充公开主页详情。'},
 {username:'alien_force',name:'facebook-search-scraper',title:'Alien Force · Facebook 搜索',description:'支持 People 搜索及地点解析；地点过滤能否生效取决于 Facebook 地点匹配。'},
 {username:'memo23',name:'facebook-search-scraper',title:'Memo23 · Facebook 搜索',description:'支持 People 搜索及城市 Place UID；当前通用表单不传 Place UID，地区作为关键词辅助。'}
] as const
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

const providerKeyOf=(name:string)=>({apify:'apify','bright data':'brightdata',brightdata:'brightdata',firecrawl:'firecrawl',octoparse:'octoparse',phantombuster:'phantombuster',texau:'texau','跨境魔方':'kuajingmofang'} as Record<string,string>)[name.trim().toLowerCase()]||name.trim().toLowerCase().replace(/[^a-z0-9]/g,'')
const providerDescriptions: Record<string,string> = { Apify:'搜索 Apify Store 中可用的 Actors，并读取每个 Actor 自己的输入 Schema。', 'Bright Data':'数据集 / Scraper 产品目录与专属输入参数。', Octoparse:'模板任务与参数 Schema。', Firecrawl:'网站搜索、抓取与提取操作。', PhantomBuster:'Agent 工作流及参数。', TexAu:'自动化 Action 与参数。', '跨境魔方':'跨境电商数据 API 与接口参数。' }
const schemaKeys = (schema: JsonSchema) => Object.entries(schema.properties || {})
const stableStringify=(value:unknown):string=>Array.isArray(value)?'['+value.map(stableStringify).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value as Record<string,unknown>).sort().map(k=>JSON.stringify(k)+':'+stableStringify((value as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(value)??'null'
const fieldTitleZh:Record<string,string>={searchQueries:'行业 / 产品关键词',locations:'国家 / 城市',maxResults:'最大客户数量',minFollowers:'最低粉丝数',categories:'企业主页类别筛选',hasEmail:'仅保留公开邮箱',hasPhone:'仅保留公开电话',hasWebsite:'仅保留公开官网',includeWebsiteEnrichment:'补充官网联系方式',includeTransparency:'采集主页广告透明度',verifiedOnly:'仅保留已认证主页',runningAdsOnly:'仅保留正在投放广告的主页',minRecommendPercent:'最低推荐比例',minReviewCount:'最低评价数量',maxResultsPerQuery:'每个搜索词最大数量',searchStringsArray:'搜索关键词',searchString:'搜索关键词',searchTerms:'搜索关键词',searchQuery:'搜索查询',query:'搜索查询',locationQuery:'搜索地点',location:'搜索地点',categoryFilterWords:'商家类别关键词',startUrls:'起始网址',customGeolocation:'自定义地理位置',maxCrawledPlacesPerSearch:'每个搜索词最大采集数量',maxItems:'最大采集数量',includeNearbyPlaces:'包含附近地点',include_nearby_places:'包含附近地点',scrapeContacts:'采集联系方式',scrape_contacts:'采集联系方式',custom_geolocation:'自定义地理位置',keywords:'搜索关键词',max_result_per_keyword:'每个搜索词最大采集数量',proxyConfiguration:'代理配置',language:'语言',country:'国家',countryCode:'国家代码',city:'城市',state:'州 / 省',region:'地区'}
const titlePhraseZh:Record<string,string>={'search terms':'搜索关键词','search term':'搜索关键词','search query':'搜索查询','location':'搜索地点','maximum results':'最大结果数量','max results':'最大结果数量','max crawled places per search':'每个搜索词最大采集数量','start urls':'起始网址','place categories':'商家类别','include nearby places':'包含附近地点','scrape contacts':'采集联系方式','custom geolocation':'自定义地理位置','proxy configuration':'代理配置'}
const keyTokenZh:Record<string,string>={followers:'粉丝',verified:'认证',running:'投放',ads:'广告',recommend:'推荐',percent:'比例',reviews:'评价',enrichment:'补充',search:'搜索',string:'文本',strings:'关键词',term:'关键词',terms:'关键词',keyword:'关键词',keywords:'关键词',query:'查询',location:'地点',country:'国家',code:'代码',city:'城市',state:'州省',region:'地区',category:'类别',categories:'类别',filter:'筛选',words:'词语',start:'起始',urls:'网址',url:'网址',max:'最大',maximum:'最大',number:'数量',count:'数量',crawled:'采集',places:'商家',place:'商家',per:'每',include:'包含',nearby:'附近',scrape:'采集',contacts:'联系方式',contact:'联系人',custom:'自定义',geo:'地理',geolocation:'地理位置',proxy:'代理',configuration:'配置',language:'语言',results:'结果',items:'项目',pages:'页面',page:'页面',limit:'上限',radius:'半径',distance:'距离',sort:'排序',order:'顺序',date:'日期',website:'网站',email:'邮箱',phone:'电话',company:'公司',business:'企业',name:'名称',type:'类型',format:'格式',output:'输出',input:'输入',review:'评价',rating:'评分',stars:'星级',coordinates:'坐标',latitude:'纬度',longitude:'经度',requests:'请求',request:'请求',concurrency:'并发',timeout:'超时',depth:'深度',browser:'浏览器',cookies:'Cookie',headers:'请求头',selector:'选择器',extract:'提取',fields:'字段'}
const localizeTitle=(key:string,field:SchemaField)=>{const title=String(field.title||'').trim();const exact=fieldTitleZh[key]||titlePhraseZh[title.toLowerCase()]||titlePhraseZh[key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').toLowerCase()];if(exact)return exact;const source=title||key;const phrase=source.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').toLowerCase();const translated=phrase.split(' ').map(token=>keyTokenZh[token]).filter(Boolean);return translated.length?translated.join(''):(title||key)}
const localizeDescription=(key:string,field:SchemaField)=>({searchStringsArray:'请输入需要搜索的关键词。',keywords:'请输入一个或多个搜索关键词，每行一项。',location:'请输入采集目标所在的国家、城市或具体地区。',locationQuery:'请输入采集目标所在的国家、城市或具体地区。',max_result_per_keyword:'设置每个搜索关键词最多采集的商家数量。',maxCrawledPlacesPerSearch:'设置每个搜索关键词最多采集的商家数量。',categoryFilterWords:'填写用于筛选商家类别的关键词。',startUrls:'填写 Actor 开始访问的网页地址。',customGeolocation:'按 Actor 要求填写自定义地理范围或坐标。',custom_geolocation:'按 Actor 要求填写自定义地理范围或坐标。',includeNearbyPlaces:'设置是否同时采集指定地点附近的商家。',include_nearby_places:'设置是否同时采集指定地点附近的商家。',scrapeContacts:'设置是否采集商家公开联系方式。',scrape_contacts:'设置是否采集商家公开联系方式。'} as Record<string,string>)[key]||('请根据该字段的要求填写。'+(field.description?' 原始说明：'+field.description:'' ))
const fieldGuide=(key:string,field:SchemaField)=>{ const k=key.toLowerCase(); if(/^(searchqueries|locations|categories|starturls?|skipurls|skippageids)$/.test(k))return {what:'这是 Facebook 企业主页发现条件列表。每一行代表一个关键词、地区或排除项。',how:'如何填写：每行填写一项。关键词建议使用明确的行业或产品词；地区建议填写城市、州/省或国家。关键词与地区会交叉组合搜索。'}; if(/^(starturls?|googlemapsurls?)$/.test(k))return {what:'这是采集的入口网页地址。Actor 会从这些页面开始访问，再按自身规则继续抓取。它不是搜索关键词。',how:'如何获取：打开目标网站或具体搜索结果页，复制浏览器地址栏里的完整链接（通常以 https:// 开头），粘贴到这里。优先使用公开、无需登录即可访问的页面；如果有多个入口，每行填写一个。',example:'https://example.com/directory'}; if(/url|uri|website|webpage/.test(k))return {what:'填写目标网页的完整网址，系统会按 Actor 的规则访问或提取该页面。',how:'如何获取：在浏览器打开目标页面，复制地址栏完整链接。请确认链接可以正常打开，并符合下方格式要求。',example:'https://example.com'}; if(/search|string|keyword|query|term/.test(k))return {what:'告诉 Actor 要查找的内容。通常填写产品、公司、行业或目标人群关键词。',how:'如何填写：使用具体、可搜索的短语；多个词条按输入框提示分行填写。不要把网站链接填在这里，除非字段说明明确要求 URL。'}; if(/country|countrycode/.test(k))return {what:'限定数据所在的国家或市场。',how:'如何填写：选择目标企业或用户实际所在的国家；国家代码字段请按 Actor 要求使用 ISO 国家代码。'}; if(/location|city|region|state|province|geo/.test(k))return {what:'限定采集的地理范围，可能是国家、城市、地区或坐标。',how:'如何填写：优先使用目标企业实际所在地的标准名称；如果字段要求坐标或地理对象，请严格按 Schema 示例填写。'}; if(/max|limit|count|number|results|items|depth|radius|timeout/.test(k))return {what:'控制采集数量、范围或执行限制。数值越大通常意味着更多结果和更长执行时间，也可能增加费用。',how:'如何填写：先使用适中的数量进行小范围采集，再根据结果调整。请遵守字段给出的最小值和最大值。'}; if(/email|phone|contact/.test(k))return {what:'控制联系方式的采集或筛选。具体能否获得数据取决于来源网站和 Actor 能力。',how:'如何填写：只有在字段类型或枚举要求时才填写具体联系方式；如果是开关，按是否需要采集公开联系方式选择。'}; if(/proxy/.test(k))return {what:'代理网络配置，影响 Actor 如何连接目标网站。',how:'如何获取：通常使用 Actor 默认代理配置即可；只有在你已了解代理服务并拥有相应配置时才手动修改。'}; const type=fieldType(field); return {what:field.description?String(field.description):'该参数由当前 Actor 自己定义，具体行为以 Actor 的说明为准。',how:type==='array'?'如何填写：按要求提供列表；如果是文本列表输入框，每行填写一项。':type==='object'?'如何填写：按 JSON 对象格式填写，并保留字段名、引号和括号。':type==='boolean'?'如何填写：开启表示启用该功能，关闭表示不启用。':'如何填写：参考字段类型、格式和约束；不确定时先保留默认值或查看 Actor 原始说明。'} };
const countryForOption=(value:unknown)=>countries.find(c=>[c.code,c.name,c.geoName].some(x=>String(x).toLowerCase()===String(value).toLowerCase()))
const countryOptionLabel=(value:unknown)=>{const found=countryForOption(value);return found?found.flag+' '+found.name+' · '+found.code:String(value)}
const countryValueForField=(country:typeof countries[number],key:string,field:SchemaField)=>{const semantic=(key+' '+String(field.description||'')).toLowerCase();if(/country.?code|iso.?3166|alpha.?2|two.?letter country/.test(semantic))return country.code;if(/country.?name|country name/.test(semantic))return country.geoName;const sample=String(field.example??field.prefill??field.default??'');if(/^[A-Z]{2}$/.test(sample))return country.code;return country.geoName}
const localizeEnum=(value:unknown)=>({true:'是',false:'否',daily:'每天',weekly:'每周',monthly:'每月',popular:'热门',relevance:'相关度',newest:'最新',oldest:'最早',ascending:'升序',descending:'降序'} as Record<string,string>)[String(value).toLowerCase()]||String(value)
const fieldType=(field:SchemaField)=>Array.isArray(field.type)?field.type.find(x=>x!=='null')||'string':field.type||'string'
const deriveSchemaRequirements=(schema:JsonSchema)=>{const requiredFields=new Set<string>(schema.required||[]);const props=schema.properties||{};const searchEntryPattern=/^(searchstringsarray|searchterms?|searchstrings?|searchqueries?|searchquery|keywords?|categoryfilterwords|placecategories|categories|starturls?|googlemapsurls)$/i;const searchEntries=Object.keys(props).filter(key=>searchEntryPattern.test(key));const discoveryEntries=props.searchQueries?['searchQueries','startUrls'].filter(key=>Object.prototype.hasOwnProperty.call(props,key)):searchEntries;const atLeastOneGroups:string[][]=[];if(discoveryEntries.length>1)atLeastOneGroups.push(discoveryEntries);else if(discoveryEntries.length===1)requiredFields.add(discoveryEntries[0]);for(const [key,field] of Object.entries(props)){const description=(key+' '+String(field.title||'')+' '+String(field.description||'')).toLowerCase();if(/^(location|locationquery|location_query|searchlocation)$/i.test(key)&&/geographic area to search|location to search|search location/.test(description))requiredFields.add(key);if(/required|must provide|cannot be empty|is mandatory/.test(description))requiredFields.add(key);}return {requiredFields,atLeastOneGroups}}
const schemaPathLabel=(schema:JsonSchema,path:string)=>{let properties=schema.properties||{};return path.replace(/\[(\d+)\]/g,'.$1').split('.').map(part=>{if(/^\d+$/.test(part))return '第'+part+'项';const field=properties[part];const label=field?localizeTitle(part,field):'Actor 参数';properties=field?.properties||{};return label}).join(' / ')}
const schemaPathAnchor=(path:string)=>'schema-field-'+encodeURIComponent(path).replace(/%/g,'-')
const isEmptyRequired=(value:unknown)=>value===undefined||value===null||value===''||(Array.isArray(value)&&value.length===0)||(typeof value==='object'&&value!==null&&!Array.isArray(value)&&Object.keys(value as object).length===0)
const getDefaultValue = (field: SchemaField, required=false) => field.default ?? (fieldType(field)==='boolean' ? false : fieldType(field)==='array' ? (required?'':field.editor==='stringList'?'':'[]') : fieldType(field)==='object' ? (required?'':'{}') : '')
const normalizeValuesForAi=(schema:JsonSchema,values:Record<string,unknown>)=>Object.fromEntries(schemaKeys(schema).flatMap(([key,field])=>{const raw=values[key];if(isEmptyRequired(raw))return [];const type=fieldType(field);if(type==='integer'||type==='number'){const number=Number(raw);return Number.isFinite(number)?[[key,number]]:[]}if(type==='array'||type==='object'){if(typeof raw==='string'){try{return [[key,JSON.parse(raw)]]}catch{return []}}return [[key,raw]]}return [[key,raw]]}))
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

export default function LeadDiscoveryWizard({ workspaceId, userId, onTaskCreated, page }: Props) {
 const [channel,setChannel] = useState(page.platformKeys[0] || 'google-maps')
 const [provider,setProvider] = useState('Apify')
 const [directoryPlatforms,setDirectoryPlatforms] = useState<DirectoryPlatform[]>([])
 const [directoryReady,setDirectoryReady] = useState(false)
 const [directoryProviders,setDirectoryProviders] = useState<DirectoryProvider[]>([])
 const [providerConnections,setProviderConnections] = useState<Record<string,boolean>>({})
 const [providerAdapters,setProviderAdapters] = useState<ProviderAdapterRow[]>([])
 const [selectedAdapterKey,setSelectedAdapterKey] = useState('')
 const [selectedCategory,setSelectedCategory] = useState('search')
 const [aiSidebarOpen,setAiSidebarOpen] = useState(false)
 useEffect(()=>{let active=true;if(!supabase){setDirectoryReady(true);return}
  Promise.all([
   supabase.from('discovery_platforms').select('platform_key,platform_name,category_key,search_terms,description,sort_order').eq('is_active',true).order('sort_order'),
   supabase.from('discovery_providers').select('provider_key,provider_name,provider_type,description,is_active').eq('is_active',true).order('provider_name')
  ]).then(([platformResult,providerResult])=>{if(!active)return;if(!platformResult.error&&platformResult.data?.length)setDirectoryPlatforms(platformResult.data as DirectoryPlatform[]);if(!providerResult.error&&providerResult.data?.length)setDirectoryProviders(providerResult.data as DirectoryProvider[]);setDirectoryReady(true)},()=>{if(active)setDirectoryReady(true)});
  return()=>{active=false}},[])
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
 const [approvedActors,setApprovedActors] = useState<Actor[]>([])
 const [approvedOffset,setApprovedOffset] = useState(0)
 const [hasMoreApproved,setHasMoreApproved] = useState(false)
 const [approvedBusy,setApprovedBusy] = useState(false)
 const [candidateOffset,setCandidateOffset] = useState(0)
 const [hasMoreCandidates,setHasMoreCandidates] = useState(false)
 const [expandedHelp,setExpandedHelp] = useState<Record<string,boolean>>({})
 const [city,setCity] = useState('')
 const [cityQuery,setCityQuery] = useState('')
 const [cityResults,setCityResults] = useState<Array<{place_id:number;display_name:string;name?:string;lat?:string;lon?:string}>>([])
 const [regionResults,setRegionResults] = useState<Array<{place_id:number;display_name:string;name?:string;lat?:number;lon?:number}>>([])
 const [locationBusy,setLocationBusy] = useState(false)
 const [citySearchBusy,setCitySearchBusy] = useState(false)
 const [countryPickerOpen,setCountryPickerOpen] = useState(false)
 const [countrySearch,setCountrySearch] = useState('')
 const [actorQuery,setActorQuery] = useState('')
 const [actorVerificationStatus,setActorVerificationStatus] = useState('unverified')
 const [actorMaintenanceStatus,setActorMaintenanceStatus] = useState('unmaintained')
 const [actors,setActors] = useState<Actor[]>([])
 const [actorBusy,setActorBusy] = useState(false)
 const [actor,setActor] = useState<Actor|null>(null)
 const [actorPickerOpen,setActorPickerOpen] = useState(true)
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
 const [aiSuggestions,setAiSuggestions] = useState<string[]>([])
 const [manualConfigOpen,setManualConfigOpen] = useState(false)
 const [autoAnalysisKey,setAutoAnalysisKey] = useState('')
 const [keywords,setKeywords] = useState('')
 const [product,setProduct] = useState('')
 const [industry,setIndustry] = useState('')
 const [targetType,setTargetType] = useState<'companies'|'contacts'|'both'>('both')
 const [targetCount,setTargetCount] = useState('100')
 const [maxCost,setMaxCost] = useState('10')
 const [facebookHasEmail,setFacebookHasEmail] = useState(false)
 const [facebookHasPhone,setFacebookHasPhone] = useState(false)
 const [facebookHasWebsite,setFacebookHasWebsite] = useState(false)
 const [taskName,setTaskName] = useState('')
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const [showRequestPreview,setShowRequestPreview] = useState(true)
  const [facebookFlowStep,setFacebookFlowStep] = useState(1)
  const [facebookCookieValue,setFacebookCookieValue] = useState('')
  const [facebookCookieSecretRef,setFacebookCookieSecretRef] = useState('')
  const [facebookCookieSaving,setFacebookCookieSaving] = useState(false)
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
   if(typeof value==='string'){if(field.minLength!==undefined&&value.length<field.minLength){errors[path]='至少 '+field.minLength+' 个字符';return undefined}if(field.maxLength!==undefined&&value.length>field.maxLength){errors[path]='最多 '+field.maxLength+' 个字符';return undefined}if(field.pattern){try{if(!new RegExp(field.pattern).test(value)){errors[path]='格式不符合要求';return undefined}}catch{errors[path]='Schema 格式规则无效';return undefined}}if(field.format==='uri'||field.format==='url'||/^(starturls?|urls?)$/i.test(path.split(/[.[]/)[0])){try{const parsed=new URL(value);if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname||/\\s/.test(value))throw new Error('invalid')}catch{errors[path]='请输入完整有效的网址（需包含 https:// 或 http://），不能填写关键词或域名片段';return undefined}}if(field.format==='email'&&!/^\S+@\S+\.\S+$/.test(value)){errors[path]='请输入有效邮箱地址';return undefined}}
   if(field.enum?.length&&!field.enum.some(option=>JSON.stringify(option)===JSON.stringify(value))){errors[path]='请选择有效选项';return undefined}
   if(Array.isArray(value)){if(field.minItems!==undefined&&value.length<field.minItems){errors[path]='至少需要 '+field.minItems+' 项';return undefined}if(field.maxItems!==undefined&&value.length>field.maxItems){errors[path]='最多允许 '+field.maxItems+' 项';return undefined}if(field.items)value=value.map((item,index)=>validateField(field.items!,item,path+'['+(index+1)+']',false))}
   if(type==='object'&&field.properties){const obj=value as Record<string,unknown>;for(const [key,child] of Object.entries(field.properties))validateField(child,obj[key],path+'.'+key,(field.required||[]).includes(key))}
   return value
  }
  for(const [key,field] of schemaKeys(schema||{})){const value=validateField(field,values[key],key,requirements.requiredFields.has(key));const hasNestedErrors=Object.keys(errors).some(path=>path===key||path.startsWith(key+'.')||path.startsWith(key+'['));if(!hasNestedErrors&&!isEmptyRequired(value))payload[key]=value}
  for(const group of requirements.atLeastOneGroups){if(group.every(key=>isEmptyRequired(payload[key]))){errors[group[0]]='搜索入口至少填写一项：'+group.map(key=>localizeTitle(key,schema?.properties?.[key]||{})).join(' / ')}}
  return {errors,payload,valid:Object.keys(errors).length===0}
 },[schema,values])
 useEffect(()=>{if(aiGenerated&&aiAnalyzedContext&&aiAnalyzedContext!==aiContextKey){setAiApplied(false);setAiError('市场或搜索任务配置已变化。之前的 AI 分析不能直接应用，请重新分析。')}},[aiContextKey])
 const availableProviders = providerByPlatform[channel] || ['Apify']
 const pagePlatforms = directoryPlatforms.filter(item=>page.platformKeys.includes(item.platform_key))
 const categories = [...new Set(pagePlatforms.map(item=>item.category_key))]
 const visiblePlatforms = pagePlatforms.filter(item=>item.category_key===selectedCategory)
 const categoryLabels:Record<string,string>={social:'社交媒体',search:'搜索与地图',b2b:'B2B 商业平台',commerce:'电商平台',web:'企业网站与商业数据'}
 const selectedProviderKey=providerKeyOf(provider)
 const canSearchSelectedProvider = ['apify','brightdata','firecrawl'].includes(selectedProviderKey)&&providerConnections[selectedProviderKey]===true
 useEffect(()=>{const first=page.platformKeys.map(key=>directoryPlatforms.find(item=>item.platform_key===key)).find((item):item is DirectoryPlatform=>Boolean(item));if(first){if(!page.platformKeys.includes(channel))setChannel(first.platform_key);setSelectedCategory(first.category_key);setActorQuery(first.search_terms||first.platform_name)}},[page.id,directoryPlatforms])
 useEffect(()=>{let active=true;if(!supabase||!workspaceId)return()=>{active=false};supabase.from('integration_connections').select('provider_key,provider_name,status,is_enabled').eq('workspace_id',workspaceId).then(({data})=>{if(!active)return;const rows=data||[];setProviderConnections(Object.fromEntries(rows.map(row=>[String(row.provider_key),row.status==='connected'&&row.is_enabled===true])));setDirectoryProviders(current=>{const known=new Set(current.map(item=>item.provider_key));const extras=rows.filter(row=>!known.has(String(row.provider_key))).map((row,index)=>({provider_key:String(row.provider_key),provider_name:String(row.provider_name||row.provider_key),provider_type:'已接入 API',description:'该服务已在系统设置连接；采集执行适配器需按渠道配置。',is_active:true,sort_order:900+index}));return [...current,...extras]})});return()=>{active=false}},[workspaceId])
 const loadProviderAdapters=async()=>{
  if(!supabase||!workspaceId||selectedProviderKey==='apify'){setProviderAdapters([]);return}
  const {data,error:queryError}=await supabase.from('workspace_adapter_selections').select('adapter_key,config,discovery_adapter_catalog!inner(adapter_name,external_actor_id,input_schema,verification_status,maintenance_status,is_active,provider_key,pricing_model)').eq('workspace_id',workspaceId).eq('channel_key',channel).eq('is_enabled',true).eq('discovery_adapter_catalog.provider_key',selectedProviderKey).order('priority')
  if(queryError){setError(queryError.message);setProviderAdapters([]);return}
  const rows=(data||[]) as unknown as ProviderAdapterRow[]
  setProviderAdapters(rows.filter(row=>row.discovery_adapter_catalog.verification_status==='verified'&&row.discovery_adapter_catalog.maintenance_status==='maintained'&&row.discovery_adapter_catalog.is_active===true))
 }
 useEffect(()=>{void loadProviderAdapters()},[workspaceId,channel,selectedProviderKey])

 const selectedCountry = countries.find(c=>c.code===countryCode)
 const selectedCountryItems = countries.filter(c=>selectedCountries.includes(c.code))
 const toggleCountry = (code:string) => {
  const next=selectedCountries.includes(code)?selectedCountries.filter(x=>x!==code):[...selectedCountries,code]
  setSelectedCountries(next)
  if(!next.length){setCountryCode('');setRegion('');setCity('')}
  else if(!next.includes(countryCode)||!countryCode||!selectedCountries.includes(code))setCountryCode(next[next.length-1])
 }

 useEffect(()=>{ setActor(null); setSchema(null); setSelectedAdapterKey(''); setProviderAdapters([]); setActors([]); setApprovedActors([]); setApprovedOffset(0); setHasMoreApproved(false); setCandidateOffset(0); setHasMoreCandidates(false); setValues({}); setActorVerificationStatus('unverified'); setActorMaintenanceStatus('unmaintained'); setError(''); setNotice('') },[channel])
 useEffect(()=>{ setActor(null);setSchema(null);setSelectedAdapterKey('');setValues({});setActorVerificationStatus('unverified');setActorMaintenanceStatus('unmaintained');setError('');setNotice('') },[provider])
 useEffect(()=>{const group=platformGroups.find(g=>g.items.some(([id])=>id===channel));if(group)setExpandedPlatformGroup(group.label);const current=directoryPlatforms.find(item=>item.platform_key===channel);if(current)setSelectedCategory(current.category_key)},[channel,directoryPlatforms])
 useEffect(()=>{
  let active=true
  if(!countryCode){setRegionResults([]);setRegion('__all__');setRegionManual('');setCity('');setMapLocation(null);setRegionLoadError('');setLocationBusy(false);return}
  if(page.id==='facebook-pages'){setRegionResults([]);setRegion('__all__');setRegionManual('');setMapLocation(null);setRegionLoadError('');setLocationBusy(false);return}
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

 const loadApprovedActors = async (offset=0,append=false) => {
  if(!supabase||!workspaceId||selectedProviderKey!=='apify'){setApprovedActors([]);setApprovedOffset(0);setHasMoreApproved(false);return}
  setApprovedBusy(true)
  try {
   const connection=await supabase.from('integration_connections').select('status,is_enabled').eq('workspace_id',workspaceId).eq('provider_key','apify').maybeSingle()
   if(connection.error)throw connection.error
   if(!connection.data||connection.data.status!=='connected'||connection.data.is_enabled!==true){setApprovedActors([]);setApprovedOffset(0);setHasMoreApproved(false);return}
   const selections=await supabase.from('workspace_adapter_selections').select('adapter_key').eq('workspace_id',workspaceId).eq('channel_key',channel).eq('is_enabled',true)
   if(selections.error)throw selections.error
   const enabledKeys=(selections.data||[]).map(row=>String(row.adapter_key)).filter(Boolean)
   if(!enabledKeys.length){setApprovedActors([]);setApprovedOffset(0);setHasMoreApproved(false);return}
   let catalogQuery=supabase.from('discovery_adapter_catalog')
    .select('adapter_key,adapter_name,external_actor_id,adapter_version,capabilities,pricing_model,supported_record_types')
    .in('adapter_key',enabledKeys).eq('provider_key','apify').eq('channel_key',channel).eq('is_active',true)
    .overlaps('supported_record_types',['company','contact'])
   if(channel==='facebook')catalogQuery=catalogQuery.in('external_actor_id',facebookProfileActors.map(item=>item.username+'~'+item.name))
   else catalogQuery=catalogQuery.eq('verification_status','verified').eq('maintenance_status','maintained')
   const {data,error:queryError}=await catalogQuery.order('updated_at',{ascending:false}).range(offset,offset+4)
   if(queryError)throw queryError
   const rows=(data||[]) as Array<Record<string,unknown>>
   const mapped:Actor[]=rows.map(row=>{
    const id=String(row.external_actor_id||'');const [username,name]=id.split('~')
    const caps=(row.capabilities||{}) as Record<string,unknown>
    const types=Array.isArray(row.supported_record_types)?(row.supported_record_types as string[]).map(x=>x==='company'?'企业':'联系人').join(' / '):'客户资料'
    return {id,title:String(row.adapter_name||name||id),name:name||id,username:username||'',adapterKey:String(row.adapter_key||''),description:'已启用 · 可直接执行 · 支持'+types+' · Build '+String(row.adapter_version||''),url:String(caps.actor_url||''),currentPricingInfo:(row.pricing_model||{}) as Record<string,unknown>}
   }).filter(item=>item.username&&item.name)
   setApprovedActors(mapped)
   setApprovedOffset(offset+rows.length);setHasMoreApproved(rows.length===5)
  }catch(e){setError(e instanceof Error?e.message:'读取已审核 Actor 目录失败')}
  finally{setApprovedBusy(false)}
 }
 useEffect(()=>{void loadApprovedActors(0,false)},[workspaceId,channel,provider])
 const searchActors = async (_queryOverride?:string,_append=false,_previous=false) => {
  setActors([]);setCandidateOffset(0);setHasMoreCandidates(false)
  setNotice('搜索任务仅展示已审核、已启用且维护正常的 Actor。请管理员在 Actor 配置中心导入并审核新的 Actor。')
 }
 const selectActor = async (item: Actor) => {
  if(!supabase){setError('Supabase 尚未配置，请先完成系统连接。');return}
  setActor(item);setActorPickerOpen(false);setSchema(null);setValues({});setAiGenerated(null);setAiSummary('');setAiStrategy('');setAiWarnings([]);setAiSuggestions([]);setAiMissingInformation([]);setAiFieldExplanations({});setAiApplied(false);setAiAnalyzedContext('');setAutoAnalysisKey('');setAiError('');setSchemaBusy(true);setError('');setNotice('');
  setChatMessages(current=>[current[0],...current.filter(message=>message.role==='user'),{role:'assistant',content:'已选择 '+(item.title||item.name)+'。我正在读取它的真实输入 Schema，随后会根据参数要求继续与你确认。'}])
  const actorId=item.username+'~'+item.name
  const {data,error:invokeError}=await supabase.functions.invoke('apify-actor-schema',{body:{workspace_id:workspaceId,actor_id:actorId,channel_key:channel,supported_record_types:channel==='facebook'?['company']:['company','contact']}})
  if(invokeError||data?.error){setError(data?.error||invokeError?.message||'读取 Actor Schema 失败');setActor(null);setActorPickerOpen(true);setSchemaBusy(false);return}
  setActorVerificationStatus(String(data.verification_status||'unverified'))
  setActorMaintenanceStatus(String(data.maintenance_status||'unmaintained'))
  const nextSchema=(data.input_schema || {}) as JsonSchema
  const requirements=deriveSchemaRequirements(nextSchema)
   let initial:Record<string,unknown>=Object.fromEntries(schemaKeys(nextSchema).map(([key,field])=>[key,getDefaultValue(field,requirements.requiredFields.has(key))]))
   const {data:configuredSelections}=await supabase.from('workspace_adapter_selections').select('adapter_key,config,discovery_adapter_catalog!inner(external_actor_id)').eq('workspace_id',workspaceId).eq('channel_key',channel).eq('is_enabled',true)
   const configured=(configuredSelections||[]).find((row:any)=>row.discovery_adapter_catalog?.external_actor_id===actorId)
   setSelectedAdapterKey(String(configured?.adapter_key||item.adapterKey||''))
   const configuredConfig=(configured?.config||{}) as Record<string,unknown>
   const defaults=(configuredConfig.input_defaults||{}) as Record<string,unknown>
   initial={...initial,...Object.fromEntries(Object.entries(defaults).filter(([key])=>Object.prototype.hasOwnProperty.call(nextSchema.properties||{},key)))}
  setSchema(nextSchema);setValues(initial);if(page.id==='facebook-pages'){const countKey=Object.keys(nextSchema.properties||{}).find(key=>/^(maxResults|maxItems|maxResultsPerQuery)$/i.test(key));if(countKey&&initial[countKey]!==undefined)setTargetCount(String(initial[countKey]))}
  setNotice(data.verification_status==='verified'&&data.maintenance_status==='maintained'?'已读取 Actor 最新输入 Schema。该数据源已通过客户输出审核。':'已读取 Actor 最新输入 Schema。该 Actor 尚未通过直接客户资料审核，当前只能预览参数，不能启动正式采集。')
  setSchemaBusy(false)
 }
 useEffect(()=>{
  if(!isFacebookMatrix||!canSearchSelectedProvider||actor||schemaBusy)return
  void selectActor({id:facebookMatrixActorId,username:'get-leads',name:'all-in-one-facebook-scraper',title:'All-in-One Facebook Scraper',description:'12 种 Facebook 数据发现模式，按最新 Actor Schema 动态配置。',url:'https://apify.com/get-leads/all-in-one-facebook-scraper'})
 },[isFacebookMatrix,canSearchSelectedProvider,actor?.id,schemaBusy,workspaceId])
 const saveFacebookCookie=async()=>{
  if(!supabase||!facebookCookieValue.trim())return
  setFacebookCookieSaving(true);setError('')
  try{
   const {data,error:saveError}=await supabase.functions.invoke('facebook-discovery-secret',{body:{workspace_id:workspaceId,secret:facebookCookieValue.trim()}})
   if(saveError||data?.error)throw new Error(data?.error||saveError?.message||'安全保存 Cookie 失败')
   setFacebookCookieSecretRef(String(data.secret_ref||''))
   const cookieKey=Object.keys(schema?.properties||{}).find(key=>/^(loginCookies|cookies)$/i.test(key))
   if(cookieKey)setValues(current=>({...current,[cookieKey]:'__vault_secret__'}))
   setFacebookCookieValue('')
   setNotice('登录凭据已加密保存，仅用于本次 Actor 启动。')
  }catch(e){setError(e instanceof Error?e.message:'安全保存 Cookie 失败')}
  finally{setFacebookCookieSaving(false)}
 }
 const selectFacebookActor=(option:typeof facebookProfileActors[number])=>{
  const configured=approvedActors.find(item=>item.username===option.username&&item.name===option.name)
  const selected:Actor=configured||{id:option.username+'~'+option.name,username:option.username,name:option.name,title:option.title,description:option.description,url:'https://apify.com/'+option.username+'/'+option.name}
  setActor(selected);setSelectedAdapterKey(configured?.adapterKey||'');setSchema(null);setValues({});setActorPickerOpen(false)
  setActorVerificationStatus('not_required');setActorMaintenanceStatus('not_required');setError('')
  setNotice('已选择 '+option.title+'。Facebook 固定 Actor 无需人工审核，通用表单参数将直接转换为 Actor 接口格式。')
 }
 const selectProviderAdapter=(row:ProviderAdapterRow)=>{
  const catalog=row.discovery_adapter_catalog;const nextSchema=(catalog.input_schema||{}) as JsonSchema
  setSelectedAdapterKey(row.adapter_key);setActor({id:catalog.external_actor_id,name:catalog.external_actor_id,username:selectedProviderKey,title:catalog.adapter_name,description:'已审核 · 已启用 · '+selectedProviderKey,url:'',adapterKey:row.adapter_key,currentPricingInfo:catalog.pricing_model||{}})
  setSchema(nextSchema);setActorPickerOpen(false);setValues({...Object.fromEntries(Object.entries(nextSchema.properties||{}).map(([key,field])=>[key,getDefaultValue(field,(nextSchema.required||[]).includes(key))])),...((row.config?.input_defaults||{}) as Record<string,unknown>)})
  setActorVerificationStatus(catalog.verification_status);setActorMaintenanceStatus(catalog.maintenance_status);setError('');setNotice('已读取该采集器的参数 Schema。填写参数后可直接创建任务。')
 }
 const renderField = ([key,field]:[string,SchemaField]) => {
  const type=fieldType(field)
  const requirements=deriveSchemaRequirements(schema||{})
  const required=requirements.requiredFields.has(key)
  const groupRequired=requirements.atLeastOneGroups.some(group=>group.includes(key))
  const value=values[key] ?? getDefaultValue(field,required)
  const set=(v:unknown)=>{setValues(current=>({...current,[key]:v}));if(page.id==='facebook-pages'&&/^(maxResults|maxItems|maxResultsPerQuery)$/i.test(key))setTargetCount(String(v??''))}
  const enumValues=field.enum || []
  const semantic=key.toLowerCase()
  const countryField=/country|countrycode|country_code/.test(semantic)
  const regionField=/^(state|region|province|stateorprovince)$/.test(semantic)||/stateorprovince|regionname|province/.test(semantic)
  const cityField=/^city$|cityname|city_name/.test(semantic)
  const portField=/port|seaport|unlocode/.test(semantic)
  const showHelp=Boolean(expandedHelp[key])
  const guide=fieldGuide(key,field)
  const fieldErrors=Object.entries(schemaValidation.errors).filter(([path])=>path===key||path.startsWith(key+'.')||path.startsWith(key+'['))
  const fieldError=fieldErrors.length>0
  const constraints=[field.minimum!==undefined?'≥ '+field.minimum:'',field.maximum!==undefined?'≤ '+field.maximum:'',field.minLength!==undefined?'最少 '+field.minLength+' 字符':'',field.maxLength!==undefined?'最多 '+field.maxLength+' 字符':'',field.minItems!==undefined?'至少 '+field.minItems+' 项':'',field.maxItems!==undefined?'最多 '+field.maxItems+' 项':'',field.pattern?'正则格式':'',field.format?field.format:''].filter(Boolean)
  return <label id={schemaPathAnchor(key)} className={'ldw-field ldw-schema-field '+(fieldError?'has-error':'')} key={key}>
   <span className="ldw-field-heading"><span className="ldw-field-label">{localizeTitle(key,field)}{required&&<b> * 必填</b>}{groupRequired&&<b> * 至少填写一项</b>}</span><small className="ldw-field-type">{Array.isArray(field.type)?field.type.join(' / '):(field.type||'text')}</small>{constraints.length>0&&<small className="ldw-constraint-chip">{constraints.join(' · ')}</small>}<button type="button" className="ldw-help-button" aria-expanded={showHelp} onClick={e=>{e.preventDefault();setExpandedHelp(current=>({...current,[key]:!current[key]}))}}><HelpCircle size={13}/>{showHelp?'收起说明':'字段说明'}</button></span>
   {enumValues.length>0?<select value={String(value)} onChange={e=>{const next=e.target.value;set(next);if(countryField){const found=countryForOption(next);if(found){setCountryCode(found.code);setSelectedCountries(current=>current.includes(found.code)?current:[...current,found.code])}}}}><option value="">请选择</option>{enumValues.map(option=><option key={String(option)} value={String(option)}>{countryField?countryOptionLabel(option):localizeEnum(option)}</option>)}</select>
   :countryField?<select value={String(value)} onChange={e=>{const next=e.target.value;const found=countries.find(c=>c.code===next||c.geoName===next||c.name===next);set(found?countryValueForField(found,key,field):next);if(found){setCountryCode(found.code);setSelectedCountries(current=>current.includes(found.code)?current:[...current,found.code])}}}><option value="">选择国家</option>{countries.map(c=><option key={c.code} value={countryValueForField(c,key,field)}>{c.flag} {c.name} · {c.code}</option>)}</select>
   :regionField?<select value={String(value)} onChange={e=>set(e.target.value)} disabled={!countryCode||locationBusy}><option value="">全部地区（不限制）</option>{regionResults.map(r=><option key={r.place_id} value={r.name||r.display_name}>{r.name||r.display_name}</option>)}</select>
   :cityField?<><div className="ldw-city-search-row"><input value={cityQuery||String(value)} onChange={e=>{setCityQuery(e.target.value);set('')}} placeholder="输入城市名称…"/><button type="button" onClick={()=>void searchCities()} disabled={!countryCode||citySearchBusy}><Search size={12}/>{citySearchBusy?'搜索中':'搜索'}</button></div>{cityResults.length>0&&<div className="ldw-city-results">{cityResults.map(item=><button type="button" key={item.place_id} onClick={()=>{set(item.name||item.display_name);setCityQuery('');setCityResults([])}}><MapPin size={13}/><span>{item.display_name}</span></button>)}</div>}</>
   :portField?<select value={String(value)} onChange={e=>set(e.target.value)}><option value="">选择港口</option>{portCatalog.map(([code,name])=><option key={code} value={code}>{name} · {code}</option>)}</select>
   :type==='boolean'?<input type="checkbox" checked={Boolean(value)} onChange={e=>set(e.target.checked)}/>
    :type==='integer'||type==='number'?<input type="number" min={field.minimum} max={field.maximum} step={type==='integer'?1:'any'} value={String(value)} placeholder={typeof field.placeholderValue==='string'?field.placeholderValue:(typeof field.example==='string'?field.example:(Array.isArray(field.prefill)?'例如：'+field.prefill.slice(0,3).join('、'):''))} aria-invalid={Boolean(fieldError)} onChange={e=>set(e.target.value)}/>
   :type==='array'&&(field.editor==='stringList'||['searchQueries','locations','categories','startUrls','skipUrls','skipPageIds'].includes(key))?<textarea rows={3} value={Array.isArray(value)?value.join('\n'):String(value)} onChange={e=>set(e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))} placeholder={Array.isArray(field.example)?'例如：'+field.example.slice(0,3).join('、'):'每行填写一项'}/>
   :type==='array'||type==='object'?<textarea rows={3} value={String(value)} onChange={e=>set(e.target.value)} placeholder={type==='array'?'请输入 JSON 数组':'请输入 JSON 对象'}/>
    :<input type={field.format==='uri'?'url':field.format==='email'?'email':field.format==='date'?'date':field.format==='date-time'?'datetime-local':'text'} minLength={field.minLength} maxLength={field.maxLength} pattern={field.pattern} value={String(value)} aria-invalid={Boolean(fieldError)} onChange={e=>set(e.target.value)}/>}
   <small className="ldw-field-key">Actor 原始字段：{key}</small>{fieldErrors.map(([path,message])=><small className="ldw-field-error" key={path}>{path===key?'':schemaPathLabel(schema||{},path)+'：'}{message}</small>)}<div className="ldw-field-guide"><small><b>这个字段是什么：</b>{guide.what}</small><small><b>{guide.how.startsWith('如何获取')?'如何获取：':'填写建议：'}</b>{guide.how.replace(/^如何获取：|^如何填写：/,'')}</small>{field.description&&<small><b>Schema 原始说明：</b>{field.description}</small>}{field.default!==undefined&&<small><b>默认值：</b><code>{JSON.stringify(field.default)}</code></small>}{field.prefill!==undefined&&<small><b>推荐预填：</b><code>{JSON.stringify(field.prefill)}</code></small>}{field.pattern&&<small><b>格式规则：</b><code>{field.pattern}</code></small>}{field.format&&<small><b>数据格式：</b>{field.format}</small>}{guide.example&&<small><b>示例：</b><code>{guide.example}</code></small>}{field.example!==undefined&&<small><b>Actor 提供的示例：</b><code>{typeof field.example==='string'?field.example:JSON.stringify(field.example)}</code></small>}{showHelp&&<small className="ldw-field-help">Actor 原始说明：{field.description||'未提供原始说明'} · {localizeDescription(key,field)}</small>}</div>
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
   const supportedPlatforms=pagePlatforms.length?pagePlatforms.map(item=>({id:item.platform_key,name:item.platform_name})):platformGroups.flatMap(group=>group.items.filter(([id])=>page.platformKeys.includes(id)).map(([id,name])=>({id,name})))
   const response=await fetch('https://ouranos-ai-assistant.xg-y.workers.dev',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+sessionData.session.access_token},
    body:JSON.stringify({
     mode,model:aiModel,user_request:requestText,conversation:messages.slice(-20),
     supported_platforms:supportedPlatforms,channel,actor_id:activeActor?activeActor.username+'~'+activeActor.name:'',actor_name:activeActor?.title||'',actor_description:activeActor?.description||'',
     actor_schema:activeSchema,
     previous_actor_input:activeSchema?normalizeValuesForAi(activeSchema,values):{},
     required_fields:activeSchema?[...deriveSchemaRequirements(activeSchema).requiredFields]:[],
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
       setActors([]);setActorQuery('');setCandidateOffset(0);setHasMoreCandidates(false)
       setChatMessages(current=>[...current,{role:'assistant',content:'已识别平台：'+platform.name+'。系统只会展示 Actor 配置中心中已审核、已启用且维护正常的数据源。'}])
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
   setAiSuggestions(Array.isArray(result.suggestions)?result.suggestions.map(String):[])
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
  const isFacebookPeople=page.id==='facebook-pages'
  const isFacebookMatrix=page.id==='facebook-matrix'
  const facebookMatrixActorId='get-leads~all-in-one-facebook-scraper'
  if(!supabase){setError('Supabase 尚未配置，请先完成系统连接。');return}
  if(!workspaceId||!userId){setError('当前工作空间或用户会话不可用，请重新登录后重试。');return}
  if(!actor){setError('请先选择一个 Facebook 个人资料 Actor。');return}
  if(!isFacebookPeople&&!schema)return
  if(!isFacebookPeople&&(actorVerificationStatus!=='verified'||actorMaintenanceStatus!=='maintained')){setError('该 Actor 尚未通过直接客户资料审核或维护状态检查，暂不能启动正式采集。');return}
  if(isFacebookPeople){
   if(!keywords.trim()){setError('请填写搜索关键词，例如 real estate agent、software engineer。');return}
   if(!countryCode){setError('请选择目标国家或地区。');return}
   const count=Number(targetCount)
   if(!Number.isInteger(count)||count<10||count>500){setError('采集人数请填写 10 到 500 之间的整数。');return}
  }else if(!schemaValidation.valid){
   const [firstPath,firstMessage]=Object.entries(schemaValidation.errors)[0]||[];const issue=firstPath?schemaPathLabel(schema||{},firstPath)+'：'+firstMessage:''
   setError('发现 '+Object.keys(schemaValidation.errors).length+' 项字段问题。'+(issue?'请先检查「'+issue+'」。':''));if(firstPath){const anchor=schemaPathAnchor(firstPath.split('.')[0].split('[')[0]);window.setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'center'}),0)}return
  }
  if(!isFacebookPeople&&(!Number.isFinite(Number(maxCost))||Number(maxCost)<=0)){setError('请设置大于 0 的单次费用上限。');return}
  setBusy(true);setError('')
  try {
   const actorId=selectedProviderKey==='apify'?actor.username+'~'+actor.name:actor.name
   let actorInput:Record<string,unknown>={}
   if(isFacebookPeople){
    const country=selectedCountry?.geoName||selectedCountry?.name||countryCode
    const location=[city.trim(),country].filter(Boolean).join(', ')
    const count=Number(targetCount)
    if(actor.username==='silentflow'){
     actorInput={searchQueries:[keywords.trim()],location,maxItems:count,includeDetails:true}
    }else if(actor.username==='alien_force'){
     actorInput={search_type:'people',keyword:keywords.trim(),location,results_limit:count,cookies:[]}
    }else if(actor.username==='memo23'){
     actorInput={queries:[keywords.trim()+' '+location].filter(Boolean),searchType:'people',maxItems:count}
    }else{
     throw new Error('当前 Facebook Actor 不在固定支持列表中，请重新选择。')
    }
   }else{
    actorInput={...schemaValidation.payload}
   }
   const taskTitle=taskName.trim()||(isFacebookPeople?'Facebook个人客户：'+keywords.trim():product.trim()||keywords.trim()||actor.title)
   const schemaHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stableStringify(isFacebookPeople?{}:schema))).then(d=>[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join(''))
   const profile={criteria:taskTitle,keywords,product,industry,countries:selectedCountryItems.map(c=>({code:c.code,name:c.name,geoName:c.geoName})),regions:region&&region!=='__all__'?[region]:[],cities:city?[city]:[],target_type:isFacebookPeople?'contacts':targetType,provider,actor_id:actorId,actor_input:actorInput,actor_input_schema:isFacebookPeople?null:schema,actor_schema_hash:schemaHash,location:{countries:selectedCountryItems.map(c=>c.geoName),country:selectedCountry?.geoName||'',region:region==='__all__'?'':region,city},source_channel:channel,provider_key:selectedProviderKey,adapter_key:selectedAdapterKey,ai_analysis:isFacebookPeople?null:aiGenerated?{model:aiModel,user_request:aiRequest,conversation:chatMessages,summary:aiSummary,strategy:aiStrategy,actor_input:actorInput,field_explanations:aiFieldExplanations,missing_information:aiMissingInformation,warnings:aiWarnings,analyzed_at:new Date().toISOString()}:null}
   const {data:task,error:taskError}=await supabase.from('lead_search_tasks').insert({workspace_id:workspaceId,created_by:userId,name:taskTitle,status:'draft',target_profile:profile,selected_channels:[channel],target_count:Number(targetCount)}).select('id').single()
   if(taskError)throw new Error(taskError.message)
   const {data:selections,error:selectionQueryError}=await supabase.from('workspace_adapter_selections').select('id,adapter_key,config,discovery_adapter_catalog!inner(external_actor_id,provider_key,verification_status,maintenance_status,is_active)').eq('workspace_id',workspaceId).eq('channel_key',channel).eq('is_enabled',true).eq('discovery_adapter_catalog.provider_key',selectedProviderKey)
   if(selectionQueryError)throw selectionQueryError
   const selection=(selections||[]).find((row:any)=>row.adapter_key===selectedAdapterKey&&row.discovery_adapter_catalog?.external_actor_id===actorId&&row.discovery_adapter_catalog?.is_active===true&&(isFacebookPeople||row.discovery_adapter_catalog?.verification_status==='verified'&&row.discovery_adapter_catalog?.maintenance_status==='maintained'))
   if(!selection)throw new Error('当前 Actor 已不在可用目录中，请刷新页面并联系管理员检查配置。')
   const config={...(selection.config||{}),max_cost:Number(maxCost),max_items:Number(targetCount)}
   const {error:selectionError}=await supabase.from('workspace_adapter_selections').update({config,updated_at:new Date().toISOString()}).eq('id',selection.id).eq('workspace_id',workspaceId)
   if(selectionError)throw new Error('搜索任务已保存，但适配器参数配置失败：'+selectionError.message)
   const {data:queued,error:queueError}=await supabase.functions.invoke('enqueue-lead-search',{body:{workspace_id:workspaceId,task_id:task.id,confirm_cost:true}})
   if(queueError||queued?.error)throw new Error(queued?.error||queueError?.message||'启动搜索失败')
   setNotice('搜索任务已成功进入队列。')
   await onTaskCreated(task.id)
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
 return <div className="ldw-shell ldw-manual-first">
  <div className="ldw-workflow-head"><div><span className="ldw-eyebrow">MANUAL DISCOVERY</span><h2>{page.title} · 数据源配置</h2><p>{page.description} {page.id==='facebook-pages'?'Facebook 个人客户发现使用统一中文表单；选择 Actor 后由系统转换其专属参数。':'选择平台、服务商和 Actor 后，系统读取真实 Schema 并生成中文参数表单。'}</p></div>{page.id!=='facebook-pages'&&<button type="button" className="ldw-ai-sidebar-trigger" aria-expanded={aiSidebarOpen} onClick={()=>setAiSidebarOpen(value=>!value)}><Sparkles size={14}/>{aiSidebarOpen?'收起 AI 助手':'打开 AI 助手'}</button>}</div>
  <div className="ldp-page-context"><div><b>本页重点筛选</b><span>{page.filters.join(' · ')}</span></div><div><b>目标客户资料</b><span>{page.outputs}</span></div><small>{page.rule}</small></div>
  <div className="ldw-manual-layout">
   <main className="ldw-manual-main">
    {page.id !== "facebook-pages" && <>
    <section className="ldw-card">
     <div className="ldw-step-title"><span>1</span><div><h3>选择发现类别</h3><p>当前入口：{page.title}。平台范围已按该页面限定。</p></div></div>
     {directoryReady&&categories.length>0?<div className="ldw-category-grid">{categories.map(key=><button type="button" key={key} className={selectedCategory===key?'selected':''} onClick={()=>{setSelectedCategory(key);const first=directoryPlatforms.find(item=>item.category_key===key);if(first)setChannel(first.platform_key)}}>{categoryLabels[key]||key}</button>)}</div>:<div className="ldw-loading">{directoryReady?'平台目录暂不可用，请刷新页面重试。':'正在同步平台目录…'}</div>}
    </section>
    <section className="ldw-card">
     <div className="ldw-step-title"><span>2</span><div><h3>选择具体平台</h3><p>仅显示当前发现页面支持的平台，目录由数据库维护。</p></div></div>
     <div className="ldw-platform-grid ldw-platform-grid-manual">{visiblePlatforms.map(item=><button type="button" key={item.platform_key} className={channel===item.platform_key?'selected':''} onClick={()=>{setChannel(item.platform_key);setActorQuery(item.search_terms||item.platform_name)}}><img className="ldw-brand-logo" src={platformLogo(item.platform_key)} alt="" onError={event=>{event.currentTarget.style.display='none'}}/><span>{item.platform_name}</span>{channel===item.platform_key&&<Check size={13}/>}</button>)}</div>
     {!visiblePlatforms.length&&<div className="ldw-loading">当前类别暂无已启用平台。</div>}
     {directoryPlatforms.find(item=>item.platform_key===channel)?.description&&<p className="ldw-provider-note">{directoryPlatforms.find(item=>item.platform_key===channel)?.description}</p>}
    </section>
    <section className="ldw-card">
     <div className="ldw-step-title"><span>3</span><div><h3>选择服务商</h3><p>服务商与平台是独立目录；只有已接入执行接口的服务商可以继续。</p></div></div>
     <div className="ldw-provider-grid ldw-provider-grid-manual">{directoryProviders.filter(item=>availableProviders.map(providerKeyOf).includes(providerKeyOf(item.provider_name||item.provider_key))||providerConnections[providerKeyOf(item.provider_name||item.provider_key)]===true).map(item=>{const key=providerKeyOf(item.provider_name||item.provider_key);const enabled=['apify','brightdata','firecrawl'].includes(key)&&providerConnections[key]===true;const selected=selectedProviderKey===key;return <button type="button" key={item.provider_key} disabled={!enabled} className={selected?'selected':''} onClick={()=>setProvider(item.provider_name)}><span className="ldw-provider-name"><b>{item.provider_name}</b>{selected&&<Check size={13}/>}</span><small>{item.description||item.provider_type}{enabled?' · 已连接':providerConnections[key]?' · 已连接，执行适配器待接入':' · 请先在系统设置中连接'}</small></button>})}</div>
     {!directoryProviders.length&&<div className="ldw-provider-note">服务商目录暂不可用。</div>}
    </section>
    </>}
    {page.id !== "facebook-pages" && <>
    <section className="ldw-card">
     <div className="ldw-step-title"><span>{page.id === "facebook-pages" ? "2" : "4"}</span><div><h3>{page.id === "facebook-pages" ? "确认 Facebook 发现引擎" : "选择采集器 / Actor"}</h3><p>{page.id === "facebook-pages" ? "本渠道固定使用一个按关键词和地区发现企业主页的 Apify Actor。" : "仅展示管理员在 Actor 配置中心绑定到当前渠道、审核通过并启用的 Actor。"}</p></div></div>
     {actor && !actorPickerOpen ? (
      <div className="ldw-selected-actor-summary"><div><b>{actor.title || actor.name}</b><small>{actorVerificationStatus === "verified" && actorMaintenanceStatus === "maintained" ? "已通过审核" : "待审核 · 仅可预览 Schema"} · {pricingLabel(actor)}</small></div><button type="button" onClick={() => setActorPickerOpen(true)}><ChevronDown size={14}/> 更换 / 展开选择器</button></div>
     ) : canSearchSelectedProvider && selectedProviderKey !== "apify" ? (
      <div className="ldw-approved-actor-list">
       <div className="ldw-actor-list-heading"><b>已审核 · 可直接执行</b><span>{providerAdapters.length} 个采集器</span></div>
       {providerAdapters.length ? providerAdapters.map(row => <button type="button" key={row.adapter_key} className={selectedAdapterKey === row.adapter_key ? "selected" : ""} onClick={() => selectProviderAdapter(row)}><span><b>{row.discovery_adapter_catalog.adapter_name}</b><small>{row.discovery_adapter_catalog.external_actor_id}</small><small>{row.discovery_adapter_catalog.verification_status} · {row.discovery_adapter_catalog.maintenance_status}</small></span><span>{selectedAdapterKey === row.adapter_key ? "已选择" : "选择"} <ArrowRight size={12}/></span></button>) : <p className="ldw-provider-note">当前渠道没有已审核并启用的 {provider} 采集器。请前往系统设置登记采集器、完成样本审核并启用。</p>}
      </div>
     ) : canSearchSelectedProvider ? (
      <div className="ldw-approved-actor-list">
       <div className="ldw-actor-list-heading"><b>{page.id === "facebook-pages" ? "唯一指定 Actor" : "已审核 · 可直接执行"}</b><span>{page.id === "facebook-pages" ? "仅此一个" : "每次最多显示 5 个"}</span></div>
       {page.id === "facebook-pages" ? (
        <div className="ldw-facebook-actor-card">
         <p className="ldw-provider-note">固定 Actor：<b>coregent/facebook-pages-leads-scraper</b>。按行业关键词与地区发现公开 Facebook 企业主页，提取公开电话、邮箱、官网、地址等字段。关键词发现还需要为该 Actor 配置搜索服务商 API Key（不是 Facebook 登录凭据）。读取 Schema 不会启动采集；正式执行仍需管理员完成输出样本审核并启用。</p>
         <button type="button" className="ldw-primary-button" onClick={() => void selectActor({id:"coregent~facebook-pages-leads-scraper",name:"facebook-pages-leads-scraper",username:"coregent",title:"Facebook Pages & Business Leads Scraper",description:"按关键词与地区发现企业主页，提取公开商务资料。",url:"https://apify.com/coregent/facebook-pages-leads-scraper"})} disabled={schemaBusy}><Search size={14}/>{schemaBusy ? "正在读取真实 Schema…" : "读取该 Actor 的真实 Schema"}</button>
         <a href="https://apify.com/coregent/facebook-pages-leads-scraper" target="_blank" rel="noreferrer">查看 Actor 说明与实时价格</a>
        </div>
       ) : (
        <>
         {approvedActors.length ? approvedActors.map(item => <button type="button" key={item.id} className={actor?.id === item.id ? "selected" : ""} onClick={() => void selectActor(item)} disabled={schemaBusy}><span><b>{item.title || item.name}</b><small>{item.description}</small><small>{pricingLabel(item)}</small></span><span>{actor?.id === item.id ? "已选择" : "选择"} <ArrowRight size={12}/></span></button>) : <p className="ldw-provider-note">当前平台暂无已审核并启用的 Actor。请管理员在 Actor 配置中心登记并完成样本审核。</p>}
         {approvedOffset > 5 && <button type="button" className="ldw-load-more-actors" onClick={() => void loadApprovedActors(Math.max(0, approvedOffset - 10), false)} disabled={approvedBusy}>上一批已审核 Actor</button>}
         {hasMoreApproved && <button type="button" className="ldw-load-more-actors" onClick={() => void loadApprovedActors(approvedOffset, false)} disabled={approvedBusy}>{approvedBusy ? "正在加载…" : "下一批已审核 Actor（5 个）"}</button>}
         <div className="ldw-actor-search"><input value={actorQuery} onChange={event => setActorQuery(event.target.value)} onKeyDown={event => {if (event.key === "Enter") {event.preventDefault();void searchActors()}}} placeholder="输入 Actor 名称或采集关键词"/><button type="button" onClick={() => void searchActors()} disabled={actorBusy || !actorQuery.trim()}>{actorBusy ? <Loader2 size={13}/> : <Search size={13}/>} 搜索 Apify Store</button></div>
         {actorBusy && <div className="ldw-loading"><Loader2 size={14}/> 正在搜索 Actor…</div>}
         {actors.length > 0 && <div className="ldw-ai-actor-options"><b>待审核候选（{actors.length}）</b><p>Apify Store 搜索结果尚未经过真实客户资料审核；选择后仅读取 Schema，不代表可以执行。</p>{actors.map(item => <button type="button" key={item.id} className={actor?.id === item.id ? "selected" : ""} onClick={() => void selectActor(item)} disabled={schemaBusy}><span><b>{item.title || item.name}</b><small>{item.description || item.username + "/" + item.name}</small><small>{pricingLabel(item)}</small></span><span>{actor?.id === item.id ? "已选择" : "选择"} <ArrowRight size={12}/></span></button>)}</div>}
         {candidateOffset > 5 && <button type="button" className="ldw-load-more-actors" onClick={() => void searchActors(undefined, false, true)} disabled={actorBusy}>上一批候选</button>}
         {hasMoreCandidates && <button type="button" className="ldw-load-more-actors" onClick={() => void searchActors(undefined, true)} disabled={actorBusy}>{actorBusy ? "正在加载…" : "下一批候选（5 个）"}</button>}
        </>
       )}
      </div>
     ) : (
      page.id === "facebook-pages" ? <div className="ldw-provider-note">请先前往「系统设置 → 集成」连接并测试 Apify API Key，完成后返回本页读取固定 Actor 的真实 Schema。关键词发现还需要为该 Actor 配置搜索服务商 API Key。</div> : <div className="ldw-provider-note">当前服务商尚未接入搜索和执行接口。为避免错误调用，不会将此选择转发到其他服务商。</div>
     )}
    </section>
    </>}
    {page.id==='facebook-pages' ? <section className="ldw-card ldw-facebook-task-card">
     <div className="ldw-step-title"><span>1</span><div><h3>填写通用搜索条件</h3><p>先填写客户关键词与目标地区，再选择一个 Facebook 个人资料 Actor。</p></div></div>
     <div className="ldw-form-grid">
      <label className="ldw-field"><span>搜索关键词 <b>* 必填</b></span><input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="例如：real estate agent、software engineer、wedding photographer"/><small>填写职业、岗位、行业角色或目标人群；若销售商品，请搜索“买家 / 采购 / 经销商”等人群，而不是只填商品名称。</small></label>
      <div className="ldw-field ldw-country-field"><span>国家 / 地区 <b>* 必填</b></span><button type="button" className="ldw-country-trigger" aria-expanded={countryPickerOpen} onClick={()=>{setCountryPickerOpen(value=>!value);setCountrySearch('')}}>{selectedCountry?.geoName||'Select a country / region'} <ChevronDown size={15}/></button>{countryPickerOpen&&<div className="ldw-country-menu"><input autoFocus value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} placeholder="Search country / region in English…"/><div className="ldw-country-options">{countries.filter(c=>(c.geoName+' '+c.code).toLowerCase().includes(countrySearch.trim().toLowerCase())).map(c=><button type="button" key={c.code} className={countryCode===c.code?'selected':''} onClick={()=>{setCountryCode(c.code);setSelectedCountries([c.code]);setRegion('__all__');setCity('');setCountryPickerOpen(false);setCountrySearch('')}}>{c.geoName} <small>{c.code}</small></button>)}</div></div>}<small>Country / region names are sent to the Actor in English to avoid localization and parameter mismatch.</small>{locationBusy&&<small className="ldw-inline-loading"><Loader2 size={12}/> 正在加载地区信息…</small>}</div>
      <label className="ldw-field"><span>城市（可选）</span><input value={city} onChange={e=>setCity(e.target.value)} placeholder="例如：Tokyo、New York、London"/><small>建议使用英文城市名，以便 Actor 识别 Facebook 地点。</small></label>
      <label className="ldw-field"><span>最多抓取人数 <b>* 必填</b></span><input type="number" min={10} max={500} step={1} value={targetCount} onChange={e=>setTargetCount(e.target.value)}/><small>统一限制为 10–500 人；实际返回数量可能少于设置值。</small></label>
     </div>
     <div className="ldw-step-title ldw-facebook-actor-step"><span>2</span><div><h3>选择一个抓取 Actor</h3><p>三个 Actor 使用同一套表单，系统会自动转换成各自需要的参数。</p></div></div>
     <div className="ldw-facebook-actor-options">
      {facebookProfileActors.map(option=>{const configured=approvedActors.find(item=>item.username===option.username&&item.name===option.name);const selected=actor?.username===option.username&&actor?.name===option.name;return <button type="button" key={option.username} className={selected?'selected':''} disabled={!canSearchSelectedProvider||busy} onClick={()=>selectFacebookActor(option)}>
       <span><b>{option.title}</b><small>{option.description}</small><small>{configured?'已启用 · 无需审核':'可选择 · 无需人工审核'}</small></span><span>{selected?'已选择':configured?'选择 Actor':'选择'} <ArrowRight size={12}/></span>
      </button>})}
     </div>
     {approvedBusy&&<div className="ldw-loading"><Loader2 size={14} className="ldw-spin"/> 正在读取 Facebook Actor 配置…</div>}
     {!canSearchSelectedProvider&&<div className="ldw-provider-note">请先在「系统设置 → 集成」连接并启用 Apify，之后才能选择 Actor。</div>}
     {actor&&<div className="ldw-selected-actor-summary"><div><b>{actor.title}</b><small>Actor ID：{actor.username}~{actor.name} · {'已启用 · 无需人工审核'}</small></div><a href={actor.username==='silentflow'?'https://apify.com/silentflow/facebook-search-profiles-scraper':actor.username==='alien_force'?'https://apify.com/alien_force/facebook-search-scraper':'https://apify.com/memo23/facebook-search-scraper'} target="_blank" rel="noreferrer">查看 Actor 文档</a></div>}
     <div className="ldw-facebook-capability-note"><b>地区筛选差异</b><ul><li><b>Silentflow：</b>城市可使用 Facebook 地点筛选；国家 / 地区按公开资料中的城市、家乡、工作或学校信息匹配。</li><li><b>Alien Force：</b>通过 Facebook 地点解析过滤 People 结果；地点名称无法解析时可能跳过过滤。</li><li><b>Memo23：</b>本表单将城市和国家拼入关键词提高相关性，不等同于精准地区过滤；其精确城市筛选需要 Facebook Place UID。</li></ul></div>
     <div className="ldw-submit-row"><span>{actor?'已选 Actor，可直接使用。确认地区与数量后启动采集。':'请先填写关键词和国家，并选择一个 Actor。'}</span><button disabled={!actor||!keywords.trim()||!countryCode||busy||!canSearchSelectedProvider||(page.id!=='facebook-pages'&&(actorVerificationStatus!=='verified'||actorMaintenanceStatus!=='maintained'))} onClick={()=>void startSearch()}>{busy?<><Loader2 size={15}/> 正在创建…</>:'确认参数并启动采集'} <ArrowRight size={15}/></button></div>
    </section> : schema&&actor ? <section className="ldw-card ldw-manual-schema-card">
     <div className="ldw-step-title"><span>5</span><div><h3>按 Actor Schema 填写发现条件</h3><p>字段名称以中文展示；必填、类型、范围和 Actor 原始字段均保留。</p></div></div>
     <div className="ldw-schema-heading"><div><b>{actor.title}</b><small>{schemaKeys(schema).length} 个输入字段 · 来自 Actor 最新构建的真实 Schema</small><small>{pricingLabel(actor)}</small></div><span><ShieldCheck size={13}/> Schema 已读取 · {actorVerificationStatus==='verified'&&actorMaintenanceStatus==='maintained'?'客户输出已审核':'待客户输出审核'}</span></div>
     <div className="ldw-form-grid">{schemaKeys(schema).map(renderField)}</div>
     <div className="ldw-submit-row"><span>Schema 校验通过并确认费用上限后，才会创建任务。</span><button disabled={!schema||!actor||busy||!schemaValidation.valid||!canSearchSelectedProvider||actorVerificationStatus!=='verified'||actorMaintenanceStatus!=='maintained'} onClick={()=>void startSearch()}>{busy?<><Loader2 size={15}/> 正在创建…</>:'确认参数并启动采集'} <ArrowRight size={15}/></button></div>
    </section> : <div className="ldw-chat-hint">完成前四步后，选择 Actor 即可读取 Schema 并显示手动参数表单。</div>}
   </main>
   {aiSidebarOpen&&page.id!=='facebook-pages'&&<aside className="ldw-ai-sidebar">
  <section className="ldw-card ldw-ai-step ldw-chat-card ldw-chat-first">
   <div className="ldw-step-title"><span><MessageCircle size={16}/></span><div><h3>AI 采集助手</h3><p>描述业务目标，系统只会提供已审核、已启用的 Actor；AI 将根据所选 Actor 的 Schema 协助填写参数。</p></div></div>
   <div className="ldw-chat-history" aria-live="polite">{chatMessages.map((message,index)=><div key={index} className={'ldw-chat-message '+message.role}><span className={'ldw-chat-avatar '+(message.role==='assistant'?'ai':'user')} aria-hidden="true">{message.role==='assistant'?<Sparkles size={15}/>:<UserRound size={15}/>}</span><div className="ldw-chat-message-body"><span>{message.role==='assistant'?'AI 助手':'你'}</span><p>{message.content}</p></div></div>)}{aiBusy&&<div className="ldw-chat-message assistant"><span className="ldw-chat-avatar ai" aria-hidden="true"><Sparkles size={15}/></span><div className="ldw-chat-message-body"><span>AI 助手</span><p className="ldw-chat-thinking"><Loader2 size={13}/> 正在理解需求并分析参数…</p></div></div>}</div>
   {!actor&&recognizedPlatform&&<div className="ldw-ai-actor-picker"><div className="ldw-ai-actor-search"><input value={actorQuery} onChange={e=>setActorQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void searchActors()}}} placeholder="搜索 Actor，例如 amazon seller scraper"/><button type="button" onClick={()=>void searchActors()} disabled={actorBusy||!actorQuery.trim()}>{actorBusy?<Loader2 size={13}/>:<Search size={13}/>} 搜索 Actor</button></div>{actorBusy&&<p>正在搜索 Apify Store…</p>}{approvedActors.length===0&&<div className="ldw-provider-note">当前平台暂无已审核通过的 Actor。请联系管理员在 Actor 配置中心添加并完成审核。</div>}{approvedActors.length>0&&<div className="ldw-approved-actor-list"><div className="ldw-actor-list-heading"><b>已审核 · 可直接执行</b><span>每批最多 5 个</span></div>{approvedActors.slice(0,5).map(item=><button type="button" key={item.id} onClick={()=>void selectActor(item)} disabled={schemaBusy}><span><b>{item.title||item.name}</b><small>{item.description}</small><small>{pricingLabel(item)}</small></span><span>选择 <ArrowRight size={12}/></span></button>)}</div>}{actors.length>0&&<div className="ldw-ai-actor-options"><b>待审核候选（本批 {actors.length} 个）</b><p>候选项需要完成真实客户资料输出审核后才能正式执行。</p>{actors.map(item=><button type="button" key={item.id} onClick={()=>void selectActor(item)} disabled={schemaBusy}><span><b>{item.title||item.name}</b><small>{item.description||item.username+' / '+item.name}</small><small>{pricingLabel(item)}</small></span><span>选择 <ArrowRight size={12}/></span></button>)}</div>}{approvedOffset>5&&<button type="button" className="ldw-load-more-actors" onClick={()=>void loadApprovedActors(Math.max(0,approvedOffset-10),false)} disabled={approvedBusy}>上一批已审核 Actor</button>}{hasMoreApproved&&<button type="button" className="ldw-load-more-actors" onClick={()=>void loadApprovedActors(approvedOffset,false)} disabled={approvedBusy}>{approvedBusy?'正在加载…':'下一批已审核 Actor（5 个）'}</button>}{candidateOffset>5&&<button type="button" className="ldw-load-more-actors" onClick={()=>void searchActors(undefined,false,true)} disabled={actorBusy}>上一批候选</button>}{hasMoreCandidates&&<button type="button" className="ldw-load-more-actors" onClick={()=>void searchActors(undefined,true)} disabled={actorBusy}>下一批候选（5 个）</button>}</div>}
   <div className="ldw-chat-composer"><textarea rows={3} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submitChat()}}} placeholder="例如：我销售手机数据线，想寻找美国亚马逊上相关品类的卖家…" /><button type="button" onClick={()=>void submitChat()} disabled={!chatInput.trim()||aiBusy}><Send size={14}/> 发送</button></div>
   {aiError&&<div className="ldw-error">{aiError}</div>}
   {recognizedPlatform&&<div className="ldw-platform-detected"><Check size={14}/> 已识别平台：<b>{recognizedPlatform}</b>{actor&&<span> · 当前选择：{actor.title}</span>}</div>}
   
   {schema&&actor&&<div className="ldw-ai-live-preview">
    <div className="ldw-ai-result-heading"><b>实时参数预览</b><span>{actor.title} · {pricingLabel(actor)}</span></div>
    {aiSummary&&<div className="ldw-ai-summary"><b>需求理解</b><p>{aiSummary}</p></div>}
    {aiStrategy&&<div className="ldw-ai-summary"><b>AI 采集建议</b><p>{aiStrategy}</p></div>}
    {aiSuggestions.length>0&&<div className="ldw-ai-recommendations"><b><Sparkles size={13}/> 可以进一步优化</b><ul>{aiSuggestions.map((suggestion,index)=><li key={index}>{suggestion}</li>)}</ul></div>}
    <div className="ldw-ai-preview-status"><span>Schema 校验：{schemaValidation.valid?'通过':'待完善'}</span><span>已生成字段：{Object.keys(schemaValidation.payload).length} / {schemaKeys(schema).length}</span><span>待确认：{aiMissingInformation.length}</span></div>
    {aiMissingInformation.length>0&&<div className="ldw-ai-warnings"><b>还需要确认</b><ul>{aiMissingInformation.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
    {aiWarnings.length>0&&<div className="ldw-ai-warnings"><b>能力或参数提醒</b><ul>{aiWarnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div>}
    {Object.keys(aiFieldExplanations).length>0&&<div className="ldw-ai-explanations"><b>字段生成说明</b>{Object.entries(aiFieldExplanations).map(([key,explanation])=><div key={key}><span>{localizeTitle(key,schema.properties?.[key]||{})}</span><small>{String(explanation)}</small></div>)}</div>}
    <div className="ldw-request-preview"><div className="ldw-request-preview-heading"><b>最终提交数据</b><span>{Object.keys(schemaValidation.payload).length} 个字段</span></div><pre>{JSON.stringify(schemaValidation.payload,null,2)}</pre><div className={schemaValidation.valid?'ldw-validation-ok':'ldw-validation-error'}>{schemaValidation.valid?'Schema 校验通过':<>发现 {Object.keys(schemaValidation.errors).length} 项字段问题：{Object.entries(schemaValidation.errors).slice(0,3).map(([path,message],index)=><span key={path}>{index>0?'；':''}<a href={'#'+schemaPathAnchor(path.split('.')[0].split('[')[0])}>{schemaPathLabel(schema||{},path)}</a>：{message}</span>)}{Object.keys(schemaValidation.errors).length>3?'；其余问题请查看手动参数表单中的错误清单':''}</>}</div></div>
    {aiApplied&&<div className="ldw-validation-ok">AI 已将参数同步到 Actor Schema。你可以展开下方手动配置修改字段，提交预览会同步更新。</div>}
   </div>}
   {!schema&&<div className="ldw-chat-hint">选择已审核的 Actor 后，系统会读取 Schema 并配置参数。</div>}
   <div className="ldw-submit-row"><span>确认后将使用上方展示的同一份 Schema 参数提交并启动采集。</span><button disabled={!schema||!actor||busy||!schemaValidation.valid||aiMissingInformation.length>0||aiBusy} onClick={()=>void startSearch()}>{busy?<><Loader2 size={15}/> 正在创建…</>:'确认提交数据并启动采集'} <ArrowRight size={15}/></button></div>
  </section>
   </aside>}
  </div>
  {error&&<div className="ldw-error">{error}</div>}{notice&&<div className="ldw-notice">{notice}</div>}
 </div>
}
