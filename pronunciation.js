/* Reading-based Korean approximations. No dictionary lookup, network, or persistence. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.VocabularyPronunciation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=3;
const initials={'ㄱ':0,'ㄲ':1,'ㄴ':2,'ㄷ':3,'ㄸ':4,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅃ':8,'ㅅ':9,'ㅆ':10,'ㅇ':11,'ㅈ':12,'ㅉ':13,'ㅊ':14,'ㅋ':15,'ㅌ':16,'ㅍ':17,'ㅎ':18};
const vowels={'ㅏ':0,'ㅐ':1,'ㅑ':2,'ㅒ':3,'ㅓ':4,'ㅔ':5,'ㅕ':6,'ㅖ':7,'ㅗ':8,'ㅘ':9,'ㅙ':10,'ㅚ':11,'ㅛ':12,'ㅜ':13,'ㅝ':14,'ㅞ':15,'ㅟ':16,'ㅠ':17,'ㅡ':18,'ㅢ':19,'ㅣ':20};
const finals={'ㄱ':1,'ㄴ':4,'ㄹ':8,'ㅁ':16,'ㅂ':17,'ㅅ':19,'ㅇ':21};
function syllable(c,v,f=''){return String.fromCharCode(44032+initials[c]*588+vowels[v]*28+(finals[f]||0));}
function coda(text,c){const chars=Array.from(text),last=chars.pop();if(!last)return text;const n=last.charCodeAt(0)-44032;if(n>=0&&n<11172&&n%28===0)return chars.join('')+String.fromCharCode(last.charCodeAt(0)+finals[c]);return text+syllable(c,'ㅡ');}
function clean(reading){let s=String(reading||'').normalize('NFKC').trim();if(!s||s.length>1000)return '';// Dictionaries also use an unspaced vertical bar inside IPA as a stress/syllable separator.
// Remove only bars between adjacent non-space characters; spaced bars still separate alternatives.
s=s.replace(/(\S)\|(?=\S)/g,'$1');const enclosed=s.match(/\/([^/]+)\//)||s.match(/\[([^\]]+)\]/);if(enclosed)s=enclosed[1];else s=s.split(/\s*(?:\/|;|\||→)\s*/)[0];return s.replace(/[(){}\[\]<>]/g,'').trim();}
const kana={};
['あいうえお|아이우에오','かきくけこ|카키쿠케코','がぎぐげご|가기구게고','さしすせそ|사시스세소','ざじずぜぞ|자지즈제조','たちつてと|타치츠테토','だぢづでど|다지즈데도','なにぬねの|나니누네노','はひふへほ|하히후헤호','ばびぶべぼ|바비부베보','ぱぴぷぺぽ|파피푸페포','まみむめも|마미무메모','やゆよ|야유요','らりるれろ|라리루레로','わゐゑを|와이에오','ぁぃぅぇぉ|아이우에오','ゃゅょ|야유요','ゔ|부'].forEach(row=>{const [a,b]=row.split('|');Array.from(a).forEach((c,i)=>kana[c]=Array.from(b)[i]);});
const combos={};const bases={'き':'ㅋ','ぎ':'ㄱ','に':'ㄴ','ひ':'ㅎ','び':'ㅂ','ぴ':'ㅍ','み':'ㅁ','り':'ㄹ','し':'ㅅ','じ':'ㅈ','ち':'ㅊ','ぢ':'ㅈ'};
for(const [c,initial] of Object.entries(bases))for(const [small,v]of Object.entries({'ゃ':'ㅑ','ゅ':'ㅠ','ょ':'ㅛ'}))combos[c+small]=syllable(initial,v);
Object.assign(combos,{'しゃ':'샤','しゅ':'슈','しょ':'쇼','ちゃ':'차','ちゅ':'추','ちょ':'초','じゃ':'자','じゅ':'주','じょ':'조','しぇ':'셰','ちぇ':'체','じぇ':'제','てぃ':'티','でぃ':'디','とぅ':'투','どぅ':'두','ふぁ':'파','ふぃ':'피','ふぇ':'페','ふぉ':'포','うぃ':'위','うぇ':'웨','うぉ':'워','ゔぁ':'바','ゔぃ':'비','ゔぇ':'베','ゔぉ':'보','つぁ':'차','つぃ':'치','つぇ':'체','つぉ':'초'});
function japanese(reading){const text=clean(reading).replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));if(!text)return '';let out='';
 for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1]||'';if(/\s/.test(ch)){out+=' ';continue;}if(ch==='っ'){if(!next)return '';out=coda(out,'ㅅ');continue;}if(ch==='ん'){out=coda(out,/[ぱぴぷぺぽばびぶべぼまみむめも]/.test(next)?'ㅁ':/[かきくけこがぎぐげご]/.test(next)?'ㅇ':'ㄴ');continue;}if(ch==='ー'){const last=out.trim().slice(-1),n=last.charCodeAt(0)-44032;if(n<0||n>=11172)return '';const v=Math.floor(n%588/28);out+=v===20?'이':[8,9,10,11,12].includes(v)?'오':[13,14,15,16,17].includes(v)?'우':[4,5,6,7].includes(v)?'에':'아';continue;}const pair=ch+next;if(combos[pair]){out+=combos[pair];i++;}else if(kana[ch])out+=kana[ch];else return '';}
 return out.trim();}
const cons={k:'ㅋ',g:'ㄱ',ɡ:'ㄱ',t:'ㅌ',d:'ㄷ',p:'ㅍ',b:'ㅂ',m:'ㅁ',n:'ㄴ',ŋ:'ㅇ',l:'ㄹ',ɫ:'ㄹ',r:'ㄹ',ɹ:'ㄹ',s:'ㅅ',z:'ㅈ',f:'ㅍ',v:'ㅂ',θ:'ㅆ',ð:'ㄸ',ʃ:'ㅅ',ʒ:'ㅈ',h:'ㅎ',tʃ:'ㅊ',dʒ:'ㅈ',ɾ:'ㄹ'};
const vow={ɨ:['ㅡ',''],i:['ㅣ',''],ɪ:['ㅣ',''],e:['ㅔ',''],ɛ:['ㅔ',''],æ:['ㅐ',''],a:['ㅏ',''],ɑ:['ㅏ',''],ɒ:['ㅗ',''],ɔ:['ㅗ',''],o:['ㅗ',''],ʊ:['ㅜ',''],u:['ㅜ',''],ʌ:['ㅓ',''],ə:['ㅓ',''],ɜ:['ㅓ',''],ɚ:['ㅓ',''],ɝ:['ㅓ',''],eɪ:['ㅔ','이'],aɪ:['ㅏ','이'],oʊ:['ㅗ','우'],əʊ:['ㅗ','우'],aʊ:['ㅏ','우'],ɔɪ:['ㅗ','이'],ɪə:['ㅣ','어'],eə:['ㅔ','어'],ɛə:['ㅔ','어'],ʊə:['ㅜ','어']};
// Isolated-symbol readings follow the user's supplied chart. In whole words,
// consonants join vowels rather than appending these standalone syllables.
const symbolGuide={b:'브',d:'드',j:'이',l:'러',m:'므',n:'느',r:'르',v:'브',z:'즈',dʒ:'쥐',ʒ:'지',tz:'쯔',ð:'뜨',h:'흐',g:'그',ŋ:'응',f:'프',k:'크',p:'퍼',s:'스',t:'트',ʃ:'쉬',tʃ:'취',θ:'쓰',ts:'츠',br:'브르',dr:'드르',tl:'트르',bl:'블르',gl:'글르',fl:'플르',sp:'스프',st:'스트',sk:'스크'};
function english(reading){let text=clean(reading).replace(/n\u0329/g,'ɨn').replace(/l\u0329/g,'ɨl').replace(/ʧ/g,'tʃ').replace(/ʤ/g,'dʒ').normalize('NFD').replace(/[\u0300-\u036fˈˌ.'’·˙]/g,'').replace(/ɹ/g,'r').replace(/ɡ/g,'g').replace(/ɫ/g,'l').replace(/ː|:/g,'ː');if(!text||/[^a-zɨɪɛæɑɒɔʊʌəɜɚɝŋθðʃʒɾː\s]/.test(text))return '';if(symbolGuide[text])return symbolGuide[text];let output=[];
 for(const part of text.split(/\s+/)){if(!part)continue;const phones=[];for(let i=0;i<part.length;i++){const pair=part.slice(i,i+2);let token;if(cons[pair]||vow[pair]){token=pair;i++;}else token=part[i];if(token==='ː'){if(!phones.length||!phones.at(-1).v)return '';phones.at(-1).long=true;continue;}if(vow[token])phones.push({token,v:true});else if(cons[token]||token==='j'||token==='w')phones.push({token,v:false});else return '';}
  if(!phones.some(p=>p.v))return '';let out='',pending=[];const vowelPositions=phones.map((p,i)=>p.v?i:-1).filter(i=>i>=0);
  for(let z=0;z<vowelPositions.length;z++){const at=vowelPositions[z],from=z===0?0:vowelPositions[z-1]+1;pending=phones.slice(from,at).map(p=>p.token);let onset='ㅇ',vowel=vow[phones[at].token][0],tail=vow[phones[at].token][1];
   if(z>0&&pending.length>1&&!['j','w'].includes(pending.at(-1))&&['n','m','ŋ','l'].includes(pending[0]))out=coda(out,{'n':'ㄴ','m':'ㅁ','ŋ':'ㅇ','l':'ㄹ'}[pending.shift()]);
   if(pending.length&&['j','w'].includes(pending.at(-1))){const glide=pending.pop();vowel=(glide==='j'?{'ㅏ':'ㅑ','ㅓ':'ㅕ','ㅗ':'ㅛ','ㅜ':'ㅠ','ㅔ':'ㅖ','ㅐ':'ㅒ'}:{'ㅏ':'ㅘ','ㅓ':'ㅝ','ㅗ':'ㅝ','ㅜ':'ㅜ','ㅔ':'ㅞ','ㅐ':'ㅙ','ㅣ':'ㅟ'})[vowel]||vowel;}
   if(pending.length){const last=pending.pop();onset=cons[last];if(!onset)return '';for(const c of pending){if(!cons[c])return '';out+=syllable(cons[c],c==='ʃ'?'ㅣ':'ㅡ');}if(last==='l'&&out)out=coda(out,'ㄹ');}
   if(['ʃ','ʒ','tʃ','dʒ'].includes(phones[at-1]?.token)){vowel=({'ㅜ':'ㅠ',...(['ʃ','ʒ'].includes(phones[at-1].token)?{'ㅏ':'ㅑ','ㅓ':'ㅕ','ㅗ':'ㅛ'}:{})})[vowel]||vowel;}
   if(onset!=='ㅇ'&&phones[at].token==='ə'&&phones[at+1]?.token==='l'&&at+2===phones.length)vowel='ㅡ';
   out+=syllable(onset,vowel)+tail;
  }
  const final=phones.slice(vowelPositions.at(-1)+1);for(let i=0;i<final.length;i++){const c=final[i].token;const ending={n:'ㄴ',m:'ㅁ',ŋ:'ㅇ',l:'ㄹ',k:'ㄱ',p:'ㅂ',t:'ㅅ'}[c];if(ending&&i===0&&!(['k','p','t'].includes(c)&&phones[vowelPositions.at(-1)].long))out=coda(out,ending);else if(c==='r'){/* final English r is only approximated by the preceding vowel */}else if(cons[c])out+=syllable(cons[c],['ʃ','tʃ','dʒ'].includes(c)?'ㅣ':'ㅡ');else return '';}
  output.push(out);
 }return output.join(' ');}
function derive(reading,language){const text=clean(reading);if(!text)return '';if(/^[가-힣\s]+$/.test(text))return text;return language==='일본어'?japanese(text):language==='영어'?english(text):'';}
function enrich(word){
 if(!word)return word;
 const automatic=word.koreanReadingSource==='approximation';
 if(String(word.koreanReading||'').trim()&&!automatic)return word;
 if(automatic&&word.koreanReadingVersion===VERSION)return word;
 const generated=derive(word.reading,word.language);
 if(generated)return {...word,koreanReading:generated,koreanReadingSource:'approximation',koreanReadingVersion:VERSION};
 return automatic?{...word,koreanReading:'',koreanReadingSource:'',koreanReadingVersion:VERSION}:word;
}
return {derive,enrich,japanese,english,version:VERSION};
});
