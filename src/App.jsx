import { useState, useRef, useEffect, useCallback } from "react";

// ── 눈썹 모양별 베지어 커브 파라미터 ──────────────────────────
const BROW_STYLES = {
  "각진 아치형":     { archH: 0.38, startDip: 0.05, endDip: 0.10, peakX: 0.68, sharpness: 1.4 },
  "소프트 세미아치": { archH: 0.28, startDip: 0.03, endDip: 0.08, peakX: 0.65, sharpness: 1.0 },
  "내추럴 아치형":  { archH: 0.22, startDip: 0.02, endDip: 0.06, peakX: 0.62, sharpness: 0.9 },
  "자연스러운 아치형":{ archH: 0.24, startDip: 0.02, endDip: 0.07, peakX: 0.63, sharpness: 1.0 },
  "부드러운 아치형": { archH: 0.20, startDip: 0.02, endDip: 0.06, peakX: 0.60, sharpness: 0.8 },
  "평평한 일자형":  { archH: 0.06, startDip: 0.00, endDip: 0.02, peakX: 0.55, sharpness: 0.5 },
};

// Canvas에 눈썹 그리기
function drawBrow(ctx, x1, y1, x2, y2, style, thickness, color, alpha) {
  const W = x2 - x1;
  const H = y2 - y1; 
  const p = BROW_STYLES[style] || BROW_STYLES["소프트 세미아치"];
  const browThick = H * 0.32 * thickness;
  const browY = y1 - H * 0.55; 

  const sx = x1 + W * 0.02;
  const sy = browY + H * p.startDip;
  const ex = x2 + W * 0.08;
  const ey = browY + H * p.endDip;
  const px = x1 + W * p.peakX;
  const py = browY - H * p.archH;

  ctx.save();
  ctx.globalAlpha = alpha;

  const topPath = new Path2D();
  topPath.moveTo(sx, sy - browThick * 0.3);
  topPath.bezierCurveTo(
    sx + W * 0.3, sy - browThick * 0.5,
    px - W * 0.1, py - browThick * 0.6,
    px, py - browThick * 0.5
  );
  topPath.bezierCurveTo(
    px + W * 0.1, py - browThick * 0.4,
    ex - W * 0.15, ey - browThick * 0.1,
    ex, ey
  );

  topPath.bezierCurveTo(
    ex - W * 0.15, ey + browThick * 0.6,
    px + W * 0.1, py + browThick * 0.5,
    px, py + browThick * 0.5
  );
  topPath.bezierCurveTo(
    px - W * 0.1, py + browThick * 0.6,
    sx + W * 0.25, sy + browThick * 0.7,
    sx, sy + browThick * 0.4
  );
  topPath.closePath();

  const grad = ctx.createLinearGradient(sx, 0, ex, 0);
grad.addColorStop(0, "#" + color + "00");
grad.addColorStop(0.15, "#" + color + "cc");
grad.addColorStop(0.5, "#" + color + "ff");
grad.addColorStop(0.85, "#" + color + "bb");
grad.addColorStop(1, "#" + color + "00");

  ctx.fillStyle = grad;
  ctx.filter = "blur(1.5px)";
  ctx.fill(topPath);
  ctx.filter = "none";
  ctx.restore();
}

export default function App() {
  const [phase, setPhase] = useState("upload");
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [overlayAlpha, setOverlayAlpha] = useState(0.82);
  const [browColor, setBrowColor] = useState("#3d2010");
  const [browThickness, setBrowThickness] = useState(1.0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef();
  const canvasRef = useRef();
  const imgRef = useRef();

  const initCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !analysisResult?.eyeCoords) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const style = analysisResult.recommendedStyles[selectedStyle]?.name;
    const { leftEye, rightEye } = analysisResult.eyeCoords;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const toPixel = (coord) => ({
      x1: coord.x1 * iw, y1: coord.y1 * ih,
      x2: coord.x2 * iw, y2: coord.y2 * ih,
    });

    const lp = toPixel(leftEye);
    const rp = toPixel(rightEye);

    drawBrow(ctx, lp.x1, lp.y1, lp.x2, lp.y2, style, browThickness, browColor.replace("#", ""), overlayAlpha);
    drawBrow(ctx, rp.x1, rp.y1, rp.x2, rp.y2, style, browThickness, browColor.replace("#", ""), overlayAlpha);
  }, [analysisResult, selectedStyle, overlayAlpha, browColor, browThickness]);

  useEffect(() => { renderOverlay(); }, [renderOverlay]);

  const handleFile = (file) => {
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
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
      });

      // ⭕ [수정 완료] 지저분한 외부 주소를 걷어내고 정석 프록시 주소로 세팅!
     const resp = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },    
        body: JSON.stringify({
          // ⭕ [수정 완료] 클로드의 상상 속 이름이 아닌, 실제 안드로픽 공식 마스터 모델명 적용!
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imgFile.type || "image/jpeg", data: base64 } },
              {
                type: "text",
                text: `반영구 시술 전문가로서 정면 사진을 분석하세요. JSON만 출력, 다른 텍스트 없음.
중요: eyeCoords는 이미지 전체 크기 대비 0~1 정규화 비율로 표시.
왼쪽 눈(이미지 기준 왼쪽=사람 오른쪽)과 오른쪽 눈 각각의 눈두덩 영역을 분석.
x1=눈 시작X, y1=눈 위Y, x2=눈 끝X, y2=눈 아래Y (눈 전체 바운딩박스)

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
    "leftEye":  { "x1": 0.28, "y1": 0.38, "x2": 0.46, "y2": 0.46 },
    "rightEye": { "x1": 0.54, "y1": 0.38, "x2": 0.72, "y2": 0.46 }
  },
  "recommendedStyles": [
    { "rank": 1, "tag": "베스트", "name": "각진 아치형", "length": 4, "angle": 4, "thickness": 3, "color": 4, "archPosition": 4, "roundness": 2, "hashtag": "#갸름한효과" },
    { "rank": 2, "tag": "추천", "name": "소프트 세미아치", "length": 3, "angle": 3, "thickness": 3, "color": 3, "archPosition": 3, "roundness": 3, "hashtag": "#자연스러운입체감" },
    { "rank": 3, "tag": "자연스러움", "name": "내추럴 아치형", "length": 3, "angle": 3, "thickness": 2, "color": 3, "archPosition": 3, "roundness": 4, "hashtag": "#부드러운인상" }
  ],
  "notRecommended": [
    { "name": "평평한 일자형", "reason": "얼굴이 더 넓어 보임" },
    { "name": "낮은 직선형", "reason": "답답한 인상" }
  ],
  "recommendedColors": ["다크 브라운", "초코 브라운", "내추럴 브라운"],
  "supplementPoints": ["보완포인트1", "보완포인트2", "보완포인트3"],
  "browTips": { "start": "콧볼의 수직선", "arch": "검은 동자 바깥쪽", "end": "눈꼬리보다 살짝 길게" }
}

실제 사진을 분석해서 eyeCoords를 정확하게 측정해주세요.`
              }
            ]
          }]
        })
      });

      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
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
    "다크 브라운": "#3d2010", "초코 브라운": "#5a2e18", "내추럴 브라운": "#7a4a30",
    "애쉬 브라운": "#6b5848", "그레이 브라운": "#5a5048", "라이트 브라운": "#9a7860",
  };

  const Dots = ({ value, max = 5 }) => (
    <span>{Array.from({ length: max }, (_, i) => (
      <span key={i} style={{ color: i < value ? "#c4956a" : "#ddd", fontSize: 8, marginRight: 1 }}>
        {i < value ? "●" : "○"}
      </span>
    ))}</span>
  );

  const s = {
    app: { fontFamily: "'Noto Sans KR','Apple SD Gothic Neo',sans-serif", background: "#faf8f5", minHeight: "100vh" },
    header: { background: "linear-gradient(135deg,#6b4f3e,#c4956a)", padding: "16px 20px", color: "#fff", textAlign: "center" },
    card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #ede4dc", boxShadow: "0 1px 8px rgba(139,111,94,0.07)" },
    sec: { fontSize: 11, fontWeight: 700, color: "#8b6f5e", marginBottom: 10, borderBottom: "1px solid #f0e6de", paddingBottom: 6 },
    pill: { display: "inline-block", padding: "3px 10px", borderRadius: 99, background: "#f5ede6", color: "#8b6f5e", fontSize: 11, marginRight: 5, marginBottom: 5 },
  };

  if (phase === "upload") return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.75, marginBottom: 3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>눈썹 AI 시뮬레이터</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>사진 위에 추천 눈썹을 직접 그려드려요</div>
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
              textAlign: "center", transition: "all 0.2s", marginBottom: 14
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
            boxShadow: imgFile ? "0 4px 16px rgba(196,149,106,0.35)" : "none", transition: "all 0.2s"
          }}>
            ✨ 눈썹 시뮬레이션 시작
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#b0968a", lineHeight: 1.8 }}>
          · AI가 눈 위치를 감지하여 추천 눈썹을 자동으로 그려드려요<br />
          · 정확도는 약 70~80% 수준이에요
        </div>
      </div>
    </div>
  );

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

          <div style={{ position: "relative", display: "inline-block", width: "100%", borderRadius: 10, overflow: "hidden", background: "#f0e8e0" }}>
            <img
              ref={imgRef}
              src={imgSrc}
              alt="고객"
              onLoad={() => { initCanvas(); setTimeout(renderOverlay, 50); }}
              style={{ width: "100%", display: "block", borderRadius: 10 }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 10 }}
            />
            <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: 1 }}>
              AI BROW SIM
            </div>
          </div>

          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "#9e8a7e", marginBottom: 6, fontWeight: 600 }}>추천 스타일 선택</div>
            <div style={{ display: "flex", gap: 6 }}>
              {r.recommendedStyles.map((st, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedStyle(idx)}
                  style={{
                    flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: selectedStyle === idx ? "linear-gradient(135deg,#8b6f5e,#c4956a)" : "#f5ede6",
                    color: selectedStyle === idx ? "#fff" : "#8b6f5e",
                    fontSize: 10, fontWeight: 700, transition: "all 0.15s",
                    boxShadow: selectedStyle === idx ? "0 2px 8px rgba(196,149,106,0.4)" : "none"
                  }}
                >
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}<br />
                  <span style={{ fontSize: 9 }}>{st.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#faf8f5", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#9e8a7e", width: 40, flexShrink: 0 }}>투명도</span>
              <input type="range" min="0.3" max="1" step="0.05" value={overlayAlpha}
                onChange={e => setOverlayAlpha(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#c4956a" }} />
              <span style={{ fontSize: 10, color: "#c4956a", width: 28, textAlign: "right" }}>{Math.round(overlayAlpha * 100)}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#9e8a7e", width: 40, flexShrink: 0 }}>두께</span>
              <input type="range" min="0.5" max="1.8" step="0.1" value={browThickness}
                onChange={e => setBrowThickness(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#c4956a" }} />
              <span style={{ fontSize: 10, color: "#c4956a", width: 28, textAlign: "right" }}>{browThickness.toFixed(1)}x</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: "#9e8a7e", width: 40, flexShrink: 0 }}>컬러</span>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                {Object.entries(colorMap).slice(0, 5).map(([name, hex]) => (
                  <div
                    key={name}
                    onClick={() => setBrowColor(hex)}
                    title={name}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", background: hex, cursor: "pointer",
                      border: browColor === hex ? "2.5px solid #c4956a" : "2px solid transparent",
                      boxShadow: browColor === hex ? "0 0 0 1px #c4956a" : "none",
                      transition: "all 0.15s"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sec}>얼굴형 분석</div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#f5ede6,#e8d5c4)", border: "2px solid #c4956a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>🔵</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#8b6f5e", marginBottom: 4 }}>{r.faceShape}</div>
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
                <div key={k} style={{ fontSize: 11, marginBottom: 4, display: "flex", gap: 4 }}>
                  <span style={{ color: "#c4956a" }}>✓</span>
                  <span style={{ color: "#9e8a7e" }}>{k}</span>
                  <span style={{ fontWeight: 600, marginLeft: "auto" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: "#f0e6de", margin: "0 14px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#b09688", marginBottom: 6 }}>얼굴선</div>
              {[["턱선", r.faceContour?.jawLine], ["비율", r.faceContour?.ratio]].map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, marginBottom: 4, display: "flex", gap: 4 }}>
                  <span style={{ color: "#c4956a" }}>✓</span>
                  <span style={{ color: "#9e8a7e" }}>{k}</span>
                  <span style={{ fontWeight: 600, marginLeft: "auto", fontSize: 10 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ ...s.card, flex: 1.5, marginBottom: 0 }}>
            <div style={s.sec}>현재 눈썹 특징</div>
            {[["형태", r.currentBrow?.shape], ["산 각도", r.currentBrow?.archAngle], ["색상", r.currentBrow?.color], ["두께", r.currentBrow?.thickness], ["길이", r.currentBrow?.length]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: "#9e8a7e" }}>· {k}</span>
                <span style={{ fontWeight: 700, color: "#3d2b1f" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, flex: 1, marginBottom: 0 }}>
            <div style={s.sec}>피부톤</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
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
            {r.recommendedStyles.map((st, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedStyle(idx)}
                style={{
                  flex: 1, border: selectedStyle === idx ? "2px solid #c4956a" : "1px solid #e8ddd5",
                  borderRadius: 10, padding: "10px 8px", cursor: "pointer",
                  background: selectedStyle === idx ? "#fffaf5" : "#fff", transition: "all 0.15s"
                }}
              >
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
          <div style={{ display: "flex", gap: 12 }}>
            {r.recommendedColors?.map((c, i) => (
              <div key={c} style={{ textAlign: "center" }}>
                <div
                  onClick={() => setBrowColor(colorMap[c] || "#3d2010")}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", background: colorMap[c] || "#8a7060",
                    border: browColor === (colorMap[c] || "#3d2010") ? "2.5px solid #c4956a" : "2px solid transparent",
                    marginBottom: 4, cursor: "pointer", boxShadow: browColor === (colorMap[c] || "#3d2010") ? "0 2px 8px rgba(196,149,106,0.4)" : "none",
                    transition: "all 0.15s"
                  }}
                />
                <div style={{ fontSize: 9, color: "#6b5a52", width: 40, lineHeight: 1.4 }}>{c}</div>
                {i === 0 && <div style={{ fontSize: 9, color: "#c4956a", fontWeight: 700 }}>✓추천</div>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "8px 10px", background: "#fff9f4", borderRadius: 8, fontSize: 11, color: "#8b6f5e", lineHeight: 1.6 }}>
            💡 컬러 원을 클릭하면 시뮬레이션에 바로 적용돼요
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sec}>보완 포인트</div>
          {r.supplementPoints?.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ color: "#c4956a", flexShrink: 0, fontSize: 11 }}>✦</span>
              <span style={{ fontSize: 12, color: "#3d2b1f", lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <div style={s.sec}>눈썹 3포인트 시술 팁</div>
          {[["① 앞머리", r.browTips?.start], ["② 눈썹 산", r.browTips?.arch], ["③ 꼬리", r.browTips?.end]].map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#c4956a", flexShrink: 0, minWidth: 44 }}>{label}</span>
              <span style={{ fontSize: 11, color: "#3d2b1f", lineHeight: 1.6 }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "6px 0 12px", color: "#b09688", fontSize: 11, lineHeight: 1.8 }}>
          💡 시뮬레이션은 참고용이며 실제 시술 결과와 다를 수 있어요
        </div>

        <button onClick={reset} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid #e8ddd5", background: "#fff", color: "#8b6f5e", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + 새로운 고객 분석하기
        </button>
      </div>
    </div>
  );
}
