import type { Metadata } from 'next';
import { provider } from '@/lib/llm';
import './globals.css';

export const dynamic = 'force-dynamic'; // pages read SQLite and the LLM env at request time
export const metadata: Metadata = { title: '질문하기 - Super Planer', icons: { icon: '/super-planer-icon.svg' } };

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
                <li><a href="http://localhost:3101/" aria-current="page">질문하기</a></li>
                <li><a href="http://localhost:3102/">워크플로우</a></li>
                <li><a href="http://localhost:3103/">기획서</a></li>
              </ul>
            </nav>
            <p className="app-header__aside">LLM: {provider()}</p>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
