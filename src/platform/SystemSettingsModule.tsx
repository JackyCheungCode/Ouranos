import { ChevronRight,Grid2X2,Settings,Sparkles } from 'lucide-react'
import type { PlatformRoute } from './router'
import { platformApps } from './appRegistry'
import ApiIntegrationSettings from '../apps/system-integrations/ApiIntegrationSettings'
import AiIntegrationSettings from '../apps/system-integrations/AiIntegrationSettings'
type Props={route:PlatformRoute;navigate:(route:PlatformRoute)=>void;onHome:()=>void}
export default function SystemSettingsModule({route,navigate,onHome}:Props){
 const section=route.section
 const goApi=(key=route.providerKey)=>navigate({appId:'settings',section:'api-integrations',providerKey:key})
 const goAi=(key=route.providerKey)=>navigate({appId:'settings',section:'ai-integrations',providerKey:key})
 const goOverview=()=>navigate({appId:'settings',section:'home',providerKey:'apify'})
 return <div className="platform-settings">
  <div className="platform-breadcrumb"><button onClick={onHome}><Grid2X2 size={14}/> 应用</button><ChevronRight size={13}/><span>系统设置</span>{section==='api-integrations'&&<><ChevronRight size={13}/><span>API 集成设置</span></>}{section==='ai-integrations'&&<><ChevronRight size={13}/><span>AI 集成</span></>}</div>
  <div className="platform-settings-heading"><span className="platform-app-icon" style={{background:platformApps[2].color}}><Settings size={24}/></span><div><h1>系统设置</h1><p>管理工作空间配置、服务连接与系统能力。</p></div></div>
  <div className="platform-settings-layout"><aside className="platform-settings-nav"><div className="platform-settings-nav-title">设置</div><button className={section==='home'?'active':''} onClick={goOverview}><Settings size={16}/> 设置概览</button><div className="platform-settings-nav-group">集成管理</div><button className={section==='api-integrations'?'active':''} onClick={()=>goApi('apify')}><Grid2X2 size={16}/> API 集成设置 <ChevronRight size={14}/></button><button className={section==='ai-integrations'?'active':''} onClick={()=>goAi('openai')}><Sparkles size={16}/> AI 集成 <ChevronRight size={14}/></button></aside>
   <section className="platform-settings-content">{section==='api-integrations'?<ApiIntegrationSettings key={route.providerKey} initialProviderKey={route.providerKey} onProviderChange={goApi}/>:section==='ai-integrations'?<AiIntegrationSettings key={route.providerKey} initialProviderKey={route.providerKey}/>:<div className="platform-settings-welcome"><div className="platform-placeholder-art"><span/><span/><span/><Settings size={32}/></div><div className="platform-eyebrow">SYSTEM CONFIGURATION</div><h2>系统设置</h2><p>管理第三方数据服务和 AI 模型供应商。配置 API 凭证、选择模型并测试连接。</p><button onClick={()=>goApi('apify')}>打开 API 集成设置 <ChevronRight size={15}/></button><button onClick={()=>goAi('openai')}><Sparkles size={14}/> 配置 AI 模型 <ChevronRight size={15}/></button></div>}</section>
  </div>
 </div>
}