import {useEffect,useState} from 'react'
import {SERVICES,FUTURE,connect,fn,gapi,has,useConns} from './lib/google'
export const SVC_OF:Record<string,string>={video:'youtube',mail:'gmail',drive:'drive',calendrier:'calendar'}
export function ConnBadge({svc}:{svc:string}){const {conns}=useConns(),n=conns.filter(c=>has(c,svc)).length,s=SERVICES.find(x=>x.k===svc)!
 return <div className="text-xs flex items-center gap-2"><span className={n?'text-green-400':'text-mut'}>●</span>{s.n} — {n?`${n} compte(s) connecté(s)`:'Non connecté'}{!n&&<button className="underline" onClick={()=>connect(svc).catch(e=>alert(e.message))}>Connecter</button>}</div>}
export function Conn(){
 const {conns,load}=useConns(),[msg,setMsg]=useState(()=>{const p=new URLSearchParams(location.search),e=p.get('oauth_error');if(e||p.get('connected'))history.replaceState({},'','/');return e?'Erreur de connexion : '+e:p.get('connected')?'Compte connecté ✔':''})
 const off=async(id:string)=>{if(!confirm('Déconnecter ce compte Google ? Tous les services qu’il autorise seront déconnectés.'))return;try{await fn({action:'disconnect',id});load()}catch(e:any){setMsg(e.message)}}
 return <div className="space-y-3"><h2 className="font-medium">Connexions</h2>{msg&&<p className="text-sm">{msg}</p>}
  <div className="grid sm:grid-cols-2 gap-3">{SERVICES.map(s=>{const acc=conns.filter(c=>has(c,s.k));return <div key={s.k} className="card space-y-2">
   <div className="flex gap-2 items-center"><span className="text-xl">{s.i}</span><b className="text-sm">{s.n}</b><span className={`ml-auto text-xs ${acc.length?'text-green-400':'text-mut'}`}>{acc.length?'Connecté':'Non connecté'}</span></div>
   <p className="text-xs text-mut">{s.d}</p>
   {acc.map(c=><div key={c.id} className="text-xs flex justify-between gap-2"><span className="truncate">{c.account_email}</span><button className="text-red-400" onClick={()=>off(c.id)}>Déconnecter</button></div>)}
   <button className="btn2 text-xs" onClick={()=>connect(s.k).catch(e=>setMsg(e.message))}>{acc.length?'Ajouter / renouveler un compte':'Connecter'}</button></div>})}</div>
  <div className="card text-xs text-mut">Bientôt (non disponibles) : {FUTURE.join(', ')}.</div></div>}
export function GPanel({svc}:{svc:string}){
 const {conns}=useConns(),acc=conns.filter(c=>has(c,svc)),[sel,setSel]=useState(''),[q,setQ]=useState(''),[rows,setRows]=useState<any[]>([]),[err,setErr]=useState(''),[busy,setB]=useState(false),id=sel||acc[0]?.id
 const run=async()=>{if(!id)return;setB(true);setErr('')
  try{let r:any[]=[];const E=encodeURIComponent
   if(svc==='gmail'){const l=await gapi(id,`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=${E(q)}`)
    r=await Promise.all((l.messages||[]).map(async(m:any)=>{const d=await gapi(id,`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);const h=(n:string)=>d.payload.headers.find((x:any)=>x.name===n)?.value||''
     return {t:h('Subject')||'(sans objet)',s:h('From')+' · '+h('Date'),l:'https://mail.google.com/mail/u/0/#all/'+m.id}}))}
   else if(svc==='drive'){const f=await gapi(id,`https://www.googleapis.com/drive/v3/files?pageSize=30&orderBy=modifiedTime%20desc&fields=files(name,modifiedTime,webViewLink)${q?'&q='+E(`name contains '${q.replace(/'/g,"\\'")}'`):''}`)
    r=f.files.map((x:any)=>({t:x.name,s:new Date(x.modifiedTime).toLocaleString('fr-FR'),l:x.webViewLink}))}
   else{const e=await gapi(id,`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=30&singleEvents=true&orderBy=startTime&timeMin=${E(new Date().toISOString())}${q?'&q='+E(q):''}`)
    r=e.items.map((x:any)=>({t:x.summary||'(sans titre)',s:new Date(x.start.dateTime||x.start.date).toLocaleString('fr-FR'),l:x.htmlLink}))}
   setRows(r)}catch(e:any){setErr(e.message)}setB(false)}
 useEffect(()=>{run()},[id])
 if(!acc.length)return null
 return <div className="card space-y-2"><div className="flex gap-2 flex-wrap">{acc.length>1&&<select className="inp max-w-xs" value={id} onChange={e=>setSel(e.target.value)}>{acc.map(c=><option key={c.id} value={c.id}>{c.account_email}</option>)}</select>}
  <input className="inp max-w-xs" placeholder="Rechercher (Google)…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run()}/><button className="btn2" onClick={run} disabled={busy}>{busy?'…':'Chercher / actualiser'}</button></div>
  {err&&<p className="text-red-400 text-sm">{err}</p>}{!rows.length&&!busy&&!err&&<p className="text-mut text-xs">Aucun résultat.</p>}
  {rows.map((r,i)=><a key={i} href={r.l} target="_blank" className="block text-sm hover:bg-white/5 rounded px-1"><div className="truncate">{r.t}</div><div className="text-xs text-mut truncate">{r.s}</div></a>)}</div>}
