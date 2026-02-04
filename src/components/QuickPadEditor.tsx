'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Type, PenTool, Eraser, Bold, Italic, Underline } from 'lucide-react';

interface QuickPadEditorProps {
    initialContent: string;
    initialDrawing: string;
    onSave: (content: string, drawing: string) => void;
}

const QuickPadEditor = forwardRef<{ save: () => void }, QuickPadEditorProps>(({
    initialContent,
    initialDrawing,
    onSave
}, ref) => {
    const [mode, setMode] = useState<'text' | 'marker' | 'eraser'>('text');
    const [isDrawing, setIsDrawing] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize content
    useEffect(() => {
        if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = initialContent;
        }
    }, [initialContent]);

    // Initialize drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && initialDrawing) {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx?.clearRect(0, 0, canvas.width, canvas.height); // Clear before draw
                ctx?.drawImage(img, 0, 0);
            };
            img.src = initialDrawing;
        } else if (canvas) {
            // Clear if empty
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [initialDrawing]);

    // Handle Resize for Canvas
    useEffect(() => {
        const resizeCanvas = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.offsetWidth;
                canvasRef.current.height = containerRef.current.offsetHeight;
                // Re-draw if needed (would need to store stroke history for perfect resize, 
                // but for now scaling/bitmap restoration is complex without history. 
                // Simpler: Just resize. Bitmap might clear if we reset width.
                // Restoration:
                if (initialDrawing) {
                    const img = new Image();
                    img.onload = () => canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0);
                    img.src = initialDrawing;
                }
            }
        };

        // Initial resize
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [initialDrawing]);

    // Expose save method
    useImperativeHandle(ref, () => ({
        save: () => {
            const content = editorRef.current?.innerHTML || '';
            const drawing = canvasRef.current?.toDataURL() || '';
            onSave(content, drawing);
        }
    }));

    // Auto-save on blur or periodic? 
    // Let's rely on parent triggering save or local debounced save.
    // For now parent controls save via ref or we call onSave on changes.
    const handleContentChange = () => {
        // Debounce this in real app
        const content = editorRef.current?.innerHTML || '';
        const drawing = canvasRef.current?.toDataURL() || '';
        onSave(content, drawing);
    };

    const handleDrawingEnd = () => {
        const content = editorRef.current?.innerHTML || '';
        const drawing = canvasRef.current?.toDataURL() || '';
        onSave(content, drawing);
    }

    // Formatting helpers
    const execFormat = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
    };

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode === 'text') return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        // Handle Touch or Mouse
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        ctx.lineWidth = mode === 'marker' ? 3 : 20; // Eraser is bigger
        ctx.lineCap = 'round';
        ctx.strokeStyle = mode === 'marker' ? '#000000' : 'rgba(0,0,0,1)';
        ctx.globalCompositeOperation = mode === 'marker' ? 'source-over' : 'destination-out';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || mode === 'text') return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (mode !== 'text') handleDrawingEnd();
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-1">
                    {/* Tools */}
                    <button
                        onClick={() => setMode('text')}
                        className={`p-2 rounded-lg transition-colors ${mode === 'text' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="Text Mode"
                    >
                        <Type className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setMode('marker')}
                        className={`p-2 rounded-lg transition-colors ${mode === 'marker' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="Marker"
                    >
                        <div className="w-4 h-4 rounded-full bg-black mx-0.5" />
                        {/* <PenTool className="w-5 h-5" /> */}
                    </button>
                    <button
                        onClick={() => setMode('eraser')}
                        className={`p-2 rounded-lg transition-colors ${mode === 'eraser' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5" />
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-200 mx-2" />

                <div className="flex items-center gap-1">
                    {/* Formatting - Only works in text mode logically, but button availability is fine */}
                    <button onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"><Bold className="w-4 h-4" /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"><Italic className="w-4 h-4" /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"><Underline className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Editor Container */}
            <div ref={containerRef} className="relative flex-1 cursor-text">
                {/* Layer 1: ContentEditable */}
                <div
                    ref={editorRef}
                    contentEditable={true} // Always editable, but clicks might be intercepted by canvas if z-index is wrong
                    onInput={handleContentChange}
                    className="absolute inset-0 p-6 outline-none overflow-y-auto z-10 font-medium text-gray-700 leading-relaxed"
                    style={{ minHeight: '100%', pointerEvents: mode === 'text' ? 'auto' : 'none' }} // allow clicking through if drawing
                />

                {/* Layer 2: Canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 z-20 touch-none"
                    style={{
                        pointerEvents: mode === 'text' ? 'none' : 'auto', // Pass through to text if in text mode
                        cursor: mode === 'eraser' ? 'crosshair' : 'default'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
        </div>
    );
});

QuickPadEditor.displayName = 'QuickPadEditor';
export default QuickPadEditor;
