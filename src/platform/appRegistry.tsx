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
    description: '从多个公开渠道发现潜在客户，并将结果沉淀到统一线索中心。',
    tagline: '从市场发现到可用线索',
    icon: 'fas fa-search',
    color: '#714B67',
    category: '客户开发',
    navigation: ['发现平台', '采集任务', '线索结果'],
  },
  {
    id: 'settings',
    name: '系统管理',
    englishName: 'System Management',
    description: '统一管理数据服务、AI 模型和工作空间配置。',
    tagline: '管理数据源与系统能力',
    icon: 'fas fa-sliders-h',
    color: '#65758B',
    category: '管理',
    navigation: ['数据服务', 'AI 模型', '工作空间'],
  },
]

export const getPlatformApp = (id: PlatformAppId) =>
  platformApps.find(app => app.id === id) ?? platformApps[0]
