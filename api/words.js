'use strict';
const auth=require('../lib/auth');const {readWords}=require('../lib/notion');
module.exports=async function(req,res){if(req.method!=='GET'){res.setHeader('Allow','GET');return auth.json(res,405,{error:'METHOD_NOT_ALLOWED'});}if(!auth.requireAuth(req,res))return;
try{const words=await readWords();return auth.json(res,200,{words,fetchedAt:new Date().toISOString()});}
catch(e){const messages={NOTION_NOT_CONFIGURED:'Vercel에 NOTION_TOKEN을 설정해 주세요.',NOTION_TOKEN_INVALID:'Notion 연결 토큰을 확인해 주세요.',NOTION_ACCESS_REQUIRED:'Notion 연결에 단어 등록과 학습 기록 원본 데이터베이스 접근 권한을 추가해 주세요.',RESULT_LIMIT_REACHED:'단어가 조회 한도를 초과했습니다. 일부 결과만 표시하지 않도록 조회를 중단했어요.',INCOMPLETE_PROPERTY:'학습 집계 정보를 끝까지 읽지 못했어요.'};return auth.json(res,502,{error:e.kind||'NOTION_REQUEST_FAILED',message:messages[e.kind]||'단어를 읽지 못했어요. 잠시 후 다시 시도해 주세요.'});}}
