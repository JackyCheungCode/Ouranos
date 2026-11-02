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
  { id:'facebook-pages', title:'从 Facebook 发现', subtitle:'企业主页与本地商业客户', description:'通过 Apify 的 Facebook Pages & Business Leads Scraper，按行业关键词和城市直接发现公开企业主页，并提取企业类别、官网、地址、公开电话及邮箱（以主页实际公开字段为准）。推荐 Actor：coregent/facebook-pages-leads-scraper。', group:'社交媒体平台', platformKeys:['facebook'], platformNames:['Facebook'], filters:['行业 / 产品关键词','国家 / 城市','企业主页类别','结果数量','公开联系方式'], outputs:'Facebook 企业主页、企业类别、官网、地址、公开电话 / 邮箱', rule:'仅发现公开 Facebook 企业主页与商家页面；不把个人主页、帖子、评论、群组或活动当作客户。' },
]

const iconMap: Record<string,string> = {
  'linkedin-candidates': 'fab fa-linkedin-in',
  'facebook-pages': 'fab fa-facebook-f',
}

const groups = ['职业社交平台','社交媒体平台']

export default function DiscoveryPageHub({ onSelect }: { onSelect: (page: DiscoveryPageDefinition) => void }) {
  return <div className="ldp-hub">
    <div className="ldp-intro">
      <div><span className="ldp-eyebrow">CUSTOMER DISCOVERY</span><h2>选择发现平台</h2><p>只展示能够直接发现潜在客户的平台入口。每个平台使用独立的 Actor、参数 Schema 和客户资料审核流程。</p></div>
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
    <div className="ldp-footnote"><span>数据源是否可执行以服务商连接状态、Actor 输出审核状态和平台访问规则为准。</span></div>
  </div>
}
