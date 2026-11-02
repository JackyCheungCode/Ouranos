import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders={ "Access-Control-Allow-Headers":"authorization, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Vary":"Origin" };
function cors(origin:string|null){const allowed=origin==="https://ouranos-1b3.pages.dev"||(origin?.startsWith("https://")===true&&origin.endsWith(".ouranos-1b3.pages.dev"));return {...corsHeaders,...(allowed&&origin?{"Access-Control-Allow-Origin":origin}:{})};}
function json(data:unknown,status=200,origin:string|null=null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}});}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return keys.default as string|undefined;}
function publishableKey(){const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}");return keys.default as string|undefined;}
async function rest(path:string,key:string){const url=Deno.env.get("SUPABASE_URL");if(!url)throw new Error("Supabase URL is not configured");return fetch(url+"/rest/v1/"+path,{headers:{apikey:key,Authorization:"Bearer "+key}});}
const fallback:Record<string,string[]>={
 openai:["gpt-5","gpt-5-mini","gpt-4.1","gpt-4.1-mini","o3","o4-mini"],anthropic:["claude-sonnet-4-5","claude-opus-4-1","claude-haiku-4-5"],"google-ai":["gemini-2.5-pro","gemini-2.5-flash","gemini-2.0-flash"],deepseek:["deepseek-chat","deepseek-reasoner"],qwen:["qwen-max","qwen-plus","qwen-turbo","qwen3-235b-a22b","qwen3-32b"],zhipu:["glm-4.5","glm-4.5-air","glm-4-flash"],moonshot:["kimi-k2-0905-preview","kimi-k2-turbo-preview","moonshot-v1-128k"],"baidu-qianfan":["ernie-4.5-turbo-128k","ernie-4.0-turbo-8k","ernie-speed-128k"],doubao:["doubao-seed-1-6-250615","doubao-1-5-pro-32k","doubao-1-5-lite-32k"],minimax:["MiniMax-M2","MiniMax-Text-01","abab6.5s-chat"],siliconflow:["deepseek-ai/DeepSeek-V3.2","Qwen/Qwen3-8B","THUDM/GLM-4-9B-0414"],openrouter:["openai/gpt-oss-20b:free","meta-llama/llama-3.3-70b-instruct:free","google/gemma-3-27b-it:free"],groq:["llama-3.3-70b-versatile","openai/gpt-oss-120b","qwen/qwen3-32b"],cerebras:["llama3.1-8b","gpt-oss-120b","qwen-3-235b-a22b-instruct-2507"],mistral:["mistral-large-latest","mistral-small-latest","codestral-latest"],xai:["grok-4","grok-3","grok-3-mini"],"workers-ai":["@cf/meta/llama-3.3-70b-instruct-fp8-fast","@cf/qwen/qwen3-30b-a3b-fp8","@cf/mistral/mistral-small-3.1-24b-instruct"],"custom-openai":[]};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const authorization=req.headers.get("authorization");const url=Deno.env.get("SUPABASE_URL");const anon=publishableKey();const admin=serviceKey();if(!authorization||!url||!anon||!admin)return json({error:"Authentication is required"},401,origin);
  const userResponse=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:authorization}});if(!userResponse.ok)return json({error:"Invalid or expired session"},401,origin);const user=await userResponse.json();
  const body=await req.json();const workspace=String(body.workspace_id??"");const provider=String(body.provider_key??"");const key=String(body.api_key??"");const account=String(body.account_id??"");const base=String(body.base_url??"");
  if(!workspace||!key||key.length>8192||!/^[a-z0-9-]{2,64}$/.test(provider))return json({error:"Invalid model catalog request"},400,origin);
  const membership=await rest("workspace_members?select=role&workspace_id=eq."+encodeURIComponent(workspace)+"&user_id=eq."+encodeURIComponent(user.id)+"&limit=1",admin);if(!membership.ok)return json({error:"Unable to verify workspace access"},500,origin);let members=await membership.json();if(!members.length){const owner=await rest("workspaces?select=id&owner_id=eq."+encodeURIComponent(user.id)+"&id=eq."+encodeURIComponent(workspace)+"&limit=1",admin);if(!owner.ok||(await owner.json()).length===0)return json({error:"Workspace access denied"},403,origin);}
  const headers:Record<string,string>={Authorization:"Bearer "+key,Accept:"application/json"};let endpoint="";let method="GET";
  switch(provider){
   case "openai":endpoint="https://api.openai.com/v1/models";break;
   case "anthropic":endpoint="https://api.anthropic.com/v1/models";headers["x-api-key"]=key;delete headers.Authorization;headers["anthropic-version"]="2023-06-01";break;
   case "google-ai":endpoint="https://generativelanguage.googleapis.com/v1beta/models";delete headers.Authorization;headers["x-goog-api-key"]=key;break;
   case "deepseek":endpoint="https://api.deepseek.com/models";break;
   case "qwen":endpoint="https://dashscope.aliyuncs.com/compatible-mode/v1/models";break;
   case "zhipu":endpoint="https://open.bigmodel.cn/api/paas/v4/models";break;
   case "moonshot":endpoint="https://api.moonshot.cn/v1/models";break;
   case "siliconflow":endpoint="https://api.siliconflow.cn/v1/models";break;
   case "openrouter":endpoint="https://openrouter.ai/api/v1/models";break;
   case "groq":endpoint="https://api.groq.com/openai/v1/models";break;
   case "cerebras":endpoint="https://api.cerebras.ai/v1/models";break;
   case "mistral":endpoint="https://api.mistral.ai/v1/models";break;
   case "xai":endpoint="https://api.x.ai/v1/models";break;
   case "minimax":endpoint="https://api.minimax.io/v1/models";break;
   case "workers-ai":if(!/^[a-f0-9]{32}$/.test(account))return json({error:"Cloudflare Account ID 格式不正确"},400,origin);endpoint="https://api.cloudflare.com/client/v4/accounts/"+account+"/ai/models/search?per_page=100";break;
   case "custom-openai":if(!base.startsWith("https://"))return json({error:"自定义 API Base URL 必须使用 HTTPS"},400,origin);endpoint=base.replace(/\/$/,"")+"/models";break;
   default:return json({models:fallback[provider]||[],source:"fallback"},200,origin);
  }
  if(provider==="workers-ai"){const response=await fetch(endpoint,{headers:{Authorization:"Bearer "+key},signal:AbortSignal.timeout(15000)});if(!response.ok)return json({error:"Cloudflare 返回 HTTP "+response.status},400,origin);const data=await response.json();const models=(data.result||[]).map((m:Record<string,unknown>)=>String(m.name||m.id||"")).filter(Boolean);return json({models:models.length?models:fallback[provider],source:models.length?"remote":"fallback"},200,origin);}
  const response=await fetch(endpoint,{method,headers,signal:AbortSignal.timeout(15000)});if(!response.ok){const message=await response.text();return json({error:"服务商模型目录请求失败（HTTP "+response.status+"）",detail:message.slice(0,180)},400,origin);}
  const data=await response.json();let models:string[]=[];
  if(provider==="google-ai")models=(data.models||[]).map((m:Record<string,unknown>)=>String(m.name||"").replace(/^models\//,"")).filter(Boolean);
  else if(provider==="anthropic")models=(data.data||[]).map((m:Record<string,unknown>)=>String(m.id||"")).filter(Boolean);
  else models=(data.data||data.models||[]).map((m:Record<string,unknown>)=>String(m.id||m.name||"")).filter(Boolean);
  if(provider==="openrouter")models=models.filter(m=>!m.includes(":extended"));models=Array.from(new Set(models)).sort();
  return json({models:models.length?models:(fallback[provider]||[]),source:models.length?"remote":"fallback"},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Model catalog request failed"},500,req.headers.get("origin"));}
});