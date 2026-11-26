// =====================================================================
//  멀티 레이스 · 로비 / 방 / 결과 / 일시정지 / 아이템 버튼
// =====================================================================
PANELS.push('rLobby','rRes','rPause');
const myNick=()=>{let n='';try{n=localStorage.getItem('usagiNick')||''}catch(_){}return (n||'').trim().slice(0,8)||'눈토끼'+String(Math.floor(Math.random()*90)+10)};
function cleanNick(n){return String(n||'').replace(/[<>&"'\\]/g,'').replace(/\s+/g,' ').trim().slice(0,8)}
function lobbyMsg(t,err){const e=$('rlMsg');if(e){e.textContent=t||'';e.classList.toggle('err',!!err)}const r=$('rlRoomMsg');if(r&&!$('rlRoom').classList.contains('hide')&&t)r.textContent=t}
function lobbyShow(){closeAllPanels();$('rLobby').classList.remove('hide');$('rlNick').value=myNick();refreshLobbyChar();$('rlWal').textContent='🥕 '+walletStr()}
function lobbyHome(msg){NET.room=null;lobbyShow();$('rlHome').classList.remove('hide');$('rlRoom').classList.add('hide');lobbyMsg(msg||'',!!msg)}
function refreshLobbyChar(){const c=CHARS[REC.char||'usagi']||CHARS.usagi;$('rlCharImg').src='assets/'+c.img[0]+'.webp';$('rlCharName').textContent=c.name;$('rlCharTag').textContent=c.pas+' · 바꾸기 ›'}
// 메뉴 = 레이스 로비 (뒤에서는 기존 메뉴처럼 자동 주행 화면)
const _openMenu0=openMenu;
openMenu=function(msg){saveRec();RACE.phase='lobby';RACE.R=null;MODE='menu';M=MODES.menu;useChar(REC.char||'usagi');applyTerrain();reset();$('menu').classList.add('hide');$('tut').classList.add('hide');
  if(NET.room&&NET.ok){lobbyShow();lobbyRoom(NET.room)}else lobbyHome(msg&&msg!=='모드를 골라 주세요'?msg:'');wakeOff();if(!REC.char)openChars()};
// 캐릭터 패널을 닫으면 로비로 돌아옴
$('charClose').addEventListener('click',()=>{if(MODE==='menu'){lobbyShow();if(NET.room)lobbyRoom(NET.room);if(NET.ok)netSend(helloMsg())}});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#charList [data-act="pick"]');if(b)setTimeout(()=>{if(MODE==='menu'&&$('charPanel').classList.contains('hide')){lobbyShow();if(NET.ok)netSend(helloMsg())}},50)},true);
// ---- 홈 ----
function rlCourseCards(el,sel,host,onPick){el.innerHTML=RSH.COURSE_IDS.map(id=>{const C=RCOURSES[id];return'<button class="rcc'+(id===sel?' sel':'')+'" data-rc="'+id+'" style="--cc:'+C.col+'"'+(host?'':' disabled')+'><b>'+C.emoji+' '+C.name+'</b><small>'+C.desc+'</small><i>'+(C.len/1000).toFixed(1)+'km</i></button>'}).join('');
  el.querySelectorAll('[data-rc]').forEach(b=>b.addEventListener('click',()=>onPick(b.dataset.rc)))}
let RL_SOLO='carrot';
function lobbyInit(){
  $('rlNick').addEventListener('change',e=>{const n=cleanNick(e.target.value);e.target.value=n;try{localStorage.setItem('usagiNick',n)}catch(_){}if(NET.ok)netSend(helloMsg())});
  $('rlChar').addEventListener('click',openChars);$('rlSet').addEventListener('click',()=>openSettings('menu'));
  $('rlQuick').addEventListener('click',()=>{saveNick();netConnect(()=>netSend({t:'quick'}))});
  $('rlCreate').addEventListener('click',()=>{saveNick();netConnect(()=>netSend({t:'create'}))});
  $('rlJoinBtn').addEventListener('click',()=>{$('rlJoinRow').classList.toggle('hide');$('rlCode').focus()});
  const join=()=>{const c=$('rlCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);if(c.length<4){lobbyMsg('방 코드 4글자를 넣어 주세요',true);return}saveNick();netConnect(()=>netSend({t:'join',code:c}))};
  $('rlJoinGo').addEventListener('click',join);$('rlCode').addEventListener('keydown',e=>{if(e.key==='Enter')join();e.stopPropagation()});$('rlNick').addEventListener('keydown',e=>e.stopPropagation());
  const pickSolo=id=>{RL_SOLO=id;rlCourseCards($('rlSoloCourses'),RL_SOLO,true,pickSolo)};pickSolo(RL_SOLO);
  $('rlSolo').addEventListener('click',()=>{saveNick();startSolo(RL_SOLO)});
  $('rlLeave').addEventListener('click',()=>{netSend({t:'leave'});NET.room=null;lobbyHome()});
  $('rlStart').addEventListener('click',()=>netSend({t:'start'}));
  $('rlCopy').addEventListener('click',()=>{const c=$('rlRoomCode').textContent,u=location.href.split('#')[0].split('?')[0]+'?room='+c;try{navigator.clipboard.writeText(u);$('rlCopy').textContent='복사됨 ✓';setTimeout(()=>$('rlCopy').textContent='링크 복사',1500)}catch(_){}});
  // 결과 · 일시정지
  $('rrAgain').addEventListener('click',()=>{if(RACE.online){if(NET.room&&!NET.room.quick){openMenu()}else{openMenu();netConnect(()=>netSend({t:'quick'}))}}else startSolo(RACE.cid)});
  $('rrLobby').addEventListener('click',()=>{if(RACE.online){netSend({t:'leave'});NET.room=null}openMenu()});
  $('rpResume').addEventListener('click',()=>setPaused(false));
  $('rpLeave').addEventListener('click',()=>{$('rPause').classList.add('hide');paused=false;if(RACE.online){netSend({t:'leave'});NET.room=null}openMenu()});
  $('rpSet').addEventListener('click',()=>{$('rPause').classList.add('hide');openSettings('menu')});
  // 주소에 ?room=ABCD 가 있으면 바로 그 방으로
  try{const q=new URLSearchParams(location.search).get('room');if(q&&/^[A-Za-z0-9]{4}$/.test(q)){$('rlJoinRow').classList.remove('hide');$('rlCode').value=q.toUpperCase()}}catch(_){}}
function saveNick(){const n=cleanNick($('rlNick').value)||myNick();$('rlNick').value=n;try{localStorage.setItem('usagiNick',n)}catch(_){}}
// ---- 방 ----
function lobbyRoom(m){lobbyShow();$('rlHome').classList.add('hide');$('rlRoom').classList.remove('hide');const host=m.host===NET.myId;
  $('rlRoomTitle').textContent=m.quick?'⚡ 빠른 매칭':'🏠 친구 방';$('rlCodeRow').classList.toggle('hide',!!m.quick);$('rlRoomCode').textContent=m.code||'';
  $('rlPlayers').innerHTML=m.players.map((p,i)=>{const C=CHARS[p.char]||CHARS.usagi;return'<li style="--pc:'+RCOL[i%4]+'"><img src="assets/'+C.img[0]+'.webp" alt=""><b>'+escH(p.name)+'</b>'+(p.id===m.host&&!m.quick?'<small>방장</small>':'')+(p.id===NET.myId?'<small class="me">나</small>':'')+'</li>'}).join('')+Array(Math.max(0,RSH.MAX_PLAYERS-m.players.length)).fill('<li class="empty">빈 자리</li>').join('');
  rlCourseCards($('rlCourses'),m.course,host&&!m.quick,id=>netSend({t:'course',id}));
  $('rlStart').classList.toggle('hide',!!m.quick||!host);
  $('rlRoomMsg').textContent=m.quick?(m.players.length<2?'함께 달릴 친구를 찾는 중…':'곧 출발해요 · '+Math.max(0,Math.ceil((m.autoIn||0)/1000))+'초'):host?(m.players.length<2?'친구에게 방 코드를 알려 주세요 · 혼자서도 출발할 수 있어요':'준비되면 출발을 눌러요'):'방장이 출발하기를 기다리는 중…';
  if(m.quick&&m.autoIn>0){clearTimeout(lobbyRoom._t);lobbyRoom._t=setTimeout(()=>{if(NET.room===m){m.autoIn-=1000;lobbyRoom(m)}},1000)}}
const escH=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
// ---- 혼자 연습 레이스 (봇 3명) ----
function startSolo(cid){RACE.online=false;NET.room=null;const names=BOT_NAMES.slice().sort(()=>Math.random()-.5),me={id:'me',name:myNick(),char:REC.char||'usagi',eq:Object.assign({},eqMapOf(REC.char||'usagi'))};
  const bots=[0,1,2].map(i=>{const ch=CHAR_IDS[Math.floor(Math.random()*CHAR_IDS.length)];return{id:'bot'+i,name:names[i],char:ch,eq:randomEq(ch),bot:true,skill:[.885,.92,.95][i]}});
  const list=[me,...bots].sort(()=>Math.random()-.5);if(SET.autoFs&&isTouch()&&!isFs()&&fsOK())enterFs();raceBegin(cid,list,false,'me')}
function randomEq(cid){const eq={head:'',face:'',acc:'',outfit:'',board:'d_basic_rect',fx:''},pick=cat=>{const L=SHOP_ITEMS.filter(it=>it.cat===cat&&canWear(it.id,cid));return L.length?L[Math.floor(Math.random()*L.length)].id:''};
  for(const cat of ['head','outfit','board'])if(Math.random()<.7)eq[cat]=pick(cat);if(Math.random()<.4)eq.acc=pick('acc');if(!eq.board)eq.board='d_basic_rect';return eq}
// ---- 결과 ----
function raceEnd(res){if(RACE.phase==='result')return;RACE.phase='result';const s=game,n=RACE.racers.size||res.length,mine=res.find(r=>r.id===RACE.myId);
  const place=mine?mine.place:n,fin=mine?mine.fin:false,rw=RSH.rewardFor(place,n,fin,s.got||0);addCarrots(rw);
  REC.race=REC.race||{n:0,win:0,best:{}};REC.race.n++;if(place===1&&n>1)REC.race.win++;if(fin&&mine.time!=null){const b=REC.race.best[RACE.cid];if(!b||mine.time<b)REC.race.best[RACE.cid]=+mine.time.toFixed(2)}walletSave(true);
  setTimeout(()=>showRaceResult(res,null,{place,rw,n}),900)}
function showRaceResult(res,err,info){closeAllPanels();$('rRes').classList.remove('hide');paused=false;
  if(!res){$('rrTitle').textContent='레이스 취소';$('rrList').innerHTML='';$('rrInfo').textContent=err||'';$('rrAgain').textContent='로비로';return}
  const C=RACE.R?RACE.R.C:RCOURSES.carrot;$('rrTitle').textContent=info.place===1&&info.n>1?'🏆 1위!':'🏁 '+info.place+'위';
  $('rrList').innerHTML=res.map(r=>{const ch=CHARS[r.char]||CHARS.usagi,rr=RACE.racers.get(r.id);return'<li class="'+(r.id===RACE.myId?'me':'')+'" style="--pc:'+(rr?rr.col:'#999')+'"><span class="pl">'+r.place+'</span><img src="assets/'+ch.img[0]+'.webp" alt=""><b>'+escH(r.name)+'</b><i>'+(r.fin?fmtR(r.time):'미도착 · '+(Math.round(r.z/10)/100).toFixed(2)+'km')+'</i></li>'}).join('');
  const best=REC.race&&REC.race.best[RACE.cid];$('rrInfo').innerHTML=C.emoji+' '+C.name+'<br>보상 🥕 <b>+'+info.rw+'</b> (순위 · 완주 · 먹은 당근 '+(game.got||0)+'개)'+(best?'<br>내 최고 기록 '+fmtR(best):'')+'<br>보유 당근 🥕 '+walletStr();
  $('rrAgain').textContent=RACE.online?(NET.room&&!NET.room.quick?'↻ 방으로':'⚡ 다시 매칭'):'↻ 다시 달리기'}
// ---- 일시정지: 혼자 연습만 실제로 멈춤 (온라인은 멈출 수 없음) ----
const _setPaused0=setPaused;
setPaused=function(p){if(MODE!=='race'){_setPaused0(p);return}if(RACE.phase==='result'){return}const s=game;if(p&&s.jHeld){s.jHeld=false;s.charge=0}
  paused=p&&!RACE.online;$('rPause').classList.toggle('hide',!p);$('setPanel').classList.add('hide');$('rpInfo').textContent=RACE.online?'온라인 레이스는 멈추지 않아요 · 계속 달리는 중!':'혼자 연습 레이스 · 일시정지';$('rpResume').textContent=RACE.online?'▶ 돌아가기':'▶ 이어하기'};
// ---- 아이템 버튼 (점프 버튼 바로 위) · E 키 ----
(()=>{const b=$('itemBtn');b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('down');raceUseItem()});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>b.classList.remove('down')));b.addEventListener('contextmenu',e=>e.preventDefault())})();
window.addEventListener('keydown',e=>{if(MODE!=='race'||e.repeat)return;const k=e.key.toLowerCase();if(k==='e'||k==='shift'||k==='x'){e.preventDefault();raceUseItem()}});
let _ibKey='init';function syncItemBtn(){const b=$('itemBtn');const key=MODE==='race'?(RACE.roul>0?'r'+Math.floor(game.time*14)%6:RACE.item||''):'off';if(key===_ibKey)return;_ibKey=key;
  b.classList.toggle('hide',MODE!=='race');b.classList.toggle('has',!!RACE.item);b.classList.toggle('roul',RACE.roul>0);
  b.textContent=RACE.roul>0?RSH.ITEMS[RSH.ITEM_KEYS[Math.floor(game.time*14)%6]].e:RACE.item?RSH.ITEMS[RACE.item].e:'?'}
function placeItemBtn(){const j=$('jumpBtn'),b=$('itemBtn'),st=$('stage');if(!j||!b||!st)return;const jr=j.getBoundingClientRect(),sr=st.getBoundingClientRect();if(!jr.width){b.style.removeProperty('left');return}
  const w=Math.round(jr.width*.72);b.style.width=w+'px';b.style.height=w+'px';b.style.left=Math.round(jr.left-sr.left+(jr.width-w)/2)+'px';b.style.top=Math.round(jr.top-sr.top-w-14)+'px';b.style.fontSize=Math.round(w*.5)+'px'}
const _layoutHUD0=layoutHUD;layoutHUD=function(){_layoutHUD0();placeItemBtn()};
window.addEventListener('resize',()=>setTimeout(placeItemBtn,60));
lobbyInit();
