// =====================================================================
//  멀티 레이스 · 카트 느낌 (부스트 연출 · 카빙 미니 부스트 · 레일 가속 · 몸싸움 · 미니맵 · 후방 경고 · 소리)
// =====================================================================
const BCOL={broc:'#7ddc6a',pad:'#ffd23f',start:'#ffe066',grind:'#ffb84a',carrot:'#ff9a3c',trick:'#8fe0ff',carve1:'#5ab8ff',carve2:'#ff8a3c',ball:'#ffffff'};
// ---- 효과음 (WebAudio 합성, 파일 없음) ----
function raceSfx(type,amt){const a=SFX.a;if(!a||SFX.muted)return;const t=a.currentTime,out=SFX.master;
  const tone=(f0,f1,dur,vol,wave,delay)=>{const o=a.createOscillator();o.type=wave||'sine';o.frequency.setValueAtTime(f0,t+(delay||0));o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+(delay||0)+dur);const g=a.createGain();g.gain.setValueAtTime(.0001,t+(delay||0));g.gain.exponentialRampToValueAtTime(vol,t+(delay||0)+.015);g.gain.exponentialRampToValueAtTime(.001,t+(delay||0)+dur);o.connect(g).connect(out);o.start(t+(delay||0));o.stop(t+(delay||0)+dur+.05)};
  const noise=(dur,type2,f0,f1,vol,q)=>{const s=a.createBufferSource();s.buffer=SFX.noise;const fl=a.createBiquadFilter();fl.type=type2;fl.Q.value=q||1;fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.04);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(fl).connect(g).connect(out);s.start(t,Math.random());s.stop(t+dur+.05)};
  if(type==='boost'){noise(.7,'bandpass',300,2600,.55*(amt||1),1.4);tone(90,180,.35,.3,'sawtooth');tone(440,880,.25,.08,'triangle',.05)}
  else if(type==='charge'){tone(amt>1?1318:988,amt>1?1318:988,.12,.12,'triangle');tone(amt>1?1760:1318,amt>1?1760:1318,.14,.08,'triangle',.06)}
  else if(type==='bump'){noise(.18,'lowpass',600,150,.45);tone(120,70,.14,.25)}
  else if(type==='beep'){tone(amt?1320:660,amt?1320:660,amt?.45:.16,.16,'square')}
  else if(type==='warn'){tone(1046,1046,.08,.08,'square');tone(1046,1046,.08,.08,'square',.12)}
  else if(type==='rankup'){[784,1046].forEach((f,i)=>tone(f,f,.14,.1,'triangle',i*.07))}
  else if(type==='rankdn'){tone(392,330,.2,.08,'triangle')}
  else if(type==='fall'){tone(700,120,.9,.18,'sine');noise(.8,'lowpass',1200,200,.3)}}
// ---- 부스트 발동 연출: 소리 + 터지는 불꽃 + 시야 넓어짐 (성능은 종류별 수치만, 연출은 공용) ----
function raceBoostFx(kind,strong){const s=game,col=BCOL[kind]||'#ffe066';RACE._bcol=col;s.bfx=1;s.bfxCol=col;raceSfx('boost',strong?1.15:.8);buzz(strong?[25,20,25]:18);
  if(s.scr)for(let i=0;i<(strong?26:14);i++){const a=Math.PI*(.15+.7*Math.random()),sp=rand(120,320);s.sparks.push({x:s.scr.x+rand(-30,30),y:s.scr.y-10,vx:Math.cos(a)*sp*(Math.random()<.5?-1:1),vy:Math.sin(a)*sp*.4+60,life:rand(.3,.6),col:Math.random()<.6?col:'#ffffff'})}}
function raceFov(){const s=game;s.bvis=lerp(s.bvis||0,(s.boostT>0||s.ball>0)?1:0,.08);return 1-.075*s.bvis}
// ---- 카빙 미니 부스트: 깊게 꺾은 채 버티면 파랑→주황 불꽃이 모이고, 풀면 가속 ----
const CARVE={edge:22,minV:16,t1:.85,t2:1.7,b1:[.55,.06,9],b2:[.95,.09,12]};
function raceCarve(dt){const s=game;if(RACE.phase!=='run'||s.finished){s.dcT=0;s.dcLv=0;return}
  const deep=!s.air&&!s.grindR&&s.hitTime<0&&s.spinT<=0&&s.slideT<=0&&s.ball<=0&&Math.abs(s.edge)>CARVE.edge&&s.v>CARVE.minV,side=Math.sign(s.edge);
  if(deep&&(!s.dcT||s.dcSide===side)){s.dcSide=side;s.dcT=(s.dcT||0)+dt;const lv=s.dcT>=CARVE.t2?2:s.dcT>=CARVE.t1?1:0;if(lv>(s.dcLv||0)){s.dcLv=lv;raceSfx('charge',lv)}
    if(lv&&s.scr&&Math.random()<.85)for(let i=0;i<2;i++)s.sparks.push({x:s.scr.x+side*rand(20,60)*s.scr.s/CFG.rigScale*.012+rand(-12,12),y:s.scr.y+rand(-4,6),vx:-side*rand(40,160),vy:-rand(30,120),life:.28,col:lv>1?(Math.random()<.5?'#ff8a3c':'#ffd23f'):(Math.random()<.5?'#5ab8ff':'#bfe9ff')})}
  else if(s.dcT){const lv=s.dcLv||0;s.dcT=0;s.dcLv=0;if(lv&&s.hitTime<0){const B=lv>1?CARVE.b2:CARVE.b1;s.boostT=Math.max(s.boostT,B[0]);s.boostCap=Math.max(s.boostCap,B[1]);s.boostA=Math.max(s.boostA,B[2]);s.capK=Math.max(s.capK,1+B[1]*.6);raceBoostFx(lv>1?'carve2':'carve1',lv>1);popup(lv>1?'🔥 카빙 부스트!!':'💨 카빙 부스트','#bfe9ff')}}}
// ---- 레일: 레이스에서는 '빠른 길' (감속 없이 점점 빨라짐) ----
function raceGrindTick(h){const s=game;s.v=Math.min(s.v+4.2*h,CFG.maxSpeed*1.1);if(s.scr&&Math.random()<.5)s.sparks.push({x:s.scr.x+rand(-10,10),y:s.scr.y,vx:rand(-60,60),vy:rand(20,90),life:.25,col:'#ffb84a'})}
// ---- 몸싸움: 나란히 붙으면 서로 옆으로 밀림 (넘어지지는 않음, 판정은 각자 화면 기준) ----
const BUMP={dz:1.6,dx:1.35,push:7,slow:.985};
function raceBumps(dt){const s=game;if(RACE.phase!=='run'||s.finished||s.air||s.ball>0||s.hitTime>=0)return;s.bumpCd=Math.max(0,(s.bumpCd||0)-dt);
  for(const r of RACE.racers.values()){if(r.id===RACE.myId||r.fin||r.ball)continue;const air=r.bot?r.air:(r.g&&r.g.air);if(air)continue;const dz=r.z-s.z,dx=r.x-s.x;
    if(Math.abs(dz)<BUMP.dz&&Math.abs(dx)<BUMP.dx){const sg=dx>=0?1:-1,over=BUMP.dx-Math.abs(dx);s.x-=sg*over*.55;s.heading-=sg*.05;if(r.bot){r.x+=sg*over*.55;r.v*=BUMP.slow}
      if(dz>0)s.v*=Math.pow(BUMP.slow,dt*60);if(!s.bumpCd){s.bumpCd=.35;raceSfx('bump');buzz(20);s.wobble=Math.max(s.wobble,.25);s.wobbleK=.4;
        if(s.scr)for(let i=0;i<10;i++)s.sparks.push({x:s.scr.x+sg*rand(20,40),y:s.scr.y-rand(30,70),vx:sg*rand(40,160),vy:-rand(40,140),life:.3,col:'#ffffff'})}}}}
// ---- 순위 변화 알림 · 카운트다운 소리 · 마지막 구간 ----
function raceAnnounce(){const s=game,me=RACE.racers.get(RACE.myId);if(!me||RACE.phase!=='run'||s.finished)return;const rk=RACE.order.indexOf(me)+1;
  if(RACE._rk&&rk!==RACE._rk&&s.time-(RACE._rkT||0)>.8){RACE._rkT=s.time;if(rk<RACE._rk){popup('▲ '+rk+'위!','#7ddc6a');raceSfx('rankup')}else{popup('▼ '+rk+'위','#ffb4a4');raceSfx('rankdn')}}RACE._rk=rk;
  if(!RACE._last&&s.z>RACE.R.len-600){RACE._last=1;popup('🏁 마지막 구간!','#ffe066','sys');raceSfx('beep',1)}}
function raceCountBeep(){const c=Math.ceil(RACE.cd);if(RACE.phase==='count'&&c!==RACE._cb&&c<=3&&c>0){RACE._cb=c;raceSfx('beep',0)}}
// ---- 부스트 불꽃 꼬리 (보드 뒤 → 화면 아래쪽으로 뿜어짐) ----
function drawBoostFlame(){const s=game;s.bfx=Math.max(0,(s.bfx||0)-.04);const on=s.boostT>0&&!s.air;if(!on&&s.bfx<=0)return;const p=proj(s.x,s.py,s.z);if(!p||!s.tailOff)return;
  const to=s.tailOff,col=s.bfxCol||RACE._bcol||'#ffd23f',k=p.s,t=s.time,pw=on?Math.min(1,s.boostT/.3+.4):s.bfx;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const side of [-1,1]){const ox=p.x+(side<0?to.lx:to.rx)*k,oy=p.y-(side<0?to.ly:to.ry)*k,L=k*(1.3+.5*Math.sin(t*40+side))*pw,W=k*.32*pw;
    const g=ctx.createLinearGradient(ox,oy,ox,oy+L);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.25,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(ox-W,oy);ctx.quadraticCurveTo(ox+side*W*.6,oy+L*.5,ox+side*W*.4+Math.sin(t*30)*W*.3,oy+L);ctx.quadraticCurveTo(ox-side*W*.2,oy+L*.45,ox+W,oy);ctx.closePath();ctx.fill()}
  ctx.restore();GLOWS.push({x:p.x+to.mx*k,y:p.y-to.my*k+k*.3,r:k*1.8*pw,a:.45*pw,g:1,o:-1});
  // 상점 이펙트를 끼고 있으면 그 색 반짝이를 살짝 더함 (성능과는 무관)
  const fx=eqOf('fx'),pal=fx&&FX_PAL[fx];if(on&&pal&&Math.random()<.6)s.sparks.push({x:p.x+to.mx*k+rand(-8,8),y:p.y-to.my*k,vx:rand(-50,50),vy:rand(60,160),life:.35,col:pal[Math.floor(Math.random()*pal.length)]})}
function drawBoostScreen(){const s=game,b=s.bvis||0;if(b<.05)return;const col=s.bfxCol||'#ffd23f',t=s.time;ctx.save();ctx.globalAlpha=b*.5;ctx.strokeStyle=col;ctx.lineCap='round';
  for(let i=0;i<22;i++){const side=i%2?1:-1,y=((i*53+t*900)%H),x=side<0?((i*37)%90):W-((i*37)%90),len=40+((i*29)%60);ctx.lineWidth=2+(i%3);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*12,y+len);ctx.stroke()}
  ctx.restore()}

// ---- 캐릭터 얼굴 아이콘 (미니맵·진행 막대용, 각자 캐릭터 그림을 동그랗게 잘라 씀) ----
const FACE_CROP={usagi:[30,150,270],hachiware:[30,120,270],chiikawa:[33,140,265]};
const FACE={};
function faceIcon(cid){if(FACE[cid])return FACE[cid];const CI=CHAR_IMG[cid]||CHAR_IMG.usagi,img=CI&&CI.front;if(!img||!img.width)return null;
  const S=64,c=mkCanvas(S,S),g=c.getContext('2d'),[x,y,w]=FACE_CROP[cid]||FACE_CROP.usagi,sx=img.naturalWidth/331;
  g.beginPath();g.arc(S/2,S/2,S/2-1,0,Math.PI*2);g.closePath();g.fillStyle='#eaf4fb';g.fill();g.save();g.clip();g.imageSmoothingQuality='high';g.drawImage(img,x*sx,y*sx,w*sx,w*sx,2,2,S-4,S-4);g.restore();return FACE[cid]=c}
function drawFace(r,x,y,R,mine){const ic=faceIcon(r.char);ctx.save();ctx.beginPath();ctx.arc(x,y,R+2.5,0,Math.PI*2);ctx.fillStyle=r.col;ctx.fill();if(mine){ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke()}
  if(ic)ctx.drawImage(ic,x-R,y-R,2*R,2*R);else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.fill()}
  const rk=RACE.order.indexOf(r)+1;if(rk>0){ctx.font='900 '+Math.round(R*.95)+'px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle=INK;ctx.strokeText(rk,x+R*.85,y+R*1.05);ctx.fillStyle='#fff';ctx.fillText(rk,x+R*.85,y+R*1.05);ctx.textAlign='left'}ctx.restore()}
// ---- 세로 미니맵: 코스 모양(갈림길·숨은 통로·협곡) + 선수 얼굴 ----
function buildMiniMap(w,h){const R=RACE.R,c=mkCanvas(w*2,h*2),g=c.getContext('2d');g.scale(2,2);const L=R.len,pad=10,sy=z=>h-pad-(z/L)*(h-2*pad),xs=.38,sx=(z,o)=>w/2+(pisteCX(z)-pisteCX(0))*xs*.55+o*xs;
  g.lineCap='round';g.lineJoin='round';
  const roadsAt=z=>raceRoads(z);
  // 길 띠
  for(let pass=0;pass<2;pass++){g.strokeStyle=pass?'#ffffff':'rgba(20,40,56,.45)';
    const maxR=Math.max(...R.F.filter(f=>f.t==='fork').map(f=>f.roads.length),1);
    for(let ri=0;ri<maxR;ri++){g.beginPath();let st=false;for(let z=0;z<=L;z+=20){const rr=roadsAt(z),q=rr[Math.min(ri,rr.length-1)],x=sx(z,q.o),y=sy(z);g.lineWidth=Math.max(2.5,q.w*xs*1.6)+(pass?0:3);if(!st){g.moveTo(x,y);st=true}else g.lineTo(x,y)}g.stroke()}}
  // 숨은 통로 (점선)
  g.setLineDash([3,3]);g.strokeStyle='#8fc7ef';g.lineWidth=2.5;for(const H of R.hidden){g.beginPath();for(let z=H.z0;z<=H.z1;z+=20){const x=sx(z,H.side*(raceHW(z)+H.in+H.w/2)),y=sy(z);z===H.z0?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}g.setLineDash([]);
  // 협곡(빈 곳)
  g.fillStyle='#2c4258';for(const G of R.gaps){const y0=sy(G.z1),y1=sy(G.z0);const rr=roadsAt(G.z0);const off=G.road!=null?rr[Math.min(G.road,rr.length-1)].o:0;g.fillRect(sx(G.z0,off+Math.max(G.a,-40))-1,y0,Math.max(4,(Math.min(G.b,40)-Math.max(G.a,-40))*xs)+2,Math.max(2,y1-y0))}
  // 상자 줄 · 결승선
  g.fillStyle='#ffcf5a';for(const f of R.F)if(f.t==='box'){const y=sy(f.z);g.fillRect(w/2-10,y-1,20,2)}
  g.fillStyle=INK;g.fillRect(w/2-14,sy(L)-2,28,4);g.font='900 9px system-ui';g.textAlign='center';g.fillText('FINISH',w/2,sy(L)-6);
  return{c,sy,sx,w,h}}
function drawMiniMap(x0,y0,w,h){const R=RACE.R;if(!R)return;if(!RACE.mini||RACE.mini.w!==w||RACE.mini.h!==h||RACE.mini.id!==R.id){RACE.mini=buildMiniMap(w,h);RACE.mini.id=R.id}const M2=RACE.mini;
  ctx.save();ctx.translate(x0,y0);paperBegin(0,0,w,h,{rot:.01,seed:21,bw:3,sh:3});ctx.restore();ctx.save();ctx.translate(x0,y0);ctx.drawImage(M2.c,0,0,w,h);
  const me=RACE.racers.get(RACE.myId),list=[...RACE.racers.values()].sort((a,b)=>a===me?1:b===me?-1:0);
  for(const r of list){const z=clamp(r.z,0,R.len),off=r.x-pisteCX(z);drawFace(r,M2.sx(z,off),M2.sy(z),r===me?9:7,r===me)}
  ctx.restore()}
// ---- 후방 경고: 나를 노리는 유령보드·구름, 뒤에서 오는 눈덩이, 바짝 붙은 상대 ----
function drawRearWarn(){const s=game;if(RACE.phase!=='run'||s.finished)return;const items=[];
  for(const p of RACE.projs)if(p.tg===RACE.myId&&p.z<s.z+2)items.push({e:p.k==='cloud'?'🌨️':'👻',d:Math.max(0,s.z-p.z),danger:p.k==='cloud'||s.z-p.z<45});
  for(const r of RACE.racers.values()){if(r.id===RACE.myId)continue;const d=s.z-r.z;if(d<0||d>140)continue;if(r.ball||r.ballT>0)items.push({e:'☃️',d,danger:Math.abs(r.x-s.x)<6});else if(d<18)items.push({e:'',d,r})}
  if(!items.length)return;const k=HUD.k,wB=Math.min(300*k,W*.5),x0=W/2-wB/2,y0=H-HUD.b-30*k,t=s.time,danger=items.some(i=>i.danger);
  if(danger&&!RACE._warnS){RACE._warnS=1;raceSfx('warn')}else if(!danger)RACE._warnS=0;
  ctx.save();ctx.globalAlpha=.88;ctx.fillStyle=danger&&Math.sin(t*14)>0?'rgba(224,86,106,.85)':'rgba(20,40,56,.55)';ctx.beginPath();ctx.roundRect?ctx.roundRect(x0,y0,wB,22*k,11*k):ctx.rect(x0,y0,wB,22*k);ctx.fill();
  ctx.font='800 '+Math.round(10*k)+'px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText('뒤',x0+8*k,y0+15*k);ctx.textAlign='right';ctx.fillText('140m',x0+wB-8*k,y0+15*k);
  for(const it of items){const u=clamp(it.d/140,0,1),x=x0+28*k+(wB-70*k)*u,y=y0+11*k;if(it.r)drawFace(it.r,x,y,8*k,false);else{ctx.globalAlpha=1;ctx.font=Math.round((it.danger?20:16)*k)+'px system-ui';ctx.textAlign='center';ctx.fillText(it.e,x,y+7*k)}}
  ctx.restore();ctx.textAlign='left'}
// ---- 갈라진 길에서는 시점이 그 길 방향으로 돌아감 ----
function raceCamYaw(){const s=game,rr=raceRoads(s.z);if(rr.length<2||s.fallT>0)return s.heading*.32;const c=pisteCX(s.z);let ri=0,bd=1e9;rr.forEach((r,i)=>{const d=Math.abs(s.x-c-r.o);if(d<bd){bd=d;ri=i}});
  const ry=Math.atan((roadOff(ri,s.z+14)-roadOff(ri,s.z-4))/18);return ry+(s.heading-ry)*.32}
// 협곡 위에서는 카메라·그림자 기준을 원래 지면 높이로 (빈 곳 바닥으로 카메라가 빠지지 않게)
function raceCamGround(z,x){return raceDrop(z,x)?baseY(z):groundY(z,x)}
