import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, ShieldCheck, Trash2, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Props = {
  provider: { key:string; name:string; group:'data'|'ai' }
  configured: boolean
  modelName?: string
  isDefault?: boolean
  onRefresh: () => Promise<void>
}
export default function IntegrationCredentialManager({provider,configured,modelName:initialModel,isDefault,onRefresh}:Props){
  const {workspace}=useAuth()
  const [apiKey,setApiKey]=useState('')
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [customerId,setCustomerId]=useState('')
  const [zone,setZone]=useState('')
  const [zoneUsername,setZoneUsername]=useState('')
  const [zonePassword,setZonePassword]=useState('')
  const [modelName,setModelName]=useState(initialModel||'')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{setApiKey('');setUsername('');setPassword('');setCustomerId('');setZone('');setZoneUsername('');setZonePassword('');setModelName(initialModel||'');setMessage('');setError('')},[provider.key,initialModel])
  const kind=provider.group==='ai'?'ai_model':'data_source'
  const invoke=async(action:'save'|'test'|'delete')=>{
    if(!supabase||!workspace)return
    setBusy(true);setError('');setMessage('')
    try{
      if(action==='save'){
        const credentials:Record<string,string>={}
        if(apiKey.trim())credentials.api_key=apiKey.trim()
        if(provider.key==='octoparse'){if(username.trim())credentials.username=username.trim();if(password)credentials.password=password}
        if(provider.key==='brightdata'){if(customerId.trim())credentials.customer_id=customerId.trim();if(zone.trim())credentials.zone_name=zone.trim();if(zoneUsername.trim())credentials.zone_username=zoneUsername.trim();if(zonePassword)credentials.zone_password=zonePassword}
        if(!credentials.api_key&&!(credentials.username&&credentials.password))throw new Error('请填写 API Key / Token，或八爪鱼账号凭据')
        if(kind==='ai_model'&&!modelName.trim())throw new Error('请填写模型名称')
        const category=provider.key==='firecrawl'||provider.key==='octoparse'?'website_crawling':provider.key==='phantombuster'||provider.key==='texau'?'automation':provider.key==='kuajingmofang'?'ecommerce':'data_source'
        const {data,error:invokeError}=await supabase.functions.invoke('integration-settings',{body:{workspace_id:workspace.id,kind,provider_key:provider.key,provider_name:provider.name,credentials,category,model_name:modelName.trim(),is_default:isDefault!==false}})
        if(invokeError||data?.error)throw new Error(data?.error||invokeError?.message||'安全保存失败')
        setApiKey('');setPassword('');setZonePassword('');setMessage('凭证已安全写入 Supabase Vault。请执行连接测试后再启用。')
        await onRefresh()
      }else if(action==='test'){
        const {data,error:invokeError}=await supabase.functions.invoke('integration-actions',{body:{action:'test',workspace_id:workspace.id,kind,provider_key:provider.key,model_name:modelName.trim()}})
        if(invokeError||data?.error)throw new Error(data?.error||invokeError?.message||'连接测试失败')
        setMessage(data.message||'连接测试已完成');await onRefresh()
      }else{
        if(!window.confirm('确定删除该服务商的 API 凭证和集成配置？此操作不可撤销。'))return
        const {data,error:invokeError}=await supabase.functions.invoke('integration-actions',{body:{action:'delete',workspace_id:workspace.id,kind,provider_key:provider.key,model_name:modelName.trim()}})
        if(invokeError||data?.error)throw new Error(data?.error||invokeError?.message||'删除失败')
        setMessage('凭证与集成配置已删除。');setModelName('');await onRefresh()
      }
    }catch(e){setError(e instanceof Error?e.message:'操作失败，请稍后重试。')}finally{setBusy(false)}
  }
  return <div className="int-credential-editor">
    <div className="int-section-title"><h3>凭证管理</h3><span><ShieldCheck size={12}/> 服务端安全存储</span></div>
    {provider.group==='ai'&&<label>模型 ID / 名称<input value={modelName} onChange={e=>setModelName(e.target.value)} placeholder={provider.key==='openai'?'gpt-4.1':provider.key==='anthropic'?'claude-sonnet-4-5':provider.key==='google-ai'?'gemini-2.5-pro':provider.key==='deepseek'?'deepseek-chat':'provider/model'}/></label>}
    <label>API Key / Token<input type="password" autoComplete="new-password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={configured?'已保存密钥不会回显；输入新值即可轮换':'粘贴 API Key / Token'}/></label>
    {provider.key==='octoparse'&&<div className="int-credential-grid"><label>八爪鱼用户名 / 邮箱<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="旧版 OpenAPI 账号"/></label><label>八爪鱼密码<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="仅在需要旧版 API 时填写"/></label></div>}
    {provider.key==='brightdata'&&<div className="int-credential-grid"><label>Customer ID<input value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="Bright Data Customer ID"/></label><label>Zone 名称<input value={zone} onChange={e=>setZone(e.target.value)} placeholder="SERP / Scraper zone"/></label><label>Zone 用户名<input value={zoneUsername} onChange={e=>setZoneUsername(e.target.value)} placeholder="Proxy / Browser API username"/></label><label>Zone 密码<input type="password" autoComplete="new-password" value={zonePassword} onChange={e=>setZonePassword(e.target.value)} placeholder="Zone password"/></label></div>}
    <div className="int-credential-actions">
      <button className="int-primary" disabled={busy} onClick={()=>void invoke('save')}><KeyRound size={13}/>{busy?'处理中…':configured?'更新并安全保存':'安全保存凭证'}</button>
      <button className="int-filter-button" disabled={busy||!configured} onClick={()=>void invoke('test')}><Zap size={13}/> 测试连接</button>
      <button className="int-danger-button" disabled={busy||!configured} onClick={()=>void invoke('delete')}><Trash2 size={13}/> 删除</button>
    </div>
    {error&&<div className="int-db-error">{error}</div>}
    {message&&<div className="int-credential-feedback"><CheckCircle2 size={13}/>{message}</div>}
    <p>密钥不会回显或写入浏览器存储。测试优先使用无计费接口；若供应商没有公开无计费验证接口，系统会明确提示，不会伪报已连接。</p>
  </div>
}
