import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 // Scheduled invocations must supply a separate, high-entropy server secret.
 const secret=Deno.env.get("NOTIFICATION_CRON_SECRET");
 if(!secret||req.headers.get("x-ispi-cron-secret")!==secret)return json({error:"Forbidden"},403);
 const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const db=createClient(url,key,{auth:{persistSession:false}});
 const pub=Deno.env.get("VAPID_PUBLIC_KEY")||"",priv=Deno.env.get("VAPID_PRIVATE_KEY")||"",subject=Deno.env.get("VAPID_SUBJECT")||"";
 if(!pub||!priv||!subject)return json({error:"VAPID not configured"},503);
 webpush.setVapidDetails(subject,pub,priv);
 const {data:jobs,error}=await db.rpc("ispi_claim_due_notifications",{batch_size:50});
 if(error)return json({error:"Claim failed"},500);
 let sent=0,failed=0;
 for(const job of jobs||[]){
  try{
   // Recheck state immediately before dispatch; cancellation may have occurred.
   const {data:current}=await db.from("ispi_notification_jobs").select("status").eq("id",job.id).single();
   if(current?.status!=="processing")continue;
   const {data:devices,error:devicesError}=await db.from("ispi_push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("user_id",job.user_id).limit(20);
   if(devicesError)throw devicesError;
   let delivered=0;
   for(const device of devices||[]){
    try{await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}},JSON.stringify({type:"reminder",kind:job.source_type,jobId:job.id}),{TTL:3600});delivered++}
    catch(e){const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410)await db.from("ispi_push_subscriptions").delete().eq("id",device.id).eq("user_id",job.user_id)}
   }
   const state=delivered?'sent':'failed';
   await db.from("ispi_notification_jobs").update({status:state,updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","processing");
   if(delivered)sent++;else failed++;
  }catch(e){console.error("Dispatch failed",job.id,e);failed++;await db.from("ispi_notification_jobs").update({status:"failed",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","processing")}
 }
 return json({claimed:(jobs||[]).length,sent,failed});
});
