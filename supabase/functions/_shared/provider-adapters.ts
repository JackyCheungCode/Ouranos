export type ProviderKey = "apify" | "brightdata" | "octoparse" | "firecrawl" | "phantombuster" | "texau" | "kuajingmofang";
export type JsonObject = Record<string, unknown>;
export type AdapterContext = {
  credentials: JsonObject;
  config: JsonObject;
  input: JsonObject;
  costApproved?: boolean;
  maxCost?: number;
};
export type AdapterStart = { state:"running"|"completed"; providerJobId:string; cursor?:string|null; raw:unknown; usage?:JsonObject };
export type AdapterStatus = { state:"queued"|"running"|"completed"|"failed"; progress?:number|null; raw:unknown; retryAfterSeconds?:number; usage?:JsonObject };
export type AdapterPage = { items:unknown[]; nextCursor?:string|null; raw:unknown; usage?:JsonObject };
export interface ProviderAdapter {
  key:ProviderKey;
  validate(ctx:AdapterContext):Promise<void>;
  start(ctx:AdapterContext):Promise<AdapterStart>;
  poll(ctx:AdapterContext,jobId:string):Promise<AdapterStatus>;
  fetch(ctx:AdapterContext,jobId:string,cursor?:string|null):Promise<AdapterPage>;
}
const apiKey=(ctx:AdapterContext)=>String(ctx.credentials.api_key||"");
const asObject=(value:unknown):JsonObject=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonObject:{};
const responseJson=async(response:Response)=>{const body=await response.text();let data:unknown;try{data=body?JSON.parse(body):{}}catch{data={message:body.slice(0,1000)}}if(!response.ok)throw new Error(`Provider HTTP ${response.status}: ${JSON.stringify(data).slice(0,1200)}`);return data as JsonObject;};
const requireValue=(value:unknown,name:string)=>{if(value===undefined||value===null||value==="")throw new Error(`Missing required adapter input: ${name}`);return value;};
const request=async(url:string,init:RequestInit)=>fetch(url,{...init,signal:init.signal||AbortSignal.timeout(30000)});
const apify:ProviderAdapter={
 key:"apify",
 async validate(ctx){const actorId=String(ctx.config.external_actor_id||ctx.config.actor_id||"");requireValue(actorId,"external_actor_id");const schema=asObject(ctx.config.input_schema);const required=Array.isArray(schema.required)?schema.required as string[]:[];for(const key of required)requireValue(ctx.input[key],key);},
 async start(ctx){const actorId=String(ctx.config.external_actor_id||ctx.config.actor_id);const data=await responseJson(await request(`https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/runs`,{method:"POST",headers:{Authorization:`Bearer ${apiKey(ctx)}`,"Content-Type":"application/json"},body:JSON.stringify(ctx.input)}));const run=asObject(data.data||data);return {state:"running",providerJobId:String(run.id),cursor:String(run.defaultDatasetId||""),raw:data,usage:asObject(run.usage)};},
 async poll(ctx,jobId){const data=await responseJson(await request(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(jobId)}`,{headers:{Authorization:`Bearer ${apiKey(ctx)}`}}));const run=asObject(data.data||data);const status=String(run.status||"");return {state:status==="SUCCEEDED"?"completed":status==="FAILED"||status==="ABORTED"||status==="TIMED-OUT"?"failed":status==="READY"?"queued":"running",progress:null,raw:data,retryAfterSeconds:status==="READY"?10:undefined,usage:{cost_usd:Number(run.usageTotalUsd)||undefined,charged_event_counts:run.chargedEventCounts||{}}};},
 async fetch(ctx,jobId,cursor){const datasetId=String(ctx.config.dataset_id||"");requireValue(datasetId,"defaultDatasetId");const offset=Number(cursor||0);const limit=Math.min(1000,Math.max(1,Number(ctx.input.limit||100)));const data=await responseJson(await request(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&offset=${offset}&limit=${limit}`,{headers:{Authorization:`Bearer ${apiKey(ctx)}`}}));const items=Array.isArray(data)?data:Array.isArray(data.items)?data.items:[];return {items,nextCursor:items.length===limit?String(offset+items.length):null,raw:data};}
};
const brightdata:ProviderAdapter={
 key:"brightdata",
 async validate(ctx){requireValue(ctx.config.dataset_id,"dataset_id");requireValue(ctx.input.payload,"payload");},
 async start(ctx){const dataset=String(ctx.config.dataset_id);const params=new URLSearchParams({dataset_id:dataset,format:"json"});const data=await responseJson(await request(`https://api.brightdata.com/datasets/v3/trigger?${params}`,{method:"POST",headers:{Authorization:`Bearer ${apiKey(ctx)}`,"Content-Type":"application/json"},body:JSON.stringify(ctx.input.payload)}));const id=String(data.snapshot_id||data.id||"");requireValue(id,"snapshot_id");return {state:"running",providerJobId:id,raw:data};},
 async poll(ctx,jobId){const data=await responseJson(await request(`https://api.brightdata.com/datasets/v3/progress/${encodeURIComponent(jobId)}`,{headers:{Authorization:`Bearer ${apiKey(ctx)}`}}));const status=String(data.status||"");return {state:status==="ready"||status==="completed"?"completed":status==="failed"?"failed":"running",progress:typeof data.progress==="number"?data.progress:null,raw:data,retryAfterSeconds:status==="running"?15:undefined,usage:asObject(data.usage||data.cost)};},
 async fetch(ctx,jobId,cursor){const params=new URLSearchParams({format:"json"});if(cursor)params.set("cursor",cursor);const data=await responseJson(await request(`https://api.brightdata.com/datasets/v3/snapshot/${encodeURIComponent(jobId)}?${params}`,{headers:{Authorization:`Bearer ${apiKey(ctx)}`}}));const items=Array.isArray(data)?data:Array.isArray(data.data)?data.data:[];return {items,nextCursor:null,raw:data,usage:asObject(data.usage)};}
};
const octoparse:ProviderAdapter={
 key:"octoparse",
 async validate(ctx){requireValue(ctx.config.template_name,"template_name");requireValue(ctx.credentials.external_user_id,"external_user_id");requireValue(ctx.input.parameters,"parameters");},
 async start(ctx){const data=await responseJson(await request("https://openapi.octoparse.com/api/agentTools/executeTask",{method:"POST",headers:{"x-api-key":apiKey(ctx),"x-external-user-id":String(ctx.credentials.external_user_id),"Content-Type":"application/json"},body:JSON.stringify({templateName:ctx.config.template_name,taskName:ctx.input.task_name||"Ouranos discovery",parameters:JSON.stringify(ctx.input.parameters),targetMaxRows:ctx.input.targetMaxRows||100})}));const result=asObject(data.data||data);const id=String(result.taskId||"");requireValue(id,"taskId");return {state:"running",providerJobId:id,raw:data,usage:asObject(result.usage)};},
 async poll(ctx,jobId){const params=new URLSearchParams({taskId:jobId,exportFileType:"JSON",previewRows:"5"});const data=await responseJson(await request(`https://openapi.octoparse.com/api/agentTools/exportData?${params}`,{headers:{"x-api-key":apiKey(ctx)}}));const result=asObject(data.data||data);const status=String(result.status||"");return {state:status==="exported"||status==="no_data"?"completed":status==="failed"||status==="invalid"?"failed":"running",progress:null,raw:data,retryAfterSeconds:status==="collecting"||status==="exporting"?30:undefined};},
 async fetch(ctx,jobId){const params=new URLSearchParams({taskId:jobId,exportFileType:"JSON",previewRows:"5"});const data=await responseJson(await request(`https://openapi.octoparse.com/api/agentTools/exportData?${params}`,{headers:{"x-api-key":apiKey(ctx)}}));const result=asObject(data.data||data);if(result.status!=="exported")return {items:[],nextCursor:null,raw:data};const url=String(result.exportFileUrl||"");requireValue(url,"exportFileUrl");const file=await responseJson(await request(url,{}));const items=Array.isArray(file)?file:Array.isArray(asObject(file).data)?asObject(file).data as unknown[]:[];return {items,nextCursor:null,raw:data,usage:asObject(result.usage)};}
};
const firecrawl:ProviderAdapter={
 key:"firecrawl",
 async validate(ctx){const operation=String(ctx.config.operation||"crawl");if(!["search","scrape","crawl"].includes(operation))throw new Error("Firecrawl operation must be search, scrape or crawl");requireValue(ctx.input.query||ctx.input.url,"query or url");},
 async start(ctx){const operation=String(ctx.config.operation||"crawl");const endpoint=operation==="search"?"/v2/search":operation==="scrape"?"/v2/scrape":"/v2/crawl";const data=await responseJson(await request(`https://api.firecrawl.dev${endpoint}`,{method:"POST",headers:{Authorization:`Bearer ${apiKey(ctx)}`,"Content-Type":"application/json"},body:JSON.stringify(ctx.input)}));const id=String(data.id||data.jobId||"");const output=operation==="scrape"&&!Array.isArray(data.data)?{...data,items:[asObject(data.data).metadata?data.data:data]}:data;return {state:id?"running":"completed",providerJobId:id||crypto.randomUUID(),raw:output,usage:asObject(data.creditsUsed?{credits_used:data.creditsUsed}:{})};},
 async poll(ctx,jobId){const data=await responseJson(await request(`https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(jobId)}`,{headers:{Authorization:`Bearer ${apiKey(ctx)}`}}));const status=String(data.status||"");return {state:status==="completed"?"completed":status==="failed"?"failed":"running",progress:typeof data.completed==="number"&&typeof data.total==="number"&&data.total>0?data.completed/data.total*100:null,raw:data,retryAfterSeconds:status==="scraping"?10:undefined,usage:{credits_used:data.creditsUsed}};},
 async fetch(ctx,jobId,cursor){const params=new URLSearchParams({limit:"100"});if(cursor)params.set("cursor",cursor);const data=await responseJson(await request(`https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(jobId)}?${params}`,{headers:{Authorization:`Bearer ${apiKey(ctx)}`}}));const items=Array.isArray(data.data)?data.data:[];return {items,nextCursor:typeof data.next==="string"?data.next:null,raw:data,usage:asObject(data.creditsUsed?{credits_used:data.creditsUsed}:{})};}
};
const phantom:ProviderAdapter={
 key:"phantombuster",
 async validate(ctx){requireValue(ctx.config.agent_id,"agent_id");requireValue(ctx.input.argument,"agent argument");},
 async start(ctx){const agentId=String(ctx.config.agent_id);const params=new URLSearchParams({output:"json",argument:JSON.stringify(ctx.input.argument)});const data=await responseJson(await request(`https://api.phantombuster.com/api/v1/agent/${encodeURIComponent(agentId)}/launch?${params}`,{method:"POST",headers:{"X-Phantombuster-Key-1":apiKey(ctx),Accept:"application/json"}}));const result=asObject(data.data||data);const id=String(result.containerId||result.container_id||"");requireValue(id,"containerId");return {state:"running",providerJobId:id,raw:data};},
 async poll(ctx,jobId){const agentId=String(ctx.config.agent_id);const params=new URLSearchParams({containerId:jobId});const data=await responseJson(await request(`https://api.phantombuster.com/api/v1/agent/${encodeURIComponent(agentId)}/output.json?${params}`,{headers:{"X-Phantombuster-Key-1":apiKey(ctx)}}));const result=asObject(data.data||data);const status=String(result.exitMessage||result.status||"");return {state:status==="finished"&&Number(result.exitCode??0)===0?"completed":status==="killed"||status==="error"||(typeof result.exitCode==="number"&&result.exitCode!==0)?"failed":"running",progress:null,raw:data,retryAfterSeconds:15};},
 async fetch(ctx,jobId){const agentId=String(ctx.config.agent_id);const params=new URLSearchParams({containerId:jobId});const data=await responseJson(await request(`https://api.phantombuster.com/api/v1/agent/${encodeURIComponent(agentId)}/output.json?${params}`,{headers:{"X-Phantombuster-Key-1":apiKey(ctx)}}));const items=Array.isArray(data.resultObject)?data.resultObject:Array.isArray(data.data)?data.data:[];return {items,nextCursor:null,raw:data};}
};
const texau:ProviderAdapter={
 key:"texau",
 async validate(ctx){const path=String(ctx.config.endpoint_path||"");if(!path.startsWith("/")||path.includes(".."))throw new Error("TexAu adapter requires a safe endpoint_path");if(!ctx.input||typeof ctx.input!=="object")throw new Error("TexAu input must be a JSON object");},
 async start(ctx){const path=String(ctx.config.endpoint_path);const data=await responseJson(await request(`https://v3-api.texau.com/api/v1${path}`,{method:"POST",headers:{"x-api-key":apiKey(ctx),"Content-Type":"application/json"},body:JSON.stringify(ctx.input)}));const id=String(data.executionId||data.execution_id||"");return {state:id?"running":"completed",providerJobId:id||crypto.randomUUID(),raw:data,usage:asObject(data.credits?{credits:data.credits}:data.usage)};},
 async poll(ctx,jobId){const path=String(ctx.config.inquiry_path||"");if(!path.startsWith("/")||path.includes(".."))throw new Error("TexAu adapter requires a configured inquiry_path for async actions");const params=new URLSearchParams({executionId:jobId});const data=await responseJson(await request(`https://v3-api.texau.com/api/v1${path}?${params}`,{headers:{"x-api-key":apiKey(ctx)}}));const status=String(data.status||"");return {state:status==="completed"||status==="success"?"completed":status==="failed"?"failed":"running",raw:data,retryAfterSeconds:15};},
 async fetch(ctx,jobId){return {items:[],nextCursor:null,raw:{executionId:jobId,fetchFromInquiry:true}};}
};
const crossborder:ProviderAdapter={
 key:"kuajingmofang",
 async validate(ctx){const path=String(ctx.config.endpoint_path||"");if(!path.startsWith("/")||path.includes(".."))throw new Error("Cross-border Magic adapter requires a verified endpoint_path");if(ctx.costApproved!==true)throw new Error("Paid Cross-border Magic calls require explicit cost approval");requireValue(ctx.maxCost,"maxCost");},
 async start(ctx){const path=String(ctx.config.endpoint_path);const data=await responseJson(await request(`https://openapi.upkuajing.com${path}`,{method:"POST",headers:{Authorization:`Bearer ${apiKey(ctx)}`,"Content-Type":"application/json"},body:JSON.stringify(ctx.input)}));return {state:"completed",providerJobId:crypto.randomUUID(),raw:data,usage:asObject(data.usage||data.cost||{})};},
 async poll(_ctx,jobId){return {state:"completed",raw:{providerJobId:jobId}};},
 async fetch(_ctx,_jobId){return {items:[],nextCursor:null,raw:{alreadyReturnedByStart:true}};}
};
export const providerAdapters:Record<ProviderKey,ProviderAdapter>={apify,brightdata,octoparse,firecrawl,phantombuster:phantom,texau,kuajingmofang:crossborder};
export function getProviderAdapter(key:ProviderKey){return providerAdapters[key];}
