import type { LucideIcon } from 'lucide-react'
import { Building2, ContactRound, Settings2 } from 'lucide-react'

export type PlatformAppId = 'lead-development' | 'customers' | 'settings'

export type PlatformApp = {
  id: PlatformAppId
  name: string
  englishName: string
  description: string
  tagline: string
  icon: LucideIcon
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
    icon: Building2,
    color: '#714B67',
    category: '业务应用',
    navigation: ['工作台', '线索发现', '线索池', '采集任务'],
  },
  {
    id: 'customers',
    name: '客户管理',
    englishName: 'Customer Management',
    description: '集中管理企业、联系人与客户关系。',
    tagline: '建立完整的客户关系视图',
    icon: ContactRound,
    color: '#287A78',
    category: '业务应用',
    navigation: ['工作台', '客户', '联系人', '客户活动'],
  },
  {
    id: 'settings',
    name: '系统设置',
    englishName: 'Settings',
    description: '管理工作空间、用户权限与系统集成。',
    tagline: '统一管理系统配置',
    icon: Settings2,
    color: '#65758B',
    category: '管理',
    navigation: ['工作台', '用户与权限', '系统集成', '工作空间'],
  },
]

export const getPlatformApp = (id: PlatformAppId) =>
  platformApps.find(app => app.id === id) ?? platformApps[0]
