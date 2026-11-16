'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hostOf, isImageUrl } from '@/lib/urls';
import { Icon } from './icons';

type Preview = { url: string; kind: 'image' | 'page'; title: string | null; description: string | null; image: string | null; site: string | null; error?: string };

// One request per URL per page load, shared by every gallery that shows it.
const cache = new Map<string, Promise<Preview>>();
function loadPreview(url: string): Promise<Preview> {
  let p = cache.get(url);
  if (!p) {
    const failed: Preview = { url, kind: 'page', title: null, description: null, image: null, site: hostOf(url), error: 'failed' };
    p = fetch(`/api/preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Preview>) : failed))
      .catch(() => failed);
    cache.set(url, p);
  }
  return p;
}

type Open = (src: string, alt: string, from: HTMLElement) => void;

// The first tile is the visible slide, so it loads right away; the rest wait until scrolled near.
function Img({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <><Icon name="alert" /><span className="visually-hidden">이미지를 불러오지 못했어요</span></>;
  return <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" width="640" height="400" onError={() => setBroken(true)} />;
}

// Agent text can carry any URL, including bad percent escapes: never let one throw during render.
function fileName(url: string, host: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    return last ? decodeURIComponent(last) : host;
  } catch {
    return host;
  }
}

function ImageTile({ url, onOpen, eager }: { url: string; onOpen: Open; eager: boolean }) {
  const host = hostOf(url);
  const name = fileName(url, host);
  const alt = `${host}의 이미지 ${name}`;
  return (
    <li className="preview">
      <button type="button" className="preview__link preview__btn" aria-label={`${alt} 크게 보기`} onClick={(e) => onOpen(url, alt, e.currentTarget)}>
        <span className="preview__media"><Img src={url} alt={alt} eager={eager} /></span>
        <span className="preview__title">{name}</span>
        <span className="preview__site">{host}</span>
      </button>
    </li>
  );
}

function PageTile({ url, eager }: { url: string; eager: boolean }) {
  const [p, setP] = useState<Preview | null>(null);
  useEffect(() => {
    let live = true;
    loadPreview(url).then((r) => live && setP(r));
    return () => {
      live = false;
    };
  }, [url]);
  const host = hostOf(url);
  return (
    <li className="preview" aria-busy={!p}>
      <a className="preview__link" href={url} target="_blank" rel="noopener noreferrer">
        <span className="preview__media">
          {!p ? <span className="skeleton preview__skel" /> : p.image ? <Img src={p.image} alt="" eager={eager} /> : <Icon name="link" />}
        </span>
        {p?.title ? <span className="preview__title">{p.title}</span> : <span className="preview__title preview__title--url">{url}</span>}
        <span className="preview__site">{p?.site ?? host}</span>
      </a>
    </li>
  );
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Gallery({ urls }: { urls: string[] }) {
  const [view, setView] = useState<'slide' | 'grid'>('slide');
  const [pos, setPos] = useState(0);
  const [box, setBox] = useState<{ src: string; alt: string } | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!box) return;
    dialog.current?.showModal();
    closeBtn.current?.focus();
  }, [box]);

  const stride = () => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    return el && first ? first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0') : 1;
  };
  const go = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * stride(), behavior: reduceMotion() ? 'auto' : 'smooth' });
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setPos(atEnd ? urls.length - 1 : Math.round(el.scrollLeft / stride()));
  };
  const open: Open = (src, alt, from) => {
    opener.current = from;
    setBox({ src, alt });
  };

  return (
    <section className="gallery nowheel" aria-label="링크 미리보기">
      <div className="gallery__bar">
        <p className="meta num">미리보기 {urls.length}개</p>
        {urls.length > 1 && (
          <div className="seg" role="group" aria-label="보기 방식">
            <button type="button" aria-pressed={view === 'slide'} onClick={() => setView('slide')}>슬라이드</button>
            <button type="button" aria-pressed={view === 'grid'} onClick={() => { setView('grid'); setPos(0); }}>격자</button>
          </div>
        )}
      </div>
      <ul className="gallery__track" data-view={urls.length > 1 ? view : 'grid1'} ref={track} onScroll={view === 'slide' ? onScroll : undefined}>
        {urls.map((u, i) => (isImageUrl(u) ? <ImageTile key={u} url={u} onOpen={open} eager={i === 0} /> : <PageTile key={u} url={u} eager={i === 0} />))}
      </ul>
      {urls.length > 1 && view === 'slide' && (
        <div className="gallery__nav">
          <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="이전 미리보기" onClick={() => go(-1)} disabled={pos === 0}><Icon name="prev" /></button>
          <p className="meta num" aria-live="polite">{pos + 1} / {urls.length}</p>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" aria-label="다음 미리보기" onClick={() => go(1)} disabled={pos >= urls.length - 1}><Icon name="next" /></button>
        </div>
      )}
      {box && createPortal(
        <dialog
          ref={dialog} className="lightbox" aria-label={box.alt}
          onClose={() => { setBox(null); opener.current?.focus(); }}
          onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        >
          <img src={box.src} alt={box.alt} />
          <div className="lightbox__bar">
            <a className="url meta" href={box.src} target="_blank" rel="noopener noreferrer">{box.src}</a>
            <form method="dialog"><button type="submit" className="btn btn--sm" ref={closeBtn}>닫기</button></form>
          </div>
        </dialog>,
        document.body,
      )}
    </section>
  );
}
