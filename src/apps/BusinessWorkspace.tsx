import { useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, Bell, CheckCircle2, ChevronDown, Clock3, FileText, Link2, MessageSquare, Paperclip, Plus, Search, Send, Settings2, ShieldCheck, Truck, UserRound, Wallet } from 'lucide-react'
import type { AppItem } from './types'

type Props = { app: AppItem }
type RecordItem = { id: string; name: string; customer: string; status: string; amount: string; date: string; owner: string; reference: string; note: string }
const stageMap: Record<string, string[]> = {
  quotations: ['草稿','已发送','客户确认','已转订单','已取消'],
  pipeline: ['新建','需求确认','方案制定','报价谈判','赢单','丢单'],
  crm: ['潜在客户','已联系','合格客户','客户','暂停'],
  shipments: ['草稿','待拣货','待发货','已发货','已签收'],
  invoices: ['草稿','已过账','部分收款','已结清','逾期'],
  aftersales: ['新建','待受理','处理中','待客户确认','已关闭'],
  orders: ['报价转入','待确认','销售确认','备货中','已完成','已取消'],
  default: ['草稿','处理中','待确认','已完成','已取消'],
}
const records: Record<string, RecordItem[]> = {
  quotations: [
    {id:'QT-2026-0048',name:'工业阀门年度采购报价',customer:'Northstar Industrial GmbH',status:'已发送',amount:'USD 48,600.00',date:'2026-10-28',owner:'Alex Chen',reference:'SO-2026-0031',note:'客户要求报价有效期 30 天，Incoterms: FOB Shanghai。'},
    {id:'QT-2026-0047',name:'不锈钢管件报价',customer:'Pacific Flow Systems',status:'草稿',amount:'USD 12,840.00',date:'2026-10-30',owner:'Mia Liu',reference:'—',note:'等待供应链确认交期。'},
    {id:'QT-2026-0043',name:'泵阀配件补充报价',customer:'Atlas Process Solutions',status:'客户确认',amount:'EUR 8,920.00',date:'2026-10-21',owner:'Alex Chen',reference:'SO-2026-0029',note:'客户邮件确认价格与数量。'},
  ],
  orders: [
    {id:'SO-2026-0031',name:'工业阀门采购订单',customer:'Northstar Industrial GmbH',status:'销售确认',amount:'USD 48,600.00',date:'2026-10-29',owner:'Alex Chen',reference:'QT-2026-0048 · DN-2026-0012',note:'由报价单 QT-2026-0048 转入。'},
    {id:'SO-2026-0030',name:'不锈钢管件订单',customer:'Pacific Flow Systems',status:'备货中',amount:'USD 12,840.00',date:'2026-10-24',owner:'Mia Liu',reference:'QT-2026-0044',note:'仓库正在准备出货。'},
  ],
  shipments: [
    {id:'DN-2026-0012',name:'Northstar 首批出货',customer:'Northstar Industrial GmbH',status:'待发货',amount:'USD 24,300.00',date:'2026-10-31',owner:'Leo Wang',reference:'SO-2026-0031',note:'已完成质检，等待物流提货。'},
    {id:'DN-2026-0011',name:'Pacific 管件出货',customer:'Pacific Flow Systems',status:'已发货',amount:'USD 12,840.00',date:'2026-10-27',owner:'Leo Wang',reference:'SO-2026-0030',note:'物流单号待同步。'},
  ],
  invoices: [
    {id:'INV-2026-0022',name:'Northstar 预付款发票',customer:'Northstar Industrial GmbH',status:'部分收款',amount:'USD 14,580.00',date:'2026-10-30',owner:'Finance Team',reference:'SO-2026-0031',note:'已收到 30% 预付款。'},
    {id:'INV-2026-0021',name:'Atlas 配件尾款',customer:'Atlas Process Solutions',status:'已结清',amount:'EUR 8,920.00',date:'2026-10-22',owner:'Finance Team',reference:'SO-2026-0029',note:'银行到账已核销。'},
  ],
  aftersales: [
    {id:'RMA-2026-0008',name:'阀门密封件质量反馈',customer:'Northstar Industrial GmbH',status:'处理中',amount:'—',date:'2026-10-31',owner:'Service Team',reference:'SO-2026-0031 · DN-2026-0012',note:'客户反馈 2 件密封件需要检查。'},
    {id:'RMA-2026-0007',name:'管件包装破损',customer:'Pacific Flow Systems',status:'待客户确认',amount:'—',date:'2026-10-25',owner:'Service Team',reference:'SO-2026-0030 · DN-2026-0011',note:'已提交补发方案，等待客户回复。'},
  ],
  crm: [
    {id:'CUS-00081',name:'Northstar Industrial GmbH',customer:'Northstar Industrial GmbH',status:'客户',amount:'USD 48,600 pipeline',date:'2026-09-12',owner:'Alex Chen',reference:'QT-0048 · SO-0031 · INV-0022 · RMA-0008',note:'德国工业设备采购商，重点跟进年度采购项目。'},
    {id:'CUS-00080',name:'Pacific Flow Systems',customer:'Pacific Flow Systems',status:'客户',amount:'USD 12,840 pipeline',date:'2026-09-08',owner:'Mia Liu',reference:'QT-0047 · SO-0030 · DN-0011 · RMA-0007',note:'美国流体系统集成商。'},
  ],
}
const fieldSets: Record<string, string[]> = {
  quotations:['报价单编号','客户','联系人','报价日期','有效期至','币种','付款条件','贸易术语 Incoterms','交货地点','交期','销售负责人','客户采购编号','产品明细','数量','单价','折扣','税率','小计','税额','总计','备注与条款'],
  orders:['销售订单号','客户','联系人','来源报价单','客户采购订单号','订单日期','要求交期','币种','付款条件','贸易术语','收货地址','账单地址','销售负责人','产品明细','数量','单价','折扣','税额','订单总额'],
  shipments:['出货单号','来源销售订单','客户','收货联系人','发货仓库','物流商','物流方式','运单号','发货日期','预计到达','实际签收日期','包装件数','毛重','净重','体积','出口报关号','产品明细','出货数量','质检状态','签收凭证'],
  invoices:['收款/发票编号','客户','关联销售订单','关联出货单','发票日期','到期日期','币种','付款方式','应收金额','已收金额','未收余额','银行流水号','核销日期','财务负责人','备注'],
  aftersales:['售后单号','客户','关联订单','关联出货单','问题类型','问题描述','严重程度','产品/SKU','问题数量','批次/序列号','附件/照片','责任归属','处理方案','补发/退款金额','负责人','客户确认日期','关闭原因'],
  crm:['客户编号','企业名称','企业简称','官网','国家/地区','州/省','城市','行业','企业规模','企业类型','税号/注册号','注册地址','账单地址','收货地址','主联系人','联系人职位','邮箱','电话','WhatsApp','LinkedIn','来源渠道','客户等级','客户标签','销售负责人','付款条件','信用额度','币种','语言','时区','备注'],
  default:['记录编号','名称','关联客户','负责人','业务日期','来源','状态','优先级','金额/数量','标签','描述','备注'],
}
const related = [{label:'报价单',icon:FileText},{label:'销售订单',icon:FileText},{label:'出货单',icon:Truck},{label:'收款单',icon:Wallet},{label:'售后单',icon:ShieldCheck}]
const initialLogs = [
  {who:'Alex Chen',time:'今天 10:42',text:'更新了交付日期',detail:'交付日期：2026-11-15 → 2026-11-20'},
  {who:'Mia Liu',time:'昨天 16:18',text:'添加内部备注',detail:'客户要求所有文件提供英文版本。'},
  {who:'系统',time:'10月29日 09:30',text:'状态变更',detail:'草稿 → 已发送'},
]
export default function BusinessWorkspace({app}: Props) {
  const [items,setItems] = useState<RecordItem[]>(records[app.id] ?? [{id:'—',name:'暂无业务记录',customer:'—',status:'待配置',amount:'—',date:'—',owner:'—',reference:'—',note:'当前模块尚未接入真实业务数据。'}])
  const [selected,setSelected] = useState(0)
  const [tab,setTab] = useState('记录')
  const [search,setSearch] = useState('')
  const [logs,setLogs] = useState(initialLogs)
  const [comment,setComment] = useState('')
  const [showForm,setShowForm] = useState(false)
  const [draftName,setDraftName] = useState('')
  const stages = stageMap[app.id] ?? stageMap.default
  const current = items[selected] ?? items[0]
  const filtered = useMemo(()=>items.filter(x=>(x.id+' '+x.name+' '+x.customer+' '+x.status).toLowerCase().includes(search.toLowerCase())),[items,search])
  const fields = fieldSets[app.id] ?? fieldSets.default
  const isCustomer = app.id === 'crm'
  const advance = () => {
    const next = stages[Math.min(stages.indexOf(current.status)+1,stages.length-1)] ?? stages[0]
    if(next===current.status)return
    setItems(old=>old.map((x,i)=>i===selected?{...x,status:next}:x))
    setLogs(old=>[{who:'当前用户',time:'刚刚',text:'状态已更新',detail:current.status+' → '+next},...old])
  }
  const addComment = () => { if(!comment.trim())return; setLogs(old=>[{who:'当前用户',time:'刚刚',text:'发布了消息',detail:comment.trim()},...old]);setComment('') }
  const createRecord = () => { if(!draftName.trim())return; const row={id:app.id.toUpperCase().slice(0,3)+'-NEW-'+String(items.length+1).padStart(3,'0'),name:draftName.trim(),customer:'待选择客户',status:stages[0],amount:'—',date:new Date().toISOString().slice(0,10),owner:'当前用户',reference:'—',note:'新建记录（前端演示，尚未保存到业务数据库）'};setItems(old=>[row,...old]);setSelected(0);setDraftName('');setShowForm(false);setTab('详情');setLogs(old=>[{who:'当前用户',time:'刚刚',text:'创建了记录',detail:row.id+' · '+row.name},...old]) }
  return <div className="odoo-workspace">
    <div className="ow-head"><div><div className="ow-kicker">{app.group.toUpperCase()} / 业务管理</div><h1>{app.name}</h1><p>{app.description}</p></div><div className="ow-head-actions"><span className="ow-demo"><Clock3 size={13}/> 演示数据 · 待联调</span><button className="ow-primary" onClick={()=>setShowForm(v=>!v)}><Plus size={15}/> 新建</button></div></div>
    <div className="ow-stat-row"><div><small>记录总数</small><b>{items.length}</b></div><div><small>处理中</small><b>{items.filter(x=>!['已完成','已结清','已签收','客户','已取消'].includes(x.status)).length}</b></div><div><small>本月更新</small><b>{items.length}</b></div><div><small>待联调</small><b>—</b></div></div>
    <div className="ow-toolbar"><div className="ow-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索编号、名称、客户或状态..."/></div><button className="ow-light"><Settings2 size={14}/> 筛选</button><button className="ow-light"><ChevronDown size={14}/> 分组</button><button className="ow-light">列表视图⌄</button></div>
    {showForm&&<div className="ow-create"><div><b>新建{app.name}记录</b><p>此表单为前端交互预览，保存动作不会写入真实数据库。</p></div><input value={draftName} onChange={e=>setDraftName(e.target.value)} placeholder="输入记录名称"/><button className="ow-primary" onClick={createRecord}>创建记录</button><button className="ow-light" onClick={()=>setShowForm(false)}>取消</button></div>}
    <div className="ow-main-grid"><section className="ow-list-panel"><div className="ow-list-title"><b>业务记录</b><span>{filtered.length} 条</span></div><div className="ow-list">{filtered.map((item)=>{const idx=items.indexOf(item);return <button key={item.id} className={'ow-record '+(selected===idx?'active':'')} onClick={()=>{setSelected(idx);setTab('详情')}}><span className="ow-record-top"><b>{item.id}</b><em>{item.status}</em></span><strong>{item.name}</strong><span className="ow-record-meta">{item.customer}</span><span className="ow-record-bottom"><span>{item.date}</span><b>{item.amount}</b></span></button>})}</div></section>
      <section className="ow-detail"><div className="ow-detail-top"><div><span className="ow-ref">{current.id}</span><h2>{current.name}</h2><p>{current.customer} · 负责人：{current.owner}</p></div><button className="ow-light"><Bell size={14}/></button></div>
        <div className="ow-flow">{stages.map((s,i)=>{const at=stages.indexOf(current.status);return <div key={s} className={'ow-stage '+(i<at?'done':i===at?'current':'')}><span>{i<at?<CheckCircle2 size={13}/>:i+1}</span><small>{s}</small></div>})}</div>
        <div className="ow-actions"><button className="ow-primary" onClick={advance}>{current.status===stages[stages.length-1]?'已到最终状态':'推进到下一状态'} <ArrowRight size={14}/></button><button className="ow-light" onClick={()=>setTab('日志')}><MessageSquare size={14}/> 记录消息</button><button className="ow-light"><Paperclip size={14}/> 附件</button></div>
        <div className="ow-tabs">{['详情','关联记录','日志','字段'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
        {tab==='详情'&&<><div className="ow-section-title">基本信息</div><div className="ow-fields">{[['客户',current.customer],['状态',current.status],['业务日期',current.date],['负责人',current.owner],['金额 / 价值',current.amount],['关联单据',current.reference],['记录名称',current.name],['内部说明',current.note]].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div><div className="ow-section-title">业务关系</div><div className="ow-related-grid">{related.map((r,i)=>{const I=r.icon;return <button key={r.label} onClick={()=>setTab('关联记录')}><I size={17}/><span>{r.label}</span><b>{i===0?'1':i===1?'1':i===2?'1':i===3?'1':'1'}</b></button>})}</div></>}
        {tab==='关联记录'&&<><div className="ow-section-title">关联业务单据</div><div className="ow-linked"><div><b>{current.customer}</b><small>客户档案 · CUS-00081</small></div><ArrowLeft size={14}/><div><b>{current.id}</b><small>当前单据</small></div></div><div className="ow-related-grid">{related.map((r,i)=>{const I=r.icon;return <div key={r.label}><I size={16}/><span>{r.label}</span><b>{i===0?'QT-2026-0048':i===1?'SO-2026-0031':i===2?'DN-2026-0012':i===3?'INV-2026-0022':'RMA-2026-0008'}</b></div>})}</div><p className="ow-hint">关联编号为流程演示数据；实际关联关系将在业务数据模型接通后按真实外键展示。</p></>}
        {tab==='字段'&&<><div className="ow-section-title">完整字段清单 · {fields.length} 项</div><div className="ow-fields">{fields.map((f,i)=><div key={f}><small>{f}</small><b>{i===0?current.id:i===1?current.customer:'待填写 / 待联调'}</b></div>)}</div></>}
        {tab==='日志'&&<><div className="ow-section-title">沟通记录与修改历史（Chatter）</div><div className="ow-composer"><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="写消息、记录客户沟通或内部备注..."/><button className="ow-primary" onClick={addComment}><Send size={14}/> 发布</button></div><div className="ow-log-list">{logs.map((log,i)=><div className="ow-log" key={i}><span className="ow-avatar">{log.who.slice(0,1)}</span><div><b>{log.who}</b><small>{log.time}</small><p>{log.text}</p><em>{log.detail}</em></div></div>)}</div></>}
      </section></div>
    <div className="ow-footnote"><Activity size={13}/> 修改日志、状态变更和关联单据目前为前端交互预览；正式审计日志需由后端记录操作者、时间、字段旧值/新值及关联单据 ID。</div>
  </div>
}
