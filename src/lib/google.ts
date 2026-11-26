import {useCallback,useEffect,useState} from 'react'
import {supabase} from './supabase'
const A='https://www.googleapis.com/auth/'
export const SCOPES:Record<string,string>={youtube:A+'youtube.readonly',gmail:A+'gmail.readonly',drive:A+'drive.readonly',calendar:A+'calendar.readonly'}
export const SERVICES=[{k:'youtube',n:'YouTube',i:'▶️',d:'Chaînes, abonnés, vues et dernières vidéos (lecture).'},{k:'gmail',n:'Gmail',i:'✉️',d:'Consulter et rechercher tes e-mails (lecture seule).'},
 {k:'drive',n:'Google Drive',i:'📁',d:'Lister et rechercher tes fichiers (lecture seule).'},{k:'calendar',n:'Google Calendar',i:'🗓️',d:'Afficher tes prochains événements (lecture seule).'}]
export const FUTURE=['Twitch','Discord','TikTok','Instagram','Spotify']
export async function fn(body:any){const {data,error}=await supabase.functions.invoke('google',{body})
 if(error){let m=error.message;try{m=(await error.context.json()).error||m}catch{};throw new Error(m)}
 if(data?.error)throw new Error(data.error);return data}
export const connect=async(svc:string)=>{const {url}=await fn({action:'start',scopes:[SCOPES[svc]]});location.href=url}
export const gapi=async(id:string,url:string)=>{const r=await fn({action:'api',connection_id:id,url});if(r.status>=400)throw new Error(r.data?.error?.message||'Erreur Google '+r.status);return r.data}
export const has=(c:any,svc:string)=>c.scopes.split(' ').includes(SCOPES[svc])
export function useConns(){const [conns,set]=useState<any[]>([])
 const load=useCallback(async()=>{const {data}=await supabase.from('connections').select('*');set(data||[])},[])
 useEffect(()=>{load()},[load]);return {conns,load}}
