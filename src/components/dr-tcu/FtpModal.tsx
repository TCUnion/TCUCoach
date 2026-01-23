import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, AlertCircle } from 'lucide-react';

interface FtpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFtp: number;
    onSave: (ftp: number) => void;
}

export default function FtpModal({ isOpen, onClose, currentFtp, onSave }: FtpModalProps) {
    const [ftpValue, setFtpValue] = useState(currentFtp.toString());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFtpValue(currentFtp.toString());
            setError(null);
        }
    }, [isOpen, currentFtp]);

    const handleSave = () => {
        const numValue = Number(ftpValue);
        if (isNaN(numValue) || numValue < 50 || numValue > 600) {
            setError('請輸入合理的 FTP 數值 (50 - 600)');
            return;
        }
        onSave(numValue);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <Zap className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-display font-medium text-white">修改 FTP 設定</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-dr-muted" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="ftp-input" className="text-sm font-medium text-dr-muted block">
                                    功能性閾值功率 (Functional Threshold Power)
                                </label>
                                <div className="relative">
                                    <input
                                        id="ftp-input"
                                        type="number"
                                        value={ftpValue}
                                        onChange={(e) => {
                                            setFtpValue(e.target.value);
                                            setError(null);
                                        }}
                                        className="w-full bg-background/50 border border-white/10 text-white text-4xl font-display font-bold rounded-2xl px-6 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="200"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSave();
                                            if (e.key === 'Escape') onClose();
                                        }}
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-dr-muted font-mono font-bold">W</span>
                                </div>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 text-red-400 text-xs font-medium pt-2"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </motion.div>
                                )}
                            </div>

                            <p className="text-xs text-dr-muted leading-relaxed">
                                FTP 是您穩定騎乘一小時所能維持的最大平均功率。此數值將用於計算您的訓練強度 (IF) 與訓練壓力 (TSS)。
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                            >
                                儲存變更
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
