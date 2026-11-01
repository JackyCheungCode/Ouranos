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
  activities: ['待办','进行中','已完成','已取消'],
  email-marketing: ['草稿','待审核','已排期','发送中','已发送','已归档'],
  sequences: ['草稿','待审核','运行中','已暂停','已完成'],
  campaigns: ['计划中','准备中','进行中','已结束','已取消'],
  agents: ['未发布','已发布','运行中','已暂停','异常'],
  pipeline: ['新建','需求确认','方案制定','报价谈判','赢单','丢单'],
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
  companies:['企业编号','企业法定名称','企业简称','官方网站','国家/地区','州/省','城市','注册地址','行业一级分类','行业二级分类','主营产品','员工规模','年营业额区间','成立年份','企业类型','进出口属性','采购需求','供应商资质','LinkedIn 公司页','数据来源','数据可信度','最后验证时间','负责人','标签','备注'],
  contacts:['联系人编号','所属企业','姓名','职位','部门','决策角色','工作邮箱','备用邮箱','办公电话','手机','WhatsApp','微信','LinkedIn','国家/地区','语言','时区','首选联系渠道','联系人来源','邮箱验证状态','最后联系时间','负责人','备注'],
  pipeline:['商机编号','商机名称','关联客户','关键联系人','预计金额','币种','预计成交日期','销售阶段','成交概率','销售负责人','来源渠道','竞争对手','客户需求','下一步行动','下一步日期','关联报价单','丢单原因','备注'],
  'sales-activities':['活动编号','活动类型','主题','关联客户','关联联系人','关联商机','开始时间','结束时间','地点/会议链接','参与人员','沟通摘要','客户反馈','下一步行动','提醒时间','负责人','附件'],
  'data-hub':['数据集编号','数据集名称','数据来源','采集任务','记录类型','记录数量','字段映射版本','去重规则','质量评分','导入时间','最近更新','同步状态','负责人','备注'],
  providers:['服务商名称','服务类型','支持渠道','可返回字段','国家覆盖','计费模式','适配器状态','能力验证状态','文档地址','配置入口','最近验证时间','备注'],
  enrichment:['补全任务编号','目标数据类型','目标记录','补全字段','数据提供商','补全前完整度','补全后完整度','匹配置信度','费用预估','执行状态','执行时间','失败原因','负责人'],
  cleaning:['清洗任务编号','数据集','清洗规则','标准化字段','去重键','疑似重复数','确认重复数','合并策略','异常记录数','处理进度','执行人','执行时间','审查状态'],
  trade:['贸易记录编号','进口商','出口商','买方国家','卖方国家','HS 编码','产品描述','数量','数量单位','申报金额','币种','运输方式','装运日期','到港日期','港口','提单号','数据来源','数据日期'],
  'market-intel':['研究编号','研究主题','目标国家/地区','目标行业','产品关键词','市场规模','需求趋势','进口趋势','主要买家','主要竞争者','法规与准入','风险提示','数据来源','研究模型','报告状态','研究日期'],
  competitors:['竞争企业','官方网站','总部国家','目标市场','主营产品','产品价格区间','核心优势','主要客户群','渠道布局','社媒链接','员工规模','威胁等级','信息来源','最近分析日期'],
  research:['研究任务编号','研究对象','研究类型','研究范围','研究问题','指定模型','数据来源','引用数量','企业背景','产品与服务','市场定位','采购线索','风险与机会','报告文件','研究状态','执行时间'],
  scoring:['评分规则名称','目标客户','ICP 匹配度','国家匹配分','行业匹配分','产品匹配分','规模匹配分','采购意向分','数据完整度','总评分','评分等级','评分解释','模型版本','最近评分时间'],
  agents:['智能体名称','用途说明','触发方式','输入参数','执行步骤','调用模型','可用工具','权限范围','运行频率','成功率','最近运行','异常日志','发布状态','负责人'],
  'email-marketing':['活动名称','活动目标','目标客户群','发件人名称','发件邮箱','回复邮箱','邮件主题','邮件模板','发送时间','时区','预计收件人数','审批人','退订规则','送达数','打开数','点击数','退信数','活动负责人'],
  sequences:['序列名称','目标客户群','触发条件','步骤序号','邮件模板','等待间隔','发送窗口','停止条件','退订处理','审批状态','运行联系人','完成率','负责人'],
  campaigns:['活动名称','活动类型','目标市场','目标行业','开始日期','结束日期','预算','币种','目标客户数','目标线索数','渠道','负责人','活动阶段','实际花费','转化结果','复盘报告'],
  templates:['模板名称','模板类型','适用场景','语言','目标角色','主题/标题','正文内容','变量字段','版本号','共享范围','审批状态','创建人','最后修改时间'],
  'sales-analytics':['分析名称','统计周期','销售团队','销售负责人','目标市场','新增客户数','新增商机数','报价金额','订单金额','成交金额','赢单率','平均成交周期','客单价','回款金额','数据更新时间'],
  'market-analytics':['分析名称','国家/地区','行业','产品分类','潜在企业数','有效线索数','市场需求指数','竞争强度','进口趋势','客户转化率','数据来源','统计周期','更新时间'],
  users:['用户姓名','登录邮箱','所属团队','部门','岗位','角色','数据可见范围','负责客户数','账户状态','邀请状态','最后登录时间','加入时间'],
  permissions:['角色名称','角色说明','应用访问权限','记录查看权限','记录创建权限','记录编辑权限','记录删除权限','导出权限','审批权限','字段级限制','适用团队','最后修改人'],
  settings:['工作空间名称','默认语言','默认时区','默认币种','日期格式','编号规则','客户去重规则','默认贸易术语','默认付款条件','邮件签名','通知偏好','数据保留策略'],
  dashboard:['统计日期','新增线索','待审核线索','有效客户','活跃商机','待发送报价','待履约订单','待发货单据','逾期应收','待处理售后','本月成交额','本月回款额'],
  activities:['任务标题','任务类型','关联客户','关联联系人','关联商机/单据','优先级','负责人','截止日期','提醒时间','任务状态','完成时间','结果备注'],
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
