'use client';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { sourceLabel } from '@/lib/assemble';
import { MAX_UPLOAD } from '@/lib/images';
import type { DocRow, InputRow } from '@/lib/schema';
import { Icon } from './icons';
import Markdown from './Markdown';

type DocMeta = Omit<DocRow, 'markdown'>;
type Step1Row = { session_id: string; title: string; one_liner: string; created_at: string };
type Props = {
  initialInputs: InputRow[];
  initialDocs: DocMeta[];
  initialDoc: DocRow | null;
  step1: Step1Row[];
  workflowId: string | null;
};
type Imported = { ids: string[]; message?: string };
type Tab = 'preview' | 'markdown' | 'split';
type Save = 'saved' | 'dirty' | 'saving' | 'error';

const TABS: [Tab, string][] = [['preview', '미리보기'], ['markdown', '마크다운'], ['split', '나란히']];
const SAVE_TEXT: Record<Save, string> = { saved: '저장됨', dirty: '고친 내용 저장 대기 중', saving: '저장 중', error: '저장하지 못했어요. 잠시 뒤 다시 저장돼요.' };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(data.error ?? data.message ?? `요청이 실패했어요 (${res.status})`);
  return data;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** One-line text preview of a Markdown body. */
const preview = (body: string | null) => (body ?? '').replace(/[#*_`>|-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
const when = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PlanDoc({ initialInputs, initialDocs, initialDoc, step1: initialStep1, workflowId }: Props) {
  const [inputs, setInputs] = useState(initialInputs);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialInputs.map((i) => i.id)));
  const [imported, setImported] = useState<Imported | null>(null);
  const [docs, setDocs] = useState(initialDocs);
  const [doc, setDoc] = useState<DocRow | null>(initialDoc);
  const [md, setMd] = useState(initialDoc?.markdown ?? '');
  const [save, setSave] = useState<Save>('saved');
  const [tab, setTab] = useState<Tab>('preview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<InputRow | 'new' | null>(null);
  const [captioning, setCaptioning] = useState<string | null>(null);
  const [addingImage, setAddingImage] = useState(false);
  const [step1Open, setStep1Open] = useState(false);
  const [step1, setStep1] = useState(initialStep1);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ preview: null, markdown: null, split: null });

  const decisions = inputs.filter((i) => i.kind === 'decision');
  const images = inputs.filter((i) => i.kind === 'image');
  const pickedDecisions = decisions.filter((i) => selected.has(i.id));
  const pickedImages = images.filter((i) => selected.has(i.id));

  const importedCount = imported?.ids.length
    ? `워크플로우에서 결정 ${inputs.filter((i) => imported.ids.includes(i.id) && i.kind === 'decision').length}개, 이미지 ${inputs.filter((i) => imported.ids.includes(i.id) && i.kind === 'image').length}개를 가져와 골라 두었어요.`
    : null;

  // /?workflow=<id> hand-off: import once (idempotent, keeps edited copies), preselect, then drop the query so a refresh does not repeat it.
  useEffect(() => {
    if (!workflowId) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/import', json('POST', { workflow: workflowId }));
        const data = (await res.json().catch(() => ({}))) as Partial<Imported> & { inputs?: InputRow[]; error?: string };
        if (!live) return;
        if (data.inputs) setInputs(data.inputs);
        if (data.ids?.length) setSelected(new Set(data.ids));
        setImported({ ids: data.ids ?? [], message: data.ids?.length ? undefined : (data.message ?? data.error ?? '워크플로우를 가져오지 못했어요.') });
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        if (live) setImported({ ids: [], message: '워크플로우를 가져오지 못했어요. 새로고침해 다시 시도해 주세요.' });
      }
    })();
    return () => {
      live = false;
    };
  }, [workflowId]);

  // Debounced autosave of the Markdown editor.
  useEffect(() => {
    if (save !== 'dirty' || !doc) return;
    const t = setTimeout(() => void persist(doc.id, md), 800);
    return () => clearTimeout(t);
  }, [md, save, doc]);

  async function persist(id: string, markdown: string) {
    setSave('saving');
    try {
      const r = await api<{ doc: DocRow }>(`/api/docs/${id}`, json('PATCH', { markdown }));
      setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, title: r.doc.title } : d)));
      setDoc((d) => (d && d.id === id ? { ...d, title: r.doc.title } : d));
      setSave((s) => (s === 'saving' ? 'saved' : s));
    } catch {
      setSave('error');
      setTimeout(() => setSave((s) => (s === 'error' ? 'dirty' : s)), 3000);
    }
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function setAll(list: InputRow[], on: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      for (const i of list) if (on) n.add(i.id);
      else n.delete(i.id);
      return n;
    });
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (doc && save !== 'saved') await persist(doc.id, md);
      const r = await api<{ doc: DocRow; error?: string }>('/api/generate', json('POST', { decisionIds: pickedDecisions.map((i) => i.id), imageIds: pickedImages.map((i) => i.id) }));
      setDoc(r.doc);
      setMd(r.doc.markdown);
      setSave('saved');
      setDocs((ds) => [{ id: r.doc.id, title: r.doc.title, provider: r.doc.provider, created_at: r.doc.created_at }, ...ds]);
      setTab('preview');
      if (r.error) setNote(`모델 응답을 쓰지 못해 입력만으로 조립한 문서를 만들었어요. (${r.error})`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(id: string) {
    if (id === doc?.id) return;
    setError(null);
    try {
      if (doc && save !== 'saved') await persist(doc.id, md);
      const r = await api<{ doc: DocRow }>(`/api/docs/${id}`);
      setDoc(r.doc);
      setMd(r.doc.markdown);
      setSave('saved');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeInput(i: InputRow) {
    if (!window.confirm(`'${i.title}'을(를) 지울까요?`)) return;
    try {
      await api(`/api/inputs/${encodeURIComponent(i.id)}`, { method: 'DELETE' });
      setInputs((xs) => xs.filter((x) => x.id !== i.id));
      if (editing !== 'new' && editing?.id === i.id) setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function added(input: InputRow) {
    setInputs((xs) => [...xs.filter((x) => x.id !== input.id), input]);
    setSelected((s) => new Set(s).add(input.id));
  }

  async function loadSeed() {
    try {
      const r = await api<{ inputs: InputRow[] }>('/api/seed', { method: 'POST' });
      const had = new Set(inputs.map((i) => i.id));
      setInputs(r.inputs);
      // select only what the seed brought back; keep the user's other picks as they were
      setSelected((s) => new Set([...s, ...r.inputs.filter((i) => !had.has(i.id)).map((i) => i.id)]));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function openStep1() {
    setStep1Open((o) => !o);
    if (step1Open) return;
    try {
      setStep1((await api<{ step1: Step1Row[] }>('/api/import')).step1);
    } catch {
      // keep the list we had from the server render
    }
  }

  async function importStep1(id: string) {
    setError(null);
    try {
      const r = await api<{ ids: string[]; inputs: InputRow[] }>('/api/import', json('POST', { step1: id }));
      setInputs(r.inputs);
      setSelected((s) => new Set([...s, ...r.ids]));
      setStep1Open(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = TABS.findIndex(([t]) => t === tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next][0]);
    tabRefs.current[TABS[next][0]]?.focus();
  }

  // Relative image paths (/samples, /api/images) only resolve inside this app, so exports get absolute URLs.
  const exportMd = () => md.replace(/\]\(\/(?!\/)/g, `](${window.location.origin}/`);

  function download() {
    const blob = new Blob([exportMd()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(doc?.title ?? '기획서').replace(/[\\/:*?"<>|]+/g, ' ').trim() || '기획서'} 기획서.md`;
    a.click();
    // Revoking right after click() can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportMd());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('클립보드에 복사하지 못했어요. 마크다운 탭에서 직접 선택해 복사해 주세요.');
    }
  }

  const editor = (
    <div className="field doc-editor">
      <label className="field__label" htmlFor="doc-md">마크다운</label>
      <textarea
        id="doc-md"
        className="textarea textarea--code doc-editor__area"
        value={md}
        spellCheck={false}
        onChange={(e) => {
          setMd(e.target.value);
          setSave('dirty');
        }}
      />
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>기획서 만들기</h1>
          <p className="page-head__desc">결정 문서와 이미지 예시를 골라 한 편의 Markdown 기획서로 묶어요.</p>
        </div>
      </div>

      {imported?.message ? (
        <div className="notice plan-notice" role="status"><Icon name="alert" /><p>{imported.message}</p></div>
      ) : importedCount ? (
        <div className="notice plan-notice" role="status"><Icon name="check" /><p>{importedCount}</p></div>
      ) : null}
      {error ? (
        <div className="notice notice--error plan-notice" role="alert"><Icon name="alert" /><p>{error}</p></div>
      ) : null}

      <div className="plan-layout">
        <div className="plan-inputs">
          <section className="panel" aria-labelledby="dec-h">
            <header className="panel__head">
              <div className="panel__heading">
                <h2 className="panel__title" id="dec-h">결정 문서</h2>
                <p className="meta num">{pickedDecisions.length} / {decisions.length}개 선택</p>
              </div>
              <div className="panel__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAll(decisions, pickedDecisions.length !== decisions.length)} disabled={!decisions.length}>
                  {pickedDecisions.length === decisions.length && decisions.length ? '모두 해제' : '모두 선택'}
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setEditing('new')} aria-expanded={editing === 'new'}>
                  <Icon name="plus" />추가
                </button>
              </div>
            </header>
            <div className="panel__body">
              {editing ? (
                <DecisionForm
                  key={editing === 'new' ? 'new' : editing.id}
                  input={editing === 'new' ? null : editing}
                  onDone={(row) => {
                    if (row) {
                      if (editing === 'new') added(row);
                      else setInputs((xs) => xs.map((x) => (x.id === row.id ? row : x)));
                    }
                    setEditing(null);
                  }}
                />
              ) : null}
              {decisions.length ? (
                <ul className="pick-list">
                  {decisions.map((d) => (
                    <li key={d.id} className="pick">
                      <input type="checkbox" id={`pick-${d.id}`} checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                      <label htmlFor={`pick-${d.id}`} className="pick__text">
                        <span className="pick__title">{d.title}</span>
                        <span className="pick__preview">{preview(d.body)}</span>
                      </label>
                      <div className="pick__actions">
                        <span className="pick__source">{sourceLabel(d.source)}</span>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(d)} aria-label={`${d.title} 수정`}>수정</button>
                        <button type="button" className="btn btn--ghost btn--danger btn--sm" onClick={() => void removeInput(d)} aria-label={`${d.title} 삭제`}>삭제</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty">
                  <p>결정 문서가 없어요. 직접 추가하거나 예시를 불러오세요.</p>
                  <button type="button" className="btn" onClick={() => void loadSeed()}>예시 불러오기</button>
                </div>
              )}
            </div>
            <footer className="panel__foot plan-step1">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openStep1()} aria-expanded={step1Open} aria-controls="step1-list">
                Step1 결과 가져오기
              </button>
              {step1Open ? (
                <div id="step1-list" className="plan-step1__list">
                  {step1.length ? (
                    <ul className="pick-list">
                      {step1.map((s) => (
                        <li key={s.session_id} className="pick pick--plain">
                          <span className="pick__text">
                            <span className="pick__title">{s.title}</span>
                            <span className="pick__preview">{s.one_liner}</span>
                          </span>
                          <button type="button" className="btn btn--sm" onClick={() => void importStep1(s.session_id)}>가져오기</button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="meta">
                      Step1에서 끝낸 결과가 아직 없어요. <a href="http://localhost:3101/">질문하기에서 시작하기</a>
                    </p>
                  )}
                </div>
              ) : null}
            </footer>
          </section>

          <section className="panel" aria-labelledby="img-h">
            <header className="panel__head">
              <div className="panel__heading">
                <h2 className="panel__title" id="img-h">이미지 예시</h2>
                <p className="meta num">{pickedImages.length} / {images.length}개 선택</p>
              </div>
              <div className="panel__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAll(images, pickedImages.length !== images.length)} disabled={!images.length}>
                  {pickedImages.length === images.length && images.length ? '모두 해제' : '모두 선택'}
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setAddingImage((v) => !v)} aria-expanded={addingImage}>
                  <Icon name="plus" />추가
                </button>
              </div>
            </header>
            <div className="panel__body">
              {addingImage ? (
                <ImageForm
                  onDone={(row) => {
                    if (row) added(row);
                    setAddingImage(false);
                  }}
                />
              ) : null}
              {images.length ? (
                <section className="gallery" aria-label="이미지 예시 목록">
                  <ul className="gallery__track" data-view="grid">
                    {images.map((img) => (
                      <li key={img.id} className="preview tile">
                        <input type="checkbox" className="tile__check" id={`pick-${img.id}`} checked={selected.has(img.id)} onChange={() => toggle(img.id)} />
                        <label htmlFor={`pick-${img.id}`} className="tile__label">
                          <span className="preview__media">
                            <img src={img.url ?? ''} alt="" loading="lazy" width="640" height="400" />
                          </span>
                          {captioning === img.id ? null : <span className="preview__title">{img.title}</span>}
                        </label>
                        {captioning === img.id ? (
                          <CaptionForm
                            input={img}
                            onDone={(row) => {
                              if (row) setInputs((xs) => xs.map((x) => (x.id === row.id ? row : x)));
                              setCaptioning(null);
                            }}
                          />
                        ) : null}
                        <span className="tile__foot">
                          <span className="preview__site">{sourceLabel(img.source)}</span>
                          <span className="tile__btns">
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCaptioning(img.id)} aria-label={`${img.title} 캡션 수정`} aria-expanded={captioning === img.id}>캡션</button>
                            <button type="button" className="btn btn--ghost btn--danger btn--sm tile__del" onClick={() => void removeInput(img)} aria-label={`${img.title} 삭제`}>삭제</button>
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <div className="empty">
                  <p>이미지가 없어요. 파일을 올리거나 https 주소로 추가하세요.</p>
                  <button type="button" className="btn" onClick={() => void loadSeed()}>예시 이미지 불러오기</button>
                </div>
              )}
            </div>
          </section>

          <div className="plan-go">
            <button type="button" className="btn btn--primary" onClick={() => void generate()} disabled={busy || !pickedDecisions.length} aria-busy={busy}>
              <Icon name="doc" />기획서 만들기
            </button>
            <p className="meta">{pickedDecisions.length ? `결정 ${pickedDecisions.length}개와 이미지 ${pickedImages.length}개로 만들어요.` : '결정 문서를 하나 이상 골라 주세요.'}</p>
          </div>
        </div>

        <section className="panel doc-panel" aria-labelledby="doc-h" aria-busy={busy}>
          <header className="panel__head doc-panel__head">
            <div className="doc-panel__title">
              <h2 className="panel__title" id="doc-h">{doc ? `${doc.title} 기획서` : '기획서'}</h2>
              {doc ? (
                <p className="meta" suppressHydrationWarning>
                  LLM: {doc.provider ?? 'mock'}, {when(doc.created_at)} 생성
                </p>
              ) : null}
            </div>
            <div className="panel__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={download} disabled={!doc}><Icon name="download" />.md 다운로드</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void copy()} disabled={!doc}>
                <Icon name={copied ? 'check' : 'copy'} />{copied ? '복사했어요' : '마크다운 복사'}
              </button>
            </div>
          </header>
          <div className="panel__body">
            {note ? <div className="notice plan-notice" role="status"><Icon name="alert" /><p>{note}</p></div> : null}
            {busy ? (
              <div className="doc-skeleton" aria-hidden="true">
                <span className="skeleton" style={{ width: '55%' }} />
                <span className="skeleton" style={{ width: '90%' }} />
                <span className="skeleton" style={{ width: '80%' }} />
                <span className="skeleton" style={{ width: '35%' }} />
                <span className="skeleton" style={{ width: '85%' }} />
              </div>
            ) : !doc ? (
              <div className="empty">
                <p>아직 만든 기획서가 없어요. 왼쪽에서 결정과 이미지를 고른 뒤 기획서 만들기를 눌러 주세요.</p>
              </div>
            ) : (
              <>
                <div className="doc-tabbar">
                  <div className="tabs" role="tablist" aria-label="기획서 보기">
                    {TABS.map(([t, label]) => (
                      <button
                        key={t}
                        ref={(el) => { tabRefs.current[t] = el; }}
                        type="button"
                        role="tab"
                        className="tab"
                        id={`t-${t}`}
                        aria-selected={tab === t}
                        aria-controls={tab === t ? `p-${t}` : undefined}
                        tabIndex={tab === t ? 0 : -1}
                        onClick={() => setTab(t)}
                        onKeyDown={onTabKey}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="meta doc-save" role="status">{SAVE_TEXT[save]}</p>
                </div>
                <div className="tab-panel" role="tabpanel" id={`p-${tab}`} aria-labelledby={`t-${tab}`}>
                  {tab === 'preview' ? <Markdown markdown={md} /> : null}
                  {tab === 'markdown' ? (
                    <div className="doc-stack">
                      {editor}
                      <section className="doc-stack__preview" aria-labelledby="live-h">
                        <h3 className="doc-stack__title" id="live-h">실시간 미리보기</h3>
                        <Markdown markdown={md} />
                      </section>
                    </div>
                  ) : null}
                  {tab === 'split' ? (
                    <div className="doc-split">
                      {editor}
                      <div className="doc-split__preview" aria-label="미리보기"><Markdown markdown={md} /></div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
          {docs.length ? (
            <footer className="panel__foot doc-versions">
              <h3 className="doc-versions__title">저장된 기획서</h3>
              <ol className="doc-versions__list">
                {docs.map((d) => (
                  <li key={d.id}>
                    <button type="button" className="version" onClick={() => void openDoc(d.id)} aria-current={d.id === doc?.id ? 'true' : undefined}>
                      <span className="version__title">{d.title}</span>
                      <span className="version__meta" suppressHydrationWarning>{when(d.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </footer>
          ) : null}
        </section>
      </div>
    </>
  );
}

function DecisionForm({ input, onDone }: { input: InputRow | null; onDone: (row: InputRow | null) => void }) {
  const [title, setTitle] = useState(input?.title ?? '');
  const [body, setBody] = useState(input?.body ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = input?.id ?? 'new';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setErr('제목을 적어 주세요.');
    setBusy(true);
    setErr(null);
    try {
      const r = input
        ? await api<{ input: InputRow }>(`/api/inputs/${encodeURIComponent(input.id)}`, json('PATCH', { title, body }))
        : await api<{ input: InputRow }>('/api/inputs', json('POST', { kind: 'decision', title, body }));
      onDone(r.input);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="add-form" onSubmit={submit} aria-label={input ? '결정 문서 수정' : '결정 문서 추가'}>
      <div className="field">
        <label className="field__label" htmlFor={`dt-${id}`}>제목</label>
        <input className="input" id={`dt-${id}`} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="예: 전투와 실패 규칙" aria-invalid={!!err && !title.trim()} aria-describedby={`de-${id}`} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`db-${id}`}>본문 (Markdown)</label>
        <textarea className="textarea textarea--code" id={`db-${id}`} rows={7} value={body} maxLength={20000} onChange={(e) => setBody(e.target.value)} placeholder={'결정: 쓰러져도 레시피는 남긴다\n- 열린 질문: 보스가 필요할까?'} />
        <p className="field__help">`키: 값` 줄(가제, 장르, 플랫폼, 타깃)과 `열린 질문:` 줄은 기획서에 그대로 옮겨져요.</p>
      </div>
      <p className="field__error" id={`de-${id}`} role="alert">{err}</p>
      <div className="btn-row">
        <button type="submit" className="btn" disabled={busy} aria-busy={busy}>{input ? '고친 내용 저장' : '결정 추가'}</button>
        <button type="button" className="btn btn--ghost" onClick={() => onDone(null)}>닫기</button>
      </div>
    </form>
  );
}

function CaptionForm({ input, onDone }: { input: InputRow; onDone: (row: InputRow | null) => void }) {
  const [title, setTitle] = useState(input.title);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setErr('캡션을 적어 주세요.');
    setBusy(true);
    setErr(null);
    try {
      onDone((await api<{ input: InputRow }>(`/api/inputs/${encodeURIComponent(input.id)}`, json('PATCH', { title }))).input);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="caption-form" onSubmit={submit} aria-label="캡션 수정">
      <label className="field__label" htmlFor={`cap-${input.id}`}>캡션</label>
      <input className="input" id={`cap-${input.id}`} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus aria-invalid={!!err} aria-describedby={`cap-err-${input.id}`} />
      <p className="field__error" id={`cap-err-${input.id}`} role="alert">{err}</p>
      <div className="btn-row">
        <button type="submit" className="btn btn--sm" disabled={busy} aria-busy={busy}>저장</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDone(null)}>취소</button>
      </div>
    </form>
  );
}

function ImageForm({ onDone }: { onDone: (row: InputRow | null) => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file && !url.trim()) return setErr('파일을 고르거나 이미지 주소를 넣어 주세요.');
    if (file && file.size > MAX_UPLOAD) return setErr('이미지는 5MB 이하만 올릴 수 있어요.');
    // file.type can be empty or odd for a valid image, so the server's magic-byte check decides; SVG is refused early.
    if (file && (file.type === 'image/svg+xml' || /\.svgz?$/i.test(file.name))) return setErr('PNG, JPG, WEBP, GIF 이미지만 올릴 수 있어요.');
    if (!file && !/^https:\/\//i.test(url.trim())) return setErr('https:// 로 시작하는 주소를 넣어 주세요.');
    setBusy(true);
    setErr(null);
    try {
      let r: { input: InputRow };
      if (file) {
        const form = new FormData();
        form.set('file', file);
        form.set('title', title);
        r = await api('/api/inputs', { method: 'POST', body: form });
      } else r = await api('/api/inputs', json('POST', { kind: 'image', title: title || '참고 이미지', url: url.trim() }));
      onDone(r.input);
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="add-form" onSubmit={submit} aria-label="이미지 추가">
      <div className="field">
        <label className="field__label" htmlFor="img-title">캡션</label>
        <input className="input" id="img-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="예: 보스방 조명 레퍼런스" />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="img-file">이미지 파일</label>
        <input className="input input--file" id="img-file" type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp,image/gif" aria-describedby="img-file-help" />
        <p className="field__help" id="img-file-help">png, jpg, webp, gif 중 하나, 5MB 이하</p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="img-url">또는 이미지 주소</label>
        <input className="input" id="img-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://picsum.photos/seed/cave/640/400" aria-invalid={!!err} aria-describedby="img-err" />
      </div>
      <p className="field__error" id="img-err" role="alert">{err}</p>
      <div className="btn-row">
        <button type="submit" className="btn" disabled={busy} aria-busy={busy}>이미지 추가</button>
        <button type="button" className="btn btn--ghost" onClick={() => onDone(null)}>닫기</button>
      </div>
    </form>
  );
}
