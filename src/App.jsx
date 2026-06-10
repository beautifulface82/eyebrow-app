import { useState, useRef, useEffect, useCallback } from "react";

const BROW_PROFILES = {
  "각진 아치형":     { archRatio: 0.55, peakX: 0.65, startY: 0.85, endY: 0.90 },
  "소프트 세미아치": { archRatio: 0.40, peakX: 0.63, startY: 0.90, endY: 0.90 },
  "내추럴 아치형":   { archRatio: 0.30, peakX: 0.62, startY: 0.92, endY: 0.92 },
  "자연스러운 아치형":{ archRatio: 0.35, peakX: 0.63, startY: 0.90, endY: 0.91 },
  "부드러운 아치형": { archRatio: 0.28, peakX: 0.60, startY: 0.92, endY: 0.93 },
  "평평한 일자형":   { archRatio: 0.10, peakX: 0.55, startY: 0.95, endY: 0.95 },
};

// 자연스러운 눈썹 그리기 - 털 결 방식
function drawNaturalBrow(ctx, bx1, by1, bx2, by2, style, thickness, color, alpha, mirror = false) {
  const p = BROW_PROFILES[style] || BROW_PROFILES["소프트 세미아치"];
  const W  = bx2 - bx1;
  const BH = by2 - by1; // 눈썹 영역 높이

  // 눈썹 곡선 포인트 계산
  const sx  = bx1 - W * 0.02;
  const sy  = by1 + BH * p.startY;
  const ex  = bx2 + W * 0.05;
  const ey  = by1 + BH * p.endY;
  const peakRatio = mirror ? (1 - p.peakX) : p.peakX;
  const px  = bx1 + W * peakRatio;
  const py  = by1 + BH * (1 - p.archRatio); // 산 높이

  ctx.save();
  ctx.lineCap = "round";

  const numHairs = 80;

  for (let i = 0; i < numHairs; i++) {
    const t = i / (numHairs - 1);

    // 베지어 곡선 위 위치 (눈썹 중심선)
    const oneMinusT = 1 - t;
    // 2차 베지어: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const centerX = oneMinusT * oneMinusT * sx + 2 * oneMinusT * t * px + t * t * ex;
    const centerY = oneMinusT * oneMinusT * sy + 2 * oneMinusT * t * py + t * t * ey;

    // 베지어 접선 방향 (털이 자라는 방향에 수직)
    const tangentX = 2 * (1 - t) * (px - sx) + 2 * t * (ex - px);
    const tangentY = 2 * (1 - t) * (py - sy) + 2 * t * (ey - py);
    const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;

    // 눈썹 두께 - 가운데 두껍고 양끝 가늘게
    const taperFactor = Math.sin(Math.PI * t);
    const browWidth = BH * 0.35 * thickness * (0.3 + 0.7 * taperFactor);

    // 위치에 따른 털 각도
    // 앞머리: 45도 위, 중간: 수직, 꼬리: 약간 아래
    let hairAngle;
    if (mirror) {
      hairAngle = -Math.PI / 2 + (0.5 - t) * 0.7;
    } else {
      hairAngle = -Math.PI / 2 - (0.5 - t) * 0.7;
    }

    // 털 길이 변화
    const hairLen = browWidth * (1.2 + 0.8 * taperFactor) + (Math.random() - 0.5) * browWidth * 0.4;

    // 털 뿌리 위치 - 눈썹 중심선 ± 너비 내에서 랜덤
    const offsetAlong = (Math.random() - 0.5) * W * 0.025;
    const offsetPerp  = (Math.random() * 0.5) * browWidth * 0.5;

    const rootX = centerX + offsetAlong * (tangentX / tangentLen) + offsetPerp * (tangentY / tangentLen);
    const rootY = centerY + offsetAlong * (tangentY / tangentLen) - offsetPerp * (tangentX / tangentLen);

    // 털 끝 위치
    const tipX = rootX + Math.cos(hairAngle) * hairLen * 0.15;
    const tipY = rootY + Math.sin(hairAngle) * hairLen;

    // 자연스러운 휨 (약간 곡선)
    const bend = (Math.random() - 0.5) * 1.8;
    const cpX  = rootX + (tipX - rootX) * 0.5 + bend;
    const cpY  = rootY + (tipY - rootY) * 0.5;

    // 투명도: 가운데 진하고 양끝 옅게
    const baseOpacity  = 0.25 + 0.55 * taperFactor;
    const randOpacity  = 0.55 + Math.random() * 0.45;
    const hairOpacity  = baseOpacity * randOpacity;

    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.strokeStyle = "#" + color;
    ctx.lineWidth   = 0.3 + Math.random() * 0.65;
    ctx.globalAlpha = alpha * hairOpacity;
    ctx.stroke();
  }

  ctx.restore();
}

export default function App() {
  const [phase, setPhase]                     = useState("upload");
  const [imgSrc, setImgSrc]                   = useState(null);
  const [imgFile, setImgFile]                 = useState(null);
  const [analysisResult, setAnalysisResult]   = useState(null);
  const [selectedStyle, setSelectedStyle]     = useState(0);
  const [overlayAlpha, setOverlayAlpha]       = useState(0.88);
  const [browColor, setBrowColor]             = useState("#3d2010");
  const [browThickness, setBrowThickness]     = useState(1.0);
  const [error, setError]                     = useState(null);
  const [dragOver, setDragOver]               = useState(false);

  const fileRef   = useRef();
  const canvasRef = useRef();
  const imgRef    = useRef();

  const initCanvas = useCallback(() => {
    const img = imgRef.current, canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img || !analysisResult?.browCoords) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const style = analysisResult.recommendedStyles?.[selectedStyle]?.name || "소프트 세미아치";
    const { leftBrow, rightBrow } = analysisResult.browCoords;
    const iw = img.naturalWidth, ih = img.naturalHeight;

    const toPixel = c => ({
      x1: c.x1 * iw, y1: c.y1 * ih,
      x2: c.x2 * iw, y2: c.y2 * ih,
    });

    const lb = toPixel(leftBrow);
    const rb = toPixel(rightBrow);
    const col = browColor.replace("#", "");

    drawNaturalBrow(ctx, lb.x1, lb.y1, lb.x2, lb.y2, style, browThickness, col, overlayAlpha, false);
    drawNaturalBrow(ctx, rb.x1, rb.y1, rb.x2, rb.y2, style, browThickness, col, overlayAlpha, true);
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
                text: `반영구 시술 전문가로서 정면 사진을 분석하세요. JSON만 출력, 다른 텍스트나 마크다운 없음.

browCoords 측정 규칙 (매우 중요):
- 이미지 전체 크기 대비 0~1 정규화 비율
- leftBrow = 이미지 왼쪽에 보이는 눈썹 (사람 기준 오른쪽 눈썹)
- rightBrow = 이미지 오른쪽에 보이는 눈썹 (사람 기준 왼쪽 눈썹)
- x1 = 눈썹 안쪽 시작점 X (코 방향)
- x2 = 눈썹 바깥쪽 끝점 X (귀 방향)
- y1 = 눈썹 위쪽 경계 Y (눈썹 털 가장 위)
- y2 = 눈썹 아래쪽 경계 Y (눈썹 털 가장 아래)
- 반드시 실제 눈썹 위치 측정 (이마나 눈 위치 아님)
- 눈썹은 보통 얼굴 전체 높이의 25~40% 위치에 있음
- y2 - y1 은 보통 0.02~0.04 정도 (눈썹 두께)

{
  "faceShape": "둥근형",
  "faceShapeDetail": "2줄 이내 설명",
  "atmosphere": ["인상 특징 1~2개"],
  "skeleton": { "forehead": "중간", "cheekbone": "넓음", "jaw": "부드러움" },
  "faceContour": { "jawLine": "둥글고 부드러움", "ratio": "비슷함" },
  "currentBrow": { "shape": "일자형", "archAngle": "낮음", "color": "자연스러움", "thickness": "두꺼움", "length": "표준" },
  "skinTone": "웜톤/어두움",
  "skinToneDisplay": "웜 미디엄 톤",
  "browCoords": {
    "leftBrow":  { "x1": 0.27, "y1": 0.32, "x2": 0.46, "y2": 0.36 },
    "rightBrow": { "x1": 0.54, "y1": 0.32, "x2": 0.73, "y2": 0.36 }
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

실제 사진의 눈썹 위치를 정확하게 측정해서 browCoords를 채워주세요.`
              }
            ]
          }]
        })
      });

      const data   = await resp.json();
      const text   = data.content?.find(b => b.type === "text")?.text || "";
      const clean  = text.replace(/```json|```/g, "").trim();
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

  if (phase === "loading") return (
    <div style={{ ...s.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>✨</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#3d2b1f", marginBottom: 8 }}>분석 중입니다...</div>
      <div style={{ fontSize: 13, color: "#9e8a7e", textAlign: "center", lineHeight: 1.9 }}>
        눈썹 위치를 정밀 감지하고<br />맞춤 눈썹 라인을 계산하고 있어요
      </div>
    </div>
  );

  if (!analysisResult) return null;
  const r = analysisResult;

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.75, marginBottom: 3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>눈썹 시뮬레이션 결과</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</div>
      </div>

      <div style={{ padding: "16px 14px" }}>

        <div style={s.card}>
          <div style={s.sec}>👁 눈썹 시뮬레이션</div>
          <div style={{ position: "relative", width: "100%", borderRadius: 10, overflow: "hidden", background: "#f0e8e0", lineHeight: 0 }}>
            <img ref={imgRef} src={imgSrc} alt="고객"
              onLoad={() => { initCanvas(); setTimeout(renderOverlay, 80); }}
              style={{ width: "100%", display: "block", borderRadius: 10 }} />
            <canvas ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 10, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(196,149,106,0.92)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>
              ✨ {r.recommendedStyles?.[selectedStyle]?.name}
            </div>
            <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: 1 }}>AI BROW SIM</div>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12, marginBottom: 10 }}>
            {r.recommendedStyles?.map((st, idx) => (
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

        <div style={s.card}>
          <div style={{ ...s.sec, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ background: "#c4956a", color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>BEST</span>
            추천 스타일 상세
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {r.recommendedStyles?.map((st, idx) => (
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

        <div style={s.card}>
          <div style={s.sec}>보완 포인트</div>
          {r.supplementPoints?.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "flex-start" }}>
              <span style={{ color: "#c4956a", flexShrink: 0, fontSize: 11, marginTop: 1 }}>✦</span>
              <span style={{ fontSize: 12, color: "#3d2b1f", lineHeight: 1.65 }}>{p}</span>
            </div>
          ))}
        </div>

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
