import { useState, useRef, useEffect, useCallback } from "react";

// ── 눈썹 스타일 ────────────────────────────────────────────
const STYLES = {
  "자연스러운 아치형": { arch:0.38, peakAt:0.63 },
  "각진 아치형":       { arch:0.58, peakAt:0.66 },
  "소프트 세미아치":   { arch:0.44, peakAt:0.63 },
  "평평한 일자형":     { arch:0.08, peakAt:0.55 },
  "부드러운 아치형":   { arch:0.28, peakAt:0.60 },
};

// ── 눈썹 그리기 (아치 위로, 베지어 샘플링) ─────────────────
function drawBrow(ctx, x1, y1, x2, y2, styleName, hexColor, alpha) {
  const cfg = STYLES[styleName] || STYLES["자연스러운 아치형"];
  const W = x2 - x1, H = y2 - y1;
  const isLeft = (x1 + x2) / 2 < ctx.canvas.width / 2;

  // 코쪽(inner) / 귀쪽(outer)
  const inX  = isLeft ? x2 : x1;
  const outX = isLeft ? x1 : x2;
  const pkX  = inX + (outX - inX) * cfg.peakAt;

  // ★ 핵심: 아치가 위로 향하도록
  // inCY / outCY = 눈썹 아랫부분(y2에 가깝게)
  // pkCY = 눈썹 윗부분(y1에 가깝게, 즉 작은 y값)
  const inCY  = y2 - H * 0.25;
  const outCY = y2 - H * 0.30;
  const pkCY  = y2 - H * (0.25 + cfg.arch * 0.90); // 위로 올라감 (y 작아짐)

  const N = 60;
  const topPts = [], botPts = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N, b = 1 - t;
    // 2차 베지어: inner → peak → outer
    const cx = b*b*inX  + 2*b*t*pkX  + t*t*outX;
    const cy = b*b*inCY + 2*b*t*pkCY + t*t*outCY;
    // 두께: 양끝 가늘고 가운데 두껍게
    const taper = Math.sin(Math.PI * t);
    const hH = H * (0.20 + 0.28 * taper);
    topPts.push([cx, cy - hH]);
    botPts.push([cx, cy + hH]);
  }

  const path = new Path2D();
  path.moveTo(...topPts[0]);
  for (let i = 1; i <= N; i++) path.lineTo(...topPts[i]);
  for (let i = N; i >= 0; i--) path.lineTo(...botPts[i]);
  path.closePath();

  // 그라데이션 (안쪽·꼬리 옅게, 가운데 진하게)
  const g0 = isLeft ? inX : outX;
  const g1 = isLeft ? outX : inX;
  const gr = ctx.createLinearGradient(g0, 0, g1, 0);
  gr.addColorStop(0.00, "#"+hexColor+"00");
  gr.addColorStop(0.10, "#"+hexColor+"cc");
  gr.addColorStop(0.45, "#"+hexColor+"ff");
  gr.addColorStop(0.85, "#"+hexColor+"bb");
  gr.addColorStop(1.00, "#"+hexColor+"00");

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gr;
  ctx.filter = "blur(2.2px)";
  ctx.fill(path);
  ctx.filter = "none";
  ctx.restore();
}

// ── 눈 → 눈썹 좌표 변환 ────────────────────────────────────
function calcBrow(eye, iw, ih, yOff) {
  const ey1=eye.y1*ih, ey2=eye.y2*ih, ex1=eye.x1*iw, ex2=eye.x2*iw;
  const eH=ey2-ey1, eW=ex2-ex1;
  const gap    = eH * (1.05 + yOff * 0.15);
  const browH  = eH * 0.55;
  const browBot = ey1 - gap;
  return { x1:ex1-eW*0.12, y1:browBot-browH, x2:ex2+eW*0.20, y2:browBot };
}

// ── 미간 기준 좌우 대칭 보정 ────────────────────────────────
function centerBrows(lb, rb, eyes, iw) {
  // 미간 중심 = 두 눈의 안쪽 코너 중간
  const leftInner  = eyes.leftEye.x2  * iw;
  const rightInner = eyes.rightEye.x1 * iw;
  const faceCenter = (leftInner + rightInner) / 2;

  // 현재 두 눈썹 안쪽 끝
  // leftBrow inner = lb.x2 (isLeft이면 x2가 코쪽)
  // rightBrow inner = rb.x1
  const curCenter = (lb.x2 + rb.x1) / 2;
  const shift = faceCenter - curCenter;

  return {
    lb: { ...lb, x1: lb.x1 + shift, x2: lb.x2 + shift },
    rb: { ...rb, x1: rb.x1 + shift, x2: rb.x2 + shift },
  };
}

// ─────────────────────────────────────────────────────────────
export default function App() {
  const [phase,   setPhase]   = useState("upload");
  const [imgSrc,  setImgSrc]  = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [result,  setResult]  = useState(null);
  const [style,   setStyle]   = useState("자연스러운 아치형");
  const [alpha,   setAlpha]   = useState(0.85);
  const [color,   setColor]   = useState("#4a2c18");
  const [thick,   setThick]   = useState(1.0);
  const [yOff,    setYOff]    = useState(0);
  const [error,   setError]   = useState(null);

  const fileRef   = useRef();
  const canvasRef = useRef();
  const imgRef    = useRef();

  const initCanvas = useCallback(() => {
    const img=imgRef.current, cv=canvasRef.current;
    if(!img||!cv) return;
    cv.width=img.naturalWidth; cv.height=img.naturalHeight;
    cv.getContext("2d").clearRect(0,0,cv.width,cv.height);
  },[]);

  const render = useCallback(() => {
    const cv=canvasRef.current, img=imgRef.current;
    if(!cv||!img||!result?.eyeCoords) return;
    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    const iw=img.naturalWidth, ih=img.naturalHeight;
    const {leftEye, rightEye} = result.eyeCoords;
    const col = color.replace("#","");

    // 눈썹 좌표 계산
    let lb = calcBrow(leftEye,  iw, ih, yOff);
    let rb = calcBrow(rightEye, iw, ih, yOff);

    // ★ 미간 기준 좌우 정렬
    const centered = centerBrows(lb, rb, result.eyeCoords, iw);
    lb = centered.lb; rb = centered.rb;

    // 두께 보정
    const applyThick = b => ({
      ...b,
      y1: b.y1 - (b.y2-b.y1)*(thick-1)*0.5,
      y2: b.y2 + (b.y2-b.y1)*(thick-1)*0.5,
    });

    drawBrow(ctx, ...Object.values(applyThick(lb)), style, col, alpha);
    drawBrow(ctx, ...Object.values(applyThick(rb)), style, col, alpha);
  },[result, style, alpha, color, thick, yOff]);

  useEffect(()=>{ render(); },[render]);

  const handleFile = f => {
    if(!f?.type.startsWith("image/")) return;
    setImgFile(f); setImgSrc(URL.createObjectURL(f));
    setError(null); setResult(null);
  };

  const analyze = async () => {
    if(!imgFile) return;
    setPhase("loading");
    try {
      const b64 = await new Promise((res,rej)=>{
        const r=new FileReader(); r.readAsDataURL(imgFile);
        r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej;
      });
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json",
          "x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:imgFile.type||"image/jpeg",data:b64}},
            {type:"text",text:`정면 사진 분석 후 JSON만 출력 (마크다운 없음).

eyeCoords — 반드시 눈(eye) 자체 위치:
- y1=위 눈꺼풀, y2=아래 눈꺼풀, y2-y1=0.04~0.09
- 이미지 전체 40~58% 위치
- x1=눈 안쪽, x2=눈 바깥쪽

{
 "faceShape":"둥근형",
 "faceShapeDetail":"볼살이 풍성하고 가로세로 비율이 비슷한 둥근형입니다.",
 "atmosphere":["부드럽고 친근한 인상"],
 "skeleton":{"forehead":"중간","cheekbone":"넓음","jaw":"부드러움"},
 "faceContour":{"jawLine":"둥글고 부드러움","ratio":"비슷함"},
 "currentBrow":{"shape":"일자형","archAngle":"낮음","color":"자연스러움","thickness":"두꺼움","length":"표준"},
 "skinTone":"웜톤/어두움","skinToneDisplay":"웜 미디엄 톤",
 "eyeCoords":{
   "leftEye": {"x1":0.27,"y1":0.44,"x2":0.46,"y2":0.52},
   "rightEye":{"x1":0.54,"y1":0.44,"x2":0.73,"y2":0.52}
 },
 "recommendedStyle":"자연스러운 아치형",
 "recommendedColors":["다크 브라운","초코 브라운","내추럴 브라운"],
 "supplementPoints":["눈썹 산을 살짝 올려 갸름한 효과","꼬리를 길게 빼서 세로 비율 보완","앞머리 그라데이션으로 자연스럽게"],
 "notRecommended":["평평한 일자형","과한 각진형"]
}`}
          ]}]})
      });
      const data=await resp.json();
      const txt=data.content?.find(b=>b.type==="text")?.text||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      if(parsed.recommendedStyle&&STYLES[parsed.recommendedStyle]) setStyle(parsed.recommendedStyle);
      setResult(parsed); setPhase("result");
    } catch(e){
      setError("분석 오류. 다시 시도해주세요."); setPhase("upload");
    }
  };

  const reset=()=>{ setPhase("upload");setImgSrc(null);setImgFile(null);setResult(null);setYOff(0); };

  const colorMap={
    "다크 브라운":"#3d2010","초코 브라운":"#5a2e18","내추럴 브라운":"#7a4a30",
    "애쉬 브라운":"#6b5848","그레이 브라운":"#5a5048","라이트 브라운":"#9a7860",
  };

  const sc={
    app:{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",background:"#faf8f5",minHeight:"100vh"},
    hdr:{background:"linear-gradient(135deg,#6b4f3e,#c4956a)",padding:"16px 20px",color:"#fff",textAlign:"center"},
    card:{background:"#fff",borderRadius:14,padding:16,marginBottom:12,border:"1px solid #ede4dc",boxShadow:"0 1px 8px rgba(139,111,94,0.07)"},
    sec:{fontSize:11,fontWeight:700,color:"#8b6f5e",marginBottom:10,borderBottom:"1px solid #f0e6de",paddingBottom:6},
    pill:{display:"inline-block",padding:"3px 10px",borderRadius:99,background:"#f5ede6",color:"#8b6f5e",fontSize:11,marginRight:5,marginBottom:5},
    row:{display:"flex",alignItems:"center",gap:10,marginBottom:8},
    lbl:{fontSize:10,color:"#9e8a7e",width:48,flexShrink:0},
    val:{fontSize:10,color:"#c4956a",width:36,textAlign:"right",fontWeight:700},
  };

  if(phase==="upload") return (
    <div style={sc.app}>
      <div style={sc.hdr}>
        <div style={{fontSize:10,letterSpacing:4,opacity:.75,marginBottom:3}}>SEMI-PERMANENT MAKEUP</div>
        <div style={{fontSize:19,fontWeight:700}}>눈썹 & 얼굴형 AI 분석</div>
        <div style={{fontSize:11,opacity:.65,marginTop:3}}>정면 사진으로 맞춤 눈썹 시뮬레이션</div>
      </div>
      <div style={{padding:"20px 16px"}}>
        <div style={sc.card}>
          <div onClick={()=>fileRef.current.click()}
            style={{border:`2px dashed ${imgSrc?"#c4956a":"#ddd8d0"}`,borderRadius:12,
              padding:imgSrc?10:"40px 20px",cursor:"pointer",background:"#faf8f5",
              textAlign:"center",transition:"all .2s",marginBottom:14}}>
            {imgSrc
              ?<img src={imgSrc} style={{maxHeight:280,borderRadius:8,maxWidth:"100%",display:"block",margin:"0 auto"}}/>
              :<><div style={{fontSize:48,marginBottom:10}}>📸</div>
                 <div style={{fontSize:14,fontWeight:600,color:"#5a4a42",marginBottom:4}}>고객 정면 사진 업로드</div>
                 <div style={{fontSize:12,color:"#b0968a"}}>클릭하여 사진 선택</div></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          {error&&<div style={{color:"#e07070",fontSize:12,textAlign:"center",marginBottom:10}}>{error}</div>}
          <button onClick={analyze} disabled={!imgFile} style={{
            width:"100%",padding:15,borderRadius:12,border:"none",
            background:imgFile?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#ddd",
            color:"#fff",fontSize:15,fontWeight:700,cursor:imgFile?"pointer":"not-allowed",
            boxShadow:imgFile?"0 4px 16px rgba(196,149,106,.4)":"none"}}>
            ✨ AI 눈썹 분석 시작
          </button>
        </div>
      </div>
    </div>
  );

  if(phase==="loading") return (
    <div style={{...sc.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{fontSize:56,marginBottom:20}}>✨</div>
      <div style={{fontSize:16,fontWeight:700,color:"#3d2b1f",marginBottom:8}}>분석 중...</div>
      <div style={{fontSize:13,color:"#9e8a7e",textAlign:"center",lineHeight:2}}>얼굴형과 눈 위치를 분석하고<br/>맞춤 눈썹을 추천드려요</div>
    </div>
  );

  if(!result) return null;
  const r=result;

  return (
    <div style={sc.app}>
      <div style={sc.hdr}>
        <div style={{fontSize:10,letterSpacing:4,opacity:.75,marginBottom:3}}>SEMI-PERMANENT MAKEUP</div>
        <div style={{fontSize:18,fontWeight:700}}>눈썹 시뮬레이션 결과</div>
        <div style={{fontSize:11,opacity:.65,marginTop:3}}>{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}</div>
      </div>
      <div style={{padding:"16px 14px"}}>

        <div style={sc.card}>
          <div style={sc.sec}>👁 눈썹 시뮬레이션</div>
          <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",lineHeight:0,background:"#eee"}}>
            <img ref={imgRef} src={imgSrc} alt="고객"
              onLoad={()=>{initCanvas();setTimeout(render,60);}}
              style={{width:"100%",display:"block",borderRadius:10}}/>
            <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",borderRadius:10,pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:8,left:8,background:"rgba(196,149,106,.92)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99}}>
              ✨ {style}
            </div>
          </div>

          {/* 스타일 선택 */}
          <div style={{marginTop:12,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#8b6f5e",marginBottom:6}}>눈썹 스타일</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.keys(STYLES).map(s=>(
                <button key={s} onClick={()=>setStyle(s)} style={{
                  padding:"6px 10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,
                  background:style===s?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#f5ede6",
                  color:style===s?"#fff":"#8b6f5e",
                  boxShadow:style===s?"0 2px 8px rgba(196,149,106,.4)":"none",transition:"all .15s"}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 조절 슬라이더 */}
          <div style={{background:"#faf8f5",borderRadius:10,padding:"12px 14px"}}>
            <div style={sc.row}>
              <span style={sc.lbl}>눈썹위치</span>
              <input type="range" min={-6} max={6} step={0.5} value={yOff}
                onChange={e=>setYOff(parseFloat(e.target.value))}
                style={{flex:1,accentColor:"#c4956a"}}/>
              <span style={sc.val}>{yOff>0?"+":""}{yOff}</span>
            </div>
            <div style={{fontSize:10,color:"#b09688",marginBottom:10,marginTop:-4}}>
              ↑ 눈썹이 낮으면 마이너스(-), 높으면 플러스(+)
            </div>
            {[
              {label:"투명도",min:.2,max:1,step:.05,val:alpha,set:setAlpha,fmt:v=>Math.round(v*100)+"%"},
              {label:"두 께", min:.4,max:2, step:.1, val:thick,set:setThick,fmt:v=>v.toFixed(1)+"x"},
            ].map(({label,min,max,step,val,set,fmt})=>(
              <div key={label} style={sc.row}>
                <span style={sc.lbl}>{label}</span>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e=>set(parseFloat(e.target.value))}
                  style={{flex:1,accentColor:"#c4956a"}}/>
                <span style={sc.val}>{fmt(val)}</span>
              </div>
            ))}
            <div style={sc.row}>
              <span style={sc.lbl}>컬 러</span>
              <div style={{display:"flex",gap:7,flex:1,flexWrap:"wrap"}}>
                {Object.entries(colorMap).map(([name,hex])=>(
                  <div key={name} onClick={()=>setColor(hex)} title={name} style={{
                    width:24,height:24,borderRadius:"50%",background:hex,cursor:"pointer",
                    border:color===hex?"2.5px solid #c4956a":"2px solid #eee",
                    boxShadow:color===hex?"0 0 0 1.5px #c4956a":"none",flexShrink:0}}/>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 얼굴형 */}
        <div style={sc.card}>
          <div style={sc.sec}>얼굴형 분석</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#f5ede6,#dfc5a8)",border:"2px solid #c4956a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🔵</div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"#8b6f5e",marginBottom:4}}>{r.faceShape}</div>
              <div style={{fontSize:11,color:"#6b5a52",lineHeight:1.7,marginBottom:6}}>{r.faceShapeDetail}</div>
              {r.atmosphere?.map(a=><span key={a} style={sc.pill}>{a}</span>)}
            </div>
          </div>
        </div>

        {/* 골격 */}
        <div style={sc.card}>
          <div style={sc.sec}>골격 & 얼굴선</div>
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
            <div style={{width:1,background:"#f0e6de",margin:"0 14px"}}/>
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

        {/* 현재눈썹 + 피부 */}
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{...sc.card,flex:1.5,marginBottom:0}}>
            <div style={sc.sec}>현재 눈썹</div>
            {[["형태",r.currentBrow?.shape],["산 각도",r.currentBrow?.archAngle],["색상",r.currentBrow?.color],["두께",r.currentBrow?.thickness],["길이",r.currentBrow?.length]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11}}>
                <span style={{color:"#9e8a7e"}}>· {k}</span>
                <span style={{fontWeight:700,color:"#3d2b1f"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{...sc.card,flex:1,marginBottom:0}}>
            <div style={sc.sec}>피부톤</div>
            <div style={{display:"flex",gap:5,marginBottom:7}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#c8956a",border:"1px solid #ddd"}}/>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#b07848",border:"1px solid #ddd"}}/>
            </div>
            <div style={{fontSize:11,color:"#6b5a52"}}>{r.skinToneDisplay}</div>
          </div>
        </div>

        {/* 추천 컬러 */}
        <div style={sc.card}>
          <div style={sc.sec}>추천 눈썹 컬러</div>
          <div style={{display:"flex",gap:14}}>
            {r.recommendedColors?.map((c,i)=>(
              <div key={c} style={{textAlign:"center"}}>
                <div onClick={()=>setColor(colorMap[c]||"#3d2010")} style={{
                  width:38,height:38,borderRadius:"50%",background:colorMap[c]||"#8a7060",
                  border:color===(colorMap[c]||"#3d2010")?"2.5px solid #c4956a":"2px solid transparent",
                  marginBottom:4,cursor:"pointer",
                  boxShadow:color===(colorMap[c]||"#3d2010")?"0 2px 8px rgba(196,149,106,.45)":"none"}}/>
                <div style={{fontSize:9,color:"#6b5a52",width:42,lineHeight:1.4}}>{c}</div>
                {i===0&&<div style={{fontSize:9,color:"#c4956a",fontWeight:700}}>✓추천</div>}
              </div>
            ))}
          </div>
        </div>

        {/* 보완 포인트 */}
        <div style={sc.card}>
          <div style={sc.sec}>보완 포인트</div>
          {r.supplementPoints?.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:7,alignItems:"flex-start"}}>
              <span style={{color:"#c4956a",flexShrink:0,fontSize:12}}>✦</span>
              <span style={{fontSize:12,color:"#3d2b1f",lineHeight:1.6}}>{p}</span>
            </div>
          ))}
        </div>

        {/* 비추천 */}
        <div style={sc.card}>
          <div style={{...sc.sec,display:"flex",alignItems:"center",gap:7}}>
            <span style={{background:"#e07070",color:"#fff",fontSize:9,padding:"2px 8px",borderRadius:99,fontWeight:700}}>비추천</span>
            피하면 좋은 스타일
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {r.notRecommended?.map((nr,i)=>(
              <div key={i} style={{background:"#fff8f8",border:"1px solid #f5d0d0",borderRadius:10,padding:"8px 12px",fontSize:11}}>
                ❌ {typeof nr==="string"?nr:nr.name||nr}
              </div>
            ))}
          </div>
        </div>

        <div style={{textAlign:"center",padding:"8px 0 16px",color:"#b09688",fontSize:11,lineHeight:2}}>
          💡 시뮬레이션은 참고용이며 실제 시술 결과와 다를 수 있어요
        </div>
        <button onClick={reset} style={{width:"100%",padding:13,borderRadius:12,border:"1px solid #e8ddd5",background:"#fff",color:"#8b6f5e",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          + 새로운 고객 분석
        </button>
      </div>
    </div>
  );
}
