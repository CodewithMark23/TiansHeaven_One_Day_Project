import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PhotoLayoutId, PhotoLayoutOption } from '../../types';
import { PHOTO_LAYOUT_OPTIONS } from '../../types';

interface PhotoLayoutArrowSelectorProps {
    selectedId: PhotoLayoutId;
    onChange: (layout: PhotoLayoutOption) => void;
    disabled?: boolean;
}

export default function PhotoLayoutArrowSelector({
    selectedId,
    onChange,
    disabled = false,
}: PhotoLayoutArrowSelectorProps) {
    const currentIndex = PHOTO_LAYOUT_OPTIONS.findIndex((l) => l.id === selectedId);
    const current = PHOTO_LAYOUT_OPTIONS[currentIndex] ?? PHOTO_LAYOUT_OPTIONS[0];

    const goTo = (dir: -1 | 1) => {
        if (disabled) return;
        const nextIndex =
            (currentIndex + dir + PHOTO_LAYOUT_OPTIONS.length) % PHOTO_LAYOUT_OPTIONS.length;
        onChange(PHOTO_LAYOUT_OPTIONS[nextIndex]);
    };

    return (
        <div className="w-full flex items-center justify-between gap-2 mb-3">
            <motion.button
                whileHover={{ scale: disabled ? 1 : 1.1 }}
                whileTap={{ scale: disabled ? 1 : 0.9 }}
                onClick={() => goTo(-1)}
                disabled={disabled}
                className="w-7 h-7 rounded-full flex items-center justify-center border border-emerald-200 bg-white/80 text-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <ChevronLeft className="w-4 h-4" />
            </motion.button>

            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 text-center"
                >
                    <span className="font-cute text-xs font-bold block" style={{ color: '#7A5C6A' }}>
                        {current.label}
                    </span>
                    <span className="font-cute text-[10px] text-emerald-500 block">
                        {current.photoCount} {current.photoCount === 1 ? 'pose' : 'poses'}
                    </span>
                </motion.div>
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: disabled ? 1 : 1.1 }}
                whileTap={{ scale: disabled ? 1 : 0.9 }}
                onClick={() => goTo(1)}
                disabled={disabled}
                className="w-7 h-7 rounded-full flex items-center justify-center border border-emerald-200 bg-white/80 text-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <ChevronRight className="w-4 h-4" />
            </motion.button>
        </div>
    );
}
