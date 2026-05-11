import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg: "#0f0f14", surface: "#1a1a24", card: "#22222f", border: "#2e2e40",
  accent: "#f5a623", accentDim: "#f5a62322", text: "#e8e6f0", textDim: "#7a7890",
  green: "#4ade80", red: "#f87171", blue: "#60a5fa",
};

const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif}
    textarea,input{font-family:'DM Sans',sans-serif}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .fi{animation:fadeIn .3s ease forwards}
    .pu{animation:pulse 1.2s ease infinite}
  `}</style>
);

const TABS = [
  { id: "notes", icon: "📝", label: "ノート" },
  { id: "tasks", icon: "✅", label: "タスク" },
  { id: "summary", icon: "🤖", label: "要約" },
  { id: "ai", icon: "💬", label: "AI" },
  { id: "board", icon: "🖊️", label: "ボード" },
];

const TabBar = ({ active, onSelect }) => (
  <div style={{ display:"flex", background:C.surface, borderTop:`1px solid ${C.border}`,
    position:"fixed", bottom:0, left:0, right:0, zIndex:100 }}>
    {TABS.map(t => (
      <button key={t.id} onClick={() => onSelect(t.id)} style={{
        flex:1, padding:"10px 4px 8px", background:"none", border:"none", cursor:"pointer",
        display:"flex", flexDirection:"column", alignItems:"center", gap:3,
        color: active===t.id ? C.accent : C.textDim, position:"relative",
      }}>
        <span style={{ fontSize:20 }}>{t.icon}</span>
        <span style={{ fontSize:10, fontWeight:500 }}>{t.label}</span>
        {active===t.id && <div style={{ position:"absolute", bottom:0, width:24, height:2, background:C.accent, borderRadius:2 }} />}
      </button>
    ))}
  </div>
);

const HCanvas = ({ strokes, setStrokes, penColor, penSize }) => {
  const ref = useRef(null);
  const drawing = useRef(false);

  const getPos = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const redraw = useCallback((allStrokes) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = s.color; ctx.lineWidth = s.size;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    });
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, []);

  useEffect(() => { redraw(strokes); }, [strokes, redraw]);

  const start = (e) => {
    e.preventDefault(); drawing.current = true;
    const pos = getPos(e);
    setStrokes(prev => [...prev, { color: penColor, size: penSize, points: [pos] }]);
  };
  const move = (e) => {
    if (!drawing.current) return; e.preventDefault();
    const pos = getPos(e);
    setStrokes(prev => {
      const next = [...prev];
      next[next.length-1] = { ...next[next.length-1], points: [...next[next.length-1].points, pos] };
      return next;
    });
  };
  const end = () => { drawing.current = false; };

  return <canvas ref={ref} style={{ width:"100%", height:"100%", display:"block", touchAction:"none", cursor:"crosshair" }}
    onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
    onTouchStart={start} onTouchMove={move} onTouchEnd={end} />;
};

const NotesTab = ({ notes, setNotes }) => {
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState("keyboard");
  const [strokes, setStrokes] = useState([]);
  const [penColor, setPenColor] = useState("#e8e6f0");
  const [penSize, setPenSize] = useState(3);
  const [hwMap, setHwMap] = useState({});

  const openNew = () => { setTitle(""); setBody(""); setStrokes([]); setMode("keyboard"); setEditing("new"); };
  const openEdit = (n) => { setTitle(n.title); setBody(n.body); setStrokes(hwMap[n.id]||[]); setMode("keyboard"); setEditing(n.id); };
  const save = () => {
    if (!title.trim() && !body.trim() && !strokes.length) { setEditing(null); return; }
    const id = editing === "new" ? Date.now() : editing;
    if (editing === "new") {
      setNotes(prev => [{ id, title: title||"無題", body, date: new Date().toLocaleDateString("ja-JP") }, ...prev]);
    } else {
      setNotes(prev => prev.map(n => n.id===editing ? { ...n, title: title||"無題", body } : n));
    }
    if (strokes.length) setHwMap(prev => ({ ...prev, [id]: strokes }));
    setEditing(null);
  };

  const PALETTE = ["#e8e6f0","#f5a623","#4ade80","#60a5fa","#f87171","#e879f9"];

  if (editing !== null) return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
        <button onClick={save} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontSize:14, fontWeight:600 }}>
          {"← 保存"}
        </button>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="タイトル" style={{
          flex:1, background:"none", border:"none", outline:"none", color:C.text, fontSize:16, fontFamily:"'Syne'", fontWeight:700, minWidth:0
        }} />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
        <div style={{ display:"flex", background:C.card, borderRadius:10, padding:3, border:`1px solid ${C.border}` }}>
          {[{id:"keyboard",label:"キーボード"},{id:"handwriting",label:"手書き"}].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
              background: mode===m.id ? C.accent : "none", color: mode===m.id ? "#000" : C.textDim,
            }}>{m.label}</button>
          ))}
        </div>
        {mode==="handwriting" && PALETTE.map(col => (
          <button key={col} onClick={() => setPenColor(col)} style={{
            width:18, height:18, borderRadius:"50%", background:col,
            border: penColor===col ? "2px solid white" : "2px solid transparent", cursor:"pointer"
          }} />
        ))}
        {mode==="handwriting" && [2,4,8].map(s => (
          <button key={s} onClick={() => setPenSize(s)} style={{
            width:24, height:24, borderRadius:6, background: penSize===s ? C.surface : "none",
            border:`1px solid ${penSize===s ? C.accent : C.border}`, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center"
          }}>
            <div style={{ width:s+2, height:s+2, borderRadius:"50%", background:C.text }} />
          </button>
        ))}
        {mode==="handwriting" && (
          <button onClick={() => setStrokes([])} style={{ padding:"3px 10px", borderRadius:6, background:"none", border:`1px solid ${C.border}`, color:C.red, cursor:"pointer", fontSize:11, fontWeight:600 }}>
            消去
          </button>
        )}
      </div>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        {mode==="keyboard" ? (
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="ここにメモを書く..." autoFocus style={{
            width:"100%", height:"100%", background:"none", border:"none", outline:"none",
            color:C.text, padding:"18px 20px", fontSize:15, lineHeight:1.75, resize:"none"
          }} />
        ) : (
          <div style={{ width:"100%", height:"100%" }}>
            <HCanvas strokes={strokes} setStrokes={setStrokes} penColor={penColor} penSize={penSize} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fi" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontFamily:"'Syne'", fontWeight:800, fontSize:22 }}>ノート</h2>
        <button onClick={openNew} style={{ background:C.accent, color:"#000", border:"none", borderRadius:20, padding:"8px 18px", fontWeight:700, cursor:"pointer", fontSize:14 }}>
          + 新規
        </button>
      </div>
      {!notes.length && <div style={{ textAlign:"center", color:C.textDim, paddingTop:60 }}><div style={{ fontSize:40, marginBottom:12 }}>📝</div><p>ノートがありません</p></div>}
      {notes.map(n => (
        <div key={n.id} onClick={() => openEdit(n)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", cursor:"pointer", position:"relative" }}>
          <button onClick={e => { e.stopPropagation(); setNotes(prev => prev.filter(x => x.id!==n.id)); }} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", color:C.textDim, cursor:"pointer", fontSize:16 }}>x</button>
          <div style={{ fontFamily:"'Syne'", fontWeight:700, fontSize:16, marginBottom:6, paddingRight:24 }}>{n.title}</div>
          <div style={{ color:C.textDim, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {n.body || (hwMap[n.id]?.length ? "手書きノート" : "（本文なし）")}
          </div>
          <div style={{ color:C.textDim, fontSize:11, marginTop:8 }}>{n.date}</div>
        </div>
      ))}
    </div>
  );
};

const TasksTab = ({ tasks, setTasks }) => {
  const [input, setInput] = useState("");
  const add = () => {
    if (!input.trim()) return;
    setTasks(prev => [{ id:Date.now(), text:input.trim(), done:false }, ...prev]);
    setInput("");
  };
  const done = tasks.filter(t => t.done);
  const pending = tasks.filter(t => !t.done);

  return (
    <div className="fi" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>
      <h2 style={{ fontFamily:"'Syne'", fontWeight:800, fontSize:22 }}>タスク</h2>
      <div style={{ display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="新しいタスクを追加..." style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, outline:"none", fontSize:15 }} />
        <button onClick={add} style={{ background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"12px 18px", fontWeight:700, cursor:"pointer", fontSize:18 }}>+</button>
      </div>
      {tasks.length > 0 && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13, color:C.textDim }}>
            <span>進捗</span><span>{done.length}/{tasks.length}</span>
          </div>
          <div style={{ height:6, background:C.border, borderRadius:3 }}>
            <div style={{ height:"100%", width:`${tasks.length ? (done.length/tasks.length)*100 : 0}%`, background:C.green, borderRadius:3, transition:"width .4s" }} />
          </div>
        </div>
      )}
      {!tasks.length && <div style={{ textAlign:"center", color:C.textDim, paddingTop:40 }}><div style={{ fontSize:40, marginBottom:12 }}>✅</div><p>タスクがありません</p></div>}
      {pending.map(t => (
        <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
          <button onClick={() => setTasks(prev => prev.map(x => x.id===t.id?{...x,done:true}:x))} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${C.accent}`, background:"none", cursor:"pointer", flexShrink:0 }} />
          <span style={{ flex:1, fontSize:15 }}>{t.text}</span>
          <button onClick={() => setTasks(prev => prev.filter(x=>x.id!==t.id))} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer" }}>x</button>
        </div>
      ))}
      {done.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ color:C.textDim, fontSize:12, fontWeight:600, letterSpacing:"0.1em" }}>完了済み</div>
          {done.map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", opacity:0.6 }}>
              <button onClick={() => setTasks(prev => prev.map(x => x.id===t.id?{...x,done:false}:x))} style={{ width:22, height:22, borderRadius:6, border:"none", background:C.green, cursor:"pointer", flexShrink:0, color:"#000", fontWeight:900, fontSize:13 }}>v</button>
              <span style={{ flex:1, fontSize:15, textDecoration:"line-through", color:C.textDim }}>{t.text}</span>
              <button onClick={() => setTasks(prev => prev.filter(x=>x.id!==t.id))} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer" }}>x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SummaryTab = () => {
  const [records, setRecords] = useState([]);
  const [inputText, setInputText] = useState("");
  const [title, setTitle] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  const run = async () => {
    if (!inputText.trim()) { setError("テキストを入力してください"); return; }
    setError(""); setProcessing(true);
    try {
      const prompt = "以下のテキストを日本語で要約し、重要ポイントを箇条書きでまとめてください。\n必ず下記の形式で答えてください。\n\n---SUMMARY---\n（要約）\n\n---POINTS---\n（重要ポイントを箇条書き）\n\n---END---\n\nテキスト:\n" + inputText;
      const res = await fetch("/api/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500, messages:[{role:"user",content:prompt}] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const result = data.content?.map(b => b.text||"").join("") || "";

      const extract = (a, b) => {
        const i = result.indexOf(a);
        if (i===-1) return "";
        const after = result.slice(i+a.length).trim();
        const j = b ? after.indexOf(b) : -1;
        return j===-1 ? after : after.slice(0,j).trim();
      };

      setRecords(prev => [{
        id: Date.now(),
        title: title.trim() || ("メモ " + new Date().toLocaleDateString("ja-JP")),
        original: inputText,
        summary: extract("---SUMMARY---", "---POINTS---"),
        points: extract("---POINTS---", "---END---"),
        date: new Date().toLocaleDateString("ja-JP"),
      }, ...prev]);
      setInputText(""); setTitle("");
    } catch(err) {
      setError("処理に失敗しました: " + err.message);
    } finally { setProcessing(false); }
  };

  return (
    <div className="fi" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:18 }}>
      <h2 style={{ fontFamily:"'Syne'", fontWeight:800, fontSize:22 }}>テキスト要約</h2>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"18px", display:"flex", flexDirection:"column", gap:12 }}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="タイトル（任意）" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, outline:"none", fontSize:14 }} />
        <textarea value={inputText} onChange={e=>setInputText(e.target.value)} placeholder="テキストをここに貼り付けてください" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, outline:"none", fontSize:14, lineHeight:1.7, resize:"none", height:160 }} />
        {error && <div style={{ background:`${C.red}22`, border:`1px solid ${C.red}44`, borderRadius:8, padding:"8px 12px", fontSize:13, color:C.red }}>{error}</div>}
        <button onClick={run} disabled={processing} style={{
          background: processing ? C.border : C.accent, color: processing ? C.textDim : "#000",
          border:"none", borderRadius:12, padding:"14px", fontWeight:700, cursor: processing?"default":"pointer", fontSize:15,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8
        }}>
          {processing ? "AI が要約中..." : "AI で要約する"}
        </button>
      </div>
      <div style={{ background:C.surface, borderRadius:12, padding:"12px 16px", fontSize:12, color:C.textDim, lineHeight:1.8 }}>
        <strong style={{ color:C.text }}>使い方のヒント</strong><br />
        iPhoneのボイスメモ → 「文字起こしを表示」→ テキストをコピー → ここに貼り付け
      </div>
      {!records.length && <div style={{ textAlign:"center", color:C.textDim, paddingTop:10 }}><div style={{ fontSize:36, marginBottom:10 }}>📄</div><p style={{ fontSize:14 }}>まだ要約がありません</p></div>}
      {records.map(rec => (
        <div key={rec.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"'Syne'", fontWeight:700, fontSize:15 }}>{rec.title}</div>
              <div style={{ color:C.textDim, fontSize:12, marginTop:2 }}>{rec.date}</div>
            </div>
            <button onClick={() => setRecords(prev=>prev.filter(r=>r.id!==rec.id))} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer", fontSize:16 }}>x</button>
          </div>
          {rec.summary && (
            <div style={{ background:C.accentDim, border:`1px solid ${C.accent}44`, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:6 }}>AI 要約</div>
              <div style={{ fontSize:13, lineHeight:1.75 }}>{rec.summary}</div>
            </div>
          )}
          {rec.points && (
            <div style={{ background:`${C.blue}15`, border:`1px solid ${C.blue}33`, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ color:C.blue, fontWeight:700, fontSize:11, marginBottom:6 }}>重要ポイント</div>
              <div style={{ fontSize:13, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{rec.points}</div>
            </div>
          )}
          <button onClick={() => setExpanded(prev=>({...prev,[rec.id]:!prev[rec.id]}))} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px", color:C.textDim, cursor:"pointer", fontSize:12 }}>
            {expanded[rec.id] ? "元のテキストを隠す" : "元のテキストを見る"}
          </button>
          {expanded[rec.id] && <div style={{ background:C.surface, borderRadius:10, padding:"12px 14px", fontSize:13, lineHeight:1.8, maxHeight:160, overflowY:"auto", color:C.textDim }}>{rec.original}</div>}
        </div>
      ))}
    </div>
  );
};

const AITab = ({ notes, tasks }) => {
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"こんにちは！ノートやタスクについて質問してください。要約もできます！" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const ctx = "ノート(" + notes.length + "件):\n" +
    notes.map(n => n.title + ": " + n.body).join("\n") +
    "\nタスク(" + tasks.length + "件):\n" +
    tasks.map(t => (t.done?"[完了]":"[未完了]") + " " + t.text).join("\n");

  const send = async () => {
    if (!input.trim() || loading) return;
    const um = { role:"user", content:input.trim() };
    setMsgs(prev=>[...prev,um]); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"あなたは日本語AIアシスタントです。ユーザーのノートとタスクを参照してください。\n\n" + ctx,
          messages:[...msgs, um]
        })
      });
      const data = await res.json();
      setMsgs(prev=>[...prev,{role:"assistant",content:data.content?.map(b=>b.text||"").join("")||"エラーが発生しました"}]);
    } catch { setMsgs(prev=>[...prev,{role:"assistant",content:"接続に失敗しました"}]); }
    finally { setLoading(false); }
  };

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
        <h2 style={{ fontFamily:"'Syne'", fontWeight:800, fontSize:22 }}>AI アシスタント</h2>
        <p style={{ color:C.textDim, fontSize:12, marginTop:4 }}>ノート{notes.length}件・タスク{tasks.length}件を参照中</p>
      </div>
      <div style={{ padding:"10px 16px", display:"flex", gap:8, borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
        {["ノートを要約","未完了タスクを確認","優先順位アドバイス"].map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ background:C.accentDim, border:`1px solid ${C.accent}44`, color:C.accent, borderRadius:20, padding:"5px 14px", fontSize:12, cursor:"pointer" }}>{q}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:14 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"82%", padding:"12px 16px", fontSize:14, lineHeight:1.65,
              borderRadius: m.role==="user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role==="user" ? C.accent : C.card,
              color: m.role==="user" ? "#000" : C.text,
              border: m.role==="assistant" ? `1px solid ${C.border}` : "none"
            }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ display:"flex" }}><div className="pu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"12px 18px", fontSize:14, color:C.textDim }}>考え中...</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="質問を入力..." style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:22, padding:"12px 18px", color:C.text, outline:"none", fontSize:14 }} />
        <button onClick={send} disabled={loading} style={{ background:loading?C.border:C.accent, color:"#000", border:"none", borderRadius:22, padding:"12px 18px", fontWeight:700, cursor:loading?"default":"pointer", fontSize:16 }}>
          {">"}
        </button>
      </div>
    </div>
  );
};

const BoardTab = () => {
  const ref = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#f5a623");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState("pen");
  const last = useRef(null);

  const getPos = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x:src.clientX-rect.left, y:src.clientY-rect.top };
  };
  const startDraw = (e) => {
    e.preventDefault(); setDrawing(true);
    const pos = getPos(e); last.current = pos;
    const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.arc(pos.x, pos.y, (tool==="eraser"?size*4:size)/2, 0, Math.PI*2);
    ctx.fillStyle = tool==="eraser" ? C.card : color; ctx.fill();
  };
  const draw = useCallback((e) => {
    if (!drawing) return; e.preventDefault();
    const pos = getPos(e);
    const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool==="eraser" ? C.card : color;
    ctx.lineWidth = tool==="eraser" ? size*5 : size;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    last.current = pos;
  }, [drawing, color, size, tool]);
  const endDraw = () => { setDrawing(false); last.current=null; };
  const clear = () => { const c=ref.current; c.getContext("2d").clearRect(0,0,c.width,c.height); };

  useEffect(() => {
    const c = ref.current;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
  }, []);

  const PALETTE = ["#f5a623","#4ade80","#60a5fa","#f87171","#e879f9","#ffffff","#aaa"];

  return (
    <div className="fi" style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:6 }}>
          {PALETTE.map(col => (
            <button key={col} onClick={()=>{setColor(col);setTool("pen");}} style={{ width:22, height:22, borderRadius:"50%", background:col, border:color===col&&tool==="pen"?"3px solid white":"2px solid transparent", cursor:"pointer" }} />
          ))}
        </div>
        <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
          {[2,5,10].map(s => (
            <button key={s} onClick={()=>setSize(s)} style={{ width:28, height:28, borderRadius:6, background:size===s?C.accent:C.card, border:`1px solid ${C.border}`, color:size===s?"#000":C.text, cursor:"pointer", fontSize:11, fontWeight:700 }}>{s}</button>
          ))}
          <button onClick={()=>setTool(t=>t==="eraser"?"pen":"eraser")} style={{ padding:"0 12px", height:28, borderRadius:6, background:tool==="eraser"?C.accent:C.card, border:`1px solid ${C.border}`, color:tool==="eraser"?"#000":C.text, cursor:"pointer", fontSize:13 }}>消</button>
          <button onClick={clear} style={{ padding:"0 12px", height:28, borderRadius:6, background:C.card, border:`1px solid ${C.border}`, color:C.red, cursor:"pointer", fontSize:12, fontWeight:600 }}>全消去</button>
        </div>
      </div>
      <canvas ref={ref} style={{ flex:1, background:C.card, cursor:tool==="eraser"?"cell":"crosshair", touchAction:"none" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
    </div>
  );
};

export default function App() {
  const [tab, setTab] = useState("notes");
  const [notes, setNotes] = useState([{ id:1, title:"はじめてのノート", body:"このアプリへようこそ！\n自由にメモを書いてください。", date:"2026/3/19" }]);
  const [tasks, setTasks] = useState([
    { id:1, text:"アプリの使い方を確認する", done:false },
    { id:2, text:"ノートを書いてみる", done:true },
  ]);

  const renderTab = () => {
    if (tab==="notes")   return <NotesTab notes={notes} setNotes={setNotes} />;
    if (tab==="tasks")   return <TasksTab tasks={tasks} setTasks={setTasks} />;
    if (tab==="summary") return <SummaryTab />;
    if (tab==="ai")      return <AITab notes={notes} tasks={tasks} />;
    if (tab==="board")   return <BoardTab />;
    return null;
  };

  return (
    <>
      <GS />
      <div style={{ maxWidth:430, margin:"0 auto", height:"100dvh", display:"flex", flexDirection:"column", background:C.bg, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
          <div style={{ fontFamily:"'Syne'", fontWeight:800, fontSize:18, letterSpacing:"-0.5px" }}>
            <span style={{ color:C.accent }}>●</span> StudyPad
          </div>
        </div>
        <div style={{ flex:1, overflowY:tab==="board"?"hidden":"auto", paddingBottom:70 }}>
          {renderTab()}
        </div>
        <TabBar active={tab} onSelect={setTab} />
      </div>
    </>
  );
}
