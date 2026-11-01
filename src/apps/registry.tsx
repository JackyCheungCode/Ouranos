import {
  Activity, BarChart3, Bot, Building2, CalendarClock, Check, ClipboardList, Cloud,
  Contact, Database, FileText, Globe2, LayoutDashboard, Mail, Network, Send,
  Settings, ShieldCheck, Sparkles, Target, TrendingUp, Users, WandSparkles,
  Workflow, Zap, Boxes, Layers3
} from 'lucide-react'
import type { AppItem, AppGroup } from './types'

export const groups: AppGroup[] = [
  { id: 'workspace', title: '工作空间', subtitle: '集中处理日常工作与待办事项' },
  { id: 'prospecting', title: '客户开发', subtitle: '发现潜在客户与目标企业' },
  { id: 'sales', title: '销售管理', subtitle: '管理商机、报价与客户关系' },
  { id: 'data', title: '数据智能', subtitle: '构建可信赖的商业数据资产' },
  { id: 'ai', title: 'AI 智能', subtitle: '使用人工智能研究与自动化' },
  { id: 'marketing', title: '营销中心', subtitle: '触达目标客户并开展营销活动' },
  { id: 'analytics', title: '商业分析', subtitle: '洞察销售表现与市场机会' },
  { id: 'admin', title: '系统管理', subtitle: '配置工作空间、成员与权限' },
]
export const apps: AppItem[] = [
  { id:'dashboard',name:'工作台',subtitle:'业务总览',group:'workspace',icon:LayoutDashboard,color:'#714B67',description:'集中查看客户开发、销售活动与团队绩效的整体情况。' },
  { id:'activities',name:'我的待办',subtitle:'任务与提醒',group:'workspace',icon:CalendarClock,color:'#E08B36',description:'在统一工作区管理每日重点、客户跟进与待办提醒。' },
  { id:'lead-finder',name:'潜在客户搜索',subtitle:'发现潜在客户',group:'prospecting',icon:Target,color:'#167D9A',description:'按国家、行业、产品和企业画像发现目标客户。' },
  { id:'companies',name:'企业数据库',subtitle:'企业档案',group:'prospecting',icon:Building2,color:'#4776B8',description:'搜索企业资料、官方网站、所在地及商业信息。' },
  { id:'contacts',name:'联系人搜索',subtitle:'寻找决策人',group:'prospecting',icon:Contact,color:'#239B82',description:'寻找采购经理、企业高管及其他关键业务联系人。' },
  { id:'market-intel',name:'市场情报',subtitle:'市场研究',group:'prospecting',icon:Globe2,color:'#A16BB5',description:'研究市场需求、行业趋势、国家机会与潜在风险。' },
  { id:'competitors',name:'竞争对手搜索',subtitle:'竞争格局',group:'prospecting',icon:Network,color:'#C16D4A',description:'梳理竞争企业、同类供应商、品牌及市场参与者。' },
  { id:'crm',name:'客户关系管理',subtitle:'客户关系',group:'sales',icon:Users,color:'#714B67',description:'管理客户档案、联系人、沟通历史与负责人。' },
  { id:'pipeline',name:'销售管道',subtitle:'商机阶段',group:'sales',icon:Workflow,color:'#168A9A',description:'跟踪从新线索、需求沟通到谈判及成交的每个商机。' },
  { id:'quotations',name:'报价管理',subtitle:'价格与报价单',group:'sales',icon:FileText,color:'#C18A32',description:'创建、整理并跟踪客户报价单及商务条款。' },
  { id:'sales-activities',name:'销售活动',subtitle:'电话与会议',group:'sales',icon:ClipboardList,color:'#4776B8',description:'记录电话、会议、邮件以及下一次客户触达计划。' },
  { id:'data-hub',name:'数据中心',subtitle:'统一数据集',group:'data',icon:Database,color:'#4776B8',description:'导入、整理和浏览来自多个渠道的商业数据。' },
  { id:'providers',name:'数据服务商',subtitle:'数据源与 API',group:'data',icon:Cloud,color:'#168A9A',description:'管理已连接的数据源、服务状态、用量与成本。' },
  { id:'enrichment',name:'数据补全',subtitle:'完善数据档案',group:'data',icon:WandSparkles,color:'#A16BB5',description:'为企业和联系人档案补充更多商业信息。' },
  { id:'cleaning',name:'数据清洗',subtitle:'质量与去重',group:'data',icon:Check,color:'#239B82',description:'标准化、验证并去除企业和联系人数据中的重复项。' },
  { id:'trade',name:'贸易情报',subtitle:'进出口数据',group:'data',icon:Boxes,color:'#C16D4A',description:'分析贸易活动、产品编码、采购商、供应商与贸易趋势。' },
  { id:'copilot',name:'AI 助手',subtitle:'智能工作助手',group:'ai',icon:Sparkles,color:'#714B9B',description:'通过自然语言查询数据，并获取 Ouranos 工作流程建议。' },
  { id:'research',name:'AI 深度调研',subtitle:'企业深度研究',group:'ai',icon:Bot,color:'#4776B8',description:'生成有依据的企业、产品、行业与市场研究报告。' },
  { id:'scoring',name:'线索评分',subtitle:'优先级排序',group:'ai',icon:TrendingUp,color:'#239B82',description:'根据理想客户画像评估线索，并解释每项评分依据。' },
  { id:'agents',name:'AI 智能体',subtitle:'自动化工作流',group:'ai',icon:Zap,color:'#D28A36',description:'编排多步骤研究、数据补全与潜在客户筛选流程。' },
  { id:'email-marketing',name:'邮件营销',subtitle:'邮件活动',group:'marketing',icon:Mail,color:'#4776B8',description:'创建定向邮件营销活动，并监控送达与互动情况。' },
  { id:'sequences',name:'邮件序列',subtitle:'自动跟进',group:'marketing',icon:Send,color:'#239B82',description:'构建定时邮件跟进序列，并管理审批与退订设置。' },
  { id:'campaigns',name:'营销活动',subtitle:'活动管理',group:'marketing',icon:Layers3,color:'#C16D4A',description:'统筹市场、产品、展会及客户开发营销活动。' },
  { id:'templates',name:'模板中心',subtitle:'可复用内容',group:'marketing',icon:FileText,color:'#A16BB5',description:'保存可复用的客户开发邮件、报价、研究及 AI 提示词模板。' },
  { id:'sales-analytics',name:'销售分析',subtitle:'销售表现',group:'analytics',icon:BarChart3,color:'#168A9A',description:'分析销售活动、转化率、销售管道健康度与团队表现。' },
  { id:'market-analytics',name:'市场分析',subtitle:'市场表现',group:'analytics',icon:Globe2,color:'#4776B8',description:'洞察潜在客户分布、行业覆盖范围与市场机会。' },
  { id:'users',name:'用户与团队',subtitle:'成员与组织',group:'admin',icon:Users,color:'#714B67',description:'管理工作空间成员、团队、数据归属与组织架构。' },
  { id:'permissions',name:'角色与权限',subtitle:'访问控制',group:'admin',icon:ShieldCheck,color:'#239B82',description:'配置基于角色的访问权限，控制数据查看与修改范围。' },
  { id:'settings',name:'系统设置',subtitle:'工作空间配置',group:'admin',icon:Settings,color:'#68758A',description:'配置工作空间偏好、默认选项及业务参数。' },
  { id:'integrations',name:'系统集成',subtitle:'连接外部服务',group:'admin',icon:Network,color:'#C18A4A',description:'连接外部工具并配置获准使用的系统集成。' },
]
export const recentIds = ['lead-finder','companies','crm','market-intel']
export const initialFavorites = ['dashboard','lead-finder','crm','research']
