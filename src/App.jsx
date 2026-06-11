import { useState, useRef, useEffect, useCallback } from "react";

const BROW_ARCH = {
  "각진 아치형":     { arch: 0.62, peak: 0.65 },
  "소프트 세미아치": { arch: 0.44, peak: 0.63 },
  "내추럴 아치형":   { arch: 0.32, peak: 0.62 },
  "자연스러운 아치형":{ arch: 0.38, peak: 0.63 },
  "부드러운 아치형": { arch: 0.28, peak: 0.60 },
  "평평한 일자형":   { arch: 0.10, peak: 0.55 },
};

/**
 * 자연스러운 눈썹 털 결 그리기
 * - 안쪽(코): 약 60° (세움)
 * - 중간:     약 35°
 * - 꼬리:     약 10° (거의 누움, 바깥쪽으로)
 */
function drawBrow(ctx, bx1, by1, bx2, by2, style, thick, colorHex, alpha) {
  const cfg = BROW_ARCH[style] || BROW_ARCH["소프트 세미아치"];
  const W   = bx2 - bx1;
  const BH  = by2 - by1;

  // 이미지 기준 왼쪽/오른쪽 판별
  const midX    = (bx1 + bx2) / 2;
  const isLeft  = midX < ctx.canvas.width / 2;

  // 안쪽(코) · 바깥쪽(귀) 방향
  const innerX   = isLeft ? bx2 : bx1;   // 코 방향
  const outerX   = isLeft ? bx1 : bx2;   // 귀 방향
  const outSign  = outerX > innerX ? 1 : -1; // +1=오른쪽, -1=왼쪽

  // 베지어 제어점: 안쪽→산→바깥쪽
  const ctrlX = innerX + (outerX - innerX) * cfg.peak;
  const ctrlY = by1 + BH * (1 - cfg.arch); // 산 높이

  ctx.save();
  ctx.lineCap = "round";

  for (let i = 0; i < 110; i++) {
    const t  = i / 109; // 0 = 안쪽(inner), 1 = 꼬리(outer)

    // 안쪽→꼬리 베지어
    const b  = 1 - t;
    const cx = b*b*innerX + 2*b*t*ctrlX + t*t*outerX;
    const cy = b*b*by2    + 2*b*t*ctrlY + t*t*(by2 - BH*0.12);

    // ── 결 각도: 안쪽 60° → 꼬리 10° ──────────────────
    const deg = 60 - t * 50;          // 60→10 선형 감소
    const rad = deg * Math.PI / 180;

    // 털 치수 (가운데 두껍고 양끝 가늘게)
    const taper  = Math.sin(Math.PI * t);
    const vLen   = BH * (0.85 + 1.8 * taper) * thick;  // 수직 높이
    const hLen   = vLen / Math.tan(rad) * 0.35;          // 수평 이동 (작게)

    // 뿌리 위치 (약간 랜덤)
    const jT   = t + (Math.random() - 0.5) * 0.06;
    const jb   = 1 - Math.max(0, Math.min(1, jT));
    const jt   = Math.max(0, Math.min(1, jT));
    const rx   = jb*jb*innerX + 2*jb*jt*ctrlX + jt*jt*outerX
               + (Math.random() - 0.5) * W * 0.022;
    const ry   = jb*jb*by2 + 2*jb*jt*ctrlY + jt*jt*(by2 - BH*0.12)
               + Math.random() * BH * 0.45;

    // 털 끝 (위로 + 살짝 바깥으로)
    const tx2  = rx + outSign * hLen;
    const ty2  = ry - vLen;

    // 자연스러운 구부러짐
    const bend = (Math.random() - 0.5) * 1.8;
    const cpx  = rx + outSign * hLen * 0.25 + bend;
    const cpy  = ry - vLen * 0.48;

    // 투명도 (더 진하게)
    const op   = (0.60 + 0.40 * taper) * (0.72 + Math.random() * 0.28);

    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(cpx, cpy, tx2, ty2);
    ctx.strokeStyle = "#" + colorHex;
    ctx.lineWidth   = 0.55 + Math.random() * 1.05;
    ctx.globalAlpha = alpha * op;
    ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase]                   = useState("upload");
  const [imgSrc, setImgSrc]                 = useState(null);
  const [imgFile, setImgFile]               = useState(null);
  const [result, setResult]                 = useState(null);
  const [selStyle, setSelStyle]             = useState(0);
  const [alpha, setAlpha]                   = useState(0.92);
  const [color, setColor]                   = useState("#3d2010");
  const [thick, setThick]                   = useState(1.1);
  const [error, setError]                   = useState(null);
  const [drag, setDrag]                     = useState(false);

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
    const cv = canvasRef.current, img = imgRef.current;
    if (!cv || !img || !result?.browCoords) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const st  = result.recommendedStyles?.[selStyle]?.name || "소프트 세미아치";
    const { leftBrow: lb, rightBrow: rb } = result.browCoords;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const toP = c => ({ x1:c.x1*iw, y1:c.y1*ih, x2:c.x2*iw, y2:c.y2*ih });
    const lp = toP(lb), rp = toP(rb);
    const col = color.replace("#","");
    drawBrow(ctx, lp.x1, lp.y1, lp.x2, lp.y2, st, thick, col, alpha);
    drawBrow(ctx, rp.x1, rp.y1, rp.x2, rp.y2, st, thick, col, alpha);
  }, [result, selStyle, alpha, color, thick]);

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
      const b64 = await new Promise((res,rej) => {
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
          messages: [{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type: imgFile.type||"image/jpeg", data:b64 } },
            { type:"text", text:`반영구 시술 전문가로서 정면 사진을 분석하세요. JSON만 출력, 마크다운 없음.

browCoords 측정 방법 (매우 중요):
1. 먼저 양쪽 눈의 중심 y좌표를 찾으세요 (예: eye_center_y = 0.48)
2. 눈썹은 눈 중심보다 약 5~9% 위에 있습니다
   → brow_y_center ≈ eye_center_y - 0.07 (예: 0.48 - 0.07 = 0.41)
3. 눈썹 영역 높이는 약 0.02~0.035 입니다
   → y1 = brow_y_center - 0.012 (예: 0.398)
   → y2 = brow_y_center + 0.012 (예: 0.422)
4. x좌표는 눈썹 털이 실제로 시작/끝나는 지점

검증: y1과 y2가 눈(eye) 위쪽에 있는지, y2-y1이 0.015~0.035인지 확인

{
  "faceShape": "둥근형",
  "faceShapeDetail": "설명",
  "atmosphere": ["특징1"],
  "skeleton": { "forehead":"중간", "cheekbone":"넓음", "jaw":"부드러움" },
  "faceContour": { "jawLine":"둥글고 부드러움", "ratio":"비슷함" },
  "currentBrow": { "shape":"일자형", "archAngle":"낮음", "color":"자연스러움", "thickness":"두꺼움", "length":"표준" },
  "skinTone": "웜톤/어두움",
  "skinToneDisplay": "웜 미디엄 톤",
  "browCoords": {
    "leftBrow":  { "x1":0.26, "y1":0.39, "x2":0.46, "y2":0.42 },
    "rightBrow": { "x1":0.54, "y1":0.39, "x2":0.74, "y2":0.42 }
  },
  "recommendedStyles": [
    { "rank":1, "tag":"베스트",    "name":"각진 아치형",    "length":4,"angle":4,"thickness":3,"color":4,"archPosition":4,"roundness":2,"hashtag":"#갸름한효과" },
    { "rank":2, "tag":"추천",      "name":"소프트 세미아치","length":3,"angle":3,"thickness":3,"color":3,"archPosition":3,"roundness":3,"hashtag":"#자연스러운입체감" },
    { "rank":3, "tag":"자연스러움","name":"내추럴 아치형",  "length":3,"angle":3,"thickness":2,"color":3,"archPosition":3,"roundness":4,"hashtag":"#부드러운인상" }
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
      const text  = data.content?.find(b => b.type==="text")?.text || "";
      const clean = text.replace(/```json|```/g,"").trim();
      setResult(JSON.parse(clean));
      setPhase("result");
    } catch(e) {
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPhase("upload");
    }
  };

  const reset = () => { setPhase("upload"); setImgSrc(null); setImgFile(null); setResult(null); setSelStyle(0); };

  const colorMap = {
    "다크 브라운":"#3d2010","초코 브라운":"#5a2e18","내추럴 브라운":"#7a4a30",
    "애쉬 브라운":"#6b5848","그레이 브라운":"#5a5048","라이트 브라운":"#9a7860",
  };

  const Dots = ({value,max=5}) => <span>{Array.from({length:max},(_,i)=>(
    <span key={i} style={{color:i<value?"#c4956a":"#ddd",fontSize:8,marginRight:1}}>{i<value?"●":"○"}</span>
  ))}</span>;

  const s = {
    app:  {fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",background:"#faf8f5",minHeight:"100vh"},
    hdr:  {background:"linear-gradient(135deg,#6b4f3e,#c4956a)",padding:"16px 20px",color:"#fff",textAlign:"center"},
    card: {background:"#fff",borderRadius:14,padding:16,marginBottom:12,border:"1px solid #ede4dc",boxShadow:"0 1px 8px rgba(139,111,94,0.07)"},
    sec:  {fontSize:11,fontWeight:700,color:"#8b6f5e",marginBottom:10,borderBottom:"1px solid #f0e6de",paddingBottom:6},
    pill: {display:"inline-block",padding:"3px 10px",borderRadius:99,background:"#f5ede6",color:"#8b6f5e",fontSize:11,marginRight:5,marginBottom:5},
  };

  if (phase==="upload") return (
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

  if (phase==="loading") return (
    <div style={{...s.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{fontSize:52,marginBottom:20}}>✨</div>
      <div style={{fontSize:16,fontWeight:700,color:"#3d2b1f",marginBottom:8}}>분석 중입니다...</div>
      <div style={{fontSize:13,color:"#9e8a7e",textAlign:"center",lineHeight:1.9}}>눈썹 위치를 정밀 감지하고<br/>맞춤 눈썹 라인을 계산하고 있어요</div>
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
        {/* 사진 + 오버레이 */}
        <div style={s.card}>
          <div style={s.sec}>👁 눈썹 시뮬레이션</div>
          <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",background:"#f0e8e0",lineHeight:0}}>
            <img ref={imgRef} src={imgSrc} alt="고객"
              onLoad={()=>{initCanvas();setTimeout(render,80);}}
              style={{width:"100%",display:"block",borderRadius:10}} />
            <canvas ref={canvasRef}
              style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",borderRadius:10,pointerEvents:"none"}} />
            <div style={{position:"absolute",top:10,left:10,background:"rgba(196,149,106,0.92)",color:"#fff",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:99}}>
              ✨ {r.recommendedStyles?.[selStyle]?.name}
            </div>
          </div>

          {/* 스타일 탭 */}
          <div style={{display:"flex",gap:6,marginTop:12,marginBottom:10}}>
            {r.recommendedStyles?.map((st,idx)=>(
              <button key={idx} onClick={()=>setSelStyle(idx)} style={{
                flex:1,padding:"8px 4px",borderRadius:9,border:"none",cursor:"pointer",
                background:selStyle===idx?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#f5ede6",
                color:selStyle===idx?"#fff":"#8b6f5e",
                fontSize:10,fontWeight:700,transition:"all 0.15s",
                boxShadow:selStyle===idx?"0 2px 10px rgba(196,149,106,0.4)":"none"}}>
                {idx===0?"🥇":idx===1?"🥈":"🥉"}<br/>
                <span style={{fontSize:9,lineHeight:1.6}}>{st.name}</span>
              </button>
            ))}
          </div>

          {/* 슬라이더 */}
          <div style={{background:"#faf8f5",borderRadius:10,padding:"12px 14px"}}>
            {[
              {label:"투명도",min:0.3,max:1,step:0.05,val:alpha,set:setAlpha,fmt:v=>Math.round(v*100)+"%"},
              {label:"두 께",min:0.5,max:2.0,step:0.1,val:thick,set:setThick,fmt:v=>v.toFixed(1)+"x"},
            ].map(({label,min,max,step,val,set,fmt})=>(
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
                {Object.entries(colorMap).map(([name,hex])=>(
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

        {/* 얼굴형 */}
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

        {/* 골격 */}
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

        {/* 현재 눈썹 + 피부톤 */}
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

        {/* 추천 스타일 */}
        <div style={s.card}>
          <div style={{...s.sec,display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"#c4956a",color:"#fff",fontSize:9,padding:"2px 8px",borderRadius:99,fontWeight:700}}>BEST</span>
            추천 스타일 상세
          </div>
          <div style={{display:"flex",gap:7}}>
            {r.recommendedStyles?.map((st,idx)=>(
              <div key={idx} onClick={()=>setSelStyle(idx)} style={{
                flex:1,border:selStyle===idx?"2px solid #c4956a":"1px solid #e8ddd5",
                borderRadius:10,padding:"10px 8px",cursor:"pointer",
                background:selStyle===idx?"#fffaf5":"#fff",transition:"all 0.15s"}}>
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

        {/* 비추천 */}
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

        {/* 추천 컬러 */}
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

        {/* 보완 포인트 */}
        <div style={s.card}>
          <div style={s.sec}>보완 포인트</div>
          {r.supplementPoints?.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:7,alignItems:"flex-start"}}>
              <span style={{color:"#c4956a",flexShrink:0,fontSize:11,marginTop:1}}>✦</span>
              <span style={{fontSize:12,color:"#3d2b1f",lineHeight:1.65}}>{p}</span>
            </div>
          ))}
        </div>

        {/* 시술 팁 */}
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
