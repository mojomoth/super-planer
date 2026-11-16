'use client';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { RECOMMEND, decisionOf, type Answer } from '@/lib/interview';
import type { State, TurnView } from '@/lib/session';
import { Agent, Alert, Check, Clock, Undo } from '../../icons';

type Busy = null | 'answer' | 'wrap' | 'more' | 'back' | 'finish';

export default function Interview({ initial }: { initial: State }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<Busy>(null);
  const [pending, setPending] = useState<Answer | null>(null);
  const [error, setError] = useState('');
  const [moved, setMoved] = useState(false); // animate the card only after a step change, never on page load
  const [restore, setRestore] = useState<{ id: string; answer: Answer } | null>(null); // "이전" fills the reopened question back in

  async function send(action: Exclude<Busy, null>, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError('');
    setMoved(true);
    try {
      const res = await fetch(`/api/sessions/${state.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const data = await res.json().catch(() => ({ error: '서버 응답을 읽지 못했어요.' }));
      if (!res.ok) throw new Error(data.error ?? '처리하지 못했어요.');
      setState(data as State);
      if (action === 'finish') window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message || '연결이 끊겼어요. 다시 시도해 주세요.');
    } finally {
      setBusy(null);
      setPending(null);
    }
  }

  function back() {
    const last = state.turns.filter((t) => t.answer).at(-1);
    setRestore(last?.answer ? { id: last.id, answer: last.answer } : null);
    send('back');
  }

  if (state.status === 'done' && state.result) return <Result state={state} />;

  const answered = state.turns.filter((t) => t.answer || (pending && t.id === state.open?.id)).map((t) => (t.answer ? t : { ...t, answer: pending }));
  const waiting = busy === 'answer' || busy === 'more';
  const asked = state.turns.length;

  return (
    <div className="layout">
      <div className="layout__main">
        <div className="page-head">
          <div className="page-head__text">
            <h1 className="prompt-title">{state.prompt}</h1>
            <p className="page-head__desc">질문에 답할수록 오른쪽의 애매한 부분이 줄어들어요. 최대 {state.maxQuestions}개까지 물어봐요.</p>
          </div>
        </div>

        <ol className="flow" aria-label="질문 워크플로우">
          {answered.map((t) => <Step key={t.id} turn={t} />)}
          <li className="flow__step flow__step--current">
            <span className="flow__node num" aria-hidden="true">{waiting ? asked + 1 : state.open ? state.open.idx + 1 : <Check />}</span>
            <div className="flow__body">
              {waiting && <Loading label={busy === 'answer' ? '다음 질문을 만드는 중이에요.' : '질문을 하나 더 만드는 중이에요.'} />}
              {state.open ? (
                // Stays mounted (hidden) while the answer is sent, so a failed request gives back the picked options and typed text.
                <div hidden={waiting}>
                  <QuestionCard
                    key={state.open.id} turn={state.open} max={state.maxQuestions} enter={moved} busy={busy} error={error}
                    onAnswer={(a) => { setPending(a); send('answer', { turnId: state.open!.id, ...a }); }}
                    initialAnswer={restore?.id === state.open.id ? restore.answer : null}
                    onBack={back} onWrap={() => send('wrap')}
                  />
                </div>
              ) : waiting ? null : state.restate ? (
                <Restate restate={state.restate} enter={moved} busy={busy} error={error} onFinish={() => send('finish')} onMore={() => send('more')} onBack={back} />
              ) : (
                <div className="notice notice--error" role="alert"><Alert /><p>다음 단계를 불러오지 못했어요. 새로 고쳐 주세요.</p></div>
              )}
            </div>
          </li>
        </ol>
      </div>
      <Ledger state={state} current={waiting ? null : state.open?.track ?? null} />
    </div>
  );
}

function Step({ turn }: { turn: TurnView }) {
  return (
    <li className="flow__step">
      <span className="flow__node num" aria-hidden="true">{turn.idx + 1}</span>
      <div className="flow__body">
        <ol className="chat">
          <li className="msg msg--agent">
            <p className="msg__who"><Agent />질문 {turn.idx + 1}<span className="flow__track">{turn.trackLabel}</span></p>
            <div className="msg__body"><p>{turn.question}</p></div>
          </li>
          <li className="msg msg--user">
            <p className="msg__who visually-hidden">내 답</p>
            <div className="msg__body"><p>{decisionOf(turn)}</p></div>
          </li>
        </ol>
      </div>
    </li>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <section className="panel qcard" aria-busy="true" aria-label={label}>
      <div className="panel__body qcard__body">
        <p className="meta" role="status">{label} LLM을 쓰면 30초쯤 걸려요.</p>
        <span className="skeleton" style={{ width: '80%' }} />
        <span className="skeleton" style={{ width: '55%' }} />
        <span className="skeleton qcard__skel-chip" style={{ width: '45%' }} />
        <span className="skeleton qcard__skel-chip" style={{ width: '50%' }} />
        <span className="skeleton qcard__skel-chip" style={{ width: '40%' }} />
      </div>
    </section>
  );
}

function ErrorNotice({ error }: { error: string }) {
  return error ? <div className="notice notice--error" role="alert"><Alert /><p>{error}</p></div> : null;
}

function QuestionCard({ turn, max, enter, busy, error, initialAnswer, onAnswer, onBack, onWrap }: {
  turn: TurnView; max: number; enter: boolean; busy: Busy; error: string; initialAnswer: Answer | null;
  onAnswer: (a: Answer) => void; onBack: () => void; onWrap: () => void;
}) {
  const [choices, setChoices] = useState<string[]>(() => (initialAnswer?.recommended ? [RECOMMEND] : initialAnswer?.choices ?? []));
  const [text, setText] = useState(initialAnswer?.text ?? '');
  const [empty, setEmpty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const all = [...turn.options, RECOMMEND];
  const locked = busy !== null;

  // Move focus to each new question (not on first page load) so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (!enter) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest' });
  }, [turn.idx, enter]);

  function toggle(o: string) {
    setEmpty(false);
    if (!turn.multi) return setChoices([o]);
    setChoices((c) => (c.includes(o) ? c.filter((x) => x !== o) : o === RECOMMEND ? [o] : [...c.filter((x) => x !== RECOMMEND), o]));
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (locked) return;
    if (!choices.length && !text.trim()) return setEmpty(true);
    onAnswer({ choices, text: text.trim() });
  }

  function keys(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= all.length) { e.preventDefault(); toggle(all[n - 1]); }
  }

  const fallback = turn.provider.startsWith('mock (');
  return (
    <section className={`panel qcard${enter ? ' qcard--enter' : ''}`} aria-labelledby={`q-${turn.id}`}>
      <form onSubmit={submit} onKeyDown={keys} noValidate>
        <div className="panel__body qcard__body">
          <p className="meta num">질문 {turn.idx + 1} / {max}<span className="flow__track">{turn.trackLabel}</span></p>
          <h2 className="qcard__q" id={`q-${turn.id}`} ref={heading} tabIndex={-1}>{turn.question}</h2>
          {turn.hint && <p className="qcard__hint">{turn.hint}</p>}
          <fieldset className="choices choices--stack" disabled={locked} aria-describedby={empty ? `e-${turn.id}` : undefined}>
            <legend>{turn.multi ? '여러 개 골라도 돼요' : '하나만 골라 주세요'}</legend>
            {all.map((o, i) => (
              <label className={`chip${o === RECOMMEND ? ' chip--recommend' : ''}`} key={o}>
                <input type={turn.multi ? 'checkbox' : 'radio'} name={`choice-${turn.id}`} value={o} checked={choices.includes(o)} onChange={() => toggle(o)} />
                <Check className="chip__check" />
                <span className="chip__key num" aria-hidden="true">{i + 1}</span>
                {o}
              </label>
            ))}
          </fieldset>
          {turn.allowFree && (
            <div className="field">
              <label className="field__label" htmlFor={`t-${turn.id}`}>직접 쓰기</label>
              <textarea
                className="textarea qcard__text" id={`t-${turn.id}`} rows={2} maxLength={500} disabled={locked}
                placeholder="예: 둘 다 좋은데, 밤에는 분위기가 바뀌었으면 해요" value={text}
                onChange={(e) => { setText(e.target.value); setEmpty(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
                aria-describedby={`h-${turn.id}${empty ? ` e-${turn.id}` : ''}`} aria-invalid={empty || undefined}
              />
              <p className="field__help" id={`h-${turn.id}`}>보기와 함께 써도 돼요. Enter로 보내고 Shift+Enter로 줄을 바꿔요. 숫자 키로 보기를 고를 수 있어요.</p>
            </div>
          )}
          {empty && <p className="field__error" id={`e-${turn.id}`}>보기를 고르거나 직접 써 주세요.</p>}
          {fallback && <p className="meta">{turn.provider}로 만든 질문이에요.</p>}
          <ErrorNotice error={error} />
        </div>
        <footer className="panel__foot btn-row">
          <button type="submit" className="btn btn--primary" disabled={locked} aria-busy={busy === 'answer'}>다음 질문</button>
          {turn.idx > 0 && <button type="button" className="btn btn--ghost" onClick={onBack} disabled={locked} aria-busy={busy === 'back'}><Undo />이전</button>}
          {turn.idx > 0 && <button type="button" className="btn btn--ghost qcard__wrap" onClick={onWrap} disabled={locked} aria-busy={busy === 'wrap'}>여기까지로 정리하기</button>}
        </footer>
      </form>
    </section>
  );
}

function Restate({ restate, enter, busy, error, onFinish, onMore, onBack }: {
  restate: NonNullable<State['restate']>; enter: boolean; busy: Busy; error: string; onFinish: () => void; onMore: () => void; onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (enter) heading.current?.focus({ preventScroll: true }); }, [enter]);
  const locked = busy !== null;
  return (
    <section className={`panel qcard${enter ? ' qcard--enter' : ''}`} aria-labelledby="restate-h" aria-busy={busy === 'finish'}>
      <div className="panel__body qcard__body">
        <h2 className="qcard__q" id="restate-h" ref={heading} tabIndex={-1}>이대로 정리할까요?</h2>
        <p className="qcard__goal">{restate.goal}</p>
        <dl className="decisions">
          {restate.decisions.map((d) => (
            <div key={d.track}><dt>{d.track}</dt><dd>{d.decision}</dd></div>
          ))}
        </dl>
        {restate.fuzzy.length > 0 && <p className="meta">아직 정하지 않은 것: {restate.fuzzy.join(', ')}</p>}
        {busy === 'finish' && <div className="notice" role="status"><Clock /><p>게임 이름과 설명을 정리하는 중이에요. LLM을 쓰면 30초쯤 걸려요.</p></div>}
        <ErrorNotice error={error} />
      </div>
      <footer className="panel__foot btn-row">
        <button type="button" className="btn btn--primary" onClick={onFinish} disabled={locked} aria-busy={busy === 'finish'}>이대로 정리하기</button>
        {restate.canAskMore && <button type="button" className="btn" onClick={onMore} disabled={locked}>질문 하나 더</button>}
        <button type="button" className="btn btn--ghost" onClick={onBack} disabled={locked} aria-busy={busy === 'back'}><Undo />이전</button>
      </footer>
    </section>
  );
}

function Ledger({ state, current }: { state: State; current: string | null }) {
  return (
    <aside className="panel layout__side ledger" aria-labelledby="ledger-h">
      <header className="panel__head"><h2 className="panel__title" id="ledger-h">애매한 부분</h2></header>
      <div className="panel__body">
        <p className="ledger__total">
          <span className="ledger__num num">{state.overall.toFixed(2)}</span>
          <span className="meta">전체 애매함이에요. 0.20 이하가 되면 정리해요.</span>
        </p>
        <ul className="ledger__list">
          {state.ledger.map((l) => (
            <li className="ledger__row" key={l.key} data-clear={l.clear} aria-current={l.key === current ? 'step' : undefined}>
              <span className="ledger__label">{l.label}{l.key === current && <span className="visually-hidden">, 지금 묻는 중</span>}</span>
              <span className="ledger__state">{l.clear ? <><Check />명확</> : '애매'}</span>
              <span className="ledger__bar" aria-hidden="true"><span style={{ transform: `scaleX(${l.score})` }} /></span>
              <span className="ledger__score num">{l.score.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="meta">0은 정해졌다는 뜻, 1은 아직 모른다는 뜻이에요.</p>
      </div>
    </aside>
  );
}

function Result({ state }: { state: State }) {
  const r = state.result!;
  const c = r.concept;
  return (
    <div className="layout">
      <div className="layout__main result">
        <div className="result__head">
          <h1 className="result__title">{r.title}<span className="result__tag">가제</span></h1>
          <p className="result__one">{r.one_liner}</p>
          <div className="btn-row">
            <a className="btn btn--primary" href={`http://localhost:3102/?from=step1:${state.id}`}>워크플로우로 열기</a>
            <a className="btn" href="/">새로 시작</a>
          </div>
        </div>
        <article className="md-doc">
          <h2>이게 뭐냐면</h2>
          <p>{c.what}</p>
          <h2>비유하자면</h2>
          <p>{c.analogy}</p>
          <h2>조금 더 자세히</h2>
          <ul>{c.details.map((d) => <li key={d}>{d}</li>)}</ul>
          <h2>그래서 왜 재밌냐면</h2>
          <p>{c.so_what}</p>
          <h2>결정한 것들</h2>
          <table>
            <thead><tr><th scope="col">항목</th><th scope="col">결정</th></tr></thead>
            <tbody>{c.decisions.map((d) => <tr key={d.track}><th scope="row">{d.track}</th><td>{d.decision}</td></tr>)}</tbody>
          </table>
          <h2>질문 워크플로우</h2>
          <p className="meta">처음 아이디어: {state.prompt}</p>
        </article>
        <ol className="flow flow--result" aria-label="질문 워크플로우">
          {state.turns.filter((t) => t.answer).map((t) => <Step key={t.id} turn={t} />)}
        </ol>
        <p className="meta">정리한 모델: {r.provider}</p>
      </div>
      <Ledger state={state} current={null} />
    </div>
  );
}
