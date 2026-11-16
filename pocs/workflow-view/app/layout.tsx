import type { Metadata } from 'next';
import '@xyflow/react/dist/style.css';
import './globals.css';
import { provider } from '@/lib/llm';

export const metadata: Metadata = { title: '워크플로우 - Super Planer', description: '게임 기획 카드를 연결하고 카드마다 에이전트와 대화해요.', icons: { icon: '/super-planer-icon.svg' } };
export const dynamic = 'force-dynamic';

const NAV = [
  ['http://localhost:3101/', '질문하기', false],
  ['http://localhost:3102/', '워크플로우', true],
  ['http://localhost:3103/', '기획서', false],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <a className="app-brand" href="/">
              <img src="/super-planer-icon.svg" alt="" width="28" height="28" />
              <span className="app-brand__name">Super Planer</span>
            </a>
            <nav className="app-nav" aria-label="PoC 이동">
              <ul>
                {NAV.map(([href, label, current]) => (
                  <li key={href}>
                    <a href={href} aria-current={current ? 'page' : undefined}>{label}</a>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="app-header__aside">LLM: {provider()}</p>
          </header>
          <main className="app-main app-main--full">{children}</main>
        </div>
      </body>
    </html>
  );
}
