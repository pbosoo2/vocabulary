'use strict';
const crypto=require('node:crypto');const r=require('./redis');
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase();
function searchable(w){return [w.word,w.meaning,w.reading,w.koreanReading].map(normalize).join('\n');}
function grams(text){const chars=Array.from(text);const values=new Set(chars.filter(c=>c!=='\n'));for(let i=0;i<chars.length-1;i++)if(chars[i]!=='\n'&&chars[i+1]!=='\n')values.add(chars[i]+chars[i+1]);return [...values].map(g=>'search:'+Buffer.from(g).toString('base64url'));}
function member(w){return normalize(w.word)+'\x1f'+w.id;}
function memberships(w){return ['lang:'+w.language,...(w.registeredDate?['date:'+w.registeredDate]:[]),...grams(searchable(w))];}
async function replacePage(pageId,words,createdTime){const previous=r.parse(await r.command('HGET',r.key('pages'),pageId))||[];const cmds=[];
 for(const w of previous){const m=member(w);cmds.push(['HDEL',r.key('records'),m],['HDEL',r.key('ids'),w.id]);for(const order of ['original','az','least'])cmds.push(['ZREM',r.key(order),m]);for(const group of memberships(w))cmds.push(['SREM',r.key(group),m]);}
 for(const w of words){const m=member(w);cmds.push(['HSET',r.key('records'),m,JSON.stringify({...w,_search:searchable(w)})],['HSET',r.key('ids'),w.id,m],['ZADD',r.key('original'),Date.parse(createdTime)||0,m],['ZADD',r.key('az'),0,m],['ZADD',r.key('least'),w.studyCount??Number.MAX_SAFE_INTEGER,m]);for(const group of memberships(w))cmds.push(['SADD',r.key(group),m]);}
 cmds.push(['HSET',r.key('pages'),pageId,JSON.stringify(words)],['SADD',r.key('word-pages'),pageId]);await r.transaction(cmds);
}
async function deletePage(id){await replacePage(id,[],null);await r.transaction([['HDEL',r.key('pages'),id],['SREM',r.key('word-pages'),id]]);}
async function meta(){return r.parse(await r.command('GET',r.key('meta')))||{fetchedAt:null,nextSyncAt:null,watermark:null,reconciledAt:null};}
async function status(){const [m,j]=await r.pipeline([['GET',r.key('meta')],['GET',r.key('job')]]);const data=r.parse(m)||{};const job=r.parse(j);return{fetchedAt:data.fetchedAt||null,nextSyncAt:data.nextSyncAt||null,syncPending:!!job,lastError:data.lastError||null,syncProgress:job?{processed:job.processed,initial:job.initial,phase:job.phase}:null};}
// Some Redis providers reject ZINTERSTORE with ordinary Set inputs. Keep existing
// filters as Sets: intersect Sets only, then copy their scores from the sort ZSET.
// This changes no persistent data or namespace and never fetches Notion pages.
const FILTER_INDEX=`local members=redis.call('SINTER',unpack(KEYS,3,#KEYS));local count=0;local batch={};for _,m in ipairs(members) do local score=redis.call('ZSCORE',KEYS[2],m);if score then table.insert(batch,score);table.insert(batch,m);count=count+1;if #batch>=256 then redis.call('ZADD',KEYS[1],unpack(batch));batch={} end end end;if #batch>0 then redis.call('ZADD',KEYS[1],unpack(batch)) end;redis.call('EXPIRE',KEYS[1],60);return count`;
// Only search candidates are scanned inside Redis; normal listing reads ten records.
const SEARCH=`local all=redis.call('ZRANGE',KEYS[1],0,-1);if ARGV[4]=='1' then all=redis.call('ZREVRANGE',KEYS[1],0,-1) end;local total=0;local rows={};local offset=tonumber(ARGV[2]);local take=tonumber(ARGV[3]);for _,m in ipairs(all) do local raw=redis.call('HGET',KEYS[2],m);if raw then local w=cjson.decode(raw);if string.find(w._search,ARGV[1],1,true) then if total>=offset and #rows<take then table.insert(rows,raw) end;total=total+1 end end end;return {total,rows}`;
async function list(input={}){const page=Number(input.page??1);if(!Number.isSafeInteger(page)||page<1||page>1000000)throw r.failure('INVALID_QUERY');const lang=input.lang||'오늘',sort=input.sort||'original';if(!['오늘','영어','일본어','보관','전체'].includes(lang)||!['original','az','least'].includes(sort))throw r.failure('INVALID_QUERY');const q=normalize(input.q).trim();if(q.length>120)throw r.failure('INVALID_QUERY');const favorites=input.favorites||[];if(!Array.isArray(favorites)||favorites.length>2000||favorites.some(x=>typeof x!=='string'||x.length>80))throw r.failure('INVALID_QUERY');
 const temp=r.key('query:'+crypto.randomUUID()),fav=temp+':favorites';let index=r.key(sort);const sets=[];const reverse=sort==='original';
 try{
  if(lang==='오늘')sets.push(r.key('date:'+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())));else if(['영어','일본어'].includes(lang))sets.push(r.key('lang:'+lang));
  if(lang==='보관'){if(!favorites.length)return{words:[],total:0,page,pageSize:10,...await status()};const members=await r.command('HMGET',r.key('ids'),...favorites);const selected=members.filter(Boolean);if(!selected.length)return{words:[],total:0,page,pageSize:10,...await status()};await r.transaction([['SADD',fav,...selected],['EXPIRE',fav,60]]);sets.push(fav);}
  if(q){const groups=grams(q);const sizes=await r.pipeline(groups.map(g=>['SCARD',r.key(g)]));const selected=groups.map((g,i)=>({g,n:Number(sizes[i])})).sort((a,b)=>a.n-b.n).slice(0,8);if(selected.some(x=>x.n===0))return{words:[],total:0,page,pageSize:10,...await status()};sets.push(...selected.map(x=>r.key(x.g)));}
  if(sets.length){await r.command('EVAL',FILTER_INDEX,sets.length+2,temp,index,...sets);index=temp;}
  const offset=(page-1)*10;let total,raw;
  if(q){const found=await r.command('EVAL',SEARCH,2,index,r.key('records'),q,offset,10,reverse?'1':'0');total=Number(found[0]);raw=found[1]||[];}
  else{const results=await r.pipeline([['ZCARD',index],[reverse?'ZREVRANGE':'ZRANGE',index,offset,offset+9]]);total=Number(results[0]);const members=results[1]||[];raw=members.length?await r.command('HMGET',r.key('records'),...members):[];}
  const words=raw.filter(Boolean).map(x=>{const {_search,...w}=r.parse(x);return w;});return{words,total,page,pageSize:10,...await status()};
 }finally{await r.command('DEL',temp,fav);}
}
module.exports={replacePage,deletePage,meta,status,list,normalize,grams};
