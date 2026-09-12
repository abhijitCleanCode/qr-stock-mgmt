import { useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import ActionModal from "@/components/shared/ActionModal";
import { Button } from "@/components/ui/button";

// A simple, self-contained image preview for the Item Photos Gallery — opened for one photo
// at a time, with Next/Previous cycling through the same `photos` array the grid renders.
const PhotoLightbox = ({ photos, index, onIndexChange, onClose }) => {
  const photo = photos[index];

  const goPrev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const goNext = () => onIndexChange((index + 1) % photos.length);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") goPrev();
      else if (event.key === "ArrowRight") goNext();
      else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!photo) return null;

  return (
    <ActionModal
      openActionModal
      setOpenActionModal={(open) => !open && onClose()}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col items-center gap-3 p-4 sm:p-6">
        <div className="relative flex w-full items-center justify-center">
          {photos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-0 z-10"
              onClick={goPrev}
              aria-label="Previous photo"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
          )}

          <img
            src={photo.imageUrl}
            alt="Order form item"
            className="max-h-[65vh] max-w-full rounded-xl border border-border object-contain"
          />

          {photos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-0 z-10"
              onClick={goNext}
              aria-label="Next photo"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          )}
        </div>

        {photos.length > 1 && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {index + 1} / {photos.length}
          </span>
        )}
      </div>
    </ActionModal>
  );
};

export default PhotoLightbox;
