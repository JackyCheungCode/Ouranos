import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders={"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info, x-supabase-api-version","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b3.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();
  if(!authorization||!url||!anon||!admin)return json({error:"Server authentication configuration missing"},401,origin);
  const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});if(!userResponse.ok)return json({error:"Invalid session"},401,origin);const user=await userResponse.json();
  const body=await req.json();const workspaceId=String(body.workspace_id||"");const action=String(body.action||"schema");const actorId=String(body.actor_id||"").trim();const channelKey=String(body.channel_key||"").toLowerCase();const searchQuery=String(body.search_query||"").trim();const supported=Array.isArray(body.supported_record_types)?body.supported_record_types.filter((x:unknown)=>x==="company"||x==="contact"):[];
  if(!workspaceId||!["schema","search","test"].includes(action)||!((action==="search"&&searchQuery.length>=2&&searchQuery.length<=160)||(action!=="search"&&actorId.length>0&&actorId.length<=200))||!/^[a-z0-9-]{2,64}$/.test(channelKey))return json({error:"workspace_id, valid action, channel_key and actor_id/search_query are required"},400,origin);
  const member=await rest(`workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,admin);if(!member.ok)return json({error:"Unable to verify workspace membership"},500,origin);
  const members=await member.json();let owner=false;if(!members.length){const r=await rest(`workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,admin);if(r.ok)owner=(await r.json()).length>0;}if(!members.length&&!owner)return json({error:"Workspace access denied"},403,origin);
  const conn=await rest(`integration_connections?select=secret_ref,status,is_enabled&workspace_id=eq.${encodeURIComponent(workspaceId)}&provider_key=eq.apify&limit=1`,admin);if(!conn.ok)return json({error:"Unable to read Apify connection"},500,origin);
  const connection=(await conn.json())[0];if(!connection?.secret_ref||connection.status!=="connected"||!connection.is_enabled)return json({error:"请先在系统集成中保存并成功测试 Apify API Key"},409,origin);
  const secretResponse=await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:connection.secret_ref})});if(!secretResponse.ok)return json({error:"Unable to read Apify token from Vault"},500,origin);
  const secret=await secretResponse.json();let credentials:Record<string,unknown>={api_key:secret};try{const parsed=JSON.parse(String(secret));if(parsed&&typeof parsed==="object")credentials=parsed;}catch{}const apiKey=String(credentials.api_key||"");if(!apiKey)return json({error:"Apify credential payload is invalid"},500,origin);
  const headers={Authorization:`Bearer ${apiKey}`,Accept:"application/json"};const signal=AbortSignal.timeout(60000);
  if(action==="search"){
   const storeUrl=new URL("https://api.apify.com/v2/store");storeUrl.searchParams.set("search",searchQuery);storeUrl.searchParams.set("limit","20");storeUrl.searchParams.set("sortBy","popularity");storeUrl.searchParams.set("responseFormat","full");
   const storeResponse=await fetch(storeUrl.toString(),{headers,signal});if(!storeResponse.ok)return json({error:`Apify Store 搜索失败（HTTP ${storeResponse.status}）`},400,origin);
   const storeBody=await storeResponse.json();const items=(storeBody.data?.items||[]).map((item:Record<string,unknown>)=>({id:String(item.username&&item.name?`${item.username}~${item.name}`:item.id||""),name:String(item.title||item.name||item.id||"Unnamed Actor"),username:String(item.username||""),description:String(item.description||""),url:String(item.url||""),stats:item.stats||{},pricingInfo:item.currentPricingInfo||item.pricingInfo||null})).filter((item:Record<string,unknown>)=>Boolean(item.id));
   return json({ok:true,items,total:storeBody.data?.total||items.length},200,origin);
  }
  if(action==="test"){
   const input=body.test_input&&typeof body.test_input==="object"&&!Array.isArray(body.test_input)?body.test_input:{};
   const runResponse=await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=60`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(input),signal});
   if(!runResponse.ok){const detail=await runResponse.text();return json({error:`Actor 测试启动失败（HTTP ${runResponse.status}）：${detail.slice(0,500)}`},400,origin);}
   const runBody=await runResponse.json();const run=runBody.data||runBody;let sample:unknown[]=[];
   if(run.defaultDatasetId){const datasetResponse=await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?limit=5&clean=true&format=json`,{headers,signal});if(datasetResponse.ok){const data=await datasetResponse.json();sample=Array.isArray(data)?data:[];}}
   return json({ok:true,run_id:run.id||null,status:run.status||"UNKNOWN",actor_id:actorId,default_dataset_id:run.defaultDatasetId||null,items_count:run.stats?.computeUnits??null,sample},200,origin);
  }
  const actorResponse=await fetch(`https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}`,{headers,signal});if(!actorResponse.ok){const msg=actorResponse.status===401?"Apify API Key 无效":actorResponse.status===404?"找不到该 Actor，请检查 Actor ID 或账户权限":`Apify Actor 查询失败（HTTP ${actorResponse.status}）`;return json({error:msg,status_code:actorResponse.status},400,origin);}
  const actorBody=await actorResponse.json();const actor=actorBody.data||actorBody;
  const buildResponse=await fetch(`https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/builds/default`,{headers,signal});if(!buildResponse.ok)return json({error:`无法读取 Actor 最新构建（HTTP ${buildResponse.status}）`},400,origin);
  const buildBody=await buildResponse.json();const build=buildBody.data||buildBody;
  let inputSchema=build.actorDefinition?.input||build.input||null;if(!inputSchema&&typeof build.inputSchema==="string"){try{inputSchema=JSON.parse(build.inputSchema)}catch{}}
  const outputSchema=build.actorDefinition?.output||build.actorDefinition?.storages?.dataset||build.storages?.dataset||{};
  if(!inputSchema||typeof inputSchema!=="object")return json({error:"该 Actor 没有可读取的 input schema，暂不能自动生成配置表单"},422,origin);
  const adapterKey=`apify-${channelKey}-${actorId.toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,110)}`;
  const adapterName=String(actor.title||actor.name||actorId).slice(0,160);
  const version=String(build.buildNumber||build.versionNumber||"latest");
  const existingResponse=await rest(`discovery_adapter_catalog?select=adapter_version,verification_status,maintenance_status,is_active,supported_record_types&adapter_key=eq.${encodeURIComponent(adapterKey)}&limit=1`,admin);if(!existingResponse.ok)return json({error:"Unable to inspect existing Actor review status"},500,origin);
  const existing=(await existingResponse.json())[0];const sameBuild=Boolean(existing&&String(existing.adapter_version)===version);
  const verificationStatus=sameBuild?String(existing.verification_status||"unverified"):"unverified";
  const maintenanceStatus=sameBuild?String(existing.maintenance_status||"unmaintained"):existing?"needs_review":"unmaintained";
  const activeStatus=sameBuild?existing.is_active===true:false;
  const approvedRecordTypes=sameBuild&&Array.isArray(existing.supported_record_types)?existing.supported_record_types:supported;
  const catalogPayload={provider_key:"apify",channel_key:channelKey,adapter_key:adapterKey,adapter_name:adapterName,adapter_version:version,provider_product_type:"actor",external_actor_id:actorId,supported_record_types:approvedRecordTypes,execution_mode:"async",input_schema:inputSchema,output_schema:outputSchema,field_mapping:{},capabilities:{actor_name:actor.name||null,actor_username:actor.username||null,actor_title:actor.title||null,actor_url:actor.username&&actor.name?`https://apify.com/${actor.username}/${actor.name}`:null,is_public:actor.isPublic??null,latest_build:version,schema_synced_at:new Date().toISOString()},pricing_model:actor.currentPricingInfo||actor.pricingInfos||actor.pricingInfo||{},max_concurrency:1,verification_status:verificationStatus,maintenance_status:maintenanceStatus,docs_url:actor.username&&actor.name?`https://apify.com/${actor.username}/${actor.name}`:null,is_active:activeStatus,updated_at:new Date().toISOString()};
  const upsert=await rest("discovery_adapter_catalog?on_conflict=provider_key,channel_key,adapter_key",admin,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(catalogPayload)});if(!upsert.ok)return json({error:"Actor schema fetched but adapter catalog could not be saved"},500,origin);
  const selectionPayload:Record<string,unknown>={workspace_id:workspaceId,adapter_key:adapterKey,channel_key:channelKey,is_enabled:false,priority:100,created_by:user.id,updated_at:new Date().toISOString()};
  if(body.field_mapping&&typeof body.field_mapping==="object")selectionPayload.config={field_mapping:body.field_mapping};
  const selection=await rest("workspace_adapter_selections?on_conflict=workspace_id,adapter_key",admin,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(selectionPayload)});if(!selection.ok)return json({error:"Actor schema saved but workspace selection could not be created"},500,origin);
  return json({ok:true,adapter_key:adapterKey,actor_id:actorId,actor_name:adapterName,version,input_schema:inputSchema,output_schema:outputSchema,enabled:false,verification_status:verificationStatus,maintenance_status:maintenanceStatus,supported_record_types:approvedRecordTypes},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected Actor schema sync error"},500,req.headers.get("origin"));}
});
