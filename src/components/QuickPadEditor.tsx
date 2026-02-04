'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Type, Eraser, Bold, Italic, Underline, Trash2 } from 'lucide-react';

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

    // For smoothing
    const pointsRef = useRef<{ x: number, y: number }[]>([]);

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
                // Save current content to restore after resize clears it
                const currentData = canvasRef.current.toDataURL();

                canvasRef.current.width = containerRef.current.offsetWidth;
                canvasRef.current.height = containerRef.current.offsetHeight;

                // Restore
                const img = new Image();
                img.onload = () => {
                    canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0);
                };
                img.src = currentData;
            }
        };

        // Initial resize
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []); // Remove dependency on initialDrawing to avoid reset loop

    // Expose save method
    useImperativeHandle(ref, () => ({
        save: () => {
            const content = editorRef.current?.innerHTML || '';
            const drawing = canvasRef.current?.toDataURL() || '';
            onSave(content, drawing);
        }
    }));

    const handleContentChange = () => {
        const content = editorRef.current?.innerHTML || '';
        const drawing = canvasRef.current?.toDataURL() || '';
        onSave(content, drawing);
    };

    const handleDrawingEnd = () => {
        const content = editorRef.current?.innerHTML || '';
        const drawing = canvasRef.current?.toDataURL() || '';
        onSave(content, drawing);
        pointsRef.current = []; // Reset points
    }

    // Formatting helpers
    const execFormat = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            handleDrawingEnd();
        }
    };

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (mode === 'text') return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Fix coordinate extraction
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        pointsRef.current = [{ x, y }];

        ctx.lineWidth = mode === 'marker' ? 3 : 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = mode === 'marker' ? '#000000' : 'rgba(0,0,0,1)';
        ctx.globalCompositeOperation = mode === 'marker' ? 'source-over' : 'destination-out';

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y); // Draw dot
        ctx.stroke();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || mode === 'text') return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        pointsRef.current.push({ x, y });
        const points = pointsRef.current;

        // Smoothing Logic: Quadratic Curve
        if (points.length > 2) {
            if (mode === 'marker') {
                const p1 = points[points.length - 2];
                const p2 = points[points.length - 1];
                const p0 = points[points.length - 3];

                // Simple smoothing by using midpoints
                const mid1x = (p0.x + p1.x) / 2;
                const mid1y = (p0.y + p1.y) / 2;
                const mid2x = (p1.x + p2.x) / 2;
                const mid2y = (p1.y + p2.y) / 2;

                ctx.beginPath();
                ctx.moveTo(mid1x, mid1y);
                ctx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
                ctx.stroke();
            } else {
                // Eraser - simple lines are better for responsive feel
                const p2 = points[points.length - 1];
                const p1 = points[points.length - 2];
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (mode !== 'text') {
            pointsRef.current = [];
            handleDrawingEnd();
        }
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
                    </button>
                    <button
                        onClick={() => setMode('eraser')}
                        className={`p-2 rounded-lg transition-colors ${mode === 'eraser' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5" />
                    </button>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    <button
                        onClick={clearCanvas}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Clear All Drawing"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-200 mx-2" />

                <div className="flex items-center gap-1">
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
                    contentEditable={true}
                    onInput={handleContentChange}
                    className="absolute inset-0 p-6 outline-none overflow-y-auto z-10 font-medium text-gray-700 leading-relaxed"
                    style={{ minHeight: '100%', pointerEvents: mode === 'text' ? 'auto' : 'none' }}
                />

                {/* Layer 2: Canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 z-20 touch-none"
                    style={{
                        pointerEvents: mode === 'text' ? 'none' : 'auto',
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
