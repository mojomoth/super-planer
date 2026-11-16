import { listSessions } from '@/lib/session';
import StartForm from './StartForm';

const ERRORS: Record<string, string> = {
  short: '네 글자 이상 적어 주세요.',
  long: '1000자 이하로 줄여 주세요.',
  server: '세션을 만들지 못했어요. 다시 시도해 주세요.',
};

const when = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sessions = listSessions();
  return (
    <div className="layout">
      <div className="layout__main">
        <div className="page-head">
          <div className="page-head__text">
            <h1>어떤 게임을 만들고 싶나요?</h1>
            <p className="page-head__desc">대충 적어도 돼요. 질문에 하나씩 답하면 게임 이름과 설명으로 정리해 드려요.</p>
          </div>
        </div>
        <StartForm error={error ? ERRORS[error] ?? ERRORS.server : undefined} />
      </div>
      <section className="panel layout__side" aria-labelledby="recent-h">
        <header className="panel__head"><h2 className="panel__title" id="recent-h">최근 세션</h2></header>
        <div className="panel__body">
          {sessions.length ? (
            <ul className="sessions">
              {sessions.map((s) => (
                <li key={s.id}>
                  <a className="sessions__link" href={`/s/${s.id}`}>{s.title ?? s.prompt}</a>
                  <p className="meta">{s.status === 'done' ? '정리 완료' : `질문 중, 답 ${s.answered}개`}</p>
                  <p className="meta"><time dateTime={s.created_at}>{when(s.created_at)}</time></p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty"><p>아직 세션이 없어요. 왼쪽에 아이디어를 적고 시작해 보세요.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}
