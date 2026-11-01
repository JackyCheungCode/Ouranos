import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function cors(origin: string | null) {
  const allowed = origin === "https://ouranos-1b3.pages.dev"
    || (origin?.startsWith("https://") === true && origin.endsWith(".ouranos-1b3.pages.dev"));
  return { ...corsHeaders, ...(allowed && origin ? { "Access-Control-Allow-Origin": origin } : {}) };
}
function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return keys.default as string | undefined;
}
function publishableKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  return keys.default as string | undefined;
}
async function rest(path: string, key: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("Supabase URL is not configured");
  const headers = new Headers(init.headers);
  headers.set("apikey", key); headers.set("Authorization", `Bearer ${key}`); headers.set("Content-Type", "application/json");
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers });
}
async function recordEvent(adminKey:string, event:Record<string,unknown>) {
  await rest("integration_events",adminKey,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(event)});
}
type TestResult={success:boolean;message:string;statusCode?:number;usage?:unknown;manual?:boolean};
async function testProvider(provider:string,secret:string,kind:string):Promise<TestResult>{
  let credentials:Record<string,unknown>={api_key:secret};
  try { const parsed=JSON.parse(secret); if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))credentials=parsed; } catch { /* legacy plain API key */ }
  const apiKey=String(credentials.api_key||"");
  const timeout=AbortSignal.timeout(12000);
  if(kind==="ai_model"){
    if(provider==="openai"){const r=await fetch("https://api.openai.com/v1/models",{headers:{Authorization:`Bearer ${apiKey}`},signal:timeout});return {success:r.ok,message:r.ok?"OpenAI API Key 验证成功":`OpenAI 返回 HTTP ${r.status}`,statusCode:r.status};}
    if(provider==="anthropic"){const r=await fetch("https://api.anthropic.com/v1/models",{headers:{"x-api-key":apiKey,"anthropic-version":"2023-06-01"},signal:timeout});return {success:r.ok,message:r.ok?"Anthropic API Key 验证成功":`Anthropic 返回 HTTP ${r.status}`,statusCode:r.status};}
    if(provider==="google-ai"){const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models",{headers:{"x-goog-api-key":apiKey},signal:timeout});return {success:r.ok,message:r.ok?"Google AI API Key 验证成功":`Google AI 返回 HTTP ${r.status}`,statusCode:r.status};}
    if(provider==="deepseek"){const r=await fetch("https://api.deepseek.com/models",{headers:{Authorization:`Bearer ${apiKey}`},signal:timeout});return {success:r.ok,message:r.ok?"DeepSeek API Key 验证成功":`DeepSeek 返回 HTTP ${r.status}`,statusCode:r.status};}
    if(provider==="openrouter"){const r=await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:`Bearer ${apiKey}`},signal:timeout});return {success:r.ok,message:r.ok?"OpenRouter API Key 验证成功":`OpenRouter 返回 HTTP ${r.status}`,statusCode:r.status};}
    return {success:false,manual:true,message:"该 AI 服务商暂未配置无计费连接测试适配器。"};
  }
  if(provider==="apify"){
    const response=await fetch("https://api.apify.com/v2/users/me",{headers:{Authorization:`Bearer ${apiKey}`},signal:timeout});
    return {success:response.ok,message:response.ok?"Apify API Key 验证成功":response.status===401?"Apify API Key 无效或已撤销":`Apify 返回 HTTP ${response.status}`,statusCode:response.status};
  }
  if(provider==="brightdata"){
    const response=await fetch("https://api.brightdata.com/datasets/v3/progress/ouranos-credential-check",{headers:{Authorization:`Bearer ${apiKey}`},signal:timeout});
    if(response.ok||response.status===404)return {success:true,message:response.status===404?"Bright Data API Key 已通过认证（测试资源不存在，未触发采集）":"Bright Data API Key 验证成功",statusCode:response.status};
    return {success:false,message:response.status===401?"Bright Data API Key 无效或权限不足":`Bright Data 返回 HTTP ${response.status}`,statusCode:response.status};
  }
  if(provider==="firecrawl"){
    const response=await fetch("https://api.firecrawl.dev/v2/team/credit-usage",{headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json"},signal:timeout});
    const data=await response.json().catch(()=>({}));
    return {success:response.ok&&data.success!==false,message:response.ok?"Firecrawl API Key 验证成功，已读取团队额度":response.status===401?"Firecrawl API Key 无效或团队无访问权限":`Firecrawl 返回 HTTP ${response.status}`,statusCode:response.status,usage:response.ok?data.data:undefined};
  }
  if(provider==="phantombuster"){
    let response=await fetch("https://api.phantombuster.com/api/v2/branches/fetch-all",{headers:{"X-Phantombuster-Key-1":apiKey,Accept:"application/json"},signal:timeout});
    if(response.status===401)response=await fetch("https://api.phantombuster.com/api/v2/branches/fetch-all",{headers:{"X-Phantombuster-Key":apiKey,Accept:"application/json"},signal:timeout});
    return {success:response.ok,message:response.ok?"PhantomBuster API Key 验证成功":response.status===401?"PhantomBuster API Key 无效或权限不足":`PhantomBuster 返回 HTTP ${response.status}`,statusCode:response.status};
  }
  if(provider==="octoparse"){
    const response=await fetch("https://openapi.octoparse.com/api/agentTools/searchTemplates?keyword=amazon&page=1&limit=1",{headers:{"x-api-key":apiKey,Accept:"application/json"},signal:timeout});
    return {success:response.ok,message:response.ok?"Octoparse AgentTools API Key 验证成功（仅查询模板目录，未启动采集）":response.status===401||response.status===403?"Octoparse API Key 无效或无权访问":`Octoparse 返回 HTTP ${response.status}`,statusCode:response.status};
  }
  if(provider==="texau"){
    const response=await fetch("https://v3-api.texau.com/api/v1/email_finding_waterfall",{method:"POST",headers:{"x-api-key":apiKey,"Content-Type":"application/json",Accept:"application/json"},body:"{}",signal:timeout});
    const data=await response.json().catch(()=>({}));
    const authOk=response.status===400||(response.status===422)||(response.ok&&data.success===false);
    return {success:authOk,message:authOk?"TexAu API Key 已通过认证；空参数校验请求被拒绝，未执行 enrichment":response.status===401||response.status===403?"TexAu API Key 无效或无权访问":`TexAu 返回 HTTP ${response.status}`,statusCode:response.status};
  }
  if(provider==="kuajingmofang")return {success:false,manual:true,message:"跨境魔方公开接口按次计费，当前未确认无计费的 API Key 验证端点。为避免测试产生费用，本次不调用计费接口；凭证已安全保存。"};
  return {success:false,manual:true,message:"该服务商暂未配置连接测试适配器。"};
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
  if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
  try{
    const authorization=req.headers.get("authorization");const token=authorization?.replace(/^Bearer\\s+/i,"");
    const url=Deno.env.get("SUPABASE_URL");const anonKey=publishableKey();const adminKey=serviceKey();
    if(!authorization||!token||!url||!anonKey||!adminKey)return json({error:"Authentication or server configuration is missing"},401,origin);
    const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authorization}});
    if(!userResponse.ok)return json({error:"Invalid or expired session"},401,origin);
    const user=await userResponse.json();const body=await req.json();
    const action=String(body.action||"");const kind=body.kind==="ai_model"?"ai_model":body.kind==="data_source"?"data_source":"";
    const workspaceId=String(body.workspace_id||"");const providerKey=String(body.provider_key||"").toLowerCase();const modelName=String(body.model_name||"");
    if(!["delete","test"].includes(action)||!workspaceId||!kind||! /^[a-z0-9-]{2,64}$/.test(providerKey))return json({error:"Invalid integration action"},400,origin);
    const membership=await rest(`workspace_members?select=role&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,adminKey);
    if(!membership.ok)return json({error:"Unable to verify workspace access"},500,origin);
    const members=await membership.json();let isOwner=false;
    if(!members.length){const owner=await rest(`workspaces?select=id&owner_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,adminKey);if(owner.ok)isOwner=(await owner.json()).length>0;}
    if(!members.length&&!isOwner)return json({error:"Workspace access denied"},403,origin);
    const table=kind==="data_source"?"integration_connections":"ai_model_configs";
    const filter=`workspace_id=eq.${encodeURIComponent(workspaceId)}&provider_key=eq.${encodeURIComponent(providerKey)}`+(kind==="ai_model"?`&model_name=eq.${encodeURIComponent(modelName)}`:"");
    const existingResponse=await rest(`${table}?select=id,secret_ref,provider_name&${filter}&limit=1`,adminKey);
    if(!existingResponse.ok)return json({error:"Unable to read current integration"},500,origin);
    const existingRows=await existingResponse.json();const existing=existingRows[0];
    if(!existing)return json({error:"Integration configuration not found"},404,origin);
    const started=Date.now();
    if(action==="delete"){
      if(existing.secret_ref){const secretDelete=await rest("rpc/integration_secret_delete",adminKey,{method:"POST",body:JSON.stringify({p_secret_id:existing.secret_ref})});if(!secretDelete.ok)return json({error:"Vault credential deletion failed"},500,origin);}
      const deleted=await rest(`${table}?${filter}`,adminKey,{method:"DELETE",headers:{Prefer:"return=minimal"}});
      if(!deleted.ok)return json({error:"Integration metadata deletion failed"},500,origin);
      await recordEvent(adminKey,{workspace_id:workspaceId,provider_key:providerKey,provider_name:existing.provider_name,action:"delete",status:"success",message:"凭证和集成配置已删除",duration_ms:Date.now()-started,created_by:user.id});
      return json({ok:true,action:"delete",provider_key:providerKey},200,origin);
    }
    if(!existing.secret_ref)return json({error:"No stored credential found"},400,origin);
    const secretResponse=await rest("rpc/integration_secret_read",adminKey,{method:"POST",body:JSON.stringify({p_secret_id:existing.secret_ref})});
    if(!secretResponse.ok)return json({error:"Unable to retrieve credential from Vault"},500,origin);
    const secret=await secretResponse.json();
    if(typeof secret!=="string"||!secret)return json({error:"Stored credential is empty"},500,origin);
    const result=await testProvider(providerKey,secret,kind);
    const status=result.success?"connected":result.manual?"configured":"error";
    const update=await rest(`${table}?${filter}`,adminKey,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status,is_enabled:result.success,last_tested_at:new Date().toISOString(),last_error:result.success?null:result.message,updated_at:new Date().toISOString()})});
    if(!update.ok)return json({error:"Test completed but status could not be saved"},500,origin);
    await recordEvent(adminKey,{workspace_id:workspaceId,provider_key:providerKey,provider_name:existing.provider_name,action:"test",status:result.success?"success":"failure",message:result.message,details:{status_code:result.statusCode??null,manual:result.manual===true},duration_ms:Date.now()-started,created_by:user.id});
    return json({ok:true,action:"test",provider_key:providerKey,status,message:result.message,usage:result.usage??null},200,origin);
  }catch(error){
    return json({error:error instanceof Error?error.message:"Unexpected integration action error"},500,req.headers.get("origin"));
  }
});
