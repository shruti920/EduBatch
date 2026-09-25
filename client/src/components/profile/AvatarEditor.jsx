import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { ImagePlus, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import Avatar from "../Avatar";
import { Button, Modal } from "../ui";
import { removeAvatar, uploadAvatar } from "../../api/authApi";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../utils/format";

const OUTPUT_SIZE = 256; // px, square
const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // the original can be big; we upload ~20 KB
const ACCEPT = "image/jpeg,image/png,image/webp";

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image couldn't be opened. Try a JPG or PNG."));
    img.src = src;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

// Crop to the selected square and shrink to 256x256 WebP (JPEG where WebP encoding isn't supported)
const renderCrop = async (src, area) => {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  let blob = await canvasToBlob(canvas, "image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (!blob) throw new Error("Couldn't prepare the photo. Try another image.");
  return blob;
};

const firstImageFile = (list) => Array.from(list || []).find((f) => f.type?.startsWith("image/"));

/**
 * Profile photo: choose a file, drag one in, or paste one (Ctrl/Cmd+V).
 * Then position and zoom it in a round crop before it's uploaded.
 */
const AvatarEditor = ({ user, onChange }) => {
  const toast = useToast();
  const inputRef = useRef(null);
  const [source, setSource] = useState(null); // object URL of the picked image
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragging, setDragging] = useState(false);

  const openFile = useCallback(
    (file) => {
      if (!file) return;
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error("Use a JPG, PNG or WebP image.");
        return;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        toast.error("That image is over 15 MB. Pick a smaller one.");
        return;
      }
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setSource((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    [toast]
  );

  // Paste an image anywhere on the page (text pastes into inputs are left alone)
  useEffect(() => {
    const onPaste = (e) => {
      const file = firstImageFile(e.clipboardData?.files);
      if (!file) return;
      e.preventDefault();
      openFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [openFile]);

  useEffect(() => () => source && URL.revokeObjectURL(source), [source]);

  const closeCropper = () => {
    setSource(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = async () => {
    if (!area) return;
    setSaving(true);
    try {
      const blob = await renderCrop(source, area);
      const updated = await uploadAvatar(blob);
      onChange(updated);
      toast.success("Photo updated.");
      closeCropper();
    } catch (err) {
      toast.error(err.response ? errorMessage(err) : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      onChange(await removeAvatar());
      toast.success("Photo removed.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          openFile(firstImageFile(e.dataTransfer?.files));
        }}
        className={`flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-dashed p-4 transition-colors sm:flex-row sm:items-center ${
          dragging ? "border-ink bg-ink-100/60" : "border-paper-border"
        }`}
      >
        <Avatar name={user.name} src={user.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-text">Profile photo</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            JPG, PNG or WebP. Drag one here, or paste a copied image with Ctrl+V.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              <ImagePlus size={16} aria-hidden="true" />
              {user.avatar ? "Change photo" : "Upload photo"}
            </Button>
            {user.avatar && (
              <Button variant="ghost" onClick={remove} disabled={removing}>
                <Trash2 size={16} aria-hidden="true" />
                {removing ? "Removing…" : "Remove"}
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => openFile(firstImageFile(e.target.files))}
          />
        </div>
      </div>

      <Modal
        open={Boolean(source)}
        title="Adjust your photo"
        onClose={saving ? () => {} : closeCropper}
        footer={
          <>
            <Button variant="secondary" onClick={closeCropper} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !area}>
              {saving ? "Saving…" : "Save photo"}
            </Button>
          </>
        }
      >
        <div className="relative h-72 overflow-hidden rounded-[var(--radius-card)] bg-ink-900 sm:h-80">
          {source && (
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ZoomOut size={16} className="text-ink-muted" aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--color-ink)]"
            aria-label="Zoom"
          />
          <ZoomIn size={16} className="text-ink-muted" aria-hidden="true" />
        </div>
        <p className="mt-2 text-xs text-ink-muted">Drag to position. Scroll or pinch to zoom.</p>
      </Modal>
    </>
  );
};

export default AvatarEditor;
