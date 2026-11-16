'use client';
import { useRef, useState } from 'react';
import { Clock } from './icons';

const EXAMPLES = [
  '고양이가 우주 농장을 운영하는 느긋한 게임',
  '좀비가 나오는 편의점에서 하룻밤 버티기',
  '친구랑 폰 하나로 번갈아 하는 짧은 퍼즐 대결',
  '꿈속을 돌아다니며 잃어버린 기억을 모으는 이야기',
];

// Plain form POST (works without JS); JS only fills examples, adds Ctrl/Cmd+Enter and the busy state.
export default function StartForm({ error }: { error?: string }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <form className="start panel" action="/api/sessions" method="post" onSubmit={() => setBusy(true)} aria-busy={busy}>
      <div className="panel__body start__body">
        <div className="field">
          <label className="field__label" htmlFor="prompt">게임 아이디어</label>
          <textarea
            ref={ref} className="textarea start__input" id="prompt" name="prompt" rows={5} required minLength={4} maxLength={1000}
            placeholder="예: 고양이가 우주 농장을 운영하는 느긋한 게임" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            aria-describedby={error ? 'prompt-help prompt-error' : 'prompt-help'} aria-invalid={error ? true : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }}
          />
          <p className="field__help" id="prompt-help">한두 문장이면 충분해요. Ctrl+Enter로 바로 시작할 수 있어요.</p>
          {error && <p className="field__error" id="prompt-error">{error}</p>}
        </div>
        <div className="start__examples">
          <p className="meta" id="ex-label">이런 식으로 적어도 돼요</p>
          <ul className="start__list" aria-labelledby="ex-label">
            {EXAMPLES.map((ex) => (
              <li key={ex}><button type="button" className="btn btn--ghost btn--sm" onClick={() => { setPrompt(ex); ref.current?.focus(); }}>{ex}</button></li>
            ))}
          </ul>
        </div>
        {busy && <div className="notice" role="status"><Clock /><p>첫 질문을 만드는 중이에요. LLM을 쓰면 30초쯤 걸려요.</p></div>}
      </div>
      <footer className="panel__foot btn-row">
        <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>질문 시작</button>
      </footer>
    </form>
  );
}
