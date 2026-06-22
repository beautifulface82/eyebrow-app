import { useState, useRef, useEffect } from "react";

// ── 퍼스널컬러 팔레트 ─────────────────────────────────
const SEASON_PALETTES = {
  spring:  { colors:["#F4C5A0","#E8956A","#F0B8A0","#D4845A","#C4A882","#E8D4B0"], label:"Spring Warm",  emoji:"🌸" },
  summer:  { colors:["#B8C4D8","#8FA8C8","#C4B8D0","#A89CB8","#D0C8DC","#90A8C0"], label:"Summer Cool",  emoji:"🌿" },
  autumn:  { colors:["#C4783C","#8B4E2C","#D4A055","#6B3C24","#B87840","#A06030"], label:"Autumn Warm",  emoji:"🍂" },
  winter:  { colors:["#2C3E6B","#8B1C3C","#1C2850","#C0102A","#3C1C5A","#101830"], label:"Winter Cool",  emoji:"❄️" },
};

// ── 눈썹 피그먼트 ─────────────────────────────────────
const BROW_PIGMENTS = {
  ash_brown:     { hex:"#7A6A5A", label:"애쉬 브라운" },
  neutral_brown: { hex:"#8B6B4A", label:"뉴트럴 브라운" },
  dark_brown:    { hex:"#3D2010", label:"다크 브라운" },
  soft_black:    { hex:"#2A2520", label:"소프트 블랙" },
  warm_brown:    { hex:"#9B6B3A", label:"웜 브라운" },
  taupe:         { hex:"#8A7868", label:"타우프" },
  chocolate:     { hex:"#5A2E18", label:"초코 브라운" },
};

// ── 립 피그먼트 ───────────────────────────────────────
const LIP_PIGMENTS = {
  nude_pink:   { hex:"#E8A090", label:"누드 핑크" },
  rose_pink:   { hex:"#D4607A", label:"로즈 핑크" },
  dusty_rose:  { hex:"#C07878", label:"더스티 로즈" },
  coral:       { hex:"#E86848", label:"코랄" },
  peach:       { hex:"#F09870", label:"피치" },
  warm_nude:   { hex:"#C08868", label:"웜 누드" },
  cool_nude:   { hex:"#A88888", label:"쿨 누드" },
  berry:       { hex:"#882848", label:"베리" },
  mauve:       { hex:"#986878", label:"모브" },
};

// ── AI 프롬프트 ───────────────────────────────────────
const ANALYSIS_PROMPT = `반영구 시술 전문가로서 사진을 분석하고 반드시 아래 JSON만 출력하세요. 마크다운 없이 순수 JSON.

{
  "face": {
    "shape": "타원형",
    "ratio": "균형잡힌 비율",
    "forehead": "보통",
    "eyeSpacing": "보통",
    "eyeShape": "아몬드형",
    "jawline": "부드러운 곡선",
    "symmetry": "90",
    "balance": "여성적",
    "imageType": ["Elegant","Natural"],
    "summary": "부드럽고 우아한 인상의 타원형 얼굴"
  },
  "color": {
    "undertone": "Warm",
    "season": "autumn",
    "seasonDetail": "Warm Autumn",
    "bestClothingColors": ["테라코타","카멜","올리브","머스타드"],
    "avoidColors": ["쿨 핑크","라벤더","네이비"]
  },
  "eyebrow": {
    "currentShape": "일자형",
    "currentSymmetry": "82",
    "recommendedStyle": "soft_arch",
    "recommendedStyleLabel": "소프트 아치형",
    "recommendedStyleReason": "눈썹 산을 살려 눈매가 또렷하고 갸름해 보이는 효과",
    "primaryPigment": "warm_brown",
    "secondaryPigment": "neutral_brown",
    "pigmentReason": "웜톤 피부에 자연스럽게 어우러지는 따뜻한 브라운 계열",
    "notRecommended": ["high_arch","straight"],
    "notRecommendedLabels": ["하이 아치형","일자형"],
    "tips": ["앞머리 그라데이션으로 자연스럽게","꼬리 5mm 연장","아치 포인트 눈 끝에서 2/3 지점"]
  },
  "lip": {
    "symmetry": "88",
    "volume": "적당한 볼륨",
    "cupidBow": "완만한 형태",
    "corners": "수평",
    "designDirection": "Natural Enhancement",
    "primaryColor": "dusty_rose",
    "secondaryColor": "warm_nude",
    "colorReason": "웜톤 안색을 화사하게 밝혀주며 자연스러운 혈색 표현",
    "avoidColor": "cool_nude",
    "avoidReason": "쿨톤 계열로 안색이 칙칙해 보일 수 있음",
    "tips": ["입꼬리 1~2mm 올려 생기있는 인상","큐피드보우 선명하게 정의","상순 풍성하게 보정"]
  },
  "smp": {
    "needed": false,
    "score": "2",
    "hairlineShape": "자연스러운 라운드형",
    "density": "보통",
    "recommendation": "현재 모발 밀도 양호, SMP 시술 불필요",
    "style": "soft_framing"
  },
  "hair": {
    "primaryColor": "Chocolate Brown",
    "primaryHex": "#5A2E18",
    "secondaryColor": "Mocha Brown",
    "secondaryHex": "#8B5E3C",
    "avoidColor": "Ash Blonde",
    "avoidHex": "#C8C0A8",
    "avoidReason": "쿨톤이라 피부가 떠보이고 얼굴이 창백해 보임",
    "recommendedLength": "미디엄 (어깨선)",
    "layerStyle": "페이스 프레이밍 레이어",
    "bangStyle": "사이드 뱅",
    "stylingDirection": "웨이비 스타일로 여성스러운 이미지 강조",
    "imageDirection": "Elegant Soft"
  },
  "final": {
    "imageDirection": "Elegant Soft",
    "priority1": "눈썹 반영구",
    "priority2": "립 블러쉬",
    "priority3": "퍼스널컬러 진단",
    "stylistComment": "부드럽고 우아한 이미지가 강점인 고객님입니다. 소프트 아치형 눈썹으로 눈매를 또렷하게, 더스티 로즈 립으로 자연스러운 혈색을 더해드리면 전체적인 얼굴 조화가 완성됩니다."
  }
}`;

// ══════════════════════════════════════════════════════
// Canvas 기반 사실적 눈썹 렌더러
// ══════════════════════════════════════════════════════
function RealisticBrowCanvas({ styleKey, colorHex, width = 200, height = 80, label, selected, dim }) {
  const canvasRef = useRef();

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    const col = colorHex || "#5A3A20";

    // 스타일별 파라미터
    const styles = {
      straight:    { arch: 0.04, peak: 0.55, tailDrop: 0.10 },
      soft_arch:   { arch: 0.30, peak: 0.60, tailDrop: 0.08 },
      medium_arch: { arch: 0.50, peak: 0.63, tailDrop: 0.06 },
      high_arch:   { arch: 0.72, peak: 0.67, tailDrop: 0.04 },
      hybrid:      { arch: 0.42, peak: 0.62, tailDrop: 0.07 },
    };
    const cfg = styles[styleKey] || styles.soft_arch;

    // 눈썹 기준값
    const x0 = W * 0.06, x1 = W * 0.94;
    const baseY = H * 0.72;
    const browH = H * 0.44;
    const archH = browH * cfg.arch;
    const pkX = x0 + (x1 - x0) * cfg.peak;

    // 헤어 가닥 수
    const STRANDS = 38;

    // hex → rgb
    const r = parseInt(col.slice(1,3),16);
    const g = parseInt(col.slice(3,5),16);
    const b = parseInt(col.slice(5,7),16);

    // ── 1단계: 베이스 채움 (부드러운 블러) ──────────────
    for (let layer = 0; layer < 4; layer++) {
      const opacity = [0.06, 0.09, 0.07, 0.05][layer];
      const blur    = [6,    4,    2.5,  1.5][layer];
      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = col;
      ctx.beginPath();

      // 베이스 윤곽
      const pts = [];
      const N = 60;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = x0 + (x1 - x0) * t;
        const archF = t <= cfg.peak
          ? Math.sin((t / cfg.peak) * (Math.PI / 2))
          : Math.cos(((t - cfg.peak) / (1 - cfg.peak)) * (Math.PI / 2));
        const tailDrop = t > 0.75 ? (t - 0.75) / 0.25 * browH * cfg.tailDrop : 0;

        // 테이퍼
        const HEAD = 0.14, TAIL = 0.72;
        let tap;
        if      (t < HEAD) tap = Math.sin((t / HEAD) * (Math.PI / 2));
        else if (t > TAIL) tap = Math.cos(((t - TAIL) / (1 - TAIL)) * (Math.PI / 2));
        else               tap = 1.0;

        const topY  = baseY - archH * archF - browH * 0.38 * tap + tailDrop;
        const botY  = baseY - archH * archF * 0.12 + tailDrop;
        const midY  = (topY + botY) / 2;
        const halfH = (botY - topY) / 2 * tap;
        pts.push({ x, topY: midY - halfH, botY: midY + halfH });
      }

      ctx.moveTo(pts[0].x, pts[0].topY);
      for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].topY);
      ctx.lineTo(pts[N].x, pts[N].botY);
      for (let i = N - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].botY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── 2단계: 헤어 가닥 ─────────────────────────────
    for (let s = 0; s < STRANDS; s++) {
      const t = 0.02 + (s / (STRANDS - 1)) * 0.96;
      const x = x0 + (x1 - x0) * t;

      const archF = t <= cfg.peak
        ? Math.sin((t / cfg.peak) * (Math.PI / 2))
        : Math.cos(((t - cfg.peak) / (1 - cfg.peak)) * (Math.PI / 2));
      const tailDrop = t > 0.75 ? (t - 0.75) / 0.25 * browH * cfg.tailDrop : 0;

      const HEAD = 0.14, TAIL = 0.72;
      let tap;
      if      (t < HEAD) tap = Math.sin((t / HEAD) * (Math.PI / 2));
      else if (t > TAIL) tap = Math.cos(((t - TAIL) / (1 - TAIL)) * (Math.PI / 2));
      else               tap = 1.0;

      const centerY = baseY - archH * archF - browH * 0.19 * tap + tailDrop;
      const halfH   = browH * 0.19 * tap;

      // 가닥 개수 (두께에 따라)
      const strandCount = Math.max(2, Math.round(tap * 7 + Math.random() * 3));

      for (let j = 0; j < strandCount; j++) {
        const jitter = (j / strandCount - 0.5) * halfH * 2.2;
        const startY = centerY + jitter;
        const len    = (8 + Math.random() * 10) * tap;

        // 방향: 앞머리↗ 몸통→ 꼬리↘
        const angle = t < 0.3
          ? -Math.PI * 0.30 + (Math.random() - 0.5) * 0.25
          : t > 0.75
          ? -Math.PI * 0.08 + (Math.random() - 0.5) * 0.20
          : -Math.PI * 0.18 + (Math.random() - 0.5) * 0.22;

        const ex = x  + Math.cos(angle) * len * 0.5;
        const ey = startY + Math.sin(angle) * len;

        // 밝기 변화로 자연스러움
        const bright = 0.85 + Math.random() * 0.30;
        const alpha  = (0.55 + Math.random() * 0.35) * tap * (t < 0.12 || t > 0.88 ? 0.5 : 1);

        const gr = ctx.createLinearGradient(x, startY, ex, ey);
        gr.addColorStop(0, `rgba(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)},0)`);
        gr.addColorStop(0.3, `rgba(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)},${alpha})`);
        gr.addColorStop(1, `rgba(${Math.round(r*bright)},${Math.round(g*bright)},${Math.round(b*bright)},0)`);

        ctx.save();
        ctx.strokeStyle = gr;
        ctx.lineWidth = 0.55 + Math.random() * 0.55;
        ctx.lineCap = "round";
        ctx.beginPath();
        // 곡선 가닥
        const cx1 = x  + (ex - x) * 0.3 + (Math.random() - 0.5) * 3;
        const cy1 = startY + (ey - startY) * 0.3 + (Math.random() - 0.5) * 2;
        ctx.moveTo(x, startY);
        ctx.quadraticCurveTo(cx1, cy1, ex, ey);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── 3단계: 앞머리 페이드 ─────────────────────────
    const fadeW = (x1 - x0) * 0.18;
    const fadeGr = ctx.createLinearGradient(x0, 0, x0 + fadeW, 0);
    fadeGr.addColorStop(0, "rgba(255,255,255,1)");
    fadeGr.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = fadeGr;
    ctx.fillRect(0, 0, x0 + fadeW, H);

    // 꼬리 페이드
    const fadeTW = (x1 - x0) * 0.12;
    const fadeTGr = ctx.createLinearGradient(x1 - fadeTW, 0, x1, 0);
    fadeTGr.addColorStop(0, "rgba(255,255,255,0)");
    fadeTGr.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = fadeTGr;
    ctx.fillRect(x1 - fadeTW, 0, fadeTW + W * 0.07, H);

  }, [styleKey, colorHex]);

  return (
    <div style={{ opacity: dim ? 0.38 : 1, filter: dim ? "grayscale(60%)" : "none", transition:"all .2s" }}>
      <div style={{
        background: selected ? "#fff8f2" : "#f9f6f2",
        border: `2px solid ${selected ? "#c4956a" : "#ede4dc"}`,
        borderRadius: 12, padding: "10px 8px 6px",
        boxShadow: selected ? "0 3px 14px rgba(196,149,106,.3)" : "none",
        textAlign: "center"
      }}>
        <canvas ref={canvasRef} width={width} height={height}
          style={{ width: "100%", height: "auto", display:"block" }}/>
        {label && (
          <div style={{
            fontSize: 10, marginTop: 4, fontWeight: selected ? 700 : 400,
            color: selected ? "#c4956a" : "#9e8a7e"
          }}>{label}</div>
        )}
        {selected && <div style={{ fontSize:9, color:"#c4956a" }}>✓ 추천</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Canvas 기반 사실적 립 렌더러
// ══════════════════════════════════════════════════════
function RealisticLipCanvas({ colorHex, width = 260, height = 130 }) {
  const canvasRef = useRef();

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    const col = colorHex || "#E8A090";
    const r = parseInt(col.slice(1,3),16);
    const g = parseInt(col.slice(3,5),16);
    const b = parseInt(col.slice(5,7),16);

    const cx = W / 2, cy = H / 2;
    const lw = W * 0.42, lh = H * 0.28;

    // ── 립 외곽선 Path ──────────────────────────────
    function drawLipPath(ctx, scale = 1) {
      const sw = lw * scale, sh = lh * scale;
      ctx.beginPath();
      // 하순 (풍성한 곡선)
      ctx.moveTo(cx - sw, cy + sh * 0.05);
      ctx.bezierCurveTo(
        cx - sw * 0.6, cy + sh * 1.25,
        cx + sw * 0.6, cy + sh * 1.25,
        cx + sw, cy + sh * 0.05
      );
      // 상순 오른쪽
      ctx.bezierCurveTo(
        cx + sw * 0.7, cy - sh * 0.55,
        cx + sw * 0.25, cy - sh * 0.72,
        cx, cy - sh * 0.32
      );
      // 큐피드보우 오목
      ctx.bezierCurveTo(
        cx - sw * 0.10, cy - sh * 0.05,
        cx + sw * 0.10, cy - sh * 0.05,
        cx, cy - sh * 0.32
      );
      // 상순 왼쪽
      ctx.bezierCurveTo(
        cx - sw * 0.25, cy - sh * 0.72,
        cx - sw * 0.7,  cy - sh * 0.55,
        cx - sw, cy + sh * 0.05
      );
      ctx.closePath();
    }

    // ── 배경 립 (그림자) ─────────────────────────────
    ctx.save();
    ctx.shadowColor = `rgba(${r*0.4},${g*0.4},${b*0.4},0.3)`;
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    drawLipPath(ctx, 1.0);
    ctx.fillStyle = `rgb(${Math.round(r*0.75)},${Math.round(g*0.75)},${Math.round(b*0.75)})`;
    ctx.fill();
    ctx.restore();

    // ── 메인 그라데이션 채움 ─────────────────────────
    const mainGr = ctx.createRadialGradient(cx, cy - lh*0.1, lw*0.05, cx, cy, lw*1.1);
    mainGr.addColorStop(0.0, `rgba(${Math.min(255,r+50)},${Math.min(255,g+28)},${Math.min(255,b+28)},1)`);
    mainGr.addColorStop(0.4, `rgba(${r},${g},${b},1)`);
    mainGr.addColorStop(1.0, `rgba(${Math.round(r*0.72)},${Math.round(g*0.72)},${Math.round(b*0.72)},1)`);

    ctx.save();
    drawLipPath(ctx, 1.0);
    ctx.fillStyle = mainGr;
    ctx.fill();
    ctx.restore();

    // ── 상순 / 하순 입체감 ───────────────────────────
    // 하순 볼륨감 하이라이트
    const lowerGr = ctx.createRadialGradient(cx, cy + lh*0.68, 2, cx, cy + lh*0.65, lw*0.52);
    lowerGr.addColorStop(0, `rgba(255,255,255,0.36)`);
    lowerGr.addColorStop(0.5, `rgba(255,255,255,0.12)`);
    lowerGr.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    drawLipPath(ctx, 1.0);
    ctx.clip();
    ctx.fillStyle = lowerGr;
    ctx.fillRect(cx - lw, cy, lw*2, lh*1.4);
    ctx.restore();

    // 상순 큐피드보우 밝기
    const upperGr = ctx.createRadialGradient(cx, cy - lh*0.25, 1, cx, cy - lh*0.2, lw*0.38);
    upperGr.addColorStop(0, `rgba(255,255,255,0.22)`);
    upperGr.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    drawLipPath(ctx, 1.0);
    ctx.clip();
    ctx.fillStyle = upperGr;
    ctx.fillRect(cx - lw*0.5, cy - lh*0.85, lw, lh);
    ctx.restore();

    // ── 입술 중앙선 ──────────────────────────────────
    ctx.save();
    const lineGr = ctx.createLinearGradient(cx - lw, cy, cx + lw, cy);
    lineGr.addColorStop(0, `rgba(${Math.round(r*0.55)},${Math.round(g*0.55)},${Math.round(b*0.55)},0)`);
    lineGr.addColorStop(0.15, `rgba(${Math.round(r*0.55)},${Math.round(g*0.55)},${Math.round(b*0.55)},0.5)`);
    lineGr.addColorStop(0.5, `rgba(${Math.round(r*0.50)},${Math.round(g*0.50)},${Math.round(b*0.50)},0.65)`);
    lineGr.addColorStop(0.85, `rgba(${Math.round(r*0.55)},${Math.round(g*0.55)},${Math.round(b*0.55)},0.5)`);
    lineGr.addColorStop(1, `rgba(${Math.round(r*0.55)},${Math.round(g*0.55)},${Math.round(b*0.55)},0)`);
    ctx.strokeStyle = lineGr;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - lw*0.85, cy + lh*0.06);
    ctx.bezierCurveTo(cx - lw*0.5, cy + lh*0.02, cx + lw*0.5, cy + lh*0.02, cx + lw*0.85, cy + lh*0.06);
    ctx.stroke();
    ctx.restore();

    // ── 입술 외곽 테두리 (살짝 진하게) ──────────────
    ctx.save();
    drawLipPath(ctx, 1.0);
    ctx.strokeStyle = `rgba(${Math.round(r*0.68)},${Math.round(g*0.68)},${Math.round(b*0.68)},0.55)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── 광택 (글로시 하이라이트) ─────────────────────
    // 메인 하이라이트
    const shine1 = ctx.createRadialGradient(cx - lw*0.08, cy + lh*0.45, 1, cx - lw*0.08, cy + lh*0.42, lw*0.30);
    shine1.addColorStop(0, "rgba(255,255,255,0.68)");
    shine1.addColorStop(0.4, "rgba(255,255,255,0.28)");
    shine1.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    drawLipPath(ctx, 1.0);
    ctx.clip();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = shine1;
    ctx.fillRect(cx - lw, cy, lw*2, lh*1.3);
    ctx.restore();

    // 서브 하이라이트
    const shine2 = ctx.createRadialGradient(cx + lw*0.12, cy + lh*0.55, 0.5, cx + lw*0.12, cy + lh*0.55, lw*0.18);
    shine2.addColorStop(0, "rgba(255,255,255,0.45)");
    shine2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    drawLipPath(ctx, 1.0);
    ctx.clip();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = shine2;
    ctx.fillRect(cx - lw, cy, lw*2, lh*1.3);
    ctx.restore();

    // 입술 피부 텍스처 (미세한 선)
    ctx.save();
    drawLipPath(ctx, 1.0);
    ctx.clip();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 18; i++) {
      const tx = cx - lw + Math.random() * lw * 2;
      const ty = cy - lh * 0.2 + Math.random() * lh * 1.4;
      const tl = 4 + Math.random() * 18;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.random()*4 - 2, ty + tl);
      ctx.strokeStyle = `rgba(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)},1)`;
      ctx.lineWidth = 0.4 + Math.random() * 0.5;
      ctx.stroke();
    }
    ctx.restore();

  }, [colorHex]);

  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{ width:"100%", height:"auto", display:"block" }}/>
  );
}

// ══════════════════════════════════════════════════════
// UI 컴포넌트
// ══════════════════════════════════════════════════════
function Card({ title, icon, accent, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, border:"1px solid #ede4dc", boxShadow:"0 1px 8px rgba(139,111,94,.07)" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#8b6f5e", marginBottom:12, borderBottom:"1px solid #f0e6de", paddingBottom:8, display:"flex", alignItems:"center", gap:6 }}>
        <span>{icon}</span>{title}
        {accent && <span style={{ marginLeft:"auto", fontSize:10, color:"#c4956a" }}>{accent}</span>}
      </div>
      {children}
    </div>
  );
}

function ScoreBar({ score, max = 100, label }) {
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:10, color:"#9e8a7e" }}>{label}</span>
        <span style={{ fontSize:10, color:"#c4956a", fontWeight:700 }}>{score}%</span>
      </div>
      <div style={{ height:5, background:"#f0e6de", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:"linear-gradient(to right,#c4956a,#e8b48a)", borderRadius:3 }}/>
      </div>
    </div>
  );
}

function Tag({ children, type="normal" }) {
  const s = { normal:{bg:"#f5ede6",c:"#8b6f5e",b:"#e8ddd5"}, best:{bg:"#fff3e8",c:"#c4956a",b:"#c4956a"}, avoid:{bg:"#fff0f0",c:"#c07070",b:"#f0c8c8"} }[type];
  return <span style={{ fontSize:10, padding:"3px 10px", borderRadius:99, background:s.bg, color:s.c, border:`1px solid ${s.b}`, display:"inline-block", marginRight:5, marginBottom:5, fontWeight:type==="best"?700:400 }}>{children}</span>;
}

// ── 결과 전체 뷰 ──────────────────────────────────────
function ResultView({ data, imgSrc, onReset }) {
  const { face, color, eyebrow, lip, smp, hair, final } = data;
  const palette = SEASON_PALETTES[color?.season] || SEASON_PALETTES.autumn;
  const browCol = BROW_PIGMENTS[eyebrow?.primaryPigment]?.hex || "#7A5A30";
  const lipCol1 = LIP_PIGMENTS[lip?.primaryColor]?.hex || "#E8A090";
  const lipCol2 = LIP_PIGMENTS[lip?.secondaryColor]?.hex || "#C08868";
  const lipAvoid = LIP_PIGMENTS[lip?.avoidColor]?.hex || "#A88888";

  const BROW_STYLES = [
    { key:"soft_arch",   label:"소프트 아치" },
    { key:"medium_arch", label:"미디엄 아치" },
    { key:"straight",    label:"일자형" },
    { key:"high_arch",   label:"하이 아치" },
  ];

  return (
    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", background:"#faf8f5", minHeight:"100vh" }}>
      {/* 헤더 */}
      <div style={{ background:"linear-gradient(135deg,#6b4f3e,#c4956a)", padding:"16px 20px", color:"#fff", textAlign:"center" }}>
        <div style={{ fontSize:9, letterSpacing:4, opacity:.7, marginBottom:2 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize:18, fontWeight:700 }}>종합 뷰티 AI 리포트</div>
        <div style={{ fontSize:10, opacity:.65, marginTop:2 }}>{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}</div>
      </div>

      <div style={{ padding:"14px 14px 20px" }}>

        {/* 얼굴형 분석 */}
        <Card title="얼굴형 분석" icon="🔍" accent={face?.imageType?.join(" · ")}>
          <div style={{ display:"flex", gap:12 }}>
            <img src={imgSrc} style={{ width:90, height:112, objectFit:"cover", borderRadius:10, border:"2px solid #e8ddd5", flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#8b6f5e", marginBottom:2 }}>{face?.shape}</div>
              <div style={{ fontSize:11, color:"#9e8a7e", marginBottom:8, lineHeight:1.6 }}>{face?.summary}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {[["눈 간격",face?.eyeSpacing],["눈 모양",face?.eyeShape],["턱선",face?.jawline],["밸런스",face?.balance]].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:9, color:"#b09688", letterSpacing:1 }}>{k}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:8 }}>
                <ScoreBar score={face?.symmetry} label="좌우 대칭도"/>
              </div>
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            {face?.imageType?.map(t=><Tag key={t} type="best">{t}</Tag>)}
          </div>
        </Card>

        {/* 퍼스널 컬러 */}
        <Card title="퍼스널 컬러" icon="🎨" accent={palette.label + " " + palette.emoji}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:`linear-gradient(135deg,${palette.colors[0]},${palette.colors[3]})`, border:"2px solid #e8ddd5", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{palette.emoji}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:"#3d2b1f" }}>{color?.seasonDetail}</div>
              <div style={{ fontSize:11, color:"#9e8a7e" }}>언더톤: <strong style={{color:"#c4956a"}}>{color?.undertone}</strong></div>
            </div>
          </div>
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:6 }}>추천 컬러 팔레트</div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {palette.colors.map((c,i)=>(
              <div key={i} style={{ flex:1, height:32, borderRadius:8, background:c, boxShadow:"0 2px 6px rgba(0,0,0,.1)" }}/>
            ))}
          </div>
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:6 }}>추천 의류 컬러</div>
          <div style={{ marginBottom:10 }}>{color?.bestClothingColors?.map(c=><Tag key={c} type="best">{c}</Tag>)}</div>
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:6 }}>피해야 할 컬러</div>
          <div>{color?.avoidColors?.map(c=><Tag key={c} type="avoid">✕ {c}</Tag>)}</div>
        </Card>

        {/* 눈썹 디자인 — 핵심 비주얼 */}
        <Card title="눈썹 디자인" icon="✦">
          {/* 추천 스타일 강조 */}
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:8 }}>추천 눈썹 스타일</div>
          <div style={{ background:"#fff8f2", border:"1px solid rgba(196,149,106,.25)", borderRadius:12, padding:"14px 12px", marginBottom:14 }}>
            <RealisticBrowCanvas
              styleKey={eyebrow?.recommendedStyle || "soft_arch"}
              colorHex={browCol}
              width={320} height={90}
              label={eyebrow?.recommendedStyleLabel}
              selected
            />
            <div style={{ fontSize:11, color:"#6b5a52", lineHeight:1.7, marginTop:10, paddingTop:10, borderTop:"1px solid #f0e6de" }}>
              {eyebrow?.recommendedStyleReason}
            </div>
          </div>

          {/* 피그먼트 컬러 */}
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:8 }}>추천 피그먼트 컬러</div>
          <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"center" }}>
            {[eyebrow?.primaryPigment, eyebrow?.secondaryPigment].filter(Boolean).map((key,i) => {
              const p = BROW_PIGMENTS[key]; if(!p) return null;
              return (
                <div key={key} style={{ textAlign:"center" }}>
                  <div style={{ width:i===0?48:38, height:i===0?48:38, borderRadius:"50%", background:p.hex, border:i===0?"2.5px solid #c4956a":"2px solid #e8ddd5", margin:"0 auto 4px", boxShadow:i===0?"0 3px 12px rgba(196,149,106,.45)":"none" }}/>
                  <div style={{ fontSize:9, color:"#6b5a52" }}>{p.label}</div>
                  {i===0 && <div style={{ fontSize:9, color:"#c4956a", fontWeight:700 }}>1순위</div>}
                </div>
              );
            })}
            <div style={{ flex:1, fontSize:11, color:"#6b5a52", lineHeight:1.7, paddingLeft:10, borderLeft:"1px solid #f0e6de" }}>
              {eyebrow?.pigmentReason}
            </div>
          </div>

          {/* 스타일 비교 그리드 */}
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:8 }}>눈썹 스타일 비교</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {BROW_STYLES.map(s => {
              const isRecommended = s.key === (eyebrow?.recommendedStyle || "soft_arch");
              const isNotRec = eyebrow?.notRecommended?.includes(s.key);
              return (
                <RealisticBrowCanvas
                  key={s.key}
                  styleKey={s.key}
                  colorHex={isNotRec ? "#9e9e9e" : browCol}
                  width={280} height={72}
                  label={(isNotRec ? "❌ " : isRecommended ? "✓ " : "") + s.label}
                  selected={isRecommended}
                  dim={isNotRec}
                />
              );
            })}
          </div>

          {/* 시술 팁 */}
          <div style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
            <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:6 }}>시술 포인트</div>
            {eyebrow?.tips?.map((t,i)=>(
              <div key={i} style={{ fontSize:11, color:"#3d2b1f", marginBottom:4, display:"flex", gap:6 }}>
                <span style={{color:"#c4956a"}}>✦</span>{t}
              </div>
            ))}
          </div>
        </Card>

        {/* 립 블러쉬 — 핵심 비주얼 */}
        <Card title="립 블러쉬 분석" icon="💋">
          {/* 컬러 비교 */}
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:8 }}>립 컬러 미리보기</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { hex:lipCol1, label:LIP_PIGMENTS[lip?.primaryColor]?.label, tag:"1순위 ✓", best:true },
              { hex:lipCol2, label:LIP_PIGMENTS[lip?.secondaryColor]?.label, tag:"2순위", best:false },
              { hex:lipAvoid, label:LIP_PIGMENTS[lip?.avoidColor]?.label, tag:"❌ 피해야 함", avoid:true },
            ].map(({ hex, label, tag, best, avoid }) => (
              <div key={tag} style={{ opacity: avoid ? 0.55 : 1 }}>
                <div style={{
                  background: avoid ? "#fff8f8" : best ? "#fff8f2" : "#faf8f5",
                  border: `2px solid ${best ? "#c4956a" : avoid ? "#f0c8c8" : "#ede4dc"}`,
                  borderRadius:12, padding:"8px 4px 6px", textAlign:"center",
                  boxShadow: best ? "0 3px 12px rgba(196,149,106,.25)" : "none"
                }}>
                  <RealisticLipCanvas colorHex={hex} width={200} height={100}/>
                  <div style={{ fontSize:9, color: avoid?"#c07070":best?"#c4956a":"#9e8a7e", marginTop:4, fontWeight:best?700:400 }}>{label}</div>
                  <div style={{ fontSize:9, color: avoid?"#c07070":best?"#c4956a":"#b09688" }}>{tag}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 립 분석 수치 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[["대칭도",lip?.symmetry+"%"],["볼륨",lip?.volume],["큐피드보우",lip?.cupidBow],["입꼬리",lip?.corners]].map(([k,v])=>(
              <div key={k} style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:"#b09688", letterSpacing:1 }}>{k}</div>
                <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f", marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
          <ScoreBar score={lip?.symmetry} label="입술 대칭도"/>

          {/* 컬러 이유 */}
          <div style={{ fontSize:11, color:"#6b5a52", lineHeight:1.7, background:"#faf8f5", borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
            <span style={{color:"#c4956a"}}>✦ </span>{lip?.colorReason}
          </div>
          {lip?.avoidReason && (
            <div style={{ fontSize:10, color:"#c07070", background:"#fff8f8", padding:"8px 12px", borderRadius:8, marginBottom:10 }}>
              ✕ 피해야 할 이유: {lip?.avoidReason}
            </div>
          )}

          {/* 팁 */}
          <div style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
            <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:6 }}>시술 포인트</div>
            {lip?.tips?.map((t,i)=>(
              <div key={i} style={{ fontSize:11, color:"#3d2b1f", marginBottom:4, display:"flex", gap:6 }}>
                <span style={{color:"#c4956a"}}>✦</span>{t}
              </div>
            ))}
          </div>
        </Card>

        {/* SMP */}
        <Card title="SMP 두피 분석" icon="💆" accent={smp?.needed?"시술 권장":"현재 양호"}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
            <div style={{
              width:64, height:64, borderRadius:"50%", flexShrink:0,
              background: parseInt(smp?.score)>=4?"linear-gradient(135deg,#e87858,#c4956a)":parseInt(smp?.score)>=3?"linear-gradient(135deg,#c4956a,#e8c4a0)":"linear-gradient(135deg,#c8d8b0,#a8c090)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff"
            }}>
              <div style={{ fontSize:22, fontWeight:800 }}>{smp?.score}</div>
              <div style={{ fontSize:8 }}>/ 5점</div>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#3d2b1f", marginBottom:4 }}>{smp?.needed?"⚠️ SMP 권장":"✅ 현재 양호"}</div>
              <div style={{ fontSize:11, color:"#6b5a52", lineHeight:1.6 }}>{smp?.recommendation}</div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["헤어라인",smp?.hairlineShape],["모발 밀도",smp?.density]].map(([k,v])=>(
              <div key={k} style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:"#b09688" }}>{k}</div>
                <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* 헤어 */}
        <Card title="헤어 컬러 & 스타일" icon="✂️">
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:8 }}>추천 헤어 컬러</div>
          <div style={{ display:"flex", gap:14, marginBottom:12 }}>
            {[
              { color:hair?.primaryColor, hex:hair?.primaryHex||"#5A2E18", rank:"1순위" },
              { color:hair?.secondaryColor, hex:hair?.secondaryHex||"#8B5E3C", rank:"2순위" },
              { color:hair?.avoidColor, hex:hair?.avoidHex||"#C8C0A8", rank:"❌ 피해야함", avoid:true },
            ].map(({ color:name, hex, rank, avoid }) => (
              <div key={rank} style={{ textAlign:"center", opacity:avoid?0.5:1 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:avoid?"#ccc":hex, border:rank==="1순위"?"2.5px solid #c4956a":avoid?"2px solid #f0c8c8":"2px solid #e8ddd5", margin:"0 auto 4px", filter:avoid?"grayscale(40%)":"none", boxShadow:rank==="1순위"?"0 2px 10px rgba(196,149,106,.4)":"none" }}/>
                <div style={{ fontSize:9, color:avoid?"#c07070":"#6b5a52", maxWidth:55, lineHeight:1.3 }}>{name}</div>
                <div style={{ fontSize:9, color:avoid?"#c07070":"#c4956a", fontWeight:700 }}>{rank}</div>
              </div>
            ))}
          </div>
          {hair?.avoidReason && <div style={{ fontSize:10, color:"#c07070", background:"#fff8f8", padding:"6px 10px", borderRadius:8, marginBottom:10 }}>✕ {hair?.avoidReason}</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["추천 길이",hair?.recommendedLength],["레이어",hair?.layerStyle],["뱅 스타일",hair?.bangStyle],["이미지 방향",hair?.imageDirection]].map(([k,v])=>(
              <div key={k} style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:"#b09688" }}>{k}</div>
                <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* 최종 리포트 */}
        <Card title="최종 이미지 리포트" icon="⭐">
          <div style={{ textAlign:"center", padding:"14px 0", marginBottom:14, background:"linear-gradient(135deg,rgba(196,149,106,.12),rgba(232,196,184,.08))", borderRadius:12, border:"1px solid rgba(196,149,106,.2)" }}>
            <div style={{ fontSize:9, letterSpacing:3, color:"#c4956a", marginBottom:4 }}>OVERALL IMAGE DIRECTION</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#3d2b1f" }}>{final?.imageDirection}</div>
          </div>
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5, marginBottom:8 }}>시술 우선순위</div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {[final?.priority1, final?.priority2, final?.priority3].filter(Boolean).map((p,i)=>(
              <div key={i} style={{ flex:1, textAlign:"center", padding:"10px 6px", background:i===0?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#faf8f5", borderRadius:10, border:i===0?"none":"1px solid #ede4dc", boxShadow:i===0?"0 3px 12px rgba(196,149,106,.35)":"none" }}>
                <div style={{ fontSize:9, color:i===0?"rgba(255,255,255,.7)":"#b09688", marginBottom:3 }}>{i+1}순위</div>
                <div style={{ fontSize:11, fontWeight:700, color:i===0?"#fff":"#3d2b1f" }}>{p}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"linear-gradient(135deg,rgba(196,149,106,.08),rgba(232,196,184,.06))", border:"1px solid rgba(196,149,106,.2)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:9, letterSpacing:2, color:"#c4956a", marginBottom:6, fontWeight:700 }}>✦ Stylist's Note</div>
            <div style={{ fontSize:12.5, lineHeight:1.85, color:"#3d2b1f" }}>{final?.stylistComment}</div>
          </div>
        </Card>

        <div style={{ textAlign:"center", padding:"8px 0 16px", color:"#b09688", fontSize:11 }}>
          💡 분석 결과는 참고용이며 실제 시술 결과와 다를 수 있어요
        </div>
        <button onClick={onReset} style={{ width:"100%", padding:13, borderRadius:12, border:"1px solid #e8ddd5", background:"#fff", color:"#8b6f5e", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + 새로운 고객 분석
        </button>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────
export default function BeautyConsultation() {
  const [phase,   setPhase]   = useState("upload");
  const [imgSrc,  setImgSrc]  = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f?.type.startsWith("image/")) return;
    setImgFile(f); setImgSrc(URL.createObjectURL(f));
    setError(null); setResult(null);
  };

  const analyze = async () => {
    if (!imgFile) return;
    setPhase("loading");
    try {
      const b64 = await new Promise((res,rej) => {
        const r = new FileReader(); r.readAsDataURL(imgFile);
        r.onload = () => res(r.result.split(",")[1]); r.onerror = rej;
      });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({
          model:"claude-sonnet-4-5", max_tokens:2000,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:imgFile.type||"image/jpeg", data:b64 } },
            { type:"text", text:ANALYSIS_PROMPT }
          ]}]
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const txt = data.content?.find(b=>b.type==="text")?.text||"";
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      setResult(parsed); setPhase("result");
    } catch(e) {
      setError("분석 오류가 발생했어요. 다시 시도해주세요."); setPhase("upload");
    }
  };

  const reset = () => { setPhase("upload"); setImgSrc(null); setImgFile(null); setResult(null); setError(null); };

  if (phase==="result" && result) return <ResultView data={result} imgSrc={imgSrc} onReset={reset}/>;

  return (
    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", background:"#faf8f5", minHeight:"100vh" }}>
      <div style={{ background:"linear-gradient(135deg,#6b4f3e,#c4956a)", padding:"16px 20px", color:"#fff", textAlign:"center" }}>
        <div style={{ fontSize:9, letterSpacing:4, opacity:.75, marginBottom:3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize:19, fontWeight:700 }}>종합 뷰티 AI 컨설팅</div>
        <div style={{ fontSize:11, opacity:.65, marginTop:3 }}>얼굴형 · 눈썹 · 립 · SMP · 퍼스널컬러 · 헤어</div>
      </div>

      {phase==="loading" ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✨</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#3d2b1f", marginBottom:8 }}>AI가 분석하고 있어요</div>
          <div style={{ fontSize:12, color:"#9e8a7e", textAlign:"center", lineHeight:2 }}>얼굴형, 퍼스널컬러, 눈썹 디자인<br/>립 컬러, SMP, 헤어 스타일 분석 중...</div>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#c4956a", animation:`bcP 1.2s ease ${i*0.2}s infinite` }}/>)}
          </div>
          <style>{`@keyframes bcP{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.2)}}`}</style>
        </div>
      ) : (
        <div style={{ padding:"20px 16px" }}>
          <div style={{ background:"#fff", borderRadius:14, padding:16, border:"1px solid #ede4dc", boxShadow:"0 1px 8px rgba(139,111,94,.07)" }}>
            <div onClick={()=>fileRef.current.click()} style={{ border:`2px dashed ${imgSrc?"#c4956a":"#ddd8d0"}`, borderRadius:12, padding:imgSrc?10:"40px 20px", cursor:"pointer", background:"#faf8f5", textAlign:"center", marginBottom:14 }}>
              {imgSrc
                ? <img src={imgSrc} style={{ maxHeight:280, borderRadius:8, maxWidth:"100%", display:"block", margin:"0 auto" }}/>
                : <><div style={{ fontSize:48, marginBottom:10 }}>📸</div><div style={{ fontSize:14, fontWeight:600, color:"#5a4a42", marginBottom:4 }}>고객 정면 사진 업로드</div><div style={{ fontSize:12, color:"#b0968a" }}>자연광 · 정면 · 무표정 권장</div></>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[["🔍","얼굴형"],["🎨","퍼스널컬러"],["✦","눈썹"],["💋","립 블러쉬"],["💆","SMP"],["✂️","헤어"]].map(([e,l])=>(
                <div key={l} style={{ textAlign:"center", padding:"10px 6px", background:"#faf8f5", borderRadius:10, border:"1px solid #ede4dc" }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{e}</div>
                  <div style={{ fontSize:9, color:"#9e8a7e" }}>{l}</div>
                </div>
              ))}
            </div>
            {error && <div style={{ color:"#e07070", fontSize:12, textAlign:"center", marginBottom:10 }}>{error}</div>}
            <button onClick={analyze} disabled={!imgFile} style={{ width:"100%", padding:15, borderRadius:12, border:"none", background:imgFile?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#ddd", color:"#fff", fontSize:15, fontWeight:700, cursor:imgFile?"pointer":"not-allowed", boxShadow:imgFile?"0 4px 16px rgba(196,149,106,.4)":"none" }}>
              ✨ AI 종합 분석 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
