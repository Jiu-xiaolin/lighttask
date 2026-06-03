import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Icon } from "../lib/icons";

export function SkinCarousel({ theme, setTheme }: any) {
  const themes = [
    { key: "letter", name: "书信", desc: "米白纸感 · 墨蓝主色 · 金棕强调", css: "letter" },
    { key: "love", name: "情书", desc: "粉白暖调 · 灰紫主色 · 玫瑰强调", css: "love" },
    { key: "windbell", name: "风铃木", desc: "素雅淡紫 · 紫灰主色 · 轻盈通透", css: "windbell" },
    { key: "custom", name: "自定义", desc: "上传背景 · 调节模糊 · 自选强调色", css: "custom" },
  ];
  const [idx, setIdx] = useState(themes.findIndex(t => t.key === theme));
  useEffect(() => { setIdx(themes.findIndex(t => t.key === theme)); }, [theme]);
  useEffect(() => { setTheme(themes[idx].key); }, [idx]);
  const [blur, setBlur] = useState(18);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropZ, setCropZ] = useState(1);
  const [cropPt, setCropPt] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const startXRef = useRef(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  function wrap(i: number) { return ((i % themes.length) + themes.length) % themes.length; }
  const w = carouselRef.current?.offsetWidth || 280;
  const progress = Math.max(-1, Math.min(1, dragX / (w * 0.5)));
  const absP = Math.abs(progress);
  const peekDir = progress > 0.05 ? -1 : progress < -0.05 ? 1 : 0;
  const nextIdx = peekDir !== 0 ? wrap(idx + peekDir) : idx;

  function handleDown(e: React.MouseEvent) { if (animating) return; e.preventDefault(); startXRef.current = e.clientX; setDragging(true); setDragX(0); }
  function handleMove(e: React.MouseEvent) { if (!dragging) return; e.preventDefault(); setDragX(e.clientX - startXRef.current); }
  function handleUp() {
    if (!dragging) return; setDragging(false);
    if (absP > 0.3 && peekDir !== 0) { const target = wrap(idx + peekDir); setAnimating(true); setDragX(-peekDir * w); setTimeout(() => { setIdx(target); setDragX(0); setAnimating(false); }, 260); }
    else { setAnimating(true); setDragX(0); setTimeout(() => setAnimating(false), 260); }
  }
  function dotClick(i: number) { if (i === idx || animating) return; const dir = i > idx ? -1 : 1; setAnimating(true); setDragX(-dir * w); setTimeout(() => { setIdx(i); setDragX(0); setAnimating(false); }, 260); }

  function renderCard(t: typeof themes[0], extra?: string) {
    return <div key={t.key + (extra || "")} className={`skin-card-main ${t.css} ${extra || ""}`} onClick={() => setTheme(t.key)}>
      <div className="skin-card-inner"><strong>{t.name}</strong><span>{t.desc}</span></div>
      {t.key === "custom" && <div className="skin-custom-tools" onClick={e => e.stopPropagation()}>
        <input ref={uploadRef} type="file" accept="image/*" style={{display:"none"}}
          onChange={ev => { const f = ev.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setCropImage(url); setCropPt({x:0,y:0}); setCropZ(1); ev.target.value = ''; } }} />
        <button className="skin-upload-btn" onClick={() => uploadRef.current?.click()}><Icon name="plus" /></button>
        <input type="range" className="skin-blur-slider" value={blur} min={0} max={30}
          onChange={ev => { ev.stopPropagation(); const v = +ev.target.value; setBlur(v); document.body.style.setProperty('--page-blur', `${v}px`); localStorage.setItem("lt_wallpaper_blur", String(v)); }}
          onWheel={ev => { ev.stopPropagation(); ev.preventDefault(); const d = ev.deltaY > 0 ? -1 : 1; const v = Math.max(0, Math.min(30, blur + d)); setBlur(v); document.body.style.setProperty('--page-blur', `${v}px`); localStorage.setItem("lt_wallpaper_blur", String(v)); }} />
      </div>}
    </div>;
  }

  async function applyCrop() {
    if (!cropImage || !cropArea) return;
    const img = new Image(); img.src = cropImage;
    await new Promise(r => { img.onload = r; });
    const canvas = document.createElement('canvas');
    canvas.width = cropArea.width; canvas.height = cropArea.height;
    const ctx = canvas.getContext('2d')!;
    ctx.filter = 'blur(1.2px)';
    ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, cropArea.width, cropArea.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    document.body.style.setProperty('--page-wallpaper', `url(${dataUrl})`);
    document.body.style.setProperty('--page-blur', `${blur}px`);
    document.body.style.setProperty('--card-wallpaper', `url(${dataUrl})`);

    // Extract dominant color for gradient + text contrast
    try {
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1; colorCanvas.height = 1;
      const ctx = colorCanvas.getContext('2d')!;
      ctx.drawImage(img, img.naturalWidth * 0.1, 0, img.naturalWidth * 0.3, img.naturalHeight, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      document.body.style.setProperty('--card-gradient-left', `rgba(${r},${g},${b},0.85)`);
      // Lum: dark bg → white text, light bg → dark text
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const textColor = lum < 0.5 ? '#fff' : '#162033';
      document.body.style.setProperty('--card-text-color', textColor);
      localStorage.setItem("lt_wallpaper_color", `${r},${g},${b}`);
      localStorage.setItem("lt_wallpaper_lum", String(lum));
    } catch {}

    localStorage.setItem("lt_wallpaper", dataUrl);
    localStorage.setItem("lt_wallpaper_blur", String(blur));
    setTheme("custom"); setCropImage(null);
    URL.revokeObjectURL(cropImage);
  }

  const current = themes[idx];
  const onCropComplete = useCallback((_: Area, ap: Area) => setCropArea(ap), []);

  return <><div className="skin-carousel" ref={carouselRef}
    onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}>
    <div className={`skin-stage-area ${animating ? "snap" : ""}`}>
      <div className="skin-card-wrap" style={{ transform: `translateX(${dragX}px)`, opacity: dragging || animating ? 1 - absP : 1 }}>
        {renderCard(current)}
      </div>
      {(dragging || animating) && peekDir !== 0 && <div className="skin-card-wrap" style={{ position: "absolute", inset: 0, transform: `translateX(${dragX + (peekDir * w)}px)`, opacity: absP }}>
        {renderCard(themes[nextIdx], "peek")}
      </div>}
    </div>
    <div className="skin-dots">{themes.map((t, i) => <button key={t.key} className={`skin-dot ${i === idx ? "active" : ""}`} onClick={() => dotClick(i)} />)}</div>
  </div>

  {cropImage && <div className="crop-overlay" onClick={() => { setCropImage(null); if (cropImage) URL.revokeObjectURL(cropImage); }}>
    <div className="crop-modal" onClick={e => e.stopPropagation()}>
      <div className="crop-head">
        <strong>裁剪背景图片</strong><span>拖拽移动 · 滚轮缩放 · 应用为网页壁纸</span>
        <div className="crop-actions">
          <button className="btn" onClick={() => { setCropImage(null); URL.revokeObjectURL(cropImage!); }}>取消</button>
          <button className="btn primary" onClick={applyCrop}>应用壁纸</button>
        </div>
      </div>
      <div className="crop-stage">
        <Cropper image={cropImage} crop={cropPt} zoom={cropZ} aspect={16/9}
          onCropChange={setCropPt} onZoomChange={setCropZ} onCropComplete={onCropComplete}
          classes={{ containerClassName: "crop-container", mediaClassName: "crop-media", cropAreaClassName: "crop-area" }} />
      </div>
      <div className="crop-controls">
        <Icon name="minus" /><input type="range" min={1} max={3} step={0.02} value={cropZ} onChange={e => setCropZ(+e.target.value)} /><Icon name="plus" />
      </div>
    </div>
  </div>}
  </>;
}
