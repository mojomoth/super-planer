import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BASE } from '@/lib/base';
import { provider } from '@/lib/llm';
import './globals.css';

// The header shows the live LLM provider, so no page (not even 404) is prerendered at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '기획서 - Super Planer',
  description: '결정 문서와 이미지 예시를 골라 Markdown 기획서로 묶는 PoC',
  icons: { icon: `${BASE}/super-planer-icon.svg` },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <a className="app-brand" href={BASE}>
              <img src={`${BASE}/super-planer-icon.svg`} alt="" width="28" height="28" />
              <span className="app-brand__name">Super Planer</span>
            </a>
            <nav className="app-nav" aria-label="PoC 이동">
              <ul>
                <li><a href="/">질문하기</a></li>
                <li><a href="/workflow">워크플로우</a></li>
                <li><a href={BASE} aria-current="page">기획서</a></li>
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
