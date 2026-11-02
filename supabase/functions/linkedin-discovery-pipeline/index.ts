import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders={"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info, x-supabase-api-version","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b3.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
const asObject=(v:unknown):Record<string,any>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,any>:{};
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
async function readJson(response:Response){const text=await response.text();let body:any={};try{body=text?JSON.parse(text):{}}catch{body={message:text}}if(!response.ok)throw new Error(String(body.message||body.error||`HTTP ${response.status}`));return body;}
const enc=(v:string)=>encodeURIComponent(v);
function cleanList(value:unknown,max=30){if(Array.isArray(value))return value.map(x=>String(x).trim()).filter(Boolean).slice(0,max);return String(value||"").split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean).slice(0,max);}
async function log(admin:string,workspaceId:string,runId:string,stage:string,message:string,level="info",details:Record<string,unknown>={}){await rest("linkedin_discovery_logs",admin,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({workspace_id:workspaceId,run_id:runId,stage,message,level,details})});}
async function getApifyKey(admin:string,workspaceId:string){const c=await readJson(await rest(`integration_connections?select=secret_ref,status,is_enabled&workspace_id=eq.${enc(workspaceId)}&provider_key=eq.apify&limit=1`,admin));const row=c[0];if(!row?.secret_ref||row.status!=="connected"||row.is_enabled!==true)throw new Error("请先在系统集成中启用并测试 Apify API Key");const value=await readJson(await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:row.secret_ref})}));let secret:any=value; if(typeof value==="string"){try{secret=JSON.parse(value)}catch{secret={api_key:value}}}const key=String(secret.api_key||secret.token||"");if(!key)throw new Error("Apify 凭证读取失败");return key;}
async function apify(key:string,path:string,init:RequestInit={}){const headers=new Headers(init.headers);headers.set("Authorization",`Bearer ${key}`);headers.set("Accept","application/json");if(init.body)headers.set("Content-Type","application/json");return readJson(await fetch(`https://api.apify.com/v2/${path}`,{...init,headers,signal:AbortSignal.timeout(60000)}));}
async function memberCheck(admin:string,workspaceId:string,userId:string){const m=await readJson(await rest(`workspace_members?select=role&workspace_id=eq.${enc(workspaceId)}&user_id=eq.${enc(userId)}&limit=1`,admin));if(m.length)return true;const w=await readJson(await rest(`workspaces?select=id&owner_id=eq.${enc(userId)}&id=eq.${enc(workspaceId)}&limit=1`,admin));return w.length>0;}
async function getRun(admin:string,workspaceId:string,runId:string){const rows=await readJson(await rest(`linkedin_discovery_runs?select=*&id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}&limit=1`,admin));if(!rows[0])throw new Error("找不到该 LinkedIn 发现任务");return rows[0];}
async function updateRun(admin:string,workspaceId:string,runId:string,payload:Record<string,unknown>){const response=await rest(`linkedin_discovery_runs?id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({...payload,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("LinkedIn 任务状态写入失败："+(await response.text()).slice(0,300));return response;}
function profileUrl(row:Record<string,any>){const raw=String(row.url||row.profileUrl||row.profile_url||row.linkedinUrl||row.linkedin_url||row.linkedin_profile_url||"").trim();if(!raw)return "";if(/^https?:\/\//i.test(raw))return raw.replace(/^http:/,"https:").replace(/[?#].*$/,"").replace(/\/$/,"")+"/";return `https://www.linkedin.com/in/${raw.replace(/^\/+|\/+$/g,"")}/`;}
function slugOf(url:string){return url.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1]||"";}
async function fetchBatch(key:string,datasetId:string,offset:number){const data=await apify(key,`datasets/${enc(datasetId)}/items?clean=true&format=json&offset=${offset}&limit=100`);return Array.isArray(data)?data:Array.isArray(data.items)?data.items:[];}
async function handle(req:Request){
 const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();if(!authorization||!url||!anon||!admin)return json({error:"Server authentication configuration missing"},401,origin);
  const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});if(!auth.ok)return json({error:"Invalid session"},401,origin);const user=await auth.json();
  const body=await req.json();const action=String(body.action||"");const workspaceId=String(body.workspace_id||"");const runId=String(body.run_id||"");
  if(!workspaceId||!["start_search","poll_search","save_candidates","start_enrichment","poll_enrichment"].includes(action))return json({error:"workspace_id and a valid action are required"},400,origin);
  if(!await memberCheck(admin,workspaceId,String(user.id)))return json({error:"Workspace access denied"},403,origin);
  if(action==="start_search"){
   if(body.confirm_cost!==true)throw new Error("请先确认本次 Actor A 的第三方采集费用");
   const criteria=asObject(body.criteria);const keywords=cleanList(criteria.keywords);const jobTitles=cleanList(criteria.jobTitles);const skills=cleanList(criteria.skills);const countries=cleanList(criteria.countries,20);const searchQuery=String(criteria.searchQuery||"").trim();if(!searchQuery&&!keywords.length&&!jobTitles.length&&!skills.length&&!countries.length)throw new Error("至少填写关键词、职位、技能或国家中的一项");
   const maxResults=Math.min(1000,Math.max(1,Number(criteria.maxResults)||100));const maxCost=Math.min(100,Math.max(0.1,Number(criteria.maxCost)||5));const input:Record<string,unknown>={maxResults,maxResultsPerQuery:Math.min(maxResults,Math.max(1,Number(criteria.maxResultsPerQuery)||100)),skillsMatch:criteria.skillsMatch==="any"?"any":"all",proxyConfiguration:{useApifyProxy:true,apifyProxyGroups:["GOOGLE_SERP"]}};
   if(searchQuery)input.searchQuery=searchQuery;if(keywords.length)input.keywords=keywords;if(jobTitles.length)input.jobTitles=jobTitles;if(skills.length)input.skills=skills;if(countries.length){input.country=countries.length===1?countries[0]:undefined;input.locations=countries.length>1?countries:undefined;}const seniority=String(criteria.seniority||"").trim();if(seniority)input.seniority=seniority;const min=criteria.minExperienceYears===null||criteria.minExperienceYears===""?NaN:Number(criteria.minExperienceYears);const max=criteria.maxExperienceYears===null||criteria.maxExperienceYears===""?NaN:Number(criteria.maxExperienceYears);if(Number.isFinite(min)&&min>=0)input.minExperienceYears=min;if(Number.isFinite(max)&&max>=0)input.maxExperienceYears=max;
   const run=await getRun(admin,workspaceId,runId);if(run.status!=="draft"&&run.status!=="failed")throw new Error("该任务已启动，不能重复提交");
   await log(admin,workspaceId,runId,"prepare","已完成搜索条件校验，正在连接 Apify Actor A", "info",{actor:"thirdwatch/linkedin-candidate-finder-scraper",maxResults,maxCost});
   const key=await getApifyKey(admin,workspaceId);const started=await apify(key,`acts/thirdwatch~linkedin-candidate-finder-scraper/runs?maxTotalChargeUsd=${maxCost}`,{method:"POST",body:JSON.stringify(input)});const data=asObject(started.data||started);if(!data.id||!data.defaultDatasetId)throw new Error("Actor A 未返回 run ID 或 dataset ID");
   await updateRun(admin,workspaceId,runId,{name:run.name||"LinkedIn 候选人发现",status:"searching",criteria:{...criteria,actor_a_input:input},actor_a_run_id:String(data.id),actor_a_dataset_id:String(data.defaultDatasetId),actor_a_status:String(data.status||"READY"),actor_a_offset:0,started_at:new Date().toISOString(),error_message:null});
   await log(admin,workspaceId,runId,"submitted","Actor A 已启动，开始增量读取候选人结果","success",{actor_run_id:data.id,dataset_id:data.defaultDatasetId});
   return json({ok:true,run_id:runId,actor_run_id:data.id},200,origin);
  }
  const run=await getRun(admin,workspaceId,runId);
  if(action==="poll_search"){
   const key=await getApifyKey(admin,workspaceId);
   if(!run.actor_a_run_id||!run.actor_a_dataset_id)return json({error:"Actor A 尚未启动"},409,origin);
   const stateBody=await apify(key,`actor-runs/${enc(String(run.actor_a_run_id))}`);const state=asObject(stateBody.data||stateBody);const offset=Number(run.actor_a_offset||0);const items=await fetchBatch(key,String(run.actor_a_dataset_id),offset);
   const rows=items.map((raw:unknown)=>{const item=asObject(raw);const url=profileUrl(item);if(!url)return null;return {workspace_id:workspaceId,run_id:runId,profile_url:url,profile_slug:slugOf(url),full_name:String(item.fullName||item.name||item.full_name||""),headline:String(item.headline||""),job_title:String(item.jobTitle||item.role||item.headline||""),company_name:String(item.currentCompany||item.company||""),location:String(item.location||""),country:String(item.country||""),skills:cleanList(item.matchedSkills||item.skills),seniority:String(item.seniority||""),experience_years:Number.isFinite(Number(item.experienceYears))?Number(item.experienceYears):null,source_title:String(item.sourceTitle||""),source_snippet:String(item.sourceSnippet||""),matched_criteria:{matchedJobTitles:item.matchedJobTitles||[],matchedSkills:item.matchedSkills||[],matchedLocations:item.matchedLocations||[],matchedKeywords:item.matchedKeywords||[],searchQuery:item.searchQuery||null,searchCriteria:item.searchCriteria||{}},visible_evidence_score:Number.isFinite(Number(item.visibleEvidenceScore))?Number(item.visibleEvidenceScore):null,profile_data:item};}).filter(Boolean);
   if(rows.length){const saved=await rest("linkedin_candidates?on_conflict=run_id,profile_url",admin,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});if(!saved.ok)throw new Error("候选人增量保存失败："+(await saved.text()).slice(0,400));}
   const nextOffset=offset+items.length;const actorStatus=String(state.status||"");const done=["SUCCEEDED","FAILED","ABORTED","TIMED-OUT"].includes(actorStatus);const failed=["FAILED","ABORTED","TIMED-OUT"].includes(actorStatus);const complete=done&&items.length<100;
   const countRows=await readJson(await rest(`linkedin_candidates?select=id&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}`,admin));const count=countRows.length;
   await updateRun(admin,workspaceId,runId,{status:failed?"failed":complete?"search_completed":"searching",actor_a_status:actorStatus,actor_a_offset:nextOffset,discovered_count:count,actual_cost:Number(state.usageTotalUsd)||run.actual_cost||null,completed_at:complete?new Date().toISOString():null,error_message:failed?String(state.statusMessage||actorStatus):null});
   if(items.length)await log(admin,workspaceId,runId,"collect",`已增量保存 ${rows.length} 条候选人，本次读取 ${items.length} 条`,"success",{offset,next_offset:nextOffset,discovered_count:count});
   if(failed)await log(admin,workspaceId,runId,"failed","Actor A 执行失败："+String(state.statusMessage||actorStatus),"error",{status:actorStatus});
   else if(complete)await log(admin,workspaceId,runId,"search_completed",`候选人发现完成，共保存 ${count} 条记录，可开始手动清洗`,"success",{discovered_count:count});
   return json({ok:true,status:failed?"failed":complete?"search_completed":"searching",added:rows.length,count,actor_status:actorStatus},200,origin);
  }
  if(action==="save_candidates"){
   const changes=Array.isArray(body.changes)?body.changes.slice(0,250):[];if(!changes.length)throw new Error("没有可保存的候选人修改");let saved=0;
   for(const entry of changes){const x=asObject(entry);const id=String(x.id||"");if(!id)continue;const payload:Record<string,unknown>={updated_at:new Date().toISOString()};if(["new","keep","discard","duplicate"].includes(String(x.clean_status)))payload.clean_status=x.clean_status;if(typeof x.selected_for_enrichment==="boolean")payload.selected_for_enrichment=x.selected_for_enrichment;if(typeof x.full_name==="string")payload.full_name=x.full_name.slice(0,200);if(typeof x.job_title==="string")payload.job_title=x.job_title.slice(0,200);if(typeof x.company_name==="string")payload.company_name=x.company_name.slice(0,200);if(typeof x.country==="string")payload.country=x.country.slice(0,120);if(typeof x.location==="string")payload.location=x.location.slice(0,200);if(typeof x.headline==="string")payload.headline=x.headline.slice(0,500);if(typeof x.contact_email==="string"){payload.contact_email=x.contact_email.slice(0,320);payload.email_source="manual";}if(typeof x.contact_phone==="string"){payload.contact_phone=x.contact_phone.slice(0,80);payload.phone_source="manual";}const r=await rest(`linkedin_candidates?id=eq.${enc(id)}&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});if(r.ok)saved++;}
   const selected=await readJson(await rest(`linkedin_candidates?select=id&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}&clean_status=eq.keep&selected_for_enrichment=eq.true`,admin));
   await updateRun(admin,workspaceId,runId,{selected_count:selected.length});await log(admin,workspaceId,runId,"clean",`人工清洗已保存，成功更新 ${saved} 条，当前选中 ${selected.length} 条待补全`,"success",{saved,selected:selected.length});
   return json({ok:true,saved,selected:selected.length},200,origin);
  }
  if(action==="start_enrichment"){
   if(body.confirm_cost!==true)throw new Error("请先确认本次 Actor B 的第三方补全费用");
   const key=await getApifyKey(admin,workspaceId);
   const selected=await readJson(await rest(`linkedin_candidates?select=id,profile_url&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}&clean_status=eq.keep&selected_for_enrichment=eq.true&limit=201`,admin));if(!selected.length)throw new Error("请先勾选至少一条保留的候选人");if(selected.length>200)throw new Error("Actor B 每批最多补全 200 条，请分批勾选后再执行");const maxCost=Math.min(100,Math.max(0.1,Number(body.max_cost)||5));const urls=selected.map((x:any)=>String(x.profile_url));await log(admin,workspaceId,runId,"enrichment_prepare",`已选中 ${urls.length} 条候选人，准备启动 Actor B 补全公开联系信息`,"info",{actor:"datadoping/linkedin-profile-scraper",max_cost:maxCost});
   const started=await apify(key,`acts/datadoping~linkedin-profile-scraper/runs?maxTotalChargeUsd=${maxCost}`,{method:"POST",body:JSON.stringify({profiles:urls,isEmailRequired:true})});const data=asObject(started.data||started);if(!data.id||!data.defaultDatasetId)throw new Error("Actor B 未返回 run ID 或 dataset ID");
   await updateRun(admin,workspaceId,runId,{status:"enriching",actor_b_run_id:String(data.id),actor_b_dataset_id:String(data.defaultDatasetId),actor_b_status:String(data.status||"READY"),actor_b_offset:0,selected_count:urls.length,completed_at:null,error_message:null});
   await log(admin,workspaceId,runId,"enrichment_submitted","Actor B 已启动，正在按 LinkedIn URL 补全可公开获取的联系信息","success",{actor_run_id:data.id,profiles:urls.length});
   return json({ok:true,profiles:urls.length,actor_run_id:data.id},200,origin);
  }
  if(action==="poll_enrichment"){
   const key=await getApifyKey(admin,workspaceId);
   if(!run.actor_b_run_id||!run.actor_b_dataset_id)return json({error:"Actor B 尚未启动"},409,origin);const stateBody=await apify(key,`actor-runs/${enc(String(run.actor_b_run_id))}`);const state=asObject(stateBody.data||stateBody);const offset=Number(run.actor_b_offset||0);const items=await fetchBatch(key,String(run.actor_b_dataset_id),offset);let enriched=0;
   const selectedRows=await readJson(await rest(`linkedin_candidates?select=id,profile_url,profile_slug,contact_email,contact_phone&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}&clean_status=eq.keep&selected_for_enrichment=eq.true&limit=250`,admin));
   const keyOf=(value:string)=>{const slug=slugOf(value);return slug?slug.toLowerCase():value.toLowerCase().replace(/^https?:\\/\\//,"").replace(/[?#].*$/,"").replace(/\\/$/,"");};
   const byProfile=new Map<string,any>();for(const row of selectedRows){byProfile.set(keyOf(String(row.profile_url||"")),row);if(row.profile_slug)byProfile.set(String(row.profile_slug).toLowerCase(),row);}
   let updated=0,unmatched=0,withoutContact=0;
   for(const raw of items){
    const item=asObject(raw),nested=asObject(item.profile||item.linkedinProfile||item.data||{});
    const url=profileUrl(item)||profileUrl(nested)||profileUrl(asObject(item.person||{}));
    const profileKey=keyOf(url);
    const matched=byProfile.get(profileKey)||byProfile.get(slugOf(url).toLowerCase());
    if(!matched){unmatched++;continue;}
    const contact=asObject(item.contactInfo||item.contact_info||item.contact||item.contactDetails||item.publicContactInfo||nested.contactInfo||nested.contact||{});
    const emails=Array.isArray(item.emails)?item.emails:Array.isArray(item.emailAddresses)?item.emailAddresses:[];
    const phones=Array.isArray(item.phones)?item.phones:Array.isArray(item.phoneNumbers)?item.phoneNumbers:[];
    const firstValue=(values:any[],field:string)=>values.map(x=>typeof x==="string"?x:String(asObject(x)[field]||asObject(x).value||"")).find(Boolean)||"";
    const email=String(item.publicEmail||item.public_email||item.email||item.emailAddress||item.workEmail||item.contactEmail||item.verifiedEmail||contact.publicEmail||contact.email||contact.workEmail||firstValue(emails,"email")||nested.email||"").trim();
    const phone=String(item.publicPhone||item.public_phone||item.phone||item.phoneNumber||item.mobile||item.contactPhone||contact.publicPhone||contact.phone||contact.mobile||firstValue(phones,"phone")||nested.phone||"").trim();
    const patch:Record<string,unknown>={profile_data:item,enriched_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()};
    if(email){patch.contact_email=email;patch.email_source="datadoping/linkedin-profile-scraper";}
    if(phone){patch.contact_phone=phone;patch.phone_source="datadoping/linkedin-profile-scraper";}
    if(!email&&!phone)withoutContact++;
    const response=await rest(`linkedin_candidates?id=eq.${enc(String(matched.id))}&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}`,admin,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});
    const changed=await readJson(response);
    if(Array.isArray(changed)&&changed.length>0)updated+=changed.length;
   }
   const nextOffset=offset+items.length;const actorStatus=String(state.status||"");const done=["SUCCEEDED","FAILED","ABORTED","TIMED-OUT"].includes(actorStatus);const failed=["FAILED","ABORTED","TIMED-OUT"].includes(actorStatus);const complete=done&&items.length<100;const countRows=await readJson(await rest(`linkedin_candidates?select=id&run_id=eq.${enc(runId)}&workspace_id=eq.${enc(workspaceId)}&enriched_at=not.is.null`,admin));
   await updateRun(admin,workspaceId,runId,{status:failed?"failed":complete?"completed":"enriching",actor_b_status:actorStatus,actor_b_offset:nextOffset,enriched_count:countRows.length,actual_cost:Number(state.usageTotalUsd)||run.actual_cost||null,completed_at:complete?new Date().toISOString():null,error_message:failed?String(state.statusMessage||actorStatus):null});
   if(items.length)await log(admin,workspaceId,runId,"enrichment_collect",`Actor B 返回 ${items.length} 条资料，已更新 ${enriched} 条候选人`,"success",{offset,next_offset:nextOffset,enriched});
   if(failed)await log(admin,workspaceId,runId,"enrichment_failed","Actor B 执行失败："+String(state.statusMessage||actorStatus),"error",{status:actorStatus});
   else if(complete)await log(admin,workspaceId,runId,"completed",`联系方式补全完成，已处理 ${countRows.length} 条候选人`,"success",{enriched:countRows.length});
   return json({ok:true,status:failed?"failed":complete?"completed":"enriching",enriched:updated,count:countRows.length,returned:items.length,unmatched,without_contact:withoutContact,actor_status:actorStatus},200,origin);
  }
  return json({error:"Unsupported action"},400,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected LinkedIn pipeline error"},500,req.headers.get("origin"));}
}
Deno.serve(handle);
