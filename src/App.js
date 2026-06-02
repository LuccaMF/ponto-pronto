import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";

const P = "#d60006", S = "#005da8", WHITE = "#fff", LIGHT = "#f8f9fb", DARK = "#111827", GRAY = "#6b7280", BORDER = "#e5e7eb";

// ─── GLOBAL STYLES (Mobile First) ────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Segoe UI', system-ui, sans-serif; background: ${LIGHT}; color: ${DARK}; -webkit-text-size-adjust: 100%; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin { to { transform:rotate(360deg); } }

    .fade-up { animation: fadeUp 0.35s cubic-bezier(.22,.68,0,1.2) both; }
    .scale-in { animation: scaleIn 0.3s cubic-bezier(.22,.68,0,1.2) both; }
    .slide-down { animation: slideDown 0.25s ease both; }
    .modal-bg { animation: fadeIn 0.2s ease both; }

    /* Inputs */
    .inp { width:100%; padding:12px 14px; border-radius:12px; border:1.5px solid ${BORDER}; font-size:16px; background:${WHITE}; color:${DARK}; outline:none; transition:border 0.2s, box-shadow 0.2s; -webkit-appearance:none; }
    .inp:focus { border-color:${S}; box-shadow:0 0 0 3px rgba(0,93,168,0.1); }
    select.inp { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:36px; }

    /* Buttons */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:13px 20px; border-radius:12px; border:none; cursor:pointer; font-size:15px; font-weight:600; transition:all 0.2s; -webkit-tap-highlight-color:transparent; }
    .btn:active { transform:scale(0.97); }
    .btn-primary { background:linear-gradient(135deg,${P},#ff2222); color:${WHITE}; }
    .btn-primary:hover { filter:brightness(1.08); box-shadow:0 4px 14px rgba(214,0,6,0.3); }
    .btn-secondary { background:linear-gradient(135deg,${S},#0077cc); color:${WHITE}; }
    .btn-ghost { background:transparent; color:${GRAY}; border:1.5px solid ${BORDER}; }
    .btn-ghost:hover { background:${LIGHT}; }
    .btn-danger { background:#fee2e2; color:#dc2626; border:1.5px solid #fecaca; }
    .btn-sm { padding:8px 14px; font-size:13px; border-radius:10px; }
    .btn-full { width:100%; }

    /* Cards */
    .card { background:${WHITE}; border-radius:16px; padding:20px; margin-bottom:16px; box-shadow:0 1px 6px rgba(0,0,0,0.07); border:1px solid ${BORDER}; }

    /* Stat cards */
    .stat-card { border-radius:14px; padding:18px 20px; color:${WHITE}; transition:transform 0.2s; }
    .stat-card:active { transform:scale(0.98); }

    /* Nav */
    .nav-item { display:flex; align-items:center; gap:10px; padding:13px 16px; cursor:pointer; font-size:15px; border-radius:12px; margin-bottom:4px; transition:all 0.18s; -webkit-tap-highlight-color:transparent; }
    .nav-item:active { transform:scale(0.98); }

    /* Table */
    .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:10px; }
    table { width:100%; border-collapse:collapse; font-size:14px; }
    th { text-align:left; padding:10px 12px; background:${LIGHT}; color:${GRAY}; font-weight:600; font-size:12px; border-bottom:1px solid ${BORDER}; white-space:nowrap; }
    td { padding:12px; border-bottom:1px solid ${BORDER}; white-space:nowrap; }
    tr:hover td { background:#fafafa; }

    /* Tag buttons */
    .tag-btn { padding:8px 16px; border-radius:20px; font-size:13px; font-weight:500; cursor:pointer; border:2px solid ${BORDER}; background:${WHITE}; color:${GRAY}; transition:all 0.18s; -webkit-tap-highlight-color:transparent; }
    .tag-btn.active { border-color:${P}; background:#fff0f0; color:${P}; font-weight:700; }

    /* Alert */
    .alert { padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:14px; font-weight:500; display:flex; align-items:flex-start; gap:8px; }
    .alert-success { background:#dcfce7; color:#16a34a; }
    .alert-error { background:#fee2e2; color:#dc2626; }
    .alert-info { background:#dbeafe; color:#1d4ed8; }

    /* Grid — mobile first (1 col) */
    .grid-2 { display:grid; grid-template-columns:1fr; gap:12px; }
    .grid-3 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
    .grid-4 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }

    /* Sidebar — hidden on mobile */
    .sidebar { display:none; }

    /* Scrollbar */
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:3px; }

    /* ── Desktop (768px+) ── */
    @media (min-width: 768px) {
      .grid-2 { grid-template-columns:1fr 1fr; }
      .grid-3 { grid-template-columns:repeat(3,1fr); }
      .grid-4 { grid-template-columns:repeat(4,1fr); }
      .sidebar { display:flex !important; }
      .mobile-menu-btn { display:none !important; }
      .mobile-nav { display:none !important; }
      .main-pad { padding:32px !important; }
      .card { padding:24px; }
      .inp { font-size:14px; }
      .btn { font-size:14px; padding:10px 20px; }
    }
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
    return `<tr><td>${r.date}</td><td>${r.entry}</td><td>${r.exit}</td><td>${toHrs(total)}</td><td>${toHrs(normal)}</td><td style="color:${extra>0?"#d60006":"#16a34a"};font-weight:700">${toHrs(extra)}</td><td>${proj?.name||"-"}</td><td>${r.location==="external"?"Externo":"Oficina"}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{color:#d60006}h2{color:#005da8;font-size:16px;margin-bottom:24px}.sum{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}.s{border-radius:10px;padding:14px 20px;color:#fff}.s1{background:#005da8}.s2{background:#d60006}.s3{background:#16a34a}.sn{font-size:26px;font-weight:800}.sl{font-size:12px;opacity:.85}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;padding:9px;text-align:left;border-bottom:2px solid #e5e7eb;color:#6b7280;font-size:12px}td{padding:9px;border-bottom:1px solid #e5e7eb}.foot{margin-top:28px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:10px}</style>
  </head><body><h1>Relatório Mensal de Horas</h1><h2>${emp?.name} — ${String(month).padStart(2,"0")}/${year}</h2>
  <div class="sum"><div class="s s1"><div class="sn">${records.length}</div><div class="sl">Dias</div></div><div class="s s2"><div class="sn">${toHrs(tE)}</div><div class="sl">Extras</div></div><div class="s s3"><div class="sn">${toHrs(tN)}</div><div class="sl">Normais</div></div></div>
  <table><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Total</th><th>Normal</th><th>Extra</th><th>Projeto</th><th>Local</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="foot">Gerado em ${new Date().toLocaleDateString("pt-PT")} — Ponto Pronto</div></body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
}

// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const Inp = ({style,...p}) => <input className="inp" style={style} {...p} />;
const Sel = ({style,...p}) => <select className="inp" style={{...style}} {...p} />;
const Lbl = ({children}) => <label style={{fontSize:13,fontWeight:600,color:GRAY,marginBottom:6,display:"block"}}>{children}</label>;
const FG = ({children,style}) => <div style={{marginBottom:14,...style}}>{children}</div>;

function Btn({variant="primary",full,sm,children,style,...p}) {
  return <button className={`btn btn-${variant}${full?" btn-full":""}${sm?" btn-sm":""}`} style={style} {...p}>{children}</button>;
}

function Badge({color,children}) {
  const c={green:["#dcfce7","#16a34a"],red:["#fee2e2","#dc2626"],blue:["#dbeafe","#1d4ed8"],gray:["#f3f4f6",GRAY]}[color]||["#f3f4f6",GRAY];
  return <span style={{display:"inline-flex",alignItems:"center",padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:600,background:c[0],color:c[1]}}>{children}</span>;
}

function Alert({type,children}) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}

function StatCard({num,label,color,icon,delay=0}) {
  return (
    <div className="stat-card fade-up" style={{background:`linear-gradient(135deg,${color},${color}cc)`,boxShadow:`0 4px 14px ${color}33`,animationDelay:`${delay}ms`}}>
      <div style={{fontSize:26,opacity:.7,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:24,fontWeight:800,letterSpacing:-0.5}}>{num}</div>
      <div style={{fontSize:12,opacity:.85,marginTop:2,fontWeight:500}}>{label}</div>
    </div>
  );
}

function Modal({title,children,onClose}) {
  return (
    <div className="modal-bg" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20,backdropFilter:"blur(4px)"}}>
      <div className="scale-in" style={{background:WHITE,borderRadius:20,padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",position:"relative"}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:14}}>{title}</div>
        {children}
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",cursor:"pointer",fontSize:20,color:GRAY,lineHeight:1}}>✕</button>
      </div>
    </div>
  );
}

function Spinner({full}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:full?"100vh":160,flexDirection:"column",gap:14}}>
      <div style={{width:38,height:38,border:`3px solid ${BORDER}`,borderTop:`3px solid ${P}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{color:GRAY,fontSize:14}}>A carregar...</span>
    </div>
  );
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function LoginPage() {
  const [email,setEmail]=useState(""), [pass,setPass]=useState(""), [err,setErr]=useState(""), [loading,setLoading]=useState(false), [show,setShow]=useState(false);
  const handle = async () => {
    if (!email||!pass){setErr("Preencha email e senha.");return;}
    setLoading(true);setErr("");
    try{await signInWithEmailAndPassword(auth,email,pass);}
    catch{setErr("Email ou senha incorretos.");}
    finally{setLoading(false);}
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${P} 0%,#a00004 40%,${S} 100%)`,padding:20}}>
      <div className="scale-in" style={{background:WHITE,borderRadius:24,padding:32,width:"100%",maxWidth:380,boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${P},#ff3333)`,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:`0 8px 24px ${P}44`}}>
            <span style={{fontSize:28}}>⏱</span>
          </div>
          <div style={{fontSize:26,fontWeight:800,color:DARK}}>Ponto Pronto</div>
          <div style={{fontSize:14,color:GRAY,marginTop:4}}>Sistema de Marcação de Horas</div>
        </div>
        {err&&<Alert type="error">⚠️ {err}</Alert>}
        <FG><Lbl>Email</Lbl><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></FG>
        <FG>
          <Lbl>Senha</Lbl>
          <div style={{position:"relative"}}>
            <Inp type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&handle()} style={{paddingRight:46}}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:GRAY,padding:0,lineHeight:1}}>{show?"🙈":"👁"}</button>
          </div>
        </FG>
        <Btn variant="primary" full style={{marginTop:4,padding:14,fontSize:16}} onClick={handle} disabled={loading}>
          {loading?<><div style={{width:16,height:16,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>A entrar...</>:"Entrar →"}
        </Btn>
      </div>
    </div>
  );
}

// ─── EMP DASHBOARD ───────────────────────────────────────────────────────────
function EmpDashboard({user,records,projects}) {
  const today = new Date().toISOString().split("T")[0];
  const todayRec = records.find(r=>r.date===today);
  const totalExtra = records.reduce((a,r)=>a+calcExtra(r.entry,r.exit).extra,0);
  const thisMonth = records.filter(r=>r.date.startsWith(new Date().toISOString().slice(0,7)));
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Olá, {user.name.split(" ")[0]}! 👋</div>
      <div className="grid-3" style={{marginBottom:16}}>
        <StatCard num={records.length} label="Dias Registados" color={S} icon="📅" delay={0}/>
        <StatCard num={toHrs(totalExtra)} label="Horas Extras" color={P} icon="⚡" delay={60}/>
        <StatCard num={thisMonth.length} label="Este mês" color="#16a34a" icon="📊" delay={120}/>
      </div>
      <div className="card fade-up" style={{animationDelay:"160ms"}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>📅 Hoje — {today}</div>
        {todayRec?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["🟢 Entrada",todayRec.entry],["🔴 Saída",todayRec.exit],["📍 Local",todayRec.location==="external"?"Externo":"Oficina"],["📁 Projeto",projects.find(p=>p.id===todayRec.projectId)?.name||"-"],["⚡ Extras",toHrs(calcExtra(todayRec.entry,todayRec.exit).extra)]].map(([l,v])=>(
              <div key={l} style={{background:LIGHT,borderRadius:10,padding:"10px 14px"}}>
                <div style={{fontSize:11,fontWeight:600,color:GRAY,marginBottom:3}}>{l}</div>
                <div style={{fontWeight:700,fontSize:14}}>{v}</div>
              </div>
            ))}
          </div>
        ):<div style={{color:GRAY,fontSize:14,padding:14,background:LIGHT,borderRadius:10}}>ℹ️ Nenhum registo hoje. Vá a "Registar Horas".</div>}
      </div>
      <div className="card fade-up" style={{animationDelay:"220ms"}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>📋 Últimos Registos</div>
        <div className="table-wrap">
          <table><thead><tr>{["Data","Entrada","Saída","Extra","Local","Projeto"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[...records].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(r=>{
              const {extra}=calcExtra(r.entry,r.exit);
              return <tr key={r.id}>
                <td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td>
                <td><span style={{color:extra>0?P:"#16a34a",fontWeight:700}}>{toHrs(extra)}</span></td>
                <td><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Ext":"Of."}</Badge></td>
                <td>{projects.find(p=>p.id===r.projectId)?.name||"-"}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── EMP REGISTER ────────────────────────────────────────────────────────────
function EmpRegister({user,projects}) {
  const today = new Date().toISOString().split("T")[0];
  const [form,setForm]=useState({date:today,entry:"",exit:"",location:"office",projectId:"",notes:""});
  const [msg,setMsg]=useState(null),[loading,setLoading]=useState(false);
  const active = projects.filter(p=>p.status==="active");
  const f = k => e => setForm(v=>({...v,[k]:e.target.value}));
  const save = async () => {
    if (!form.entry||!form.exit||!form.projectId){setMsg({type:"error",text:"Preencha todos os campos obrigatórios."});return;}
    if (toMins(form.exit)<=toMins(form.entry)){setMsg({type:"error",text:"Saída deve ser depois da entrada."});return;}
    setLoading(true);
    try{
      await addDoc(collection(db,"records"),{...form,userId:user.uid,createdAt:serverTimestamp()});
      setMsg({type:"success",text:"✅ Registo guardado!"});
      setForm({date:today,entry:"",exit:"",location:"office",projectId:"",notes:""});
    }catch(e){setMsg({type:"error",text:"Erro ao guardar. Tente novamente."});}
    setLoading(false);
  };
  const preview = form.entry&&form.exit&&toMins(form.exit)>toMins(form.entry)?calcExtra(form.entry,form.exit):null;
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Registar Horas</div>
      <div className="card">
        {msg&&<Alert type={msg.type}>{msg.text}</Alert>}
        <FG><Lbl>Data *</Lbl><Inp type="date" value={form.date} onChange={f("date")}/></FG>
        <div className="grid-2" style={{marginBottom:14}}>
          <FG style={{marginBottom:0}}><Lbl>Hora de Entrada *</Lbl><Inp type="time" value={form.entry} onChange={f("entry")}/></FG>
          <FG style={{marginBottom:0}}><Lbl>Hora de Saída *</Lbl><Inp type="time" value={form.exit} onChange={f("exit")}/></FG>
        </div>
        <FG>
          <Lbl>Projeto *</Lbl>
          <Sel value={form.projectId} onChange={f("projectId")}>
            <option value="">Selecione um projeto</option>
            {active.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </Sel>
        </FG>
        <FG>
          <Lbl>Local *</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["office","🏢 Oficina"],["external","🏗 Externo"]].map(([v,l])=>(
              <button key={v} className={`tag-btn${form.location===v?" active":""}`} onClick={()=>setForm(s=>({...s,location:v}))} style={{padding:"12px",borderRadius:12,fontSize:14}}>{l}</button>
            ))}
          </div>
        </FG>
        <FG><Lbl>Notas</Lbl><Inp value={form.notes} onChange={f("notes")} placeholder="Observações..."/></FG>
        {preview&&(
          <div className="grid-3" style={{marginBottom:16}}>
            {[[S,"⏱ Total",toHrs(preview.total)],["#16a34a","✅ Normal",toHrs(preview.normal)],[preview.extra>0?P:"#9ca3af","⚡ Extra",toHrs(preview.extra)]].map(([c,l,v])=>(
              <div key={l} style={{background:c,borderRadius:12,padding:"12px 14px",color:WHITE}}>
                <div style={{fontSize:11,opacity:.8,marginBottom:3}}>{l}</div>
                <div style={{fontSize:20,fontWeight:800}}>{v}</div>
              </div>
            ))}
          </div>
        )}
        <Btn variant="primary" full onClick={save} disabled={loading}>{loading?"A guardar...":"💾 Guardar Registo"}</Btn>
      </div>
    </div>
  );
}

// ─── EMP HISTORY ─────────────────────────────────────────────────────────────
function EmpHistory({records,projects}) {
  const sorted = [...records].sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Meu Histórico</div>
      <div className="card">
        <div className="table-wrap">
          <table><thead><tr>{["Data","Entrada","Saída","Normal","Extra","Local","Projeto"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{sorted.map(r=>{
              const {normal,extra}=calcExtra(r.entry,r.exit);
              return <tr key={r.id}>
                <td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td><td>{toHrs(normal)}</td>
                <td><span style={{color:extra>0?P:"#16a34a",fontWeight:700}}>{toHrs(extra)}</span></td>
                <td><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Ext":"Of."}</Badge></td>
                <td>{projects.find(p=>p.id===r.projectId)?.name||"-"}</td>
              </tr>;
            })}
            {sorted.length===0&&<tr><td colSpan={7} style={{padding:24,color:GRAY,textAlign:"center"}}>Nenhum registo.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── EMP REPORTS ─────────────────────────────────────────────────────────────
function EmpReportsPage({user,records,projects}) {
  const [selMonth,setSelMonth]=useState(new Date().getMonth()+1);
  const [selYear,setSelYear]=useState(new Date().getFullYear());
  const filtered = records.filter(r=>{const[y,m]=r.date.split("-");return parseInt(y)===selYear&&parseInt(m)===selMonth;}).sort((a,b)=>a.date.localeCompare(b.date));
  const totalN=filtered.reduce((a,r)=>a+calcExtra(r.entry,r.exit).normal,0);
  const totalE=filtered.reduce((a,r)=>a+calcExtra(r.entry,r.exit).extra,0);
  const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Meus Relatórios</div>
      <div className="card">
        <div className="grid-2" style={{marginBottom:16}}>
          <FG style={{marginBottom:0}}><Lbl>Mês</Lbl><Sel value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))}>{months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</Sel></FG>
          <FG style={{marginBottom:0}}><Lbl>Ano</Lbl><Sel value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}>{[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}</Sel></FG>
        </div>
        {filtered.length>0?<>
          <div className="grid-3" style={{marginBottom:16}}>
            <StatCard num={filtered.length} label="Dias" color={S} icon="📅"/>
            <StatCard num={toHrs(totalN)} label="Normal" color="#16a34a" icon="✅"/>
            <StatCard num={toHrs(totalE)} label="Extra" color={P} icon="⚡"/>
          </div>
          <div className="table-wrap" style={{marginBottom:16}}>
            <table><thead><tr>{["Data","Entrada","Saída","Normal","Extra","Local","Projeto"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map(r=>{
                const {normal,extra}=calcExtra(r.entry,r.exit);
                return <tr key={r.id}>
                  <td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td><td>{toHrs(normal)}</td>
                  <td><span style={{color:extra>0?P:"#16a34a",fontWeight:700}}>{toHrs(extra)}</span></td>
                  <td><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Ext":"Of."}</Badge></td>
                  <td>{projects.find(p=>p.id===r.projectId)?.name||"—"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <Btn variant="primary" full onClick={()=>generatePDF(user,filtered,projects,selMonth,selYear)}>🖨 Exportar PDF</Btn>
        </>:<div style={{color:GRAY,fontSize:14,padding:20,background:LIGHT,borderRadius:10,textAlign:"center"}}>ℹ️ Nenhum registo para este período.</div>}
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({allRecords,projects,allUsers}) {
  const emps=allUsers.filter(u=>u.role==="employee");
  const totalExtra=allRecords.reduce((a,r)=>a+calcExtra(r.entry,r.exit).extra,0);
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Dashboard</div>
      <div className="grid-4" style={{marginBottom:16}}>
        <StatCard num={emps.length} label="Funcionários" color={S} icon="👥" delay={0}/>
        <StatCard num={projects.filter(p=>p.status==="active").length} label="Projetos" color={P} icon="🏗" delay={60}/>
        <StatCard num={allRecords.length} label="Registos" color="#16a34a" icon="📋" delay={120}/>
        <StatCard num={toHrs(totalExtra)} label="H. Extras" color="#7c3aed" icon="⚡" delay={180}/>
      </div>
      <div className="card fade-up" style={{animationDelay:"220ms"}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>👥 Resumo por Funcionário</div>
        <div className="table-wrap">
          <table><thead><tr>{["Funcionário","Dias","Normal","Extra","Último"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{emps.map(emp=>{
              const recs=allRecords.filter(r=>r.userId===emp.uid);
              const tN=recs.reduce((a,r)=>a+calcExtra(r.entry,r.exit).normal,0);
              const tE=recs.reduce((a,r)=>a+calcExtra(r.entry,r.exit).extra,0);
              const last=[...recs].sort((a,b)=>b.date.localeCompare(a.date))[0];
              return <tr key={emp.uid}>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${S},#0099ff)`,color:WHITE,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{initials(emp.name)}</div>
                  <b style={{whiteSpace:"nowrap"}}>{emp.name}</b>
                </div></td>
                <td>{recs.length}</td><td>{toHrs(tN)}</td>
                <td><span style={{color:tE>0?P:"#16a34a",fontWeight:700}}>{toHrs(tE)}</span></td>
                <td>{last?.date||"—"}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PROJECTS ───────────────────────────────────────────────────────────
function AdminProjects({projects}) {
  const [name,setName]=useState(""),[msg,setMsg]=useState(null);
  const [editing,setEditing]=useState(null),[confirmDelete,setConfirmDelete]=useState(null);
  const add=async()=>{if(!name.trim())return;await addDoc(collection(db,"projects"),{name:name.trim(),status:"active",createdAt:serverTimestamp()});setName("");setMsg({type:"success",text:"✅ Projeto criado!"});setTimeout(()=>setMsg(null),2000);};
  const toggle=async p=>await updateDoc(doc(db,"projects",p.id),{status:p.status==="active"?"archived":"active"});
  const saveEdit=async()=>{if(!editing.name.trim())return;await updateDoc(doc(db,"projects",editing.id),{name:editing.name.trim()});setEditing(null);setMsg({type:"success",text:"✅ Atualizado!"});setTimeout(()=>setMsg(null),2000);};
  const del=async()=>{await deleteDoc(doc(db,"projects",confirmDelete.id));setConfirmDelete(null);};
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Projetos</div>
      {confirmDelete&&<Modal title="🗑 Remover Projeto" onClose={()=>setConfirmDelete(null)}>
        <p style={{fontSize:14,color:GRAY,marginBottom:20}}>Tens a certeza que queres remover <b>"{confirmDelete.name}"</b>?</p>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="ghost" sm onClick={()=>setConfirmDelete(null)}>Cancelar</Btn>
          <Btn variant="primary" sm onClick={del}>🗑 Remover</Btn>
        </div>
      </Modal>}
      <div className="card">
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Novo Projeto</div>
        {msg&&<Alert type={msg.type}>{msg.text}</Alert>}
        <div style={{display:"flex",gap:10}}>
          <Inp style={{flex:1}} placeholder="Nome do projeto" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          <Btn variant="primary" sm onClick={add}>+</Btn>
        </div>
      </div>
      <div className="card">
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Projetos ({projects.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {projects.map(p=>(
            <div key={p.id} style={{background:LIGHT,borderRadius:12,padding:"14px 16px",border:`1px solid ${BORDER}`}}>
              {editing?.id===p.id?(
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <Inp style={{flex:1}} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&saveEdit()} autoFocus/>
                  <Btn variant="primary" sm onClick={saveEdit}>✓</Btn>
                  <Btn variant="ghost" sm onClick={()=>setEditing(null)}>✕</Btn>
                </div>
              ):(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <b style={{fontSize:15}}>{p.name}</b>
                  <Badge color={p.status==="active"?"green":"gray"}>{p.status==="active"?"Ativo":"Arquivado"}</Badge>
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                <Btn variant="ghost" sm onClick={()=>setEditing({id:p.id,name:p.name})}>✏️ Editar</Btn>
                <Btn variant="ghost" sm onClick={()=>toggle(p)}>{p.status==="active"?"📦 Arquivar":"✅ Ativar"}</Btn>
                <Btn variant="danger" sm onClick={()=>setConfirmDelete(p)}>🗑</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN RECORDS ────────────────────────────────────────────────────────────
function AdminRecords({allRecords,projects,allUsers}) {
  const emps=allUsers.filter(u=>u.role==="employee");
  const [filterUser,setFilterUser]=useState("all");
  const filtered=filterUser==="all"?allRecords:allRecords.filter(r=>r.userId===filterUser);
  const sorted=[...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Registos</div>
      <div className="card">
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[["all","Todos"],...emps.map(e=>[e.uid,e.name.split(" ")[0]])].map(([id,label])=>(
            <button key={id} className={`tag-btn${filterUser===id?" active":""}`} onClick={()=>setFilterUser(id)}>{label}</button>
          ))}
        </div>
        <div className="table-wrap">
          <table><thead><tr>{["Nome","Data","Entrada","Saída","Normal","Extra","Local","Projeto"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{sorted.map(r=>{
              const {normal,extra}=calcExtra(r.entry,r.exit);
              const emp=allUsers.find(u=>u.uid===r.userId);
              return <tr key={r.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${S},#0099ff)`,color:WHITE,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:10,flexShrink:0}}>{emp?initials(emp.name):"?"}</div>
                  <b>{emp?.name?.split(" ")[0]||"—"}</b>
                </div></td>
                <td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td><td>{toHrs(normal)}</td>
                <td><span style={{color:extra>0?P:"#16a34a",fontWeight:700}}>{toHrs(extra)}</span></td>
                <td><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Ext":"Of."}</Badge></td>
                <td>{projects.find(p=>p.id===r.projectId)?.name||"—"}</td>
              </tr>;
            })}
            {sorted.length===0&&<tr><td colSpan={8} style={{padding:24,color:GRAY,textAlign:"center"}}>Nenhum registo.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN USERS ─────────────────────────────────────────────────────────────
function AdminUsers({allUsers}) {
  const emps=allUsers.filter(u=>u.role==="employee");
  const [confirmDelete,setConfirmDelete]=useState(null),[msg,setMsg]=useState(null);
  const handleDelete=async u=>{await deleteDoc(doc(db,"users",u.uid));setConfirmDelete(null);setMsg({type:"success",text:`${u.name} removido. Lembra-te de remover no Firebase Authentication.`});setTimeout(()=>setMsg(null),6000);};
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Funcionários</div>
      {confirmDelete&&<Modal title="🗑 Remover Funcionário" onClose={()=>setConfirmDelete(null)}>
        <p style={{fontSize:14,color:GRAY,marginBottom:10}}>Tens a certeza que queres remover <b>{confirmDelete.name}</b>?</p>
        <Alert type="info">⚠️ Remove o acesso à app mas deves também remover no Firebase Console → Authentication.</Alert>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="ghost" sm onClick={()=>setConfirmDelete(null)}>Cancelar</Btn>
          <Btn variant="primary" sm onClick={()=>handleDelete(confirmDelete)}>🗑 Remover</Btn>
        </div>
      </Modal>}
      {msg&&<Alert type={msg.type}>{msg.text}</Alert>}
      <div className="card">
        <Alert type="info">ℹ️ Para adicionar funcionários, acede ao <b>Firebase Console → Authentication</b> e cria o documento em <b>Firestore → users</b> com <code>role: "employee"</code>.
          <div style={{marginTop:10}}><a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"><Btn variant="secondary" sm>🔗 Firebase Console</Btn></a></div>
        </Alert>
      </div>
      <div className="card">
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>👥 Funcionários ({emps.length})</div>
        {emps.length===0?<div style={{color:GRAY,fontSize:14,padding:16,background:LIGHT,borderRadius:10,textAlign:"center"}}>Nenhum funcionário ainda.</div>
        :emps.map(u=>(
          <div key={u.uid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:LIGHT,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:10,flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${S},#0099ff)`,color:WHITE,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>{initials(u.name)}</div>
              <div><div style={{fontWeight:700,fontSize:15}}>{u.name}</div><div style={{fontSize:13,color:GRAY}}>{u.email}</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Badge color="blue">Funcionário</Badge>
              <Btn variant="danger" sm onClick={()=>setConfirmDelete(u)}>🗑</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN REPORTS ────────────────────────────────────────────────────────────
function AdminReports({allRecords,projects,allUsers}) {
  const emps=allUsers.filter(u=>u.role==="employee");
  const [selUser,setSelUser]=useState(emps[0]?.uid||"");
  const [selMonth,setSelMonth]=useState(new Date().getMonth()+1);
  const [selYear,setSelYear]=useState(new Date().getFullYear());
  const emp=allUsers.find(u=>u.uid===selUser);
  const filtered=allRecords.filter(r=>{const[y,m]=r.date.split("-");return r.userId===selUser&&parseInt(y)===selYear&&parseInt(m)===selMonth;}).sort((a,b)=>a.date.localeCompare(b.date));
  const totalN=filtered.reduce((a,r)=>a+calcExtra(r.entry,r.exit).normal,0);
  const totalE=filtered.reduce((a,r)=>a+calcExtra(r.entry,r.exit).extra,0);
  const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return (
    <div>
      <div className="fade-up" style={{fontSize:22,fontWeight:800,marginBottom:18}}>Relatórios</div>
      <div className="card">
        <FG><Lbl>Funcionário</Lbl><Sel value={selUser} onChange={e=>setSelUser(e.target.value)}>{emps.map(e=><option key={e.uid} value={e.uid}>{e.name}</option>)}</Sel></FG>
        <div className="grid-2" style={{marginBottom:16}}>
          <FG style={{marginBottom:0}}><Lbl>Mês</Lbl><Sel value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))}>{months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</Sel></FG>
          <FG style={{marginBottom:0}}><Lbl>Ano</Lbl><Sel value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}>{[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}</Sel></FG>
        </div>
        {filtered.length>0?<>
          <div className="grid-3" style={{marginBottom:16}}>
            <StatCard num={filtered.length} label="Dias" color={S} icon="📅"/>
            <StatCard num={toHrs(totalN)} label="Normal" color="#16a34a" icon="✅"/>
            <StatCard num={toHrs(totalE)} label="Extra" color={P} icon="⚡"/>
          </div>
          <div className="table-wrap" style={{marginBottom:16}}>
            <table><thead><tr>{["Data","Entrada","Saída","Normal","Extra","Local","Projeto"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map(r=>{
                const {normal,extra}=calcExtra(r.entry,r.exit);
                return <tr key={r.id}>
                  <td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td><td>{toHrs(normal)}</td>
                  <td><span style={{color:extra>0?P:"#16a34a",fontWeight:700}}>{toHrs(extra)}</span></td>
                  <td><Badge color={r.location==="external"?"blue":"green"}>{r.location==="external"?"Ext":"Of."}</Badge></td>
                  <td>{projects.find(p=>p.id===r.projectId)?.name||"—"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <Btn variant="primary" full onClick={()=>generatePDF(emp,filtered,projects,selMonth,selYear)}>🖨 Exportar PDF</Btn>
        </>:<div style={{color:GRAY,fontSize:14,padding:20,background:LIGHT,borderRadius:10,textAlign:"center"}}>ℹ️ Nenhum registo para este período.</div>}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authUser,setAuthUser]=useState(undefined);
  const [userDoc,setUserDoc]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [records,setRecords]=useState([]);
  const [projects,setProjects]=useState([]);
  const [allUsers,setAllUsers]=useState([]);
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      if(u){const snap=await getDoc(doc(db,"users",u.uid));setUserDoc(snap.exists()?{uid:u.uid,...snap.data()}:{uid:u.uid,name:u.email,role:"employee"});setAuthUser(u);}
      else{setAuthUser(null);setUserDoc(null);}
    });
  },[]);

  useEffect(()=>{if(!authUser)return;return onSnapshot(collection(db,"projects"),snap=>setProjects(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[authUser]);

  useEffect(()=>{
    if(!authUser||!userDoc)return;
    const q=userDoc.role==="admin"?collection(db,"records"):query(collection(db,"records"),where("userId","==",authUser.uid));
    return onSnapshot(q,snap=>setRecords(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[authUser,userDoc]);

  useEffect(()=>{
    if(!userDoc||userDoc.role!=="admin")return;
    return onSnapshot(collection(db,"users"),snap=>setAllUsers(snap.docs.map(d=>({uid:d.id,...d.data()}))));
  },[userDoc]);

  if(authUser===undefined)return<><GlobalStyles/><Spinner full/></>;
  if(!authUser)return<><GlobalStyles/><LoginPage/></>;
  if(!userDoc)return<><GlobalStyles/><Spinner full/></>;

  const isAdmin=userDoc.role==="admin";
  const adminNav=[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"records",label:"Registos",icon:"📋"},{id:"projects",label:"Projetos",icon:"🏗"},{id:"users",label:"Funcionários",icon:"👥"},{id:"reports",label:"Relatórios",icon:"📄"}];
  const empNav=[{id:"dashboard",label:"Início",icon:"🏠"},{id:"register",label:"Registar Horas",icon:"⏱"},{id:"history",label:"Histórico",icon:"📋"},{id:"reports",label:"Relatórios",icon:"📄"}];
  const nav=isAdmin?adminNav:empNav;
  const goTo=p=>{setPage(p);setMenuOpen(false);};

  const renderPage=()=>{
    if(isAdmin){
      if(page==="dashboard")return<AdminDashboard allRecords={records} projects={projects} allUsers={allUsers}/>;
      if(page==="records")return<AdminRecords allRecords={records} projects={projects} allUsers={allUsers}/>;
      if(page==="projects")return<AdminProjects projects={projects}/>;
      if(page==="users")return<AdminUsers allUsers={allUsers}/>;
      if(page==="reports")return<AdminReports allRecords={records} projects={projects} allUsers={allUsers}/>;
    }else{
      if(page==="dashboard")return<EmpDashboard user={userDoc} records={records} projects={projects}/>;
      if(page==="register")return<EmpRegister user={userDoc} projects={projects}/>;
      if(page==="history")return<EmpHistory records={records} projects={projects}/>;
      if(page==="reports")return<EmpReportsPage user={userDoc} records={records} projects={projects}/>;
    }
  };

  return (
    <>
      <GlobalStyles/>
      <div style={{minHeight:"100vh",background:LIGHT}}>

        {/* HEADER */}
        <header style={{background:WHITE,borderBottom:`1px solid ${BORDER}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,fontWeight:800,fontSize:18,letterSpacing:-0.5}}>
            <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${P},#ff3333)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⏱</div>
            <span style={{background:`linear-gradient(135deg,${P},${S})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Ponto Pronto</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:isAdmin?`linear-gradient(135deg,${P},#ff3333)`:`linear-gradient(135deg,${S},#0099ff)`,color:WHITE,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13}}>{initials(userDoc.name)}</div>
            <Btn variant="ghost" sm onClick={()=>signOut(auth)}>Sair</Btn>
            {/* Mobile menu btn */}
            <button className="mobile-menu-btn" onClick={()=>setMenuOpen(o=>!o)} style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${BORDER}`,background:WHITE,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {menuOpen?"✕":"☰"}
            </button>
          </div>
        </header>

        {/* MOBILE NAV DROPDOWN */}
        {menuOpen&&(
          <div className="slide-down mobile-menu-btn" style={{position:"fixed",top:60,left:0,right:0,background:WHITE,borderBottom:`1px solid ${BORDER}`,zIndex:99,padding:"10px 12px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>
            {nav.map(n=>(
              <div key={n.id} className="nav-item" onClick={()=>goTo(n.id)}
                style={{color:page===n.id?P:DARK,background:page===n.id?"#fff0f0":"transparent",fontWeight:page===n.id?700:500}}>
                <span style={{fontSize:20}}>{n.icon}</span>{n.label}
                {page===n.id&&<div style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:P}}/>}
              </div>
            ))}
            <div style={{padding:"12px 16px",marginTop:4,background:LIGHT,borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:isAdmin?`linear-gradient(135deg,${P},#ff3333)`:`linear-gradient(135deg,${S},#0099ff)`,color:WHITE,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{initials(userDoc.name)}</div>
              <div><div style={{fontSize:13,fontWeight:700}}>{userDoc.name}</div><Badge color={isAdmin?"red":"blue"}>{isAdmin?"Admin":"Funcionário"}</Badge></div>
            </div>
          </div>
        )}

        <div style={{display:"flex",minHeight:"calc(100vh - 60px)"}}>
          {/* DESKTOP SIDEBAR */}
          <aside className="sidebar" style={{width:220,background:WHITE,borderRight:`1px solid ${BORDER}`,padding:"18px 10px",flexDirection:"column",position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto"}}>
            <div style={{fontSize:11,fontWeight:700,color:GRAY,letterSpacing:1,marginBottom:8,paddingLeft:10}}>MENU</div>
            {nav.map(n=>(
              <div key={n.id} className="nav-item" onClick={()=>setPage(n.id)}
                style={{color:page===n.id?P:DARK,background:page===n.id?"#fff0f0":"transparent",fontWeight:page===n.id?700:500,borderLeft:page===n.id?`3px solid ${P}`:"3px solid transparent"}}>
                <span style={{fontSize:17}}>{n.icon}</span>{n.label}
                {page===n.id&&<div style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:P}}/>}
              </div>
            ))}
            <div style={{marginTop:"auto",padding:"12px 10px",background:LIGHT,borderRadius:12}}>
              <div style={{fontSize:11,color:GRAY,marginBottom:4}}>Sessão ativa</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{userDoc.name.split(" ")[0]}</div>
              <Badge color={isAdmin?"red":"blue"}>{isAdmin?"Admin":"Funcionário"}</Badge>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main key={page} className="fade-up main-pad" style={{flex:1,padding:16,overflowY:"auto",minWidth:0}}>
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}