// The DESIGN.md icon set (24 viewBox, stroke currentColor). Only the ones step1 uses.
const P = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const Check = ({ className }: { className?: string }) => <svg aria-hidden="true" {...P} className={className}><path d="m5 12 5 5 9-10" /></svg>;
export const Agent = () => <svg aria-hidden="true" {...P}><rect x="4" y="6" width="16" height="12" rx="3" /><path d="M9 11v2M15 11v2" /></svg>;
export const Alert = () => <svg aria-hidden="true" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>;
export const Undo = () => <svg aria-hidden="true" {...P}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>;
export const Clock = () => <svg aria-hidden="true" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
