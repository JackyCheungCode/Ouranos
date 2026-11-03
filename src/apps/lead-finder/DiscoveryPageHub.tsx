import './DiscoveryPageHub.css'

export type DiscoveryPageDefinition = {
  id: string
  title: string
  subtitle: string
  description: string
  group: string
  platformKeys: string[]
  platformNames: string[]
  filters: string[]
  outputs: string
  rule: string
}

export const discoveryPages: DiscoveryPageDefinition[] = [
  { id:'linkedin-candidates', title:'从 LinkedIn 发现', subtitle:'职业联系人与决策人', description:'按关键词、国家、职位、技能和资历发现公开职业主页；人工清洗后，再补充公开可用的职业资料与联系方式。', group:'职业社交平台', platformKeys:['linkedin'], platformNames:['LinkedIn'], filters:['关键词','国家 / 地区','职位','技能','资历 / 经验'], outputs:'LinkedIn 主页、职业信息、公开邮箱 / 电话', rule:'先发现、后人工筛选；只补全公开可用联系方式。' },
  { id:'facebook-pages', title:'从 Facebook 发现', subtitle:'个人资料与职业联系人', description:'按职业、行业或业务关键词发现公开 Facebook 个人资料，可选择国家 / 地区、城市和抓取数量，并在三个固定 Actor 中选择一个执行。', group:'社交媒体平台', platformKeys:['facebook'], platformNames:['Facebook'], filters:['职业 / 行业关键词','国家 / 城市','抓取人数','个人公开资料'], outputs:'公开个人主页、姓名、职业、雇主、学校、城市及公开主页详情（以 Actor 实际返回为准）', rule:'只采集公开可见的个人资料；不读取私密内容，不承诺获取邮箱或电话。' },
]

const iconMap: Record<string,string> = {
  'linkedin-candidates': 'fab fa-linkedin-in',
  'facebook-pages': 'fab fa-facebook-f',
}

const groups = ['职业社交平台','社交媒体平台']

export default function DiscoveryPageHub({ onSelect }: { onSelect: (page: DiscoveryPageDefinition) => void }) {
  return <div className="ldp-hub">
    <div className="ldp-intro">
      <div><span className="ldp-eyebrow">CUSTOMER DISCOVERY</span><h2>选择发现平台</h2><p>只展示能够直接发现潜在客户的平台入口。每个平台使用统一中文搜索表单，并按所选 Actor 的参数规则提交；Facebook 固定 Actor 无需人工审核；其他渠道仍按各自配置规则执行。</p></div>
      <div className="ldp-count"><b>2</b><span>个平台入口</span></div>
    </div>
    <div className="ldp-rule"><b>平台准入规则</b><span>仅保留能按关键词等条件直接发现企业或职业客户的渠道。只能处理已知 URL、抓取内容或评论的工具不单独作为客户发现入口；Actor 必须通过客户资料输出审核后才可执行。</span></div>
    {groups.map(group => <section className="ldp-group" key={group}>
      <div className="ldp-group-head"><h3>{group}</h3><span>{discoveryPages.filter(page=>page.group===group).length} 个入口</span></div>
      <div className="ldp-grid">{discoveryPages.filter(page=>page.group===group).map(page => {
        const iconClass = iconMap[page.id]
        return <button type="button" className="ldp-card" key={page.id} onClick={()=>onSelect(page)}>
          <span className="ldp-card-icon"><i className={iconClass} aria-hidden="true"/></span>
          <span className="ldp-card-main"><b>{page.title}</b><small>{page.subtitle}</small><span>{page.description}</span></span>
          <span className="ldp-card-meta"><span>{page.platformNames.slice(0,4).join(' · ')}{page.platformNames.length>4?' 等':''}</span><span>主要条件：{page.filters.slice(0,3).join(' · ')}</span><i>进入页面 →</i></span>
        </button>
      })}</div>
    </section>)}
    <div className="ldp-footnote"><span>数据源是否可执行以服务商连接状态、Actor 配置状态和平台访问规则为准。</span></div>
  </div>
}
