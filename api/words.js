'use strict';
const auth=require('../lib/auth');const store=require('../lib/store');const error=require('../lib/messages');
module.exports=async function(req,res){if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return auth.json(res,405,{error:'METHOD_NOT_ALLOWED'});}if(!auth.requireAuth(req,res))return;if(req.method==='POST'&&(!auth.sameOrigin(req)||!String(req.headers['content-type']||'').startsWith('application/json')))return auth.json(res,403,{error:'ORIGIN_REJECTED'});
try{const input=req.method==='POST'?req.body||{}:req.query||{};return auth.json(res,200,await store.list(input));}catch(e){return auth.json(res,e.kind==='INVALID_QUERY'?400:502,error(e));}};
