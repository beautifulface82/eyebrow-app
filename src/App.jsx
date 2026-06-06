const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
import { useState, useRef } from "react";

const Dots = ({ value, max = 5 }) => (
  <span>
    {Array.from({ length: max }, (_, i) => (
      <span key={i} style={{ color: i < value ? '#c4956a' : '#ddd', fontSize: 9, marginRight: 1 }}>
        {i < value ? '●' : '○'}
      </span>
    ))}
  </span>
);

const MetricRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
    <span style={{ fontSize: 10, color: '#9e8a7e', width: 44 }}>{label}</span>
    <Dots value={value} />
  </div>
);

const StyleCard = ({ style, isBest }) => (
  <div style={{
    border: isBest ? '2px solid #c4956a' : '1px solid #e8ddd5',
    borderRadius: 10,
    padding: '12px 10px',
    background: isBest ? '#fffaf5' : '#fff',
    flex: 1,
    minWidth: 0
  }}>
    <div style={{
      fontSize: 9, fontWeight: 700,
      color: isBest ? '#c4956a' : '#8b9e7e',
      background: isBest ? '#fdebd0' : '#eef2eb',
      display: 'inline-block', padding: '2px 7px', borderRadius: 99, marginBottom: 5
    }}>
      #{style.tag}
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#3d2b1f', marginBottom: 7 }}>{style.name}</div>
    <MetricRow label="길이" value={style.length} />
    <MetricRow label="각도" value={style.angle} />
    <MetricRow label="두께" value={style.thickness} />
    <MetricRow label="색감" value={style.color} />
    <MetricRow label="산 위치" value={style.archPosition} />
    <MetricRow label="라운드감" value={style.roundness} />
    <div style={{ marginTop: 6, fontSize: 10, color: '#b0968a' }}>{style.hashtag}</div>
  </div>
);

const colorMap = {
  '다크 브라운': '#5c3d2e', '애쉬 브라운': '#8a7060', '그레이 브라운': '#7a7068',
  '라이트 브라운': '#b89080', '내추럴 브라운': '#9a7060', '초코 브라운': '#6b4030',
  '다크 그레이 브라운': '#5a5550'
};

export default function App() {
  const [phase, setPhase] = useState('upload');
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImgFile(file);
    setImgSrc(URL.createObjectURL(file));
    setError(null);
  };

  const analyze = async () => {
    if (!imgFile) return;
    setPhase('loading');
    setError(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(imgFile);
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  "x-api-key": ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true"
},
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imgFile.type || 'image/jpeg', data: base64 } },
              {
                type: "text",
                text: `반영구 시술 전문가로서 정면 사진을 분석하세요. JSON만 출력하고 다른 텍스트는 절대 포함하지 마세요.

{
  "faceShape": "타원형 또는 둥근형 또는 각진형 또는 하트형 또는 긴형 또는 복합형(둥근+타원) 중 하나",
  "faceShapeDetail": "얼굴형 특징 2줄 이내 설명",
  "atmosphere": ["인상/분위기 특징 1~3개"],
  "skeleton": { "forehead": "좁음 또는 중간 또는 넓음", "cheekbone": "함몰 또는 중간 또는 넓음", "jaw": "부드러움 또는 중간 또는 각짐" },
  "faceContour": { "jawLine": "둥글고 부드러움 또는 중간 또는 각지고 넓음", "ratio": "가로보다 세로가 긺 또는 비슷함 또는 가로가 더 넓음" },
  "currentBrow": { "shape": "일자형 또는 아치형 또는 스트레이트 또는 세미아치", "archAngle": "낮음 또는 중간 또는 높음", "color": "연함 또는 자연스러움 또는 진함", "thickness": "가늘음 또는 보통 또는 두꺼움", "length": "짧음 또는 표준 또는 김" },
  "skinTone": "쿨톤/밝음 또는 웜톤/밝음 또는 중간톤 또는 웜톤/어두움 또는 쿨톤/어두움",
  "skinToneDisplay": "피부톤 표시 텍스트",
  "recommendedStyles": [
    { "rank": 1, "tag": "베스트", "name": "스타일명", "length": 1~5, "angle": 1~5, "thickness": 1~5, "color": 1~5, "archPosition": 1~5, "roundness": 1~5, "hashtag": "#태그" },
    { "rank": 2, "tag": "추천", "name": "스타일명", "length": 1~5, "angle": 1~5, "thickness": 1~5, "color": 1~5, "archPosition": 1~5, "roundness": 1~5, "hashtag": "#태그" },
    { "rank": 3, "tag": "자연스러움", "name": "스타일명", "length": 1~5, "angle": 1~5, "thickness": 1~5, "color": 1~5, "archPosition": 1~5, "roundness": 1~5, "hashtag": "#태그" }
  ],
  "notRecommended": [
    { "name": "비추천 스타일 1", "reason": "이유" },
    { "name": "비추천 스타일 2", "reason": "이유" }
  ],
  "recommendedColors": ["컬러1", "컬러2", "컬러3"],
  "supplementPoints": ["보완포인트1", "보완포인트2", "보완포인트3"],
  "browTips": { "start": "눈썹 앞머리 위치", "arch": "눈썹 산 위치", "end": "눈썹 꼬리 위치" }
}`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setPhase('result');
    } catch (e) {
      setError('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      setPhase('upload');
    }
  };

  const reset = () => { setPhase('upload'); setImgSrc(null); setImgFile(null); setResult(null); };

  const s = {
    app: { fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif", background: '#faf8f5', minHeight: '100vh' },
    header: { background: 'linear-gradient(135deg, #6b4f3e 0%, #c4956a 100%)', padding: '18px 20px 16px', color: '#fff', textAlign: 'center' },
    card: { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid #ede4dc', boxShadow: '0 1px 8px rgba(139,111,94,0.07)' },
    sec: { fontSize: 11, fontWeight: 700, color: '#8b6f5e', marginBottom: 10, borderBottom: '1px solid #f0e6de', paddingBottom: 6, letterSpacing: 0.5 },
    pill: { display: 'inline-block', padding: '3px 10px', borderRadius: 99, background: '#f5ede6', color: '#8b6f5e', fontSize: 11, marginRight: 5, marginBottom: 5 }
  };

  if (phase === 'upload') return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.75, marginBottom: 3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5 }}>눈썹 & 얼굴형 AI 분석</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>정면 사진 한 장으로 맞춤 눈썹 디자인 추천</div>
      </div>
      <div style={{ padding: '20px 16px' }}>
        <div style={s.card}>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? '#c4956a' : '#ddd8d0'}`,
              borderRadius: 12, padding: imgSrc ? '12px' : '36px 20px',
              cursor: 'pointer', background: dragOver ? '#fff9f4' : '#faf8f5',
              textAlign: 'center', transition: 'all 0.2s', marginBottom: 14
            }}
          >
            {imgSrc
              ? <img src={imgSrc} alt="preview" style={{ maxHeight: 240, borderRadius: 8, maxWidth: '100%', display: 'block', margin: '0 auto' }} />
              : <>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#5a4a42', marginBottom: 4 }}>고객 정면 사진 업로드</div>
                  <div style={{ fontSize: 12, color: '#b0968a' }}>클릭하거나 사진을 드래그하세요</div>
                </>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {error && <div style={{ color: '#e07070', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{error}</div>}
          {imgSrc && (
            <div style={{ fontSize: 12, color: '#9e8a7e', textAlign: 'center', marginBottom: 10 }}>
              📌 정면을 바라보는 사진이 분석 정확도를 높여요
            </div>
          )}
          <button
            onClick={analyze}
            disabled={!imgFile}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: imgFile ? 'linear-gradient(135deg, #8b6f5e, #c4956a)' : '#e0d8d0',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: imgFile ? 'pointer' : 'not-allowed', letterSpacing: 0.5,
              boxShadow: imgFile ? '0 4px 16px rgba(196,149,106,0.35)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            ✨ AI 분석 시작
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#b0968a', lineHeight: 1.7 }}>
          · 분석 결과는 참고용이며 전문가 상담을 병행하세요<br />
          · 사진은 분석 후 저장되지 않습니다
        </div>
      </div>
    </div>
  );

  if (phase === 'loading') return (
    <div style={{ ...s.app, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontSize: 48, marginBottom: 20, animation: 'pulse 1.5s infinite' }}>✨</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#3d2b1f', marginBottom: 8 }}>분석 중입니다...</div>
      <div style={{ fontSize: 13, color: '#9e8a7e', textAlign: 'center', lineHeight: 1.8 }}>
        얼굴형을 분석하고<br />맞춤 눈썹 디자인을 찾고 있어요
      </div>
    </div>
  );

  if (!result) return null;

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.75, marginBottom: 3 }}>SEMI-PERMANENT MAKEUP</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>눈썹 & 얼굴형 분석 결과</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div style={{ padding: '16px 14px' }}>

        {/* 사진 + 얼굴형 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ ...s.card, width: 110, flexShrink: 0, padding: 10, marginBottom: 0, textAlign: 'center' }}>
            <img src={imgSrc} alt="고객" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
          </div>
          <div style={{ ...s.card, flex: 1, marginBottom: 0 }}>
            <div style={s.sec}>얼굴형 분석</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#8b6f5e', marginBottom: 5, letterSpacing: -0.5 }}>{result.faceShape}</div>
            <div style={{ fontSize: 11, color: '#6b5a52', lineHeight: 1.65, marginBottom: 8 }}>{result.faceShapeDetail}</div>
            <div>{result.atmosphere?.map(a => <span key={a} style={s.pill}>{a}</span>)}</div>
          </div>
        </div>

        {/* 골격 + 얼굴선 */}
        <div style={s.card}>
          <div style={s.sec}>골격 & 얼굴선</div>
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#b09688', marginBottom: 6 }}>골격</div>
              {[['이마', result.skeleton?.forehead], ['광대', result.skeleton?.cheekbone], ['턱선', result.skeleton?.jaw]].map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, color: '#3d2b1f', marginBottom: 4, display: 'flex', gap: 4 }}>
                  <span style={{ color: '#c4956a' }}>✓</span>
                  <span style={{ color: '#9e8a7e' }}>{k}</span>
                  <span style={{ fontWeight: 600, marginLeft: 'auto' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: '#f0e6de', margin: '0 14px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#b09688', marginBottom: 6 }}>얼굴선</div>
              {[['턱선', result.faceContour?.jawLine], ['비율', result.faceContour?.ratio]].map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, color: '#3d2b1f', marginBottom: 4, display: 'flex', gap: 4 }}>
                  <span style={{ color: '#c4956a' }}>✓</span>
                  <span style={{ color: '#9e8a7e' }}>{k}</span>
                  <span style={{ fontWeight: 600, marginLeft: 'auto', textAlign: 'right', maxWidth: 80, fontSize: 10 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 현재 눈썹 + 피부톤 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ ...s.card, flex: 1.5, marginBottom: 0 }}>
            <div style={s.sec}>현재 눈썹 특징</div>
            {[['형태', result.currentBrow?.shape], ['산 각도', result.currentBrow?.archAngle], ['색상', result.currentBrow?.color], ['두께', result.currentBrow?.thickness], ['길이', result.currentBrow?.length]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: '#9e8a7e' }}>· {k}</span>
                <span style={{ fontWeight: 600, color: '#3d2b1f' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, flex: 1, marginBottom: 0 }}>
            <div style={s.sec}>피부톤</div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e8d5c4', border: '1px solid #ddd' }} />
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#d4b896', border: '1px solid #ddd' }} />
            </div>
            <div style={{ fontSize: 11, color: '#6b5a52', lineHeight: 1.6 }}>{result.skinToneDisplay}</div>
          </div>
        </div>

        {/* 보완 포인트 */}
        <div style={s.card}>
          <div style={s.sec}>보완 포인트</div>
          {result.supplementPoints?.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ color: '#c4956a', flexShrink: 0, fontSize: 11 }}>✦</span>
              <span style={{ fontSize: 12, color: '#3d2b1f', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>

        {/* 추천 스타일 BEST */}
        <div style={s.card}>
          <div style={{ ...s.sec, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ background: '#c4956a', color: '#fff', fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>BEST</span>
            잘 어울리는 스타일
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {result.recommendedStyles?.map(style => (
              <StyleCard key={style.rank} style={style} isBest={style.rank === 1} />
            ))}
          </div>
        </div>

        {/* 비추천 */}
        <div style={s.card}>
          <div style={{ ...s.sec, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ background: '#e07070', color: '#fff', fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>비추천</span>
            덜 어울리는 스타일
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {result.notRecommended?.map((nr, i) => (
              <div key={i} style={{ flex: 1, background: '#fff8f8', border: '1px solid #f5d0d0', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 16, marginBottom: 5 }}>❌</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#3d2b1f', marginBottom: 3 }}>{nr.name}</div>
                <div style={{ fontSize: 10, color: '#c07070' }}>{nr.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 추천 컬러 */}
        <div style={s.card}>
          <div style={s.sec}>추천 눈썹 컬러</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {result.recommendedColors?.map((c, i) => (
              <div key={c} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: colorMap[c] || '#8a7060',
                  border: i === 0 ? '2px solid #c4956a' : '2px solid transparent',
                  marginBottom: 5
                }} />
                <div style={{ fontSize: 9, color: '#6b5a52', width: 42, lineHeight: 1.4 }}>{c}</div>
                {i === 0 && <div style={{ fontSize: 9, color: '#c4956a', fontWeight: 700 }}>✓추천</div>}
              </div>
            ))}
          </div>
        </div>

        {/* 시술 팁 */}
        <div style={s.card}>
          <div style={s.sec}>눈썹 3포인트 시술 팁</div>
          {[
            ['① 앞머리', result.browTips?.start],
            ['② 눈썹 산', result.browTips?.arch],
            ['③ 꼬리', result.browTips?.end]
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c4956a', flexShrink: 0, minWidth: 44 }}>{label}</span>
              <span style={{ fontSize: 11, color: '#3d2b1f', lineHeight: 1.5 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* 하단 안내 */}
        <div style={{ textAlign: 'center', padding: '8px 0 12px', color: '#b09688', fontSize: 11, lineHeight: 1.8 }}>
          💡 자연스러운 눈썹 결과와 피부톤에 맞는 색감이 가장 중요해요
        </div>

        <button
          onClick={reset}
          style={{
            width: '100%', padding: 13, borderRadius: 12, border: '1px solid #e8ddd5',
            background: '#fff', color: '#8b6f5e', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', letterSpacing: 0.3
          }}
        >
          + 새로운 고객 분석하기
        </button>
      </div>
    </div>
  );
}
