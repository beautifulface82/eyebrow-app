import { useState, useRef } from "react";

// ── 섹션 정의 ──────────────────────────────────────────
const SECTIONS = [
  { id: 0, emoji: "🔍", title: "얼굴형 분석",       sub: "FACIAL ANALYSIS" },
  { id: 1, emoji: "🎨", title: "퍼스널 컬러",       sub: "PERSONAL COLOR" },
  { id: 2, emoji: "✦",  title: "눈썹 디자인",       sub: "EYEBROW DESIGN" },
  { id: 3, emoji: "💋", title: "립 블러쉬 분석",    sub: "LIP BLUSH ANALYSIS" },
  { id: 4, emoji: "💆", title: "SMP 분석",           sub: "SCALP MICROPIGMENTATION" },
  { id: 5, emoji: "✂️", title: "헤어 컬러 & 스타일", sub: "HAIR COLOR + HAIRSTYLE" },
  { id: 6, emoji: "⭐", title: "최종 이미지 리포트", sub: "FINAL IMAGE REPORT" },
];

const PROMPTS = [
`당신은 시니어 얼굴형 분석 전문가입니다. 아래 사진을 보고 한국어로 전문적인 얼굴 분석을 작성해주세요.

다음 항목을 분석하세요:
• 얼굴형 (oval/round/square/heart/diamond/oblong 중 한국어로)
• 얼굴 비율 (상/중/하안부)
• 이마 넓이
• 눈썹뼈 구조
• 눈 간격 (넓음/보통/좁음)
• 눈 모양
• 코 형태
• 입술 형태
• 턱선 & 턱 모양
• 좌우 대칭도
• 남성적/여성적 균형

마지막에 전체 이미지 분류를 하세요:
Soft / Elegant / Youthful / Professional / Strong / Luxurious / Natural / Trendy 중 2~3개 선택 + 이유

소제목을 명확하게 구분해서 작성하세요.`,

`당신은 전문 퍼스널컬러 분석가입니다. 사진을 보고 한국어로 분석하세요.

1. 언더톤 판정: Warm / Cool / Neutral + 근거
2. 계절 타입: Spring / Summer / Autumn / Winter + 세부 타입
3. 컬러 추천표:
   【추천 의류 컬러】색상명 + 설명
   【추천 눈썹 피그먼트】톤 이름 + 이유
   【추천 립 컬러】색조 + 이유
   【어울리는 헤어 컬러】톤 이름들
   【피해야 할 컬러】색상 + 이유
4. 시술 적용 팁`,

`당신은 반영구 눈썹 전문 아티스트입니다. 사진을 보고 한국어로 상세하게 분석하세요.

1. 【현재 눈썹 분석】길이/두께/꼬리방향/대칭
2. 【추천 눈썹 스타일】Straight/Soft Arch/Medium Arch/High Arch/Hybrid + 이유
3. 【세부 디자인 가이드】모양/두께/길이/아치높이/시작점/꼬리위치
4. 【추천 피그먼트】1순위/2순위/믹스비율 + 선택이유
5. 【눈썹 매핑 가이드】이상적 위치, 대칭 가이드, 살릴 특징/보완할 특징
6. 【비추천 스타일】어울리지 않는 스타일 + 이유`,

`당신은 립 블러쉬 전문 아티스트입니다. 사진을 보고 한국어로 분석하세요.

1. 【현재 입술 분석】대칭/볼륨/큐피드보우/버밀리온보더/입꼬리방향
2. 【추천 시술 방향】Natural Enhancement/Definition/Volume/Color Correction + 이유
3. 【추천 피그먼트 컬러】1순위+이유, 2순위+이유, 믹스 제안
   (Nude Pink/Rose Pink/Dusty Rose/Coral/Peach/Warm Nude/Cool Nude/Berry/Mauve 중에서)
4. 【컬러 효과 분석】✓안색 밝혀주는 컬러 / ✓건강해 보이는 컬러 / ✗나이들어 보이는 컬러
5. 【시술 디테일 팁】형태 교정 방향, 주의사항`,

`당신은 SMP(두피 문신) 전문가입니다. 사진을 보고 한국어로 분석하세요.

1. 【헤어라인 & 모발 현황】헤어라인 형태/이마 비율/모발 밀도/탈모정도
2. 【SMP 필요도】★ 척도(5점) + 이유 (필요 없으면 솔직하게)
3. 【추천 시술 방향】헤어라인 디자인/밀도 보완/크라운/관자놀이 중 해당항목
4. 【헤어라인 스타일】여성: Soft Framing/Density Enhancement/Part-line/M-shape 중 추천
5. 【시술 가이드】추천 위치, 보완 부위, 과도하게 진하게 하면 안 될 부위
6. 기대 효과 및 주의사항`,

`당신은 헤어 컬러 & 스타일 전문가입니다. 사진을 보고 한국어로 분석하세요.

1. 【추천 헤어 컬러】1순위+이유, 2순위+이유, 피해야 할 색상+이유
   (Soft Black/Natural Black/Espresso Brown/Chocolate Brown/Ash Brown/Beige Brown/Mocha Brown 등)
2. 【추천 헤어 길이】최적 길이 + 얼굴형 보완 포인트
3. 【레이어 & 스타일링】레이어 유무/페이스 프레이밍/뱅 스타일/스타일링 방향
4. 【얼굴형 밸런스 분석】어떤 스타일이 얼굴 구조를 가장 잘 보완하는지
5. 헤어 이미지 방향성 제안`,

`당신은 시니어 뷰티 이미지 디자이너입니다. 사진을 보고 최종 종합 리포트를 한국어로 작성하세요.

다음 형식으로 정확히 작성하세요:

BEST EYEBROW STYLE: [스타일명]
BEST BROW COLOR: [컬러명]
BEST LIP COLOR: [컬러명]
BEST LIP DESIGN: [디자인 방향]
SMP RECOMMENDATION: [권장/비권장 + 한줄이유]
BEST HAIR COLOR: [컬러명]
BEST HAIRSTYLE: [스타일 설명]
BEST CLOTHING COLORS: [3~4가지 색상]
OVERALL IMAGE DIRECTION: [Natural Luxury / Clean Professional / Youthful Fresh / Elegant Soft / Premium Beauty / Strong Charismatic 중 선택]

【시술 우선순위】
1순위 → 2순위 → 3순위

【스타일리스트 코멘트】
이 고객님만을 위한 진심 어린 전문가 의견 3~4문장`,
];

// ── 공통 스타일 ────────────────────────────────────────
const sc = {
  app:  { fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", background:"#faf8f5", minHeight:"100vh" },
  hdr:  { background:"linear-gradient(135deg,#6b4f3e,#c4956a)", padding:"16px 20px", color:"#fff", textAlign:"center" },
  card: { background:"#fff", borderRadius:14, padding:16, marginBottom:12, border:"1px solid #ede4dc", boxShadow:"0 1px 8px rgba(139,111,94,.07)" },
  sec:  { fontSize:11, fontWeight:700, color:"#8b6f5e", marginBottom:10, borderBottom:"1px solid #f0e6de", paddingBottom:6 },
};

// ── 섹션 카드 컴포넌트 ─────────────────────────────────
function SectionCard({ section, content, isLoading }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={sc.card}>
      {/* 헤더 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom: open ? 10 : 0 }}
      >
        <div style={{
          width:34, height:34, borderRadius:"50%",
          background:"linear-gradient(135deg,#8b6f5e,#c4956a)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:16, flexShrink:0
        }}>
          {section.emoji}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#3d2b1f" }}>{section.title}</div>
          <div style={{ fontSize:9, color:"#b09688", letterSpacing:1.5 }}>{section.sub}</div>
        </div>
        <div style={{ fontSize:12, color:"#c4956a", transition:"transform .2s", transform: open ? "rotate(180deg)" : "none" }}>▼</div>
      </div>

      {/* 바디 */}
      {open && (
        <div>
          {isLoading ? (
            <LoadingDots />
          ) : (
            <div style={{
              fontSize:13, lineHeight:1.85, color:"#3d2b1f",
              whiteSpace:"pre-wrap", wordBreak:"break-word",
              background:"#faf8f5", borderRadius:10, padding:"12px 14px"
            }}>
              {section.id === 6 ? <FinalSummary text={content} /> : formatText(content)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 텍스트 포맷 ────────────────────────────────────────
function formatText(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    if (line.startsWith("【") || line.startsWith("# ") || line.startsWith("## ")) {
      return (
        <div key={i} style={{
          fontWeight:700, color:"#8b6f5e", marginTop:14, marginBottom:6,
          fontSize:12, borderBottom:"1px solid #f0e6de", paddingBottom:4
        }}>
          {line.replace(/^#+\s*/, "")}
        </div>
      );
    }
    if (line.startsWith("✦") || line.startsWith("✓") || line.startsWith("✗") || line.startsWith("·")) {
      return <div key={i} style={{ paddingLeft:8, marginBottom:3 }}>{line}</div>;
    }
    if (line.trim() === "") return <div key={i} style={{ height:6 }} />;
    return <div key={i}>{line}</div>;
  });
}

// ── 최종 요약 카드 ─────────────────────────────────────
function FinalSummary({ text }) {
  if (!text) return null;

  const fields = [
    { key:"BEST EYEBROW STYLE",    label:"추천 눈썹 스타일" },
    { key:"BEST BROW COLOR",       label:"눈썹 피그먼트 컬러" },
    { key:"BEST LIP COLOR",        label:"립 컬러" },
    { key:"BEST LIP DESIGN",       label:"립 디자인" },
    { key:"SMP RECOMMENDATION",    label:"SMP 권장" },
    { key:"BEST HAIR COLOR",       label:"헤어 컬러" },
    { key:"BEST HAIRSTYLE",        label:"헤어스타일" },
    { key:"BEST CLOTHING COLORS",  label:"추천 의류 컬러" },
    { key:"OVERALL IMAGE DIRECTION",label:"오버올 이미지" },
  ];

  const parsed = {};
  fields.forEach(({ key }) => {
    const m = text.match(new RegExp(key + "[:\\s]+([^\n]+)", "i"));
    if (m) parsed[key] = m[1].trim();
  });

  const priorityM = text.match(/시술 우선순위[^\n]*\n([\s\S]+?)(?:\n\n|스타일리스트|$)/i);
  const commentM  = text.match(/스타일리스트 코멘트[^\n]*\n([\s\S]+?)$/i);

  return (
    <div>
      {/* 그리드 카드 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {fields.map(({ key, label }) =>
          parsed[key] ? (
            <div key={key} style={{
              background:"#fff", border:"1px solid #ede4dc", borderRadius:10,
              padding:"10px 12px",
              gridColumn: key === "OVERALL IMAGE DIRECTION" || key === "SMP RECOMMENDATION" ? "1 / -1" : undefined
            }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"#c4956a", textTransform:"uppercase", marginBottom:4 }}>
                {label}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:"#3d2b1f", lineHeight:1.5 }}>
                {parsed[key]}
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* 시술 우선순위 */}
      {priorityM && (
        <div style={{
          background:"#fff8f2", border:"1px solid #f0e0cc",
          borderLeft:"3px solid #c4956a",
          borderRadius:10, padding:"12px 14px", marginBottom:12
        }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#c4956a", marginBottom:6, fontWeight:700 }}>
            시술 우선순위
          </div>
          <div style={{ fontSize:12, lineHeight:1.8, color:"#3d2b1f", whiteSpace:"pre-wrap" }}>
            {priorityM[1].trim()}
          </div>
        </div>
      )}

      {/* 스타일리스트 코멘트 */}
      {commentM && (
        <div style={{
          background:"linear-gradient(135deg,rgba(196,149,106,.08),rgba(232,196,184,.08))",
          border:"1px solid rgba(196,149,106,.25)", borderRadius:12, padding:"14px 16px"
        }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#c4956a", marginBottom:8, fontWeight:700 }}>
            ✦ Stylist's Note
          </div>
          <div style={{ fontSize:13, lineHeight:1.85, color:"#3d2b1f", whiteSpace:"pre-wrap" }}>
            {commentM[1].trim()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 로딩 ──────────────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{ textAlign:"center", padding:"20px 0", color:"#c4956a", fontSize:12, letterSpacing:2 }}>
      분석 중
      <span style={{ marginLeft:8 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            display:"inline-block", width:6, height:6, borderRadius:"50%",
            background:"#c4956a", margin:"0 2px",
            animation:`bcPulse 1.2s ease-in-out ${i*0.2}s infinite`
          }} />
        ))}
      </span>
      <style>{`@keyframes bcPulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function BeautyConsultation() {
  const [phase,    setPhase]    = useState("upload"); // upload | loading | result
  const [imgSrc,   setImgSrc]   = useState(null);
  const [imgFile,  setImgFile]  = useState(null);
  const [results,  setResults]  = useState({}); // { 0: "text", 1: "text", ... }
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [doneSet,  setDoneSet]  = useState(new Set());
  const [error,    setError]    = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f?.type.startsWith("image/")) return;
    setImgFile(f);
    setImgSrc(URL.createObjectURL(f));
    setError(null);
    setResults({});
    setDoneSet(new Set());
  };

  const analyzeOne = async (idx, b64, mimeType) => {
    setLoadingIdx(idx);
    try {
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
          max_tokens: 1800,
          messages: [{
            role: "user",
            content: [
              { type:"image", source:{ type:"base64", media_type: mimeType, data: b64 } },
              { type:"text",  text: PROMPTS[idx] }
            ]
          }]
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.find(b => b.type === "text")?.text || "분석 결과를 가져올 수 없습니다.";
      setResults(prev => ({ ...prev, [idx]: text }));
      setDoneSet(prev => new Set([...prev, idx]));
    } catch (e) {
      setResults(prev => ({ ...prev, [idx]: `⚠️ 오류: ${e.message}` }));
      setDoneSet(prev => new Set([...prev, idx]));
    }
  };

  const startAnalysis = async () => {
    if (!imgFile) return;
    setPhase("result");
    setResults({});
    setDoneSet(new Set());

    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.readAsDataURL(imgFile);
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
    });
    const mimeType = imgFile.type || "image/jpeg";

    for (let i = 0; i < SECTIONS.length; i++) {
      await analyzeOne(i, b64, mimeType);
      if (i < SECTIONS.length - 1) await new Promise(r => setTimeout(r, 400));
    }
    setLoadingIdx(null);
  };

  const reset = () => {
    setPhase("upload");
    setImgSrc(null);
    setImgFile(null);
    setResults({});
    setDoneSet(new Set());
    setError(null);
    setLoadingIdx(null);
  };

  // ── 업로드 화면 ──
  if (phase === "upload") return (
    <div style={sc.app}>
      <div style={sc.hdr}>
        <div style={{ fontSize:10, letterSpacing:4, opacity:.75, marginBottom:3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize:19, fontWeight:700 }}>종합 뷰티 AI 컨설팅</div>
        <div style={{ fontSize:11, opacity:.65, marginTop:3 }}>7섹션 완전 분석 리포트</div>
      </div>

      <div style={{ padding:"20px 16px" }}>
        <div style={sc.card}>
          {/* 업로드 영역 */}
          <div
            onClick={() => fileRef.current.click()}
            style={{
              border:`2px dashed ${imgSrc ? "#c4956a" : "#ddd8d0"}`,
              borderRadius:12, padding: imgSrc ? 10 : "40px 20px",
              cursor:"pointer", background:"#faf8f5",
              textAlign:"center", marginBottom:14
            }}
          >
            {imgSrc
              ? <img src={imgSrc} style={{ maxHeight:280, borderRadius:8, maxWidth:"100%", display:"block", margin:"0 auto" }} />
              : <>
                  <div style={{ fontSize:48, marginBottom:10 }}>📸</div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#5a4a42", marginBottom:4 }}>고객 정면 사진 업로드</div>
                  <div style={{ fontSize:12, color:"#b0968a" }}>클릭하여 사진 선택</div>
                </>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => handleFile(e.target.files[0])} />

          {/* 섹션 미리보기 */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#8b6f5e", marginBottom:8 }}>분석 항목</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {SECTIONS.map(s => (
                <span key={s.id} style={{
                  fontSize:10, padding:"4px 10px", borderRadius:99,
                  background:"#f5ede6", color:"#8b6f5e", border:"1px solid #e8ddd5"
                }}>
                  {s.emoji} {s.title}
                </span>
              ))}
            </div>
          </div>

          {error && <div style={{ color:"#e07070", fontSize:12, textAlign:"center", marginBottom:10 }}>{error}</div>}

          <button onClick={startAnalysis} disabled={!imgFile} style={{
            width:"100%", padding:15, borderRadius:12, border:"none",
            background: imgFile ? "linear-gradient(135deg,#8b6f5e,#c4956a)" : "#ddd",
            color:"#fff", fontSize:15, fontWeight:700,
            cursor: imgFile ? "pointer" : "not-allowed",
            boxShadow: imgFile ? "0 4px 16px rgba(196,149,106,.4)" : "none"
          }}>
            ✨ 종합 AI 분석 시작
          </button>
        </div>
      </div>
    </div>
  );

  // ── 결과 화면 ──
  return (
    <div style={sc.app}>
      <div style={sc.hdr}>
        <div style={{ fontSize:10, letterSpacing:4, opacity:.75, marginBottom:3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize:18, fontWeight:700 }}>종합 뷰티 컨설팅 리포트</div>
        <div style={{ fontSize:11, opacity:.65, marginTop:3 }}>
          {new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" })}
        </div>
      </div>

      <div style={{ padding:"16px 14px" }}>
        {/* 고객 사진 */}
        <div style={{ ...sc.card, marginBottom:12 }}>
          <div style={sc.sec}>👤 고객 사진</div>
          <img src={imgSrc} style={{ width:"100%", borderRadius:10, maxHeight:240, objectFit:"cover", display:"block" }} />
        </div>

        {/* 진행 상태 */}
        <div style={{ ...sc.card, marginBottom:12 }}>
          <div style={sc.sec}>분석 진행 현황</div>
          <div style={{ display:"flex", gap:4 }}>
            {SECTIONS.map(s => (
              <div key={s.id} style={{
                flex:1, height:4, borderRadius:2,
                background: doneSet.has(s.id) ? "#c4956a"
                  : loadingIdx === s.id ? "#e8c4a0"
                  : "#f0e6de",
                transition:"background .4s"
              }} />
            ))}
          </div>
          <div style={{ fontSize:10, color:"#c4956a", textAlign:"center", marginTop:6 }}>
            {loadingIdx !== null
              ? `${SECTIONS[loadingIdx].title} 분석 중... (${doneSet.size + 1} / ${SECTIONS.length})`
              : doneSet.size === SECTIONS.length
              ? "✦ 분석 완료"
              : "분석 준비 중..."}
          </div>
        </div>

        {/* 섹션 카드들 */}
        {SECTIONS.map(s => (
          (doneSet.has(s.id) || loadingIdx === s.id) && (
            <SectionCard
              key={s.id}
              section={s}
              content={results[s.id]}
              isLoading={loadingIdx === s.id && !doneSet.has(s.id)}
            />
          )
        ))}

        {/* 완료 후 버튼 */}
        {doneSet.size === SECTIONS.length && (
          <>
            <div style={{ textAlign:"center", padding:"8px 0 16px", color:"#b09688", fontSize:11, lineHeight:2 }}>
              💡 분석 결과는 참고용이며 실제 시술 결과와 다를 수 있어요
            </div>
            <button onClick={reset} style={{
              width:"100%", padding:13, borderRadius:12,
              border:"1px solid #e8ddd5", background:"#fff",
              color:"#8b6f5e", fontSize:13, fontWeight:700, cursor:"pointer"
            }}>
              + 새로운 고객 분석
            </button>
          </>
        )}
      </div>
    </div>
  );
}

