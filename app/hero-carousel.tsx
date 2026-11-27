import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaImage, MediaVideo } from "./media";
import type { Settings } from "./site-config";
import "./hero-carousel.css";

export function HeroCarousel({ settings, preview = false }: { settings: Settings; preview?: boolean }) {
  const hero = settings.home.hero;
  const slides = [
    ...(settings.heroImage || settings.heroVideo ? [{ id: "primary", url: settings.heroImage, video: settings.heroVideo, alt: hero.imageAlt, caption: hero.photoLabel, label: hero.photoLabelEn, credit: hero.imageCredit }] : []),
    ...hero.slides.filter(slide => slide.enabled && slide.url).map(slide => ({ ...slide, video: "", label: "" })),
  ];
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const selected = Math.min(index, Math.max(0, slides.length - 1));
  const signature = slides.map(slide => slide.id + ":" + slide.url + ":" + slide.video).join("|");
  useEffect(() => { setIndex(0); if (track.current) track.current.scrollLeft = 0; }, [signature]);
  function go(next: number) {
    const el = track.current;
    if (!el || !slides.length) return;
    const target = (next + slides.length) % slides.length;
    el.scrollTo({ left: el.clientWidth * target, behavior: "smooth" });
    setIndex(target);
  }
  if (!slides.length) return null;
  return <div className="hero-carousel" aria-label="首屏图片轮播">
    <div ref={track} className="hero-slide-track" tabIndex={slides.length > 1 ? 0 : undefined}
      onScroll={(event) => {
        const el = event.currentTarget;
        if (el.clientWidth) setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
      }}
      onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); go(selected + (event.key === "ArrowLeft" ? -1 : 1)); } }}>
      {slides.map((slide, i) => <div className="hero-photo hero-slide" key={slide.id}>
        {slide.video ? <MediaVideo preview={preview} src={slide.video} poster={slide.url || undefined} controls playsInline preload="metadata" aria-label={slide.alt} />
          : <MediaImage preview={preview} src={slide.url} alt={slide.alt} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} />}
        {(slide.caption || slide.label) && !slide.video && <div className="photo-label"><span>{slide.label}</span><b>{slide.caption}</b></div>}
      </div>)}
    </div>
    {slides.length > 1 && <div className="hero-slide-controls">
      <button type="button" aria-label="上一张" onClick={() => go(selected - 1)}><ChevronLeft size={20} /></button>
      <div className="hero-slide-dots">{slides.map((slide, i) => <button type="button" key={slide.id} aria-label={"查看第 " + (i + 1) + " 张图片"} aria-current={i === selected ? "true" : undefined} onClick={() => go(i)} />)}</div>
      <span>{selected + 1} / {slides.length}</span>
      <button type="button" aria-label="下一张" onClick={() => go(selected + 1)}><ChevronRight size={20} /></button>
    </div>}
    {slides[selected]?.credit && <div className="image-credit cms-lines">{slides[selected].credit}</div>}
  </div>;
}
