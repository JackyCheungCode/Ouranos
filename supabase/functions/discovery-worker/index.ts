import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getProviderAdapter, type AdapterContext, type ProviderKey } from "../_shared/provider-adapters.ts";

const WORKER_SECRET_ID="8052bb93-5044-4e23-a0ac-481bfb7fbadf";
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
async function readSecret(secretRef:string,admin:string){const response=await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:secretRef})});if(!response.ok)throw new Error("Unable to read provider credentials from Vault");const value=await response.json();if(typeof value!=="string"||!value)throw new Error("Provider credentials are empty");try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==="object")return parsed as Record<string,unknown>;}catch{}return {api_key:value};}
const obj=(v:unknown)=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const getPath=(source:unknown,path:string)=>path.split(".").reduce<unknown>((value,key)=>value&&typeof value==="object"?(value as Record<string,unknown>)[key]:undefined,source);
const asText=(v:unknown)=>v===undefined||v===null?"":String(v).trim();
const normalDomain=(value:string)=>{if(!value)return null;try{return new URL(value.includes("://")?value:`https://${value}`).hostname.toLowerCase().replace(/^www\./,"");}catch{return value.toLowerCase().replace(/^www\./,"").split("/")[0];}};
const normalPhone=(value:string)=>value.replace(/[^0-9]/g,"")||null;
async function hash(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
const categories=(value:unknown)=>Array.isArray(value)?value.map(String).filter(Boolean):typeof value==="string"?value.split(/[,;|]/).map(x=>x.trim()).filter(Boolean):[];
function mapped(raw:unknown,mapping:Record<string,unknown>,field:string,fallbacks:string[]=[]){const path=asText(mapping[field]);if(path){const value=getPath(raw,path);if(value!==undefined&&value!==null)return value;}for(const path of fallbacks){const value=getPath(raw,path);if(value!==undefined&&value!==null&&value!=="")return value;}return undefined;}
function extractItems(raw:unknown):unknown[]{if(Array.isArray(raw))return raw;const r=obj(raw);const data=obj(r.data);for(const candidate of [r.items,r.results,r.records,r.resultObject,r.data,data.items,data.results,data.records,data.data])if(Array.isArray(candidate))return candidate;return [];}
async function insertRows(path:string,payload:Record<string,unknown>[],admin:string){if(!payload.length)return [];const response=await rest(path,admin,{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=representation"},body:JSON.stringify(payload)});if(!response.ok){const text=await response.text();throw new Error(`Database insert failed: ${text.slice(0,1000)}`);}return await response.json();}
async function processItems(run:Record<string,unknown>,items:unknown[],admin:string){
 const mapping=obj(run.field_mapping_snapshot);let companyCount=0;let contactCount=0;let processedCount=0;let skippedCount=0;
 for(const raw of items){
  const companyName=asText(mapped(raw,mapping,"company_name",["company.name","organization.name","companyName","businessName","company_name"]));
  const contactName=asText(mapped(raw,mapping,"contact_name",["contact.name","fullName","full_name","person.name","person_name"]));
  const sourceUrl=asText(mapped(raw,mapping,"source_url",["url","sourceUrl","profileUrl","link","website"]));
  const sourceTitle=companyName||contactName||asText(mapped(raw,mapping,"contact_name",["name","fullName","full_name","title","username"]))||asText(getPath(raw,"title"))||asText(getPath(raw,"name"))||null;
  const externalId=asText(mapped(raw,mapping,"external_record_id",["id","externalId","placeId","profileId","userId"]))||sourceUrl||await hash(JSON.stringify(raw));
  // Persist every provider row as source evidence, even when it cannot yet be normalized
  // into a company/contact. This keeps the original scrape reviewable and exportable.
  const sourceRows=await insertRows("lead_source_records?on_conflict=workspace_id,task_id,provider_key,channel_key,external_record_id&select=id",[{workspace_id:run.workspace_id,task_id:run.task_id,provider_key:run.provider_key,channel_key:run.channel_key,external_record_id:externalId,source_url:sourceUrl||null,source_title:sourceTitle,confidence:Number(mapped(raw,mapping,"confidence",["confidence","score"]))||null,raw_payload:raw&&typeof raw==="object"?raw:{value:raw}}],admin);
  let sourceId=sourceRows[0]?.id;
  if(!sourceId){const existingSource=await rest(`lead_source_records?select=id&workspace_id=eq.${encodeURIComponent(String(run.workspace_id))}&task_id=eq.${encodeURIComponent(String(run.task_id))}&provider_key=eq.${encodeURIComponent(String(run.provider_key))}&channel_key=eq.${encodeURIComponent(String(run.channel_key))}&external_record_id=eq.${encodeURIComponent(externalId)}&limit=1`,admin);if(existingSource.ok)sourceId=(await existingSource.json())[0]?.id;}
  if(!sourceId)throw new Error("Unable to resolve source evidence record ID");
  if(!companyName&&!contactName){skippedCount++;continue;}processedCount++;
  let companyInboxId:string|null=null;
  if(companyName){
   const normalizedDomain=normalDomain(website);
   const normalizedEmail=email.toLowerCase()||null;
   const normalizedName=companyName.toLowerCase().replace(/\s+/g," ").trim();
   const normalizedPayload={company_name:companyName,website:website||null,email:email||null,phone:phone||null,country_name:countryName||null,country_code:countryCode||null,address:address||null,product_categories:productCategories,social_links:socialLinks,employee_range:employeeRange||null,description:description||null};
   const companyRows=await insertRows("lead_inbox_records?on_conflict=workspace_id,source_record_id,record_type,source_item_key&select=id",[{workspace_id:run.workspace_id,task_id:run.task_id,source_item_key:"company",record_type:"company",review_status:"pending",source_record_id:sourceId,display_name:companyName,normalized_name:normalizedName,normalized_domain:normalizedDomain,normalized_email:normalizedEmail,normalized_phone:normalPhone(phone),country_code:countryCode||null,country_name:countryName||null,website:website||null,email:email||null,phone:phone||null,address:address||null,product_categories:productCategories,social_links:socialLinks,employee_range:employeeRange||null,description:description||null,raw_payload:raw&&typeof raw==="object"?raw:{value:raw},normalized_payload:normalizedPayload}],admin);
   companyInboxId=companyRows[0]?.id||null;if(!companyInboxId){const existingCompany=await rest(`lead_inbox_records?select=id&workspace_id=eq.${encodeURIComponent(String(run.workspace_id))}&source_record_id=eq.${encodeURIComponent(String(sourceId))}&record_type=eq.company&source_item_key=eq.company&limit=1`,admin);if(existingCompany.ok)companyInboxId=(await existingCompany.json())[0]?.id||null;}if(companyInboxId)companyCount++;
  }
  if(contactName){
   const contactEmail=asText(mapped(raw,mapping,"contact_email",["contact.email","email","emailAddress"]));
   const contactPhone=asText(mapped(raw,mapping,"contact_phone",["contact.phone","phone","phoneNumber"]));
   const normalizedName=contactName.toLowerCase().replace(/\s+/g," ").trim();
   const normalizedEmail=contactEmail.toLowerCase()||null;
   const normalizedPayload={full_name:contactName,job_title:jobTitle||null,department:department||null,email:contactEmail||null,phone:contactPhone||null,country_name:countryName||null,country_code:countryCode||null,company_name:companyName||null};
   await insertRows("lead_inbox_records?on_conflict=workspace_id,source_record_id,record_type,source_item_key&select=id",[{workspace_id:run.workspace_id,task_id:run.task_id,source_item_key:normalizedEmail||normalizedName,record_type:"contact",review_status:"pending",company_inbox_id:companyInboxId,source_record_id:sourceId,display_name:contactName,normalized_name:normalizedName,normalized_email:normalizedEmail,normalized_phone:normalPhone(contactPhone),country_code:countryCode||null,country_name:countryName||null,job_title:jobTitle||null,department:department||null,email:contactEmail||null,phone:contactPhone||null,address:address||null,product_categories:productCategories,social_links:socialLinks,description:description||null,raw_payload:raw&&typeof raw==="object"?raw:{value:raw},normalized_payload:normalizedPayload}],admin);contactCount++;
  }
 }
 return {companyCount,contactCount,processedCount,skippedCount};
}
function retryableError(message:string){return /HTTP (408|425|429|500|502|503|504)|timeout|temporar|rate.?limit|network|fetch failed/i.test(message);}
async function logTask(taskId:string,workspaceId:string,run:Record<string,unknown>|null,stage:string,message:string,admin:string,details:Record<string,unknown>={}){await rest('integration_events',admin,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({workspace_id:workspaceId,provider_key:String(run?.provider_key||'ouranos'),provider_name:'Ouranos 搜索任务',action:'update',status:stage==='failed'||stage==='import_warning'?'failure':stage==='completed'?'success':'pending',message,duration_ms:null,details:{event_type:'lead_task_log',task_id:taskId,run_id:run?.id||null,channel_key:run?.channel_key||null,stage,...details}})});}
async function taskIsCancelled(taskId:string,workspaceId:string,admin:string){const response=await rest(`lead_search_tasks?select=status&id=eq.${encodeURIComponent(taskId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&limit=1`,admin);if(!response.ok)throw new Error('Unable to verify task status before continuing');const rows=await response.json();return rows[0]?.status==='cancelled';}
async function updateTaskSummary(taskId:string,workspaceId:string,admin:string){
 const [runsResponse,inboxResponse]=await Promise.all([
  rest(`lead_task_runs?select=status,actual_cost,estimated_cost,cost_currency&task_id=eq.${encodeURIComponent(taskId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,admin),
  rest(`lead_inbox_records?select=id,record_type,review_status,source_record_id&task_id=eq.${encodeURIComponent(taskId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,admin)
 ]);
 const runs=runsResponse.ok?await runsResponse.json():[];const inbox=inboxResponse.ok?await inboxResponse.json():[];
 const pending=runs.some((r:Record<string,unknown>)=>r.status==="queued"||r.status==="running");const successes=runs.some((r:Record<string,unknown>)=>r.status==="completed");const status=pending?"running":successes?"completed":"failed";
 const taskResponse=await rest(`lead_search_tasks?select=status,cost_currency&workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(taskId)}&limit=1`,admin);const taskRows=taskResponse.ok?await taskResponse.json():[];if(taskRows[0]?.status==="cancelled")return;const taskCurrency=String(taskRows[0]?.cost_currency||"USD");const matchingCosts=runs.filter((r:Record<string,unknown>)=>r.cost_currency===taskCurrency&&r.actual_cost!==null);const cost=matchingCosts.reduce((sum:number,r:Record<string,unknown>)=>sum+(Number(r.actual_cost)||0),0);
 const companies=inbox.filter((r:Record<string,unknown>)=>r.record_type==="company"&&r.review_status!=="duplicate").length;
 const contacts=inbox.filter((r:Record<string,unknown>)=>r.record_type==="contact"&&r.review_status!=="duplicate").length;
 const sources=new Set(inbox.map((r:Record<string,unknown>)=>r.source_record_id).filter(Boolean));
 await rest(`lead_search_tasks?workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(taskId)}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status,discovered_count:sources.size,unique_company_count:companies,unique_contact_count:contacts,actual_cost:matchingCosts.length?cost:null,completed_at:pending?null:new Date().toISOString(),updated_at:new Date().toISOString()})});
}
async function processRun(run:Record<string,unknown>,admin:string){
 const workspaceId=String(run.workspace_id);
 if(await taskIsCancelled(String(run.task_id),workspaceId,admin)){await logTask(String(run.task_id),workspaceId,run,'cancelled','任务已取消，Worker 跳过本次执行',admin);await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'cancelled',locked_by:null,lease_expires_at:null,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});return;}await logTask(String(run.task_id),workspaceId,run,'claimed','Worker 已领取任务，正在检查服务商连接与凭证',admin,{attempt:Number(run.attempt_count||0)});const provider=String(run.provider_key) as ProviderKey;const adapter=getProviderAdapter(provider);if(!adapter)throw new Error(`Unsupported provider adapter: ${provider}`);
 const connectionResponse=await rest(`integration_connections?select=secret_ref,status,is_enabled&workspace_id=eq.${encodeURIComponent(workspaceId)}&provider_key=eq.${encodeURIComponent(provider)}&limit=1`,admin);
 if(!connectionResponse.ok)throw new Error("Unable to read provider connection");const connection=(await connectionResponse.json())[0];
 if(!connection?.secret_ref||connection.status!=="connected"||connection.is_enabled!==true)throw new Error("Provider connection is not enabled");
 const credentials=await readSecret(connection.secret_ref,admin);
 const config=obj(run.adapter_config_snapshot);if(run.provider_cursor)config.dataset_id=run.provider_cursor;
 const ctx:AdapterContext={credentials,config,input:obj(run.input_payload),costApproved:obj(run.billing_details).cost_approved===true,maxCost:Number(obj(run.billing_details).max_cost)||undefined};
 const jobId=asText(run.provider_job_id);const now=new Date().toISOString();
 if(!jobId){
  await logTask(String(run.task_id),workspaceId,run,'validating','正在验证 Actor 输入参数与服务商连接',admin);await adapter.validate(ctx);
  await logTask(String(run.task_id),workspaceId,run,'starting','参数验证通过，正在向服务商提交采集任务',admin);const started=await adapter.start(ctx);await logTask(String(run.task_id),workspaceId,run,'submitted','服务商已接收任务',admin,{provider_job_id:started.providerJobId,state:started.state});
  const usage=obj(started.usage);
  if(await taskIsCancelled(String(run.task_id),workspaceId,admin)){await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'cancelled',provider_job_id:started.providerJobId,provider_status:'cancelled',locked_by:null,lease_expires_at:null,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});return;}
  if(started.state==="completed"){
   const items=extractItems(started.raw);const counts=await processItems(run,items,admin);await logTask(String(run.task_id),workspaceId,run,'completed','服务商同步返回结果，已完成线索解析与入库',admin,{item_count:items.length});
   const costValue=usage.cost_usd??(usage.currency?usage.actual_cost??usage.cost:provider==="kuajingmofang"?usage.actual_cost??usage.cost:undefined);const cost=Number(costValue);const costCurrency=String(usage.currency||(usage.cost_usd?"USD":provider==="kuajingmofang"?"CNY":run.cost_currency||"USD"));
   await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"completed",provider_job_id:started.providerJobId,provider_cursor:started.cursor||null,provider_status:"completed",records_found:items.length,completed_at:now,lease_expires_at:null,locked_by:null,usage_metrics:usage,billing_details:{...obj(run.billing_details),usage},actual_cost:Number.isFinite(cost)&&cost>0?cost:null,cost_currency:costCurrency,result_summary:{...counts,item_count:items.length},updated_at:now})});
  }else{
   await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({provider_job_id:started.providerJobId,provider_cursor:started.cursor||null,provider_status:"running",lease_expires_at:new Date(Date.now()+15000).toISOString(),locked_by:null,usage_metrics:usage,billing_details:{...obj(run.billing_details),usage},updated_at:now})});await logTask(String(run.task_id),workspaceId,run,'running','采集任务已启动，等待服务商返回结果',admin,{provider_job_id:started.providerJobId});
  }
  return;
 }
 if(run.provider_status==="completed"||run.provider_status==="fetching"){
  await logTask(String(run.task_id),workspaceId,run,'fetching','正在从服务商数据集中读取结果页',admin,{provider_job_id:jobId});const page=await adapter.fetch(ctx,jobId,asText(run.output_cursor)||null);const counts=await processItems(run,page.items,admin);
  const recordsFound=Number(run.records_found||0)+page.items.length;const usage={...obj(run.usage_metrics),...obj(page.usage)};
  const previousSummary=obj(run.result_summary);const totals={companyCount:Number(previousSummary.companyCount||0)+counts.companyCount,contactCount:Number(previousSummary.contactCount||0)+counts.contactCount,processedCount:Number(previousSummary.processedCount||0)+counts.processedCount,skippedCount:Number(previousSummary.skippedCount||0)+counts.skippedCount};
  const costValue=usage.cost_usd??(usage.currency?usage.actual_cost??usage.cost:undefined);const cost=Number(costValue);const costCurrency=String(usage.currency||(usage.cost_usd?"USD":run.cost_currency||"USD"));
  const hasNext=Boolean(page.nextCursor);
  if(!hasNext){
   if(recordsFound===0)await logTask(String(run.task_id),workspaceId,run,'import_warning','Actor 已完成执行，但结果数据集返回 0 条记录。请检查搜索词是否适合 People / 个人资料搜索（建议使用职业、岗位、行业角色或人群描述；仅填写商品名称可能没有匹配个人资料），并确认地区条件没有过度缩小范围。',admin,{item_count:0,imported_count:0,skipped_count:0,actor_id:run.provider_actor_id,search_queries:obj(run.input_payload).searchQueries||obj(run.input_payload).queries||obj(run.input_payload).keyword||null});
   else if(totals.processedCount===0)await logTask(String(run.task_id),workspaceId,run,'import_warning','服务商返回了 '+recordsFound+' 条数据，但没有任何记录符合公司/联系人线索格式；原始数据已保留在来源记录中，请检查 Actor 输出类型或字段映射。',admin,{item_count:recordsFound,imported_count:0,skipped_count:totals.skippedCount});
   else await logTask(String(run.task_id),workspaceId,run,'completed','结果分页读取完成，已保存 '+recordsFound+' 条原始记录，已写入 '+totals.processedCount+' 条线索记录。',admin,{item_count:recordsFound,imported_count:totals.processedCount,skipped_count:totals.skippedCount});
  }
  await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:hasNext?"running":"completed",provider_status:hasNext?"fetching":"completed",output_cursor:page.nextCursor||null,records_found:recordsFound,completed_at:hasNext?null:now,lease_expires_at:hasNext?new Date(Date.now()+10000).toISOString():null,locked_by:null,last_polled_at:now,usage_metrics:usage,actual_cost:Number.isFinite(cost)&&cost>0?cost:run.actual_cost,cost_currency:costCurrency,result_summary:{...totals,item_count:recordsFound},updated_at:now})});
  return;
 }
 await logTask(String(run.task_id),workspaceId,run,'polling','正在查询服务商任务状态',admin,{provider_job_id:jobId});const polled=await adapter.poll(ctx,jobId);if(await taskIsCancelled(String(run.task_id),workspaceId,admin)){await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'cancelled',locked_by:null,lease_expires_at:null,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});return;}const polledUsage=obj(polled.usage);const mergedPollUsage={...obj(run.usage_metrics),...polledUsage};const pollCostValue=polledUsage.cost_usd??(polledUsage.currency?polledUsage.actual_cost??polledUsage.cost:provider==="kuajingmofang"?polledUsage.actual_cost??polledUsage.cost:undefined);const pollCost=Number(pollCostValue);const pollCurrency=String(polledUsage.currency||(polledUsage.cost_usd?"USD":provider==="kuajingmofang"?"CNY":run.cost_currency||"USD"));
 if(polled.state==="failed")throw new Error(`Provider job failed: ${JSON.stringify(polled.raw).slice(0,1000)}`);if(polled.state==='completed')await logTask(String(run.task_id),workspaceId,run,'provider_completed','服务商报告采集完成，正在获取结果数据',admin,{provider_job_id:jobId});
 if(polled.state==="completed"&&provider==="texau"){
  const items=extractItems(polled.raw);const counts=await processItems(run,items,admin);await logTask(String(run.task_id),workspaceId,run,'completed','服务商任务完成，线索已解析并写入待审核队列',admin,{item_count:items.length});
  await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"completed",provider_status:"completed",records_found:items.length,completed_at:now,lease_expires_at:null,locked_by:null,last_polled_at:now,usage_metrics:mergedPollUsage,billing_details:{...obj(run.billing_details),usage:mergedPollUsage},actual_cost:Number.isFinite(pollCost)&&pollCost>0?pollCost:run.actual_cost,cost_currency:pollCurrency,result_summary:{...counts,item_count:items.length},updated_at:now})});
  return;
 }
 await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({provider_status:polled.state==="completed"?"completed":"running",usage_metrics:mergedPollUsage,billing_details:{...obj(run.billing_details),usage:mergedPollUsage},actual_cost:Number.isFinite(pollCost)&&pollCost>0?pollCost:run.actual_cost,cost_currency:pollCurrency,lease_expires_at:new Date(Date.now()+(polled.retryAfterSeconds||15)*1000).toISOString(),locked_by:null,last_polled_at:now,updated_at:now})});
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 try{
  const admin=serviceKey();if(!admin)return new Response("Worker is not configured",{status:500});const supplied=req.headers.get("x-worker-secret");const secretResponse=await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:WORKER_SECRET_ID})});if(!secretResponse.ok)return new Response("Worker secret unavailable",{status:500});const expected=await secretResponse.json();if(typeof expected!=="string"||!supplied||supplied!==expected)return new Response("Unauthorized",{status:401});
  const body=await req.json().catch(()=>({}));const limit=Math.min(50,Math.max(1,Number(body.limit)||10));const workerId=String(body.worker_id||crypto.randomUUID());
  const claim=await rest("rpc/claim_lead_task_runs",admin,{method:"POST",body:JSON.stringify({p_limit:limit,p_worker_id:workerId})});if(!claim.ok)throw new Error("Unable to claim lead task runs");
  const runs=await claim.json();let completed=0;let errors=0;
  for(const run of runs){
   try{await processRun(run,admin);await updateTaskSummary(String(run.task_id),String(run.workspace_id),admin);completed++;}
   catch(error){
    const message=error instanceof Error?error.message:"Unknown provider adapter error";const retryable=retryableError(message);const attempts=Number(run.attempt_count||0);const max=Number(run.max_attempts||3);const canRetry=retryable&&attempts<max;const delay=Math.min(900,30*Math.pow(2,Math.max(0,attempts-1)));const nextRetry=new Date(Date.now()+delay*1000).toISOString();
    await rest(`lead_task_runs?id=eq.${encodeURIComponent(String(run.id))}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:canRetry?"queued":"failed",error_message:message.slice(0,2000),retryable, next_retry_at:canRetry?nextRetry:null,lease_expires_at:null,locked_by:null,completed_at:canRetry?null:new Date().toISOString(),updated_at:new Date().toISOString()})});
    await logTask(String(run.task_id),String(run.workspace_id),run,'failed','任务执行失败：'+message,admin,{retryable,attempt:attempts+1});await updateTaskSummary(String(run.task_id),String(run.workspace_id),admin);errors++;
   }
  }
  return new Response(JSON.stringify({ok:true,worker_id:workerId,claimed:runs.length,processed:completed,errors}),{headers:{"Content-Type":"application/json"}});
 }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:"Worker error"}),{status:500,headers:{"Content-Type":"application/json"}});}
});
