import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './LinkedInDiscoveryApp.css'

type Run = {id:string;name:string;status:string;criteria:Record<string,unknown>;discovered_count:number;selected_count:number;enriched_count:number;actual_cost:number|null;created_at:string;error_message:string|null;actor_a_status:string|null;actor_b_status:string|null}
type Candidate = {id:string;profile_url:string;profile_slug:string|null;full_name:string|null;headline:string|null;job_title:string|null;company_name:string|null;location:string|null;country:string|null;skills:string[];seniority:string|null;experience_years:number|null;source_title:string|null;source_snippet:string|null;matched_criteria:Record<string,unknown>;visible_evidence_score:number|null;clean_status:string;selected_for_enrichment:boolean;contact_email:string|null;contact_phone:string|null;email_source:string|null;phone_source:string|null;profile_data:Record<string,unknown>;enriched_at:string|null;dirty?:boolean}
type Log = {id:string;level:string;stage:string;message:string;details:Record<string,unknown>;created_at:string}
const split=(v:string)=>v.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean)
const statusName=(v:string)=>({draft:'草稿',searching:'正在发现',search_completed:'待清洗',enriching:'联系方式补全中',completed:'已完成',failed:'失败',cancelled:'已取消'} as Record<string,string>)[v]||v
const date=(v:string)=>new Date(v).toLocaleString()
export default function LinkedInDiscoveryApp({workspaceId,userId}:{workspaceId:string;userId:string}){
 const [runs,setRuns]=useState<Run[]>([])
 const [activeRunId,setActiveRunId]=useState('')
 const [candidates,setCandidates]=useState<Candidate[]>([])
 const [logs,setLogs]=useState<Log[]>([])
 const [loading,setLoading]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [searchQuery,setSearchQuery]=useState('')
 const [keywords,setKeywords]=useState('')
 const [countries,setCountries]=useState('United States')
 const [jobTitles,setJobTitles]=useState('')
 const [skills,setSkills]=useState('')
 const [seniority,setSeniority]=useState('senior')
 const [minYears,setMinYears]=useState('3')
 const [maxYears,setMaxYears]=useState('')
 const [maxResults,setMaxResults]=useState('100')
 const [maxCost,setMaxCost]=useState('5')
 const [filter,setFilter]=useState('all')
 const [tableQuery,setTableQuery]=useState('')
 const [costConsent,setCostConsent]=useState(false)
 const [searchCostConsent,setSearchCostConsent]=useState(false)
 const pollBusy=useRef(false)
 const activeRun=runs.find(x=>x.id===activeRunId)||null
 const invoke=useCallback(async(action:string,payload:Record<string,unknown>={})=>{
  if(!supabase)throw new Error('Supabase 尚未初始化')
  const {data,error}=await supabase.functions.invoke('linkedin-discovery-pipeline',{body:{action,workspace_id:workspaceId,run_id:activeRunId,...payload}})
  if(error||data?.error)throw new Error(data?.error||error?.message||'请求失败')
  return data
 },[workspaceId,activeRunId])
 const refreshRuns=useCallback(async()=>{
  if(!supabase)return
  const {data,error}=await supabase.from('linkedin_discovery_runs').select('id,name,status,criteria,discovered_count,selected_count,enriched_count,actual_cost,created_at,error_message,actor_a_status,actor_b_status').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).limit(50)
  if(error){setError(error.message);return}
  const rows=(data||[]) as Run[];setRuns(rows)
  setActiveRunId(current=>current&&rows.some(x=>x.id===current)?current:rows[0]?.id||'')
 },[workspaceId])
 const refreshRunData=useCallback(async(runId:string)=>{
  if(!supabase||!runId)return
  setLoading(true)
  const [c,l]=await Promise.all([
   supabase.from('linkedin_candidates').select('*').eq('workspace_id',workspaceId).eq('run_id',runId).order('created_at',{ascending:false}).limit(1000),
   supabase.from('linkedin_discovery_logs').select('id,level,stage,message,details,created_at').eq('workspace_id',workspaceId).eq('run_id',runId).order('created_at',{ascending:false}).limit(100)
  ])
  if(c.error)setError(c.error.message);else{const incoming=(c.data||[]) as Candidate[];setCandidates(current=>{const dirty=new Map(current.filter(row=>row.dirty).map(row=>[row.id,row]));return incoming.map(row=>dirty.get(row.id)||row)})}
  if(l.error)setError(l.error.message);else setLogs((l.data||[]) as Log[])
  setLoading(false)
 },[workspaceId])
 useEffect(()=>{void refreshRuns()},[refreshRuns])
 useEffect(()=>{if(activeRunId)void refreshRunData(activeRunId);else{setCandidates([]);setLogs([])}},[activeRunId,refreshRunData])
 useEffect(()=>{
  if(!activeRunId||!activeRun||!['searching','enriching'].includes(activeRun.status))return
  const timer=window.setInterval(async()=>{
   if(pollBusy.current)return
   pollBusy.current=true
   try{await invoke(activeRun.status==='searching'?'poll_search':'poll_enrichment');await refreshRunData(activeRunId);await refreshRuns()}catch(e){setError(e instanceof Error?e.message:'采集状态刷新失败')}finally{pollBusy.current=false}
  },3500)
  return()=>window.clearInterval(timer)
 },[activeRunId,activeRun?.status,invoke,refreshRunData,refreshRuns])
 const createSearch=async()=>{
  if(!supabase)return
  const countryList=split(countries),titleList=split(jobTitles),skillList=split(skills),keywordList=split(keywords)
  if(!searchQuery.trim()&&!countryList.length&&!titleList.length&&!skillList.length&&!keywordList.length){setError('至少填写一项搜索条件');return}
  setBusy(true);setError('');setNotice('')
  const criteria={searchQuery:searchQuery.trim(),keywords:keywordList,countries:countryList,jobTitles:titleList,skills:skillList,seniority,minExperienceYears:minYears===''?null:Number(minYears),maxExperienceYears:maxYears===''?null:Number(maxYears),maxResults:Number(maxResults),maxCost:Number(maxCost)}
  const name=titleList[0]||searchQuery.trim()||keywordList[0]||countryList[0]||'LinkedIn 候选人发现'
  const {data,error}=await supabase.from('linkedin_discovery_runs').insert({workspace_id:workspaceId,created_by:userId,name,status:'draft',criteria,estimated_cost:Number(maxCost),cost_currency:'USD'}).select('id').single()
  if(error||!data){setError(error?.message||'创建任务失败');setBusy(false);return}
  setActiveRunId(data.id)
  try{
   const {data:result,error:fnError}=await supabase.functions.invoke('linkedin-discovery-pipeline',{body:{action:'start_search',workspace_id:workspaceId,run_id:data.id,criteria,confirm_cost:true}})
   if(fnError||result?.error)throw new Error(result?.error||fnError?.message||'Actor A 启动失败')
   setNotice('Actor A 已启动。候选人会持续增量写入下方表格，刷新页面后仍可继续查看。')
   setCostConsent(false);setSearchCostConsent(false);await refreshRuns();await refreshRunData(data.id)
  }catch(e){setError(e instanceof Error?e.message:'启动失败')}
  setBusy(false)
 }
 const updateLocal=(id:string,patch:Partial<Candidate>)=>setCandidates(rows=>rows.map(row=>row.id===id?{...row,...patch,dirty:true}:row))
 const saveRows=async(rows:Candidate[])=>{
  if(!rows.length)return
  setBusy(true);setError('')
  try{let saved=0,selected=0;for(let i=0;i<rows.length;i+=200){const batch=rows.slice(i,i+200);const result=await invoke('save_candidates',{changes:batch.map(row=>({id:row.id,clean_status:row.clean_status,selected_for_enrichment:row.selected_for_enrichment,full_name:row.full_name||'',headline:row.headline||'',job_title:row.job_title||'',company_name:row.company_name||'',country:row.country||'',location:row.location||'',contact_email:row.contact_email||'',contact_phone:row.contact_phone||''}))});saved+=Number(result.saved)||0;selected=Number(result.selected)||0;}setNotice(`已保存 ${saved} 条清洗记录，当前选中 ${selected} 条`);setCandidates(current=>current.map(row=>({...row,dirty:false})));await refreshRunData(activeRunId);await refreshRuns()}catch(e){setError(e instanceof Error?e.message:'保存失败')}finally{setBusy(false)}
 }
 const keepAll=()=>setCandidates(rows=>rows.map(row=>({...row,clean_status:'keep',selected_for_enrichment:true,dirty:true})))
 const visibleCandidates=useMemo(()=>candidates.filter(row=>(filter==='all'||row.clean_status===filter)&&(!tableQuery||[row.full_name,row.headline,row.job_title,row.company_name,row.country,row.profile_url,row.contact_email].some(x=>String(x||'').toLowerCase().includes(tableQuery.toLowerCase())))),[candidates,filter,tableQuery])
 const selectedCount=candidates.filter(x=>x.clean_status==='keep'&&x.selected_for_enrichment).length
 const startEnrichment=async()=>{
  if(!costConsent){setError('请先确认已了解本次 Actor B 可能产生的第三方费用');return}
  setBusy(true);setError('');setNotice('')
  try{const result=await invoke('start_enrichment',{max_cost:Number(maxCost),confirm_cost:true});setNotice(`Actor B 已启动，正在补全 ${result.profiles} 条候选人的公开联系资料`);await refreshRuns();await refreshRunData(activeRunId)}catch(e){setError(e instanceof Error?e.message:'联系方式补全启动失败')}finally{setBusy(false)}
 }
 const retryPoll=async()=>{if(!activeRun)return;setBusy(true);try{await invoke(activeRun.status==='enriching'?'poll_enrichment':'poll_search');await refreshRunData(activeRunId);await refreshRuns()}catch(e){setError(e instanceof Error?e.message:'刷新失败')}finally{setBusy(false)}}
 return <div className="linkedin-discovery">
  <section className="li-hero"><div><span className="li-eyebrow">LINKEDIN · TWO-STAGE DISCOVERY</span><h2>从 LinkedIn 发现</h2><p>先按公开职业信息发现候选人，再由你清洗、保留并选择需要补全的资料。</p></div><div className="li-hero-mark"><i className="fab fa-linkedin-in"/></div></section>
  <section className="li-panel li-config">
   <div className="li-panel-title"><div><span className="li-step">01 / SEARCH CRITERIA</span><h3>配置采集条件</h3></div><span className="li-muted">Actor A · thirdwatch</span></div>
   <div className="li-form-grid">
    <label className="li-field li-span-2"><span>搜索关键词 / 目标描述</span><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="例如：B2B SaaS sales leader, procurement director"/></label>
    <label className="li-field"><span>国家 / 地区 <small>可填写多个，以逗号或换行分隔</small></span><textarea rows={2} value={countries} onChange={e=>setCountries(e.target.value)} placeholder="United States, United Kingdom, Singapore"/></label>
    <label className="li-field"><span>职位 / 职务 <small>支持多个职位</small></span><textarea rows={2} value={jobTitles} onChange={e=>setJobTitles(e.target.value)} placeholder="Procurement Manager&#10;Head of Purchasing&#10;Supply Chain Director"/></label>
    <label className="li-field"><span>技能 / 专业能力</span><textarea rows={2} value={skills} onChange={e=>setSkills(e.target.value)} placeholder="Sourcing, Import/Export, SAP"/></label>
    <label className="li-field"><span>关键词补充 / 必须出现的短语</span><textarea rows={2} value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="B2B, wholesale, international trade"/></label>
    <label className="li-field"><span>资历级别</span><select value={seniority} onChange={e=>setSeniority(e.target.value)}><option value="">不限</option><option value="entry">初级</option><option value="mid">中级</option><option value="senior">高级</option><option value="lead">主管 / Lead</option><option value="director">总监</option><option value="vp">副总裁</option><option value="executive">高管</option></select></label>
    <div className="li-field"><span>工作经验（年）</span><div className="li-inline-inputs"><input aria-label="最少工作年限" type="number" min="0" max="40" value={minYears} onChange={e=>setMinYears(e.target.value)} placeholder="最低"/><span>至</span><input aria-label="最多工作年限" type="number" min="0" max="40" value={maxYears} onChange={e=>setMaxYears(e.target.value)} placeholder="最高"/></div></div>
    <label className="li-field"><span>最大候选人数</span><input type="number" min="1" max="1000" value={maxResults} onChange={e=>setMaxResults(e.target.value)}/></label>
    <label className="li-field"><span>本次费用上限（USD）</span><input type="number" min="0.1" max="100" step="0.5" value={maxCost} onChange={e=>setMaxCost(e.target.value)}/></label>
   </div>
   <div className="li-policy-note"><i className="fas fa-shield-alt"/> 仅处理 Actor 返回的公开职业资料；Actor B 仅对你勾选保留的主页执行补全。邮箱和电话仅在数据源公开提供时展示，不保证每条都有。</div>
   <div className="li-form-actions"><label className="li-cost-consent"><input type="checkbox" checked={searchCostConsent} onChange={e=>setSearchCostConsent(e.target.checked)}/> 我已了解 Actor A 可能按结果数量收费，并同意本次费用上限。</label><button className="li-primary" disabled={busy||!workspaceId||!userId||!searchCostConsent} onClick={()=>void createSearch()}><i className="fas fa-search"/> {busy?'正在提交…':'开始发现候选人'}</button><span>Actor A：thirdwatch/linkedin-candidate-finder-scraper</span></div>
  </section>
  <section className="li-panel li-run-panel">
   <div className="li-panel-title"><div><span className="li-step">02 / LIVE COLLECTION</span><h3>采集任务与实时进度</h3></div><button className="li-secondary" onClick={()=>{void refreshRuns();if(activeRunId)void refreshRunData(activeRunId)}}><i className="fas fa-sync-alt"/> 刷新</button></div>
   <div className="li-run-toolbar"><select value={activeRunId} onChange={e=>setActiveRunId(e.target.value)}><option value="">选择采集任务</option>{runs.map(run=><option key={run.id} value={run.id}>{run.name} · {statusName(run.status)} · {date(run.created_at)}</option>)}</select>{activeRun&&<span className={'li-status li-status-'+activeRun.status}>{statusName(activeRun.status)}</span>}</div>
   {activeRun&&<div className="li-metrics"><div><b>{activeRun.discovered_count}</b><span>已发现</span></div><div><b>{selectedCount}</b><span>已保留并勾选</span></div><div><b>{activeRun.enriched_count}</b><span>已补全</span></div><div><b>{activeRun.actual_cost===null?'—':'$'+Number(activeRun.actual_cost).toFixed(3)}</b><span>实际费用</span></div></div>}
   {activeRun?.error_message&&<div className="li-error">{activeRun.error_message}</div>}
   {error&&<div className="li-error">{error}</div>}{notice&&<div className="li-notice">{notice}</div>}
   <div className="li-live-grid">
    <div className="li-live-log"><div className="li-subhead"><b><i className="fas fa-stream"/> 动态日志</b><small>{logs.length} 条事件 · 自动刷新</small></div>{logs.length?logs.slice(0,40).map(item=><div className={'li-log-row li-log-'+item.level} key={item.id}><time>{new Date(item.created_at).toLocaleTimeString()}</time><b>{item.stage}</b><span>{item.message}</span></div>):<div className="li-empty">启动采集后，这里会实时显示 Actor 启动、增量拉取、去重和补全进度。</div>}</div>
    <div className="li-pipeline"><b>执行阶段</b><div className={['searching','search_completed','enriching','completed'].includes(activeRun?.status||'')?'done':''}><i>1</i><span>Actor A 结构化发现</span><small>{activeRun?.actor_a_status||'等待启动'}</small></div><div className={['search_completed','enriching','completed'].includes(activeRun?.status||'')?'done':''}><i>2</i><span>候选人手动清洗</span><small>{activeRun?.selected_count||0} 条保留</small></div><div className={['enriching','completed'].includes(activeRun?.status||'')?'done':''}><i>3</i><span>Actor B 联系方式补全</span><small>{activeRun?.actor_b_status||'等待选择候选人'}</small></div><div className={activeRun?.status==='completed'?'done':''}><i>4</i><span>合并结果表</span><small>{activeRun?.status==='completed'?'完成':'等待补全'}</small></div></div>
   </div>
  </section>
  <section className="li-panel li-results">
   <div className="li-panel-title"><div><span className="li-step">03 / CLEAN & ENRICH</span><h3>候选人清洗与联系方式补全</h3><p>表格数据保存在工作空间，页面刷新后会从数据库重新加载。</p></div><span className="li-muted">{visibleCandidates.length} / {candidates.length} 条</span></div>
   <div className="li-table-tools"><input value={tableQuery} onChange={e=>setTableQuery(e.target.value)} placeholder="搜索姓名、职位、公司、国家、主页或邮箱…"/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部状态</option><option value="new">待清洗</option><option value="keep">保留</option><option value="discard">排除</option><option value="duplicate">重复</option></select><button className="li-secondary" onClick={keepAll} disabled={!candidates.length}>全部保留</button><button className="li-primary" onClick={()=>void saveRows(candidates.filter(x=>x.dirty))} disabled={busy||!candidates.some(x=>x.dirty)}>保存清洗</button></div>
   <div className="li-table-wrap"><table className="li-candidate-table"><thead><tr><th>保留 / 补全</th><th>候选人</th><th>职位 / 公司</th><th>国家 / 地区</th><th>技能</th><th>公开邮箱</th><th>公开电话</th><th>LinkedIn</th><th>操作</th></tr></thead><tbody>{visibleCandidates.map(row=><tr key={row.id}><td><input type="checkbox" checked={row.clean_status==='keep'&&row.selected_for_enrichment} onChange={e=>updateLocal(row.id,{clean_status:e.target.checked?'keep':'new',selected_for_enrichment:e.target.checked})}/></td><td><input className="li-cell-input li-name" value={row.full_name||''} onChange={e=>updateLocal(row.id,{full_name:e.target.value})} placeholder="姓名"/><small>{row.headline||''}</small></td><td><input className="li-cell-input" value={row.job_title||''} onChange={e=>updateLocal(row.id,{job_title:e.target.value})} placeholder="职位"/><input className="li-cell-input" value={row.company_name||''} onChange={e=>updateLocal(row.id,{company_name:e.target.value})} placeholder="公司"/></td><td><input className="li-cell-input" value={row.country||row.location||''} onChange={e=>updateLocal(row.id,{country:e.target.value})} placeholder="国家 / 地区"/></td><td><span className="li-skill-list">{(row.skills||[]).slice(0,4).join(' · ')||'—'}</span></td><td><input className="li-cell-input" value={row.contact_email||''} onChange={e=>updateLocal(row.id,{contact_email:e.target.value})} placeholder="公开邮箱"/></td><td><input className="li-cell-input" value={row.contact_phone||''} onChange={e=>updateLocal(row.id,{contact_phone:e.target.value})} placeholder="公开电话"/></td><td><a href={row.profile_url} target="_blank" rel="noreferrer">打开主页 <i className="fas fa-external-link-alt"/></a></td><td><div className="li-row-actions"><button onClick={()=>void saveRows([{...row,clean_status:'keep',selected_for_enrichment:true}])}>保留</button><button onClick={()=>updateLocal(row.id,{clean_status:'duplicate',selected_for_enrichment:false})}>重复</button><button onClick={()=>updateLocal(row.id,{clean_status:'discard',selected_for_enrichment:false})}>排除</button></div></td></tr>)}</tbody></table>{!visibleCandidates.length&&<div className="li-empty">{loading?'正在加载候选人…':'暂无候选人记录。启动 Actor A 后，新增结果会自动显示在这里。'}</div>}</div>
   <div className="li-enrich-bar"><div><b>Actor B · datadoping/linkedin-profile-scraper</b><span>只处理已保留且勾选的主页（每批最多 200 条）；请求公开可用的联系方式，返回电话时一并合并。</span></div><label><input type="checkbox" checked={costConsent} onChange={e=>setCostConsent(e.target.checked)}/> 我已了解 Actor B 可能产生费用</label><button className="li-primary" disabled={busy||!selectedCount||!costConsent||activeRun?.status==='enriching'} onClick={()=>void startEnrichment()}><i className="fas fa-address-card"/> 补全所选联系方式</button></div>
  </section>
  <div className="li-footnote">采集仅限公开可见资料；请确认符合 LinkedIn 平台条款、Apify Actor 使用条款及目标国家/地区的隐私和营销法规。对于无法公开获取的邮箱或电话，系统保留为空，不绕过登录或访问限制。</div>
 </div>
}
