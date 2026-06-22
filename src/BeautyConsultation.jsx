import { useState, useRef } from "react";

// ── 눈썹 모양 SVG 데이터 ──────────────────────────────
const BROW_SHAPES = {
  "straight":     { path: "M10,28 C30,26 70,26 90,28", label: "일자형" },
  "soft_arch":    { path: "M10,30 C25,24 60,20 90,26", label: "소프트 아치" },
  "medium_arch":  { path: "M10,30 C25,20 60,16 90,26", label: "미디엄 아치" },
  "high_arch":    { path: "M10,32 C22,22 55,12 90,28", label: "하이 아치" },
  "hybrid":       { path: "M10,30 C28,22 58,18 90,27", label: "하이브리드" },
};

// ── 립 모양 SVG ───────────────────────────────────────
const LIP_SHAPES = {
  "natural":   "M50,20 C35,20 20,28 18,35 C16,42 20,50 30,52 C38,54 44,56 50,56 C56,56 62,54 70,52 C80,50 84,42 82,35 C80,28 65,20 50,20 Z M50,20 C44,23 38,24 32,23 M50,20 C56,23 62,24 68,23",
  "volume":    "M50,18 C33,18 16,27 14,36 C12,44 17,52 28,55 C37,57 44,59 50,59 C56,59 63,57 72,55 C83,52 88,44 86,36 C84,27 67,18 50,18 Z M50,18 C43,22 36,23 29,21 M50,18 C57,22 64,23 71,21",
  "defined":   "M50,21 C36,21 21,28 19,35 C17,41 21,49 31,51 C39,53 45,55 50,55 C55,55 61,53 69,51 C79,49 83,41 81,35 C79,28 64,21 50,21 Z M50,21 C44,24 39,25 34,24 M50,21 C56,24 61,25 66,24",
};

// ── 퍼스널컬러 팔레트 ─────────────────────────────────
const SEASON_PALETTES = {
  "spring":  { colors:["#F4C5A0","#E8956A","#F0B8A0","#D4845A","#C4A882","#E8D4B0"], label:"Spring Warm", emoji:"🌸" },
  "summer":  { colors:["#B8C4D8","#8FA8C8","#C4B8D0","#A89CB8","#D0C8DC","#90A8C0"], label:"Summer Cool", emoji:"🌿" },
  "autumn":  { colors:["#C4783C","#8B4E2C","#D4A055","#6B3C24","#B87840","#A06030"], label:"Autumn Warm", emoji:"🍂" },
  "winter":  { colors:["#2C3E6B","#8B1C3C","#1C2850","#C0102A","#3C1C5A","#101830"], label:"Winter Cool", emoji:"❄️" },
};

// ── 눈썹 피그먼트 컬러 ───────────────────────────────
const BROW_PIGMENTS = {
  "ash_brown":     { hex:"#7A6A5A", label:"애쉬 브라운" },
  "neutral_brown": { hex:"#8B6B4A", label:"뉴트럴 브라운" },
  "dark_brown":    { hex:"#3D2010", label:"다크 브라운" },
  "soft_black":    { hex:"#2A2520", label:"소프트 블랙" },
  "warm_brown":    { hex:"#9B6B3A", label:"웜 브라운" },
  "taupe":         { hex:"#8A7868", label:"타우프" },
  "chocolate":     { hex:"#5A2E18", label:"초코 브라운" },
};

// ── 립 피그먼트 컬러 ─────────────────────────────────
const LIP_PIGMENTS = {
  "nude_pink":   { hex:"#E8B4A8", label:"누드 핑크" },
  "rose_pink":   { hex:"#D4688A", label:"로즈 핑크" },
  "dusty_rose":  { hex:"#C48A8A", label:"더스티 로즈" },
  "coral":       { hex:"#E87858", label:"코랄" },
  "peach":       { hex:"#F0A882", label:"피치" },
  "warm_nude":   { hex:"#C89878", label:"웜 누드" },
  "cool_nude":   { hex:"#B89898", label:"쿨 누드" },
  "berry":       { hex:"#883858", label:"베리" },
  "mauve":       { hex:"#A87888", label:"모브" },
};

// ── AI 분석 프롬프트 (JSON 반환) ──────────────────────
const ANALYSIS_PROMPT = `당신은 반영구 시술 전문가입니다. 사진을 분석하고 반드시 아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만 출력하세요.

{
  "face": {
    "shape": "타원형",
    "shapeEn": "oval",
    "ratio": "균형잡힌 비율",
    "forehead": "보통",
    "eyeSpacing": "보통",
    "eyeShape": "아몬드형",
    "noseShape": "보통",
    "lipShape": "도톰한 입술",
    "jawline": "부드러운 곡선",
    "symmetry": "90",
    "balance": "여성적",
    "imageType": ["Elegant","Natural"],
    "summary": "전체 인상 한줄 요약"
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
    "currentThickness": "보통",
    "currentSymmetry": "85",
    "recommendedStyle": "soft_arch",
    "recommendedStyleReason": "눈썹 산을 살려 갸름해 보이게",
    "primaryPigment": "warm_brown",
    "secondaryPigment": "neutral_brown",
    "pigmentReason": "웜톤 피부에 자연스럽게 어우러짐",
    "notRecommended": ["high_arch","straight"],
    "tips": ["앞머리 그라데이션","꼬리 5mm 연장","두께 살짝 줄이기"]
  },
  "lip": {
    "symmetry": "88",
    "volume": "보통",
    "cupidBow": "완만한 형태",
    "corners": "수평",
    "recommendedDesign": "natural",
    "designDirection": "Natural Enhancement",
    "primaryColor": "dusty_rose",
    "secondaryColor": "warm_nude",
    "colorReason": "웜톤 안색을 환하게",
    "avoidColor": "cool_nude",
    "avoidReason": "안색이 칙칙해 보일 수 있음",
    "tips": ["입꼬리 살짝 올리기","큐피드보우 선명하게"]
  },
  "smp": {
    "needed": false,
    "score": "2",
    "hairlineShape": "자연스러운 M자",
    "density": "보통",
    "recommendation": "현재 모발 밀도 양호, SMP 불필요",
    "style": "soft_framing"
  },
  "hair": {
    "primaryColor": "Chocolate Brown",
    "secondaryColor": "Mocha Brown",
    "avoidColor": "Ash Blonde",
    "avoidReason": "쿨톤이라 피부가 떠보임",
    "recommendedLength": "미디엄 (어깨선)",
    "layerStyle": "페이스 프레이밍 레이어",
    "bangStyle": "사이드 뱅",
    "stylingDirection": "웨이비 스타일로 여성스러움 강조",
    "imageDirection": "Elegant Soft"
  },
  "final": {
    "imageDirection": "Elegant Soft",
    "priority1": "눈썹 반영구",
    "priority2": "립 블러쉬",
    "priority3": "퍼스널컬러 진단",
    "stylistComment": "이 고객님은 부드럽고 우아한 이미지가 강점입니다. 소프트 아치형 눈썹과 더스티 로즈 립 컬러로 자연스러운 아름다움을 극대화하는 시술을 추천드립니다."
  }
}`;

// ── SVG 컴포넌트들 ────────────────────────────────────
function BrowSVG({ styleKey, color = "#5A3A20", selected = false }) {
  const shape = BROW_SHAPES[styleKey] || BROW_SHAPES["soft_arch"];
  return (
    <div style={{
      background: selected ? "#fff8f2" : "#faf8f5",
      border: `2px solid ${selected ? "#c4956a" : "#ede4dc"}`,
      borderRadius: 10, padding: "10px 8px", textAlign: "center",
      cursor: "pointer", transition: "all .2s",
      boxShadow: selected ? "0 2px 10px rgba(196,149,106,.3)" : "none"
    }}>
      <svg viewBox="0 0 100 40" width="80" height="32">
        <path d={shape.path} stroke={color} strokeWidth="4.5"
          strokeLinecap="round" fill="none" opacity="0.85"/>
        <path d={shape.path} stroke={color} strokeWidth="7"
          strokeLinecap="round" fill="none" opacity="0.2"/>
      </svg>
      <div style={{ fontSize: 9, color: selected ? "#c4956a" : "#9e8a7e", marginTop: 3, fontWeight: selected ? 700 : 400 }}>
        {shape.label}
      </div>
    </div>
  );
}

function LipSVG({ shapeKey, fillColor = "#E8B4A8" }) {
  const path = LIP_SHAPES[shapeKey] || LIP_SHAPES["natural"];
  return (
    <svg viewBox="0 0 100 75" width="100%" height="70">
      <path d={path} fill={fillColor} opacity="0.85" />
      <path d={path} fill="none" stroke={fillColor} strokeWidth="1.5" opacity="0.6"/>
      {/* 하이라이트 */}
      <ellipse cx="50" cy="32" rx="8" ry="3" fill="white" opacity="0.3"/>
    </svg>
  );
}

function ColorSwatch({ hex, label, size = 36, selected = false, onClick }) {
  return (
    <div onClick={onClick} style={{ textAlign: "center", cursor: onClick ? "pointer" : "default" }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: hex,
        margin: "0 auto 4px", border: selected ? "2.5px solid #c4956a" : "2px solid rgba(0,0,0,.08)",
        boxShadow: selected ? "0 0 0 2px #c4956a" : "0 2px 6px rgba(0,0,0,.12)",
        transition: "all .2s"
      }}/>
      {label && <div style={{ fontSize: 9, color: "#9e8a7e", lineHeight: 1.3, maxWidth: 50 }}>{label}</div>}
    </div>
  );
}

function ScoreBar({ score, max = 5, label }) {
  const pct = (parseInt(score) / max) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: "#9e8a7e" }}>{label}</span>
        <span style={{ fontSize: 10, color: "#c4956a", fontWeight: 700 }}>{score}/{max}</span>
      </div>
      <div style={{ height: 5, background: "#f0e6de", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(to right,#c4956a,#e8b48a)", borderRadius: 3, transition: "width 1s ease" }}/>
      </div>
    </div>
  );
}

function Tag({ children, type = "normal" }) {
  const colors = {
    normal: { bg: "#f5ede6", color: "#8b6f5e", border: "#e8ddd5" },
    best:   { bg: "#fff3e8", color: "#c4956a", border: "#c4956a" },
    avoid:  { bg: "#fff0f0", color: "#c07070", border: "#f0c8c8" },
  };
  const c = colors[type];
  return (
    <span style={{
      fontSize: 10, padding: "3px 10px", borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      display: "inline-block", marginRight: 5, marginBottom: 5, fontWeight: type === "best" ? 700 : 400
    }}>{children}</span>
  );
}

// ── 섹션 카드 래퍼 ────────────────────────────────────
function Card({ title, icon, children, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
      border: "1px solid #ede4dc", boxShadow: "0 1px 8px rgba(139,111,94,.07)"
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#8b6f5e", marginBottom: 12,
        borderBottom: "1px solid #f0e6de", paddingBottom: 8,
        display: "flex", alignItems: "center", gap: 6
      }}>
        <span>{icon}</span> {title}
        {accent && <span style={{ marginLeft: "auto", fontSize: 10, color: "#c4956a", fontWeight: 600 }}>{accent}</span>}
      </div>
      {children}
    </div>
  );
}

// ── 로딩 ─────────────────────────────────────────────
function Loading({ label = "분석 중" }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#3d2b1f", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: "#c4956a",
            animation: `bcP 1.2s ease ${i*0.2}s infinite`
          }}/>
        ))}
      </div>
      <style>{`@keyframes bcP{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}

// ── 결과 화면 ─────────────────────────────────────────
function ResultView({ data, imgSrc, onReset }) {
  const { face, color, eyebrow, lip, smp, hair, final } = data;
  const palette = SEASON_PALETTES[color?.season] || SEASON_PALETTES["autumn"];
  const browColor = BROW_PIGMENTS[eyebrow?.primaryPigment]?.hex || "#7A6A5A";
  const lipColor1 = LIP_PIGMENTS[lip?.primaryColor]?.hex || "#E8B4A8";
  const lipColor2 = LIP_PIGMENTS[lip?.secondaryColor]?.hex || "#C89878";
  const smpScore = parseInt(smp?.score || "2");

  const sc = {
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    label: { fontSize: 9, color: "#b09688", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
    value: { fontSize: 13, fontWeight: 700, color: "#3d2b1f" },
    mini:  { fontSize: 11, color: "#6b5a52", lineHeight: 1.7 },
  };

  return (
    <div style={{ fontFamily:"'Noto Sans KR',sans-serif", background:"#faf8f5", minHeight:"100vh" }}>
      {/* 헤더 */}
      <div style={{ background:"linear-gradient(135deg,#6b4f3e,#c4956a)", padding:"16px 20px", color:"#fff", textAlign:"center" }}>
        <div style={{ fontSize:9, letterSpacing:4, opacity:.7, marginBottom:2 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize:18, fontWeight:700 }}>종합 뷰티 AI 리포트</div>
        <div style={{ fontSize:10, opacity:.65, marginTop:2 }}>{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}</div>
      </div>

      <div style={{ padding:"14px 14px 20px" }}>

        {/* ── 고객 사진 + 요약 ── */}
        <Card title="얼굴형 분석 요약" icon="🔍" accent={face?.imageType?.join(" · ")}>
          <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
            <img src={imgSrc} style={{ width:88, height:110, objectFit:"cover", borderRadius:10, border:"2px solid #e8ddd5", flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#8b6f5e", marginBottom:2 }}>{face?.shape}</div>
              <div style={{ fontSize:10, color:"#b09688", marginBottom:8 }}>{face?.summary}</div>
              <div style={sc.row2}>
                {[
                  ["눈 간격", face?.eyeSpacing],
                  ["눈 모양", face?.eyeShape],
                  ["턱선", face?.jawline],
                  ["밸런스", face?.balance],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={sc.label}>{k}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:8 }}>
                <ScoreBar score={face?.symmetry} max={100} label="좌우 대칭도" />
              </div>
            </div>
          </div>
          <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:4 }}>
            {face?.imageType?.map(t => <Tag key={t} type="best">{t}</Tag>)}
          </div>
        </Card>

        {/* ── 퍼스널 컬러 ── */}
        <Card title="퍼스널 컬러" icon="🎨" accent={palette.label + " " + palette.emoji}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{
              width:52, height:52, borderRadius:"50%",
              background:`linear-gradient(135deg,${palette.colors[0]},${palette.colors[2]})`,
              border:"2px solid #e8ddd5", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22
            }}>{palette.emoji}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"#3d2b1f" }}>{color?.seasonDetail}</div>
              <div style={{ fontSize:11, color:"#9e8a7e" }}>언더톤: <strong style={{color:"#c4956a"}}>{color?.undertone}</strong></div>
            </div>
          </div>
          {/* 팔레트 */}
          <div style={sc.label}>추천 컬러 팔레트</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {palette.colors.map((c,i) => <ColorSwatch key={i} hex={c} size={32}/>)}
          </div>
          {/* 추천 의류 */}
          <div style={sc.label}>추천 의류 컬러</div>
          <div style={{ marginBottom:8 }}>
            {color?.bestClothingColors?.map(c => <Tag key={c} type="best">{c}</Tag>)}
          </div>
          {/* 피해야 할 */}
          <div style={sc.label}>피해야 할 컬러</div>
          <div>{color?.avoidColors?.map(c => <Tag key={c} type="avoid">✕ {c}</Tag>)}</div>
        </Card>

        {/* ── 눈썹 디자인 ── */}
        <Card title="눈썹 디자인" icon="✦">
          {/* 현재 vs 추천 */}
          <div style={sc.row2}>
            <div>
              <div style={sc.label}>현재 눈썹</div>
              <BrowSVG styleKey={
                eyebrow?.currentShape?.includes("일자") ? "straight" :
                eyebrow?.currentShape?.includes("하이") ? "high_arch" : "soft_arch"
              } color="#B0A098"/>
              <div style={{ fontSize:10, color:"#b09688", marginTop:4 }}>대칭도</div>
              <ScoreBar score={eyebrow?.currentSymmetry} max={100} label=""/>
            </div>
            <div>
              <div style={sc.label}>추천 스타일</div>
              <BrowSVG styleKey={eyebrow?.recommendedStyle || "soft_arch"} color={browColor} selected/>
              <div style={{ fontSize:9, color:"#c4956a", marginTop:4, fontWeight:700 }}>✓ 추천</div>
            </div>
          </div>

          {/* 피그먼트 컬러 */}
          <div style={{ marginTop:12 }}>
            <div style={sc.label}>추천 피그먼트 컬러</div>
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              {[eyebrow?.primaryPigment, eyebrow?.secondaryPigment].filter(Boolean).map((key, i) => {
                const p = BROW_PIGMENTS[key];
                return p ? (
                  <div key={key} style={{ textAlign:"center" }}>
                    <div style={{
                      width:42, height:42, borderRadius:"50%", background:p.hex,
                      border: i===0 ? "2.5px solid #c4956a" : "2px solid #e8ddd5",
                      margin:"0 auto 4px",
                      boxShadow: i===0 ? "0 2px 10px rgba(196,149,106,.4)" : "none"
                    }}/>
                    <div style={{ fontSize:9, color:"#6b5a52" }}>{p.label}</div>
                    {i===0 && <div style={{ fontSize:9, color:"#c4956a", fontWeight:700 }}>1순위</div>}
                  </div>
                ) : null;
              })}
              <div style={{ flex:1, fontSize:11, color:"#6b5a52", lineHeight:1.7, paddingLeft:8, borderLeft:"1px solid #f0e6de" }}>
                {eyebrow?.pigmentReason}
              </div>
            </div>
          </div>

          {/* 비추천 */}
          {eyebrow?.notRecommended?.length > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={sc.label}>비추천 스타일</div>
              <div style={{ display:"flex", gap:8 }}>
                {eyebrow.notRecommended.map(k => (
                  <div key={k} style={{ opacity:0.5, filter:"grayscale(60%)" }}>
                    <BrowSVG styleKey={k} color="#999"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 팁 */}
          <div style={{ marginTop:12, background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
            <div style={sc.label}>시술 포인트</div>
            {eyebrow?.tips?.map((t,i) => (
              <div key={i} style={{ fontSize:11, color:"#3d2b1f", marginBottom:4, display:"flex", gap:6 }}>
                <span style={{ color:"#c4956a" }}>✦</span>{t}
              </div>
            ))}
          </div>
        </Card>

        {/* ── 립 블러쉬 ── */}
        <Card title="립 블러쉬 분석" icon="💋">
          <div style={sc.row2}>
            {/* 립 시각화 */}
            <div>
              <div style={sc.label}>추천 컬러 미리보기</div>
              <div style={{ background:"#f9f5f2", borderRadius:10, padding:"8px 4px" }}>
                <LipSVG shapeKey={lip?.recommendedDesign || "natural"} fillColor={lipColor1}/>
              </div>
            </div>
            <div>
              <div style={sc.label}>현재 분석</div>
              <div style={{ marginBottom:6 }}>
                <ScoreBar score={lip?.symmetry} max={100} label="입술 대칭도"/>
              </div>
              <div style={{ fontSize:10, color:"#9e8a7e", marginBottom:3 }}>볼륨</div>
              <div style={{ fontSize:12, fontWeight:600, color:"#3d2b1f", marginBottom:6 }}>{lip?.volume}</div>
              <div style={{ fontSize:10, color:"#9e8a7e", marginBottom:3 }}>큐피드보우</div>
              <div style={{ fontSize:12, fontWeight:600, color:"#3d2b1f", marginBottom:6 }}>{lip?.cupidBow}</div>
              <div style={{ fontSize:10, color:"#9e8a7e", marginBottom:3 }}>입꼬리</div>
              <div style={{ fontSize:12, fontWeight:600, color:"#3d2b1f" }}>{lip?.corners}</div>
            </div>
          </div>

          {/* 컬러 추천 */}
          <div style={{ marginTop:12 }}>
            <div style={sc.label}>추천 립 컬러</div>
            <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{ display:"flex", gap:10 }}>
                {[lip?.primaryColor, lip?.secondaryColor].filter(Boolean).map((key,i) => {
                  const p = LIP_PIGMENTS[key];
                  return p ? (
                    <div key={key} style={{ textAlign:"center" }}>
                      <div style={{
                        width:44, height:44, borderRadius:"50%", background:p.hex,
                        border: i===0?"2.5px solid #c4956a":"2px solid #e8ddd5",
                        margin:"0 auto 4px",
                        boxShadow: i===0?"0 2px 10px rgba(196,149,106,.4)":"none"
                      }}/>
                      <div style={{ fontSize:9, color:"#6b5a52" }}>{p.label}</div>
                      {i===0 && <div style={{ fontSize:9, color:"#c4956a", fontWeight:700 }}>1순위</div>}
                    </div>
                  ) : null;
                })}
              </div>
              <div style={{ flex:1, fontSize:11, color:"#6b5a52", lineHeight:1.7, paddingLeft:10, borderLeft:"1px solid #f0e6de" }}>
                {lip?.colorReason}
              </div>
            </div>
          </div>

          {/* 피해야 할 컬러 */}
          {lip?.avoidColor && LIP_PIGMENTS[lip.avoidColor] && (
            <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10, background:"#fff8f8", borderRadius:10, padding:"8px 12px" }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", flexShrink:0,
                background:LIP_PIGMENTS[lip.avoidColor].hex, border:"2px solid #f0c8c8",
                filter:"grayscale(30%)", opacity:.7
              }}/>
              <div>
                <div style={{ fontSize:9, color:"#c07070", fontWeight:700 }}>✕ 피해야 할 컬러: {LIP_PIGMENTS[lip.avoidColor].label}</div>
                <div style={{ fontSize:10, color:"#9e8a7e" }}>{lip?.avoidReason}</div>
              </div>
            </div>
          )}

          {/* 팁 */}
          <div style={{ marginTop:10, background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
            <div style={sc.label}>시술 포인트</div>
            {lip?.tips?.map((t,i) => (
              <div key={i} style={{ fontSize:11, color:"#3d2b1f", marginBottom:4, display:"flex", gap:6 }}>
                <span style={{ color:"#c4956a" }}>✦</span>{t}
              </div>
            ))}
          </div>
        </Card>

        {/* ── SMP ── */}
        <Card title="SMP 두피 분석" icon="💆" accent={smp?.needed ? "시술 권장" : "시술 불필요"}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
            {/* SMP 점수 */}
            <div style={{
              width:64, height:64, borderRadius:"50%", flexShrink:0,
              background: smpScore >= 4 ? "linear-gradient(135deg,#e87858,#c4956a)"
                        : smpScore >= 2 ? "linear-gradient(135deg,#c4956a,#e8c4a0)"
                        : "linear-gradient(135deg,#c8d8b0,#a8c090)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff"
            }}>
              <div style={{ fontSize:22, fontWeight:800 }}>{smp?.score}</div>
              <div style={{ fontSize:8, opacity:.85 }}>/ 5점</div>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#3d2b1f", marginBottom:4 }}>
                {smp?.needed ? "⚠️ SMP 권장" : "✅ 현재 양호"}
              </div>
              <div style={{ fontSize:11, color:"#6b5a52", lineHeight:1.6 }}>{smp?.recommendation}</div>
            </div>
          </div>
          <div style={sc.row2}>
            {[["헤어라인", smp?.hairlineShape], ["모발 밀도", smp?.density]].map(([k,v]) => (
              <div key={k} style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
                <div style={sc.label}>{k}</div>
                <div style={{ fontSize:12, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 헤어 컬러 & 스타일 ── */}
        <Card title="헤어 컬러 & 스타일" icon="✂️">
          {/* 헤어 컬러 팔레트 */}
          <div style={sc.label}>추천 헤어 컬러</div>
          <div style={{ display:"flex", gap:14, marginBottom:12 }}>
            {[
              { name: hair?.primaryColor, hex: hair?.primaryColor?.includes("Chocolate") ? "#5A2E18"
                : hair?.primaryColor?.includes("Mocha") ? "#8B5E3C"
                : hair?.primaryColor?.includes("Ash") ? "#7A6A5A"
                : hair?.primaryColor?.includes("Espresso") ? "#3C2010"
                : hair?.primaryColor?.includes("Soft Black") ? "#2A2520"
                : hair?.primaryColor?.includes("Natural Black") ? "#1A1510"
                : "#6B4A30", rank:"1순위" },
              { name: hair?.secondaryColor, hex: hair?.secondaryColor?.includes("Chocolate") ? "#5A2E18"
                : hair?.secondaryColor?.includes("Mocha") ? "#8B5E3C"
                : hair?.secondaryColor?.includes("Ash") ? "#7A6A5A"
                : "#8B6B4A", rank:"2순위" },
              { name: hair?.avoidColor, hex:"#C0C0C0", rank:"❌ 피해야함", avoid:true },
            ].map(({ name, hex, rank, avoid }) => (
              <div key={rank} style={{ textAlign:"center", opacity: avoid ? 0.5 : 1 }}>
                <div style={{
                  width:44, height:44, borderRadius:"50%", background: avoid ? "#ddd" : hex,
                  border: avoid ? "2px solid #f0c8c8" : rank==="1순위" ? "2.5px solid #c4956a" : "2px solid #e8ddd5",
                  margin:"0 auto 4px", filter: avoid ? "grayscale(50%)" : "none",
                  boxShadow: rank==="1순위" ? "0 2px 10px rgba(196,149,106,.4)" : "none"
                }}/>
                <div style={{ fontSize:9, color: avoid ? "#c07070" : "#6b5a52", maxWidth:55, lineHeight:1.3 }}>{name}</div>
                <div style={{ fontSize:9, color: avoid ? "#c07070" : "#c4956a", fontWeight:700 }}>{rank}</div>
              </div>
            ))}
          </div>
          {hair?.avoidReason && (
            <div style={{ fontSize:10, color:"#c07070", background:"#fff8f8", padding:"6px 10px", borderRadius:8, marginBottom:10 }}>
              ✕ {hair?.avoidReason}
            </div>
          )}

          <div style={sc.row2}>
            {[
              ["추천 길이", hair?.recommendedLength],
              ["레이어 스타일", hair?.layerStyle],
              ["뱅 스타일", hair?.bangStyle],
              ["이미지 방향", hair?.imageDirection],
            ].map(([k,v]) => (
              <div key={k} style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
                <div style={sc.label}>{k}</div>
                <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:11, color:"#6b5a52", lineHeight:1.7, background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
            <span style={{ color:"#c4956a" }}>✦ </span>{hair?.stylingDirection}
          </div>
        </Card>

        {/* ── 최종 리포트 ── */}
        <Card title="최종 이미지 리포트" icon="⭐">
          {/* 이미지 방향 배지 */}
          <div style={{
            textAlign:"center", padding:"14px 0", marginBottom:14,
            background:"linear-gradient(135deg,rgba(196,149,106,.12),rgba(232,196,184,.08))",
            borderRadius:12, border:"1px solid rgba(196,149,106,.2)"
          }}>
            <div style={{ fontSize:9, letterSpacing:3, color:"#c4956a", marginBottom:4 }}>OVERALL IMAGE DIRECTION</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#3d2b1f" }}>{final?.imageDirection}</div>
          </div>

          {/* 시술 우선순위 */}
          <div style={sc.label}>시술 우선순위</div>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {[final?.priority1, final?.priority2, final?.priority3].filter(Boolean).map((p,i) => (
              <div key={i} style={{
                flex:1, textAlign:"center", padding:"10px 6px",
                background: i===0 ? "linear-gradient(135deg,#8b6f5e,#c4956a)" : "#faf8f5",
                borderRadius:10, border: i===0 ? "none" : "1px solid #ede4dc",
                boxShadow: i===0 ? "0 3px 12px rgba(196,149,106,.35)" : "none"
              }}>
                <div style={{ fontSize:9, color: i===0?"rgba(255,255,255,.7)":"#b09688", marginBottom:3 }}>{i+1}순위</div>
                <div style={{ fontSize:11, fontWeight:700, color: i===0?"#fff":"#3d2b1f" }}>{p}</div>
              </div>
            ))}
          </div>

          {/* 요약 그리드 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[
              ["눈썹 스타일", BROW_SHAPES[eyebrow?.recommendedStyle]?.label],
              ["눈썹 컬러", BROW_PIGMENTS[eyebrow?.primaryPigment]?.label],
              ["립 컬러", LIP_PIGMENTS[lip?.primaryColor]?.label],
              ["립 디자인", lip?.designDirection],
              ["헤어 컬러", hair?.primaryColor],
              ["헤어스타일", hair?.recommendedLength],
            ].map(([k,v]) => (
              <div key={k} style={{ background:"#faf8f5", borderRadius:10, padding:"10px 12px" }}>
                <div style={sc.label}>{k}</div>
                <div style={{ fontSize:11, fontWeight:600, color:"#3d2b1f" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* 스타일리스트 코멘트 */}
          <div style={{
            background:"linear-gradient(135deg,rgba(196,149,106,.08),rgba(232,196,184,.06))",
            border:"1px solid rgba(196,149,106,.2)", borderRadius:12, padding:"14px 16px"
          }}>
            <div style={{ fontSize:9, letterSpacing:2, color:"#c4956a", marginBottom:6, fontWeight:700 }}>✦ Stylist's Note</div>
            <div style={{ fontSize:12.5, lineHeight:1.85, color:"#3d2b1f" }}>{final?.stylistComment}</div>
          </div>
        </Card>

        {/* 리셋 버튼 */}
        <div style={{ textAlign:"center", paddingTop:4, paddingBottom:8, color:"#b09688", fontSize:11 }}>
          💡 분석 결과는 참고용이며 실제 시술 결과와 다를 수 있어요
        </div>
        <button onClick={onReset} style={{
          width:"100%", padding:13, borderRadius:12, border:"1px solid #e8ddd5",
          background:"#fff", color:"#8b6f5e", fontSize:13, fontWeight:700, cursor:"pointer"
        }}>+ 새로운 고객 분석</button>
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
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(imgFile);
        r.onload = () => res(r.result.split(",")[1]);
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
              { type:"image", source:{ type:"base64", media_type: imgFile.type || "image/jpeg", data: b64 } },
              { type:"text", text: ANALYSIS_PROMPT }
            ]
          }]
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const txt = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      setResult(parsed);
      setPhase("result");
    } catch(e) {
      setError("분석 오류가 발생했어요. 다시 시도해주세요.");
      setPhase("upload");
    }
  };

  const reset = () => {
    setPhase("upload"); setImgSrc(null); setImgFile(null);
    setResult(null); setError(null);
  };

  if (phase === "result" && result) {
    return <ResultView data={result} imgSrc={imgSrc} onReset={reset}/>;
  }

  const sc = {
    app: { fontFamily:"'Noto Sans KR',sans-serif", background:"#faf8f5", minHeight:"100vh" },
    hdr: { background:"linear-gradient(135deg,#6b4f3e,#c4956a)", padding:"16px 20px", color:"#fff", textAlign:"center" },
    card: { background:"#fff", borderRadius:14, padding:16, marginBottom:12, border:"1px solid #ede4dc", boxShadow:"0 1px 8px rgba(139,111,94,.07)" },
  };

  return (
    <div style={sc.app}>
      <div style={sc.hdr}>
        <div style={{ fontSize:9, letterSpacing:4, opacity:.75, marginBottom:3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize:19, fontWeight:700 }}>종합 뷰티 AI 컨설팅</div>
        <div style={{ fontSize:11, opacity:.65, marginTop:3 }}>얼굴형 · 눈썹 · 립 · SMP · 퍼스널컬러 · 헤어</div>
      </div>

      {phase === "loading" ? <Loading label="AI가 분석하고 있어요"/> : (
        <div style={{ padding:"20px 16px" }}>
          <div style={sc.card}>
            <div onClick={() => fileRef.current.click()} style={{
              border:`2px dashed ${imgSrc?"#c4956a":"#ddd8d0"}`,
              borderRadius:12, padding: imgSrc ? 10 : "40px 20px",
              cursor:"pointer", background:"#faf8f5", textAlign:"center", marginBottom:14
            }}>
              {imgSrc
                ? <img src={imgSrc} style={{ maxHeight:280, borderRadius:8, maxWidth:"100%", display:"block", margin:"0 auto" }}/>
                : <>
                    <div style={{ fontSize:48, marginBottom:10 }}>📸</div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#5a4a42", marginBottom:4 }}>고객 정면 사진 업로드</div>
                    <div style={{ fontSize:12, color:"#b0968a" }}>자연광 · 정면 · 무표정 권장</div>
                  </>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e => handleFile(e.target.files[0])}/>

            {/* 분석 항목 미리보기 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                ["🔍","얼굴형 분석"],["🎨","퍼스널 컬러"],["✦","눈썹 디자인"],
                ["💋","립 블러쉬"],["💆","SMP 분석"],["✂️","헤어 스타일"],
              ].map(([emoji, label]) => (
                <div key={label} style={{
                  textAlign:"center", padding:"10px 6px", background:"#faf8f5",
                  borderRadius:10, border:"1px solid #ede4dc"
                }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{emoji}</div>
                  <div style={{ fontSize:9, color:"#9e8a7e" }}>{label}</div>
                </div>
              ))}
            </div>

            {error && <div style={{ color:"#e07070", fontSize:12, textAlign:"center", marginBottom:10 }}>{error}</div>}

            <button onClick={analyze} disabled={!imgFile} style={{
              width:"100%", padding:15, borderRadius:12, border:"none",
              background: imgFile ? "linear-gradient(135deg,#8b6f5e,#c4956a)" : "#ddd",
              color:"#fff", fontSize:15, fontWeight:700,
              cursor: imgFile ? "pointer" : "not-allowed",
              boxShadow: imgFile ? "0 4px 16px rgba(196,149,106,.4)" : "none"
            }}>
              ✨ AI 종합 분석 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
