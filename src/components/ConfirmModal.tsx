'use client';

import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isDestructive && (
                            <div className="p-2 bg-red-50 text-red-500 rounded-full">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {title}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 py-2">
                    <p className="text-gray-600 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="p-8 pt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-5 py-3 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 hover:text-gray-800 transition-colors font-semibold shadow-sm"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-5 py-3 text-white rounded-2xl transition-all font-semibold shadow-lg hover:shadow-xl ring-1 ring-white/20 ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-slate-900 hover:bg-slate-800'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
