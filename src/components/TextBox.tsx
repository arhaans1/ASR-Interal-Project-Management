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
          className="text-indigo-600 hover:text-indigo-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
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
    // Small delay to allow save button click to register
    setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
      setIsEditing(false);
    }, 150);
  };

  return (
    <div className={`relative group/textbox ${className}`}>
      {/* Save Indicator - Floating absolute */}
      {hasChanges && (
        <button
          onClick={handleSave}
          className="absolute top-0 right-0 z-10 flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold shadow-sm opacity-100 transition-opacity transform -translate-y-1/2 translate-x-1/2"
        >
          <Save className="w-3 h-3" />
          Save
        </button>
      )}

      <div className="h-full">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full h-full resize-none bg-transparent border-0 focus:ring-0 outline-none text-sm text-gray-700 placeholder-gray-400 p-0 font-medium leading-relaxed"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full cursor-text text-sm text-gray-700 whitespace-pre-wrap p-0 font-medium leading-relaxed min-h-[60px]"
          >
            {localValue ? (
              <div className="whitespace-pre-wrap break-words">
                {linkifyText(localValue)}
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
