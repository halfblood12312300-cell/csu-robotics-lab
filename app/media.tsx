import { useEffect, useState, type ImgHTMLAttributes, type VideoHTMLAttributes } from "react";
import { cachedPreviewUrl, getAdminSession, getPreviewUrl, isCanonicalMediaUrl, mediaUrl } from "./api-client";

function useMediaSource(value: string | undefined, preview: boolean) {
  const [source, setSource] = useState<string | undefined>(() => preview && value ? cachedPreviewUrl(value) || mediaUrl(value) : mediaUrl(value));
  useEffect(() => {
    let active = true;
    let refresh: ReturnType<typeof setInterval> | undefined;
    if (!value || !preview || !isCanonicalMediaUrl(value) || !getAdminSession()) {
      setSource(mediaUrl(value));
      return;
    }
    setSource(cachedPreviewUrl(value));
    const update = () => getPreviewUrl(value).then((url) => { if (active) setSource(url || undefined); }).catch(() => { if (active) setSource(undefined); });
    void update();
    refresh = setInterval(() => { void update(); }, 60000);
    return () => { active = false; if (refresh) clearInterval(refresh); };
  }, [value, preview]);
  return source;
}

export function MediaImage({ src, preview = false, ...props }: ImgHTMLAttributes<HTMLImageElement> & { preview?: boolean }) {
  const source = useMediaSource(src, preview);
  return <img {...props} src={source} />;
}

export function MediaVideo({ src, poster, preview = false, ...props }: VideoHTMLAttributes<HTMLVideoElement> & { preview?: boolean }) {
  const source = useMediaSource(src, preview);
  const cover = useMediaSource(poster, preview);
  return <video {...props} src={source} poster={cover} />;
}
