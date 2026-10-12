'use strict';
const crypto = require('node:crypto');
const COOKIE = '__Host-vocabulary';
const AGE = 60 * 60 * 24 * 7;
function configured() { return typeof process.env.APP_PASSWORD === 'string' && process.env.APP_PASSWORD.length >= 16 && typeof process.env.SESSION_SECRET === 'string' && process.env.SESSION_SECRET.length >= 32; }
function secureHeaders(res) { res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer'); }
function json(res, status, body) { secureHeaders(res); res.status(status).json(body); }
function equal(a,b) { const digest=v=>crypto.createHash('sha256').update(String(v)).digest(); return crypto.timingSafeEqual(digest(a),digest(b)); }
function signature(data) { return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).update(crypto.createHash('sha256').update(process.env.APP_PASSWORD).digest()).digest('base64url'); }
function issue() { const data = Buffer.from(JSON.stringify({ exp:Math.floor(Date.now()/1000)+AGE,nonce:crypto.randomBytes(16).toString('hex') })).toString('base64url'); return data+'.'+signature(data); }
function authenticated(req) { if (!configured()) return false; try { const raw = String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'=')); if(!raw)return false; const token=raw.slice(COOKIE.length+1); if(token.length>1024)return false;const [data,sig,extra]=token.split('.');if(extra||!sig||!equal(sig,signature(data)))return false;const body=JSON.parse(Buffer.from(data,'base64url').toString());return Number.isFinite(body.exp)&&body.exp>Math.floor(Date.now()/1000)&&body.exp<=Math.floor(Date.now()/1000)+AGE+60; } catch { return false; } }
function setCookie(res,token) { res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${AGE}`); }
function clearCookie(res) { res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`); }
function sameOrigin(req) { if(req.headers['sec-fetch-site']==='cross-site')return false;try{return new URL(req.headers.origin).origin==='https://'+req.headers.host;}catch{return false;} }
function requireAuth(req,res) { if(!configured()){json(res,503,{error:'AUTH_NOT_CONFIGURED',message:'Vercel의 APP_PASSWORD(16자 이상), SESSION_SECRET(32자 이상)을 설정해 주세요.'});return false;}if(!authenticated(req)){json(res,401,{error:'LOGIN_REQUIRED',message:'로그인이 필요합니다.'});return false;}return true; }
module.exports={AGE,configured,json,equal,issue,authenticated,setCookie,clearCookie,sameOrigin,requireAuth};
