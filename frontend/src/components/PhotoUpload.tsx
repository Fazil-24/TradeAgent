import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { Box, IconButton, LinearProgress, Typography, useTheme } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import client, { getErrorMessage } from "../api/client";
import type { UploadedPhoto } from "../types";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

interface PendingPhoto {
  id: string;
  previewUrl: string;
  progress: number;
  error: string | null;
  uploaded: UploadedPhoto | null;
}

interface PhotoUploadProps {
  onChange: (photos: UploadedPhoto[]) => void;
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(
              new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
            );
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      };
      // Some formats (e.g. HEIC on non-Safari browsers) can't be decoded
      // client-side — fall back to uploading the original file untouched.
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ onChange }: PhotoUploadProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const emitUploaded = (list: PendingPhoto[]) => {
    onChange(list.filter((p) => p.uploaded).map((p) => p.uploaded as UploadedPhoto));
  };

  const uploadFile = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await client.post<{ data: UploadedPhoto[] }>(
        "/api/upload/photos",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            const pct = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 50;
            setPhotos((prev) =>
              prev.map((p) => (p.id === id ? { ...p, progress: pct } : p))
            );
          },
        }
      );
      setPhotos((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, progress: 100, uploaded: res.data.data[0] } : p
        );
        emitUploaded(next);
        return next;
      });
    } catch (error) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, error: getErrorMessage(error) } : p))
      );
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const remainingSlots = MAX_FILES - photos.length;
    const files = incoming.slice(0, remainingSlots);

    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") continue;
      if (file.size > MAX_FILE_SIZE) {
        const id = crypto.randomUUID();
        setPhotos((prev) => [
          ...prev,
          {
            id,
            previewUrl: "",
            progress: 0,
            error: `${file.name} exceeds 5MB`,
            uploaded: null,
          },
        ]);
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { id, previewUrl, progress: 0, error: null, uploaded: null }]);

      const compressed = await compressImage(file);
      uploadFile(id, compressed);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      emitUploaded(next);
      return next;
    });
  };

  return (
    <Box>
      <Box
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        sx={{
          border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: 3,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          bgcolor: isDragging
            ? theme.palette.mode === "light"
              ? "rgba(26,111,168,0.05)"
              : "rgba(74,148,199,0.08)"
            : "transparent",
          transition: "background-color 150ms ease, border-color 150ms ease",
        }}
      >
        <CloudUploadRoundedIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          {t("createQuote.dropPhotos")}
        </Typography>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
          sx={{
            mt: 2,
            bgcolor: "primary.main",
            color: "#fff",
            "&:hover": { bgcolor: "primary.dark" },
          }}
          aria-label={t("createQuote.takePhoto")}
        >
          <CameraAltRoundedIcon />
        </IconButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </Box>

      {photos.length > 0 && (
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1.5,
          }}
        >
          {photos.map((photo) => (
            <Box
              key={photo.id}
              sx={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "action.hover",
              }}
            >
              {photo.previewUrl && (
                <Box
                  component="img"
                  src={photo.previewUrl}
                  alt=""
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {photo.error && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0,0,0,0.55)",
                  }}
                >
                  <ErrorRoundedIcon sx={{ color: "error.light" }} />
                </Box>
              )}
              {!photo.error && photo.progress < 100 && (
                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
                  <LinearProgress variant="determinate" value={photo.progress} />
                </Box>
              )}
              <IconButton
                size="small"
                onClick={() => removePhoto(photo.id)}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  bgcolor: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                  width: 24,
                  height: 24,
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
