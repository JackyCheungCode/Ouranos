import { useState, type FormEvent } from 'react'
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import './auth.css'

export default function AuthScreen(){
 const {user,workspace,configured,createWorkspace,error:contextError}=useAuth()
 const [mode,setMode]=useState<'login'|'signup'|'reset'>('login')
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [fullName,setFullName]=useState('');const [workspaceName,setWorkspaceName]=useState('')
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('')
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('')
  try{
   if(!supabase)throw new Error('Supabase 尚未配置。请在 Cloudflare Pages 环境变量中设置 VITE_SUPABASE_PUBLISHABLE_KEY。')
   if(mode==='signup'){
    const {data,error:authError}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:fullName.trim()},emailRedirectTo:window.location.origin}})
    if(authError)throw authError
    setMessage(data.session?'注册成功，正在初始化工作空间。':'注册请求已提交，请检查邮箱并完成验证后登录。')
   }else if(mode==='login'){
    const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(authError)throw authError
   }else{
    const {error:authError}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});if(authError)throw authError
    setMessage('密码重置邮件已发送，请检查收件箱。')
   }
  }catch(err){setError(err instanceof Error?err.message:'操作失败，请稍后重试。')}finally{setBusy(false)}
 }
 const create=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await createWorkspace(workspaceName)}catch(err){setError(err instanceof Error?err.message:'工作空间创建失败')}finally{setBusy(false)}}
 return <div className="auth-screen"><div className="auth-panel"><div className="auth-brand"><span className="auth-brand-mark">✦</span><span>ouranos</span><small>企业客户增长平台</small></div>
  {!configured?<><div className="auth-intro"><h1>连接工作空间</h1><p>Supabase 客户端配置尚未完成，登录入口暂不可用。</p></div><div className="auth-alert">需要在 Cloudflare Pages 的环境变量中设置 <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>。项目地址已预设，密钥只使用公开 publishable key，绝不能填写 service_role / secret key。</div></>:
  user&&!workspace?<><div className="auth-icon"><Building2 size={22}/></div><div className="auth-intro"><h1>创建工作空间</h1><p>工作空间用于隔离企业、潜在客户、API 配置和团队数据。</p></div><form onSubmit={create} className="auth-form"><label>工作空间名称<input required value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} placeholder="例如：Ouranos Global Sales"/></label><button disabled={busy||!workspaceName.trim()}>{busy?'正在创建…':'创建工作空间'} <ArrowRight size={16}/></button></form><p className="auth-footnote">创建后你将自动成为工作空间所有者。</p></>:
  !user?<><div className="auth-intro"><span className="auth-eyebrow">SECURE WORKSPACE ACCESS</span><h1>{mode==='login'?'登录 Ouranos':mode==='signup'?'创建账户':'重置密码'}</h1><p>登录后管理潜在客户、数据源集成和团队工作空间。</p></div><form onSubmit={submit} className="auth-form">{mode==='signup'&&<label>姓名<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="你的姓名"/></label>}<label>邮箱地址<span className="auth-input"><Mail size={15}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></span></label>{mode!=='reset'&&<label>密码<span className="auth-input"><LockKeyhole size={15}/><input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 8 位"/></span></label>}<button disabled={busy}>{busy?'请稍候…':mode==='login'?'登录':mode==='signup'?'创建账户':'发送重置邮件'} <ArrowRight size={16}/></button></form><div className="auth-switch">{mode==='login'?<><button onClick={()=>setMode('signup')}>注册新账户</button><button onClick={()=>setMode('reset')}>忘记密码？</button></>:<button onClick={()=>setMode('login')}>返回登录</button>}</div><div className="auth-trust"><ShieldCheck size={14}/> 工作空间数据由 Supabase Auth 与行级安全策略保护</div></>:<div className="auth-intro"><h1>正在载入工作空间</h1><p>请稍候…</p></div>}
  {(error||contextError)&&<div className="auth-error">{error||contextError}</div>}{message&&<div className="auth-success">{message}</div>}
 </div><div className="auth-side"><div className="auth-orbit"><Sparkles size={30}/></div><span>DISCOVER · CONNECT · GROW</span><h2>让每一次客户发现<br/>都成为可管理的商机。</h2><p>从多渠道搜索到人工审核，再到客户关系管理，所有业务数据都在安全的工作空间中流转。</p></div></div>
}
