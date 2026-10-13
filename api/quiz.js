'use strict';
const auth=require('../lib/auth'),store=require('../lib/store'),error=require('../lib/messages'),pronunciation=require('../pronunciation');
// Quiz preparation reads cached Redis words only. No Notion queries or writes.
module.exports=async function(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return auth.json(res,405,{error:'METHOD_NOT_ALLOWED'});}
 if(!auth.requireAuth(req,res))return;
 if(!auth.sameOrigin(req)||!String(req.headers['content-type']||'').startsWith('application/json'))return auth.json(res,403,{error:'ORIGIN_REJECTED'});
 try{const data=await store.list(req.body||{},{pageSize:100});return auth.json(res,200,{words:data.words.map(pronunciation.enrich).map(w=>({id:w.id,hasAudio:w.hasAudio===true,word:w.word,language:w.language,meaning:w.meaning,reading:w.reading,koreanReading:w.koreanReading,koreanReadingSource:w.koreanReadingSource,koreanReadingVersion:w.koreanReadingVersion})),total:data.total,page:data.page,pageSize:data.pageSize,fetchedAt:data.fetchedAt});}catch(e){return auth.json(res,e.kind==='INVALID_QUERY'?400:502,error(e));}
};
