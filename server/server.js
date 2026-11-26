// =====================================================================
//  우사기 스노우보드 · 멀티 레이스 서버 (Node.js 18+, 설치할 패키지 없음)
//   · Render 무료 Web Service 용: Start Command = node server.js
//   · 하는 일: 방 만들기/참가/빠른 매칭, 위치 중계(초당 15회), 아이템 추첨, 순위·골인 판정
//   · 게임 물리는 각자 브라우저에서 돌고, 서버는 가벼운 심판 역할만 함
// =====================================================================
'use strict';
const http=require('http'),crypto=require('crypto');
const S=require('./shared.js');
const PORT=process.env.PORT||8080;
const TICK=1000/15,QUICK_WAIT=20000,COUNT_MS=4200;

// ---------------- 아주 작은 WebSocket 구현 (텍스트 메시지만) ----------------
function wsAccept(req,sock){const key=req.headers['sec-websocket-key'];if(!key){sock.destroy();return null}
  const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  sock.setNoDelay(true);const c={sock,buf:Buffer.alloc(0),frag:[],alive:true,onmsg:null,onclose:null,closed:false};
  sock.on('data',d=>{c.buf=Buffer.concat([c.buf,d]);if(c.buf.length>1<<20){close(c);return}parse(c)});
  sock.on('close',()=>{if(!c.closed){c.closed=true;c.onclose&&c.onclose()}});sock.on('error',()=>{});
  return c}
function parse(c){for(;;){const b=c.buf;if(b.length<2)return;const fin=b[0]&128,op=b[0]&15,masked=b[1]&128;let len=b[1]&127,o=2;
  if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);o=4}else if(len===127){if(b.length<10)return;len=Number(b.readBigUInt64BE(2));o=10}
  if(len>1<<20){close(c);return}const mo=o;if(masked)o+=4;if(b.length<o+len)return;let p=b.subarray(o,o+len);
  if(masked){const m=b.subarray(mo,mo+4);p=Buffer.from(p);for(let i=0;i<p.length;i++)p[i]^=m[i&3]}
  c.buf=b.subarray(o+len);
  if(op===8){close(c);return}if(op===9){frame(c,10,p);continue}if(op===10){c.alive=true;continue}
  if(op===1||op===0){c.frag.push(p);if(fin){const t=Buffer.concat(c.frag).toString('utf8');c.frag=[];c.alive=true;c.onmsg&&c.onmsg(t)}}}}
function frame(c,op,p){if(c.closed)return;const n=p.length;let h;if(n<126){h=Buffer.from([128|op,n])}else if(n<65536){h=Buffer.alloc(4);h[0]=128|op;h[1]=126;h.writeUInt16BE(n,2)}else{h=Buffer.alloc(10);h[0]=128|op;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
  try{c.sock.write(Buffer.concat([h,p]))}catch(_){}}
const send=(c,m)=>frame(c,1,Buffer.from(JSON.stringify(m)));
function close(c){if(c.closed)return;try{frame(c,8,Buffer.alloc(0));c.sock.end()}catch(_){}c.closed=true;c.onclose&&c.onclose()}

// ---------------- 방 ----------------
const players=new Map(),rooms=new Map();let nextId=1;
const CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(){for(;;){let c='';for(let i=0;i<4;i++)c+=CODE_CH[Math.floor(Math.random()*CODE_CH.length)];if(!rooms.has(c))return c}}
const cleanName=n=>String(n||'').replace(/[<>&"'\\]/g,'').replace(/\s+/g,' ').trim().slice(0,8)||'눈토끼';
const CHARS=['usagi','hachiware','chiikawa'];
function cleanEq(eq){const o={};if(eq&&typeof eq==='object')for(const k of ['head','face','acc','outfit','board','fx']){const v=eq[k];if(typeof v==='string'&&/^[a-z0-9_]{0,32}$/.test(v))o[k]=v}return o}
function roomMsg(R){return{t:'room',code:R.code,quick:R.quick,host:R.host,state:R.state,course:R.course,autoIn:R.autoAt?Math.max(0,R.autoAt-Date.now()):0,
  players:R.order.map(id=>{const p=players.get(id);return{id,name:p.name,char:p.char,eq:p.eq}})}}
const bcast=(R,m)=>{for(const id of R.order){const p=players.get(id);if(p)send(p.c,m)}};
function roomUpdate(R){bcast(R,roomMsg(R))}
function makeRoom(quick){const R={code:newCode(),quick,host:null,state:'lobby',course:S.COURSE_IDS[Math.floor(Math.random()*S.COURSE_IDS.length)],order:[],autoAt:0,race:null};rooms.set(R.code,R);return R}
function joinRoom(p,R){if(p.room)leaveRoom(p);if(R.order.length>=S.MAX_PLAYERS){send(p.c,{t:'err',msg:'방이 가득 찼어요 (최대 '+S.MAX_PLAYERS+'명)'});return}
  if(R.state!=='lobby'){send(p.c,{t:'err',msg:'이미 레이스가 진행 중인 방이에요. 끝난 뒤에 들어와 주세요'});return}
  R.order.push(p.id);p.room=R.code;if(!R.host)R.host=p.id;
  if(R.quick){if(R.order.length>=2&&!R.autoAt)R.autoAt=Date.now()+QUICK_WAIT;if(R.order.length>=S.MAX_PLAYERS)R.autoAt=Math.min(R.autoAt,Date.now()+3000)}
  roomUpdate(R)}
function leaveRoom(p){const R=rooms.get(p.room);p.room=null;if(!R)return;R.order=R.order.filter(id=>id!==p.id);
  if(R.race){const r=R.race;if(r.st.has(p.id))bcast(R,{t:'left',id:p.id});r.st.delete(p.id);checkEnd(R)}
  if(!R.order.length){rooms.delete(R.code);return}if(R.host===p.id)R.host=R.order[0];if(R.quick&&R.order.length<2)R.autoAt=0;if(R.state==='lobby')roomUpdate(R)}
function startRace(R){if(R.state!=='lobby'||!R.order.length)return;R.state='race';R.autoAt=0;const now=Date.now();
  R.race={go:now+COUNT_MS,st:new Map(),fin:new Map(),first:0,endAt:0,items:new Map()};
  for(const id of R.order)R.race.st.set(id,{z:2,d:null,boxT:0});
  const grid=R.order.map(id=>{const p=players.get(id);return{id,name:p.name,char:p.char,eq:p.eq}}).sort(()=>Math.random()-.5);
  bcast(R,{t:'count',course:R.course,startIn:COUNT_MS,grid})}
function rankOf(R,id){const r=R.race,list=[...r.st.keys()].sort((a,b)=>{const fa=r.fin.get(a),fb=r.fin.get(b);if(fa&&fb)return fa.time-fb.time;if(fa)return-1;if(fb)return 1;return r.st.get(b).z-r.st.get(a).z});return{rank:list.indexOf(id)+1,n:list.length}}
function checkEnd(R){const r=R.race;if(!r||R.state!=='race')return;const all=[...r.st.keys()].every(id=>r.fin.has(id));if(all||(r.endAt&&Date.now()>=r.endAt)||!r.st.size)endRace(R)}
function endRace(R){const r=R.race;if(!r)return;const ids=[...r.st.keys()].sort((a,b)=>{const fa=r.fin.get(a),fb=r.fin.get(b);if(fa&&fb)return fa.time-fb.time;if(fa)return-1;if(fb)return 1;return r.st.get(b).z-r.st.get(a).z});
  const res=ids.map((id,i)=>{const p=players.get(id),f=r.fin.get(id);return{id,name:p?p.name:'?',char:p?p.char:'usagi',place:i+1,time:f?f.time:null,z:Math.round(r.st.get(id).z),fin:!!f}});
  bcast(R,{t:'end',res});R.race=null;
  if(R.quick){for(const id of R.order){const p=players.get(id);if(p)p.room=null}rooms.delete(R.code)}
  else{R.state='lobby';setTimeout(()=>{if(rooms.get(R.code)===R)roomUpdate(R)},1500)}}

// ---------------- 메시지 ----------------
function onMsg(p,txt){let m;try{m=JSON.parse(txt)}catch(_){return}if(!m||typeof m.t!=='string')return;const R=p.room?rooms.get(p.room):null;
  switch(m.t){
  case'ping':send(p.c,{t:'pong',c:m.c,s:Date.now()});break;
  case'hi':p.name=cleanName(m.name);p.char=CHARS.includes(m.char)?m.char:'usagi';p.eq=cleanEq(m.eq);if(R&&R.state==='lobby')roomUpdate(R);break;
  case'quick':{if(R)leaveRoom(p);let Q=[...rooms.values()].find(r=>r.quick&&r.state==='lobby'&&r.order.length<S.MAX_PLAYERS);if(!Q)Q=makeRoom(true);joinRoom(p,Q);break}
  case'create':{if(R)leaveRoom(p);joinRoom(p,makeRoom(false));break}
  case'join':{const code=String(m.code||'').toUpperCase(),T=rooms.get(code);if(!T||T.quick){send(p.c,{t:'err',msg:'그 코드의 방이 없어요'});break}joinRoom(p,T);break}
  case'leave':if(R)leaveRoom(p);break;
  case'course':if(R&&!R.quick&&R.host===p.id&&R.state==='lobby'&&S.COURSE_IDS.includes(m.id)){R.course=m.id;roomUpdate(R)}break;
  case'start':if(R&&!R.quick&&R.host===p.id)startRace(R);break;
  case's':{if(!R||!R.race||!Array.isArray(m.d)||m.d.length!==14)break;const st=R.race.st.get(p.id);if(!st)break;const z=+m.d[0];if(!isFinite(z))break;
    // 간단한 속도 검사: 이전 위치에서 비정상적으로 멀리 가면 무시
    const now=Date.now(),dt=(now-(st.t||now))/1000;if(st.d&&z-st.z>Math.max(30,dt*95)&&(st.bad=(st.bad||0)+1)<20)break;st.bad=0;st.z=z;st.t=now;st.d=m.d.map(v=>typeof v==='number'&&isFinite(v)?v:0);break}
  case'box':{if(!R||!R.race)break;const st=R.race.st.get(p.id);if(!st)break;const now=Date.now();if(now-st.boxT<800)break;st.boxT=now;const{rank,n}=rankOf(R,p.id);
    const k=S.pickItem(rank,n,st.z,S.COURSE_META[R.course].len);send(p.c,{t:'item',k});break}
  case'use':{if(!R||!R.race||!S.ITEM_KEYS.includes(m.k))break;bcast(R,{t:'use',id:p.id,k:m.k,z:+m.z||0,x:+m.x||0,tg:typeof m.tg==='string'?m.tg:null,v:+m.v||20});break}
  case'hit':{if(!R||!R.race)break;bcast(R,{t:'hit',id:p.id,by:String(m.by||''),k:String(m.k||'')});break}
  case'fin':{if(!R||!R.race||R.race.fin.has(p.id))break;const r=R.race,el=(Date.now()-r.go)/1000;if(el<20)break;   // 서버 시계 기준 기록(지연 차이는 모두 비슷)
    const time=Math.min(el,Math.max(el-1.5,+m.time||el));r.fin.set(p.id,{time});const first=!r.first;if(first){r.first=Date.now();r.endAt=r.first+S.FINISH_WAIT*1000}
    bcast(R,{t:'fin',id:p.id,time:+time.toFixed(2),first,wait:S.FINISH_WAIT});checkEnd(R);break}}}

// ---------------- 주기 작업: 위치 중계 · 빠른 매칭 자동 출발 · 종료 판정 ----------------
setInterval(()=>{const now=Date.now();for(const R of rooms.values()){
  if(R.state==='lobby'&&R.quick&&R.autoAt&&now>=R.autoAt&&R.order.length>=2)startRace(R);
  try{if(R.race){const p=[];for(const [id,st] of R.race.st)if(st.d)p.push([id,st.d]);if(p.length)bcast(R,{t:'S',p});
    if(R.race&&R.race.endAt&&now>=R.race.endAt)checkEnd(R);
    if(R.race&&now-R.race.go>8*60*1000)endRace(R)}}catch(e){console.error('tick',e)}}},TICK);
// 연결 확인 (끊긴 연결 정리 · Render 프록시가 놀고 있는 연결을 닫지 않게)
setInterval(()=>{for(const p of players.values()){if(!p.c.alive){close(p.c);continue}p.c.alive=false;frame(p.c,9,Buffer.alloc(0))}},25000);

const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
  res.end('usagi race server ok · rooms '+rooms.size+' · players '+players.size)});
server.on('upgrade',(req,sock)=>{if((req.headers.upgrade||'').toLowerCase()!=='websocket'){sock.destroy();return}
  if(players.size>=200){sock.destroy();return}const c=wsAccept(req,sock);if(!c)return;
  const p={id:'p'+(nextId++),c,name:'눈토끼',char:'usagi',eq:{},room:null};players.set(p.id,p);
  c.onmsg=t=>{try{onMsg(p,t)}catch(e){console.error('msg',e)}};c.onclose=()=>{if(p.room)leaveRoom(p);players.delete(p.id)};send(c,{t:'welcome',id:p.id})});
server.listen(PORT,()=>console.log('usagi race server on :'+PORT));
