import {useEffect,useRef,useState} from 'react'
import {supabase} from './lib/supabase'
import {connect,gapi,has,useConns} from './lib/google'
const Y='https://www.googleapis.com/youtube/v3'
async function build(cid:string,ch:any){let recent:any[]=[]
 try{const p=await gapi(cid,`${Y}/playlistItems?part=contentDetails&maxResults=10&playlistId=${ch.contentDetails.relatedPlaylists.uploads}`)
  const ids=p.items.map((i:any)=>i.contentDetails.videoId).join(',')
  if(ids){const v=await gapi(cid,`${Y}/videos?part=snippet,statistics&id=${ids}`);recent=v.items.map((x:any)=>({id:x.id,title:x.snippet.title,date:x.snippet.publishedAt,views:+x.statistics.viewCount||0,likes:+x.statistics.likeCount||0,comments:+x.statistics.commentCount||0}))}}catch{}
 const s=ch.statistics;return {ytId:ch.id,connId:cid,name:ch.snippet.title,thumb:ch.snippet.thumbnails?.default?.url,url:'https://youtube.com/channel/'+ch.id,subs:+s.subscriberCount||0,hiddenSubs:!!s.hiddenSubscriberCount,views:+s.viewCount||0,videos:+s.videoCount||0,recent,synced:new Date().toISOString()}}
export default function YT({recs,uid,reload}:{recs:any[];uid:string;reload:()=>void}){
 const {conns}=useConns(),yc=conns.filter(c=>has(c,'youtube')),[msg,setMsg]=useState(''),[busy,setB]=useState(false),[avail,setAvail]=useState<any[]>([]),yt=recs.filter(r=>r.data.ytId),ran=useRef('')
 const save=async(f:any,ex?:any)=>{const d=await build(f.cid,f.ch),data={...ex?.data,...d}
  const r=ex?await supabase.from('records').update({data,updated_at:new Date().toISOString()}).eq('id',ex.id):await supabase.from('records').insert({module:'video',owner:uid,data});if(r.error)throw new Error(r.error.message)}
 const scan=async(force=false)=>{setB(true);setMsg('');const found:any[]=[]
  try{for(const c of yc){try{const r=await gapi(c.id,`${Y}/channels?part=snippet,statistics,contentDetails&mine=true`);(r.items||[]).forEach((ch:any)=>found.push({cid:c.id,email:c.account_email,ch}))}catch(e:any){setMsg(c.account_email+' : '+e.message)}}
   setAvail(found)
   for(const f of found){const ex=yt.find(r=>r.data.ytId===f.ch.id);if(ex&&(force||Date.now()-new Date(ex.data.synced).getTime()>6*3600e3))await save(f,ex)}
   reload()}catch(e:any){setMsg(e.message)}setB(false)}
 useEffect(()=>{const k=yc.map(c=>c.id).join();if(k&&ran.current!==k&&recs){ran.current=k;scan()}},[yc.length,recs.length])
 const setGoal=async(r:any)=>{const v=prompt('Objectif de vues :',r.data.goal||'');if(v===null)return;if(isNaN(+v)||+v<0)return setMsg('Nombre invalide.');await supabase.from('records').update({data:{...r.data,goal:+v}}).eq('id',r.id);reload()}
 const del=async(r:any)=>{if(!confirm('Retirer « '+r.data.name+' » de NACORP ?'))return;await supabase.from('records').delete().eq('id',r.id);reload()}
 const fresh=avail.filter(f=>!yt.some(r=>r.data.ytId===f.ch.id))
 return <div className="space-y-3"><div className="flex flex-wrap gap-2"><button className="btn" onClick={()=>connect('youtube').catch(e=>setMsg(e.message))}>+ Ajouter une chaîne</button>
  {yc.length>0&&<button className="btn2" disabled={busy} onClick={()=>scan(true)}>{busy?'…':'Actualiser les stats'}</button>}</div>
  <p className="text-mut text-xs">Mise à jour auto toutes les 6 h à l’ouverture (3 requêtes API par chaîne). Pour renouveler une autorisation : « + Ajouter une chaîne » puis le même compte.</p>
  {msg&&<p className="text-sm text-red-400">{msg}</p>}
  {fresh.length>0&&<div className="card space-y-2"><div className="text-sm">Chaînes disponibles :</div>{fresh.map(f=><div key={f.ch.id} className="flex justify-between items-center text-sm"><span>{f.ch.snippet.title} <span className="text-mut text-xs">({f.email})</span></span><button className="btn text-xs" onClick={()=>save(f).then(reload).catch(e=>setMsg(e.message))}>Ajouter</button></div>)}</div>}
  {yt.map(r=>{const d=r.data;return <div key={r.id} className="card space-y-2"><div className="flex items-center gap-3">{d.thumb&&<img src={d.thumb} className="w-10 h-10 rounded-full"/>}
   <div className="flex-1"><a className="font-medium underline" href={d.url} target="_blank">{d.name}</a><div className="text-xs text-mut">Synchronisé {new Date(d.synced).toLocaleString('fr-FR')}</div></div>
   <button className="btn2 text-xs" onClick={()=>setGoal(r)}>Objectif</button><button className="btn2 text-xs text-red-400" onClick={()=>del(r)}>Retirer</button></div>
   <div className="grid grid-cols-3 gap-2 text-center text-sm"><div><b>{d.hiddenSubs?'masqué':d.subs.toLocaleString('fr-FR')}</b><div className="text-mut text-xs">abonnés</div></div><div><b>{d.views.toLocaleString('fr-FR')}</b><div className="text-mut text-xs">vues</div></div><div><b>{d.videos}</b><div className="text-mut text-xs">vidéos</div></div></div>
   {d.goal>0&&<div><div className="h-2 bg-white/10 rounded"><div className="h-2 bg-white rounded" style={{width:Math.min(100,d.views/d.goal*100)+'%'}}/></div><div className="text-xs text-mut mt-1">{Math.round(d.views/d.goal*100)} % de l’objectif ({d.goal.toLocaleString('fr-FR')})</div></div>}
   <div className="text-xs space-y-1">{(d.recent||[]).map((v:any)=><div key={v.id} className="flex justify-between gap-2"><a className="truncate hover:underline" href={'https://youtu.be/'+v.id} target="_blank">{v.title}</a><span className="text-mut shrink-0">{v.views.toLocaleString('fr-FR')} vues</span></div>)}</div></div>})}</div>}
