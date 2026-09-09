import type { TolouIconName } from './components/TolouIcon';

export type ActiveView =
  | 'dashboard'
  | 'mix-designs'
  | 'material-library'
  | 'workspace'
  | 'new-project'
  | 'materials'
  | 'gradation'
  | 'aggregate-blend'
  | 'durability'
  | 'results'
  | 'trial-mix';

export type NavigationItem = {
  id: string;
  label: string;
  icon: TolouIconName;
  view?: ActiveView;
  topNav?: boolean;
  sidebar?: boolean;
  requiresActiveProject?: boolean;
  disabled?: boolean;
};

export const navigationItems: readonly NavigationItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: 'dashboard', view: 'dashboard', topNav: true, sidebar: true },
  { id: 'mix-designs', label: 'طرح‌های اختلاط', icon: 'mix', view: 'mix-designs', topNav: true, sidebar: true },
  { id: 'material-library', label: 'کتابخانه مصالح', icon: 'materials', view: 'material-library', topNav: true },
  { id: 'new-project', label: 'ثبت طرح جدید', icon: 'add', view: 'new-project', topNav: true, sidebar: true },
  { id: 'workspace', label: 'پرونده فعال', icon: 'workspace', view: 'workspace', topNav: true, sidebar: true, requiresActiveProject: true },
  { id: 'trial-mix', label: 'Trial Mix', icon: 'trial', view: 'trial-mix', topNav: true, sidebar: true, requiresActiveProject: true },
  { id: 'reports', label: 'Report Center', icon: 'report', view: 'results', sidebar: true, requiresActiveProject: true },
  { id: 'backup', label: 'پشتیبان‌گیری (بعدی)', icon: 'backup', sidebar: true, disabled: true }
] as const;

export const topNavigationItems = navigationItems.filter(item => item.topNav);
export const sidebarNavigationItems = navigationItems.filter(item => item.sidebar);

export function isNavigationItemDisabled(item: NavigationItem, hasActiveProject: boolean): boolean {
  return Boolean(item.disabled || (item.requiresActiveProject && !hasActiveProject));
}

export function isNavigationItemActive(item: NavigationItem, activeView: ActiveView): boolean {
  return item.view === activeView;
}
