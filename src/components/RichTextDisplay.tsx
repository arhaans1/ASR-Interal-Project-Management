import React from 'react';

interface RichTextDisplayProps {
    content: string;
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
                className="text-indigo-600 hover:text-indigo-800 underline break-all cursor-pointer relative z-20 font-bold"
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

export default function RichTextDisplay({ content, className = '' }: RichTextDisplayProps) {
    if (!content) return null;

    return (
        <div className={`whitespace-pre-wrap break-words text-sm text-gray-600 leading-relaxed ${className}`}>
            {renderRichText(content)}
        </div>
    );
}
