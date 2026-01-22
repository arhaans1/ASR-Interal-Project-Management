'use client';

import { useState, useEffect, useRef } from 'react';
import { Save } from 'lucide-react';

interface TextBoxProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
  title,
  value,
  onChange,
  placeholder = 'Start typing...',
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 min-h-[150px]">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full h-full min-h-[130px] resize-none border-0 focus:ring-0 outline-none text-sm text-gray-700 placeholder-gray-400"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full min-h-[130px] cursor-text text-sm text-gray-700 whitespace-pre-wrap"
          >
            {localValue ? (
              <div className="whitespace-pre-wrap">
                {linkifyText(localValue)}
              </div>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
