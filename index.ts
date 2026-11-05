import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const origin = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const cors = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
const json = (data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req => {
 if (!origin || req.headers.get("origin") !== origin) return json({error:"Origin not allowed"},403);
 if (req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try {
  const token=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!token)return json({error:"Login required"},401);
  const url=Deno.env.get("SUPABASE_URL")!;
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authClient=createClient(url,publicKey,{auth:{persistSession:false}});
  const {data:{user},error}=await authClient.auth.getUser(token);
  if(error||!user)return json({error:"Invalid login"},401);
  const {action}=await req.json();
  const vapidPublic=Deno.env.get("VAPID_PUBLIC_KEY")||"";
  if(action==="public-key")return json({publicKey:vapidPublic});
  if(action!=="send-test")return json({error:"Unknown action"},400);
  const vapidPrivate=Deno.env.get("VAPID_PRIVATE_KEY")||"";
  const vapidSubject=Deno.env.get("VAPID_SUBJECT")||"";
  if(!vapidPublic||!vapidPrivate||!vapidSubject)return json({error:"VAPID is not configured"},503);
  webpush.setVapidDetails(vapidSubject,vapidPublic,vapidPrivate);
  const db=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:rows,error:readError}=await db.from("ispi_push_subscriptions").select("id,endpoint,p256dh,auth_key,last_test_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(3);
  if(readError)throw readError;
  if(!rows?.length)return json({error:"No registered device"},400);
  let sent=0,failed=0,throttled=0;
  for(const row of rows){
   if(row.last_test_at && Date.now()-Date.parse(row.last_test_at)<60000){throttled++;continue;}
   const now=new Date().toISOString();
   const {data:claimed,error:claimError}=await db.from("ispi_push_subscriptions").update({last_test_at:now}).eq("id",row.id).eq("user_id",user.id).or(`last_test_at.is.null,last_test_at.lt.${new Date(Date.now()-60000).toISOString()}`).select("id");
   if(claimError||!claimed?.length){throttled++;continue;}
   try{await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth_key}},JSON.stringify({type:"test"}),{TTL:60});sent++;}
   catch(e){failed++;const code=(e as {statusCode?:number}).statusCode;if(code===404||code===410)await db.from("ispi_push_subscriptions").delete().eq("id",row.id).eq("user_id",user.id);}
  }
  if(!sent&&throttled&&!failed)return json({error:"再送信は60秒以上空けてください。"},429);
  return json({sent,failed,throttled});
 }catch(e){console.error("Push error",e);return json({error:"Push server error"},500)}
});
