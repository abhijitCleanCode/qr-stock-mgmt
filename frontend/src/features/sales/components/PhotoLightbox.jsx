import { useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";

// Full-size view of one photo, with keyboard navigation — a salesperson checking a colour before
// sending it to a customer is looking closely, and the grid thumbnails are too small for that.
const PhotoLightbox = ({ items, index, onIndexChange, onClose, selected, onToggle }) => {
    const item = items[index];

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "Escape") onClose();
            else if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
            else if (event.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [index, items.length, onClose, onIndexChange]);

    if (!item) return null;

    const isSelected = Boolean(selected[item.colorVariantId]);

    return (
        <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0F172A]/90 p-6"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-lg">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute -right-2 -top-2 z-10 flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1E1B4B]"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                {index > 0 && (
                    <button
                        type="button"
                        onClick={() => onIndexChange(index - 1)}
                        className="absolute left-2 top-[42%] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1E1B4B] lg:-left-14"
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}

                {index < items.length - 1 && (
                    <button
                        type="button"
                        onClick={() => onIndexChange(index + 1)}
                        className="absolute right-2 top-[42%] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1E1B4B] lg:-right-14"
                        aria-label="Next"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                )}

                <img src={item.imageUrl} alt={`${item.designCode} ${item.colorName}`} className="max-h-[74vh] w-full rounded-2xl bg-white object-contain" />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-white">
                    <div>
                        <b className="text-sm">{item.designCode} · {item.colorName}</b>
                        <div className="text-xs text-white/60">{item.designName} · {item.label} · {index + 1} of {items.length}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onToggle(item.colorVariantId)}
                        className="flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"
                    >
                        {isSelected && <Check className="h-3.5 w-3.5" />} {isSelected ? "Selected" : "Select"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhotoLightbox;
