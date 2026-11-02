import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders={"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b3.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string,init:RequestInit={}){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL missing");const headers=new Headers(init.headers);headers.set("apikey",key);headers.set("Authorization",`Bearer ${key}`);headers.set("Content-Type","application/json");return fetch(`${url}/rest/v1/${path}`,{...init,headers});}
const obj=(v:unknown)=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
function credentialKey(value:unknown){let parsed:unknown=value; if(typeof value==="string"){try{parsed=JSON.parse(value)}catch{}}const record=obj(parsed);return String(record.api_key||parsed||"");}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();
  if(!authorization||!url||!anon||!admin)return json({error:"Server authentication configuration missing"},401,origin);
  const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});if(!userResponse.ok)return json({error:"Invalid session"},401,origin);const user=await userResponse.json();
  const body=await req.json();const workspaceId=String(body.workspace_id||"");const action=String(body.action||"");
  if(!workspaceId||action!=="brightdata_datasets")return json({error:"workspace_id and supported action are required"},400,origin);
  const membership=await rest(`workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,admin);if(!membership.ok)return json({error:"Unable to verify workspace membership"},500,origin);
  const members=await membership.json();let owner=members.some((row:Record<string,unknown>)=>row.role==="owner");if(!members.length){const check=await rest(`workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,admin);if(check.ok)owner=(await check.json()).length>0;}if(!members.length&&!owner)return json({error:"Workspace access denied"},403,origin);
  const connection=await rest(`integration_connections?select=secret_ref,status,is_enabled&workspace_id=eq.${encodeURIComponent(workspaceId)}&provider_key=eq.brightdata&limit=1`,admin);if(!connection.ok)return json({error:"Unable to read Bright Data connection"},500,origin);
  const row=(await connection.json())[0];if(!row?.secret_ref||row.status!=="connected"||row.is_enabled!==true)return json({error:"请先连接并启用 Bright Data"},409,origin);
  const secret=await rest("rpc/integration_secret_read",admin,{method:"POST",body:JSON.stringify({p_secret_id:row.secret_ref})});if(!secret.ok)return json({error:"Unable to read Bright Data credential"},500,origin);
  const token=credentialKey(await secret.json());if(!token)return json({error:"Bright Data API Key is missing"},500,origin);
  const response=await fetch("https://api.brightdata.com/datasets",{headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},signal:AbortSignal.timeout(30000)});
  const raw=await response.text();let payload:unknown;try{payload=raw?JSON.parse(raw):[]}catch{payload=[]}
  if(!response.ok)return json({error:`Bright Data Dataset API returned HTTP ${response.status}`,detail:raw.slice(0,600)},400,origin);
  const root=obj(payload);const rows=Array.isArray(payload)?payload:Array.isArray(root.datasets)?root.datasets:Array.isArray(root.data)?root.data:Array.isArray(root.items)?root.items:[];
  const items=rows.map((item:unknown)=>{const dataset=obj(item);const id=String(dataset.dataset_id||dataset.id||dataset.datasetId||"");const schema=obj(dataset.input_schema||dataset.inputSchema||dataset.inputSchemaJson);return {id,name:String(dataset.name||dataset.title||dataset.dataset_name||id),description:String(dataset.description||dataset.summary||""),input_schema:Object.keys(schema).length?schema:null};}).filter((item:Record<string,unknown>)=>Boolean(item.id));
  return json({ok:true,items,total:items.length},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected provider catalog error"},500,req.headers.get("origin"));}
});
