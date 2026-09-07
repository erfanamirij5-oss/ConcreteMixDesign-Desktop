import type { ReactElement, SVGProps } from 'react';

export type TolouIconName = 'dashboard' | 'mix' | 'materials' | 'add' | 'workspace' | 'trial' | 'report' | 'backup';

const paths: Record<TolouIconName, ReactElement> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  mix: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,
  materials: <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></>,
  add: <><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
  workspace: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3h8v2M8 10h8M8 14h5"/></>,
  trial: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></>,
  report: <><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  backup: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>
};

export function TolouIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: TolouIconName }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
