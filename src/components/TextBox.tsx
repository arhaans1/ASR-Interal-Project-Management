'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface TextBoxProps {
  title?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// The box is always editable, like a document: type straight into it, links open on click,
// and changes save by themselves. Text is stored as plain text with light markers
// (**bold**, *italic*, <u>underline</u>); web addresses become links automatically.

const SAVE_DELAY_MS = 700;

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LINK_CLASS = 'text-indigo-600 hover:text-indigo-800 underline break-all cursor-pointer';

// Stored text -> what is shown in the box
export function toHtml(text: string): string {
  if (!text) return '';

  // Links are set aside first so formatting markers inside an address are left alone.
  const links: string[] = [];
  let html = escapeHtml(text).replace(/((?:https?:\/\/|www\.)[^\s<]+)/g, (url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url;
    links.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" class="${LINK_CLASS}">${url}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });

  html = html
    .replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^\n*]+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => links[Number(index)]);
}

// What is shown in the box -> stored text
export function toText(root: Node): string {
  let out = '';

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent || '').replace(/ /g, ' ');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName;

    if (tag === 'BR') {
      out += '\n';
      return;
    }
    // Browsers wrap pasted or typed lines in blocks: each one starts on a new line.
    if ((tag === 'DIV' || tag === 'P' || tag === 'LI') && out && !out.endsWith('\n')) {
      out += '\n';
    }

    const marker =
      tag === 'STRONG' || tag === 'B' ? ['**', '**']
        : tag === 'EM' || tag === 'I' ? ['*', '*']
          : tag === 'U' ? ['<u>', '</u>']
            : null;

    if (!marker) {
      el.childNodes.forEach(walk);
      return;
    }

    const before = out;
    out = '';
    el.childNodes.forEach(walk);
    const inner = out;
    // Markers hug the words, so spaces at the edges stay outside them.
    const lead = inner.match(/^\s*/)![0];
    const trail = inner.slice(lead.length).match(/\s*$/)![0];
    const core = inner.slice(lead.length, inner.length - trail.length);
    out = before + (core ? `${lead}${marker[0]}${core}${marker[1]}${trail}` : inner);
  };

  root.childNodes.forEach(walk);
  return out.replace(/\n+$/, '');
}

export default function TextBox({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
}: TextBoxProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(value); // what the database has, as far as this box knows
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isEmpty, setIsEmpty] = useState(!value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const render = useCallback((text: string) => {
    if (editorRef.current) editorRef.current.innerHTML = toHtml(text);
    setIsEmpty(!text);
  }, []);

  // Write the box out if it differs from what was last saved.
  const save = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!editorRef.current) return;
    const text = toText(editorRef.current);
    if (text === savedRef.current) {
      setStatus((s) => (s === 'saving' ? 'idle' : s));
      return;
    }
    savedRef.current = text;
    onChangeRef.current(text);
    setStatus('saved');
  }, []);

  // First paint
  useEffect(() => {
    render(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The value changed somewhere else: show it, unless the person is typing here right now.
  useEffect(() => {
    if (value === savedRef.current) return;
    savedRef.current = value;
    if (document.activeElement !== editorRef.current) render(value);
  }, [value, render]);

  // Leaving the page or switching client: do not lose the last few keystrokes.
  useEffect(() => {
    const editor = editorRef.current;
    return () => {
      if (timerRef.current && editor) {
        clearTimeout(timerRef.current);
        const text = toText(editor);
        if (text !== savedRef.current) onChangeRef.current(text);
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'saved') return;
    const timer = setTimeout(() => setStatus('idle'), 1500);
    return () => clearTimeout(timer);
  }, [status]);

  const handleInput = () => {
    if (!editorRef.current) return;
    setIsEmpty(toText(editorRef.current) === '' && !editorRef.current.textContent);
    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, SAVE_DELAY_MS);
  };

  const handleBlur = () => {
    save();
    // Tidy up: anything typed as a web address becomes a link.
    render(savedRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // A plain line break on Enter keeps the text simple
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };

  // Paste as plain text: no fonts, colours or sizes carried in from elsewhere
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand('insertLineBreak');
      if (line) document.execCommand('insertText', false, line);
    });
  };

  // Links open on click, in a new tab
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest('a');
    if (link && editorRef.current?.contains(link)) {
      e.preventDefault();
      window.open(link.getAttribute('href')!, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {isEmpty && (
        <span className="pointer-events-none absolute left-0 top-0 text-sm font-medium italic leading-relaxed text-gray-400">
          {placeholder}
        </span>
      )}

      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
        className="min-h-[inherit] w-full cursor-text whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-gray-700 outline-none focus-visible:outline-none"
        style={{ minHeight: 'inherit' }}
      />

      <span
        aria-live="polite"
        className={`pointer-events-none absolute -bottom-4 right-0 text-[11px] font-medium text-slate-400 transition-opacity duration-300 ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}
      >
        {status === 'saving' ? 'Saving…' : 'Saved'}
      </span>
    </div>
  );
}
