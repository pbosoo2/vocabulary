'use strict';
const crypto=require('node:crypto');
function failure(kind){return Object.assign(new Error(kind),{kind});}
function settings(){const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;if(!url||!token)throw failure('REDIS_NOT_CONFIGURED');const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw failure('REDIS_NOT_CONFIGURED');return{url:u.origin,token};}
async function send(commands,mode=''){const {url,token}=settings();let res;try{res=await fetch(url+(mode?'/'+mode:''),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(commands),signal:AbortSignal.timeout(10000)});}catch{throw failure('REDIS_UNAVAILABLE');}if(!res.ok)throw failure(res.status===401||res.status===403?'REDIS_CREDENTIALS_INVALID':'REDIS_UNAVAILABLE');const data=await res.json();const rows=mode?data:[data];if(!Array.isArray(rows)||rows.some(x=>x.error))throw failure('REDIS_COMMAND_FAILED');return rows.map(x=>x.result);}
const command=async(...args)=>(await send(args))[0];
const pipeline=cmds=>cmds.length?send(cmds,'pipeline'):Promise.resolve([]);
const transaction=cmds=>cmds.length?send(cmds,'multi-exec'):Promise.resolve([]);
function namespace(){const src=(process.env.NOTION_DATA_SOURCE_ID||'3f7551f3-818b-8095-93b4-000bc45e4202')+':'+(process.env.NOTION_LEARNING_DATA_SOURCE_ID||'21cd8aef-3b88-4af4-9b38-f095c61d3130');return 'vocabulary:v3:'+crypto.createHash('sha256').update(src).digest('hex').slice(0,16)+':';}
const key=name=>namespace()+name;
const parse=v=>v==null?null:typeof v==='string'?JSON.parse(v):v;
module.exports={command,pipeline,transaction,key,parse,failure};
