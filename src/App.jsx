import { useState, useRef, useEffect, useCallback } from "react";

const BROW_STYLES = {
  "각진 아치형":     { archH: 0.42, startDip: 0.05, endDip: 0.12, peakX: 0.68 },
  "소프트 세미아치": { archH: 0.28, startDip: 0.03, endDip: 0.08, peakX: 0.65 },
  "내추럴 아치형":   { archH: 0.20, startDip: 0.02, endDip: 0.06, peakX: 0.63 },
  "자연스러운 아치형":{ archH: 0.24, startDip: 0.02, endDip: 0.07, peakX: 0.64 },
  "부드러운 아치형": { archH: 0.18, startDip: 0.02, endDip: 0.05, peakX: 0.62 },
  "평평한 일자형":   { archH: 0.06, startDip: 0.00, endDip: 0.02, peakX: 0.55 },
};

// 자연스러운 눈썹 그리기 (결 방향 반영)
function drawBrow(ctx, x1, y1, x2, y2, style, thickness, color, alpha, mirror = false) {
  const W = x2 - x1;
  const H = y2 - y1;
  const p = BROW_STYLES[style] || BROW_STYLES["소프트 세미아치"];
  const browThick = H * 0.40 * thickness;
  const browY = y1 - H * 0.58;

  // mirror=true 이면 산 위치 반전 (오른쪽 눈썹)
  const peakXRatio = mirror ? (1 - p.peakX) : p.peakX;
  const startDip   = mirror ? p.endDip   : p.startDip;
  const endDip     = mirror ? p.startDip : p.endDip;

  const sx = x1 - W * 0.02;
  const sy = browY + H * startDip;
  const ex = x2 + W * 0.08;
  const ey = browY + H * endDip;
  const px = x1 + W * peakXRatio;
  const py = browY - H * p.archH;

  ctx.save();

  // ── 1. 부드러운 베이스 채우기 ──────────────────────────────
  const path = new Path2D();
  path.moveTo(sx, sy - browThick * 0.25);
  path.bezierCurveTo(
    sx + W * 0.28, sy - browThick * 0.45,
    px - W * 0.12, py - browThick * 0.55,
    px, py - browThick * 0.45
  );
  path.bezierCurveTo(
    px + W * 0.10, py - browThick * 0.30,
    ex - W * 0.14, ey - browThick * 0.05,
    ex, ey
  );
  path.bezierCurveTo(
    ex - W * 0.14, ey + browThick * 0.60,
    px + W * 0.10, py + browThick * 0.50,
    px, py + browThick * 0.50
  );
  path.bezierCurveTo(
    px - W * 0.12, py + browThick * 0.60,
    sx + W * 0.22, sy + browThick * 0.65,
    sx, sy + browThick * 0.28
  );
  path.closePath();

  const grad = ctx.createLinearGradient(sx, 0, ex, 0);
  grad.addColorStop(0,    "#" + color + "00");
  grad.addColorStop(0.12, "#" + color + "99");
  grad.addColorStop(0.45, "#" + color + "cc");
  grad.addColorStop(0.80, "#" + color + "88");
  grad.addColorStop(1,    "#" + color + "00");

  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = grad;
  ctx.filter = "blur(2.5px)";
  ctx.fill(path);
  ctx.filter = "none";

  // ── 2. 결 방향 털 획 ───────────────────────────────────────
  const numHairs = 70;
  ctx.lineCap = "round";

  for (let i = 0; i < numHairs; i++) {
    const t = i / (numHairs - 1);

    // 눈썹 곡선 위 현재 위치 계산
    const bx = sx + (ex - sx) * t;
    // 아치 높이 반영 (mirror면 반전)
    const archT = mirror ? (1 - t) : t;
    const by = sy + (ey - sy) * t - H * p.archH * Math.sin(Math.PI * archT * 0.95);

    // 끝쪽으로 갈수록 가늘어짐
    const taper = Math.sin(Math.PI * t);
    const hairLen = browThick * (0.35 + 0.75 * taper) + (Math.random() - 0.5) * browThick * 0.25;

    // 털 방향: 왼쪽 눈썹은 오른쪽 위, 오른쪽 눈썹은 왼쪽 위로 기울어짐
    const baseAngle = mirror
      ? -(Math.PI / 2) - 0.25 - (Math.random() - 0.5) * 0.3
      :  (Math.PI / 2) + 0.25 + (Math.random() - 0.5) * 0.3;

    const rootX = bx + (Math.random() - 0.5) * browThick * 0.35;
    const rootY = by + browThick * 0.28 + Math.random() * browThick * 0.15;
    const tipX  = rootX + Math.sin(baseAngle) * hairLen * 0.30;
    const tipY  = rootY - hairLen;

    // 자연스러운 휨
    const cpX = rootX + (tipX - rootX) * 0.5 + (mirror ? -1 : 1) * Math.random() * 2.0;
    const cpY = rootY + (tipY - rootY) * 0.5;

    const hairOpacity = (0.15 + 0.55 * taper) * (0.55 + Math.random() * 0.45);

    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.strokeStyle = "#" + color;
    ctx.lineWidth   = 0.35 + Math.random() * 0.75;
    ctx.globalAlpha = alpha * hairOpacity;
    ctx.stroke();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]               = useState("upload");
  const [imgSrc, setImgSrc]             = useState(null);
  const [imgFile, setImgFile]           = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedStyle, setSelectedStyle]   = useState(0);
  const [overlayAlpha, setOverlayAlpha]     = useState(0.82);
  const [browColor, setBrowColor]           = useState("#3d2010");
  const [browThickness, setBrowThickness]   = useState(1.0);
  const [error, setError]               = useState(null);
  const [dragOver, setDragOver]         = useState(false);

  const fileRef   = useRef();
  const canvasRef = useRef();
  const imgRef    = useRef();

  const initCanvas = useCallback(() => {
    const img = imgRef.current, canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvasRef.current.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img || !analysisResult?.eyeCoords) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const style = analysisResult.recommendedStyles[selectedStyle]?.name;
    const { leftEye, rightEye } = analysisResult.eyeCoords;
    const iw = img.naturalWidth, ih = img.naturalHeight;

    const toPixel = c => ({ x1: c.x1*iw, y1: c.y1*ih, x2: c.x2*iw, y2: c.y2*ih });
    const lp = toPixel(leftEye);
    const rp = toPixel(rightEye);
    const col = browColor.replace("#", "");

    // 왼쪽 눈썹: mirror=false / 오른쪽 눈썹: mirror=true
    drawBrow(ctx, lp.x1, lp.y1, lp.x2, lp.y2, style, browThickness, col, overlayAlpha, false);
    drawBrow(ctx, rp.x1, rp.y1, rp.x2, rp.y2, style, browThickness, col, overlayAlpha, true);
  }, [analysisResult, selectedStyle, overlayAlpha, browColor, browThickness]);

  useEffect(() => { renderOverlay(); }, [renderOverlay]);

  const handleFile = file => {
    if (!file?.type.startsWith("image/")) return;
    setImgFile(file);
    setImgSrc(URL.createObjectURL(file));
    setError(null);
    setAnalysisResult(null);
  };

  const analyze = async () => {
    if (!imgFile) return;
    setPhase("loading");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(imgFile);
        r.onload  = () => res(r.result.split(",")[1]);
        r.onerror = rej;
      });

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imgFile.type || "image/jpeg", data: base64 } },
              {
                type: "text",
                text: `반영구 시술 전문가로서 정면 사진을 분석하세요. JSON만 출력, 다른 텍스트 없음.

eyeCoords 주의사항:
- 이미지 전체 크기 대비 0~1 정규화 비율
- leftEye = 이미지 왼쪽 눈 (사람 기준 오른쪽 눈)
- rightEye = 이미지 오른쪽 눈 (사람 기준 왼쪽 눈)
- x1=눈 안쪽 시작X, y1=눈꺼풀 위Y, x2=눈 바깥쪽 끝X, y2=눈 아래Y
- y1은 반드시 눈꺼풀 시작점 (눈썹 아래), 이마나 눈썹 위치 아님
- 얼굴 전체 높이의 35~50% 사이에 눈이 위치함

{
  "faceShape": "둥근형",
  "faceShapeDetail": "2줄 이내 설명",
  "atmosphere": ["인상 특징 1~2개"],
  "skeleton": { "forehead": "중간", "cheekbone": "넓음", "jaw": "부드러움" },
  "faceContour": { "jawLine": "둥글고 부드러움", "ratio": "비슷함" },
  "currentBrow": { "shape": "일자형", "archAngle": "낮음", "color": "자연스러움", "thickness": "두꺼움", "length": "표준" },
  "skinTone": "웜톤/어두움",
  "skinToneDisplay": "웜 미디엄 톤",
  "eyeCoords": {
    "leftEye":  { "x1": 0.27, "y1": 0.39, "x2": 0.46, "y2": 0.45 },
    "rightEye": { "x1": 0.54, "y1": 0.39, "x2": 0.73, "y2": 0.45 }
  },
  "recommendedStyles": [
    { "rank": 1, "tag": "베스트",    "name": "각진 아치형",    "length": 4, "angle": 4, "thickness": 3, "color": 4, "archPosition": 4, "roundness": 2, "hashtag": "#갸름한효과" },
    { "rank": 2, "tag": "추천",      "name": "소프트 세미아치", "length": 3, "angle": 3, "thickness": 3, "color": 3, "archPosition": 3, "roundness": 3, "hashtag": "#자연스러운입체감" },
    { "rank": 3, "tag": "자연스러움", "name": "내추럴 아치형",  "length": 3, "angle": 3, "thickness": 2, "color": 3, "archPosition": 3, "roundness": 4, "hashtag": "#부드러운인상" }
  ],
  "notRecommended": [
    { "name": "평평한 일자형", "reason": "얼굴이 더 넓어 보임" },
    { "name": "낮은 직선형",  "reason": "답답한 인상" }
  ],
  "recommendedColors": ["다크 브라운", "초코 브라운", "내추럴 브라운"],
  "supplementPoints": ["보완포인트1", "보완포인트2", "보완포인트3"],
  "browTips": { "start": "콧볼의 수직선", "arch": "검은 동자 바깥쪽", "end": "눈꼬리보다 살짝 길게" }
}

실제 사진을 정확히 분석해서 eyeCoords 값을 채워주세요.`
              }
            ]
          }]
        })
      });

      const data  = await resp.json();
      const text  = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalysisResult(parsed);
      setPhase("result");
    } catch (e) {
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPhase("upload");
    }
  };

  const reset = () => {
    setPhase("upload"); setImgSrc(null); setImgFile(null);
    setAnalysisResult(null); setSelectedStyle(0);
  };

  const colorMap = {
    "다크 브라운":   "#3d2010",
    "초코 브라운":   "#5a2e18",
    "내추럴 브라운": "#7a4a30",
    "애쉬 브라운":   "#6b5848",
    "그레이 브라운": "#5a5048",
    "라이트 브라운": "#9a7860",
  };

  const Dots = ({ value, max = 5 }) => (
    <span>{Array.from({ length: max }, (_, i) => (
      <span key={i} style={{ color: i < value ? "#c4956a" : "#ddd", fontSize: 8, marginRight: 1 }}>
        {i < value ? "●" : "○"}
      </span>
    ))}</span>
  );

  const s = {
    app:    { fontFamily: "'Noto Sans KR','Apple SD Gothic Neo',sans-serif", background: "#faf8f5", minHeight: "100vh" },
    header: { background: "linear-gradient(135deg,#6b4f3e,#c4956a)", padding: "16px 20px", color: "#fff", textAlign: "center" },
    card:   { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #ede4dc", boxShadow: "0 1px 8px rgba(139,111,94,0.07)" },
    sec:    { fontSize: 11, fontWeight: 700, color: "#8b6f5e", marginBottom: 10, borderBottom: "1px solid #f0e6de", paddingBottom: 6 },
    pill:   { display: "inline-block", padding: "3px 10px", borderRadius: 99, background: "#f5ede6", color: "#8b6f5e", fontSize: 11, marginRight: 5, marginBottom: 5 },
  };

  // ── 업로드 화면 ───────────────────────────────────────────
  if (phase === "upload") return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.75, marginBottom: 3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>눈썹 & 얼굴형 AI 분석</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>정면 사진 한 장으로 맞춤 눈썹 디자인 추천</div>
      </div>
      <div style={{ padding: "20px 16px" }}>
        <div style={s.card}>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? "#c4956a" : "#ddd8d0"}`,
              borderRadius: 12, padding: imgSrc ? 12 : "36px 20px",
              cursor: "pointer", background: dragOver ? "#fff9f4" : "#faf8f5",
              textAlign: "center", transition: "all 0.2s", marginBottom: 14,
            }}
          >
            {imgSrc
              ? <img src={imgSrc} alt="preview" style={{ maxHeight: 260, borderRadius: 8, maxWidth: "100%", display: "block", margin: "0 auto" }} />
              : <>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#5a4a42", marginBottom: 4 }}>고객 정면 사진 업로드</div>
                  <div style={{ fontSize: 12, color: "#b0968a" }}>정면을 바라보는 밝은 사진이 좋아요</div>
                </>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          {error && <div style={{ color: "#e07070", fontSize: 12, textAlign: "center", marginBottom: 10 }}>{error}</div>}
          <button onClick={analyze} disabled={!imgFile} style={{
            width: "100%", padding: 14, borderRadius: 12, border: "none",
            background: imgFile ? "linear-gradient(135deg,#8b6f5e,#c4956a)" : "#e0d8d0",
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: imgFile ? "pointer" : "not-allowed",
            boxShadow: imgFile ? "0 4px 16px rgba(196,149,106,0.35)" : "none", transition: "all 0.2s",
          }}>
            ✨ AI 분석 시작
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#b0968a", lineHeight: 1.8 }}>
          · 분석 결과는 참고용이며 전문가 상담을 병행하세요<br />
          · 사진은 분석 후 저장되지 않습니다
        </div>
      </div>
    </div>
  );

  // ── 로딩 화면 ─────────────────────────────────────────────
  if (phase === "loading") return (
    <div style={{ ...s.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>✨</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#3d2b1f", marginBottom: 8 }}>분석 중입니다...</div>
      <div style={{ fontSize: 13, color: "#9e8a7e", textAlign: "center", lineHeight: 1.9 }}>
        눈 위치를 감지하고<br />맞춤 눈썹 라인을 계산하고 있어요
      </div>
    </div>
  );

  if (!analysisResult) return null;
  const r = analysisResult;

  // ── 결과 화면 ─────────────────────────────────────────────
  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.75, marginBottom: 3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>눈썹 시뮬레이션 결과</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</div>
      </div>

      <div style={{ padding: "16px 14px" }}>

        {/* 사진 + 오버레이 */}
        <div style={s.card}>
          <div style={s.sec}>👁 눈썹 시뮬레이션</div>
          <div style={{ position: "relative", width: "100%", borderRadius: 10, overflow: "hidden", background: "#f0e8e0", lineHeight: 0 }}>
            <img ref={imgRef} src={imgSrc} alt="고객"
              onLoad={() => { initCanvas(); setTimeout(renderOverlay, 50); }}
              style={{ width: "100%", display: "block", borderRadius: 10 }} />
            <canvas ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 10, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(196,149,106,0.9)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>
              ✨ {r.recommendedStyles[selectedStyle]?.name}
            </div>
            <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: 1 }}>AI BROW SIM</div>
          </div>

          {/* 스타일 탭 */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, marginBottom: 10 }}>
            {r.recommendedStyles.map((st, idx) => (
              <button key={idx} onClick={() => setSelectedStyle(idx)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
                background: selectedStyle === idx ? "linear-gradient(135deg,#8b6f5e,#c4956a)" : "#f5ede6",
                color: selectedStyle === idx ? "#fff" : "#8b6f5e",
                fontSize: 10, fontWeight: 700, transition: "all 0.15s",
                boxShadow: selectedStyle === idx ? "0 2px 10px rgba(196,149,106,0.4)" : "none",
              }}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}<br />
                <span style={{ fontSize: 9, lineHeight: 1.6 }}>{st.name}</span>
              </button>
            ))}
          </div>

          {/* 슬라이더 */}
          <div style={{ background: "#faf8f5", borderRadius: 10, padding: "12px 14px" }}>
            {[
              { label: "투명도", min: 0.3, max: 1,   step: 0.05, val: overlayAlpha,  set: setOverlayAlpha,  fmt: v => Math.round(v*100)+"%" },
              { label: "두 께",  min: 0.5, max: 2.0, step: 0.1,  val: browThickness, set: setBrowThickness, fmt: v => v.toFixed(1)+"x" },
            ].map(({ label, min, max, step, val, set, fmt }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: "#9e8a7e", width: 38, flexShrink: 0 }}>{label}</span>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: "#c4956a", height: 4 }} />
                <span style={{ fontSize: 10, color: "#c4956a", width: 32, textAlign: "right", fontWeight: 700 }}>{fmt(val)}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: "#9e8a7e", width: 38, flexShrink: 0 }}>컬 러</span>
              <div style={{ display: "flex", gap: 7, flex: 1 }}>
                {Object.entries(colorMap).map(([name, hex]) => (
                  <div key={name} onClick={() => setBrowColor(hex)} title={name} style={{
                    width: 22, height: 22, borderRadius: "50%", background: hex, cursor: "pointer",
                    border: browColor === hex ? "2.5px solid #c4956a" : "2px solid #eee",
                    boxShadow: browColor === hex ? "0 0 0 1.5px #c4956a" : "none",
                    transition: "all 0.15s", flexShrink: 0,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 얼굴형 분석 */}
        <div style={s.card}>
          <div style={s.sec}>얼굴형 분석</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg,#f5ede6,#dfc5a8)", border: "2px solid #c4956a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>🔵</div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#8b6f5e", marginBottom: 4 }}>{r.faceShape}</div>
              <div style={{ fontSize: 11, color: "#6b5a52", lineHeight: 1.7, marginBottom: 6 }}>{r.faceShapeDetail}</div>
              {r.atmosphere?.map(a => <span key={a} style={s.pill}>{a}</span>)}
            </div>
          </div>
        </div>

        {/* 골격 */}
        <div style={s.card}>
          <div style={s.sec}>골격 & 얼굴선</div>
          <div style={{ display: "flex" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#b09688", marginBottom: 6 }}>골격</div>
              {[["이마", r.skeleton?.forehead], ["광대", r.skeleton?.cheekbone], ["턱선", r.skeleton?.jaw]].map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, marginBottom: 5, display: "flex", gap: 4 }}>
                  <span style={{ color: "#c4956a" }}>✓</span>
                  <span style={{ color: "#9e8a7e" }}>{k}</span>
                  <span style={{ fontWeight: 700, marginLeft: "auto" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: "#f0e6de", margin: "0 14px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#b09688", marginBottom: 6 }}>얼굴선</div>
              {[["턱선", r.faceContour?.jawLine], ["비율", r.faceContour?.ratio]].map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, marginBottom: 5, display: "flex", gap: 4 }}>
                  <span style={{ color: "#c4956a" }}>✓</span>
                  <span style={{ color: "#9e8a7e" }}>{k}</span>
                  <span style={{ fontWeight: 700, marginLeft: "auto", fontSize: 10 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 현재 눈썹 + 피부톤 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ ...s.card, flex: 1.5, marginBottom: 0 }}>
            <div style={s.sec}>현재 눈썹 특징</div>
            {[["형태", r.currentBrow?.shape], ["산 각도", r.currentBrow?.archAngle], ["색상", r.currentBrow?.color], ["두께", r.currentBrow?.thickness], ["길이", r.currentBrow?.length]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                <span style={{ color: "#9e8a7e" }}>· {k}</span>
                <span style={{ fontWeight: 700, color: "#3d2b1f" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, flex: 1, marginBottom: 0 }}>
            <div style={s.sec}>피부톤</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#c8956a", border: "1px solid #ddd" }} />
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#b07848", border: "1px solid #ddd" }} />
            </div>
            <div style={{ fontSize: 11, color: "#6b5a52" }}>{r.skinToneDisplay}</div>
          </div>
        </div>

        {/* 추천 스타일 */}
        <div style={s.card}>
          <div style={{ ...s.sec, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ background: "#c4956a", color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>BEST</span>
            추천 스타일 상세
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {r.recommendedStyles.map((st, idx) => (
              <div key={idx} onClick={() => setSelectedStyle(idx)} style={{
                flex: 1, border: selectedStyle === idx ? "2px solid #c4956a" : "1px solid #e8ddd5",
                borderRadius: 10, padding: "10px 8px", cursor: "pointer",
                background: selectedStyle === idx ? "#fffaf5" : "#fff", transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: idx === 0 ? "#c4956a" : "#8b9e7e", background: idx === 0 ? "#fdebd0" : "#eef2eb", display: "inline-block", padding: "2px 6px", borderRadius: 99, marginBottom: 4 }}>#{st.tag}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#3d2b1f", marginBottom: 5 }}>{st.name}</div>
                {[["길이", st.length], ["각도", st.angle], ["두께", st.thickness], ["색감", st.color], ["산 위치", st.archPosition], ["라운드감", st.roundness]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: "#9e8a7e" }}>{label}</span>
                    <Dots value={val} />
                  </div>
                ))}
                <div style={{ fontSize: 9, color: "#b0968a", marginTop: 4 }}>{st.hashtag}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 비추천 */}
        <div style={s.card}>
          <div style={{ ...s.sec, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ background: "#e07070", color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>비추천</span>
            피하면 좋은 스타일
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {r.notRecommended?.map((nr, i) => (
              <div key={i} style={{ flex: 1, background: "#fff8f8", border: "1px solid #f5d0d0", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>❌</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#3d2b1f", marginBottom: 3 }}>{nr.name}</div>
                <div style={{ fontSize: 10, color: "#c07070", lineHeight: 1.5 }}>{nr.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 추천 컬러 */}
        <div style={s.card}>
          <div style={s.sec}>추천 눈썹 컬러</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            {r.recommendedColors?.map((c, i) => (
              <div key={c} style={{ textAlign: "center" }}>
                <div onClick={() => setBrowColor(colorMap[c] || "#3d2010")} style={{
                  width: 36, height: 36, borderRadius: "50%", background: colorMap[c] || "#8a7060",
                  border: browColor === (colorMap[c] || "#3d2010") ? "2.5px solid #c4956a" : "2px solid transparent",
                  marginBottom: 4, cursor: "pointer",
                  boxShadow: browColor === (colorMap[c] || "#3d2010") ? "0 2px 8px rgba(196,149,106,0.45)" : "none",
                  transition: "all 0.15s",
                }} />
                <div style={{ fontSize: 9, color: "#6b5a52", width: 40, lineHeight: 1.4 }}>{c}</div>
                {i === 0 && <div style={{ fontSize: 9, color: "#c4956a", fontWeight: 700 }}>✓추천</div>}
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 10px", background: "#fff9f4", borderRadius: 8, fontSize: 11, color: "#8b6f5e" }}>
            💡 컬러 원 클릭 → 시뮬레이션에 즉시 반영돼요
          </div>
        </div>

        {/* 보완 포인트 */}
        <div style={s.card}>
          <div style={s.sec}>보완 포인트</div>
          {r.supplementPoints?.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "flex-start" }}>
              <span style={{ color: "#c4956a", flexShrink: 0, fontSize: 11, marginTop: 1 }}>✦</span>
              <span style={{ fontSize: 12, color: "#3d2b1f", lineHeight: 1.65 }}>{p}</span>
            </div>
          ))}
        </div>

        {/* 시술 팁 */}
        <div style={s.card}>
          <div style={s.sec}>눈썹 3포인트 시술 팁</div>
          {[["① 앞머리", r.browTips?.start], ["② 눈썹 산", r.browTips?.arch], ["③ 꼬리", r.browTips?.end]].map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: 8, marginBottom: 9, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c4956a", flexShrink: 0, minWidth: 44 }}>{label}</span>
              <span style={{ fontSize: 11, color: "#3d2b1f", lineHeight: 1.65 }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "8px 0 16px", color: "#b09688", fontSize: 11, lineHeight: 1.9 }}>
          💡 시뮬레이션은 참고용이며 실제 시술 결과와 다를 수 있어요
        </div>

        <button onClick={reset} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #e8ddd5", background: "#fff", color: "#8b6f5e", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + 새로운 고객 분석하기
        </button>
      </div>
    </div>
  );
}
