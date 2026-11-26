import {createClient} from 'npm:@supabase/supabase-js@2'
const env=(k:string)=>Deno.env.get(k)!
const sb=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'))
const FN=env('SUPABASE_URL')+'/functions/v1/google'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}})
const b64=(u:Uint8Array)=>btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
const ALLOW=['https://www.googleapis.com/','https://gmail.googleapis.com/']
const tokenReq=async(p:Record<string,string>)=>(await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),client_secret:env('GOOGLE_CLIENT_SECRET'),...p})})).json()

async function callback(u:URL){
 const back=(q:string)=>Response.redirect(env('APP_URL')+'/?'+q,302),state=u.searchParams.get('state'),code=u.searchParams.get('code')
 if(u.searchParams.get('error')||!state||!code)return back('oauth_error='+encodeURIComponent(u.searchParams.get('error')||'annulé'))
 const {data:st}=await sb.from('oauth_states').select('*').eq('state',state).maybeSingle()
 if(!st||Date.now()-new Date(st.created_at).getTime()>600000)return back('oauth_error=session_expirée')
 await sb.from('oauth_states').delete().eq('state',state)
 const t=await tokenReq({grant_type:'authorization_code',code,redirect_uri:FN,code_verifier:st.verifier})
 if(t.error)return back('oauth_error='+encodeURIComponent(t.error_description||t.error))
 const me=await(await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+t.access_token}})).json()
 const {data:old}=await sb.from('connections').select('refresh_token,scopes').eq('owner',st.owner).eq('provider','google').eq('account_id',me.sub).maybeSingle()
 const scopes=[...new Set([...(old?.scopes?.split(' ')||[]),...t.scope.split(' ')])].join(' ')
 const {error}=await sb.from('connections').upsert({owner:st.owner,provider:'google',account_id:me.sub,account_email:me.email,account_name:me.name,scopes,
  refresh_token:t.refresh_token||old?.refresh_token,access_token:t.access_token,expires_at:new Date(Date.now()+t.expires_in*1000).toISOString()},{onConflict:'owner,provider,account_id'})
 return back(error?'oauth_error='+encodeURIComponent(error.message):'connected=google')}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method==='GET')return callback(new URL(req.url))
 try{
  const {data:{user}}=await sb.auth.getUser((req.headers.get('Authorization')||'').replace('Bearer ',''))
  if(!user)return json({error:'Non connecté'},401)
  const b=await req.json()
  if(b.action==='start'){
   const sc:string[]=(b.scopes||[]).filter((s:string)=>s.startsWith('https://www.googleapis.com/auth/'))
   if(!sc.length)return json({error:'Permission invalide'},400)
   const verifier=b64(crypto.getRandomValues(new Uint8Array(32))),state=crypto.randomUUID()
   const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))
   await sb.from('oauth_states').insert({state,owner:user.id,verifier})
   return json({url:'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:env('GOOGLE_CLIENT_ID'),redirect_uri:FN,response_type:'code',
    scope:'openid email profile '+sc.join(' '),access_type:'offline',prompt:'consent select_account',include_granted_scopes:'true',state,code_challenge:challenge,code_challenge_method:'S256'})})}
  const {data:c}=await sb.from('connections').select('*').eq('id',b.id||b.connection_id).eq('owner',user.id).maybeSingle()
  if(!c)return json({error:'Compte introuvable'},404)
  if(b.action==='disconnect'){
   if(c.refresh_token)await fetch('https://oauth2.googleapis.com/revoke?token='+c.refresh_token,{method:'POST'})
   await sb.from('connections').delete().eq('id',c.id);return json({ok:true})}
  if(b.action==='api'){
   if(!ALLOW.some(a=>String(b.url).startsWith(a)))return json({error:'URL non autorisée'},400)
   let tok=c.access_token
   if(!tok||new Date(c.expires_at).getTime()<Date.now()+60000){
    const t=await tokenReq({grant_type:'refresh_token',refresh_token:c.refresh_token||''})
    if(t.error)return json({error:'Autorisation expirée ou révoquée : reconnecte ce compte.',reauth:true},401)
    tok=t.access_token;await sb.from('connections').update({access_token:tok,expires_at:new Date(Date.now()+t.expires_in*1000).toISOString()}).eq('id',c.id)}
   const r=await fetch(b.url,{method:b.method||'GET',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:b.body?JSON.stringify(b.body):undefined})
   return json({status:r.status,data:await r.json().catch(()=>null)})}
  return json({error:'Action inconnue'},400)
 }catch(e){return json({error:String(e.message||e)},500)}})
