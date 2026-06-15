import { useState, useRef, useEffect, useCallback } from "react";

// ── 얼굴형별 눈썹 아치 프로필 ─────────────────────────────
const ARCH = {
  "각진 아치형":      { archH: 0.68, peakAt: 0.65 },
  "소프트 세미아치":  { archH: 0.48, peakAt: 0.63 },
  "내추럴 아치형":    { archH: 0.35, peakAt: 0.62 },
  "자연스러운 아치형":{ archH: 0.40, peakAt: 0.63 },
  "부드러운 아치형":  { archH: 0.28, peakAt: 0.60 },
  "평평한 일자형":    { archH: 0.10, peakAt: 0.55 },
};

// ── 눈 좌표 → 눈썹 좌표 변환 (눈 위 적절한 간격) ─────────
function eyeToBrow(eye, iw, ih) {
  const ex1 = eye.x1 * iw,  ey1 = eye.y1 * ih;
  const ex2 = eye.x2 * iw,  ey2 = eye.y2 * ih;
  const eH  = ey2 - ey1;    // 눈 세로 크기 (픽셀)
  const eW  = ex2 - ex1;    // 눈 가로 크기

  // 눈썹 아랫선 = 눈 윗선에서 위로 (눈 높이의 0.6배)
  const browBottom = ey1 - eH * 0.65;
  // 눈썹 두께 = 눈 높이의 0.50배
  const browH = eH * 0.50;
  const browTop = browBottom - browH;

  return {
    x1: ex1 - eW * 0.08,   // 눈보다 안쪽으로 살짝 더
    y1: browTop,
    x2: ex2 + eW * 0.14,   // 눈보다 바깥으로 살짝 더
    y2: browBottom,
  };
}

// ── 헤어스트록 눈썹 그리기 ───────────────────────────────
// 레퍼런스 기반:
//   앞머리(inner) → 55° 위쪽   (세움)
//   중간(body)    → 25° 비스듬
//   꼬리(tail)    →  5° 거의 수평 (눕힘)
function drawHairStroke(ctx, bx1, by1, bx2, by2, style, thick, hex, alpha) {
  const cfg = ARCH[style] || ARCH["소프트 세미아치"];
  const W   = bx2 - bx1;
  const BH  = by2 - by1;   // 눈썹 영역 높이

  // ── 방향 판별 ────────────────────────────────────────────
  const isLeft  = (bx1 + bx2) / 2 < ctx.canvas.width / 2;
  // leftBrow: 안쪽(코)=bx2(오른쪽), 바깥쪽(귀)=bx1(왼쪽)
  // rightBrow: 안쪽(코)=bx1(왼쪽),  바깥쪽(귀)=bx2(오른쪽)
  const innerX  = isLeft ? bx2 : bx1;
  const outerX  = isLeft ? bx1 : bx2;
  const outDir  = outerX > innerX ? 1 : -1;   // +1=오른쪽, -1=왼쪽

  // ── 눈썹 아치 베지어 제어점 ──────────────────────────────
  // 안쪽에서 peakAt(65%) 지점에 산
  const ctrlX = innerX + (outerX - innerX) * cfg.peakAt;
  const ctrlY = by1 + BH * (1 - cfg.archH);   // 산 높이
  const sY    = by2 - BH * 0.05;              // 시작 y (안쪽, 아래쪽)
  const eY    = by2 - BH * 0.20;              // 끝 y (꼬리, 살짝 위)

  ctx.save();
  ctx.lineCap = "round";

  const N = 110;

  for (let i = 0; i < N; i++) {
    const t  = i / (N - 1);   // 0 = 안쪽(inner), 1 = 꼬리(outer)
    const b  = 1 - t;

    // 아치 위 위치 (베지어)
    const ax = b*b*innerX + 2*b*t*ctrlX + t*t*outerX;
    const ay = b*b*sY     + 2*b*t*ctrlY + t*t*eY;

    // ── 핵심: 헤어스트록 각도 ─────────────────────────────
    // inner(t=0): 55° → middle(t=0.5): 28° → tail(t=1): 4°
    const deg = 55 - t * 51;
    const rad = deg * Math.PI / 180;

    // 털 길이: 가운데 가장 길고 양끝 짧게
    const taper   = Math.sin(Math.PI * t);
    const hairLen = BH * (1.3 + 2.6 * taper) * thick;

    // ── 수직(위) · 수평(바깥) 성분 — 감쇠 없이 풀로 ──────
    const hComp = Math.cos(rad) * hairLen;   // 바깥쪽으로 뻗음
    const vComp = Math.sin(rad) * hairLen;   // 위로 올라감

    // 뿌리 위치 (아치 위 + 약간 랜덤)
    const jitter = (Math.random() - 0.5) * W * 0.022;
    const rootX  = ax + jitter;
    const rootY  = ay + Math.random() * BH * 0.40;

    // 끝 위치 (수평으로 outDir * hComp, 수직으로 위 vComp)
    const tipX = rootX + outDir * hComp;
    const tipY = rootY - vComp;

    // 자연스러운 구부러짐 (약하게)
    const bend = (Math.random() - 0.5) * 1.4;
    const cpX  = rootX + outDir * hComp * 0.42 + bend;
    const cpY  = rootY - vComp * 0.54;

    // 투명도 (가운데 진하게)
    const op = (0.58 + 0.42 * taper) * (0.68 + Math.random() * 0.32);

    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.strokeStyle = "#" + hex;
    ctx.lineWidth   = 0.48 + Math.random() * 0.98;
    ctx.globalAlpha = alpha * op;
    ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
export default function App() {
  const [phase,  setPhase]  = useState("upload");
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFile,setImgFile]= useState(null);
  const [result, setResult] = useState(null);
  const [selSt,  setSelSt]  = useState(0);
  const [alpha,  setAlpha]  = useState(0.90);
  const [color,  setColor]  = useState("#3d2010");
  const [thick,  setThick]  = useState(1.1);
  const [error,  setError]  = useState(null);
  const [drag,   setDrag]   = useState(false);

  const fileRef   = useRef();
  const canvasRef = useRef();
  const imgRef    = useRef();

  const initCanvas = useCallback(() => {
    const img = imgRef.current, cv = canvasRef.current;
    if (!img || !cv) return;
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
  }, []);

  const render = useCallback(() => {
    const cv  = canvasRef.current, img = imgRef.current;
    if (!cv || !img || !result?.eyeCoords) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const st  = result.recommendedStyles?.[selSt]?.name || "소프트 세미아치";
    const iw  = img.naturalWidth, ih = img.naturalHeight;
    const lb  = eyeToBrow(result.eyeCoords.leftEye,  iw, ih);
    const rb  = eyeToBrow(result.eyeCoords.rightEye, iw, ih);
    const col = color.replace("#", "");
    drawHairStroke(ctx, lb.x1, lb.y1, lb.x2, lb.y2, st, thick, col, alpha);
    drawHairStroke(ctx, rb.x1, rb.y1, rb.x2, rb.y2, st, thick, col, alpha);
  }, [result, selSt, alpha, color, thick]);

  useEffect(() => { render(); }, [render]);

  const handleFile = f => {
    if (!f?.type.startsWith("image/")) return;
    setImgFile(f); setImgSrc(URL.createObjectURL(f));
    setError(null); setResult(null);
  };

  const analyze = async () => {
    if (!imgFile) return;
    setPhase("loading");
    try {
      const b64 = await new Promise((res, rej) => {
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
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: imgFile.type || "image/jpeg", data: b64 } },
            { type: "text", text: `반영구 시술 전문가로서 정면 사진을 분석하세요. JSON만 출력, 마크다운 없음.

eyeCoords 측정 (★ 눈 자체 위치 — 눈썹 아님):
- 이미지 전체 크기 대비 0~1 정규화
- leftEye = 이미지 왼쪽 눈, rightEye = 이미지 오른쪽 눈
- y1 = 윗 눈꺼풀 라인 (눈이 뜬 상태 기준)
- y2 = 아랫 속눈썹 라인
- ★ y2 - y1 반드시 0.04~0.09 범위 (눈 높이)
- ★ 눈은 이미지 전체의 40~58% 위치에 있음
- x1 = 눈 안쪽 끝, x2 = 눈 바깥쪽 끝

{
  "faceShape": "둥근형",
  "faceShapeDetail": "설명",
  "atmosphere": ["특징"],
  "skeleton": { "forehead":"중간","cheekbone":"넓음","jaw":"부드러움" },
  "faceContour": { "jawLine":"둥글고 부드러움","ratio":"비슷함" },
  "currentBrow": { "shape":"일자형","archAngle":"낮음","color":"자연스러움","thickness":"두꺼움","length":"표준" },
  "skinTone": "웜톤/어두움",
  "skinToneDisplay": "웜 미디엄 톤",
  "eyeCoords": {
    "leftEye":  { "x1":0.27,"y1":0.44,"x2":0.46,"y2":0.52 },
    "rightEye": { "x1":0.54,"y1":0.44,"x2":0.73,"y2":0.52 }
  },
  "recommendedStyles": [
    { "rank":1,"tag":"베스트",    "name":"각진 아치형",   "length":4,"angle":4,"thickness":3,"color":4,"archPosition":4,"roundness":2,"hashtag":"#갸름한효과" },
    { "rank":2,"tag":"추천",      "name":"소프트 세미아치","length":3,"angle":3,"thickness":3,"color":3,"archPosition":3,"roundness":3,"hashtag":"#자연스러운입체감" },
    { "rank":3,"tag":"자연스러움","name":"내추럴 아치형", "length":3,"angle":3,"thickness":2,"color":3,"archPosition":3,"roundness":4,"hashtag":"#부드러운인상" }
  ],
  "notRecommended": [
    { "name":"평평한 일자형","reason":"얼굴이 더 넓어 보임" },
    { "name":"낮은 직선형","reason":"답답한 인상" }
  ],
  "recommendedColors": ["다크 브라운","초코 브라운","내추럴 브라운"],
  "supplementPoints": ["보완포인트1","보완포인트2","보완포인트3"],
  "browTips": { "start":"콧볼의 수직선","arch":"검은 동자 바깥쪽","end":"눈꼬리보다 살짝 길게" }
}` }
          ]}]
        })
      });

      const data  = await resp.json();
      const text  = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
      setPhase("result");
    } catch (e) {
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPhase("upload");
    }
  };

  const reset = () => { setPhase("upload"); setImgSrc(null); setImgFile(null); setResult(null); setSelSt(0); };

  const colorMap = {
    "다크 브라운":"#3d2010","초코 브라운":"#5a2e18","내추럴 브라운":"#7a4a30",
    "애쉬 브라운":"#6b5848","그레이 브라운":"#5a5048","라이트 브라운":"#9a7860",
  };

  const Dots = ({ value, max=5 }) => <span>{Array.from({length:max},(_,i) => (
    <span key={i} style={{color:i<value?"#c4956a":"#ddd",fontSize:8,marginRight:1}}>{i<value?"●":"○"}</span>
  ))}</span>;

  const s = {
    app:  {fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",background:"#faf8f5",minHeight:"100vh"},
    hdr:  {background:"linear-gradient(135deg,#6b4f3e,#c4956a)",padding:"16px 20px",color:"#fff",textAlign:"center"},
    card: {background:"#fff",borderRadius:14,padding:16,marginBottom:12,border:"1px solid #ede4dc",boxShadow:"0 1px 8px rgba(139,111,94,0.07)"},
    sec:  {fontSize:11,fontWeight:700,color:"#8b6f5e",marginBottom:10,borderBottom:"1px solid #f0e6de",paddingBottom:6},
    pill: {display:"inline-block",padding:"3px 10px",borderRadius:99,background:"#f5ede6",color:"#8b6f5e",fontSize:11,marginRight:5,marginBottom:5},
  };

  if (phase === "upload") return (
    <div style={s.app}>
      <div style={s.hdr}>
        <div style={{fontSize:10,letterSpacing:4,opacity:0.75,marginBottom:3}}>SEMI-PERMANENT MAKEUP</div>
        <div style={{fontSize:18,fontWeight:700}}>눈썹 & 얼굴형 AI 분석</div>
        <div style={{fontSize:11,opacity:0.65,marginTop:3}}>정면 사진 한 장으로 맞춤 눈썹 디자인 추천</div>
      </div>
      <div style={{padding:"20px 16px"}}>
        <div style={s.card}>
          <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
            onClick={()=>fileRef.current.click()}
            style={{border:`2px dashed ${drag?"#c4956a":"#ddd8d0"}`,borderRadius:12,
              padding:imgSrc?12:"36px 20px",cursor:"pointer",background:drag?"#fff9f4":"#faf8f5",
              textAlign:"center",transition:"all 0.2s",marginBottom:14}}>
            {imgSrc
              ? <img src={imgSrc} alt="preview" style={{maxHeight:260,borderRadius:8,maxWidth:"100%",display:"block",margin:"0 auto"}} />
              : <><div style={{fontSize:44,marginBottom:10}}>📸</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#5a4a42",marginBottom:4}}>고객 정면 사진 업로드</div>
                  <div style={{fontSize:12,color:"#b0968a"}}>정면을 바라보는 밝은 사진이 좋아요</div></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
          {error && <div style={{color:"#e07070",fontSize:12,textAlign:"center",marginBottom:10}}>{error}</div>}
          <button onClick={analyze} disabled={!imgFile} style={{
            width:"100%",padding:14,borderRadius:12,border:"none",
            background:imgFile?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#e0d8d0",
            color:"#fff",fontSize:15,fontWeight:700,cursor:imgFile?"pointer":"not-allowed",
            boxShadow:imgFile?"0 4px 16px rgba(196,149,106,0.35)":"none",transition:"all 0.2s"}}>
            ✨ AI 분석 시작
          </button>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:"#b0968a",lineHeight:1.8}}>
          · 분석 결과는 참고용이며 전문가 상담을 병행하세요<br/>
          · 사진은 분석 후 저장되지 않습니다
        </div>
      </div>
    </div>
  );

  if (phase === "loading") return (
    <div style={{...s.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{fontSize:52,marginBottom:20}}>✨</div>
      <div style={{fontSize:16,fontWeight:700,color:"#3d2b1f",marginBottom:8}}>분석 중입니다...</div>
      <div style={{fontSize:13,color:"#9e8a7e",textAlign:"center",lineHeight:1.9}}>
        눈 위치 기반으로<br/>맞춤 눈썹 라인을 계산하고 있어요
      </div>
    </div>
  );

  if (!result) return null;
  const r = result;

  return (
    <div style={s.app}>
      <div style={s.hdr}>
        <div style={{fontSize:10,letterSpacing:4,opacity:0.75,marginBottom:3}}>SEMI-PERMANENT MAKEUP</div>
        <div style={{fontSize:18,fontWeight:700}}>눈썹 시뮬레이션 결과</div>
        <div style={{fontSize:11,opacity:0.65,marginTop:3}}>{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}</div>
      </div>
      <div style={{padding:"16px 14px"}}>

        <div style={s.card}>
          <div style={s.sec}>👁 헤어스트록 눈썹 시뮬레이션</div>
          <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",background:"#f0e8e0",lineHeight:0}}>
            <img ref={imgRef} src={imgSrc} alt="고객"
              onLoad={()=>{initCanvas();setTimeout(render,80);}}
              style={{width:"100%",display:"block",borderRadius:10}} />
            <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",borderRadius:10,pointerEvents:"none"}} />
            <div style={{position:"absolute",top:10,left:10,background:"rgba(196,149,106,0.92)",color:"#fff",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:99}}>
              ✨ {r.recommendedStyles?.[selSt]?.name}
            </div>
          </div>

          <div style={{display:"flex",gap:6,marginTop:12,marginBottom:10}}>
            {r.recommendedStyles?.map((st,idx) => (
              <button key={idx} onClick={()=>setSelSt(idx)} style={{
                flex:1,padding:"8px 4px",borderRadius:9,border:"none",cursor:"pointer",
                background:selSt===idx?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#f5ede6",
                color:selSt===idx?"#fff":"#8b6f5e",fontSize:10,fontWeight:700,transition:"all 0.15s",
                boxShadow:selSt===idx?"0 2px 10px rgba(196,149,106,0.4)":"none"}}>
                {idx===0?"🥇":idx===1?"🥈":"🥉"}<br/>
                <span style={{fontSize:9,lineHeight:1.6}}>{st.name}</span>
              </button>
            ))}
          </div>

          <div style={{background:"#faf8f5",borderRadius:10,padding:"12px 14px"}}>
            {[
              {label:"투명도",min:0.3,max:1,step:0.05,val:alpha,set:setAlpha,fmt:v=>Math.round(v*100)+"%"},
              {label:"두 께", min:0.5,max:2.0,step:0.1,val:thick,set:setThick,fmt:v=>v.toFixed(1)+"x"},
            ].map(({label,min,max,step,val,set,fmt}) => (
              <div key={label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:10,color:"#9e8a7e",width:38,flexShrink:0}}>{label}</span>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e=>set(parseFloat(e.target.value))}
                  style={{flex:1,accentColor:"#c4956a",height:4}} />
                <span style={{fontSize:10,color:"#c4956a",width:32,textAlign:"right",fontWeight:700}}>{fmt(val)}</span>
              </div>
            ))}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:10,color:"#9e8a7e",width:38,flexShrink:0}}>컬 러</span>
              <div style={{display:"flex",gap:7,flex:1}}>
                {Object.entries(colorMap).map(([name,hex]) => (
                  <div key={name} onClick={()=>setColor(hex)} title={name} style={{
                    width:22,height:22,borderRadius:"50%",background:hex,cursor:"pointer",
                    border:color===hex?"2.5px solid #c4956a":"2px solid #eee",
                    boxShadow:color===hex?"0 0 0 1.5px #c4956a":"none",
                    transition:"all 0.15s",flexShrink:0}} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sec}>얼굴형 분석</div>
          <div style={{display:"flex",gap:12}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:"linear-gradient(135deg,#f5ede6,#dfc5a8)",border:"2px solid #c4956a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🔵</div>
            <div>
              <div style={{fontSize:19,fontWeight:800,color:"#8b6f5e",marginBottom:4}}>{r.faceShape}</div>
              <div style={{fontSize:11,color:"#6b5a52",lineHeight:1.7,marginBottom:6}}>{r.faceShapeDetail}</div>
              {r.atmosphere?.map(a=><span key={a} style={s.pill}>{a}</span>)}
            </div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sec}>골격 & 얼굴선</div>
          <div style={{display:"flex"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:"#b09688",marginBottom:6}}>골격</div>
              {[["이마",r.skeleton?.forehead],["광대",r.skeleton?.cheekbone],["턱선",r.skeleton?.jaw]].map(([k,v])=>(
                <div key={k} style={{fontSize:11,marginBottom:5,display:"flex",gap:4}}>
                  <span style={{color:"#c4956a"}}>✓</span><span style={{color:"#9e8a7e"}}>{k}</span>
                  <span style={{fontWeight:700,marginLeft:"auto"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{width:1,background:"#f0e6de",margin:"0 14px"}} />
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:"#b09688",marginBottom:6}}>얼굴선</div>
              {[["턱선",r.faceContour?.jawLine],["비율",r.faceContour?.ratio]].map(([k,v])=>(
                <div key={k} style={{fontSize:11,marginBottom:5,display:"flex",gap:4}}>
                  <span style={{color:"#c4956a"}}>✓</span><span style={{color:"#9e8a7e"}}>{k}</span>
                  <span style={{fontWeight:700,marginLeft:"auto",fontSize:10}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{...s.card,flex:1.5,marginBottom:0}}>
            <div style={s.sec}>현재 눈썹 특징</div>
            {[["형태",r.currentBrow?.shape],["산 각도",r.currentBrow?.archAngle],["색상",r.currentBrow?.color],["두께",r.currentBrow?.thickness],["길이",r.currentBrow?.length]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11}}>
                <span style={{color:"#9e8a7e"}}>· {k}</span>
                <span style={{fontWeight:700,color:"#3d2b1f"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{...s.card,flex:1,marginBottom:0}}>
            <div style={s.sec}>피부톤</div>
            <div style={{display:"flex",gap:5,marginBottom:7}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#c8956a",border:"1px solid #ddd"}} />
              <div style={{width:28,height:28,borderRadius:"50%",background:"#b07848",border:"1px solid #ddd"}} />
            </div>
            <div style={{fontSize:11,color:"#6b5a52"}}>{r.skinToneDisplay}</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={{...s.sec,display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"#c4956a",color:"#fff",fontSize:9,padding:"2px 8px",borderRadius:99,fontWeight:700}}>BEST</span>
            추천 스타일 상세
          </div>
          <div style={{display:"flex",gap:7}}>
            {r.recommendedStyles?.map((st,idx)=>(
              <div key={idx} onClick={()=>setSelSt(idx)} style={{
                flex:1,border:selSt===idx?"2px solid #c4956a":"1px solid #e8ddd5",
                borderRadius:10,padding:"10px 8px",cursor:"pointer",
                background:selSt===idx?"#fffaf5":"#fff",transition:"all 0.15s"}}>
                <div style={{fontSize:9,fontWeight:700,color:idx===0?"#c4956a":"#8b9e7e",background:idx===0?"#fdebd0":"#eef2eb",display:"inline-block",padding:"2px 6px",borderRadius:99,marginBottom:4}}>#{st.tag}</div>
                <div style={{fontSize:11,fontWeight:700,color:"#3d2b1f",marginBottom:5}}>{st.name}</div>
                {[["길이",st.length],["각도",st.angle],["두께",st.thickness],["색감",st.color],["산 위치",st.archPosition],["라운드감",st.roundness]].map(([lb,vl])=>(
                  <div key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                    <span style={{fontSize:9,color:"#9e8a7e"}}>{lb}</span><Dots value={vl} />
                  </div>
                ))}
                <div style={{fontSize:9,color:"#b0968a",marginTop:4}}>{st.hashtag}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={{...s.sec,display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"#e07070",color:"#fff",fontSize:9,padding:"2px 8px",borderRadius:99,fontWeight:700}}>비추천</span>
            피하면 좋은 스타일
          </div>
          <div style={{display:"flex",gap:10}}>
            {r.notRecommended?.map((nr,i)=>(
              <div key={i} style={{flex:1,background:"#fff8f8",border:"1px solid #f5d0d0",borderRadius:10,padding:12}}>
                <div style={{fontSize:16,marginBottom:4}}>❌</div>
                <div style={{fontSize:12,fontWeight:700,color:"#3d2b1f",marginBottom:3}}>{nr.name}</div>
                <div style={{fontSize:10,color:"#c07070",lineHeight:1.5}}>{nr.reason}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sec}>추천 눈썹 컬러</div>
          <div style={{display:"flex",gap:12,marginBottom:10}}>
            {r.recommendedColors?.map((c,i)=>(
              <div key={c} style={{textAlign:"center"}}>
                <div onClick={()=>setColor(colorMap[c]||"#3d2010")} style={{
                  width:36,height:36,borderRadius:"50%",background:colorMap[c]||"#8a7060",
                  border:color===(colorMap[c]||"#3d2010")?"2.5px solid #c4956a":"2px solid transparent",
                  marginBottom:4,cursor:"pointer",
                  boxShadow:color===(colorMap[c]||"#3d2010")?"0 2px 8px rgba(196,149,106,0.45)":"none",
                  transition:"all 0.15s"}} />
                <div style={{fontSize:9,color:"#6b5a52",width:40,lineHeight:1.4}}>{c}</div>
                {i===0&&<div style={{fontSize:9,color:"#c4956a",fontWeight:700}}>✓추천</div>}
              </div>
            ))}
          </div>
          <div style={{padding:"8px 10px",background:"#fff9f4",borderRadius:8,fontSize:11,color:"#8b6f5e"}}>
            💡 컬러 원 클릭 → 시뮬레이션에 즉시 반영돼요
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sec}>보완 포인트</div>
          {r.supplementPoints?.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:7,alignItems:"flex-start"}}>
              <span style={{color:"#c4956a",flexShrink:0,fontSize:11,marginTop:1}}>✦</span>
              <span style={{fontSize:12,color:"#3d2b1f",lineHeight:1.65}}>{p}</span>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <div style={s.sec}>눈썹 3포인트 시술 팁</div>
          {[["① 앞머리",r.browTips?.start],["② 눈썹 산",r.browTips?.arch],["③ 꼬리",r.browTips?.end]].map(([lb,vl])=>(
            <div key={lb} style={{display:"flex",gap:8,marginBottom:9,alignItems:"flex-start"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#c4956a",flexShrink:0,minWidth:44}}>{lb}</span>
              <span style={{fontSize:11,color:"#3d2b1f",lineHeight:1.65}}>{vl}</span>
            </div>
          ))}
        </div>

        <div style={{textAlign:"center",padding:"8px 0 16px",color:"#b09688",fontSize:11,lineHeight:1.9}}>
          💡 시뮬레이션은 참고용이며 실제 시술 결과와 다를 수 있어요
        </div>
        <button onClick={reset} style={{width:"100%",padding:13,borderRadius:12,border:"1px solid #e8ddd5",background:"#fff",color:"#8b6f5e",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          + 새로운 고객 분석하기
        </button>
      </div>
    </div>
  );
}
