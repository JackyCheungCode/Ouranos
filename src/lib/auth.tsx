import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

export type Workspace = { id: string; name: string; slug: string; owner_id: string }
type AuthContextValue = {
 session: Session | null; user: User | null; workspace: Workspace | null; workspaces: Workspace[];
 loading: boolean; configured: boolean; error: string | null;
 selectWorkspace: (id: string) => void; createWorkspace: (name: string) => Promise<void>; signOut: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
 const [session,setSession] = useState<Session|null>(null)
 const [workspaces,setWorkspaces] = useState<Workspace[]>([])
 const [workspace,setWorkspace] = useState<Workspace|null>(null)
 const [loading,setLoading] = useState(true)
 const [error,setError] = useState<string|null>(null)
 useEffect(()=>{
  if(!supabase){setLoading(false);return}
  let alive=true
  supabase.auth.getSession().then(({data})=>{if(alive)setSession(data.session);if(alive)setLoading(false)})
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setError(null)})
  return ()=>{alive=false;subscription.unsubscribe()}
 },[])
 useEffect(()=>{
  if(!supabase||!session?.user){setWorkspaces([]);setWorkspace(null);return}
  let alive=true
  setLoading(true)
  supabase.from('workspaces').select('id,name,slug,owner_id').order('created_at',{ascending:true})
   .then(({data,error:queryError})=>{
    if(!alive)return
    if(queryError){setError(queryError.message);setWorkspaces([]);setWorkspace(null)}
    else {const list=(data||[]) as Workspace[];setWorkspaces(list);setWorkspace(current=>list.find(w=>w.id===current?.id)||list[0]||null);setError(null)}
    setLoading(false)
   })
  return ()=>{alive=false}
 },[session?.user?.id])
 const selectWorkspace=(id:string)=>setWorkspace(workspaces.find(w=>w.id===id)||null)
 const createWorkspace=async(name:string)=>{
  if(!supabase||!session?.user)throw new Error('请先登录')
  const slugBase=name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'workspace'
  const slug=slugBase+'-'+crypto.randomUUID().slice(0,6)
  const {data,error:createError}=await supabase.from('workspaces').insert({name:name.trim(),slug,owner_id:session.user.id}).select('id,name,slug,owner_id').single()
  if(createError)throw createError
  const created=data as Workspace
  setWorkspaces(current=>[...current,created]);setWorkspace(created)
 }
 const signOut=async()=>{if(supabase)await supabase.auth.signOut()}
 const value=useMemo(()=>({session,user:session?.user||null,workspace,workspaces,loading,configured:isSupabaseConfigured,error,selectWorkspace,createWorkspace,signOut}),[session,workspace,workspaces,loading,error])
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be used within AuthProvider');return value}
