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
  const body=await req.json();const workspaceId=String(body.workspace_id||"");const action=String(body.action||"save");
  if(!workspaceId||!["save","delete"].includes(action))return json({error:"workspace_id and valid action are required"},400,origin);
  const member=await rest(`workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,admin);if(!member.ok)return json({error:"Unable to verify workspace membership"},500,origin);
  const members=await member.json();let owner=false;if(!members.length){const r=await rest(`workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,admin);if(r.ok)owner=(await r.json()).length>0;}if(!members.length&&!owner)return json({error:"Workspace access denied"},403,origin);
  if(action==="save"){
   const secret=String(body.secret||"").trim();if(secret.length<20||secret.length>20000)return json({error:"Cookie 内容长度无效，请检查是否完整复制"},400,origin);
   if(!/c_user\s*=/.test(secret)||!/(^|[;\s])xs\s*=/.test(secret))return json({error:"Cookie 至少需要包含 c_user 和 xs 两项"},400,origin);
   const saved=await rest("rpc/integration_secret_create",admin,{method:"POST",body:JSON.stringify({p_secret:secret,p_name:`Facebook Actor Cookie ${workspaceId.slice(0,8)}`,p_description:`One-time Facebook Actor credential for workspace ${workspaceId}; created by ${user.id}`})});
   if(!saved.ok)return json({error:"Cookie 加密保存失败"},500,origin);const secretRef=await saved.json();if(typeof secretRef!=="string")return json({error:"Vault did not return a secret reference"},500,origin);
   return json({ok:true,secret_ref:secretRef,message:"Cookie 已加密保存"},200,origin);
  }
  const secretRef=String(body.secret_ref||"");if(!/^[0-9a-f-]{36}$/i.test(secretRef))return json({error:"Invalid secret reference"},400,origin);
  const removed=await rest("rpc/integration_secret_delete",admin,{method:"POST",body:JSON.stringify({p_secret_id:secretRef})});if(!removed.ok)return json({error:"无法删除临时凭据"},500,origin);
  return json({ok:true},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Unexpected credential operation error"},500,req.headers.get("origin"));}
});