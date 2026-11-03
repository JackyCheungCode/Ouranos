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
