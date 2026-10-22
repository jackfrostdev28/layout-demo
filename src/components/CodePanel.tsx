import { useEffect, useMemo, useRef, useState } from 'react';
import { copyText } from '../copy';
import { highlightCss, highlightHtml, type Token } from '../highlight';
import { generateAll, generateCss, generateHtml, type Layout } from '../model';

type CopyId = 'css' | 'html' | 'all';
type CopyState = { id: CopyId; ok: boolean } | null;

const COPIED_MS = 2000;

export function CodePanel({ layout }: { layout: Layout }) {
  const [tab, setTab] = useState<Exclude<CopyId, 'all'>>('css');
  const [copied, setCopied] = useState<CopyState>(null);
  const timer = useRef<number | null>(null);
  const css = generateCss(layout);
  const html = generateHtml(layout.areas);
  const everything = generateAll(layout);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy(id: CopyId) {
    const text = id === 'css' ? css : id === 'html' ? html : everything;
    const ok = await copyText(text);
    setCopied({ id, ok });
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), COPIED_MS);
  }

  return (
    <section className="panel code-panel" aria-labelledby="code-heading">
      <div className="code-toolbar">
        <h2 id="code-heading">Generated code</h2>
        <div className="code-tabs" role="tablist" aria-label="Code language">
          <button
            type="button"
            id="code-tab-css"
            role="tab"
            aria-selected={tab === 'css'}
            aria-controls="code-panel-css"
            tabIndex={tab === 'css' ? 0 : -1}
            className={tab === 'css' ? 'code-tab is-selected' : 'code-tab'}
            onClick={() => setTab('css')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                setTab(tab === 'css' ? 'html' : 'css');
                requestAnimationFrame(() => document.getElementById(tab === 'css' ? 'code-tab-html' : 'code-tab-css')?.focus());
              }
            }}
          >
            CSS
          </button>
          <button
            type="button"
            id="code-tab-html"
            role="tab"
            aria-selected={tab === 'html'}
            aria-controls="code-panel-html"
            tabIndex={tab === 'html' ? 0 : -1}
            className={tab === 'html' ? 'code-tab is-selected' : 'code-tab'}
            onClick={() => setTab('html')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                setTab(tab === 'html' ? 'css' : 'html');
                requestAnimationFrame(() => document.getElementById(tab === 'html' ? 'code-tab-css' : 'code-tab-html')?.focus());
              }
            }}
          >
            HTML
          </button>
        </div>
      </div>
      <div className="code-actions">
        <CopyButton id="css" copied={copied} idle="Copy CSS" onClick={() => copy('css')} />
        <CopyButton id="html" copied={copied} idle="Copy HTML" onClick={() => copy('html')} />
        <CopyButton id="all" copied={copied} idle="Copy all" onClick={() => copy('all')} />
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? (copied.ok ? `${copied.id === 'all' ? 'CSS and HTML' : copied.id.toUpperCase()} copied` : 'Copy failed') : ''}
      </p>
      <div
        id="code-panel-css"
        role="tabpanel"
        aria-labelledby="code-tab-css"
        hidden={tab !== 'css'}
      >
        {tab === 'css' ? <Highlighted code={css} language="css" testId="css-output" /> : null}
      </div>
      <div
        id="code-panel-html"
        role="tabpanel"
        aria-labelledby="code-tab-html"
        hidden={tab !== 'html'}
      >
        {tab === 'html' ? <Highlighted code={html} language="html" testId="html-output" /> : null}
      </div>
    </section>
  );
}

function CopyButton({
  id,
  copied,
  idle,
  onClick,
}: {
  id: CopyId;
  copied: CopyState;
  idle: string;
  onClick: () => void;
}) {
  const active = copied !== null && copied.id === id;
  const label = !active ? idle : copied.ok ? 'Copied!' : 'Copy failed';
  return (
    <button type="button" className={active && copied.ok ? 'btn is-copied' : 'btn'} onClick={onClick} aria-label={label}>
      {label}
    </button>
  );
}

function Highlighted({ code, language, testId }: { code: string; language: 'css' | 'html'; testId: string }) {
  const tokens = useMemo(() => (language === 'css' ? highlightCss(code) : highlightHtml(code)), [code, language]);
  return (
    <pre className="code" tabIndex={0} aria-label={language === 'css' ? 'Generated CSS' : 'Generated HTML'} data-testid={testId}>
      <code>
        {tokens.map((token, index) => (
          <TokenSpan key={index} token={token} />
        ))}
      </code>
    </pre>
  );
}

function TokenSpan({ token }: { token: Token }) {
  if (token.kind === 'plain') return <span>{token.text}</span>;
  return <span className={`tok tok-${token.kind}`}>{token.text}</span>;
}
