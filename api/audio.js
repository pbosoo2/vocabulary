'use strict';
const auth=require('../lib/auth'),notion=require('../lib/notion');
// This endpoint refreshes only an authorized word's temporary media URLs.
// It does not sync word data, write Notion, store audio bytes, or persist URLs.
module.exports=async function(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return auth.json(res,405,{error:'METHOD_NOT_ALLOWED'});}
 if(!auth.requireAuth(req,res))return;
 if(!auth.sameOrigin(req)||!String(req.headers['content-type']||'').startsWith('application/json'))return auth.json(res,403,{error:'ORIGIN_REJECTED'});
 try{notion.setDeadline(Date.now()+18000);const files=await notion.readAudio(req.body?.id);return auth.json(res,200,{files});}
 catch(e){const status=e.kind==='INVALID_AUDIO_ID'?400:['AUDIO_NOT_FOUND','NOTION_NOT_FOUND'].includes(e.kind)?404:502;return auth.json(res,status,{error:'AUDIO_UNAVAILABLE',message:status===404?'등록된 발음 파일을 찾을 수 없어요. 동기화 후 다시 확인해 주세요.':'발음 파일을 불러오지 못했어요. 잠시 후 다시 눌러 주세요.'});}
};
