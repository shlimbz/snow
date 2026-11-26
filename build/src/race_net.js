// =====================================================================
//  멀티 레이스 · 네트워크 (Render 의 WebSocket 서버와 통신)
//   서버 주소: <head> 의 window.RACE_SERVER  (또는 주소 뒤 ?server=wss://…)
// =====================================================================
const NET={ws:null,url:'',ok:false,tries:0,rtt:120,off:0,room:null,pingT:0,wantRoom:null,closing:false};
function serverURL(){let u='';try{const q=new URLSearchParams(location.search).get('server');if(q){localStorage.setItem('usagiServer',q);u=q}else u=localStorage.getItem('usagiServer')||''}catch(_){}
  if(!u)u=window.RACE_SERVER||'';if(!u&&/^(localhost|127\.|192\.168\.)/.test(location.hostname))u='ws://'+location.hostname+':8080';return u}
function netSend(m){if(NET.ws&&NET.ws.readyState===1)NET.ws.send(JSON.stringify(m))}
function helloMsg(){const c=REC.char||'usagi',eq=Object.assign({},eqMapOf(c));for(const k in eq)if(eq[k]&&!canWear(eq[k],c))eq[k]='';return{t:'hi',name:myNick(),char:c,eq,v:1}}
// Render 무료 서버는 15분 동안 아무도 없으면 잠들어서, 깨우는 데 1분쯤 걸림 → 그동안 계속 다시 시도
function netConnect(then){const url=serverURL();if(!url){lobbyMsg('서버 주소가 아직 설정되지 않았어요. multi.html 위쪽 RACE_SERVER 에 Render 주소를 넣어 주세요.',true);return}
  if(NET.ws&&NET.ws.readyState===1){then&&then();return}
  NET.url=url;NET.tries=0;NET.closing=false;const t0=performance.now();
  try{fetch(url.replace(/^ws/,'http'),{mode:'no-cors'}).catch(()=>{})}catch(_){}   // 잠든 서버 깨우기
  const attempt=()=>{if(NET.closing)return;NET.tries++;const sec=Math.round((performance.now()-t0)/1000);
    lobbyMsg(sec<4?'서버에 연결하는 중…':'서버를 깨우는 중이에요… '+sec+'초 (처음엔 1분쯤 걸릴 수 있어요)');
    let ws;try{ws=new WebSocket(url)}catch(e){lobbyMsg('서버 주소가 올바르지 않아요: '+url,true);return}
    let opened=false;ws.onopen=()=>{opened=true;NET.ws=ws;NET.ok=true;netSend(helloMsg());netSend({t:'ping',c:performance.now()});lobbyMsg('');then&&then()};
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}netOn(m)};
    ws.onclose=()=>{NET.ok=false;if(NET.ws===ws)NET.ws=null;if(!opened){if(performance.now()-t0<95000&&!NET.closing)setTimeout(attempt,2500);else lobbyMsg('서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.',true);return}
      if(!NET.closing)netLost()};ws.onerror=()=>{}};
  attempt()}
function netClose(){NET.closing=true;if(NET.ws)try{NET.ws.close()}catch(_){}NET.ws=null;NET.ok=false;NET.room=null}
function netLost(){if(MODE==='race'&&RACE.online&&RACE.phase!=='result'){RACE.phase='result';showRaceResult(null,'서버 연결이 끊겼어요. 진행 중이던 판은 취소됐어요.')}else{NET.room=null;lobbyHome('서버 연결이 끊겼어요. 다시 시도해 주세요.')}}
function netTick(dt){if(!RACE.online)return;NET.pingT-=dt;if(NET.pingT<=0){NET.pingT=3;netSend({t:'ping',c:performance.now()})}
  if(RACE.phase==='count'||RACE.phase==='run'||RACE.phase==='done'){RACE.sendT-=dt;if(RACE.sendT<=0){RACE.sendT=1/15;netSend({t:'s',d:myStateArr()})}}
  if(RACE.endLeft>0)RACE.endLeft=Math.max(0,RACE.endLeft-dt)}
function netOn(m){
  if(m.t==='pong'){const r=performance.now()-m.c;NET.rtt=lerp(NET.rtt,r,.3);return}
  if(m.t==='welcome'){RACE.myId=m.id;NET.myId=m.id;if(NET.wantRoom){const w=NET.wantRoom;NET.wantRoom=null;netSend(w)}return}
  if(m.t==='room'){NET.room=m;if(MODE!=='race'&&!$('rLobby').classList.contains('hide'))lobbyRoom(m);else if(MODE!=='race'&&$('rRes').classList.contains('hide')&&$('charPanel').classList.contains('hide')&&$('setPanel').classList.contains('hide'))lobbyRoom(m);return}
  if(m.t==='err'){lobbyMsg(m.msg,true);return}
  if(m.t==='count'){const list=m.grid.map(p=>({id:p.id,name:p.name,char:p.char,eq:p.eq||{}}));RACE.cd=Math.max(.5,(m.startIn-NET.rtt/2)/1000);raceBegin(m.course,list,true,NET.myId);RACE.cd=Math.max(.5,(m.startIn-NET.rtt/2)/1000);RACE.endLeft=0;return}
  if(MODE!=='race')return;
  if(m.t==='S'){for(const p of m.p){if(p[0]===RACE.myId)continue;const r=RACE.racers.get(p[0]);if(r)rivalPush(r,p[1])}return}
  if(m.t==='item'){RACE.pend=m.k;return}
  if(m.t==='use'){if(m.id!==RACE.myId)applyUse(m.id,m);return}
  if(m.t==='hit'){if(m.id===RACE.myId)return;const v=RACE.racers.get(m.id),b=RACE.racers.get(m.by);if(v&&m.by===RACE.myId)popup((m.k==='ghost'?'👻 ':m.k==='ball'?'☃️ ':m.k==='ice'?'🧊 ':'❓ ')+v.name+' 명중!','#ffe066');return}
  if(m.t==='fin'){const r=RACE.racers.get(m.id);if(r){r.fin=true;r.finT=m.time}if(m.first){RACE.endLeft=m.wait;if(m.id!==RACE.myId&&!game.finished)popup('🏁 '+(r?r.name:'')+' 골인! '+m.wait+'초 안에 들어와요','#ffe066','sys')}return}
  if(m.t==='left'){const r=RACE.racers.get(m.id);if(r){popup(r.name+' 님이 나갔어요','#cfe8ff');RACE.racers.delete(m.id)}return}
  if(m.t==='end'){raceEnd(m.res);return}}
