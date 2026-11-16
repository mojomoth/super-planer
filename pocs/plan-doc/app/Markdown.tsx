'use client';
import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Raw HTML stays off (react-markdown default) and the default urlTransform drops javascript: and other unsafe links.
/** `firstImg` is the source offset of the first `![`, so the likely LCP image loads eagerly and the rest stay lazy. */
const makeComponents = (firstImg: number): Components => ({
  // A paragraph holding an image becomes a div so the <figure> below stays valid HTML.
  p({ node, children }) {
    const hasImg = node?.children.some((c) => c.type === 'element' && c.tagName === 'img');
    return hasImg ? <div className="md-imgs">{children}</div> : <p>{children}</p>;
  },
  img({ node, src, alt }) {
    if (typeof src !== 'string' || !src) return null;
    const first = node?.position?.start.offset === firstImg;
    return (
      <figure>
        <img src={src} alt={alt ?? ''} loading={first ? 'eager' : 'lazy'} fetchPriority={first ? 'high' : 'auto'} />
        {alt ? <figcaption aria-hidden="true">{alt}</figcaption> : null}
      </figure>
    );
  },
  a({ href, children }) {
    const external = typeof href === 'string' && /^https?:\/\//.test(href);
    return external ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <a href={href}>{children}</a>;
  },
  table({ children }) {
    return (
      <div className="md-table">
        <table>{children}</table>
      </div>
    );
  },
});

export default function Markdown({ markdown }: { markdown: string }) {
  const firstImg = markdown.indexOf('![');
  const components = useMemo(() => makeComponents(firstImg), [firstImg]);
  return (
    <article className="md-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
