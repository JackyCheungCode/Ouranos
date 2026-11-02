import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders={"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info, x-supabase-api-version","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
const obj=(value:unknown)=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();
  if(!authorization||!url||!anon||!admin)return json({error:"Server authentication configuration missing"},401,origin);
  const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});
  if(!userResponse.ok)return json({error:"Invalid session"},401,origin);
  const user=await userResponse.json();
  const body=await req.json();
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
  const now=new Date().toISOString();const capabilities=obj(catalog.capabilities);
  let update:Record<string,unknown>;
  if(action==="approve"){
   const types=Array.isArray(body.supported_record_types)?body.supported_record_types.filter((value:unknown)=>value==="company"||value==="contact"):[];
   const note=String(body.review_note||"").trim();
   if(!types.length)return json({error:"至少确认一种客户档案类型：企业或联系人"},422,origin);
   if(note.length<12)return json({error:"请简要记录你检查过的真实返回样本及客户字段（至少 12 个字符）"},422,origin);
   update={supported_record_types:types,verification_status:"verified",maintenance_status:"maintained",is_active:true,capabilities:{...capabilities,output_review:{workspace_id:workspaceId,reviewed_by:user.id,reviewed_at:now,review_note:note,actor_version:expectedVersion}},updated_at:now};
  }else{
   update={supported_record_types:[],verification_status:"restricted",maintenance_status:"needs_review",is_active:false,capabilities:{...capabilities,output_review:{workspace_id:workspaceId,reviewed_by:user.id,reviewed_at:now,review_note:String(body.review_note||"").trim(),actor_version:expectedVersion}},updated_at:now};
  }
  const saved=await rest(`discovery_adapter_catalog?adapter_key=eq.${encodeURIComponent(adapterKey)}`,admin,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(update)});
  if(!saved.ok){const detail=await saved.text();return json({error:"Unable to save Actor review",details:detail.slice(0,800)},500,origin);}
  const rows=await saved.json();const result=rows[0]||update;
  return json({ok:true,adapter_key:adapterKey,verification_status:result.verification_status,maintenance_status:result.maintenance_status,is_active:result.is_active,supported_record_types:result.supported_record_types},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected Actor review error"},500,req.headers.get("origin"));}
});
