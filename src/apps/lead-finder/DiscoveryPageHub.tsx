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
  { id:'linkedin-candidates', title:'LinkedIn 人才与决策人', subtitle:'职业联系人、采购负责人和企业管理者', description:'按职位、行业、技能、国家和企业关键词发现公开职业资料，适合寻找采购、销售、管理层及专业决策人。', group:'社交与职业网络', platformKeys:['linkedin'], platformNames:['LinkedIn'], filters:['职位','企业','行业','国家 / 地区'], outputs:'职业主页、职位、公司、公开职业资料', rule:'只处理公开职业资料；联系方式以 Actor 实际返回且允许使用的字段为准。' },
  { id:'facebook-pages', title:'Facebook 企业主页发现', subtitle:'本地商家、品牌主页与企业联系人', description:'按行业、产品关键词和地区发现公开企业主页，提取可见的企业介绍、官网、电话、邮箱和地址。', group:'社交与职业网络', platformKeys:['facebook'], platformNames:['Facebook'], filters:['行业 / 产品关键词','国家 / 城市','企业主页'], outputs:'企业主页、公开商务资料、官网、电话和地址', rule:'仅采集公开可见的企业资料；Actor 必须通过样本审核后才可正式执行。' },
  { id:'social-brand-discovery', title:'社交媒体品牌发现', subtitle:'品牌账号、创作者与公开商业内容', description:'从 Instagram、TikTok、YouTube 和 X 发现品牌账号、创作者及公开商业活动，适合识别品牌方和潜在合作对象。', group:'社交与职业网络', platformKeys:['instagram','tiktok','youtube','x'], platformNames:['Instagram','TikTok','YouTube','X / Twitter'], filters:['品牌 / 关键词','国家 / 地区','账号类型'], outputs:'公开账号、主页链接、简介和商业内容线索', rule:'按各平台公开访问范围和服务商许可采集，不读取私密内容。' },
  { id:'search-engine-discovery', title:'搜索引擎企业发现', subtitle:'按关键词寻找企业官网与采购机会', description:'通过 Google Search、Bing 等搜索结果发现目标企业、供应商官网、产品页面和采购需求线索。', group:'搜索与本地商家', platformKeys:['google-search','bing'], platformNames:['Google Search','Bing'], filters:['关键词','国家 / 语言','网站类型'], outputs:'搜索结果、企业官网、产品页面和来源链接', rule:'搜索结果用于发现线索；需保留来源链接并核验企业身份。' },
  { id:'maps-business-discovery', title:'地图商家发现', subtitle:'本地企业、门店和服务商', description:'按国家、城市、行业和商家类别发现本地企业，适合寻找经销商、门店、服务商和区域合作伙伴。', group:'搜索与本地商家', platformKeys:['google-maps','yelp'], platformNames:['Google Maps','Yelp'], filters:['国家 / 城市','行业 / 类别','商家关键词'], outputs:'企业名称、地址、网站、公开电话及商家页面', rule:'字段完整度取决于地区和数据源；联系方式必须以来源实际提供为准。' },
  { id:'b2b-supplier-discovery', title:'B2B 供应商与采购商发现', subtitle:'制造商、批发商、进口商和供应商', description:'从 B2B 商业平台发现制造商、批发商、经销商和采购企业，适合外贸业务拓展与供应链寻源。', group:'B2B 与电商平台', platformKeys:['alibaba','made-in-china','globalsources','indiamart'], platformNames:['Alibaba.com','Made-in-China','Global Sources','IndiaMART'], filters:['产品 / 类目','国家 / 地区','供应商类型'], outputs:'企业主页、产品目录、供应商资料和公开联系方式', rule:'平台数据的可访问性和使用范围以平台条款及数据许可为准。' },
  { id:'ecommerce-seller-discovery', title:'电商卖家与品牌发现', subtitle:'跨境卖家、独立站和平台品牌', description:'发现 Amazon、eBay、Walmart、Etsy、Shopify、AliExpress、Temu、Shopee 和 Lazada 等平台上的卖家与品牌。', group:'B2B 与电商平台', platformKeys:['amazon','ebay','walmart','etsy','shopify','aliexpress','temu','shopee','lazada'], platformNames:['Amazon','eBay','Walmart','Etsy','Shopify','AliExpress','Temu','Shopee','Lazada'], filters:['平台','商品 / 品牌关键词','市场 / 国家'], outputs:'店铺、品牌、商品目录和公开经营信息', rule:'卖家身份及联系方式需核验；不同平台的数据覆盖能力可能不同。' },
  { id:'company-website-discovery', title:'企业官网与联系信息发现', subtitle:'官网、产品页和商务联系页面', description:'发现企业官方网站，并定位 About、Products、Contact、Wholesale 等页面，整理企业公开商务信息。', group:'官网与商业目录', platformKeys:['company-sites'], platformNames:['企业官方网站'], filters:['行业 / 产品关键词','国家 / 地区','官网页面类型'], outputs:'官网、产品页面、联系页面和公开商务信息', rule:'只提取网站公开展示的信息，并保留原始页面来源。' },
  { id:'business-directory-discovery', title:'企业黄页与商业目录发现', subtitle:'行业名录、企业目录和本地黄页', description:'从行业名录、企业黄页和商业目录发现目标企业，适合补充搜索引擎和地图未覆盖的企业名单。', group:'官网与商业目录', platformKeys:['directories'], platformNames:['企业商业目录'], filters:['行业目录','国家 / 地区','企业类别'], outputs:'企业名称、行业分类、官网和目录来源', rule:'逐个目录核验数据许可、访问限制和更新频率。' },
  { id:'exhibitor-discovery', title:'展会与参展商发现', subtitle:'展商名单、品牌和行业活动参与者', description:'从展会官网和公开参展商目录发现制造商、品牌方、进口商及行业合作伙伴。', group:'官网与商业目录', platformKeys:['exhibitors'], platformNames:['展会参展商目录'], filters:['展会名称','行业','国家 / 地区','展会年份'], outputs:'参展企业、展位 / 品牌信息和官网链接', rule:'优先使用主办方公开目录；历史名单需要核验时效。' },
  { id:'trade-record-discovery', title:'贸易与进出口企业发现', subtitle:'进口商、出口商和采购关系线索', description:'通过获准使用的贸易数据发现进出口企业、货运活动和潜在采购关系，适合外贸市场开发。', group:'贸易与企业信息', platformKeys:['trade-records'], platformNames:['进出口贸易数据'], filters:['产品 / HS 编码','国家 / 港口','进出口方向'], outputs:'进口商、出口商、贸易记录和产品线索', rule:'贸易数据需具备合法授权；覆盖国家、字段和时间范围以数据供应商为准。' },
  { id:'company-registry-discovery', title:'企业注册与商业信息发现', subtitle:'注册主体、企业状态和基础工商资料', description:'通过公开企业注册信息和商业资料核验企业主体、注册状态及基础背景，辅助判断线索真实性。', group:'贸易与企业信息', platformKeys:['company-registry'], platformNames:['企业注册信息'], filters:['企业名称','注册国家','注册编号'], outputs:'企业注册主体、状态及公开登记资料', rule:'各国登记信息开放程度不同；不得将缺失字段推断为事实。' },
]

const iconMap: Record<string,string> = {
  'linkedin-candidates': 'fab fa-linkedin-in',
  'facebook-pages': 'fab fa-facebook-f',
  'social-brand-discovery': 'fas fa-hashtag',
  'search-engine-discovery': 'fas fa-search',
  'maps-business-discovery': 'fas fa-map-marker-alt',
  'b2b-supplier-discovery': 'fas fa-industry',
  'ecommerce-seller-discovery': 'fas fa-store',
  'company-website-discovery': 'fas fa-globe',
  'business-directory-discovery': 'fas fa-list',
  'exhibitor-discovery': 'fas fa-calendar-alt',
  'trade-record-discovery': 'fas fa-ship',
  'company-registry-discovery': 'fas fa-building',
}

const groups = ['社交与职业网络','搜索与本地商家','B2B 与电商平台','官网与商业目录','贸易与企业信息']

export default function DiscoveryPageHub({ onSelect }: { onSelect: (page: DiscoveryPageDefinition) => void }) {
  return <div className="ldp-hub">
    <div className="ldp-intro">
      <div><span className="ldp-eyebrow">CUSTOMER DISCOVERY</span><h2>选择客户发现方式</h2><p>按目标客户类型选择入口。每个入口会加载对应渠道目录、服务商和 Actor Schema；只有完成配置、样本审核并启用的 Actor 才能正式执行采集。</p></div>
      <div className="ldp-count"><b>{discoveryPages.length}</b><span>个发现入口</span></div>
    </div>
    <div className="ldp-rule"><b>执行规则</b><span>入口代表发现任务类型，不代表所有平台均已接通。页面会显示当前可选渠道和已审核 Actor；未审核或未维护的 Actor 只能用于配置与 Schema 检查，不能启动正式采集。</span></div>
    {groups.map(group => <section className="ldp-group" key={group}>
      <div className="ldp-group-head"><h3>{group}</h3><span>{discoveryPages.filter(page=>page.group===group).length} 个入口</span></div>
      <div className="ldp-grid">{discoveryPages.filter(page=>page.group===group).map(page => {
        const iconClass = iconMap[page.id]
        return <button type="button" className="ldp-card" key={page.id} onClick={()=>onSelect(page)}>
          <span className="ldp-card-icon"><i className={iconClass} aria-hidden="true"/></span>
          <span className="ldp-card-main"><b>{page.title}</b><small>{page.subtitle}</small><span>{page.description}</span></span>
          <span className="ldp-card-meta"><span>{page.platformNames.join(' · ')}</span><span>主要条件：{page.filters.slice(0,3).join(' · ')}</span><i>进入配置 →</i></span>
        </button>
      })}</div>
    </section>)}
    <div className="ldp-footnote"><span>数据源是否可执行以服务商连接状态、Actor 审核状态和平台访问规则为准。</span></div>
  </div>
}
