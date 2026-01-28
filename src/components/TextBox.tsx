'use client';

import { useState, useEffect, useRef } from 'react';
import { Save } from 'lucide-react';

interface TextBoxProps {
  title?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Function to render rich text (Bold, Italic, Underline, Links)
function renderRichText(text: string): React.ReactNode[] {
  if (!text) return [];

  const formatRules = [
    { type: 'bold', regex: /\*\*(.+?)\*\*/ },
    { type: 'italic', regex: /\*(.+?)\*/ },
    { type: 'underline', regex: /<u>(.+?)<\/u>/ },
    { type: 'link', regex: /((?:https?:\/\/|www\.)[^\s]+)/ }
  ];

  let bestMatch: RegExpMatchArray | null = null;
  let bestRule: { type: string; regex: RegExp } | null = null;
  let minIndex = text.length;

  formatRules.forEach(rule => {
    const match = text.match(rule.regex);
    if (match && match.index! < minIndex) {
      minIndex = match.index!;
      bestMatch = match;
      bestRule = rule;
    }
  });

  if (!bestMatch || !bestRule) {
    return [text];
  }

  const pre = text.substring(0, minIndex);
  const matchFull = (bestMatch as any)[0];
  const content = (bestMatch as any)[1]; // Inner content (group 1) for formatting, or full match for link if invalid group
  const post = text.substring(minIndex + matchFull.length);

  // Recursively render pre & post
  const preNodes = renderRichText(pre);
  const postNodes = renderRichText(post);

  let midNode: React.ReactNode;
  const keyCheck = `${minIndex}-${matchFull.length}`; // Simple unique key part

  if ((bestRule as any).type === 'link') {
    const href = matchFull.startsWith('www.') ? `https://${matchFull}` : matchFull;
    midNode = (
      <a
        key={`link-${keyCheck}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-indigo-600 hover:text-indigo-800 underline break-all cursor-pointer relative z-20"
      >
        {matchFull}
      </a>
    );
  } else if ((bestRule as any).type === 'bold') {
    midNode = <strong key={`bold-${keyCheck}`} className="font-bold">{renderRichText(content)}</strong>;
  } else if ((bestRule as any).type === 'italic') {
    midNode = <em key={`italic-${keyCheck}`} className="italic">{renderRichText(content)}</em>;
  } else if ((bestRule as any).type === 'underline') {
    midNode = <u key={`underline-${keyCheck}`} className="underline">{renderRichText(content)}</u>;
  }

  return [...preNodes, midNode!, ...postNodes];
}

export default function TextBox({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
}: TextBoxProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
    setHasChanges(false);
  }, [value]);

  // key fix: auto-expand textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    setHasChanges(e.target.value !== value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keyboard shortcuts for formatting: Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline)
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();

      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const text = e.currentTarget.value;
      const selected = text.substring(start, end);

      // Define markers
      let prefix = '';
      let suffix = '';

      if (e.key.toLowerCase() === 'b') { prefix = '**'; suffix = '**'; }
      else if (e.key.toLowerCase() === 'i') { prefix = '*'; suffix = '*'; }
      else if (e.key.toLowerCase() === 'u') { prefix = '<u>'; suffix = '</u>'; }

      const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);

      setLocalValue(newText);
      setHasChanges(newText !== value);

      // Restore selection to cover the wrapped text (or inside it?)
      // Let's select the inner text so user can keep typing or editing it
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
        }
      }, 0);
    }
  };

  const handleSave = () => {
    onChange(localValue);
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the new focus target is inside the container (e.g. the link or save button)
    // Actually, save button is outside the textarea.
    // We want to save on blur, but delay allow save click?
    // User requested "clicking anywhere boxes should make them editable".
    // When editing, clicking OUTSIDE should save/close.

    // Simple delay logic is fine for now
    setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
      setIsEditing(false);
    }, 200);
  };

  return (
    <div className={`relative group/textbox ${className}`}>
      {/* Save Indicator - Floating absolute */}
      {hasChanges && (
        <button
          onClick={handleSave}
          className="absolute -top-2 right-0 z-30 flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold shadow-sm opacity-100 transition-opacity"
        >
          <Save className="w-3 h-3" />
          Save
        </button>
      )}

      <div className="min-h-[100px] h-full w-full">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            className="w-full h-full resize-none bg-transparent border-0 focus:ring-0 outline-none text-sm text-gray-700 placeholder-gray-400 p-0 font-medium leading-relaxed overflow-hidden"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full cursor-text text-sm text-gray-700 whitespace-pre-wrap p-0 font-medium leading-relaxed min-h-[100px]"
          >
            {localValue ? (
              <div className="whitespace-pre-wrap break-words">
                {renderRichText(localValue)}
              </div>
            ) : (
              <span className="text-gray-400 italic">{placeholder}</span>
            )}

            {/* Edit hint on hover */}
            <div className="absolute bottom-0 right-0 opacity-0 group-hover/textbox:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Click to edit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
