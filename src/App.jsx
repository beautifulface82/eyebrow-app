import { useState, useRef, useEffect, useCallback } from "react";

const STYLES = {
  "자연스러운 아치형": { arch:0.38, peakAt:0.63 },
  "각진 아치형":       { arch:0.56, peakAt:0.66 },
  "소프트 세미아치":   { arch:0.44, peakAt:0.63 },
  "평평한 일자형":     { arch:0.06, peakAt:0.55 },
  "부드러운 아치형":   { arch:0.28, peakAt:0.60 },
};

// ── 원래 눈썹 희미하게 ────────────────────────────────────
function fadeOriginalBrow(ctx, eye, iw, ih) {
  const ey1=eye.y1*ih, ey2=eye.y2*ih;
  const ex1=eye.x1*iw, ex2=eye.x2*iw;
  const eH=ey2-ey1, eW=ex2-ex1;
  const cx=(ex1+ex2)/2, cy=ey1-eH*0.85;
  const rx=eW*0.60, ry=eH*0.55;
  const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry));
  grad.addColorStop(0,   "rgba(215,178,148,0.72)");
  grad.addColorStop(0.6, "rgba(215,178,148,0.55)");
  grad.addColorStop(1,   "rgba(215,178,148,0)");
  ctx.save();
  const p=new Path2D(); p.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  ctx.globalAlpha=1; ctx.fillStyle=grad; ctx.filter="blur(3px)";
  ctx.fill(p); ctx.filter="none"; ctx.restore();
}

// ── 눈썹 그리기 (아치 위로, 양끝 수렴) ───────────────────
function drawBrow(ctx, bx1, by1, bx2, by2, styleName, hex, alpha) {
  const cfg = STYLES[styleName] || STYLES["자연스러운 아치형"];
  const W=bx2-bx1, BH=by2-by1;
  const isLeft=(bx1+bx2)/2 < ctx.canvas.width/2;
  const inX =isLeft?bx2:bx1;
  const outX=isLeft?bx1:bx2;
  const pkX =inX+(outX-inX)*cfg.peakAt;

  /* ★ 윗선: 안쪽→산(위로)→꼬리
     inTopY: by2 기준 위로 62% = 아래에서 38% 위
     pkTopY: by1 기준 아래로 (arch 클수록 높이 올라감) → arch 위로 ↑
     outTopY: 꼬리는 살짝 내려옴                             */
  const inTopY  = by2 - BH*0.62;
  const pkTopY  = by1 + BH*(0.38 - cfg.arch*0.30);   // arch 클수록 by1에 가까워짐
  const outTopY = by2 - BH*0.50;

  /* ★ 아랫선: 완만 */
  const inBotY  = by2 - BH*0.18;
  const pkBotY  = by2 - BH*(0.18 + cfg.arch*0.22);
  const outBotY = by2 - BH*0.08;

  // 베지어 샘플 (자연스러운 sin 테이퍼)
  const N=60, pts=[];
  for(let i=0;i<=N;i++){
    const t=i/N, b=1-t;
    const x    = b*b*inX    +2*b*t*pkX    +t*t*outX;
    const topY = b*b*inTopY +2*b*t*pkTopY +t*t*outTopY;
    const botY = b*b*inBotY +2*b*t*pkBotY +t*t*outBotY;
    const tap  = Math.sin(Math.PI*t);           // 0 at ends → 1 at middle
    const mid  = (topY+botY)/2;
    pts.push({ x,
      ty: mid+(topY-mid)*tap,
      by: mid+(botY-mid)*tap });
  }

  const path=new Path2D();
  path.moveTo(pts[0].x,pts[0].ty);
  for(let i=1;i<=N;i++) path.lineTo(pts[i].x,pts[i].ty);
  path.lineTo(pts[N].x,pts[N].by);
  for(let i=N-1;i>=0;i--) path.lineTo(pts[i].x,pts[i].by);
  path.closePath();

  const g0=isLeft?inX:outX, g1=isLeft?outX:inX;
  const gr=ctx.createLinearGradient(g0,0,g1,0);
  gr.addColorStop(0,   "#"+hex+"00");
  gr.addColorStop(0.10,"#"+hex+"cc");
  gr.addColorStop(0.48,"#"+hex+"ff");
  gr.addColorStop(0.88,"#"+hex+"cc");
  gr.addColorStop(1,   "#"+hex+"00");

  ctx.save();
  ctx.globalAlpha=alpha; ctx.fillStyle=gr;
  ctx.filter="blur(2px)"; ctx.fill(path);
  ctx.filter="none"; ctx.restore();
}

// ── 눈 → 눈썹 좌표 ───────────────────────────────────────
function calcBrow(eye,iw,ih,yOff,xOff){
  const ey1=eye.y1*ih,ey2=eye.y2*ih,ex1=eye.x1*iw,ex2=eye.x2*iw;
  const eH=ey2-ey1,eW=ex2-ex1;
  const gap   =eH*(1.05+yOff*0.15);
  const browH =eH*0.58;
  const browBot=ey1-gap;
  return{
    x1: ex1-eW*0.20+xOff,   // 바깥쪽(귀) — 꼬리 길게
    y1: browBot-browH,
    x2: ex2+eW*0.02+xOff,   // 안쪽(코) — 미간 넓게
    y2: browBot,
  };
}

// ──────────────────────────────────────────────────────────
export default function App(){
  const[phase,   setPhase]  =useState("upload");
  const[imgSrc,  setImgSrc] =useState(null);
  const[imgFile, setImgFile]=useState(null);
  const[result,  setResult] =useState(null);
  const[style,   setStyle]  =useState("각진 아치형");
  const[alpha,   setAlpha]  =useState(0.88);
  const[color,   setColor]  =useState("#3d2010");
  const[thick,   setThick]  =useState(1.0);
  const[yOff,    setYOff]   =useState(0);
  const[xOff,    setXOff]   =useState(0);
  const[fadeBrow,setFadeBrow]=useState(true);  // 원래 눈썹 희미하게
  const[error,   setError]  =useState(null);

  const fileRef=useRef(),canvasRef=useRef(),imgRef=useRef();

  const initCanvas=useCallback(()=>{
    const img=imgRef.current,cv=canvasRef.current;
    if(!img||!cv)return;
    cv.width=img.naturalWidth;cv.height=img.naturalHeight;
    cv.getContext("2d").clearRect(0,0,cv.width,cv.height);
  },[]);

  const render=useCallback(()=>{
    const cv=canvasRef.current,img=imgRef.current;
    if(!cv||!img||!result?.eyeCoords)return;
    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    const iw=img.naturalWidth,ih=img.naturalHeight;
    const{leftEye,rightEye}=result.eyeCoords;
    const col=color.replace("#","");
    const px=xOff*iw*0.008;

    const applyThick=b=>({...b,
      y1:b.y1-(b.y2-b.y1)*(thick-1)*0.5,
      y2:b.y2+(b.y2-b.y1)*(thick-1)*0.5});

    const lb=applyThick(calcBrow(leftEye, iw,ih,yOff,px));
    const rb=applyThick(calcBrow(rightEye,iw,ih,yOff,px));

    // 1. 원래 눈썹 희미하게
    if(fadeBrow){
      fadeOriginalBrow(ctx,leftEye, iw,ih);
      fadeOriginalBrow(ctx,rightEye,iw,ih);
    }
    // 2. 가상 눈썹
    drawBrow(ctx,lb.x1,lb.y1,lb.x2,lb.y2,style,col,alpha);
    drawBrow(ctx,rb.x1,rb.y1,rb.x2,rb.y2,style,col,alpha);
  },[result,style,alpha,color,thick,yOff,xOff,fadeBrow]);

  useEffect(()=>{render();},[render]);

  const handleFile=f=>{
    if(!f?.type.startsWith("image/"))return;
    setImgFile(f);setImgSrc(URL.createObjectURL(f));
    setError(null);setResult(null);
  };

  const analyze=async()=>{
    if(!imgFile)return;
    setPhase("loading");
    try{
      const b64=await new Promise((res,rej)=>{
        const r=new FileReader();r.readAsDataURL(imgFile);
        r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;
      });
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json",
          "x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:imgFile.type||"image/jpeg",data:b64}},
            {type:"text",text:`정면 사진 분석 후 JSON만 출력(마크다운 없음).

eyeCoords: 눈(eye)만 측정
- y1=위 눈꺼풀, y2=아래 속눈썹, y2-y1=0.04~0.09
- 이미지 전체 40~58% 위치, x1=눈 안쪽, x2=눈 바깥쪽

{
 "faceShape":"둥근형",
 "faceShapeDetail":"설명",
 "atmosphere":["특징"],
 "skeleton":{"forehead":"중간","cheekbone":"넓음","jaw":"부드러움"},
 "faceContour":{"jawLine":"둥글고 부드러움","ratio":"비슷함"},
 "currentBrow":{"shape":"일자형","archAngle":"낮음","color":"자연스러움","thickness":"두꺼움","length":"표준"},
 "skinTone":"웜톤","skinToneDisplay":"웜 미디엄 톤",
 "eyeCoords":{
   "leftEye": {"x1":0.27,"y1":0.44,"x2":0.46,"y2":0.52},
   "rightEye":{"x1":0.54,"y1":0.44,"x2":0.73,"y2":0.52}
 },
 "recommendedStyle":"각진 아치형",
 "recommendedColors":["다크 브라운","초코 브라운","내추럴 브라운"],
 "supplementPoints":["산 높여 갸름하게","꼬리 길게","앞머리 그라데이션"],
 "notRecommended":["평평한 일자형"]
}`}
          ]}]})
      });
      const data=await resp.json();
      const txt=data.content?.find(b=>b.type==="text")?.text||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      if(parsed.recommendedStyle&&STYLES[parsed.recommendedStyle])setStyle(parsed.recommendedStyle);
      setResult(parsed);setPhase("result");
    }catch(e){setError("분석 오류. 다시 시도해주세요.");setPhase("upload");}
  };

  const reset=()=>{setPhase("upload");setImgSrc(null);setImgFile(null);setResult(null);setYOff(0);setXOff(0);};

  const colorMap={"다크 브라운":"#3d2010","초코 브라운":"#5a2e18","내추럴 브라운":"#7a4a30","애쉬 브라운":"#6b5848","그레이 브라운":"#5a5048","라이트 브라운":"#9a7860"};

  const sc={
    app:{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",background:"#faf8f5",minHeight:"100vh"},
    hdr:{background:"linear-gradient(135deg,#6b4f3e,#c4956a)",padding:"16px 20px",color:"#fff",textAlign:"center"},
    card:{background:"#fff",borderRadius:14,padding:16,marginBottom:12,border:"1px solid #ede4dc",boxShadow:"0 1px 8px rgba(139,111,94,.07)"},
    sec:{fontSize:11,fontWeight:700,color:"#8b6f5e",marginBottom:10,borderBottom:"1px solid #f0e6de",paddingBottom:6},
    pill:{display:"inline-block",padding:"3px 10px",borderRadius:99,background:"#f5ede6",color:"#8b6f5e",fontSize:11,marginRight:5,marginBottom:5},
    row:{display:"flex",alignItems:"center",gap:10,marginBottom:6},
    lbl:{fontSize:10,color:"#9e8a7e",width:52,flexShrink:0},
    val:{fontSize:10,color:"#c4956a",width:36,textAlign:"right",fontWeight:700},
  };

  if(phase==="upload")return(
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
              textAlign:"center",marginBottom:14}}>
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

  if(phase==="loading")return(
    <div style={{...sc.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{fontSize:56,marginBottom:20}}>✨</div>
      <div style={{fontSize:16,fontWeight:700,color:"#3d2b1f",marginBottom:8}}>분석 중...</div>
      <div style={{fontSize:13,color:"#9e8a7e",textAlign:"center",lineHeight:2}}>얼굴형과 눈 위치를 분석하고<br/>맞춤 눈썹을 추천드려요</div>
    </div>
  );

  if(!result)return null;
  const r=result;

  return(
    <div style={sc.app}>
      <div style={sc.hdr}>
        <div style={{fontSize:10,letterSpacing:4,opacity:.75,marginBottom:3}}>SEMI-PERMANENT MAKEUP</div>
        <div style={{fontSize:18,fontWeight:700}}>눈썹 시뮬레이션 결과</div>
        <div style={{fontSize:11,opacity:.65,marginTop:3}}>{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}</div>
      </div>
      <div style={{padding:"16px 14px"}}>

        <div style={sc.card}>
          <div style={sc.sec}>👁 눈썹 시뮬레이션</div>

          {/* 사진 */}
          <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",lineHeight:0,background:"#eee"}}>
            <img ref={imgRef} src={imgSrc} alt="고객"
              onLoad={()=>{initCanvas();setTimeout(render,60);}}
              style={{width:"100%",display:"block",borderRadius:10}}/>
            <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",borderRadius:10,pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:8,left:8,background:"rgba(196,149,106,.92)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99}}>
              ✨ {style}
            </div>
          </div>

          {/* 스타일 탭 */}
          <div style={{marginTop:12,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#8b6f5e",marginBottom:6}}>눈썹 스타일</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.keys(STYLES).map(s=>(
                <button key={s} onClick={()=>setStyle(s)} style={{
                  padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,
                  background:style===s?"linear-gradient(135deg,#8b6f5e,#c4956a)":"#f5ede6",
                  color:style===s?"#fff":"#8b6f5e",transition:"all .15s",
                  boxShadow:style===s?"0 2px 8px rgba(196,149,106,.4)":"none"}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 조절 */}
          <div style={{background:"#faf8f5",borderRadius:10,padding:"12px 14px"}}>

            {/* 원래 눈썹 희미하게 토글 */}
            <div style={{...sc.row,marginBottom:10}}>
              <span style={{...sc.lbl,width:"auto",marginRight:"auto",fontSize:11,fontWeight:600,color:"#5a4a42"}}>
                원래 눈썹 희미하게
              </span>
              <div onClick={()=>setFadeBrow(!fadeBrow)}
                style={{width:44,height:24,borderRadius:12,background:fadeBrow?"#c4956a":"#ddd",
                  cursor:"pointer",position:"relative",transition:"background .2s"}}>
                <div style={{position:"absolute",top:2,left:fadeBrow?22:2,width:20,height:20,
                  borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </div>
            </div>

            {/* 위아래 */}
            <div style={sc.row}>
              <span style={sc.lbl}>위아래</span>
              <input type="range" min={-6} max={6} step={0.5} value={yOff}
                onChange={e=>setYOff(parseFloat(e.target.value))}
                style={{flex:1,accentColor:"#c4956a"}}/>
              <span style={sc.val}>{yOff>0?"+":""}{yOff}</span>
            </div>
            <div style={{fontSize:10,color:"#aaa",marginBottom:6,marginTop:-2}}>낮추기(−) · 높이기(+)</div>

            {/* 좌우 */}
            <div style={sc.row}>
              <span style={sc.lbl}>좌우</span>
              <input type="range" min={-8} max={8} step={0.5} value={xOff}
                onChange={e=>setXOff(parseFloat(e.target.value))}
                style={{flex:1,accentColor:"#c4956a"}}/>
              <span style={sc.val}>{xOff>0?"+":""}{xOff}</span>
            </div>
            <div style={{fontSize:10,color:"#aaa",marginBottom:6,marginTop:-2}}>왼쪽(−) · 오른쪽(+)</div>

            {/* 투명도·두께 */}
            {[
              {label:"투명도",min:.2,max:1,  step:.05,val:alpha,set:setAlpha,fmt:v=>Math.round(v*100)+"%"},
              {label:"두 께", min:.4,max:2.0,step:.1, val:thick,set:setThick,fmt:v=>v.toFixed(1)+"x"},
            ].map(({label,min,max,step,val,set,fmt})=>(
              <div key={label} style={sc.row}>
                <span style={sc.lbl}>{label}</span>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e=>set(parseFloat(e.target.value))}
                  style={{flex:1,accentColor:"#c4956a"}}/>
                <span style={sc.val}>{fmt(val)}</span>
              </div>
            ))}

            {/* 컬러 */}
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

            {/* 초기화 */}
            <button onClick={()=>{setYOff(0);setXOff(0);setThick(1);setAlpha(0.88);}}
              style={{marginTop:8,width:"100%",padding:7,borderRadius:8,border:"1px solid #e8ddd5",
                background:"#fff",color:"#9e8a7e",fontSize:11,cursor:"pointer"}}>
              ↺ 위치·설정 초기화
            </button>
          </div>
        </div>

        {/* 얼굴형 */}
        <div style={sc.card}>
          <div style={sc.sec}>얼굴형 분석</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#f5ede6,#dfc5a8)",
              border:"2px solid #c4956a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🔵</div>
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

        {/* 현재 눈썹 + 피부톤 */}
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{...sc.card,flex:1.5,marginBottom:0}}>
            <div style={sc.sec}>현재 눈썹</div>
            {[["형태",r.currentBrow?.shape],["산각도",r.currentBrow?.archAngle],["색상",r.currentBrow?.color],["두께",r.currentBrow?.thickness],["길이",r.currentBrow?.length]].map(([k,v])=>(
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
              <span key={i} style={{background:"#fff8f8",border:"1px solid #f5d0d0",borderRadius:10,padding:"8px 12px",fontSize:11}}>
                ❌ {typeof nr==="string"?nr:nr.name||""}
              </span>
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
