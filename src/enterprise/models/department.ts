export type DepartmentKey =
  | 'administration'
  | 'sales'
  | 'customer-support'
  | 'human-resources'
  | 'marketing'
  | 'finance'
  | 'legal'
  | 'education'
  | 'healthcare'
  | 'logistics'
  | 'manufacturing';

export type DepartmentStatus = 'locked' | 'unlocked';

export interface DepartmentConfig {
  key: DepartmentKey;
  title: string;
  blurb: string;
  price: number;
  accent: string;
  coWorkers: string[];
}

export const departmentDefinitions: DepartmentConfig[] = [
  {
    key: 'administration',
    title: 'Administration',
    blurb: 'Auto-manage approvals, scheduling, org memory and executive operations.',
    price: 2000,
    accent: 'from-violet-600 to-fuchsia-600',
    coWorkers: ['Executive Assistant', 'Operations Manager', 'Compliance Lead'],
  },
  {
    key: 'sales',
    title: 'Sales',
    blurb: 'Pipeline intelligence, follow-up automation and prospect nurturing.',
    price: 2000,
    accent: 'from-sky-600 to-cyan-600',
    coWorkers: ['Revenue Analyst', 'Sales Copilot', 'Account Scout'],
  },
  {
    key: 'customer-support',
    title: 'Customer Support',
    blurb: 'Reply instantly, triage requests and keep service quality high.',
    price: 2000,
    accent: 'from-emerald-600 to-lime-600',
    coWorkers: ['Support Lead', 'Triage Agent', 'Knowledge Concierge'],
  },
  {
    key: 'human-resources',
    title: 'Human Resources',
    blurb: 'Recruiting support, onboarding help and employee experience workflows.',
    price: 2000,
    accent: 'from-amber-600 to-orange-600',
    coWorkers: ['People Partner', 'Recruiter', 'HR Ops'],
  },
  {
    key: 'marketing',
    title: 'Marketing',
    blurb: 'Campaign planning, content ops and audience insights.',
    price: 2000,
    accent: 'from-pink-600 to-rose-600',
    coWorkers: ['Content Strategist', 'Campaign Analyst', 'Brand Guardian'],
  },
  {
    key: 'finance',
    title: 'Finance',
    blurb: 'Accountant, bookkeeper, payroll and invoice management co-workers.',
    price: 2000,
    accent: 'from-indigo-600 to-blue-600',
    coWorkers: ['Accountant', 'Bookkeeper', 'Payroll Manager', 'Invoice Manager'],
  },
  {
    key: 'legal',
    title: 'Legal',
    blurb: 'Draft reviews, clause checks and contract triage with controlled permissions.',
    price: 2000,
    accent: 'from-slate-700 to-zinc-700',
    coWorkers: ['Contract Reviewer', 'Policy Analyst', 'Compliance Counsel'],
  },
  {
    key: 'education',
    title: 'Education',
    blurb: 'Campus operations, student communication and learning support.',
    price: 2000,
    accent: 'from-purple-600 to-violet-600',
    coWorkers: ['Admissions Coach', 'Academic Planner', 'Student Success'],
  },
  {
    key: 'healthcare',
    title: 'Healthcare',
    blurb: 'Front desk operations, call triage and patient workflow support.',
    price: 2000,
    accent: 'from-red-600 to-rose-600',
    coWorkers: ['Receptionist', 'Care Coordinator', 'Clinical Ops'],
  },
  {
    key: 'logistics',
    title: 'Logistics',
    blurb: 'Delivery plans, route monitoring and dispatch coordination.',
    price: 2000,
    accent: 'from-cyan-600 to-sky-600',
    coWorkers: ['Fleet Dispatcher', 'Planner', 'Route Analyst'],
  },
  {
    key: 'manufacturing',
    title: 'Manufacturing',
    blurb: 'Production coordination, inventory and operational insight.',
    price: 2000,
    accent: 'from-emerald-700 to-teal-600',
    coWorkers: ['Factory Ops', 'Inventory Specialist', 'Quality Lead'],
  },
];

export const enterpriseDashboardItems = [
  { label: 'AI Workforce', description: 'Intelligent co-workers' },
  { label: 'Departments', description: '11 departments ready' },
  { label: 'Employees', description: 'Roles and permissions' },
  { label: 'Projects', description: 'Automation pipelines' },
  { label: 'Documents', description: 'Knowledge library' },
  { label: 'Knowledge Base', description: 'Shared company brain' },
  { label: 'Voice Commands', description: 'Hands-free orchestration' },
  { label: 'Analytics', description: 'Operational oversight' },
  { label: 'Marketplace', description: 'Install extra workers' },
  { label: 'Billing', description: 'Unlocks and subscriptions' },
  { label: 'Settings', description: 'Preferences and security' },
  { label: 'Security', description: 'Permission controls' },
];
