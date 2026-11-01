import { useMemo, useState } from 'react'
import {
  Activity, BarChart3, Bot, Building2, CalendarClock, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, ClipboardList, Cloud, Command, Contact, Database, FileText,
  Filter, Globe2, Home, LayoutDashboard, Mail, Menu, Moon, MoreHorizontal, Network,
  Plus, Search, Send, Settings, ShieldCheck, Sparkles, Sun, Target, TrendingUp, Users,
  WandSparkles, Workflow, X, Zap, Star, ArrowUpRight, BriefcaseBusiness, Boxes, Layers3 } from 'lucide-react'
import type { AppItem, AppGroup } from './types'
export const groups: AppGroup[] = [
  { id: 'workspace', title: 'Workspace', subtitle: 'Your work, all in one place' },
  { id: 'prospecting', title: 'Prospecting', subtitle: 'Discover your next customer' },
  { id: 'sales', title: 'Sales', subtitle: 'Turn opportunities into revenue' },
  { id: 'data', title: 'Data Intelligence', subtitle: 'Build a trusted data foundation' },
  { id: 'ai', title: 'AI Intelligence', subtitle: 'Research and automate with AI' },
  { id: 'marketing', title: 'Marketing', subtitle: 'Reach the right audience' },
  { id: 'analytics', title: 'Analytics', subtitle: 'Understand business performance' },
  { id: 'admin', title: 'Administration', subtitle: 'Configure your workspace' },
]
export const apps: AppItem[] = [
  { id:'dashboard',name:'Dashboard',subtitle:'Overview',group:'workspace',icon:LayoutDashboard,color:'#714B67',description:'A live overview of your prospecting, sales activity and team performance.' },
  { id:'activities',name:'My Activities',subtitle:'Tasks & reminders',group:'workspace',icon:CalendarClock,color:'#E08B36',description:'Your daily priorities, follow-ups and reminders in one focused inbox.' },
  { id:'lead-finder',name:'Lead Finder',subtitle:'Find prospects',group:'prospecting',icon:Target,color:'#167D9A',description:'Discover target companies by country, industry, product and business profile.' },
  { id:'companies',name:'Company Database',subtitle:'Company profiles',group:'prospecting',icon:Building2,color:'#4776B8',description:'A searchable database of companies, websites, locations and business details.' },
  { id:'contacts',name:'Contact Finder',subtitle:'Decision makers',group:'prospecting',icon:Contact,color:'#239B82',description:'Find purchasing managers, executives and other relevant business contacts.' },
  { id:'market-intel',name:'Market Intelligence',subtitle:'Explore markets',group:'prospecting',icon:Globe2,color:'#A16BB5',description:'Research market demand, industry trends, country opportunities and risks.' },
  { id:'competitors',name:'Competitor Finder',subtitle:'Competitive landscape',group:'prospecting',icon:Network,color:'#C16D4A',description:'Map competitors, comparable suppliers, brands and market participants.' },
  { id:'crm',name:'CRM',subtitle:'Customer relationships',group:'sales',icon:Users,color:'#714B67',description:'Manage accounts, contacts, customer history and ownership.' },
  { id:'pipeline',name:'Sales Pipeline',subtitle:'Deal stages',group:'sales',icon:Workflow,color:'#168A9A',description:'Track every opportunity from new lead to negotiation and closed deal.' },
  { id:'quotations',name:'Quotations',subtitle:'Pricing & offers',group:'sales',icon:FileText,color:'#C18A32',description:'Prepare, organize and track customer quotations and commercial terms.' },
  { id:'sales-activities',name:'Activities',subtitle:'Calls & meetings',group:'sales',icon:ClipboardList,color:'#4776B8',description:'Record calls, meetings, emails and the next customer touchpoint.' },
  { id:'data-hub',name:'Data Hub',subtitle:'Unified datasets',group:'data',icon:Database,color:'#4776B8',description:'Import, organize and browse datasets collected from multiple sources.' },
  { id:'providers',name:'Data Providers',subtitle:'Sources & APIs',group:'data',icon:Cloud,color:'#168A9A',description:'Manage connected data sources, provider status, usage and costs.' },
  { id:'enrichment',name:'Data Enrichment',subtitle:'Complete records',group:'data',icon:WandSparkles,color:'#A16BB5',description:'Enrich company and contact records with additional business information.' },
  { id:'cleaning',name:'Data Cleaning',subtitle:'Quality & deduplication',group:'data',icon:Check,color:'#239B82',description:'Normalize, validate and deduplicate company and contact records.' },
  { id:'trade',name:'Trade Intelligence',subtitle:'Import & export signals',group:'data',icon:Boxes,color:'#C16D4A',description:'Explore trade activity, product codes, buyers, suppliers and trade patterns.' },
  { id:'copilot',name:'AI Copilot',subtitle:'Your AI assistant',group:'ai',icon:Sparkles,color:'#714B9B',description:'Ask questions and get help navigating data and workflows across Ouranos.' },
  { id:'research',name:'AI Research',subtitle:'Deep company research',group:'ai',icon:Bot,color:'#4776B8',description:'Generate evidence-based company, product, industry and market research.' },
  { id:'scoring',name:'Lead Scoring',subtitle:'Prioritize prospects',group:'ai',icon:TrendingUp,color:'#239B82',description:'Score leads against your ideal customer profile and explain each score.' },
  { id:'agents',name:'AI Agents',subtitle:'Automated workflows',group:'ai',icon:Zap,color:'#D28A36',description:'Orchestrate multi-step research, enrichment and lead qualification workflows.' },
  { id:'email-marketing',name:'Email Marketing',subtitle:'Campaign delivery',group:'marketing',icon:Mail,color:'#4776B8',description:'Create targeted email campaigns and monitor delivery and engagement.' },
  { id:'sequences',name:'Email Sequences',subtitle:'Automated follow-up',group:'marketing',icon:Send,color:'#239B82',description:'Build timed follow-up sequences with clear approval and opt-out controls.' },
  { id:'campaigns',name:'Campaigns',subtitle:'Manage initiatives',group:'marketing',icon:Layers3,color:'#C16D4A',description:'Coordinate market, product, event and customer acquisition campaigns.' },
  { id:'templates',name:'Templates',subtitle:'Reusable content',group:'marketing',icon:FileText,color:'#A16BB5',description:'Store reusable outreach, quotation, research and AI prompt templates.' },
  { id:'sales-analytics',name:'Sales Analytics',subtitle:'Sales performance',group:'analytics',icon:BarChart3,color:'#168A9A',description:'Analyze sales activity, conversion, pipeline health and team performance.' },
  { id:'market-analytics',name:'Market Analytics',subtitle:'Market performance',group:'analytics',icon:Globe2,color:'#4776B8',description:'Understand prospect distribution, industry coverage and market opportunities.' },
  { id:'users',name:'Users & Teams',subtitle:'People & organization',group:'admin',icon:Users,color:'#714B67',description:'Manage workspace members, teams, ownership and organizational structure.' },
  { id:'permissions',name:'Permissions',subtitle:'Roles & access',group:'admin',icon:ShieldCheck,color:'#239B82',description:'Configure role-based access and control who can view or change data.' },
  { id:'settings',name:'Settings',subtitle:'Workspace setup',group:'admin',icon:Settings,color:'#68758A',description:'Configure workspace preferences, defaults and business settings.' },
  { id:'integrations',name:'Integrations',subtitle:'Connect services',group:'admin',icon:Network,color:'#C18A4A',description:'Connect external tools and configure approved integrations.' },
]
export const recentIds = ['lead-finder','companies','crm','market-intel']
export const initialFavorites = ['dashboard','lead-finder','crm','research']

