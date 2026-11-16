// The one icon set from pocs/DESIGN.md (24 viewBox, stroke icons).
const PATHS = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  slash: <><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></>,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  expand: <path d="m6 9 6 6 6-6" />,
  collapse: <path d="m6 15 6-6 6 6" />,
  prev: <path d="m15 6-6 6 6 6" />,
  next: <path d="m9 6 6 6-6 6" />,
  agent: <><rect x="4" y="6" width="16" height="12" rx="3" /><path d="M9 11v2M15 11v2" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
