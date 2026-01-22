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
  // Regex to capture URLs starting with http/https or www.
  // Note: Simple regex for demonstration, can be improved for edge cases
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent triggering edit mode when clicking link
          className="text-indigo-600 hover:text-indigo-800 underline break-all cursor-pointer relative z-20"
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
