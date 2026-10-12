'use strict';
const crypto=require('node:crypto');
function failure(kind,diagnostic){return Object.assign(new Error(kind),{kind,...(diagnostic?{diagnostic}:{})});}
function settings(){const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;if(!url||!token)throw failure('REDIS_NOT_CONFIGURED');const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw failure('REDIS_NOT_CONFIGURED');return{url:u.origin,token};}
// Return only allowlisted categories. Never include provider text, keys, URLs or credentials.
function category(value){const text=typeof value==='string'?value:'';if(/crossslot/i.test(text))return 'CROSS_SLOT';if(/wrongtype/i.test(text))return 'KEY_TYPE';if(/read.?only|noperm|permission|not authorized|not allowed|forbidden/i.test(text))return 'PERMISSION';if(/unknown command|not supported|unsupported/i.test(text))return 'UNSUPPORTED';if(/pipeline|transaction/i.test(text)&&/limit|maximum|too many/i.test(text))return 'BATCH_LIMIT';if(/memory|storage.*limit|max.*(size|storage)/i.test(text))return 'STORAGE_LIMIT';if(/quota|rate.?limit|too many.*(request|command)|max.*(request|command)|daily.*limit/i.test(text))return 'REQUEST_LIMIT';if(/syntax|wrong number|invalid.*(argument|number|integer|float)|not.*(integer|valid float)|out of range/i.test(text))return 'ARGUMENT';if(/timeout|time.*limit/i.test(text))return 'TIMEOUT';return 'PROVIDER_ERROR';}
function diagnostic(commands,mode,index,reason,status){const cmd=mode?commands[index]?.[0]:commands[0];return{command:typeof cmd==='string'&&/^[A-Z]{2,16}$/.test(cmd)?cmd:'RESPONSE',reason,...(Number.isInteger(status)?{status}:{})};}
async function send(commands,mode=''){const {url,token}=settings();let res;try{res=await fetch(url+(mode?'/'+mode:''),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(commands),signal:AbortSignal.timeout(10000)});}catch{throw failure('REDIS_UNAVAILABLE');}
 let data;try{data=await res.json();}catch{throw failure('REDIS_UNAVAILABLE');}
 const rows=mode?data:[data];
 if(!res.ok||!Array.isArray(rows)){
  const detail=diagnostic(commands,mode,0,typeof data?.error==='string'?category(data.error):'RESPONSE_FORMAT',res.status);
  const kind=res.status===401||res.status===403?'REDIS_CREDENTIALS_INVALID':data?.error?'REDIS_COMMAND_FAILED':'REDIS_UNAVAILABLE';
  if(kind==='REDIS_COMMAND_FAILED')console.error('Redis operation failed',JSON.stringify(detail));throw failure(kind,detail);
 }
 const failed=rows.findIndex(x=>!x||x.error);
 if(failed>=0){const detail=diagnostic(commands,mode,failed,category(rows[failed]?.error),res.status);console.error('Redis operation failed',JSON.stringify(detail));throw failure('REDIS_COMMAND_FAILED',detail);}
 return rows.map(x=>x.result);
}
const command=async(...args)=>(await send(args))[0];
const pipeline=cmds=>cmds.length?send(cmds,'pipeline'):Promise.resolve([]);
const transaction=cmds=>cmds.length?send(cmds,'multi-exec'):Promise.resolve([]);
function namespace(){const src=(process.env.NOTION_DATA_SOURCE_ID||'3f7551f3-818b-8095-93b4-000bc45e4202')+':'+(process.env.NOTION_LEARNING_DATA_SOURCE_ID||'21cd8aef-3b88-4af4-9b38-f095c61d3130');return 'vocabulary:v3:'+crypto.createHash('sha256').update(src).digest('hex').slice(0,16)+':';}
const key=name=>namespace()+name;
const parse=v=>v==null?null:typeof v==='string'?JSON.parse(v):v;
module.exports={command,pipeline,transaction,key,parse,failure};
