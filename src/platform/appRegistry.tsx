
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
    name: '线索发展',
    englishName: 'Lead Development',
    description: '发现潜在客户，拓展业务机会。',
    tagline: '从市场发现到销售机会',
    icon: 'fa-solid fa-magnifying-glass-chart',
    color: '#714B67',
    category: '业务应用',
    navigation: ['工作台', '线索发现', '线索池', '采集任务'],
  },
  {
    id: 'settings',
    name: '系统设置',
    englishName: 'Settings',
    description: '管理工作空间、用户权限与系统集成。',
    tagline: '统一管理系统配置',
    icon: 'fa-solid fa-sliders',
    color: '#65758B',
    category: '管理',
    navigation: ['工作台', '用户与权限', '系统集成', '工作空间'],
  },
]

export const getPlatformApp = (id: PlatformAppId) =>
  platformApps.find(app => app.id === id) ?? platformApps[0]
