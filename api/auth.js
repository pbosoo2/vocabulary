'use strict';
const auth = require('../lib/auth');
// 인스턴스별 보조 제한입니다. 분산 공격 제한은 Vercel Firewall에서 추가하세요.
const attempts = new Map();
module.exports=async function(req,res){
 if(req.method==='GET'){if(!auth.configured())return auth.json(res,503,{error:'AUTH_NOT_CONFIGURED',message:'사이트 비밀번호와 세션 키 설정이 필요합니다.'});const authenticated=auth.authenticated(req);return auth.json(res,200,{authenticated,...(authenticated?{cacheKey:auth.cacheKeyFor(req)}:{})});}
 if(!['POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return auth.json(res,405,{error:'METHOD_NOT_ALLOWED'});}
 if(!auth.sameOrigin(req))return auth.json(res,403,{error:'ORIGIN_DENIED',message:'사이트 안에서 다시 시도해 주세요.'});
 if(req.method==='DELETE'){auth.clearCookie(res);return auth.json(res,200,{ok:true});}
 if(!auth.configured())return auth.json(res,503,{error:'AUTH_NOT_CONFIGURED',message:'APP_PASSWORD(8자 이상), SESSION_SECRET(32자 이상)을 설정해 주세요.'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return auth.json(res,415,{error:'JSON_REQUIRED'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 const now=Date.now();for(const [key,a]of attempts){if(now-a.start>15*60*1000)attempts.delete(key);}
 const a=attempts.get(ip)||{start:now,count:0};if(a.count>=5){res.setHeader('Retry-After','900');return auth.json(res,429,{error:'TRY_LATER',message:'잠시 후 다시 시도해 주세요.'});}
 let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return auth.json(res,400,{error:'INVALID_BODY'});}
 if(!body||typeof body.password!=='string'||body.password.length>512)return auth.json(res,400,{error:'INVALID_BODY',message:'비밀번호를 입력해 주세요.'});
 if(!auth.equal(body.password,process.env.APP_PASSWORD)){a.count++;if(attempts.size<10000)attempts.set(ip,a);await new Promise(r=>setTimeout(r,300));return auth.json(res,401,{error:'INVALID_PASSWORD',message:'비밀번호가 맞지 않습니다.'});}
 attempts.delete(ip);const token=auth.issue();auth.setCookie(res,token);return auth.json(res,200,{ok:true,cacheKey:auth.cacheKey(token)});
};
