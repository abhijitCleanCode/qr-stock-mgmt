import { useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  CheckSquareIcon,
  DownloadIcon,
  ImageIcon,
  Loader2Icon,
  MessageCircleIcon,
  MoreVerticalIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ActionModal from "@/components/shared/ActionModal";

import { useOrderFormPhotosApi } from "../hooks/useOrderFormPhotosApi";
import { useUploadOrderFormPhotosApi } from "../hooks/useUploadOrderFormPhotosApi";
import { useDeleteOrderFormPhotoApi } from "../hooks/useDeleteOrderFormPhotoApi";
import { getOrderFormPhotosDownloadAllApi } from "../services/orderFormPhoto.api";
import PhotoLightbox from "./PhotoLightbox";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, mirrors the backend's imageUpload limit

const filterValidFiles = (fileList) => {
  const files = Array.from(fileList);
  const valid = files.filter((file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE);
  const rejected = files.length - valid.length;
  return { valid, rejected };
};

const triggerBrowserDownload = (url) => {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ItemPhotosGallery = ({ orderFormId, orderFormNumber }) => {
  const { data: response, isPending } = useOrderFormPhotosApi(orderFormId);
  const { mutate: uploadPhotos, isPending: isUploading } = useUploadOrderFormPhotosApi(orderFormId);
  const { mutate: deletePhoto, isPending: isDeleting } = useDeleteOrderFormPhotoApi(orderFormId);

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // { type: "single" | "bulk", ids: number[] }
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef(null);

  const photos = response?.data?.photos ?? [];
  const count = response?.data?.count ?? 0;

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFilesSelected = (event) => {
    const { valid, rejected } = filterValidFiles(event.target.files);
    event.target.value = "";

    if (rejected > 0) {
      toast.error(`${rejected} file(s) skipped — only JPG, PNG, or WEBP images up to 10MB are allowed.`);
    }
    if (valid.length === 0) return;

    uploadPhotos(valid, {
      onSuccess: () => toast.success(`${valid.length} photo(s) added to the gallery.`),
      onError: (error) => toast.error(error?.message ?? "Couldn't upload photos. Please try again."),
    });
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const response = await getOrderFormPhotosDownloadAllApi(orderFormId);
      triggerBrowserDownload(response.data.url);
    } catch (error) {
      toast.error(error?.message ?? "Couldn't prepare the download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareOnWhatsApp = () => {
    const shareUrl = `${window.location.origin}/order-forms/share/${orderFormNumber}`;
    const message = `Photos for order form ${orderFormNumber}: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelected = (photoId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleThumbnailClick = (photo, index) => {
    if (selectMode) toggleSelected(photo.id);
    else setLightboxIndex(index);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { ids } = pendingDelete;

    Promise.all(ids.map((id) => new Promise((resolve, reject) => {
      deletePhoto(id, { onSuccess: resolve, onError: reject });
    })))
      .then(() => {
        toast.success(ids.length > 1 ? "Selected photos deleted." : "Photo deleted.");
        setSelectedIds(new Set());
        setSelectMode(false);
      })
      .catch((error) => toast.error(error?.message ?? "Couldn't delete photo(s). Please try again."))
      .finally(() => setPendingDelete(null));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Item Photos Gallery</h3>
          <Badge variant="secondary">{count}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={count === 0 || isDownloading}
          >
            {isDownloading ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
            Download All
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handleShareOnWhatsApp} disabled={count === 0}>
            <MessageCircleIcon className="size-4" />
            Share on WhatsApp
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <MoreVerticalIcon className="size-4" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleSelectMode} disabled={count === 0}>
                <CheckSquareIcon className="size-4" />
                {selectMode ? "Cancel Selection" : "Select Photos"}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={selectedIds.size === 0}
                onClick={() => setPendingDelete({ type: "bulk", ids: Array.from(selectedIds) })}
              >
                <Trash2Icon className="size-4" />
                Delete Photos {selectedIds.size > 0 && `(${selectedIds.size})`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selectMode && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={toggleSelectMode}>
              <XIcon className="size-3.5" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              disabled={selectedIds.size === 0}
              onClick={() => setPendingDelete({ type: "bulk", ids: Array.from(selectedIds) })}
            >
              <Trash2Icon className="size-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {!isPending && count === 0 && (
        <Empty className="rounded-2xl border border-dashed border-border bg-muted/20 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>No photos added yet</EmptyTitle>
            <EmptyDescription>Add photos of the items in this order form.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="sm" onClick={openFilePicker} disabled={isUploading}>
              {isUploading ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
              Add Photos
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {(isPending || count > 0) && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:size-28"
            >
              <button
                type="button"
                className="size-full cursor-pointer"
                onClick={() => handleThumbnailClick(photo, index)}
              >
                <img src={photo.imageUrl} alt="Order form item" className="size-full object-cover" />
              </button>

              {selectMode && (
                <div className="absolute top-1.5 left-1.5">
                  <Checkbox
                    checked={selectedIds.has(photo.id)}
                    onCheckedChange={() => toggleSelected(photo.id)}
                    className="border-white bg-background/80"
                  />
                </div>
              )}

              {!selectMode && (
                <button
                  type="button"
                  aria-label="Delete photo"
                  className="absolute top-1.5 right-1.5 hidden size-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm group-hover:flex hover:bg-background"
                  onClick={() => setPendingDelete({ type: "single", ids: [photo.id] })}
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={openFilePicker}
            disabled={isUploading}
            className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-60 sm:size-28"
          >
            {isUploading ? <Loader2Icon className="size-5 animate-spin" /> : <PlusIcon className="size-5" />}
            <span className="text-xs font-medium">Add Photos</span>
          </button>
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {pendingDelete && (
        <ActionModal
          openActionModal
          setOpenActionModal={(open) => !open && setPendingDelete(null)}
          title={pendingDelete.ids.length > 1 ? "Delete selected photos?" : "Delete photo?"}
          subtitle={
            pendingDelete.ids.length > 1
              ? `This will permanently remove ${pendingDelete.ids.length} photos from the gallery.`
              : "This will permanently remove the photo from the gallery."
          }
        >
          <div className="flex gap-2 p-4 sm:p-6">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="flex-1" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
              Delete
            </Button>
          </div>
        </ActionModal>
      )}
    </div>
  );
};

export default ItemPhotosGallery;
