'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, FileText, Check } from 'lucide-react';

interface TextBoxProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: 'link' | 'note';
}

// Function to detect and linkify URLs in text
function linkifyText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:text-indigo-600 underline decoration-indigo-200 hover:decoration-indigo-400 break-all transition-colors"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function TextBox({
  title,
  value,
  onChange,
  placeholder = 'Start typing...',
  icon = 'note',
}: TextBoxProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
    setHasChanges(false);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    setHasChanges(e.target.value !== value);
  };

  const handleSave = () => {
    onChange(localValue);
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
      setIsEditing(false);
    }, 150);
  };

  const IconComponent = icon === 'link' ? Link2 : FileText;
  const bgGradient = icon === 'link'
    ? 'from-blue-50 to-cyan-50'
    : 'from-violet-50 to-purple-50';
  const iconBg = icon === 'link'
    ? 'from-blue-500 to-cyan-500'
    : 'from-violet-500 to-purple-500';

  return (
    <div className={`bg-gradient-to-br ${bgGradient} rounded-3xl p-6 h-full flex flex-col border border-white/50`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-slate-800">{title}</h3>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-2xl p-4 min-h-[180px]">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full h-full min-h-[160px] resize-none border-0 focus:ring-0 outline-none text-sm text-slate-700 placeholder-slate-400 leading-relaxed"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full min-h-[160px] cursor-text text-sm text-slate-700 whitespace-pre-wrap leading-relaxed"
          >
            {localValue ? (
              <div className="whitespace-pre-wrap">{linkifyText(localValue)}</div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
