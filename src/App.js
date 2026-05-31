import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";

const P = "#d60006", S = "#005da8", WHITE = "#fff", LIGHT = "#f8f9fb", DARK = "#111827", GRAY = "#6b7280", BORDER = "#e5e7eb";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes scaleIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-up { animation: fadeUp 0.4s cubic-bezier(.22,.68,0,1.2) both; }
    .fade-in { animation: fadeIn 0.3s ease both; }
    .scale-in { animation: scaleIn 0.3s cubic-bezier(.22,.68,0,1.2) both; }
    .nav-item { transition: all 0.2s ease; }
    .nav-item:hover { background: #fff5f5 !important; color: ${P} !important; }
    .btn-primary { transition: all 0.2s ease; }
    .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(214,0,6,0.35); }
    .btn-primary:active { transform: translateY(0); }
    .btn-secondary { transition: all 0.2s ease; }
    .btn-secondary:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,93,168,0.35); }
    .btn-ghost { transition: all 0.2s ease; }
    .btn-ghost:hover { background: ${LIGHT} !important; }
    .btn-danger { transition: all 0.2s ease; }
    .btn-danger:hover { background: #fecaca !important; }
    .stat-card { transition: transform 0.25s ease, box-shadow 0.25s ease; cursor: default; }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.13); }
    .table-row { transition: background 0.15s ease; }
    .table-row:hover td { background: #fafafa; }
    .card { transition: box-shadow 0.2s ease; }
    .card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.09); }
    .tag-btn { transition: all 0.18s ease; }
    .tag-btn:hover { border-color: ${P} !important; color: ${P} !important; }
    .input-field { transition: border 0.2s ease, box-shadow 0.2s ease; }
    .input-field:focus { border-color: ${S} !important; box-shadow: 0 0 0 3px rgba(0,93,168,0.12); outline: none; }
    .modal-overlay { animation: fadeIn 0.2s ease both; }
    .modal-card { animation: scaleIn 0.25s cubic-bezier(.22,.68,0,1.2) both; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
  `}</style>
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const toMins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHrs = m => { const h = Math.floor(Math.abs(m) / 60), mn = Math.abs(m) % 60; return `${h}h${mn > 0 ? mn + "m" : ""}`; };
const initials = n => n.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
function calcExtra(entry, exit) {
  const s = toMins(entry), e = toMins(exit), total = e - s;
  let extra = 0;
  if (s < 480) extra += 480 - s;
  if (e > 1080) extra += e - 1080;
  return { total, normal: Math.max(total - extra, 0), extra };
}

function generatePDF(emp, records, projects, month, year) {
  let tN = 0, tE = 0;
  const rows = records.map(r => {
    const { normal, extra, total } = calcExtra(r.entry, r.exit); tN += normal; tE += extra;
    const proj = projects.find(p => p.id === r.projectId);
    return `<tr><td>${r.date}</td><td>${r.entry}</td><td>${r.exit}</td><td>${toHrs(total)}</td><td>${toHrs(normal)}</td><td style="color:${extra > 0 ? "#d60006" : "#16a34a"};font-weight:700">${toHrs(extra)}</td><td>${proj?.name || "-"}</td><td>${r.location === "external" ? "Externo" : "Oficina"}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{color:#d60006}h2{color:#005da8;font-size:16px;margin-bottom:24px}.sum{display:flex;gap:20px;margin-bottom:24px}.s{border-radius:10px;padding:16px 22px;color:#fff;min-width:130px}.s1{background:#005da8}.s2{background:#d60006}.s3{background:#16a34a}.sn{font-size:28px;font-weight:800}.sl{font-size:12px;margin-top:2px;opacity:.85}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;padding:9px 10px;text-align:left;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:12px}td{padding:9px 10px;border-bottom:1px solid #e5e7eb}.foot{margin-top:32px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px}</style>
  </head><body>
  <h1>Relatório Mensal de Horas</h1><h2>${emp?.name} — ${String(month).padStart(2, "0")}/${year}</h2>
  <div class="sum"><div class="s s1"><div class="sn">${records.length}</div><div class="sl">Dias Trabalhados</div></div><div class="s s2"><div class="sn">${toHrs(tE)}</div><div class="sl">Horas Extras</div></div><div class="s s3"><div class="sn">${toHrs(tN)}</div><div class="sl">Horas Normais</div></div></div>
  <table><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Total</th><th>Normal</th><th>Extra</th><th>Projeto</th><th>Local</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="foot">Gerado em ${new Date().toLocaleDateString("pt-PT")} — Ponto Pronto</div></body></html>`;
  const w = window.open("", "_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const Inp = ({ style, ...p }) => <input className="input-field" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, background: WHITE, color: DARK, ...style }} {...p} />;
const Sel = ({ style, ...p }) => <select className="input-field" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, background: WHITE, color: DARK, ...style }} {...p} />;

function Btn({ variant = "primary", children, style, ...p }) {
  const base = { padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${P}, #ff2222)`, color: WHITE },
    secondary: { background: `linear-gradient(135deg, ${S}, #0077cc)`, color: WHITE },
    ghost: { background: "transparent", color: GRAY, border: `1.5px solid ${BORDER}` },
    danger: { background: "#fee2e2", color: "#dc2626", border: "1.5px solid #fecaca" },
  };
  return <button className={`btn-${variant}`} style={{ ...base, ...variants[variant], ...style }} {...p}>{children}</button>;
}

function Badge({ color, children }) {
  const c = { green: ["#dcfce7","#16a34a"], red: ["#fee2e2","#dc2626"], blue: ["#dbeafe","#1d4ed8"], gray: ["#f3f4f6",GRAY], purple: ["#ede9fe","#7c3aed"] }[color] || ["#f3f4f6", GRAY];
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600, background:c[0], color:c[1] }}>{children}</span>;
}

function Card({ children, style, delay = 0 }) {
  return <div className="card fade-up" style={{ background: WHITE, borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: `1px solid ${BORDER}`, animationDelay: `${delay}ms`, ...style }}>{children}</div>;
}

function StatCard({ num, label, color, icon, delay = 0 }) {
  return (
    <div className="stat-card fade-up" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, borderRadius: 16, padding: "22px 24px", color: WHITE, boxShadow: `0 4px 16px ${color}44`, animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>{num}</div><div style={{ fontSize: 13, opacity: .85, marginTop: 4, fontWeight: 500 }}>{label}</div></div>
        <div style={{ fontSize: 26, opacity: .7 }}>{icon}</div>
      </div>
    </div>
  );
}

function Alert({ type, children }) {
  const c = { success:["#dcfce7","#16a34a"], error:["#fee2e2","#dc2626"], info:["#dbeafe","#1d4ed8"] }[type] || ["#dbeafe","#1d4ed8"];
  return <div className="fade-up" style={{ padding:"12px 16px", borderRadius:10, marginBottom:16, fontSize:14, background:c[0], color:c[1], fontWeight:500, display:"flex", alignItems:"center", gap:8 }}>{children}</div>;
}

function Spinner({ full }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: full ? "100vh" : 200, flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:`4px solid ${BORDER}`, borderTop:`4px solid ${P}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ color:GRAY, fontSize:14 }}>A carregar...</span>
    </div>
  );
}

const TH = ({ children }) => <th style={{ textAlign:"left", padding:"10px 12px", background:LIGHT, color:GRAY, fontWeight:600, fontSize:12, borderBottom:`1px solid ${BORDER}` }}>{children}</th>;
const TD = ({ children, style }) => <td style={{ padding:"12px", borderBottom:`1px solid ${BORDER}`, ...style }}>{children}</td>;

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function LoginPage() {
  const [email, setEmail] = useState(""), [pass, setPass] = useState(""), [err, setErr] = useState(""), [loading, setLoading] = useState(false), [showPass, setShowPass] = useState(false);
  const handle = async () => {
    if (!email || !pass) { setErr("Preencha email e senha."); return; }
    setLoading(true); setErr("");
    try { await signInWithEmailAndPassword(auth, email, pass); }
    catch { setErr("Email ou senha incorretos."); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg, ${P} 0%, #a00004 40%, ${S} 100%)` }}>
      <div className="scale-in" style={{ background:WHITE, borderRadius:24, padding:44, width:380, boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg, ${P}, #ff3333)`, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16, boxShadow:`0 8px 24px ${P}55` }}>
            <span style={{ fontSize:28 }}>⏱</span>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:DARK }}>TimeTrack</div>
          <div style={{ fontSize:14, color:GRAY, marginTop:4 }}>Sistema de Marcação de Horas</div>
        </div>
        {err && <Alert type="error">⚠️ {err}</Alert>}
        <div style={{ marginBottom:14 }}><label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:6, display:"block" }}>Email</label><Inp type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
        <div style={{ marginBottom:20 }}><label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:6, display:"block" }}>Senha</label>
          <div style={{ position:"relative" }}>
            <Inp type={showPass?"text":"password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === "Enter" && handle()} style={{ paddingRight:44 }} />
            <button onClick={() => setShowPass(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:18, color:GRAY, padding:0 }}>{showPass ? "🙈" : "👁"}</button>
          </div>
        </div>
        <Btn variant="primary" style={{ width:"100%", justifyContent:"center", padding:13, fontSize:15 }} onClick={handle} disabled={loading}>
          {loading ? <><div style={{ width:16, height:16, border:"2px solid #fff5", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />A entrar...</> : "Entrar →"}
        </Btn>
      </div>
    </div>
  );
}

// ─── EMP DASHBOARD ───────────────────────────────────────────────────────────
function EmpDashboard({ user, records, projects }) {
  const today = new Date().toISOString().split("T")[0];
  const todayRec = records.find(r => r.date === today);
  const totalExtra = records.reduce((a, r) => a + calcExtra(r.entry, r.exit).extra, 0);
  const thisMonth = records.filter(r => r.date.startsWith(new Date().toISOString().slice(0, 7)));
  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Olá, {user.name.split(" ")[0]}! 👋</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        <StatCard num={records.length} label="Dias Registados" color={S} icon="📅" delay={0} />
        <StatCard num={toHrs(totalExtra)} label="Total Horas Extras" color={P} icon="⚡" delay={80} />
        <StatCard num={thisMonth.length} label="Dias este mês" color="#16a34a" icon="📊" delay={160} />
      </div>
      <Card delay={200}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>📅 Hoje — {today}</div>
        {todayRec ? (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[["🟢 Entrada", todayRec.entry], ["🔴 Saída", todayRec.exit], ["📍 Local", todayRec.location === "external" ? "Externo" : "Oficina"], ["📁 Projeto", projects.find(p => p.id === todayRec.projectId)?.name || "-"]].map(([l, v]) => (
              <div key={l} style={{ background:LIGHT, borderRadius:10, padding:"12px 16px", minWidth:110 }}>
                <div style={{ fontSize:11, fontWeight:600, color:GRAY, marginBottom:4 }}>{l}</div>
                <div style={{ fontWeight:700, fontSize:15 }}>{v}</div>
              </div>
            ))}
            <div style={{ background:"#fff0f0", borderRadius:10, padding:"12px 16px", minWidth:110 }}>
              <div style={{ fontSize:11, fontWeight:600, color:GRAY, marginBottom:4 }}>⚡ Extras hoje</div>
              <div style={{ fontWeight:700, fontSize:15, color:P }}>{toHrs(calcExtra(todayRec.entry, todayRec.exit).extra)}</div>
            </div>
          </div>
        ) : <div style={{ color:GRAY, fontSize:14, padding:"16px", background:LIGHT, borderRadius:10 }}>ℹ️ Nenhum registo para hoje. Vá a "Registar Horas".</div>}
      </Card>
      <Card delay={260}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>📋 Últimos Registos</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead><tr>{["Data","Entrada","Saída","Total","Extra","Local","Projeto"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>{[...records].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5).map(r => {
            const { total, extra } = calcExtra(r.entry, r.exit);
            return <tr key={r.id} className="table-row">
              <TD>{r.date}</TD><TD>{r.entry}</TD><TD>{r.exit}</TD><TD>{toHrs(total)}</TD>
              <TD><span style={{ color:extra>0?P:"#16a34a", fontWeight:700 }}>{toHrs(extra)}</span></TD>
              <TD><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Externo":"Oficina"}</Badge></TD>
              <TD>{projects.find(p => p.id === r.projectId)?.name || "-"}</TD>
            </tr>;
          })}</tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── EMP REGISTER ────────────────────────────────────────────────────────────
function EmpRegister({ user, projects }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date:today, entry:"", exit:"", location:"office", projectId:"", notes:"" });
  const [msg, setMsg] = useState(null), [loading, setLoading] = useState(false);
  const active = projects.filter(p => p.status === "active");
  const save = async () => {
    if (!form.entry || !form.exit || !form.projectId) { setMsg({ type:"error", text:"Preencha todos os campos obrigatórios." }); return; }
    if (toMins(form.exit) <= toMins(form.entry)) { setMsg({ type:"error", text:"Saída deve ser depois da entrada." }); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "records"), { ...form, userId: user.uid, createdAt: serverTimestamp() });
      setMsg({ type:"success", text:"✅ Registo guardado com sucesso!" });
      setForm({ date:today, entry:"", exit:"", location:"office", projectId:"", notes:"" });
    } catch { setMsg({ type:"error", text:"Erro ao guardar. Tente novamente." }); }
    setLoading(false);
  };
  const preview = form.entry && form.exit && toMins(form.exit) > toMins(form.entry) ? calcExtra(form.entry, form.exit) : null;
  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Registar Horas</div>
      <Card>
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          {[["Data *","date","date"],["Hora de Entrada *","entry","time"],["Hora de Saída *","exit","time"]].map(([l,k,t]) => (
            <div key={k}><label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:6, display:"block" }}>{l}</label><Inp type={t} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} /></div>
          ))}
          <div><label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:6, display:"block" }}>Projeto *</label>
            <Sel value={form.projectId} onChange={e => setForm({...form,projectId:e.target.value})}>
              <option value="">Selecione um projeto</option>
              {active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:10, display:"block" }}>Local *</label>
          <div style={{ display:"flex", gap:10 }}>
            {[["office","🏢 Oficina"],["external","🏗 Externo"]].map(([v,l]) => (
              <button key={v} className="tag-btn" onClick={() => setForm({...form,location:v})}
                style={{ padding:"10px 20px", borderRadius:10, border:`2px solid ${form.location===v?P:BORDER}`, background:form.location===v?"#fff0f0":WHITE, color:form.location===v?P:GRAY, cursor:"pointer", fontSize:14, fontWeight:form.location===v?700:400, transition:"all 0.2s ease" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:20 }}><label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:6, display:"block" }}>Notas</label><Inp value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Observações..." /></div>
        {preview && (
          <div className="fade-up" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
            {[[S,"⏱ Total",toHrs(preview.total)],["#16a34a","✅ Normal",toHrs(preview.normal)],[preview.extra>0?P:"#9ca3af","⚡ Extra",toHrs(preview.extra)]].map(([c,l,v]) => (
              <div key={l} style={{ background:c, borderRadius:12, padding:"14px 18px", color:WHITE }}>
                <div style={{ fontSize:11, opacity:.8, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:22, fontWeight:800 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        <Btn variant="primary" onClick={save} disabled={loading}>{loading ? "A guardar..." : "💾 Guardar Registo"}</Btn>
      </Card>
    </div>
  );
}

// ─── EMP HISTORY ─────────────────────────────────────────────────────────────
function EmpHistory({ records, projects }) {
  const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date));
  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Meu Histórico</div>
      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead><tr>{["Data","Entrada","Saída","Total","Normal","Extra","Local","Projeto"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>{sorted.map(r => {
            const { total, normal, extra } = calcExtra(r.entry, r.exit);
            return <tr key={r.id} className="table-row">
              <TD>{r.date}</TD><TD>{r.entry}</TD><TD>{r.exit}</TD><TD>{toHrs(total)}</TD><TD>{toHrs(normal)}</TD>
              <TD><span style={{ color:extra>0?P:"#16a34a", fontWeight:700 }}>{toHrs(extra)}</span></TD>
              <TD><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Externo":"Oficina"}</Badge></TD>
              <TD>{projects.find(p => p.id === r.projectId)?.name || "-"}</TD>
            </tr>;
          })}
          {sorted.length === 0 && <tr><td colSpan={8} style={{ padding:"24px", color:GRAY, textAlign:"center" }}>Nenhum registo encontrado.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ allRecords, projects, allUsers }) {
  const emps = allUsers.filter(u => u.role === "employee");
  const totalExtra = allRecords.reduce((a,r) => a + calcExtra(r.entry,r.exit).extra, 0);
  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Dashboard Administrativo</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        <StatCard num={emps.length} label="Funcionários" color={S} icon="👥" delay={0} />
        <StatCard num={projects.filter(p=>p.status==="active").length} label="Projetos Ativos" color={P} icon="🏗" delay={80} />
        <StatCard num={allRecords.length} label="Total Registos" color="#16a34a" icon="📋" delay={160} />
        <StatCard num={toHrs(totalExtra)} label="Horas Extras" color="#7c3aed" icon="⚡" delay={240} />
      </div>
      <Card delay={280}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>👥 Resumo por Funcionário</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead><tr>{["Funcionário","Registos","Horas Normais","Horas Extras","Último Registo"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>{emps.map(emp => {
            const recs = allRecords.filter(r => r.userId === emp.uid);
            const totalN = recs.reduce((a,r) => a + calcExtra(r.entry,r.exit).normal, 0);
            const totalE = recs.reduce((a,r) => a + calcExtra(r.entry,r.exit).extra, 0);
            const last = [...recs].sort((a,b) => b.date.localeCompare(a.date))[0];
            return <tr key={emp.uid} className="table-row">
              <TD><div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${S},#0099ff)`, color:WHITE, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12 }}>{initials(emp.name)}</div>
                <b>{emp.name}</b>
              </div></TD>
              <TD>{recs.length}</TD><TD>{toHrs(totalN)}</TD>
              <TD><span style={{ color:totalE>0?P:"#16a34a", fontWeight:700 }}>{toHrs(totalE)}</span></TD>
              <TD>{last?.date || "—"}</TD>
            </tr>;
          })}</tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── ADMIN PROJECTS ───────────────────────────────────────────────────────────
function AdminProjects({ projects }) {
  const [name, setName] = useState(""), [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null), [confirmDelete, setConfirmDelete] = useState(null);

  const add = async () => {
    if (!name.trim()) return;
    await addDoc(collection(db, "projects"), { name: name.trim(), status: "active", createdAt: serverTimestamp() });
    setName(""); setMsg({ type:"success", text:"✅ Projeto criado!" }); setTimeout(() => setMsg(null), 2000);
  };
  const toggle = async p => await updateDoc(doc(db,"projects",p.id), { status: p.status==="active"?"archived":"active" });
  const saveEdit = async () => {
    if (!editing.name.trim()) return;
    await updateDoc(doc(db,"projects",editing.id), { name: editing.name.trim() });
    setEditing(null); setMsg({ type:"success", text:"✅ Atualizado!" }); setTimeout(() => setMsg(null), 2000);
  };
  const del = async () => { await deleteDoc(doc(db,"projects",confirmDelete.id)); setConfirmDelete(null); };

  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Gestão de Projetos</div>
      {confirmDelete && (
        <div className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(3px)" }}>
          <div className="modal-card" style={{ background:WHITE, borderRadius:20, padding:32, width:380, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>🗑 Remover Projeto</div>
            <div style={{ fontSize:14, color:GRAY, marginBottom:24 }}>Tens a certeza que queres remover <b>"{confirmDelete.name}"</b>?</div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={del}>🗑 Remover</Btn>
            </div>
          </div>
        </div>
      )}
      <Card>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Novo Projeto</div>
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        <div style={{ display:"flex", gap:10 }}>
          <Inp style={{ flex:1 }} placeholder="Nome do projeto" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter" && add()} />
          <Btn variant="primary" onClick={add}>+ Adicionar</Btn>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Projetos ({projects.length})</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead><tr>{["Nome","Estado","Ações"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>{projects.map(p => (
            <tr key={p.id} className="table-row">
              <TD>{editing?.id===p.id
                ? <div style={{ display:"flex", gap:8 }}>
                    <Inp style={{ flex:1 }} value={editing.name} onChange={e => setEditing({...editing,name:e.target.value})} onKeyDown={e => e.key==="Enter" && saveEdit()} autoFocus />
                    <Btn variant="primary" style={{ padding:"8px 14px" }} onClick={saveEdit}>✓</Btn>
                    <Btn variant="ghost" style={{ padding:"8px 14px" }} onClick={() => setEditing(null)}>✕</Btn>
                  </div>
                : <b>{p.name}</b>}
              </TD>
              <TD><Badge color={p.status==="active"?"green":"gray"}>{p.status==="active"?"Ativo":"Arquivado"}</Badge></TD>
              <TD><div style={{ display:"flex", gap:8 }}>
                <Btn variant="ghost" style={{ fontSize:13, padding:"6px 12px" }} onClick={() => setEditing({id:p.id,name:p.name})}>✏️ Editar</Btn>
                <Btn variant="ghost" style={{ fontSize:13, padding:"6px 12px" }} onClick={() => toggle(p)}>{p.status==="active"?"📦 Arquivar":"✅ Ativar"}</Btn>
                <Btn variant="danger" style={{ fontSize:13, padding:"6px 12px" }} onClick={() => setConfirmDelete(p)}>🗑</Btn>
              </div></TD>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── ADMIN RECORDS ────────────────────────────────────────────────────────────
function AdminRecords({ allRecords, projects, allUsers }) {
  const emps = allUsers.filter(u => u.role === "employee");
  const [filterUser, setFilterUser] = useState("all");
  const filtered = filterUser==="all" ? allRecords : allRecords.filter(r => r.userId===filterUser);
  const sorted = [...filtered].sort((a,b) => b.date.localeCompare(a.date));
  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Todos os Registos</div>
      <Card>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {[["all","Todos"], ...emps.map(e => [e.uid,e.name])].map(([id,label]) => (
            <button key={id} className="tag-btn" onClick={() => setFilterUser(id)}
              style={{ padding:"8px 16px", borderRadius:20, border:`2px solid ${filterUser===id?P:BORDER}`, background:filterUser===id?"#fff0f0":WHITE, color:filterUser===id?P:GRAY, cursor:"pointer", fontSize:13, fontWeight:filterUser===id?700:400, transition:"all 0.2s ease" }}>
              {label}
            </button>
          ))}
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead><tr>{["Funcionário","Data","Entrada","Saída","Normal","Extra","Local","Projeto"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>{sorted.map(r => {
            const { normal, extra } = calcExtra(r.entry, r.exit);
            const emp = allUsers.find(u => u.uid===r.userId);
            return <tr key={r.id} className="table-row">
              <TD><div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${S},#0099ff)`, color:WHITE, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:11 }}>{emp?initials(emp.name):"?"}</div>
                <b>{emp?.name||"—"}</b>
              </div></TD>
              <TD>{r.date}</TD><TD>{r.entry}</TD><TD>{r.exit}</TD><TD>{toHrs(normal)}</TD>
              <TD><span style={{ color:extra>0?P:"#16a34a", fontWeight:700 }}>{toHrs(extra)}</span></TD>
              <TD><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Externo":"Oficina"}</Badge></TD>
              <TD>{projects.find(p => p.id===r.projectId)?.name||"—"}</TD>
            </tr>;
          })}
          {sorted.length===0 && <tr><td colSpan={8} style={{ padding:"24px", color:GRAY, textAlign:"center" }}>Nenhum registo.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── ADMIN USERS ─────────────────────────────────────────────────────────────
function AdminUsers({ allUsers }) {
  const emps = allUsers.filter(u => u.role === "employee");
  const [confirmDelete, setConfirmDelete] = useState(null), [msg, setMsg] = useState(null);

  const handleDelete = async u => {
    await deleteDoc(doc(db, "users", u.uid));
    setConfirmDelete(null);
    setMsg({ type:"success", text:`${u.name} removido. Lembra-te de remover também no Firebase Authentication.` });
    setTimeout(() => setMsg(null), 6000);
  };

  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Gestão de Funcionários</div>
      {confirmDelete && (
        <div className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(3px)" }}>
          <div className="modal-card" style={{ background:WHITE, borderRadius:20, padding:32, width:400, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>🗑 Remover Funcionário</div>
            <div style={{ fontSize:14, color:GRAY, marginBottom:12 }}>Tens a certeza que queres remover <b>{confirmDelete.name}</b>?</div>
            <Alert type="info">⚠️ Remove o acesso à app mas deves também remover no <b>Firebase Console → Authentication</b>.</Alert>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={() => handleDelete(confirmDelete)}>🗑 Remover</Btn>
            </div>
          </div>
        </div>
      )}
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <Card>
        <Alert type="info">ℹ️ Para adicionar funcionários, acede ao <b>Firebase Console → Authentication → Adicionar utilizador</b> e cria o documento em <b>Firestore → users</b> com <code>role: "employee"</code>.
          <div style={{ marginTop:10 }}><a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"><Btn variant="secondary" style={{ fontSize:13, padding:"8px 14px" }}>🔗 Abrir Firebase Console</Btn></a></div>
        </Alert>
      </Card>
      <Card>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>👥 Funcionários ({emps.length})</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {emps.length === 0
            ? <div style={{ color:GRAY, fontSize:14, padding:"20px", background:LIGHT, borderRadius:10, textAlign:"center" }}>Nenhum funcionário ainda.</div>
            : emps.map(u => (
              <div key={u.uid} className="fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", background:LIGHT, borderRadius:12, border:`1px solid ${BORDER}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${S},#0099ff)`, color:WHITE, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14 }}>{initials(u.name)}</div>
                  <div><div style={{ fontWeight:700, fontSize:15 }}>{u.name}</div><div style={{ fontSize:13, color:GRAY }}>{u.email}</div></div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Badge color="blue">Funcionário</Badge>
                  <Btn variant="danger" style={{ fontSize:13, padding:"6px 12px" }} onClick={() => setConfirmDelete(u)}>🗑</Btn>
                </div>
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
}

// ─── ADMIN REPORTS ────────────────────────────────────────────────────────────
function AdminReports({ allRecords, projects, allUsers }) {
  const emps = allUsers.filter(u => u.role === "employee");
  const [selUser, setSelUser] = useState(emps[0]?.uid || "");
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const emp = allUsers.find(u => u.uid === selUser);
  const filtered = allRecords.filter(r => { const [y,m] = r.date.split("-"); return r.userId===selUser && parseInt(y)===selYear && parseInt(m)===selMonth; }).sort((a,b) => a.date.localeCompare(b.date));
  const totalN = filtered.reduce((a,r) => a + calcExtra(r.entry,r.exit).normal, 0);
  const totalE = filtered.reduce((a,r) => a + calcExtra(r.entry,r.exit).extra, 0);
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return (
    <div>
      <div className="fade-up" style={{ fontSize:24, fontWeight:800, marginBottom:24 }}>Relatórios</div>
      <Card>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Gerar Relatório Mensal</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
          {[["Funcionário", <Sel value={selUser} onChange={e => setSelUser(e.target.value)}>{emps.map(e => <option key={e.uid} value={e.uid}>{e.name}</option>)}</Sel>],
            ["Mês", <Sel value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}>{months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</Sel>],
            ["Ano", <Sel value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}>{[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}</Sel>]
          ].map(([l,el]) => <div key={l}><label style={{ fontSize:13, fontWeight:600, color:GRAY, marginBottom:6, display:"block" }}>{l}</label>{el}</div>)}
        </div>
        {filtered.length > 0 ? <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
            <StatCard num={filtered.length} label="Dias Trabalhados" color={S} icon="📅" />
            <StatCard num={toHrs(totalN)} label="Horas Normais" color="#16a34a" icon="✅" />
            <StatCard num={toHrs(totalE)} label="Horas Extras" color={P} icon="⚡" />
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14, marginBottom:20 }}>
            <thead><tr>{["Data","Entrada","Saída","Normal","Extra","Local","Projeto"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{filtered.map(r => {
              const { normal, extra } = calcExtra(r.entry, r.exit);
              return <tr key={r.id} className="table-row">
                <TD>{r.date}</TD><TD>{r.entry}</TD><TD>{r.exit}</TD><TD>{toHrs(normal)}</TD>
                <TD><span style={{ color:extra>0?P:"#16a34a", fontWeight:700 }}>{toHrs(extra)}</span></TD>
                <TD><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Externo":"Oficina"}</Badge></TD>
                <TD>{projects.find(p => p.id===r.projectId)?.name||"—"}</TD>
              </tr>;
            })}</tbody>
          </table>
          <Btn variant="primary" onClick={() => generatePDF(emp, filtered, projects, selMonth, selYear)}>🖨 Imprimir / Exportar PDF</Btn>
        </> : <div style={{ color:GRAY, fontSize:14, padding:"20px", background:LIGHT, borderRadius:10, textAlign:"center" }}>ℹ️ Nenhum registo para este período.</div>}
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authUser, setAuthUser] = useState(undefined);
  const [userDoc, setUserDoc] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setUserDoc(snap.exists() ? { uid:u.uid, ...snap.data() } : { uid:u.uid, name:u.email, role:"employee" });
        setAuthUser(u);
      } else { setAuthUser(null); setUserDoc(null); }
    });
  }, []);

  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(collection(db, "projects"), snap => setProjects(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !userDoc) return;
    const q = userDoc.role === "admin" ? collection(db,"records") : query(collection(db,"records"), where("userId","==",authUser.uid));
    return onSnapshot(q, snap => setRecords(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  }, [authUser, userDoc]);

  useEffect(() => {
    if (!userDoc || userDoc.role !== "admin") return;
    return onSnapshot(collection(db,"users"), snap => setAllUsers(snap.docs.map(d => ({ uid:d.id, ...d.data() }))));
  }, [userDoc]);

  if (authUser === undefined) return <><GlobalStyles /><Spinner full /></>;
  if (!authUser) return <><GlobalStyles /><LoginPage /></>;
  if (!userDoc) return <><GlobalStyles /><Spinner full /></>;

  const isAdmin = userDoc.role === "admin";
  const adminNav = [
    { id:"dashboard", label:"Dashboard", icon:"📊" },
    { id:"records", label:"Registos", icon:"📋" },
    { id:"projects", label:"Projetos", icon:"🏗" },
    { id:"users", label:"Funcionários", icon:"👥" },
    { id:"reports", label:"Relatórios", icon:"📄" },
  ];
  const empNav = [
    { id:"dashboard", label:"Início", icon:"🏠" },
    { id:"register", label:"Registar Horas", icon:"⏱" },
    { id:"history", label:"Meu Histórico", icon:"📋" },
  ];
  const nav = isAdmin ? adminNav : empNav;

  const renderPage = () => {
    if (isAdmin) {
      if (page==="dashboard") return <AdminDashboard allRecords={records} projects={projects} allUsers={allUsers} />;
      if (page==="records") return <AdminRecords allRecords={records} projects={projects} allUsers={allUsers} />;
      if (page==="projects") return <AdminProjects projects={projects} />;
      if (page==="users") return <AdminUsers allUsers={allUsers} />;
      if (page==="reports") return <AdminReports allRecords={records} projects={projects} allUsers={allUsers} />;
    } else {
      if (page==="dashboard") return <EmpDashboard user={userDoc} records={records} projects={projects} />;
      if (page==="register") return <EmpRegister user={userDoc} projects={projects} />;
      if (page==="history") return <EmpHistory records={records} projects={projects} />;
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ fontFamily:"'Segoe UI',sans-serif", minHeight:"100vh", background:LIGHT, color:DARK }}>
        <header style={{ background:WHITE, borderBottom:`1px solid ${BORDER}`, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:`linear-gradient(135deg,${P},#ff3333)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⏱</div>
            <span style={{ background:`linear-gradient(135deg,${P},${S})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Ponto Pronto</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14, fontWeight:700 }}>{userDoc.name}</div>
              <div style={{ fontSize:12, color:GRAY }}>{isAdmin?"Administrador":"Funcionário"}</div>
            </div>
            <div style={{ width:38, height:38, borderRadius:"50%", background:isAdmin?`linear-gradient(135deg,${P},#ff3333)`:`linear-gradient(135deg,${S},#0099ff)`, color:WHITE, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14 }}>{initials(userDoc.name)}</div>
            <button className="btn-ghost" onClick={() => signOut(auth)} style={{ padding:"8px 16px", borderRadius:10, border:`1.5px solid ${BORDER}`, background:"transparent", color:GRAY, cursor:"pointer", fontSize:13, fontWeight:600 }}>Sair</button>
          </div>
        </header>
        <div style={{ display:"flex", minHeight:"calc(100vh - 64px)" }}>
          <aside style={{ width:230, background:WHITE, borderRight:`1px solid ${BORDER}`, padding:"20px 12px", display:"flex", flexDirection:"column", position:"sticky", top:64, height:"calc(100vh - 64px)", overflowY:"auto" }}>
            <div style={{ fontSize:11, fontWeight:700, color:GRAY, letterSpacing:1, marginBottom:8, paddingLeft:12 }}>MENU</div>
            {nav.map(n => (
              <div key={n.id} className="nav-item" onClick={() => setPage(n.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer", fontSize:14, fontWeight:page===n.id?700:500, color:page===n.id?P:DARK, background:page===n.id?"#fff0f0":"transparent", borderRadius:10, marginBottom:2, borderLeft:page===n.id?`3px solid ${P}`:"3px solid transparent", transition:"all 0.2s ease" }}>
                <span style={{ fontSize:18 }}>{n.icon}</span>{n.label}
                {page===n.id && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:P }} />}
              </div>
            ))}
            <div style={{ marginTop:"auto", padding:"12px", background:LIGHT, borderRadius:12 }}>
              <div style={{ fontSize:11, color:GRAY, marginBottom:4 }}>Sessão ativa</div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>{userDoc.name.split(" ")[0]}</div>
              <Badge color={isAdmin?"red":"blue"}>{isAdmin?"Admin":"Funcionário"}</Badge>
            </div>
          </aside>
          <main key={page} className="fade-up" style={{ flex:1, padding:32, overflowY:"auto" }}>
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}