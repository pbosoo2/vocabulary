'use strict';
const VERSION='2026-03-11';
const pronunciation=require('../pronunciation');
let deadline=Infinity,nextCallAt=0;
function setDeadline(value){deadline=value;nextCallAt=0;}
const DEFAULT_SOURCE='3f7551f3-818b-8095-93b4-000bc45e4202';
async function call(path,method='GET',body){
 const token=process.env.NOTION_TOKEN;if(!token)throw Object.assign(new Error('NOTION_NOT_CONFIGURED'),{kind:'NOTION_NOT_CONFIGURED'});
 for(let attempt=0;attempt<3;attempt++){
  if(Date.now()+1500>=deadline)throw Object.assign(new Error('SYNC_YIELD'),{kind:'SYNC_YIELD'});
  const wait=nextCallAt-Date.now();if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));nextCallAt=Date.now()+350;
  const r=await fetch('https://api.notion.com/v1/'+path,{method,headers:{Authorization:`Bearer ${token}`,'Notion-Version':VERSION,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(Math.max(1000,Math.min(12000,deadline-Date.now())))});
  if(r.status===429&&attempt<2){await new Promise(resolve=>setTimeout(resolve,Math.min(Number(r.headers.get('retry-after'))||1,3)*1000));continue;}
  if(!r.ok)throw Object.assign(new Error('NOTION_REQUEST_FAILED'),{kind:r.status===404?'NOTION_NOT_FOUND':r.status===401?'NOTION_TOKEN_INVALID':r.status===403||r.status===404?'NOTION_ACCESS_REQUIRED':'NOTION_REQUEST_FAILED'});
  return await r.json();
 }
}
const text=p=>(p?.title||p?.rich_text||[]).map(t=>t.plain_text??t.text?.content??'').join('');
function dayKey(value){if(!value)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const d=new Date(value);return isNaN(d)?null:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function find(props,name,id){return Object.values(props).find(p=>decodeURIComponent(p.id||'')===id)||props[name];}
async function rollup(page,p,force){let value=p?.rollup;if(!p||value?.type==='unsupported')return null;if(force||value?.type==='incomplete'){let cursor;for(let i=0;i<100;i++){const result=await call(`pages/${page.id}/properties/${encodeURIComponent(p.id)}${cursor?'?start_cursor='+encodeURIComponent(cursor):''}`);value=result.property_item?.rollup||result.rollup||value;if(!result.has_more)break;cursor=result.next_cursor;if(!cursor)throw Object.assign(new Error('INCOMPLETE_PROPERTY'),{kind:'INCOMPLETE_PROPERTY'});if(i===99)throw Object.assign(new Error('INCOMPLETE_PROPERTY'),{kind:'INCOMPLETE_PROPERTY'});}}return value;}
async function mapPage(page){
 const p=page.properties||{};const get=(name,id)=>find(p,name,id);const word=text(get('단어','title'));if(!word.trim())return [];
 const langs=get('언어','O@GV')?.multi_select?.map(x=>x.name)||[];const relation=get('학습 기록','Qx\\m');
 const count=await rollup(page,get('총 학습 횟수','BF^F'),relation?.has_more);const last=await rollup(page,get('마지막 학습일','QEJ^'),relation?.has_more);
 const common={word,reading:text(get('발음·읽기','USPO')),koreanReading:text(p['한글 발음']),meaning:text(get('한국어 뜻','BYtA')),example:text(get('예문','TODI')),translation:text(get('예문 해석','?aGI')),dictionaryUrl:get('사전 링크','dEP\\')?.url||'',notionUrl:page.url||'',registeredDate:dayKey(get('등록 날짜','~qy}')?.date?.start),studyCount:count?.type==='number'?count.number:null,lastStudied:last?.type==='date'?dayKey(last.date?.start):null};
 return langs.filter(x=>['영어','일본어'].includes(x)).map(language=>pronunciation.enrich({id:page.id+':'+language,language,...common}));
}
async function readWords(){const id=process.env.NOTION_DATA_SOURCE_ID||DEFAULT_SOURCE;if(!/^[0-9a-f-]{32,36}$/i.test(id))throw Object.assign(new Error('INVALID_SOURCE_ID'),{kind:'INVALID_SOURCE_ID'});let cursor;const words=[];for(let n=0;n<100;n++){
 const result=await call(`data_sources/${id}/query`,'POST',{page_size:100,sorts:[{timestamp:'created_time',direction:'descending'}],...(cursor?{start_cursor:cursor}:{})});if(result.request_status?.type==='incomplete')throw Object.assign(new Error('RESULT_LIMIT_REACHED'),{kind:'RESULT_LIMIT_REACHED'});
 // 순차 처리로 API 호출량을 제한합니다. 긴 관계의 롤업만 추가 조회합니다.
 for(const page of result.results||[])if(page.object==='page')words.push(...await mapPage(page));
 if(!result.has_more)return words;cursor=result.next_cursor;if(!cursor)break;
 }throw Object.assign(new Error('RESULT_LIMIT_REACHED'),{kind:'RESULT_LIMIT_REACHED'});}
function source(){return process.env.NOTION_DATA_SOURCE_ID||DEFAULT_SOURCE;}
function learningSource(){return process.env.NOTION_LEARNING_DATA_SOURCE_ID||'21cd8aef-3b88-4af4-9b38-f095c61d3130';}
async function queryBatch(id,cursor,since){if(!/^[0-9a-f-]{32,36}$/i.test(id))throw Object.assign(new Error('INVALID_SOURCE_ID'),{kind:'INVALID_SOURCE_ID'});const result=await call(`data_sources/${id}/query`,'POST',{page_size:25,sorts:[{timestamp:'last_edited_time',direction:'ascending'}],...(cursor?{start_cursor:cursor}:{}),...(since?{filter:{timestamp:'last_edited_time',last_edited_time:{on_or_after:since}}}:{})});if(result.request_status?.type==='incomplete')throw Object.assign(new Error('RESULT_LIMIT_REACHED'),{kind:'RESULT_LIMIT_REACHED'});if(result.has_more&&!result.next_cursor)throw Object.assign(new Error('RESULT_LIMIT_REACHED'),{kind:'RESULT_LIMIT_REACHED'});return result;}
async function learningWords(page){const p=find(page.properties||{},'학습한 단어','^yh;');if(!p||p.type!=='relation')throw Object.assign(new Error('LEARNING_SCHEMA_INVALID'),{kind:'LEARNING_SCHEMA_INVALID'});const ids=(p.relation||[]).map(x=>x.id);if(p.has_more){let cursor;do{const data=await call(`pages/${page.id}/properties/${encodeURIComponent(p.id)}${cursor?'?start_cursor='+encodeURIComponent(cursor):''}`);for(const item of data.results||[])if(item.relation?.id)ids.push(item.relation.id);cursor=data.has_more?data.next_cursor:null;if(data.has_more&&!cursor)throw Object.assign(new Error('INCOMPLETE_PROPERTY'),{kind:'INCOMPLETE_PROPERTY'});}while(cursor);}return [...new Set(ids)];}
module.exports={readWords,dayKey,mapPage,call,setDeadline,source,learningSource,queryBatch,learningWords};
