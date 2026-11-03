export type PlatformAppId = 'lead-development' | 'settings'

export type PlatformApp = {
  id: PlatformAppId
  name: string
  englishName: string
  description: string
  tagline: string
  icon: string
  color: string
  category: string
  navigation: string[]
}

export const platformApps: PlatformApp[] = [
  {
    id: 'lead-development',
    name: '线索发现',
    englishName: 'Lead Discovery',
    description: '发现公开潜在客户，管理采集任务、原始数据与线索审核。',
    tagline: '从市场发现到可用线索',
    icon: 'fas fa-search',
    color: '#714B67',
    category: '客户开发',
    navigation: ['发现平台', '采集任务', '采集数据', '线索收件箱'],
  },
  {
    id: 'settings',
    name: '系统管理',
    englishName: 'System Management',
    description: '统一管理第三方数据服务、AI 模型与系统连接。',
    tagline: '管理数据源与系统能力',
    icon: 'fas fa-sliders-h',
    color: '#65758B',
    category: '管理',
    navigation: ['设置概览', 'API 集成设置', 'AI 集成'],
  },
]

export const getPlatformApp = (id: PlatformAppId) =>
  platformApps.find(app => app.id === id) ?? platformApps[0]

export type ModuleStatus = 'active' | 'prototype' | 'planned' | 'merged'

export type ModuleRoadmapItem = {
  id: string
  name: string
  group: string
  status: ModuleStatus
  note: string
}

/**
 * Product capability inventory, not a navigation source.
 * "prototype" means the current page is local/demo state and is not persisted.
 */
export const moduleRoadmap: ModuleRoadmapItem[] = [
  { id:'dashboard', name:'工作台', group:'工作空间', status:'planned', note:'尚无独立工作台页面。' },
  { id:'activities', name:'我的待办', group:'工作空间', status:'prototype', note:'仅有通用演示工作流，尚未接入统一待办数据。' },
  { id:'lead-finder', name:'线索发现', group:'客户开发', status:'active', note:'已接入发现入口、任务、采集数据与线索审核。' },
  { id:'companies', name:'企业数据库', group:'客户开发', status:'prototype', note:'存在本地演示页面，尚未接入持久化企业档案。' },
  { id:'contacts', name:'联系人搜索', group:'客户开发', status:'planned', note:'尚无独立联系人搜索模块。' },
  { id:'market-intel', name:'市场情报', group:'客户开发', status:'planned', note:'尚无独立市场研究工作区。' },
  { id:'competitors', name:'竞争对手搜索', group:'客户开发', status:'planned', note:'尚无独立竞品发现流程。' },
  { id:'crm', name:'客户关系管理', group:'销售管理', status:'prototype', note:'存在本地演示记录，尚未接入 CRM 数据模型。' },
  { id:'pipeline', name:'销售管道', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'quotations', name:'报价管理', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'orders', name:'销售订单', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'shipments', name:'出货管理', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'invoices', name:'收款管理', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'aftersales', name:'售后服务', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'sales-activities', name:'销售活动', group:'销售管理', status:'prototype', note:'当前为通用本地演示页面。' },
  { id:'data-hub', name:'数据中心', group:'数据智能', status:'planned', note:'尚无统一数据集管理页面。' },
  { id:'providers', name:'数据源目录', group:'数据智能', status:'merged', note:'服务商配置已归入系统管理的 API 集成设置。' },
  { id:'enrichment', name:'数据补全', group:'数据智能', status:'planned', note:'尚无独立、完整的数据补全工作区。' },
  { id:'cleaning', name:'数据清洗', group:'数据智能', status:'planned', note:'尚无独立数据清洗工作区。' },
  { id:'trade', name:'贸易情报', group:'数据智能', status:'planned', note:'有发现入口概念，尚无完整贸易数据产品流程。' },
  { id:'copilot', name:'AI 助手', group:'AI 智能', status:'prototype', note:'发现配置中有 AI 辅助能力，尚无独立助手工作区。' },
  { id:'research', name:'AI 深度调研', group:'AI 智能', status:'planned', note:'尚无独立研究报告工作区。' },
  { id:'scoring', name:'线索评分', group:'AI 智能', status:'prototype', note:'线索审核中展示评分字段，尚未形成完整评分管理模块。' },
  { id:'agents', name:'AI 智能体', group:'AI 智能', status:'planned', note:'尚无可视化智能体编排工作区。' },
  { id:'email-marketing', name:'邮件营销', group:'营销中心', status:'prototype', note:'仅有通用本地演示页面，未接入邮件发送服务。' },
  { id:'sequences', name:'邮件序列', group:'营销中心', status:'prototype', note:'仅有通用本地演示页面，未接入自动发送。' },
  { id:'campaigns', name:'营销活动', group:'营销中心', status:'prototype', note:'仅有通用本地演示页面，未接入活动数据。' },
  { id:'templates', name:'模板中心', group:'营销中心', status:'planned', note:'尚无独立模板管理模块。' },
  { id:'sales-analytics', name:'销售分析', group:'商业分析', status:'planned', note:'尚无真实销售数据分析页面。' },
  { id:'market-analytics', name:'市场分析', group:'商业分析', status:'planned', note:'尚无真实市场数据分析页面。' },
  { id:'users', name:'用户与团队', group:'系统管理', status:'planned', note:'尚无完整成员与团队管理页面。' },
  { id:'permissions', name:'角色与权限', group:'系统管理', status:'planned', note:'尚无完整角色权限管理页面。' },
  { id:'settings', name:'系统设置', group:'系统管理', status:'active', note:'API 集成、Actor 管理与 AI 模型设置已接入。' },
  { id:'integrations', name:'系统集成', group:'系统管理', status:'merged', note:'独立旧入口已合并到系统管理，避免重复配置。' },
]

export const recentIds = ['lead-development', 'settings']
export const initialFavorites = ['lead-development', 'settings']
