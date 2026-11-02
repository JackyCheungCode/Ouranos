import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders={"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info, x-supabase-api-version","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b3.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
const obj=(value:unknown)=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
function apiKeyFromSecret(secret:unknown){let value=String(secret??"");try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==="object")value=String((parsed as Record<string,unknown>).api_key||"");}catch{}return value;}
function recordFields(items:unknown[]){return items.flatMap(item=>Object.keys(obj(item)));}
function hasCompanyRecord(item:unknown){const row=obj(item);const keys=Object.keys(row);const hasName=keys.some(key=>/^(companyname|businessname|organization|organisation|company|business|title)$/i.test(key))||("name" in row);const hasDetail=keys.some(key=>/(website|homepage|domain|email|phone|telephone|address|street|city|linkedinurl)/i.test(key));return hasName&&hasDetail;}
function hasContactRecord(item:unknown){const row=obj(item);const keys=Object.keys(row);const hasName=keys.some(key=>/(fullname|contactname|personname|firstname|lastname)/i.test(key))||("name" in row);const hasDetail=keys.some(key=>/(email|phone|telephone|mobile|jobtitle|position|designation|linkedinurl)/i.test(key));return hasName&&hasDetail;}
async function verifySample(workspaceId:string,adapterKey:string,expectedVersion:string,runId:string,admin:string){
 const connectionResponse=await rest(`integration_connections?select=secret_ref,status,is_enabled&workspace_id=eq.${encodeURIComponent(workspaceId)}&provider_key=eq.apify&limit=1`,admin);
 if(!connectionResponse.ok)throw new Error("Unable to load Apify connection");
 const connection=(await connectionResponse.json())[0];
 if(!connection?.secret_ref||connection.status!=="connected"||connection.is_enabled!==true)throw new Error("请先连接并启用 Apify 服务");
 const secretResponse=await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:connection.secret_ref})});
 if(!secretResponse.ok)throw new Error("Unable to read Apify credential");
 const token=apiKeyFromSecret(await secretResponse.json());if(!token)throw new Error("Apify credential is invalid");
 const lookup=await rest(`discovery_adapter_catalog?select=external_actor_id,adapter_version&adapter_key=eq.${encodeURIComponent(adapterKey)}&limit=1`,admin);
 if(!lookup.ok)throw new Error("Unable to load Actor metadata");
 const catalog=(await lookup.json())[0];if(!catalog)throw new Error("Actor catalog entry not found");
 if(String(catalog.adapter_version)!==expectedVersion)throw new Error("Actor build changed; refresh Schema and retry review");
 const headers={Authorization:`Bearer ${token}`,Accept:"application/json"};const signal=AbortSignal.timeout(20000);
 const runResponse=await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`,{headers,signal});
 if(!runResponse.ok)throw new Error(`Apify run ID 无效或不可访问（HTTP ${runResponse.status}）`);
 const runBody=await runResponse.json();const run=obj(runBody.data||runBody);
 const runActor=String(run.actId||run.actorId||"");if(runActor!==String(catalog.external_actor_id))throw new Error("该 Run 不属于当前 Actor，不能用于审核");
 if(String(run.status)!=="SUCCEEDED")throw new Error(`样本 Run 尚未成功完成（当前状态：${String(run.status||"unknown")}）`);
 const buildResponse=await fetch(`https://api.apify.com/v2/actors/${encodeURIComponent(String(catalog.external_actor_id))}/builds/default`,{headers,signal});
 if(!buildResponse.ok)throw new Error("无法确认 Actor 当前最新 Build");
 const buildBody=await buildResponse.json();const build=obj(buildBody.data||buildBody);
 if(!run.buildId||!build.id||String(run.buildId)!==String(build.id))throw new Error("样本 Run 并非使用当前最新 Build，请重新运行当前版本后再审核");
 const currentBuild=String(build.buildNumber||build.versionNumber||"latest");
 if(currentBuild!==expectedVersion)throw new Error("Actor 最新 Build 已变化，请重新读取 Schema");
 const datasetId=String(run.defaultDatasetId||run.defaultDataset?.id||"");if(!datasetId)throw new Error("该 Run 没有关联结果数据集");
 const dataResponse=await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?limit=10&clean=true`,{headers,signal});
 if(!dataResponse.ok)throw new Error("无法读取 Actor 样本数据集");
 const sample=await dataResponse.json();if(!Array.isArray(sample)||sample.length===0)throw new Error("Actor 样本数据集为空");
 return {sample_count:sample.length,fields:[...new Set(recordFields(sample))].slice(0,80),company_count:sample.filter(hasCompanyRecord).length,contact_count:sample.filter(hasContactRecord).length};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();
  if(!authorization||!url||!anon||!admin)return json({error:"Server authentication configuration missing"},401,origin);
  const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});
  if(!userResponse.ok)return json({error:"Invalid session"},401,origin);
  const user=await userResponse.json();const body=await req.json();
  const workspaceId=String(body.workspace_id||"");const adapterKey=String(body.adapter_key||"");const expectedVersion=String(body.expected_version||"");const action=String(body.action||"");
  if(!workspaceId||!adapterKey||!expectedVersion||!["approve","reject"].includes(action))return json({error:"workspace_id, adapter_key, expected_version and a valid action are required"},400,origin);
  const membership=await rest(`workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,admin);
  if(!membership.ok)return json({error:"Unable to verify workspace membership"},500,origin);
  const memberships=await membership.json();let isOwner=memberships.some((row:Record<string,unknown>)=>row.role==="owner");
  if(!isOwner){const ownerResponse=await rest(`workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,admin);if(ownerResponse.ok)isOwner=(await ownerResponse.json()).length>0;}
  if(!isOwner)return json({error:"只有工作空间所有者可以审核并启用全局 Actor 数据源"},403,origin);
  const lookup=await rest(`discovery_adapter_catalog?select=provider_key,adapter_version,verification_status,maintenance_status,is_active,supported_record_types,capabilities&adapter_key=eq.${encodeURIComponent(adapterKey)}&limit=1`,admin);
  if(!lookup.ok)return json({error:"Unable to load Actor catalog record"},500,origin);
  const catalog=(await lookup.json())[0];
  if(!catalog||catalog.provider_key!=="apify")return json({error:"Only an existing Apify Actor can be reviewed here"},404,origin);
  if(String(catalog.adapter_version)!==expectedVersion)return json({error:"Actor build has changed. Refresh its Schema and review the latest build again.",current_version:catalog.adapter_version},409,origin);
  const now=new Date().toISOString();const capabilities=obj(catalog.capabilities);let update:Record<string,unknown>;let sampleDetails:Record<string,unknown>|null=null;
  if(action==="approve"){
   const types=Array.isArray(body.supported_record_types)?body.supported_record_types.filter((value:unknown)=>value==="company"||value==="contact"):[];
   const note=String(body.review_note||"").trim();const runId=String(body.sample_run_id||"").trim();
   if(!types.length)return json({error:"至少确认一种客户档案类型：企业或联系人"},422,origin);
   if(note.length<12)return json({error:"请简要记录你检查过的真实返回样本及客户字段（至少 12 个字符）"},422,origin);
   if(!runId||runId.length>128)return json({error:"必须提供该 Actor 当前 Build 的成功样本 Run ID"},422,origin);
   sampleDetails=await verifySample(workspaceId,adapterKey,expectedVersion,runId,admin);
   const hasCompany=Number(sampleDetails.company_count)>0;const hasContact=Number(sampleDetails.contact_count)>0;
   if(types.includes("company")&&!hasCompany)return json({error:"真实样本中未识别到企业档案（需要企业名称及官网、地址、电话或邮箱等至少一项）",sample:sampleDetails},422,origin);
   if(types.includes("contact")&&!hasContact)return json({error:"真实样本中未识别到联系人档案（需要联系人姓名及邮箱、电话或职位等至少一项）",sample:sampleDetails},422,origin);
   update={supported_record_types:types,verification_status:"verified",maintenance_status:"maintained",is_active:true,capabilities:{...capabilities,output_review:{workspace_id:workspaceId,reviewed_by:user.id,reviewed_at:now,review_note:note,actor_version:expectedVersion,sample_run_id:runId,sample_details:sampleDetails}},updated_at:now};
  }else{
   update={supported_record_types:[],verification_status:"restricted",maintenance_status:"needs_review",is_active:false,capabilities:{...capabilities,output_review:{workspace_id:workspaceId,reviewed_by:user.id,reviewed_at:now,review_note:String(body.review_note||"").trim(),actor_version:expectedVersion}},updated_at:now};
  }
  const saved=await rest(`discovery_adapter_catalog?adapter_key=eq.${encodeURIComponent(adapterKey)}`,admin,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(update)});
  if(!saved.ok){const detail=await saved.text();return json({error:"Unable to save Actor review",details:detail.slice(0,800)},500,origin);}
  const rows=await saved.json();const result=rows[0]||update;
  return json({ok:true,adapter_key:adapterKey,verification_status:result.verification_status,maintenance_status:result.maintenance_status,is_active:result.is_active,supported_record_types:result.supported_record_types,sample:sampleDetails},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected Actor review error"},500,req.headers.get("origin"));}
});
