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
  { id:'map-discovery', title:'地图发现', subtitle:'本地企业与门店', description:'按国家、城市、商家类别和地理范围发现本地企业，重点获取企业名称、地址、电话、官网及公开商务资料。', group:'本地与企业发现', platformKeys:['google-maps','yelp'], platformNames:['Google Maps','Yelp'], filters:['国家 / 城市','行业类别','关键词','搜索半径','结果数量'], outputs:'企业档案、地址、电话、官网、公开邮箱', rule:'只接受商家 / 企业档案，不把地图评论当作客户。' },
  { id:'social-discovery', title:'社交媒体发现', subtitle:'品牌主页与商业账号', description:'发现具有商业属性的公开企业主页、品牌账号和创作者企业资料，按市场、行业和账号类别筛选。', group:'社交与联系人发现', platformKeys:['linkedin','facebook','instagram','tiktok','youtube','x'], platformNames:['LinkedIn','Facebook','Instagram','TikTok','YouTube','X'], filters:['国家 / 地区','行业 / 产品','账号类型','关键词','粉丝 / 规模范围'], outputs:'企业 / 商业账号档案、官网、公开商务联系方式', rule:'不采集帖子、评论、视频作为客户记录。' },
  { id:'search-engine-discovery', title:'搜索引擎发现', subtitle:'企业主体与目标官网', description:'利用搜索意图定位目标企业，再将可验证的企业名称、官网和商务资料提取为客户档案。', group:'本地与企业发现', platformKeys:['google-search','bing'], platformNames:['Google Search','Bing'], filters:['国家 / 语言','行业关键词','企业类型','域名限定','结果数量'], outputs:'经过结构化提取的企业档案', rule:'纯 SERP 链接和网页片段不进入客户库。' },
  { id:'b2b-procurement', title:'B2B 采购商发现', subtitle:'买家、进口商与贸易企业', description:'围绕产品类别、采购需求、目标国家和贸易角色，寻找可识别的买家、进口商、批发商及企业主体。', group:'电商与贸易发现', platformKeys:['alibaba','made-in-china','globalsources','indiamart'], platformNames:['Alibaba.com','Made-in-China','Global Sources','IndiaMART'], filters:['产品 / HS 编码','目标国家','买家 / 供应商角色','行业','企业规模'], outputs:'采购商 / 企业档案及可追溯来源', rule:'不把商品详情或普通产品列表作为客户档案。' },
  { id:'independent-sites', title:'独立站发现', subtitle:'品牌官网与独立店铺', description:'发现 Shopify 等独立站经营者，识别品牌主体、网站、主营产品类别和公开商务联系方式。', group:'电商与贸易发现', platformKeys:['shopify','company-sites'], platformNames:['Shopify 独立店铺','企业官方网站'], filters:['国家 / 市场','产品类别','品牌关键词','网站技术','店铺规模'], outputs:'品牌 / 企业档案、官网、公开联系资料', rule:'以店铺经营主体为客户，不把商品条目当作客户。' },
  { id:'cross-border-sellers', title:'跨境电商卖家发现', subtitle:'平台卖家与品牌经营者', description:'按平台、站点、商品类目和市场定位寻找卖家主体及其公开企业信息。', group:'电商与贸易发现', platformKeys:['amazon','ebay','walmart','etsy','aliexpress','temu','shopee','lazada'], platformNames:['Amazon','eBay','Walmart','Etsy','AliExpress','Temu','Shopee','Lazada'], filters:['销售平台','目标站点','产品类别','卖家国家','卖家评分 / 经营规模'], outputs:'卖家 / 企业档案、店铺链接、公开联系方式', rule:'只保留卖家主体资料，排除商品本身。' },
  { id:'enterprise-database', title:'企业数据库发现', subtitle:'企业注册与贸易主体', description:'从企业登记和贸易数据中识别真实经营主体，补充注册地、经营状态、进出口角色及贸易线索。', group:'本地与企业发现', platformKeys:['company-registry','trade-records'], platformNames:['企业注册信息','进出口贸易数据'], filters:['国家 / 注册地','行业','企业名称','产品 / HS 编码','进出口角色'], outputs:'企业档案、注册 / 贸易来源证据', rule:'登记记录和贸易记录必须能归属到明确企业主体。' },
  { id:'decision-makers', title:'联系人及决策人发现', subtitle:'采购经理与关键联系人', description:'围绕目标企业查找采购、销售、管理层及其他关键业务联系人，并保留其所属企业关系。', group:'社交与联系人发现', platformKeys:['linkedin'], platformNames:['LinkedIn'], filters:['目标企业','职位 / 部门','国家 / 地区','资历级别','关键词'], outputs:'联系人档案、职位、企业关联及公开职业资料', rule:'只收集公开职业信息，并遵守平台规则与适用隐私法规。' },
  { id:'industry-directories', title:'行业目录发现', subtitle:'行业名录与专业黄页', description:'按行业分类、国家和产品服务查找目录中的企业、制造商、经销商及专业服务商。', group:'本地与企业发现', platformKeys:['directories'], platformNames:['企业商业目录'], filters:['行业分类','国家 / 地区','产品 / 服务','企业类型','关键词'], outputs:'企业档案、行业类别、公开联系资料', rule:'只提取企业条目，不把目录文章或评论当作客户。' },
  { id:'tender-opportunities', title:'招投标与采购需求', subtitle:'采购单位与招标主体', description:'从公开招标和采购公告中识别采购单位、招标机构及明确的企业主体，形成可跟进的机构客户档案。', group:'商业机会发现', platformKeys:['trade-records','company-sites'], platformNames:['公开采购 / 贸易来源','企业官方网站'], filters:['国家 / 地区','采购品类','行业','公告日期','采购单位类型'], outputs:'采购单位 / 企业档案及公告来源证据', rule:'公告正文仅作为来源证据，客户记录必须对应明确机构。' },
  { id:'exhibitors', title:'展会及参展商发现', subtitle:'展商、品牌与制造商', description:'按展会名称、行业、国家和展期查找参展企业，整理展商主体、品牌、官网及公开联系方式。', group:'电商与贸易发现', platformKeys:['exhibitors'], platformNames:['展会参展商'], filters:['展会 / 活动','行业','国家 / 地区','展会年份','展商类别'], outputs:'参展企业档案、展位 / 展会来源、官网', rule:'只收录展商企业主体，不把活动日程作为客户。' },
  { id:'website-leads', title:'网站线索发现', subtitle:'官网企业与联系方式', description:'从已知企业网站、行业目录和公开商业页面提取 About、Contact、Products 等页面中的企业主体与商务联系方式。', group:'商业机会发现', platformKeys:['company-sites','directories'], platformNames:['企业官方网站','企业商业目录'], filters:['网站 / 域名','国家 / 语言','行业关键词','提取页面类型','联系方式类型'], outputs:'企业档案、官网、公开邮箱、电话及联系页面', rule:'网页内容只作为证据，结构化企业 / 联系人资料才可入库。' },
]

const iconMap: Record<string,string> = {
  'map-discovery': 'fas fa-map-marked-alt',
  'social-discovery': 'fas fa-users',
  'search-engine-discovery': 'fas fa-search',
  'b2b-procurement': 'fas fa-industry',
  'independent-sites': 'fas fa-store',
  'cross-border-sellers': 'fas fa-shopping-cart',
  'enterprise-database': 'fas fa-database',
  'decision-makers': 'fas fa-id-card',
  'industry-directories': 'fas fa-building',
  'tender-opportunities': 'fas fa-clipboard-list',
  'exhibitors': 'fas fa-calendar-alt',
  'website-leads': 'fas fa-globe',
}

const groups = ['本地与企业发现','社交与联系人发现','电商与贸易发现','商业机会发现']

export default function DiscoveryPageHub({ onSelect }: { onSelect: (page: DiscoveryPageDefinition) => void }) {
  return <div className="ldp-hub">
    <div className="ldp-intro">
      <div><span className="ldp-eyebrow">CUSTOMER DISCOVERY</span><h2>选择客户发现方式</h2><p>按目标客户来源进入专属页面。每个页面使用对应的平台目录、服务商和 Actor；执行与结果统一进入线索审核流程。</p></div>
      <div className="ldp-count"><b>12</b><span>个发现入口</span></div>
    </div>
    <div className="ldp-rule"><b>统一数据规则</b><span>只将可识别的企业或个人客户档案写入线索库。原始页面、帖子、评论、视频、商品和搜索结果仅可作为来源证据，不直接视为客户。</span></div>
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
