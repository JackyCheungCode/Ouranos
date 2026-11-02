create table if not exists public.discovery_categories (
  category_key text primary key,
  category_name text not null,
  description text not null default '',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_platforms (
  platform_key text primary key,
  category_key text not null references public.discovery_categories(category_key),
  platform_name text not null,
  description text not null default '',
  search_terms text not null default '',
  website_url text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_providers (
  provider_key text primary key,
  provider_name text not null,
  provider_type text not null default 'scraping',
  description text not null default '',
  website_url text,
  docs_url text,
  supported_product_types text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discovery_adapter_catalog
  add column if not exists is_recommended boolean not null default false,
  add column if not exists recommended_rank integer,
  add column if not exists maintenance_status text not null default 'unmaintained'
    check (maintenance_status in ('unmaintained','draft','maintained','needs_review','deprecated')),
  add column if not exists field_guides jsonb not null default '{}'::jsonb,
  add column if not exists schema_version text,
  add column if not exists schema_synced_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists verification_details jsonb not null default '{}'::jsonb;

create index if not exists discovery_platforms_category_sort_idx
  on public.discovery_platforms(category_key, sort_order) where is_active;
create index if not exists discovery_adapters_platform_recommendation_idx
  on public.discovery_adapter_catalog(channel_key, is_recommended desc, recommended_rank nulls last)
  where is_active;

alter table public.discovery_categories enable row level security;
alter table public.discovery_platforms enable row level security;
alter table public.discovery_providers enable row level security;

drop policy if exists "Authenticated users can read discovery categories" on public.discovery_categories;
create policy "Authenticated users can read discovery categories"
  on public.discovery_categories for select to authenticated using (is_active);

drop policy if exists "Authenticated users can read discovery platforms" on public.discovery_platforms;
create policy "Authenticated users can read discovery platforms"
  on public.discovery_platforms for select to authenticated using (is_active);

drop policy if exists "Authenticated users can read discovery providers" on public.discovery_providers;
create policy "Authenticated users can read discovery providers"
  on public.discovery_providers for select to authenticated using (is_active);

revoke all on public.discovery_categories, public.discovery_platforms, public.discovery_providers from anon;
grant select on public.discovery_categories, public.discovery_platforms, public.discovery_providers to authenticated;
grant all on public.discovery_categories, public.discovery_platforms, public.discovery_providers to service_role;

insert into public.discovery_categories(category_key,category_name,description,sort_order) values
('social','社交媒体','社交平台、公开企业主页及商业账号',10),
('search','搜索引擎与地图','搜索结果、本地商家和地图信息',20),
('b2b','B2B 与采购平台','供应商、制造商、批发商和采购目录',30),
('commerce','电商平台','电商店铺、卖家、品牌和商品',40),
('web','企业网站与商业数据','企业官网、商业目录、展会及注册信息',50)
on conflict(category_key) do update set category_name=excluded.category_name,description=excluded.description,sort_order=excluded.sort_order,updated_at=now();

insert into public.discovery_platforms(platform_key,category_key,platform_name,description,search_terms,website_url,sort_order) values
('google-maps','search','Google Maps','本地企业、商家地点及公开联系方式','google maps business places','https://maps.google.com',10),
('google-search','search','Google Search','网页搜索结果和企业官网发现','google search results','https://google.com',20),
('bing','search','Bing','网页搜索结果和企业官网发现','bing search results','https://bing.com',30),
('yelp','search','Yelp','本地商家目录和评价信息','yelp business','https://yelp.com',40),
('instagram','social','Instagram','公开商业账号、品牌和创作者资料','instagram profiles','https://instagram.com',10),
('facebook','social','Facebook','公开企业主页和商业资料','facebook pages','https://facebook.com',20),
('linkedin','social','LinkedIn','企业资料及公开职业信息','linkedin companies','https://linkedin.com',30),
('tiktok','social','TikTok','公开账号和商业内容','tiktok profiles','https://tiktok.com',40),
('youtube','social','YouTube','频道、创作者和企业视频资料','youtube channels','https://youtube.com',50),
('x','social','X / Twitter','公开账号及商业动态','twitter profiles','https://x.com',60),
('alibaba','b2b','Alibaba.com','供应商、制造商和批发商','alibaba suppliers','https://alibaba.com',10),
('made-in-china','b2b','Made-in-China','制造商和供应商目录','made in china suppliers','https://made-in-china.com',20),
('globalsources','b2b','Global Sources','供应商及展商资料','global sources suppliers','https://globalsources.com',30),
('indiamart','b2b','IndiaMART','印度企业和供应商目录','indiamart suppliers','https://indiamart.com',40),
('amazon','commerce','Amazon','卖家、品牌和商品资料','amazon sellers products','https://amazon.com',10),
('ebay','commerce','eBay','卖家和商品资料','ebay sellers','https://ebay.com',20),
('walmart','commerce','Walmart','Marketplace 卖家和商品资料','walmart marketplace sellers','https://walmart.com',30),
('etsy','commerce','Etsy','店铺和商品资料','etsy shops','https://etsy.com',40),
('shopify','commerce','Shopify 独立店铺','独立站店铺和公开商品资料','shopify stores','https://shopify.com',50),
('aliexpress','commerce','AliExpress','跨境卖家和商品资料','aliexpress sellers','https://aliexpress.com',60),
('temu','commerce','Temu','平台商品和卖家相关公开信息','temu sellers','https://temu.com',70),
('shopee','commerce','Shopee','店铺和商品资料','shopee stores','https://shopee.com',80),
('lazada','commerce','Lazada','店铺和商品资料','lazada sellers','https://lazada.com',90),
('company-sites','web','企业官方网站','企业官网、产品和公开联系方式','company website contacts','',10),
('directories','web','企业商业目录','企业黄页和行业目录','business directory','',20),
('exhibitors','web','展会参展商','展会参展企业目录','exhibitor directory','',30),
('trade-records','web','进出口贸易数据','贸易记录和进出口企业信息','import export trade data','',40),
('company-registry','web','企业注册信息','企业注册及公开工商信息','company registry','',50)
on conflict(platform_key) do update set category_key=excluded.category_key,platform_name=excluded.platform_name,description=excluded.description,search_terms=excluded.search_terms,website_url=excluded.website_url,sort_order=excluded.sort_order,updated_at=now();

insert into public.discovery_providers(provider_key,provider_name,provider_type,description,website_url,docs_url,supported_product_types) values
('apify','Apify','actor_marketplace','Actor 市场及托管执行平台','https://apify.com','https://docs.apify.com','{actor}'),
('bright-data','Bright Data','data_platform','托管 Scrapers、数据集和代理基础设施','https://brightdata.com','https://docs.brightdata.com','{scraper,dataset,api}'),
('phantombuster','PhantomBuster','automation','面向社交和业务工作流的自动化 Agent','https://phantombuster.com','https://hub.phantombuster.com','{agent,automation}'),
('texau','TexAu','automation','销售和社交平台自动化工作流','https://texau.com','https://docs.texau.com','{automation,workflow}'),
('firecrawl','Firecrawl','web_extraction','网站搜索、抓取和结构化提取 API','https://firecrawl.dev','https://docs.firecrawl.dev','{api,scraper}'),
('octoparse','Octoparse','no_code_scraping','可视化网页采集模板和任务','https://octoparse.com','https://helpcenter.octoparse.com','{template,task}'),
('kuajing-mofang','跨境魔方','commerce_data','跨境电商数据服务，具体能力以账户套餐为准','','','{api,dataset}')
on conflict(provider_key) do update set provider_name=excluded.provider_name,provider_type=excluded.provider_type,description=excluded.description,website_url=excluded.website_url,docs_url=excluded.docs_url,supported_product_types=excluded.supported_product_types,updated_at=now();

update public.discovery_adapter_catalog set provider_key='bright-data' where provider_key='brightdata';
update public.discovery_adapter_catalog set provider_key='phantombuster' where provider_key='phantom-buster';
update public.discovery_adapter_catalog set provider_key='kuajing-mofang' where provider_key in ('跨境魔方','kuajing-mofang');
