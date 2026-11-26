import {useEffect,useState,useCallback,useRef} from 'react'
import {supabase,configured} from './lib/supabase'
import {MODS,Mod} from './modules'
import YT from './YT'
import {Conn,ConnBadge,GPanel,SVC_OF} from './Conn'
type Rec={id:string;module:string;data:any;created_at:string;owner:string}
const fmt=(d:string)=>new Date(d).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})
const num=(v:any)=>Number(v)||0

function Auth(){
 const [mode,setMode]=useState<'in'|'up'>('in'),[email,setE]=useState(''),[pw,setP]=useState(''),[err,setErr]=useState(''),[info,setInfo]=useState('')
 const go=async(e:any)=>{e.preventDefault();setErr('');setInfo('')
  if(!/\S+@\S+\.\S+/.test(email))return setErr('E-mail invalide.')
  if(pw.length<6)return setErr('Mot de passe : 6 caractères minimum.')
  const r=mode==='in'?await supabase.auth.signInWithPassword({email,password:pw}):await supabase.auth.signUp({email,password:pw})
  if(r.error)setErr(r.error.message);else if(mode==='up'&&!r.data.session)setInfo('Compte créé. Vérifie ton e-mail pour confirmer, puis connecte-toi.')}
 return <div className="min-h-screen grid place-items-center p-4"><form onSubmit={go} className="card w-full max-w-sm space-y-3">
  <h1 className="text-xl font-semibold">NACORP OS</h1><p className="text-mut text-sm">{mode==='in'?'Connexion':'Créer un compte'}</p>
  <input className="inp" placeholder="E-mail" value={email} onChange={e=>setE(e.target.value)}/>
  <input className="inp" type="password" placeholder="Mot de passe" value={pw} onChange={e=>setP(e.target.value)}/>
  {err&&<p className="text-red-400 text-sm">{err}</p>}{info&&<p className="text-green-400 text-sm">{info}</p>}
  <button className="btn w-full">{mode==='in'?'Se connecter':'S’inscrire'}</button>
  <button type="button" className="text-mut text-sm underline" onClick={()=>setMode(mode==='in'?'up':'in')}>{mode==='in'?'Pas de compte ? S’inscrire':'Déjà un compte ? Se connecter'}</button>
 </form></div>}

function useRecs(module?:string,uid?:string){
 const [recs,setR]=useState<Rec[]>([]),[err,setErr]=useState('')
 const load=useCallback(async()=>{let q=supabase.from('records').select('*').order('created_at',{ascending:false});if(module)q=q.eq('module',module)
  const {data,error}=await q;if(error)setErr(error.message);else setR(data as Rec[])},[module,uid])
 useEffect(()=>{load()},[load]);return {recs,load,err}}

function FileLink({path,name}:{path:string;name:string}){
 const [url,setUrl]=useState('')
 useEffect(()=>{supabase.storage.from('files').createSignedUrl(path,3600).then(r=>setUrl(r.data?.signedUrl||''))},[path])
 if(!url)return null
 const img=/\.(png|jpe?g|gif|webp|svg)$/i.test(path)
 return <div>{img&&<img src={url} className="h-28 w-full object-cover rounded-lg mb-1"/>}<a className="text-sky-400 text-xs underline" href={url} target="_blank" download={name}>Ouvrir / télécharger</a></div>}

function Timer({m,uid,done}:{m:Mod;uid:string;done:()=>void}){
 const [start,setS]=useState<number|null>(()=>Number(localStorage.getItem('timer'))||null),[now,setN]=useState(Date.now()),[proj,setP]=useState('')
 useEffect(()=>{const i=setInterval(()=>setN(Date.now()),1000);return()=>clearInterval(i)},[])
 const s=start?Math.floor((now-start)/1000):0
 const stop=async()=>{const minutes=Math.max(1,Math.round(s/60));await supabase.from('records').insert({module:m.key,owner:uid,data:{project:proj||'Sans projet',minutes,date:new Date().toISOString().slice(0,10)}})
  localStorage.removeItem('timer');setS(null);done()}
 return <div className="card flex flex-wrap gap-3 items-center"><div className="text-3xl font-mono">{new Date(s*1000).toISOString().slice(11,19)}</div>
  <input className="inp max-w-xs" placeholder="Projet" value={proj} onChange={e=>setP(e.target.value)} disabled={!!start}/>
  {start?<button className="btn" onClick={stop}>Arrêter et enregistrer</button>:<button className="btn" onClick={()=>{const t=Date.now();localStorage.setItem('timer',String(t));setS(t)}}>Démarrer</button>}</div>}

function Form({m,init,uid,onDone,onCancel}:{m:Mod;init?:Rec;uid:string;onDone:()=>void;onCancel:()=>void}){
 const [d,setD]=useState<any>(init?.data||{}),[err,setErr]=useState(''),[busy,setB]=useState(false),[file,setF]=useState<File|null>(null)
 const save=async(e:any)=>{e.preventDefault();setErr('')
  for(const f of m.fields)if(f.req&&!String(d[f.k]??'').trim())return setErr(`« ${f.label} » est obligatoire.`)
  for(const f of m.fields)if(f.type==='url'&&d[f.k]&&!/^https?:\/\//.test(d[f.k]))return setErr(`« ${f.label} » doit commencer par http(s)://`)
  setB(true);let data={...d}
  if(file){const path=`${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g,'_')}`;const u=await supabase.storage.from('files').upload(path,file)
   if(u.error){setB(false);return setErr(u.error.message)};data={...data,filePath:path,fileName:file.name}}
  const r=init?await supabase.from('records').update({data,updated_at:new Date().toISOString()}).eq('id',init.id):await supabase.from('records').insert({module:m.key,owner:uid,data})
  setB(false);if(r.error)setErr(r.error.message);else onDone()}
 return <form onSubmit={save} className="card space-y-3 max-w-xl">
  {m.fields.map(f=><label key={f.k} className="block text-sm"><span className="text-mut">{f.label}{f.req&&' *'}</span>
   {f.type==='textarea'?<textarea className="inp mt-1" rows={4} value={d[f.k]||''} onChange={e=>setD({...d,[f.k]:e.target.value})}/>
   :f.type==='select'?<select className="inp mt-1" value={d[f.k]||''} onChange={e=>setD({...d,[f.k]:e.target.value})}><option value="">—</option>{f.options!.map(o=><option key={o}>{o}</option>)}</select>
   :f.type==='checkbox'?<input type="checkbox" className="ml-2" checked={!!d[f.k]} onChange={e=>setD({...d,[f.k]:e.target.checked})}/>
   :f.type==='file'?<input type="file" className="inp mt-1" onChange={e=>setF(e.target.files?.[0]||null)}/>
   :<input className="inp mt-1" type={f.type||'text'} value={d[f.k]??''} onChange={e=>setD({...d,[f.k]:e.target.value})}/>}</label>)}
  {err&&<p className="text-red-400 text-sm">{err}</p>}
  <div className="flex gap-2"><button className="btn" disabled={busy}>{busy?'…':'Enregistrer'}</button><button type="button" className="btn2" onClick={onCancel}>Annuler</button></div></form>}

function Module({m,uid}:{m:Mod;uid:string}){
 const {recs,load,err}=useRecs(m.key,uid),[edit,setEdit]=useState<Rec|null|'new'>(null),[q,setQ]=useState(''),[msg,setMsg]=useState('')
 const del=async(r:Rec)=>{if(!confirm('Supprimer ?'))return;const {error}=await supabase.from('records').delete().eq('id',r.id);if(error)setMsg(error.message);else{if(r.data.filePath)await supabase.storage.from('files').remove([r.data.filePath]);load()}}
 const toggle=async(r:Rec)=>{await supabase.from('records').update({data:{...r.data,done:!r.data.done}}).eq('id',r.id);load()}
 const list=recs.filter(r=>!r.data.ytId).filter(r=>JSON.stringify(r.data).toLowerCase().includes(q.toLowerCase()))
 const inc=recs.filter(r=>r.data.type==='revenu').reduce((a,r)=>a+num(r.data.amount),0),exp=recs.filter(r=>r.data.type==='dépense').reduce((a,r)=>a+num(r.data.amount),0)
 const cats:Record<string,number>={};if(m.flag==='finance')recs.forEach(r=>{const k=(r.data.cat||'Autre')+' ('+r.data.type+')';cats[k]=(cats[k]||0)+num(r.data.amount)})
 const csv=()=>{const rows=[['Date','Libellé','Type','Catégorie','Montant'],...recs.map(r=>[r.data.date,r.data.name,r.data.type,r.data.cat,r.data.amount])]
  const b=new Blob([rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='compta.csv';a.click()}
 if(edit)return <Form m={m} init={edit==='new'?undefined:edit} uid={uid} onDone={()=>{setEdit(null);load()}} onCancel={()=>setEdit(null)}/>
 return <div className="space-y-4">
  {SVC_OF[m.key]&&<ConnBadge svc={SVC_OF[m.key]}/>}
  {m.key!=="video"&&SVC_OF[m.key]&&<GPanel svc={SVC_OF[m.key]}/>}
  <div className="flex flex-wrap gap-2"><input className="inp max-w-xs" placeholder="Filtrer…" value={q} onChange={e=>setQ(e.target.value)}/><button className="btn" onClick={()=>setEdit('new')}>+ Ajouter</button>{m.flag==='finance'&&<button className="btn2" onClick={csv}>Export CSV</button>}</div>
  {m.key==='video'&&<YT recs={recs} uid={uid} reload={load}/>}
  {m.flag==='timer'&&<Timer m={m} uid={uid} done={load}/>}
  {m.flag==='timer'&&<p className="text-mut text-sm">Total : {Math.round(recs.reduce((a,r)=>a+num(r.data.minutes),0)/6)/10} h</p>}
  {m.flag==='finance'&&<div className="grid grid-cols-3 gap-3">{[['Revenus',inc],['Dépenses',exp],['Bénéfice',inc-exp]].map(([l,v]:any)=><div key={l} className="card"><div className="text-mut text-xs">{l}</div><div className="text-xl">{v.toLocaleString('fr-FR')} €</div></div>)}</div>}
  {m.flag==='finance'&&Object.keys(cats).length>0&&<div className="card space-y-1">{Object.entries(cats).map(([k,v])=><div key={k} className="text-xs flex items-center gap-2"><span className="w-40 truncate">{k}</span><div className="h-2 bg-white/70 rounded" style={{width:`${Math.max(2,v/Math.max(...Object.values(cats))*60)}%`}}/><span>{v}</span></div>)}</div>}
  {(err||msg)&&<p className="text-red-400 text-sm">{err||msg}</p>}
  {list.length===0&&<p className="text-mut text-sm">Aucun élément. Clique sur « + Ajouter » pour commencer.</p>}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map(r=><div key={r.id} className="card space-y-1">
   <div className="flex items-start gap-2 justify-between"><div className="font-medium flex gap-2">{m.flag==='check'&&<input type="checkbox" checked={!!r.data.done} onChange={()=>toggle(r)}/>}<span className={r.data.done?'line-through text-mut':''}>{r.data[m.title]||'Sans titre'}</span></div>
   <div className="flex gap-2 text-xs"><button className="text-mut hover:text-white" onClick={()=>setEdit(r)}>Modifier</button><button className="text-red-400" onClick={()=>del(r)}>Suppr.</button></div></div>
   {m.fields.filter(f=>f.k!==m.title&&f.type!=='file'&&f.type!=='checkbox'&&r.data[f.k]).map(f=><div key={f.k} className="text-xs text-mut"><b className="font-normal">{f.label} :</b> {f.type==='url'?<a className="text-sky-400 underline" href={r.data[f.k]} target="_blank">{r.data[f.k]}</a>:String(r.data[f.k]).slice(0,120)}</div>)}
   {r.data.filePath&&<FileLink path={r.data.filePath} name={r.data.fileName}/>}
   {m.key==='idees'&&<button className="btn2 text-xs" onClick={async()=>{await supabase.from('records').insert({module:'montage',owner:uid,data:{name:r.data.name,desc:r.data.desc,status:'à faire'}});setMsg('Idée transformée en projet de montage ✔')}}>→ Projet de montage</button>}
   <div className="text-[10px] text-mut">Modifié/créé {fmt(r.created_at)}</div></div>)}</div></div>}

function Chat({uid,name}:{uid:string;name:string}){
 const [room,setRoom]=useState('general'),[msgs,setM]=useState<any[]>([]),[t,setT]=useState(''),[err,setErr]=useState(''),end=useRef<HTMLDivElement>(null)
 useEffect(()=>{setM([]);supabase.from('messages').select('*').eq('room',room).order('created_at').limit(200).then(r=>r.error?setErr(r.error.message):setM(r.data||[]))
  const ch=supabase.channel('chat-'+room).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`room=eq.${room}`},p=>{setM(m=>m.some(x=>x.id===p.new.id)?m:[...m,p.new]);if(p.new.user_id!==uid&&'Notification' in window&&Notification.permission==='granted')new Notification(p.new.author,{body:p.new.body})}).subscribe()
  return()=>{supabase.removeChannel(ch)}},[room])
 useEffect(()=>{end.current?.scrollIntoView()},[msgs])
 const send=async(e:any)=>{e.preventDefault();if(!t.trim())return;const {error}=await supabase.from('messages').insert({room,author:name,body:t.trim()});if(error)setErr(error.message);else setT('')}
 return <div className="space-y-3 max-w-2xl"><div className="flex gap-2"><input className="inp" value={room} onChange={e=>setRoom(e.target.value.toLowerCase().replace(/\s+/g,'-')||'general')} placeholder="Salon (ex: general, montage, dm-alice-bob)"/></div>
  <p className="text-mut text-xs">Un salon = un nom. Pour une conversation privée, choisissez ensemble un nom de salon secret.</p>
  <div className="card h-[55vh] overflow-auto space-y-2">{msgs.map(m=><div key={m.id} className="text-sm"><b>{m.author}</b> <span className="text-mut text-xs">{fmt(m.created_at)}</span><div>{m.body}</div></div>)}<div ref={end}/></div>
  {err&&<p className="text-red-400 text-sm">{err}</p>}<form onSubmit={send} className="flex gap-2"><input className="inp" value={t} onChange={e=>setT(e.target.value)} placeholder="Message…"/><button className="btn">Envoyer</button></form></div>}

function Team({uid}:{uid:string}){
 const [ps,setPs]=useState<any[]>([])
 useEffect(()=>{supabase.from('profiles').select('*').then(r=>setPs(r.data||[]))},[])
 return <div className="space-y-3 max-w-xl"><p className="text-mut text-sm">Pour inviter quelqu’un : envoie-lui le lien du site. Il crée son compte et apparaît ici.</p>
  {ps.map(p=><div key={p.id} className="card flex justify-between text-sm"><span>@{p.username||'?'}{p.id===uid&&' (moi)'}</span><span className="text-mut">{p.role}</span></div>)}</div>}

function Settings({uid,email,onInstall}:{uid:string;email:string;onInstall:(()=>void)|null}){
 const [name,setN]=useState(''),[msg,setMsg]=useState(''),[pw,setPw]=useState('')
 useEffect(()=>{supabase.from('profiles').select('username').eq('id',uid).single().then(r=>setN(r.data?.username||''))},[])
 const save=async()=>{if(name.trim().length<2)return setMsg('Nom trop court.');const r=await supabase.from('profiles').upsert({id:uid,username:name.trim()});setMsg(r.error?r.error.message:'Profil enregistré ✔')}
 const chg=async()=>{if(pw.length<6)return setMsg('6 caractères minimum.');const r=await supabase.auth.updateUser({password:pw});setMsg(r.error?r.error.message:'Mot de passe changé ✔');setPw('')}
 return <div className="space-y-4 max-w-2xl"><Conn/><div className="card space-y-2"><div className="text-mut text-sm">{email}</div><input className="inp" value={name} onChange={e=>setN(e.target.value)} placeholder="Nom d’utilisateur"/><button className="btn" onClick={save}>Enregistrer</button></div>
  <div className="card space-y-2"><input className="inp" type="password" placeholder="Nouveau mot de passe" value={pw} onChange={e=>setPw(e.target.value)}/><button className="btn" onClick={chg}>Changer le mot de passe</button></div>
  <div className="card space-y-2"><button className="btn2" onClick={()=>'Notification' in window&&Notification.requestPermission().then(p=>setMsg('Notifications : '+p))}>Activer les notifications</button>{onInstall&&<button className="btn2 ml-2" onClick={onInstall}>Installer NACORP OS</button>}</div>
  <div className="card text-sm text-mut">Connexions externes (YouTube API, Gmail, Google Calendar) : <b>non connectées</b>. Elles nécessitent des clés API à configurer plus tard (voir README).</div>
  {msg&&<p className="text-sm">{msg}</p>}<button className="btn2" onClick={()=>supabase.auth.signOut()}>Déconnexion</button></div>}

function Dashboard({uid,go}:{uid:string;go:(k:string)=>void}){
 const {recs}=useRecs(undefined,uid),by=(k:string)=>recs.filter(r=>r.module===k),today=new Date().toISOString().slice(0,10)
 const inc=by('compta').filter(r=>r.data.type==='revenu').reduce((a,r)=>a+num(r.data.amount),0),exp=by('compta').filter(r=>r.data.type==='dépense').reduce((a,r)=>a+num(r.data.amount),0)
 const mins=by('timetracker').reduce((a,r)=>a+num(r.data.minutes),0),views=by('video').reduce((a,r)=>a+num(r.data.views),0)
 const Box=({t,k,children}:any)=><div className="card"><div className="flex justify-between mb-2 text-sm font-medium"><span>{t}</span><button className="text-mut text-xs" onClick={()=>go(k)}>Voir →</button></div><div className="space-y-1 text-sm">{children}</div></div>
 const L=(k:string,f:(r:Rec)=>boolean=()=>true,n=5)=>{const l=by(k).filter(f).slice(0,n);return l.length?l.map(r=><div key={r.id} className="flex justify-between"><span className="truncate">{r.data.name||r.data.subject||r.data.project}</span><span className="text-mut text-xs">{r.data.date||r.data.due||fmt(r.created_at)}</span></div>):<p className="text-mut text-xs">Rien pour l’instant.</p>}
 return <div className="space-y-4"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Vues YouTube',views.toLocaleString('fr-FR')],['Temps de travail',(mins/60).toFixed(1)+' h'],['Revenus',inc+' €'],['Dépenses',exp+' €']].map(([l,v])=><div key={l} className="card"><div className="text-mut text-xs">{l}</div><div className="text-2xl">{v}</div></div>)}</div>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
  <Box t="Chaînes YouTube" k="video">{L('video')}</Box><Box t="Derniers projets de montage" k="montage">{L('montage')}</Box>
  <Box t="Tâches en attente" k="todo">{L('todo',r=>!r.data.done)}</Box><Box t="Événements à venir" k="calendrier">{L('calendrier',r=>r.data.date>=today)}</Box>
  <Box t="Dernières miniatures" k="miniatures">{L('miniatures')}</Box><Box t="Derniers fichiers" k="drive">{L('drive')}</Box>
  <Box t="Activité récente" k="notes">{recs.slice(0,6).map(r=><div key={r.id} className="flex justify-between"><span className="truncate">{MODS.find(m=>m.key===r.module)?.label} · {r.data.name||r.data.subject||r.data.project}</span><span className="text-mut text-xs">{fmt(r.created_at)}</span></div>)}{!recs.length&&<p className="text-mut text-xs">Aucune activité.</p>}</Box></div></div>}

export default function App(){
 const [session,setS]=useState<any>(undefined),[view,setV]=useState(/connected|oauth_error/.test(location.search)?'settings':'dashboard'),[open,setOpen]=useState(window.innerWidth>768),[q,setQ]=useState(''),[prompt,setPrompt]=useState<any>(null),[uname,setUn]=useState('')
 useEffect(()=>{supabase.auth.getSession().then(r=>setS(r.data.session));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setS(s));return()=>data.subscription.unsubscribe()},[])
 useEffect(()=>{const h=(e:any)=>{e.preventDefault();setPrompt(e)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[])
 useEffect(()=>{if(session)supabase.from('profiles').select('username').eq('id',session.user.id).single().then(r=>setUn(r.data?.username||session.user.email))},[session])
 const all=useRecs(undefined,session?.user.id)
 if(!configured)return <div className="p-6 max-w-lg space-y-2"><h1 className="text-xl">Configuration manquante</h1><p className="text-mut text-sm">Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir README).</p></div>
 if(session===undefined)return <div className="p-6 text-mut">Chargement…</div>
 if(!session)return <Auth/>
 const uid=session.user.id,mod=MODS.find(m=>m.key===view)
 const hits=q.length>1?all.recs.filter(r=>JSON.stringify(r.data).toLowerCase().includes(q.toLowerCase())).slice(0,8):[]
 const nav=(k:string)=>{setV(k);setQ('');if(window.innerWidth<768)setOpen(false)}
 const items=[['dashboard','🏠','Tableau de bord'],...MODS.map(m=>[m.key,m.icon,m.label]),['chat','💬','Chat'],['team','👥','Équipe'],['settings','⚙️','Paramètres']]
 const title=items.find(i=>i[0]===view)?.[2]
 return <div className="flex h-screen">
  {open&&<aside className="w-56 shrink-0 bg-card border-r border-line overflow-auto p-2 fixed md:static inset-y-0 z-20"><div className="px-2 py-3 font-semibold">NACORP OS</div>
   {items.map(([k,i,l])=><button key={k} onClick={()=>nav(k)} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex gap-2 hover:bg-white/5 ${view===k?'bg-white/10':''}`}><span>{i}</span>{l}</button>)}
   <div className="px-2 pt-4 text-xs text-mut truncate">@{uname}</div><button className="px-2 py-1 text-xs text-mut" onClick={()=>supabase.auth.signOut()}>Déconnexion</button></aside>}
  <main className="flex-1 min-w-0 overflow-auto"><header className="sticky top-0 bg-bg/90 backdrop-blur border-b border-line p-3 flex gap-3 items-center z-10">
   <button className="btn2" onClick={()=>setOpen(!open)}>☰</button><span className="font-medium hidden sm:block">{title}</span>
   <div className="relative flex-1 max-w-xl mx-auto"><input className="inp" placeholder="Rechercher partout…" value={q} onChange={e=>setQ(e.target.value)}/>
    {hits.length>0&&<div className="absolute top-full mt-1 w-full card p-1 z-30">{hits.map(r=><button key={r.id} onClick={()=>nav(r.module)} className="block w-full text-left text-sm px-2 py-1 hover:bg-white/5 rounded">{MODS.find(m=>m.key===r.module)?.icon} {r.data.name||r.data.subject||r.data.project}</button>)}</div>}</div>
   {prompt&&<button className="btn" onClick={()=>{prompt.prompt();setPrompt(null)}}>Installer NACORP OS</button>}</header>
   <div className="p-4">{view==='dashboard'?<Dashboard uid={uid} go={nav}/>:view==='chat'?<Chat uid={uid} name={uname}/>:view==='team'?<Team uid={uid}/>:view==='settings'?<Settings uid={uid} email={session.user.email} onInstall={prompt?()=>prompt.prompt():null}/>:mod?<Module key={mod.key} m={mod} uid={uid}/>:null}</div></main></div>}
