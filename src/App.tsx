import { useState, useMemo } from "react"; // React フック読み込み

/* ========================================================
   AutoCAD Linetype Builder  (Rev.13)
   1 行ずつにできるだけコメントを付与し、処理の流れを明示
   ======================================================== */

export default function App() {
  /* ---------- React state ---------- */
  const [name, setName] = useState("MYLINE"); // 線種名
  const [description, setDescription] = useState("My custom line"); // 説明文
  const [units, setUnits] = useState<"mm" | "inch">("mm"); // 単位系
  const [pairs, setPairs] = useState([{ line: 10, gap: 5 }]); // 実線+空白のペア配列
  const [scale, setScale] = useState(1); // 表示スケール
  const [strokeColor, setStrokeColor] = useState("#000000"); // 線色
  const [bgColor, setBgColor] = useState("#ffffff"); // 背景色
  const [selectedPair, setSelectedPair] = useState<number | null>(null); // ハイライト対象ペア

  /* ---------- 単位変換ヘルパ ---------- */
  const inchFactor = 25.4; // 1inch = 25.4mm
  const toInch = (v: number) => (units === "mm" ? v / inchFactor : v); // 単位に応じて inch に変換

  /* ---------- SVG dasharray ---------- */
  // 全体の dasharray 文字列をメモ化
  const dashArray = useMemo(
    () => pairs.map(p => `${p.line * scale} ${p.gap * scale}`).join(" "),
    [pairs, scale]
  );

  // 選択ペア用のハイライト dasharray を生成
  const hlDashArray = useMemo(() => {
    if (selectedPair === null) return ""; // 未選択なら空
    return pairs
      .map((p, idx) =>
        idx === selectedPair
          ? `${p.line * scale} ${p.gap * scale}` // 対象ペアは実長で出力
          : `0 ${p.line * scale + p.gap * scale}` // それ以外は 0 長さで飛ばす
      )
      .join(" ");
  }, [pairs, scale, selectedPair]);

  /* ---------- .lin ファイル出力 ---------- */
  // パターン行: 実線は +, 空白は -
  const patternString = pairs
    .flatMap(p => [toInch(p.line).toFixed(2), (-toInch(p.gap)).toFixed(2)])
    .join(", ");
  const outputLin = `*${name}, ${description}\nA, ${patternString}`; // ヘッダー+パターン

  // Blob を生成してダウンロードリンクをクリック
  const downloadLin = () => {
    const blob = new Blob([outputLin], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.lin`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---------- 埋め込み CSS (一度だけ) ---------- */
  if (!document.head.querySelector("style[data-linetype]")) {
    const style = document.createElement("style");
    style.setAttribute("data-linetype", "");
    style.textContent = `
    :root{--border:#888}
    .left,.right{padding:1rem;box-sizing:border-box}
    .stack{display:flex;flex-direction:column;gap:.25rem;width:100%}
    textarea{width:100%;resize:none;overflow-wrap:anywhere;border:1px solid var(--border);padding:.25rem;box-sizing:border-box;font-family:inherit}
    .inline{display:flex;align-items:center;gap:.5rem}
    .inline input[type="number"],select{border:1px solid var(--border)}
    .pairRow{display:flex;align-items:center;gap:.25rem;width:100%;cursor:pointer}
    .pairRow input[type="number"]{flex:1 1 60px;max-width:90px;border:1px solid var(--border)}
    .pairRow button{flex:0 0 24px}
    .pairRow.selected{background:#e6f2ff}
    .pairRow:hover{background:#f5faff}
    .separator{border:0;border-top:1px dashed #ccc;margin:.75rem 0;width:100%}
    @media(max-width:600px){.main{flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  /* ---------- JSX ---------- */
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}> {/* 画面を縦3分割 */}
      <header style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #ccc" }}> {/* ヘッダー */}
        <strong>📐 Linetype Builder</strong>
      </header>
      <main className="main" style={{ flex: 1, display: "flex" }}> {/* 中央部: 左右ペイン */}
        {/* ---------------- Left ペイン : 設定 ---------------- */}
        <section className="left" style={{ width: 320, overflowY: "auto" }}>
          {/* 線種名 */}
          <label className="stack">
            線種名
            <textarea rows={1} value={name} onChange={e => setName(e.target.value)} />
          </label>
          {/* 説明 */}
          <label className="stack" style={{ marginTop: ".5rem" }}>
            説明
            <textarea rows={1} value={description} onChange={e => setDescription(e.target.value)} />
          </label>
          {/* 単位トグル */}
          <label className="inline" style={{ marginTop: ".75rem" }}>
            単位
            <select value={units} onChange={e => setUnits(e.target.value as any)}>
              <option value="mm">mm</option>
              <option value="inch">inch</option>
            </select>
          </label>
          <hr className="separator" />
          {/* セグメントペアエディタ */}
          <fieldset>
            <legend>セグメントペア</legend>
            {pairs.map((p, idx) => (
              <div
                key={idx}
                className={`pairRow ${selectedPair === idx ? "selected" : ""}`}
                onClick={() => setSelectedPair(idx)}
              >
                {/* 実線長 */}
                <input
                  type="number"
                  value={p.line}
                  min={0.1}
                  step={0.1}
                  onChange={e => {
                    const v = [...pairs];
                    v[idx].line = +e.target.value;
                    setPairs(v);
                  }}
                />
                -
                {/* 空白長 */}
                <input
                  type="number"
                  value={p.gap}
                  min={0.1}
                  step={0.1}
                  onChange={e => {
                    const v = [...pairs];
                    v[idx].gap = +e.target.value;
                    setPairs(v);
                  }}
                />
                {/* 削除ボタン */}
                <button
                  onClick={e => {
                    e.stopPropagation(); // ペア選択を阻止
                    setPairs(pairs.filter((_, i) => i !== idx));
                    if (selectedPair === idx) setSelectedPair(null);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {/* ペア追加 */}
            <button style={{ marginTop: ".25rem" }} onClick={() => setPairs([...pairs, { line: 10, gap: 5 }])}>
              + ペア追加
            </button>
          </fieldset>
          <hr className="separator" />
          {/* 表示スケール */}
          <label className="inline">
            表示スケール
            <input type="number" value={scale} min={0.1} step={0.1} onChange={e => setScale(+e.target.value)} />
          </label>
          {/* 線色 */}
          <label className="inline" style={{ marginTop: ".75rem" }}>
            線色
            <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} />
          </label>
          {/* 背景色 */}
          <label className="inline" style={{ marginTop: ".5rem" }}>
            背景色
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
          </label>
        </section>
        {/* ---------------- Right ペイン : プレビュー ---------------- */}
        <section className="right" style={{ flex: 1, background: bgColor }}>
          <svg width="100%" height="100%" viewBox="0 0 800 200">
            {/* メインの線種 */}
            <line
              x1="0"
              y1="100"
              x2="800"
              y2="100"
              stroke={strokeColor}
              strokeWidth={2}
              strokeDasharray={dashArray}
            />
            {/* ハイライト */}
            {selectedPair !== null && (
              <line
                x1="0"
                y1="100"
                x2="800"
                y2="100"
                stroke="#4da3ff"
                strokeWidth={6}
                strokeOpacity={0.3}
                strokeDasharray={hlDashArray}
              />
            )}
          </svg>
        </section>
      </main>
      <footer style={{ padding: "0.5rem", borderTop: "1px solid #ccc", textAlign: "center" }}> {/* フッター */}
        <button onClick={downloadLin}>.lin ダウンロード</button>
      </footer>
    </div>
  );
}
