import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ExternalLink, Loader2, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { countries } from './countries'
import './LeadDiscoveryWizard.css'

type Props = { workspaceId: string; userId: string; onTaskCreated: () => void }
type Actor = { id: string; name: string; username: string; title: string; description: string; url: string; stats?: { totalUsers?: number; actorReviewRating?: number; actorReviewCount?: number }; currentPricingInfo?: Record<string, unknown> }
type SchemaField = { title?: string; description?: string; type?: string | string[]; default?: unknown; enum?: unknown[]; items?: unknown; properties?: Record<string, SchemaField>; minimum?: number; maximum?: number; format?: string }
type JsonSchema = { properties?: Record<string, SchemaField>; required?: string[] }
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
const searchTerms: Record<string,string> = Object.fromEntries(platformGroups.flatMap(g=>g.items.map(([id,,term])=>[id,term])))
const providerDescriptions: Record<string,string> = { Apify:'搜索 Apify Store 中可用的 Actors，并读取每个 Actor 自己的输入 Schema。', 'Bright Data':'数据集 / Scraper 产品目录与专属输入参数。', Octoparse:'模板任务与参数 Schema。', Firecrawl:'网站搜索、抓取与提取操作。', PhantomBuster:'Agent 工作流及参数。', TexAu:'自动化 Action 与参数。', '跨境魔方':'跨境电商数据 API 与接口参数。' }
const schemaKeys = (schema: JsonSchema) => Object.entries(schema.properties || {})
const getDefaultValue = (field: SchemaField) => field.default ?? (field.type === 'boolean' ? false : field.type === 'array' ? '[]' : field.type === 'object' ? '{}' : '')
const outputMapping = (schema: Record<string, unknown>) => {
 const props = ((schema.properties || {}) as Record<string, unknown>)
 const keys = Object.keys(props)
 const pick = (candidates: string[], fallback: string) => candidates.find(k => keys.includes(k)) || fallback
 return {
  company_name: pick(['companyName','company_name','businessName','business_name','name','title'], 'name'),
  website: pick(['website','websiteUrl','website_url','url','domain'], 'website'),
  email: pick(['email','emails','businessEmail'], 'email'),
  phone: pick(['phone','phoneNumber','phone_number','telephone'], 'phone'),
  country_name: pick(['country','countryName','country_name'], 'country'),
  address: pick(['address','fullAddress','full_address','streetAddress'], 'address'),
  source_url: pick(['url','website','websiteUrl','link'], 'url')
 }
}
const nominatim = async (params: Record<string,string>) => {
 const url = new URL('https://nominatim.openstreetmap.org/search')
 Object.entries({format:'jsonv2',addressdetails:'1',dedupe:'1',limit:'30',...params}).forEach(([k,v])=>url.searchParams.set(k,v))
 const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
 if (!response.ok) throw new Error('OpenStreetMap 地点服务暂时不可用')
 return await response.json() as Array<{ place_id:number; display_name:string; name?:string; address?:Record<string,string>; type?:string; class?:string }>
}

export default function LeadDiscoveryWizard({ workspaceId, userId, onTaskCreated }: Props) {
 const [channel,setChannel] = useState('google-maps')
 const [provider,setProvider] = useState('Apify')
 const [countryCode,setCountryCode] = useState('')
 const [selectedCountries,setSelectedCountries] = useState<string[]>([])
 const [countryQuery,setCountryQuery] = useState('')
 const [countryOpen,setCountryOpen] = useState(false)
 const [region,setRegion] = useState('')
 const [city,setCity] = useState('')
 const [cityQuery,setCityQuery] = useState('')
 const [cityResults,setCityResults] = useState<Array<{place_id:number;display_name:string;name?:string}>>([])
 const [regionResults,setRegionResults] = useState<Array<{place_id:number;display_name:string;name?:string}>>([])
 const [locationBusy,setLocationBusy] = useState(false)
 const [actorQuery,setActorQuery] = useState('')
 const [actors,setActors] = useState<Actor[]>([])
 const [actorBusy,setActorBusy] = useState(false)
 const [actor,setActor] = useState<Actor|null>(null)
 const [schema,setSchema] = useState<JsonSchema|null>(null)
 const [schemaBusy,setSchemaBusy] = useState(false)
 const [values,setValues] = useState<Record<string,unknown>>({})
 const [mapping,setMapping] = useState<Record<string,string>>({})
 const [keywords,setKeywords] = useState('')
 const [targetCount,setTargetCount] = useState('100')
 const [taskName,setTaskName] = useState('')
 const [costConsent,setCostConsent] = useState(false)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const availableProviders = providerByPlatform[channel] || ['Apify']
 const selectedCountry = countries.find(c=>c.code===countryCode)
 const selectedCountryItems = countries.filter(c=>selectedCountries.includes(c.code))
 const toggleCountry = (code:string) => {
  const next=selectedCountries.includes(code)?selectedCountries.filter(x=>x!==code):[...selectedCountries,code]
  setSelectedCountries(next)
  if(!next.length){setCountryCode('');setRegion('');setCity('')}
  else if(!next.includes(countryCode)||!countryCode||!selectedCountries.includes(code))setCountryCode(next[next.length-1])
 }

 useEffect(()=>{ setProvider(availableProviders[0] || 'Apify'); setActor(null); setSchema(null); setActors([]); setValues({}); setMapping({}); setError(''); setNotice('') },[channel])
 useEffect(()=>{ setActor(null);setSchema(null);setValues({});setMapping({});setError('');setNotice('') },[provider])
 useEffect(()=>{
  let active=true
  if(!countryCode){setRegionResults([]);setRegion('');setCity('');return}
  setLocationBusy(true);setRegion('');setCity('');setCityQuery('')
  const timer=setTimeout(async()=>{
   try {
    const results=await nominatim({country:selectedCountry?.geoName || countryCode,featureType:'state'})
    if(active)setRegionResults(results.map(x=>({place_id:x.place_id,display_name:x.display_name,name:x.name || x.address?.state || x.display_name.split(',')[0]})))
   } catch(e){if(active)setError(e instanceof Error?e.message:'地区列表加载失败')}
   finally{if(active)setLocationBusy(false)}
  },1100)
  return()=>{active=false;clearTimeout(timer)}
 },[countryCode])
 useEffect(()=>{
  let active=true
  if(!cityQuery.trim()||!countryCode){setCityResults([]);return}
  const timer=setTimeout(async()=>{
   try {
    const q=[cityQuery,region,selectedCountry?.geoName].filter(Boolean).join(', ')
    const results=await nominatim({q,countrycodes:countryCode.toLowerCase(),featureType:'city'})
    if(active)setCityResults(results.slice(0,8).map(x=>({place_id:x.place_id,display_name:x.display_name,name:x.name || x.display_name.split(',')[0]})))
   }catch(e){if(active)setError(e instanceof Error?e.message:'城市搜索失败')}
  },1100)
  return()=>{active=false;clearTimeout(timer)}
 },[cityQuery,region,countryCode])

 const searchActors = async () => {
  if(provider!=='Apify')return
  setActorBusy(true);setError('');setNotice('')
  try {
   const term=actorQuery.trim() || searchTerms[channel] || channel
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
  setActor(item);setSchema(null);setValues({});setMapping({});setSchemaBusy(true);setError('');setNotice('')
  const actorId=item.username+'~'+item.name
  const {data,error:invokeError}=await supabase.functions.invoke('apify-actor-schema',{body:{workspace_id:workspaceId,actor_id:actorId,channel_key:channel}})
  if(invokeError||data?.error){setError(data?.error||invokeError?.message||'读取 Actor Schema 失败');setActor(null);setSchemaBusy(false);return}
  const nextSchema=(data.input_schema || {}) as JsonSchema
  const initial=Object.fromEntries(schemaKeys(nextSchema).map(([key,field])=>[key,getDefaultValue(field)]))
  setSchema(nextSchema);setValues(initial);setMapping(outputMapping((data.output_schema || {}) as Record<string,unknown>))
  setNotice('已读取 Actor 最新输入 Schema。以下字段由 Actor 定义，尚未启动采集。')
  setSchemaBusy(false)
 }
 const renderField = ([key,field]:[string,SchemaField]) => {
  const value=values[key] ?? getDefaultValue(field)
  const required=schema?.required?.includes(key)
  const set=(v:unknown)=>setValues(current=>({...current,[key]:v}))
  const enumValues=field.enum || []
  return <label className="ldw-field" key={key}><span>{field.title || key}{required&&<b> *</b>}</span>
   {enumValues.length>0?<select value={String(value)} onChange={e=>set(e.target.value)}><option value="">请选择</option>{enumValues.map(option=><option key={String(option)} value={String(option)}>{String(option)}</option>)}</select>
   :field.type==='boolean'?<input type="checkbox" checked={Boolean(value)} onChange={e=>set(e.target.checked)}/>
   :field.type==='integer'||field.type==='number'?<input type="number" min={field.minimum} max={field.maximum} value={String(value)} onChange={e=>set(e.target.value===''?'':Number(e.target.value))}/>
   :field.type==='array'||field.type==='object'?<textarea rows={3} value={String(value)} onChange={e=>set(e.target.value)} placeholder={field.type==='array'?'[]':'{}'}/>
   :<input type={field.format==='uri'?'url':'text'} value={String(value)} onChange={e=>set(e.target.value)}/>}
   {field.description&&<small>{field.description}</small>}
  </label>
 }
 const startSearch = async () => {
  if(!supabase){setError('Supabase 尚未配置，请先完成系统连接。');return}
  if(!workspaceId||!userId){setError('当前工作空间或用户会话不可用，请重新登录后重试。');return}
  if(!schema||!actor||!costConsent)return
  setBusy(true);setError('')
  try {
   const actorInput:Record<string,unknown>={}
   for(const [key,field] of schemaKeys(schema)){
    const value=values[key]
    if(schema.required?.includes(key)&&(value===undefined||value===null||value===''))throw new Error('请填写必填字段：'+(field.title||key))
    if(field.type==='array'||field.type==='object'){
     if(typeof value==='string'&&value.trim()){try{actorInput[key]=JSON.parse(value)}catch{throw new Error((field.title||key)+' 必须是有效 JSON')}}
    }else if(value!==''&&value!==undefined)actorInput[key]=value
   }
   const locationText=[city,region,selectedCountry?.geoName].filter(Boolean).join(', ')
   for(const [key,field] of schemaKeys(schema)){
    if(actorInput[key]!==undefined&&actorInput[key]!=='' )continue
    const k=key.toLowerCase()
    if(/searchstringsarray|keywords|searchterms/.test(k)&&keywords.trim())actorInput[key]=field.type==='array'?keywords.split(',').map(x=>x.trim()).filter(Boolean):keywords.trim()
    else if(/locationquery|location_query|locationsearch|locationaddress/.test(k)&&locationText)actorInput[key]=locationText
    else if(/countrycode|country_code/.test(k)&&countryCode)actorInput[key]=countryCode
    else if(/^country$|countryname|country_name/.test(k)&&selectedCountry)actorInput[key]=selectedCountry.geoName
    else if(/^city$|cityname|city_name/.test(k)&&city)actorInput[key]=city
    else if(/^state$|^region$|stateorprovince/.test(k)&&region)actorInput[key]=region
    else if(/max.*(place|result|item|record|lead)|^(limit|maxresults|maxitems)$/.test(k))actorInput[key]=Number(targetCount)
    else if(/searchquery|searchterm|^query$/.test(k)&&keywords.trim())actorInput[key]=keywords.trim()
   }
   const taskTitle=taskName.trim()||keywords.trim()||actor.title
   const profile={criteria:taskTitle,keywords,product:keywords,industry:'',countries:selectedCountryItems.map(c=>({code:c.code,name:c.name,geoName:c.geoName})),regions:region?[region]:[],cities:city?[city]:[],target_type:'companies',provider,actor_id:actor.username+'~'+actor.name,actor_input:actorInput,location:{countries:selectedCountryItems.map(c=>c.geoName),country:selectedCountry?.geoName||'',region,city},source_channel:channel}
   const {data:task,error:taskError}=await supabase.from('lead_search_tasks').insert({workspace_id:workspaceId,created_by:userId,name:taskTitle,status:'draft',target_profile:profile,selected_channels:[channel],target_count:Number(targetCount)}).select('id').single()
   if(taskError)throw new Error(taskError.message)
   const adapterKey='apify-'+channel+'-'+(actor.username+'-'+actor.name).toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,110)
   const config={input_defaults:actorInput,input_mapping:{},field_mapping:mapping,max_cost:0}
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
  <div className="ldw-intro"><div><span className="ldw-eyebrow">LEAD DISCOVERY WORKSPACE</span><h2>发现潜在客户</h2><p>先选择客户来源，再选择供应商和采集器。参数表单会根据采集器 Schema 自动生成。</p></div><span className="ldw-status"><Sparkles size={14}/> 动态采集配置</span></div>
  <div className="ldw-step-grid">
   <section className="ldw-card"><div className="ldw-step-title"><span>01</span><div><h3>选择客户来源平台</h3><p>先确定你要从哪里发现潜在客户。</p></div></div>
    <div className="ldw-platform-groups">{platformGroups.map(group=><div key={group.label}><h4>{group.label}</h4><div className="ldw-platform-grid">{group.items.map(([id,name])=><button key={id} className={channel===id?'selected':''} onClick={()=>setChannel(id)}>{name}{channel===id&&<Check size={14}/>}</button>)}</div></div>)}</div>
   </section>
   <section className="ldw-card"><div className="ldw-step-title"><span>02</span><div><h3>选择数据供应商</h3><p>仅显示当前平台有对应产品的供应商。</p></div></div>
    <div className="ldw-provider-grid">{availableProviders.map(name=><button key={name} className={provider===name?'selected':''} onClick={()=>setProvider(name)}><b>{name}</b><small>{providerDescriptions[name]||'查看该供应商支持的采集能力。'}</small></button>)}</div>
    {provider!=='Apify'&&<div className="ldw-provider-note">该供应商已列入平台目录；此版本的动态 Actor Schema 流程先支持 Apify。其他供应商需要各自的产品目录与参数 Schema，不能错误地套用 Apify Actor。</div>}
   </section>
  </div>
  <section className="ldw-card"><div className="ldw-step-title"><span>03</span><div><h3>选择目标市场</h3><p>国家沿用 Ouranos 现有国家目录；地区和城市从 OpenStreetMap 动态查询。</p></div></div>
   <div className="ldw-location-grid ldw-country-grid">
    <div className="ldw-field ldw-country-field"><span>目标国家 / 地区</span><button type="button" className="ldw-country-trigger" onClick={()=>setCountryOpen(v=>!v)}><span>{selectedCountryItems.length?selectedCountryItems.map(c=>c.flag).join(' ')+'  '+selectedCountryItems.length+' 个国家 / 地区':'全球（不限制）'}</span><ChevronDown size={14}/></button>
     {countryOpen&&<div className="ldw-country-popover"><div className="ldw-country-search"><Search size={13}/><input value={countryQuery} onChange={e=>setCountryQuery(e.target.value)} placeholder="搜索国家或地区"/></div><div className="ldw-country-actions"><button type="button" onClick={()=>{setSelectedCountries([]);setCountryCode('');setRegion('');setCity('')}}>清空</button><button type="button" onClick={()=>setSelectedCountries(countries.map(c=>c.code))}>选择列表全部</button></div><div className="ldw-country-list">{countries.filter(c=>(c.name+c.code+c.geoName).toLowerCase().includes(countryQuery.toLowerCase())).map(c=><button type="button" key={c.code} className={selectedCountries.includes(c.code)?'selected':''} onClick={()=>toggleCountry(c.code)}><span>{c.flag}</span><span>{c.name}</span>{selectedCountries.includes(c.code)&&<Check size={13}/>}</button>)}</div><small>支持多国筛选；地区和城市范围由下方指定的国家联动。</small></div>}
    </div>
    <label className="ldw-field"><span>地区所属国家</span><select value={countryCode} onChange={e=>{setCountryCode(e.target.value);setRegion('');setCity('');setCityQuery('')}} disabled={!selectedCountries.length}><option value="">选择国家</option>{selectedCountryItems.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select><small>可从已选国家中指定一个国家筛选州 / 省和城市。</small></label>
    <label className="ldw-field"><span>州 / 省 / 行政区</span><select value={region} onChange={e=>{setRegion(e.target.value);setCity('');setCityQuery('')}} disabled={!countryCode||locationBusy}><option value="">{locationBusy?'正在从 OpenStreetMap 加载…':'选择地区（可选）'}</option>{regionResults.map(r=><option key={r.place_id} value={r.name||r.display_name}>{r.name||r.display_name}</option>)}</select><small>地区选项随所选国家动态加载。</small></label>
    <div className="ldw-field ldw-city-field"><span>城市</span><input disabled={!countryCode} value={cityQuery||city} onChange={e=>{setCityQuery(e.target.value);setCity('')}} placeholder="输入城市名称搜索 OpenStreetMap…"/>{cityResults.length>0&&<div className="ldw-city-results">{cityResults.map(item=><button type="button" key={item.place_id} onClick={()=>{setCity(item.name||item.display_name);setCityQuery('');setCityResults([])}}><MapPin size={13}/><span>{item.display_name}</span></button>)}</div>}<small>选择国家和地区后，城市搜索会自动限定范围。</small></div>
   </div>
   <div className="ldw-osm-credit">地点数据 © OpenStreetMap contributors · Nominatim · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">数据与使用政策</a></div>
  </section>
  <section className="ldw-card"><div className="ldw-step-title"><span>04</span><div><h3>选择 Actor / 采集器</h3><p>Apify Store 提供公开 Actor 搜索；选择后读取该 Actor 的真实输入 Schema。</p></div></div>
   {provider==='Apify'?<><div className="ldw-actor-search"><input value={actorQuery} onChange={e=>setActorQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchActors()}} placeholder={'搜索 '+(searchTerms[channel]||channel)+'…'}/><button onClick={()=>void searchActors()} disabled={actorBusy}><Search size={14}/>{actorBusy?'搜索中…':'搜索 Apify Actors'}</button></div>
    {actors.length>0&&<div className="ldw-actor-list">{actors.map(item=><article key={item.id} className={'ldw-actor-card '+(actor?.id===item.id?'selected':'')}><div><b>{item.title||item.name}</b><small>{item.username}/{item.name}</small><p>{item.description||'暂无描述'}</p><small>评分 {item.stats?.actorReviewRating??'—'} · {item.stats?.actorReviewCount??0} 条评价 · 用户 {item.stats?.totalUsers??'—'} · {pricingLabel(item)}</small></div><button onClick={()=>void selectActor(item)} disabled={schemaBusy}>{actor?.id===item.id?'已选择':'选择此 Actor'} <ArrowRight size={13}/></button><a href={item.url||'https://apify.com/'+item.username+'/'+item.name} target="_blank" rel="noreferrer" aria-label="打开 Actor 页面"><ExternalLink size={13}/></a></article>)}</div>}
   </>:<div className="ldw-provider-note">选择 Apify 时可以直接搜索 Actor Store 并读取 Schema。其他供应商将使用各自的模板 / 数据集 / Action 目录，不能把 Actor 机制混用。</div>}
   {schemaBusy&&<div className="ldw-loading"><Loader2 size={16}/> 正在读取 Actor Schema…</div>}
   {schema&&actor&&<div className="ldw-schema-panel"><div className="ldw-schema-heading"><div><b>{actor.title}</b><small>{schemaKeys(schema).length} 个动态输入字段 · Schema 来自 Actor 最新构建</small></div><span><ShieldCheck size={13}/> Schema 已读取</span></div>
    <div className="ldw-form-grid">{schemaKeys(schema).map(renderField)}</div>
    <details className="ldw-mapping"><summary>高级设置：输出字段映射</summary><p>自动根据常见字段名称匹配企业名称、网站、电话等字段；如 Actor 输出字段特殊，可在这里调整。</p><div className="ldw-mapping-grid">{Object.entries(mapping).map(([key,value])=><label className="ldw-field" key={key}><span>{key}</span><input value={value} onChange={e=>setMapping(current=>({...current,[key]:e.target.value}))}/></label>)}</div></details>
   </div>}
  </section>
  <section className="ldw-card"><div className="ldw-step-title"><span>05</span><div><h3>搜索任务设置</h3><p>确认关键词、数量和收费授权后才会创建执行任务。</p></div></div>
   <div className="ldw-location-grid"><label className="ldw-field"><span>任务名称</span><input value={taskName} onChange={e=>setTaskName(e.target.value)} placeholder="例如：美国加州牙科诊所潜客"/></label><label className="ldw-field"><span>搜索关键词</span><input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="例如：Dental clinic, importer, wholesaler"/></label><label className="ldw-field"><span>目标数量</span><select value={targetCount} onChange={e=>setTargetCount(e.target.value)}><option value="50">最多 50 条</option><option value="100">最多 100 条</option><option value="250">最多 250 条</option><option value="500">最多 500 条</option><option value="1000">最多 1,000 条</option></select></label></div>
   <label className="ldw-consent"><input type="checkbox" checked={costConsent} onChange={e=>setCostConsent(e.target.checked)}/><span>我确认已查看所选 Actor 的价格和使用政策，并授权 Ouranos 启动可能产生费用的采集任务。</span></label>
   {error&&<div className="ldw-error">{error}</div>}{notice&&<div className="ldw-notice">{notice}</div>}
   <div className="ldw-submit-row"><span>创建任务不会自动推广为正式客户；结果先进入待审核线索。</span><button disabled={!schema||!actor||!costConsent||busy} onClick={()=>void startSearch()}>{busy?<><Loader2 size={15}/> 正在创建…</>:'确认并启动搜索'} <ArrowRight size={15}/></button></div>
  </section>
 </div>
}
