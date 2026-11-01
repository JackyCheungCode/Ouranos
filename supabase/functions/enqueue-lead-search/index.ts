import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders={"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b3.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
function getPath(source:Record<string,unknown>,path:string){return path.split(".").reduce<unknown>((value,key)=>value&&typeof value==="object"?(value as Record<string,unknown>)[key]:undefined,source);}
async function hash(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();
  if(!authorization||!url||!anon||!admin)return json({error:"Server authentication configuration missing"},401,origin);
  const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});if(!userResponse.ok)return json({error:"Invalid session"},401,origin);const user=await userResponse.json();
  const body=await req.json();const workspaceId=String(body.workspace_id||"");const taskId=String(body.task_id||"");
  if(!workspaceId||!taskId||body.confirm_cost!==true)return json({error:"请确认服务商可能产生的费用，并提供 workspace_id 和 task_id"},400,origin);
  const member=await rest(`workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,admin);if(!member.ok)return json({error:"Unable to verify workspace membership"},500,origin);
  const members=await member.json();let owner=false;if(!members.length){const r=await rest(`workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,admin);if(r.ok)owner=(await r.json()).length>0;}if(!members.length&&!owner)return json({error:"Workspace access denied"},403,origin);
  const taskResponse=await rest(`lead_search_tasks?select=id,name,status,target_profile,selected_channels,target_count,workspace_id&workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(taskId)}&limit=1`,admin);if(!taskResponse.ok)return json({error:"Unable to load search task"},500,origin);
  const taskRows=await taskResponse.json();const task=taskRows[0];if(!task)return json({error:"Search task not found"},404,origin);
  if(task.status!=="draft")return json({error:`任务状态为 ${task.status}，只有草稿任务可以启动`},409,origin);
  const selectedChannels=Array.isArray(task.selected_channels)?task.selected_channels as string[]:[];
  if(!selectedChannels.length)return json({error:"该任务没有选择搜索渠道"},400,origin);
  const selectionsResponse=await rest(`workspace_adapter_selections?select=id,adapter_key,channel_key,config,is_enabled,priority&workspace_id=eq.${encodeURIComponent(workspaceId)}&is_enabled=eq.true&order=priority.asc`,admin);
  if(!selectionsResponse.ok)return json({error:"Unable to read enabled channel adapters"},500,origin);
  const allSelections=await selectionsResponse.json();const selections=allSelections.filter((s:Record<string,unknown>)=>selectedChannels.includes(String(s.channel_key)));
  const missing=selectedChannels.filter(channel=>!selections.some((s:Record<string,unknown>)=>s.channel_key===channel));
  if(missing.length)return json({error:"以下渠道尚未配置并启用可执行适配器",missing_channels:missing},409,origin);
  if(!selections.length)return json({error:"没有已启用的渠道适配器"},409,origin);
  const connectionResponse=await rest(`integration_connections?select=provider_key,status,is_enabled&workspace_id=eq.${encodeURIComponent(workspaceId)}`,admin);if(!connectionResponse.ok)return json({error:"Unable to read provider connections"},500,origin);
  const connections=await connectionResponse.json();const connectionMap=new Map(connections.map((x:Record<string,unknown>)=>[String(x.provider_key),x]));
  const profile=(task.target_profile||{}) as Record<string,unknown>;
  const countries=Array.isArray(profile.countries)?profile.countries as Record<string,unknown>[]:[];
  const searchProfile:Record<string,unknown>={...profile,country_names:countries.map(x=>String(x.name||"")).filter(Boolean),country_codes:countries.map(x=>String(x.code||"")).filter(Boolean),countries_text:countries.map(x=>String(x.name||"")).filter(Boolean).join(", "),target_count:task.target_count};
  const runPayloads:Record<string,unknown>[]=[];
  for(const selection of selections){
    const adapterResponse=await rest(`discovery_adapter_catalog?select=provider_key,channel_key,adapter_key,adapter_name,adapter_version,provider_product_type,external_actor_id,supported_record_types,execution_mode,input_schema,output_schema,field_mapping,capabilities,pricing_model,max_concurrency,is_active,verification_status&adapter_key=eq.${encodeURIComponent(String(selection.adapter_key))}&limit=1`,admin);
    if(!adapterResponse.ok)return json({error:`Unable to load adapter ${selection.adapter_key}`},500,origin);
    const catalog=(await adapterResponse.json())[0];if(!catalog||!catalog.is_active)return json({error:`适配器 ${selection.adapter_key} 尚未启用`},409,origin);
    const connection=connectionMap.get(String(catalog.provider_key)) as Record<string,unknown>|undefined;
    if(!connection||connection.status!=="connected"||connection.is_enabled!==true)return json({error:`请先连接并启用服务商：${catalog.provider_key}`},409,origin);
    const config=(selection.config||{}) as Record<string,unknown>;const defaults=(config.input_defaults||{}) as Record<string,unknown>;const mapping=(config.input_mapping||{}) as Record<string,string>;const outputMapping=(config.field_mapping||catalog.field_mapping||{}) as Record<string,unknown>;if(!outputMapping.company_name&&!outputMapping.contact_name)return json({error:`渠道 ${selection.channel_key} 尚未映射企业名称或联系人姓名`,adapter_key:selection.adapter_key},422,origin);
    const input:Record<string,unknown>={...defaults};
    for(const [inputField,profilePath] of Object.entries(mapping)){const value=getPath(searchProfile,profilePath);if(value!==undefined&&value!==null&&value!=="")input[inputField]=value;}
    const schema=(catalog.input_schema||{}) as Record<string,unknown>;const required=Array.isArray(schema.required)?schema.required as string[]:[];
    const missingFields=required.filter(field=>input[field]===undefined||input[field]===null||input[field]==="");
    if(missingFields.length)return json({error:`渠道 ${selection.channel_key} 的 Actor 缺少必填参数`,adapter_key:selection.adapter_key,missing_input_fields:missingFields},422,origin);
    const pricing=(catalog.pricing_model||{}) as Record<string,unknown>;const maxCost=Number(config.max_cost||0);
    if(catalog.provider_key==="kuajingmofang"&&maxCost<=0)return json({error:"跨境魔方按接口计费，请先为该适配器设置单次费用上限（人民币）"},409,origin);
    const estimated=typeof pricing.estimated_cost==="number"?pricing.estimated_cost:typeof pricing.price_per_call==="number"?pricing.price_per_call:null;
    if(estimated!==null&&maxCost>0&&estimated>maxCost)return json({error:`适配器预计费用超过单次费用上限：${catalog.adapter_key}`},409,origin);
    const configSnapshot={...config,external_actor_id:catalog.external_actor_id,provider_product_type:catalog.provider_product_type,execution_mode:catalog.execution_mode,input_schema:catalog.input_schema,output_schema:catalog.output_schema,pricing_model:catalog.pricing_model,capabilities:catalog.capabilities};
    const inputString=JSON.stringify(input);const idem=await hash(`${workspaceId}|${taskId}|${catalog.adapter_key}|${inputString}`);
    runPayloads.push({workspace_id:workspaceId,task_id:taskId,provider_key:catalog.provider_key,channel_key:catalog.channel_key,status:"queued",adapter_key:catalog.adapter_key,adapter_version:catalog.adapter_version,provider_actor_id:catalog.external_actor_id,adapter_config_snapshot:configSnapshot,input_payload:input,field_mapping_snapshot:outputMapping,attempt_count:0,max_attempts:3,idempotency_key:idem,estimated_cost:estimated,cost_currency:String(pricing.currency||"USD"),cost_estimate_source:estimated===null?"provider_usage":"adapter_pricing_model",billing_details:{pricing_model:pricing,cost_approved:true,max_cost:maxCost||null,currency:String(pricing.currency||"USD"),estimate_status:estimated===null?"unknown":"estimated"}});
  }
  const insert=await rest("lead_task_runs?on_conflict=workspace_id,idempotency_key",admin,{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=representation"},body:JSON.stringify(runPayloads)});if(!insert.ok){const text=await insert.text();return json({error:"Unable to enqueue adapter runs",details:text.slice(0,1000)},500,origin);}
  const created=await insert.json();const update=await rest(`lead_search_tasks?workspace_id=eq.${encodeURIComponent(workspaceId)}&id=eq.${encodeURIComponent(taskId)}`,admin,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"queued",cost_approved:true,cost_approved_at:new Date().toISOString(),cost_approved_by:user.id,updated_at:new Date().toISOString()})});if(!update.ok)return json({error:"Runs queued but task status could not be updated"},500,origin);
  let workerStarted=false;
  try{
   const workerSecretResponse=await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:"8052bb93-5044-4e23-a0ac-481bfb7fbadf"})});
   if(workerSecretResponse.ok){const workerSecret=await workerSecretResponse.json();const workerResponse=await fetch(`${url}/functions/v1/discovery-worker`,{method:"POST",headers:{"Content-Type":"application/json","x-worker-secret":String(workerSecret)},body:JSON.stringify({limit:10})});workerStarted=workerResponse.ok;}
  }catch{/* The scheduled worker will pick up queued runs. */}
  return json({ok:true,task_id:taskId,queued_runs:Array.isArray(created)?created.length:0,worker_started:workerStarted,adapters:runPayloads.map(r=>({provider_key:r.provider_key,channel_key:r.channel_key,adapter_key:r.adapter_key})),message:"搜索任务已进入队列。只有启用的渠道适配器会被执行。"},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected task enqueue error"},500,req.headers.get("origin"));}
});
