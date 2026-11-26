// =====================================================================
//  멀티 레이스 · 코어 (코스 지형 · 물리 연결 · 아이템 · 따라잡기 · 봇)
// =====================================================================
const RTUNE={
  carStat:.6,          // 레이스에서는 캐릭터 능력 차이를 60%만 반영 (패시브는 그대로)
  startV:8,            // GO 순간 출발 속도(m/s)
  startWin:.45,        // GO 직전 이 시간(초) 안에 점프를 누르면 스타트 부스트
  slip:{dz:[1.5,8],dx:1.7,need:1,cap:.05,acc:2.5},   // 슬립스트림: 앞사람 뒤 거리·좌우폭, 필요한 시간(초), 최고속도 +5%
  rubber:{gap:50,full:200,min:.02,max:.04},           // 후미 보정: 선두와 50m 이상 → 최고속도 +2~4%
  boost:{broc:[3,.14,14],pad:[1.2,.12,12],start:[1.5,.12,12],grind:[.9,.1,10],carrot:[.8,.07,8]},   // [시간, 최고속도 +, 가속(m/s²)]
  shield:8,ball:5,ballK:1.2,ballR:2.6,rev:4,slide:1.2,spin:1.2,ghostHit:.6,
  ghost:{v0:16,acc:30,vmax:78,turn:14,life:9,dodgeH:.75},
  puddleR:1.9,puddleLife:30,boxR:2.2,roulette:1.1};
const RACE={phase:'lobby',online:false,R:null,cid:'carrot',myId:'me',racers:new Map(),order:[],t:0,cd:0,
  item:null,roul:0,pend:null,projs:[],puddles:[],endT:-1,firstFin:-1,res:null,sendT:0,startPress:null,_k:0};
const RCOL=['#ff7a2f','#3a8bd0','#4fb487','#c06bd8'];
const rRamp=(z,a,b,c,d)=>z<=a||z>=d?0:z<b?smooth(a,b,z):z>c?1-smooth(c,d,z):1;

// ---------------- 코스 불러오기 (지형 배열·나무·표면 미리 계산) ----------------
function loadCourse(id){const C=RCOURSES[id]||RCOURSES.carrot,R={C,id:C.id,len:C.len,hw:C.hw,F:C.F,splits:[],hidden:[],ice:[],pads:[],winds:[],narrows:[],signs:[],treeSeg:new Map(),segSurf:new Map(),kickList:[],railList:[]};
  for(const f of C.F){if(f.t==='split'){f.idx=R.splits.length;R.splits.push(f)}else if(f.t==='hidden'){f.idx=R.hidden.length;R.hidden.push(f)}else if(f.t==='ice')R.ice.push(f);else if(f.t==='wind')R.winds.push(f);else if(f.t==='narrow')R.narrows.push(f);else if(f.t==='sign')R.signs.push(f)}
  const N=Math.ceil((C.len+1200)/SEG);R.hwA=new Float32Array(N+1);
  for(let i=0;i<=N;i++){const z=i*SEG;let w=C.hw;for(const sp of R.splits)w+=sp.widen*rRamp(z,sp.z0-50,sp.z0,sp.z1,sp.z1+50);
    for(const n of R.narrows)w=Math.min(w,lerp(C.hw,n.hw,rRamp(z,n.z0-40,n.z0,n.z1,n.z1+40)));R.hwA[i]=w}
  RACE.R=R;
  // 숨겨진 통로 안 물체의 x = 통로 가운데
  const hidAt=z=>R.hidden.find(H=>z>=H.z0-20&&z<=H.z1+20),atOf=f=>{if(f.hid){const H=hidAt(f.z);if(H)return H.side*(raceHW(f.z)+H.in+H.w/2)}return f.at||0};
  for(const f of C.F){if(f.t==='pad'){f.x0=atOf(f);R.pads.push(f)}
    else if(f.t==='tree'){const i=Math.round(f.z/SEG);(R.treeSeg.get(i)||R.treeSeg.set(i,[]).get(i)).push({at:f.at,h:9+hash(i,3)*4})}}
  // 표면(빙판·통로·패드)을 세그먼트별로 묶어 두기 → 그릴 때 빠르게
  const addSurf=(z0,z1,o)=>{for(let i=Math.floor(z0/SEG)-1;i<=Math.ceil(z1/SEG)+1;i++)(R.segSurf.get(i)||R.segSurf.set(i,[]).get(i)).push(o)};
  for(const I of R.ice)addSurf(I.z0,I.z1,{k:'ice',z0:I.z0,z1:I.z1,a:I.a,b:I.b});
  for(const H of R.hidden)addSurf(H.z0,H.z1+HID_AFTER*.5,{k:'cor',H,z0:H.z0,z1:H.z1+HID_AFTER*.5});
  for(const p of R.pads)addSurf(p.z,p.z+7,{k:'pad',p,z0:p.z,z1:p.z+7});
  addSurf(2,6,{k:'start',z0:3.6,z1:4.3});addSurf(C.len-2,C.len+2,{k:'fin',z0:C.len-1.2,z1:C.len+1.2});
  return R}
function raceHW(z){const R=RACE.R;if(!R)return CFG.halfW;const i=Math.floor(z/SEG),A=R.hwA;if(i<0)return A[0];if(i>=A.length-1)return A[A.length-1];const u=(z-i*SEG)/SEG;return A[i]+(A[i+1]-A[i])*u}
function HWZ(z){return M.race?raceHW(z):CFG.halfW}
// 숨은 통로: 입구(앞 25m)·출구(뒤 40m + 끝난 뒤 35m)는 숲 벽 없이 코스와 이어짐
const HID_IN=25,HID_OUT=40,HID_AFTER=35;
function hiddenAt(z,side){const R=RACE.R;if(!R)return null;for(const H of R.hidden)if(H.side===side&&z>=H.z0-10&&z<=H.z1+HID_AFTER)return H;return null}
const hidOpen=(H,z)=>z<H.z0+HID_IN||z>H.z1-HID_OUT;
function splitAt(z,pre){const R=RACE.R;if(!R)return null;for(const sp of R.splits)if(z>=sp.z0-(pre||0)&&z<=sp.z1)return sp;return null}
function laneCenters(sp,W){const a=sp.at,e=[-W,...a.map(x=>x),W],out=[];for(let i=0;i<e.length-1;i++){const l=i===0?e[0]:e[i]+sp.dw,r=i===e.length-2?e[i+1]:e[i+1]-sp.dw;out.push((l+r)/2)}return out}
// 표면: 0 = 정설 · 1 = 빙판 · 2 = 파우더(코스 밖, 느림)
function surfAt(z,x){const R=RACE.R,c=pisteCX(z),d=x-c,ad=Math.abs(d),hw=raceHW(z);let srf=2;
  if(ad<=hw)srf=0;else{const H=hiddenAt(z,d<0?-1:1);if(H&&z>=H.z0&&z<=H.z1+HID_AFTER*.5){const ent=hidOpen(H,z),a=ent?hw:hw+H.in,b=hw+H.in+H.w;if(ad>=a-.5&&ad<=b)srf=H.ice?1:0}}
  if(srf===0)for(const I of R.ice)if(z>=I.z0&&z<=I.z1&&d>=I.a&&d<=I.b){srf=1;break}
  return srf}
function raceSurfAt(z,x){const v=surfAt(z,x);game.ice=v===1;return v}
// 나무: 양옆 숲 + 갈림길 나무 섬 + 숨겨진 통로를 가리는 숲 벽 + 코스 안 나무
function raceTrees(i){const R=RACE.R,out=[],z=i*SEG,c=pisteCX(z),hw=raceHW(z);
  for(const side of [-1,1]){const H=hiddenAt(z,side),bA=H?hw+H.in-1.4:0,bB=H?hw+H.in+H.w+1.4:0;
    for(let k=0;k<3;k++){if(hash(i,side*7+k)<[.42,.32,.5][k]){let off=hw+6.5+k*15+hash(i,side*11+k+3)*12;if(H&&off>bA-3&&off<bB+7)off=bB+7+k*11+hash(i,side*5+k)*7;out.push({x:c+side*off,h:7.5+hash(i,k+side*5+9)*8.5,t:treeT(i,side*3+k)})}}
    if(H){if(!hidOpen(H,z)&&z>=H.z0&&z<=H.z1&&hash(i,side*31+5)<.86)out.push({x:c+side*(hw+H.in*.55+(hash(i,side*3+77)-.5)*.4),h:6+hash(i,side*9+2)*5,t:treeT(i,side*13+1)})}}
  for(const sp of R.splits)if(z>=sp.z0&&z<=sp.z1){const wedge=clamp((z-sp.z0)/24,.25,1)*clamp((sp.z1-z)/10,.25,1);
    for(let q=0;q<sp.at.length;q++)if(hash(i,91+q)<.8){const jx=(hash(i,93+q)-.5)*2*sp.dw*.42*wedge;out.push({x:c+sp.at[q]+jx,h:6.5+hash(i,95+q)*7,t:treeT(i,97+q)})}}
  const ex=R.treeSeg.get(i);if(ex)for(const t of ex)out.push({x:c+t.at,h:t.h,t:1});
  return out}

// ---------------- 레이스 시작 / 리셋 ----------------
// 레이스에서는 캐릭터 능력 차이를 줄인 사본을 씀 (메뉴로 나가면 원래 캐릭터로 복구)
function raceChar(id){const C=CHARS[id]||CHARS.usagi,o=Object.assign({},C),k=RTUNE.carStat;for(const s of ['maxV','accel','steer','jump','spin'])o[s]=1+(C[s]-1)*k;o.id=C.id;return o}
function raceBegin(cid,racers,online,myId){
  RACE.online=online;RACE.myId=myId||'me';RACE.cid=cid;loadCourse(cid);const C=RACE.R.C;
  Object.assign(MODES.race,{slope:C.slope,pitch:C.pitch,maxSpeed:C.maxSpeed,halfW:C.hw,pcx:C.pcx});
  RACE.racers=new Map();racers.forEach((p,i)=>RACE.racers.set(p.id,Object.assign({slot:i,col:RCOL[i%RCOL.length],z:2,x:0,fin:false,finT:0,buf:[],g:null,ball:0,shield:0},p)));
  RACE.phase='count';RACE.cd=online?RACE.cd:3.6;RACE.t=0;RACE.item=null;RACE.roul=0;RACE.pend=null;RACE.projs=[];RACE.puddles=[];RACE.endT=-1;RACE.firstFin=-1;RACE.res=null;RACE.startPress=null;RACE.sendT=0;
  closeAllPanels();for(const id of ['rLobby','rRes','rPause'])$(id).classList.add('hide');
  useChar(REC.char||'usagi');startMode('race');RACE.hud=0}
function raceReset(){const s=game,R=RACE.R,C=R.C;CH=raceChar(CH.id);
  s.kickers=[];s.rails=[];s.obstacles=[];s.items=[];s.boxes=[];s.got=0;s.cFrac=0;s.nextKick=1e9;s.nextObs=1e9;s.carr10=0;
  const X=(z,at)=>pisteCX(z)+at,hidX=z=>{const H=R.hidden.find(H=>z>=H.z0-20&&z<=H.z1+20);return H?H.side*(raceHW(z)+H.in+H.w/2):0};
  for(const f of C.F){const at=f.hid?hidX(f.z):(f.at||0);
    if(f.t==='kick'){const x=X(f.z,at),k=f.kind;s.kickers.push(k==='big'?{z:f.z,x,w:13,L:20,H:3.2,big:true}:k==='mega'?{z:f.z,x,w:18,L:24,H:4.6,big:true,mega:true}:k==='nat'?{z:f.z,x,w:12,L:14,H:1.45,natural:true}:{z:f.z,x,w:CFG.kickW,L:CFG.kickL,H:CFG.kickH})}
    else if(f.t==='rail')addRail(f.z,f.L,X(f.z+f.L/2,at));
    else if(f.t==='log')s.obstacles.push({type:'log',z:f.z,x0:X(f.z,f.a),x1:X(f.z,f.b)});
    else if(f.t==='line'){for(let k=0;k<f.n;k++){const z=f.z+k*8.5,a2=f.hid?hidX(z):at;s.items.push({z,x:X(z,a2)+f.amp*Math.sin(k*.9),h:0,gold:!!f.gold&&k%Math.max(1,Math.floor(f.n/f.gold))===0})}}
    else if(f.t==='box'){const hw=raceHW(f.z),n=f.n||6,xs=[];for(let k=0;k<n;k++)xs.push(X(f.z,(k-(n-1)/2)*hw*1.5/(n-1)));s.boxes.push({z:f.z,xs,got:xs.map(()=>false)})}}
  s.kickers.sort((a,b)=>a.z-b.z);R.kickList=s.kickers.slice();R.railList=s.rails.slice();R.logList=s.obstacles.slice();
  const me=RACE.racers.get(RACE.myId),slot=me?me.slot:0,gx=[-7.5,-2.5,2.5,7.5][slot%4];
  s.z=2;s.x=pisteCX(2)+gx;s.py=baseY(2);s.v=0;s.vd=0;s.vy=0;cam.x=s.x;cam.z=s.z-CFG.camBack;
  Object.assign(s,{boostT:0,boostCap:0,boostA:0,capK:1,revT:0,slipIn:0,slipK:0,rbK:0,spinT:0,spinVis:0,slideT:0,wobT:0,shieldT:0,ball:0,ice:false,padDone:new Set(),ballHit:new Set(),wind:0,windDir:1,hitBy:0});
  for(const r of RACE.racers.values()){r.z=2;r.x=pisteCX(2)+[-7.5,-2.5,2.5,7.5][r.slot%4];r.fin=false;r.finT=0;r.buf=[];r.prevRel=0;if(r.bot)botInit(r);else r.g=rivalState(r)}
  RACE.order=[...RACE.racers.values()];if(!RACE.online)RACE.cd=3.6}

// ---------------- 진행 (update 안에서 매 프레임) ----------------
// 출발 전 카운트다운 동안은 제자리 (카메라만 움직임) → true 면 물리 생략
function raceHold(dt){const s=game;if(RACE.phase!=='count')return false;
  RACE.cd-=dt;s.v=0;s.vd=0;s.py=baseY(s.z);updateCamera(dt);
  if(RACE.cd<=0)raceGo();return RACE.phase==='count'}
function raceGo(){const s=game;RACE.phase='run';RACE.t=0;s.v=RTUNE.startV;s.vd=s.v;s.runT=0;
  const p=RACE.startPress;if(p!=null&&p<=RTUNE.startWin){raceBoost('start');popup('🚀 퍼펙트 스타트!','#ffe066','sys');buzz([20,30,20])}
  else if(p!=null&&p>1.2)popup('너무 빨리 눌렀어요','#cfe8ff');
  sfx('cp');for(const r of RACE.racers.values())if(r.bot)r.v=RTUNE.startV+(Math.random()<.45?5:0)}
function raceStartPress(){if(RACE.startPress==null)RACE.startPress=Math.max(0,RACE.cd)}
function raceTick(dt){const s=game,R=RACE.R;if(!R)return;
  if(RACE.phase==='run'||RACE.phase==='done'){RACE.t+=dt;if(!s.finished)s.runT=RACE.t}
  netTick(dt);
  // 내 효과 타이머
  for(const k of ['boostT','revT','spinT','slideT','wobT','shieldT','ball'])if(s[k]>0)s[k]=Math.max(0,s[k]-dt);
  if(s.spinT>0)s.spinVis+=900*dt*Math.min(1,s.spinT/.4);else if(s.spinVis){s.spinVis=0}
  if(RACE.roul>0){RACE.roul-=dt;if(RACE.roul<=0){if(RACE.pend){RACE.item=RACE.pend;RACE.pend=null;sfx('pick',2)}else RACE.roul=.05}}
  // 돌풍 구간
  {let k=0,dir=1;for(const w of R.winds){const kk=rRamp(s.z,w.z0,w.z0+70,w.z1-70,w.z1);if(kk>k){k=kk;dir=w.dir*(w.flip&&s.z>(w.z0+w.z1)/2?-1:1)}}
    const gust=.5+.5*Math.sin(s.time*.83)*Math.sin(s.time*.31+1.3);s.wind=dir*k*(.55+.45*gust);s.windDir=dir;s.windK=k;
    if(k>.05&&!s._windMsg){s._windMsg=1;popup('🌬 돌풍 구간 '+(dir>0?'→':'←'),'#e8f4ff','sys')}else if(k<.01)s._windMsg=0}
  // 상대·봇
  const now=performance.now();for(const r of RACE.racers.values()){if(r.id===RACE.myId){r.z=s.z;r.x=s.x;continue}if(r.bot)botUpdate(r,dt);else rivalInterp(r,now,dt)}
  // 순위
  RACE.order=[...RACE.racers.values()].sort((a,b)=>(a.fin&&b.fin)?a.finT-b.finT:a.fin?-1:b.fin?1:b.z-a.z);
  if(RACE.phase==='run'||RACE.phase==='done'){raceCatchup(dt);raceProjs(dt);raceBalls();for(const P of RACE.puddles)P.t+=dt;RACE.puddles=RACE.puddles.filter(P=>P.t<RTUNE.puddleLife)}
  if(RACE.phase==='run'&&!s.finished&&s.z>=R.len)raceFinishMe();
  if(!RACE.online)localReferee(dt)}
// 슬립스트림 + 후미 보정
function raceCatchup(dt){const s=game,T=RTUNE.slip;let behind=false,lead=s.z;
  for(const r of RACE.racers.values()){if(r.id===RACE.myId)continue;lead=Math.max(lead,r.z);const dz=r.z-s.z;if(!r.fin&&dz>T.dz[0]&&dz<T.dz[1]&&Math.abs(r.x-s.x)<T.dx&&!s.air)behind=true}
  s.slipIn=behind?s.slipIn+dt:Math.max(0,s.slipIn-dt*2);s.slipK=lerp(s.slipK,s.slipIn>=T.need?1:0,1-Math.exp(-dt*(behind?3:5)));
  if(s.slipIn>=T.need&&!s._slipMsg){s._slipMsg=1;popup('💨 슬립스트림!','#d8f6ff')}else if(s.slipIn<.1)s._slipMsg=0;
  const gap=lead-s.z,B=RTUNE.rubber;s.rbK=s.finished||gap<B.gap?0:B.min+(B.max-B.min)*clamp((gap-B.gap)/(B.full-B.gap),0,1)}
function raceBoost(kind,mul){const s=game,[t,cap,a]=RTUNE.boost[kind],m=mul||1;s.boostT=Math.max(s.boostT,t*m);s.boostCap=Math.max(s.boostT>0?s.boostCap:0,cap*Math.min(1,.5+.5*m));s.boostA=Math.max(s.boostT>0?s.boostA:0,a*m);s.capK=Math.max(s.capK,1+s.boostCap*.6)}
function raceSteer(st){const s=game;if(RACE.phase==='count')return 0;if(s.spinT>0||s.slideT>0)return 0;if(s.wobT>0)st*=.35;if(s.revT>0&&!s.grindR)st=-st;if(s.ball>0)st*=.5;return st}
function raceAccel(h){const s=game;let a=0;if(s.boostT>0&&!s.air)a+=s.boostA*Math.min(1,s.boostT/.3+.25);if(s.ball>0)a+=16;if(s.slipK>.05&&!s.air)a+=RTUNE.slip.acc*s.slipK;
  if(s.spinT>0)a-=s.v*1.1;if(s.slideT>0){a-=1.5;s.heading+=Math.sin(s.time*7)*.6*h}
  if(s.boostT>0&&s.scr&&Math.random()<.5)s.sparks.push({x:s.scr.x+rand(-30,30)*s.scr.s,y:s.scr.y+rand(-6,4),vx:rand(-60,60),vy:rand(30,100),life:.3,col:RACE._bcol||'#ffcf5a'});
  return a}
function raceCap(){const s=game,tgt=1+(s.boostT>0?s.boostCap:0)+RTUNE.slip.cap*s.slipK+s.rbK+(s.ball>0?RTUNE.ballK-1:0);
  s.capK=tgt>=s.capK?tgt:Math.max(tgt,s.capK-.22*(1/120));return s.capK}
function raceRecoverX(){const s=game,c=pisteCX(s.z),hw=raceHW(s.z);if(surfAt(s.z,s.x)!==2&&!treeNear(s.z,s.x,1.4))return;
  let best=c,bd=1e9;for(let dx=-hw+3;dx<=hw-3;dx+=1.5){const x=c+dx;if(treeNear(s.z,x,1.6)||treeNear(s.z+8,x,1.6))continue;const d=Math.abs(x-s.x);if(d<bd){bd=d;best=x}}s.x=best}
// 충돌·수집 (physicsStep 안)
function racePhysics(prevZ,hAbove,h){const s=game,R=RACE.R;grindStep(prevZ,hAbove,h);
  for(const o of s.obstacles)if(o.type==='log'&&!o.done&&prevZ<o.z&&s.z>=o.z){o.done=true;if(s.x>o.x0-.25&&s.x<o.x1+.25){if(s.ball>0){popup('통나무 쾅!','#ffe066');continue}if(hAbove<FREE.logHit-.18){if(bump(s.x))return true;continue}popup('통나무 점프!','#d8f6ff')}}
  for(const it of s.items){if(it.got||it.z>s.z+1.2||it.z<prevZ-1.5)continue;const rad=(it.gold?1.85:1.6)*CH.magnet;if(prevZ<it.z+.05&&s.z>=it.z-.05&&Math.abs(it.x-s.x)<rad&&Math.abs(hAbove-it.h)<rad+(s.ball>0?1.5:0))raceCollect(it)}
  for(const b of s.boxes)if(prevZ<b.z&&s.z>=b.z&&hAbove<2.8)for(let k=0;k<b.xs.length;k++)if(!b.got[k]&&Math.abs(b.xs[k]-s.x)<RTUNE.boxR){b.got[k]=true;raceGetBox();break}
  if(!s.air)for(const p of R.pads)if(!s.padDone.has(p)&&s.z>=p.z&&s.z<=p.z+7&&Math.abs(s.x-(pisteCX(p.z)+p.x0))<1.9){s.padDone.add(p);raceBoost('pad');RACE._bcol='#ffcf5a';sfx('stomp');popup('⚡ 가속!','#ffe066');buzz(15)}
  if(!s.air&&s.ball<=0)for(const P of RACE.puddles)if(P.owner!==RACE.myId&&!P.hitMe&&prevZ<P.z&&s.z>=P.z&&Math.abs(P.x-s.x)<RTUNE.puddleR){P.hitMe=true;raceHitMe('ice',P.owner)}
  return false}
function raceCollect(it){const s=game;it.got=true;const v=runGain(it.gold?3:1);s.got+=v;s.gotPop=it.gold?1.5:1;sfx('pick',it.gold?2:1);
  const before=s.carr10||0;s.carr10=before+v;if(Math.floor(s.carr10/10)>Math.floor(before/10)){raceBoost('carrot');RACE._bcol='#ff9a3c';popup('🥕 당근 '+Math.floor(s.carr10/10)*10+'개 · 부스트!','#ffcf8a')}
  const p=proj(it.x,baseY(it.z)+1.1+it.h,it.z);if(p)for(let i=0;i<(it.gold?16:8);i++){const a=Math.random()*Math.PI*2,sp=rand(60,200);s.sparks.push({x:p.x,y:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-65,life:rand(.35,.6),col:it.gold?'#ffe066':'#ff9a3c'})}}
// 트릭·그라인드 성공 → 짧은 가속 (카트의 드리프트 부스트 역할)
function raceEvents(){const s=game;if(RACE.phase!=='run')return;
  for(const e of s.ev){
    if(e.t==='land'&&e.clean){const k=clamp((e.spin||0)/360*.25+((e.backs||0)+(e.corks||0))*.35+(e.grab?.2:0)+Math.max(0,(e.airT||0)-.6)*.2,0,1);
      if(k>=.15||(e.airT||0)>1){const m=Math.max(.2,k);s.boostT=Math.max(s.boostT,.3+.5*m);s.boostCap=Math.max(s.boostCap,.05+.07*m);s.boostA=Math.max(s.boostA,6+8*m);s.capK=Math.max(s.capK,1+s.boostCap*.6);RACE._bcol='#8fe0ff';popup(m>.6?'🔥 트릭 부스트!!':'✨ 트릭 부스트','#bfe9ff')}}
    else if(e.t==='grind'){raceBoost('grind',e.perfect?1.4:1);RACE._bcol='#ffbe55';popup(e.perfect?'🌟 퍼펙트 그라인드 부스트!':'✨ 그라인드 부스트','#ffe066')}}}
function raceFinishMe(){const s=game;s.finished=true;s.finishT=RACE.t;s.jHeld=false;s.charge=0;const me=RACE.racers.get(RACE.myId);
  if(me){me.fin=true;me.finT=RACE.t}const place=RACE.order.filter(r=>r.fin&&r.id!==RACE.myId).length+1;
  popup('🏁 골인! '+place+'위','#ffe066','sys');sfx('rank');buzz([30,40,30]);voice(place===1?'fever':'special',3);
  if(RACE.online)netSend({t:'fin',time:+RACE.t.toFixed(3)});else localFinish(RACE.myId,RACE.t)}

// ---------------- 아이템 ----------------
function raceGetBox(){const s=game;sfx('cp');if(RACE.item||RACE.roul>0||RACE.pend)return;RACE.roul=RTUNE.roulette;
  if(RACE.online)netSend({t:'box',z:Math.round(s.z)});else{const me=RACE.racers.get(RACE.myId),rk=RACE.order.indexOf(me)+1;RACE.pend=RSH.pickItem(rk,RACE.racers.size,s.z,RACE.R.len)}}
function targetAhead(z,fromId){let best=null;for(const r of RACE.racers.values()){if(r.id===fromId||r.fin)continue;if(r.z>z+1&&(!best||r.z<best.z))best=r}return best}
function raceUseItem(){const s=game;if(RACE.phase!=='run'||!RACE.item||s.finished||s.hitTime>=0)return;const k=RACE.item;RACE.item=null;
  let tg=null;if(k==='ghost'){const t=targetAhead(s.z,RACE.myId);tg=t?t.id:null}
  const ev={k,z:+s.z.toFixed(2),x:+s.x.toFixed(2),tg,v:+s.v.toFixed(1)};applyUse(RACE.myId,ev);if(RACE.online)netSend(Object.assign({t:'use'},ev))}
// 누가 아이템을 쓰면 모두가 똑같이 실행 (내 화면 기준으로 판정)
function applyUse(from,ev){const s=game,mine=from===RACE.myId,r=RACE.racers.get(from),nm=r?r.name:'누군가',k=ev.k;
  if(k==='broc'){if(mine){raceBoost('broc');RACE._bcol='#7ddc6a';popup('🥦 브로콜리 부스트!','#c6f5a8')}else if(r&&r.bot)botBoost(r,'broc')}
  else if(k==='wall'){if(mine){s.shieldT=RTUNE.shield;popup('🛡 눈 방벽!','#cfe8ff')}else if(r)r.shieldT=RTUNE.shield}
  else if(k==='ball'){if(mine){s.ball=RTUNE.ball;s.invT=RTUNE.ball;s.ballHit=new Set();popup('☃️ 거대 눈덩이!!','#ffffff','sys');buzz([30,30,30])}else if(r){r.ballT=RTUNE.ball;popup('☃️ '+nm+' 거대 눈덩이!','#e8f4ff','sys')}}
  else if(k==='ghost'){RACE.projs.push({from,tg:ev.tg,z:ev.z+2,x:ev.x,y:1,v:Math.max(ev.v||20,18)+RTUNE.ghost.v0,t:0});if(!mine&&ev.tg===RACE.myId)popup('👻 유령보드가 날 노려요! 점프!','#e8d8ff','sys');else if(mine)popup('👻 유령보드 발사!','#e8d8ff')}
  else if(k==='ice'){RACE.puddles.push({owner:from,z:ev.z-4,x:ev.x,t:0});if(mine)popup('🧊 얼음 웅덩이 설치','#cfe8ff')}
  else if(k==='q'){if(mine)popup('❓ 모두 좌우 반전!','#ffe066');else{raceHitMe('q',from)}for(const b of RACE.racers.values())if(b.bot&&b.id!==from)botHit(b,'q',from)}}
// 내가 맞았을 때 (판정은 맞는 사람 화면 기준)
function raceHitMe(kind,by){const s=game,r=RACE.racers.get(by),nm=r?r.name:'';if(RACE.phase!=='run'||s.finished)return;
  if(s.ball>0)return;if(s.grindR){if(kind!=='ice')popup('그라인드 중엔 끄떡없어요','#d8f6ff');return}
  if(s.shieldT>0){s.shieldT=0;popup('🛡 방벽이 막았어요!','#cfe8ff');sfx('land',6);return}
  if(CH.guard&&!(s.guardT>0)){s.guardT=CH.guard;s.wobble=.5;s.wobbleK=.6;popup('🛡 꿋꿋 가드!','#cfe8ff');s.ev.push({t:'guard'});return}
  if(kind==='ghost'){s.v*=RTUNE.ghostHit;s.wobble=1;s.wobbleK=1;s.wobT=1;s.flash=.4;popup('👻 '+nm+'의 유령보드에 맞았어요','#e8d8ff');sfx('land',10);buzz([40,30,40])}
  else if(kind==='ball'){s.spinT=RTUNE.spin;s.flash=.5;s.boostT=0;popup('☃️ 눈덩이에 휩쓸렸어요!','#ffd2c4');sfx('crash');buzz([60,40,80])}
  else if(kind==='q'){s.revT=RTUNE.rev;popup('❓ 좌우 반전 '+RTUNE.rev+'초!','#ffe066','sys');sfx('rank')}
  else if(kind==='ice'){s.slideT=RTUNE.slide;s.v*=.9;popup('🧊 미끌!','#cfe8ff');sfx('edge')}
  s.dashT=0;if(RACE.online)netSend({t:'hit',by,k:kind})}
function raceProjs(dt){const s=game,G=RTUNE.ghost;
  for(const p of RACE.projs){if(p.done)continue;p.t+=dt;const T=p.tg?RACE.racers.get(p.tg):null,me=T&&T.id===RACE.myId;
    p.v=Math.min(G.vmax,p.v+G.acc*dt);p.z+=p.v*dt;
    if(T){const tx=me?s.x:T.x,tz=me?s.z:T.z,k=tz-p.z<40?2:1;p.x+=clamp(tx-p.x,-G.turn*k*dt,G.turn*k*dt);
      if(p.z>=tz-.3){p.done=true;if(me){const hA=s.py-groundY(s.z,s.x);if(hA>G.dodgeH){popup('점프로 피했어요!','#d8f6ff');sfx('pop')}else raceHitMe('ghost',p.from)}else if(T.bot&&!RACE.online)botHit(T,'ghost',p.from);
        const q=proj(tx,baseY(tz)+1,tz);if(q)for(let i=0;i<14;i++){const a=Math.random()*6.28,sp=rand(60,180);s.sparks.push({x:q.x,y:q.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.45,col:'#e6dcff'})}}}
    else p.x=lerp(p.x,pisteCX(p.z),dt*.5);
    if(p.t>G.life)p.done=true}
  RACE.projs=RACE.projs.filter(p=>!p.done)}
// 거대 눈덩이 충돌: 내 눈덩이 ↔ 봇, 상대 눈덩이 → 나 (맞는 사람 화면에서 판정)
function raceBalls(){const s=game,BR=RTUNE.ballR;
  for(const r of RACE.racers.values()){if(r.id===RACE.myId)continue;const rel=r.z-s.z,dx=Math.abs(r.x-s.x),cross=(r.prevRel??rel)<0!==(rel<0)||Math.abs(rel)<1.6;
    if(s.ball>0&&r.bot&&!s.ballHit.has(r.id)&&cross&&dx<BR){s.ballHit.add(r.id);botHit(r,'ball',RACE.myId)}
    if((r.ballT>0||r.ball)&&cross&&dx<BR&&!(r._hitMe>0)){r._hitMe=RTUNE.ball;raceHitMe('ball',r.id)}
    if(r._hitMe>0&&!(r.ballT>0||r.ball))r._hitMe=0;r.prevRel=rel}}

// ---------------- 상대(온라인) : 받은 상태를 0.11초 늦춰 부드럽게 보간 ----------------
// 전송 배열: [z,x,py,heading,edge,yawBase,airSpin,flip,crouch,flags,v,hitTime,grab,flipKind]
//  flags: 1 공중 · 2 눈덩이 · 4 방벽 · 8 골인 · 16 그라인드 · 32 미끄럼 · 64 회전 · 128 반전 · 256 히트방향(+)
function rivalState(r){return{x:r.x,py:baseY(2),z:2,vy:0,vd:0,v:0,heading:0,edge:0,slash:0,yawBase:0,yawVel:0,airSpin:0,spinVel:0,flip:0,flips:[],crouch:0,air:false,hitTime:-1,hitSide:1,crashYaw:0,
  landT:0,landHard:0,popAnim:0,grab:0,grabbing:false,grabType:'인디',pitchVis:0,loadT:0,jHeld:false,jConsumed:false,charge:0,wobble:0,wobbleK:0,manualTuck:0,spinVis:0,time:0,gameOver:false,feverT:0,ghosts:[],scr:{x:0,y:0,s:1},sparks:[],tailOff:null}}
const FLIPK=['back','front','side','cork','rodeo','misty'];
function myStateArr(){const s=game,f=(s.air?1:0)|(s.ball>0?2:0)|(s.shieldT>0?4:0)|(s.finished?8:0)|(s.grindR?16:0)|(s.slideT>0?32:0)|(s.spinT>0?64:0)|(s.revT>0?128:0)|(s.hitSide>0?256:0);
  const fk=s.flips&&s.flips.length?Math.max(0,FLIPK.indexOf(s.flips[0])):0;
  return[+s.z.toFixed(2),+s.x.toFixed(2),+s.py.toFixed(2),+s.heading.toFixed(3),+s.edge.toFixed(1),Math.round(s.yawBase),Math.round(s.airSpin),Math.round(s.flip),+s.crouch.toFixed(2),f,+s.v.toFixed(1),+(s.hitTime>=0?s.hitTime:-1).toFixed(2),+(s.grab||0).toFixed(2),fk]}
function rivalPush(r,d){r.buf.push({t:performance.now(),d});if(r.buf.length>24)r.buf.shift()}
function rivalInterp(r,now,dt){const g=r.g||(r.g=rivalState(r)),B=r.buf;g.time+=dt;if(!B.length)return;const rt=now-110;let a=B[0],b=null;
  for(let i=B.length-1;i>=0;i--)if(B[i].t<=rt){a=B[i];b=B[i+1]||null;break}
  let d=a.d;if(b){const u=clamp((rt-a.t)/Math.max(1,b.t-a.t),0,1),A=a.d,Bd=b.d;d=A.map((v,i)=>i===9||i===13?(u<.5?v:Bd[i]):(i===5||i===6||i===7)&&Math.abs(Bd[i]-v)>200?Bd[i]:v+(Bd[i]-v)*u)}
  else{const ex=Math.min(.25,(rt-a.t)/1000);d=a.d.slice();d[0]+=d[10]*Math.cos(d[3])*ex}
  const f=d[9],py0=g.py;g.z=d[0];g.x=d[1];g.py=d[2];g.heading=d[3];g.edge=d[4];g.yawBase=d[5];g.airSpin=d[6];g.flip=d[7];g.crouch=d[8];g.v=d[10];g.vd=g.v*Math.cos(g.heading);
  g.air=!!(f&1);g.vy=g.air?(g.py-py0)/Math.max(dt,1e-3):-baseSlope(g.z)*g.vd;g.hitTime=d[11];g.hitSide=f&256?1:-1;g.crashYaw=g.hitTime>=0?g.hitSide*130*smooth(0,1,g.hitTime):0;g.grab=d[12];g.grabbing=g.grab>.5;g.flips=g.flip?[FLIPK[d[13]]||'back']:[];
  g.spinVis=f&64?(g.spinVis||0)+900*dt:0;r.z=g.z;r.x=g.x;r.ball=!!(f&2);r.shield=!!(f&4);r.grind=!!(f&16);r.rev=!!(f&128);r.slide=!!(f&32)}

// ---------------- 봇 (혼자 연습 레이스) ----------------
const BOT_NAMES=['찹쌀','두부','호떡','감자','마카롱','눈송이','군밤','단팥'];
function botInit(b){const R=RACE.R;b.v=0;b.vy=0;b.py=baseY(b.z);b.air=false;b.airT=0;b.heading=0;b.spin=0;b.spinTgt=0;b.boostT=0;b.boostCap=0;b.capK=1;b.spinT=0;b.revT=0;b.slideT=0;b.wobT=0;b.shieldT=0;b.ballT=0;b.item=null;b.itemT=0;b.boxDone=new Set();b.padDone=new Set();b.grindR=null;b.hit=0;
  b.choice=R.splits.map(sp=>Math.floor(Math.random()*(sp.at.length+1)));b.hid=R.hidden.map(()=>Math.random()<b.skill*.45);b.pref=rand(-.45,.45);b.ph=Math.random()*6.28;b.avoid=Math.random()<.55;b.g=rivalState(b);b.g.yawBase=Math.random()<.5?0:180}
function botGround(z,x){let y=baseY(z);const R=RACE.R;for(const k of R.kickList){if(k.z>z)break;if(z<=k.z+k.L&&Math.abs(x-k.x)<=k.w/2)return y+kH(k,(z-k.z)/k.L)}return y}
function botTargetX(b,z){const R=RACE.R,c=pisteCX(z),hw=raceHW(z);let t=b.pref*hw*.7+Math.sin(z*.012+b.ph)*3.5;
  const sp=splitAt(z,45);if(sp)t=laneCenters(sp,raceHW(Math.max(z,sp.z0+5)))[b.choice[sp.idx]]+Math.sin(z*.02+b.ph)*1.5;
  for(const H of R.hidden)if(b.hid[H.idx]&&z>H.z0-50&&z<H.z1-8){t=H.side*(raceHW(z)+H.in+H.w/2);break}
  for(const p of R.pads)if(p.z>z-6&&p.z<z+40&&Math.abs(p.x0-t)<7){t=p.x0;break}
  for(const P of RACE.puddles)if(b.avoid&&P.z>b.z&&P.z<b.z+30&&Math.abs(P.x-(c+t))<2.6)t+=(P.x>c+t?-3.2:3.2);
  if(!hiddenAt(z,t<0?-1:1)||Math.abs(t)<hw)t=clamp(t,-hw+2,hw-2);
  let x=c+t;if(treeNear(z,x,1.8)){for(const o of [2.5,-2.5,5,-5,8,-8])if(!treeNear(z,x+o,1.8)){x+=o;break}}
  return x}
function botCap(b){const R=RACE.R,me=RACE.racers.get(RACE.myId),lead=Math.max(...[...RACE.racers.values()].map(r=>r.z)),gap=lead-b.z,B=RTUNE.rubber;
  let k=1+(b.boostT>0?b.boostCap:0)+(gap>B.gap?B.min+(B.max-B.min)*clamp((gap-B.gap)/(B.full-B.gap),0,1):0)+(b.ballT>0?RTUNE.ballK-1:0);
  if(me&&!me.fin){const d=b.z-me.z;k*=d>100?lerp(1,.93,clamp((d-100)/150,0,1)):d<-100?lerp(1,1.05,clamp((-d-100)/150,0,1)):1}return k}
function botUpdate(b,dt){const R=RACE.R,g=b.g,prevZ=b.z;g.time+=dt;
  for(const k of ['boostT','spinT','revT','slideT','wobT','shieldT','ballT','hit'])if(b[k]>0)b[k]=Math.max(0,b[k]-dt);
  if(RACE.phase==='count'){b.py=baseY(b.z);botSync(b,dt);return}
  const maxV=R.C.maxSpeed*(CHARS[b.char]?1+(CHARS[b.char].maxV-1)*RTUNE.carStat:1);
  if(b.fin){b.v=Math.max(0,b.v-8*dt)}
  else if(b.spinT>0){b.v*=Math.exp(-dt*1.4)}
  else{b.capK=Math.max(botCap(b),b.capK-.22*dt);const tgt=maxV*b.skill*b.capK*(b.revT>0?.93:1)*(surfAt(b.z,b.x)===2?.8:1);b.v+=clamp(tgt-b.v,-10*dt,(b.air?0:(b.boostT>0?11:6.5))*dt)}
  b.z+=b.v*Math.cos(b.heading)*dt;
  // 옆 이동: 목표선을 향해 (반전·미끄럼 중엔 흔들림)
  if(!b.grindR){const tx=botTargetX(b,b.z+Math.max(14,b.v*.55)),wob=(b.revT>0?Math.sin(g.time*5+b.ph)*4:0)+(b.slideT>0?Math.sin(g.time*9)*3:0);
    const vx=clamp((tx+wob-b.x)*1.6,-9,9)*(b.air?.3:1)*(b.slideT>0?.2:1);b.x+=vx*dt;b.heading=lerp(b.heading,Math.atan2(vx,Math.max(5,b.v)),1-Math.exp(-dt*6))}
  // 레일: 가까우면 올라타 미끄러짐
  if(!b.air){const r=R.railList.find(r=>b.z>r.z0&&b.z<r.z1&&Math.abs(b.x-r.x)<1.6);if(r){if(b.grindR!==r){b.grindR=r}b.x=lerp(b.x,r.x,1-Math.exp(-dt*12));b.heading*=.9}else if(b.grindR){const r0=b.grindR;b.grindR=null;if(b.z>=r0.z1-.6)botBoost(b,'grind')}}
  // 수직: 지면을 따라가다 립에서 이륙
  const gy=b.grindR?baseY(b.z)+RAIL.h:botGround(b.z,b.x);
  if(b.air){b.vy-=CFG.g*dt;b.py+=b.vy*dt;b.airT+=dt;b.spin+=clamp(b.spinTgt-b.spin,-560*dt,560*dt);
    if(b.py<=gy){b.air=false;b.py=gy;const clean=Math.abs(b.spin-b.spinTgt)<20;g.yawBase+=b.spin;b.spin=0;if(clean&&(b.spinTgt||b.airT>1))botBoost(b,'trick',clamp(.3+Math.abs(b.spinTgt)/1080,.3,1));b.spinTgt=0;g.landT=.28}}
  else{const vyG=(gy-b.py)/dt;if(vyG<b.vy-CFG.g*dt*2.3&&b.v>8&&!b.grindR){b.air=true;b.airT=0;b.vy=b.vy+(Math.random()<.6?2.2:0);const est=2*Math.max(0,b.vy+baseSlope(b.z)*b.v)/CFG.g;b.spinTgt=est>.75&&Math.random()<b.skill?(est>1.4&&Math.random()<.5?540:360)*(Math.random()<.5?-1:1):0;if(Math.abs(b.spinTgt)===540)b.spinTgt=Math.sign(b.spinTgt)*360}
    else{b.vy=vyG;b.py=gy;
      const lg=R.logList.find(o=>o.z>b.z&&o.z-b.z<Math.max(4,b.v*.18)&&b.x>o.x0-1&&b.x<o.x1+1);if(lg&&b.v>5){b.air=true;b.airT=0;b.vy=-baseSlope(b.z)*b.v+4.2;b.spinTgt=0}}}
  // 나무에 박으면 넘어짐
  if(!b.air&&!(b.hit>0)&&!(b.ballT>0)&&!b.fin){const seg=Math.floor(b.z/SEG);if(seg!==b._seg){b._seg=seg;for(const t of treesAt(seg))if(Math.abs(t.x-b.x)<t.hb+.2){b.spinT=1.2;b.hit=2;b.v*=.6;break}}}
  // 상자·패드·웅덩이
  for(const bx of game.boxes||[])if(prevZ<bx.z&&b.z>=bx.z&&!b.boxDone.has(bx)){b.boxDone.add(bx);if(!b.item&&!b.itemT&&bx.xs.some(x=>Math.abs(x-b.x)<RTUNE.boxR+.6)){b.itemT=RTUNE.roulette;b.itemPend=RSH.pickItem(RACE.order.indexOf(b)+1,RACE.racers.size,b.z,R.len);b.useAt=null}}
  for(const p of R.pads)if(!b.padDone.has(p)&&!b.air&&b.z>=p.z&&b.z<=p.z+7&&Math.abs(b.x-(pisteCX(p.z)+p.x0))<1.9){b.padDone.add(p);botBoost(b,'pad')}
  if(!b.air)for(const P of RACE.puddles)if(P.owner!==b.id&&prevZ<P.z&&b.z>=P.z&&Math.abs(P.x-b.x)<RTUNE.puddleR)botHit(b,'ice',P.owner);
  for(const o of RACE.racers.values())if(o.bot&&o!==b&&o.ballT>0&&Math.abs(o.z-b.z)<1.8&&Math.abs(o.x-b.x)<RTUNE.ballR&&!(b._bh>0)){b._bh=1.5;botHit(b,'ball',o.id)}if(b._bh>0)b._bh-=dt;
  // 아이템 사용
  if(b.itemT>0){b.itemT-=dt;if(b.itemT<=0){b.item=b.itemPend;b.itemT=0;b.useAt=g.time+botUseDelay(b.item)}}
  if(b.item&&g.time>=b.useAt&&!b.fin&&RACE.phase==='run')botUse(b);
  if(!b.fin&&b.z>=R.len){b.fin=true;localFinish(b.id,RACE.t)}
  botSync(b,dt)}
function botUseDelay(k){return k==='broc'||k==='ball'?rand(.3,1.2):k==='wall'?rand(2,6):k==='ghost'?rand(.5,2):k==='ice'?rand(.8,4):rand(1,3.5)}
function botUse(b){const k=b.item;if(k==='ghost'&&!targetAhead(b.z,b.id)){b.useAt+=1;return}b.item=null;const t=k==='ghost'?targetAhead(b.z,b.id):null;applyUse(b.id,{k,z:b.z,x:b.x,tg:t?t.id:null,v:b.v})}
function botBoost(b,kind,m){if(kind==='broc'){b.boostT=3;b.boostCap=.14}else if(kind==='pad'){b.boostT=1.2;b.boostCap=.12}else if(kind==='grind'){b.boostT=.9;b.boostCap=.1}else{b.boostT=.3+.5*(m||.3);b.boostCap=.05+.07*(m||.3)}b.capK=Math.max(b.capK,1+b.boostCap*.6)}
function botHit(b,kind,by){if(b.fin||b.ballT>0||b.grindR)return;if(b.shieldT>0){b.shieldT=0;return}if(CHARS[b.char]&&CHARS[b.char].guard&&!(b.guardT>0)){b.guardT=22;return}
  if(kind==='ghost'){if(Math.random()<.22){b.air=true;b.airT=0;b.vy=-baseSlope(b.z)*b.v+4.5;b.spinTgt=0;return}b.v*=RTUNE.ghostHit;b.wobT=1}
  else if(kind==='ball'){b.spinT=RTUNE.spin;b.boostT=0}else if(kind==='q')b.revT=RTUNE.rev;else if(kind==='ice'){b.slideT=RTUNE.slide;b.v*=.9}
  if(by===RACE.myId){const nm=b.name;popup(kind==='ghost'?'👻 '+nm+' 명중!':kind==='ball'?'☃️ '+nm+' 쓰러뜨림!':kind==='ice'?'🧊 '+nm+' 미끌!':'','#ffe066')}}
function botSync(b,dt){const g=b.g;if(b.guardT>0)b.guardT-=dt;g.z=b.z;g.x=b.x;g.py=b.py;g.v=b.v;g.vd=b.v*Math.cos(b.heading);g.vy=b.air?b.vy:-baseSlope(b.z)*g.vd;g.heading=b.heading;g.air=b.air;g.airSpin=b.air?b.spin:0;
  const tgtE=clamp(-(b.heading)*120,-35,35);g.edge=lerp(g.edge,b.air?0:tgtE,1-Math.exp(-dt*6));const side=g.edge>5?1:g.edge<-5?-1:0;if(side&&!b.air){const ty=side<0?180:0;g.yawBase=lerp(g.yawBase,ty+(g.yawBase>270?360:g.yawBase<-90?-360:0),1-Math.exp(-dt*5))}
  g.crouch=lerp(g.crouch,b.air?.35:b.v>30?.5:.15,1-Math.exp(-dt*6));g.landT=Math.max(0,g.landT-dt);g.spinVis=b.spinT>0?(g.spinVis||0)+900*dt:0;g.wobble=b.wobT>0?b.wobT*.6:0;g.wobbleK=1;g.hitTime=-1;
  b.ball=b.ballT>0;b.shield=b.shieldT>0;b.rev=b.revT>0;b.grind=!!b.grindR}

// ---------------- 혼자 연습 레이스 심판 (온라인에선 서버가 함) ----------------
function localFinish(id,t){const r=RACE.racers.get(id);if(!r||r.finRec)return;r.finRec=true;r.fin=true;r.finT=t;if(RACE.firstFin<0){RACE.firstFin=RACE.t;RACE.endT=RSH.FINISH_WAIT}
  if(id!==RACE.myId&&RACE.firstFin===RACE.t&&!game.finished)popup('🏁 '+r.name+' 골인! '+RSH.FINISH_WAIT+'초 안에 들어와요','#ffe066','sys')}
function localReferee(dt){if(RACE.endT<0||RACE.phase==='result')return;RACE.endT-=dt;const all=[...RACE.racers.values()].every(r=>r.fin);
  if(RACE.endT<=0||all){const res=RACE.order.map((r,i)=>({id:r.id,name:r.name,char:r.char,place:i+1,time:r.fin?r.finT:null,z:Math.round(r.z),fin:!!r.fin}));raceEnd(res)}}
