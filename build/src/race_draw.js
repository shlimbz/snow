// =====================================================================
//  멀티 레이스 · 그리기 (표면 · 상자 · 상대 · 아이템 · HUD)
// =====================================================================
// 길 그리기: 갈림길이면 길마다 따로 (drawSeg 에서 정설 사면 대신 호출)
function raceDrawRoads(a,b,fog,tone,alt,jd){const A=raceRoads(a.z),B=raceRoads(b.z),groomed=true;
  // 빈 곳(협곡·낭떠러지)을 먼저 어둡게 → 그 위에 길
  raceVoidSeg(a,b,fog,A,B,'cliff');
  for(let q=0;q<A.length;q++){const ra=A[q],rb=B[Math.min(q,B.length-1)],l0=a.x+(ra.o-ra.w)*a.s,r0=a.x+(ra.o+ra.w)*a.s,l1=b.x+(rb.o-rb.w)*b.s,r1=b.x+(rb.o+rb.w)*b.s;
    ctx.beginPath();ctx.moveTo(l0,a.sy+.5);ctx.lineTo(r0,a.sy+.5);ctx.lineTo(r1,b.sy);ctx.lineTo(l1,b.sy);ctx.closePath();ctx.fillStyle=tone(alt?C_PISTE:C_PISTE2);ctx.fill();
    if(jd<60){ctx.strokeStyle='rgba(146,184,218,'+(.2*(1-fog))+')';ctx.lineWidth=Math.max(.6,a.s*.06);ctx.beginPath();for(let f=-.85;f<=.86;f+=.17){ctx.moveTo(a.x+(ra.o+f*ra.w)*a.s,a.sy);ctx.lineTo(b.x+(rb.o+f*rb.w)*b.s,b.sy)}ctx.stroke()}}
  raceVoidSeg(a,b,fog,A,B,'gap');raceSurfSeg(a,b,fog);
  if(fog<.9){ctx.strokeStyle='rgba(132,168,204,'+(.32*(1-fog))+')';ctx.lineWidth=Math.max(1,a.s*.12);ctx.beginPath();
    for(let q=0;q<A.length;q++){const ra=A[q],rb=B[Math.min(q,B.length-1)];ctx.moveTo(a.x+(ra.o-ra.w)*a.s,a.sy);ctx.lineTo(b.x+(rb.o-rb.w)*b.s,b.sy);ctx.moveTo(a.x+(ra.o+ra.w)*a.s,a.sy);ctx.lineTo(b.x+(rb.o+rb.w)*b.s,b.sy)}ctx.stroke()}}
const C_VOID=[44,66,92],C_VOID2=[30,48,70];
function raceVoidSeg(a,b,fog,A,B,only){const R=RACE.R,L=R.segSurf.get(a.i);if(!L)return;const za=a.z,zb=b.z;
  const quad=(x0a,x1a,x0b,x1b,col)=>{ctx.beginPath();ctx.moveTo(a.x+x0a*a.s,a.sy+.5);ctx.lineTo(a.x+x1a*a.s,a.sy+.5);ctx.lineTo(b.x+x1b*b.s,b.sy);ctx.lineTo(b.x+x0b*b.s,b.sy);ctx.closePath();ctx.fillStyle=col;ctx.fill()};
  const col=mixC(C_VOID,C_FOG,fog*.8);
  for(const o of L){if(zb<o.z0||za>o.z1||o.k!==only)continue;
    if(o.k==='gap'){const G=o.G,oa=roadOff(G.road,za),ob=roadOff(G.road,zb);quad(oa+G.a,oa+G.b,ob+G.a,ob+G.b,col);
      if(za<=G.z0+SEG){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=Math.max(1.5,a.s*.2);ctx.beginPath();ctx.moveTo(a.x+(oa+Math.max(G.a,-60))*a.s,a.sy);ctx.lineTo(a.x+(oa+Math.min(G.b,60))*a.s,a.sy);ctx.stroke()}}
    else if(o.k==='cliff'){const Cf=o.Cf,lA=Math.min(...A.map(r=>r.o-r.w)),rA=Math.max(...A.map(r=>r.o+r.w)),lB=Math.min(...B.map(r=>r.o-r.w)),rB=Math.max(...B.map(r=>r.o+r.w));
      if(Cf.side<=0)quad(lA-160,lA-.2,lB-160,lB-.2,col);if(Cf.side>=0)quad(rA+.2,rA+160,rB+.2,rB+160,col)}}}
// 세그먼트 위 표면: 빙판 · 숨은 통로 · 가속 패드 · 출발선 · 결승선
function raceSurfSeg(a,b,fog){const R=RACE.R,L=R.segSurf.get(a.i);if(!L)return;const za=a.z,zb=b.z,hwa=raceHW(za),hwb=raceHW(zb);
  const quad=(oa0,oa1,ob0,ob1,col)=>{ctx.beginPath();ctx.moveTo(a.x+oa0*a.s,a.sy+.5);ctx.lineTo(a.x+oa1*a.s,a.sy+.5);ctx.lineTo(b.x+ob1*b.s,b.sy);ctx.lineTo(b.x+ob0*b.s,b.sy);ctx.closePath();ctx.fillStyle=col;ctx.fill()};
  const dA=pisteCX(za)-a.c,dB=pisteCX(zb)-b.c;   // a.c = 이 세그먼트 중심선 (보통 0)
  for(const o of L){if(zb<o.z0||za>o.z1)continue;
    if(o.k==='start'||o.k==='fin'){const t0=clamp((o.z0-za)/(zb-za),0,1),t1=clamp((o.z1-za)/(zb-za),0,1),P=t=>({x:lerp(a.x,b.x,t),sy:lerp(a.sy,b.sy,t),s:lerp(a.s,b.s,t)}),A=P(t0),B=P(t1),hw=Math.min(hwa,hwb);if(A.sy-B.sy<.5)continue;
      const q2=(x0,x1,col)=>{ctx.beginPath();ctx.moveTo(A.x+x0*A.s,A.sy);ctx.lineTo(A.x+x1*A.s,A.sy);ctx.lineTo(B.x+x1*B.s,B.sy);ctx.lineTo(B.x+x0*B.s,B.sy);ctx.closePath();ctx.fillStyle=col;ctx.fill()};
      ctx.globalAlpha=1-fog*.5;if(o.k==='start')q2(-hw,hw,'#e0566a');else{const n=16;for(let q=0;q<n;q++){const x0=-hw+q*2*hw/n;q2(x0,x0+2*hw/n,q%2?'#22313b':'#ffffff')}}ctx.globalAlpha=1;continue}
    if(o.k==='ice'){const ra=raceRoads(za),rb=raceRoads(zb),qa=o.road!=null?ra[Math.min(o.road,ra.length-1)]:{o:0,w:hwa},qb=o.road!=null?rb[Math.min(o.road,rb.length-1)]:{o:0,w:hwb};
      const A0=qa.o+Math.max(o.a,-qa.w),A1=qa.o+Math.min(o.b,qa.w),B0=qb.o+Math.max(o.a,-qb.w),B1=qb.o+Math.min(o.b,qb.w);if(A1<=A0)continue;
      ctx.globalAlpha=(1-fog)*.75;quad(A0+dA,A1+dA,B0+dB,B1+dB,(a.i%4<2)?'#bfe4fb':'#cdeafc');
      if(fog<.6&&a.i%5===0){ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=Math.max(1,a.s*.09);ctx.beginPath();const u=hash(a.i,7);ctx.moveTo(a.x+lerp(A0,A1,u)*a.s,a.sy);ctx.lineTo(b.x+lerp(B0,B1,u+.06)*b.s,b.sy);ctx.stroke()}ctx.globalAlpha=1}
    else if(o.k==='cor'){const H=o.H,sd=H.side,ent=hidOpen(H,za),ia=ent?hwa-.5:hwa+H.in,ib=ent?hwb-.5:hwb+H.in,oa=hwa+H.in+H.w,ob=hwb+H.in+H.w;
      const ord=(p,q)=>sd>0?[p,q]:[-q,-p],[A0,A1]=ord(ia,oa),[B0,B1]=ord(ib,ob);ctx.globalAlpha=1-fog*.6;quad(A0,A1,B0,B1,mixC(H.ice?[198,228,250]:[247,250,252],C_FOG,fog));
      if(fog<.8){ctx.strokeStyle='rgba(132,168,204,'+(.3*(1-fog))+')';ctx.lineWidth=Math.max(1,a.s*.1);ctx.beginPath();ctx.moveTo(a.x+A0*a.s,a.sy);ctx.lineTo(b.x+B0*b.s,b.sy);ctx.moveTo(a.x+A1*a.s,a.sy);ctx.lineTo(b.x+B1*b.s,b.sy);ctx.stroke()}ctx.globalAlpha=1}
    else if(o.k==='pad'){const p=o.p,u0=clamp((za-p.z)/7,0,1),u1=clamp((zb-p.z)/7,0,1);if(u1<=u0)continue;const x0=p.x0,w=1.7;
      ctx.globalAlpha=1-fog*.7;quad(x0-w,x0+w,x0-w,x0+w,Math.floor(((za-p.z)/1.75))%2?'#ffd23f':'#ff8a3c');
      if(fog<.5&&a.s>1.5){ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.2,a.s*.12);ctx.beginPath();ctx.moveTo(a.x+(x0-w*.7)*a.s,a.sy);ctx.lineTo((a.x+b.x)/2+x0*(a.s+b.s)/2,b.sy);ctx.lineTo(a.x+(x0+w*.7)*a.s,a.sy);ctx.stroke()}ctx.globalAlpha=1}
}}
// 월드 스프라이트 등록 (drawWorld 버킷)
function raceBuckets(put,jOf){const s=game,R=RACE.R,zMax=cam.z+VIEW_DIST-4;
  for(const b of s.boxes)if(b.z>cam.z+1&&b.z<zMax)for(let k=0;k<b.xs.length;k++)if(!b.got[k])put(jOf(b.z),{race:1,kind:'box',x:b.xs[k],z:b.z,k});
  for(const sg of R.signs)if(sg.z>cam.z+1&&sg.z<zMax)put(jOf(sg.z),{race:1,kind:'sign',o:sg,z:sg.z});
  for(const r of RACE.racers.values())if(r.id!==RACE.myId&&r.g&&r.g.z>cam.z+.8&&r.g.z<zMax)put(jOf(r.g.z),{race:1,kind:'riv',r,z:r.g.z});
  for(const p of RACE.projs)if(p.z>cam.z+.8&&p.z<zMax)put(jOf(p.z),{race:1,kind:'proj',p,z:p.z});
  for(const P of RACE.puddles)if(P.z>cam.z+.5&&P.z<zMax)put(jOf(P.z),{race:1,kind:'pud',P,z:P.z+1.5});
  if(R.len>cam.z+6&&R.len<zMax)put(jOf(R.len),{kind:'arch',a:{z:R.len,text:'FINISH',col:'#fff',finish:true},z:R.len});
  // 길 가장자리 깃대 (가까운 곳) · 밤이면 랜턴
  const z0=Math.ceil((cam.z+2)/18)*18,lamp=ENV.lamp>.03;for(let z=z0;z<cam.z+(lamp?VIEW_DIST-10:240);z+=18){const c=pisteCX(z),j=jOf(z),far=z>cam.z+240,cl=R.cliffs.some(Cf=>z>=Cf.z0&&z<=Cf.z1);
    for(const r of raceRoads(z))for(const sd of [-1,1]){const x=c+r.o+sd*(r.w+(cl?.6:1.2));if(raceDrop(z,x)&&!cl)continue;if(!far)put(j,{kind:'pole',x,z});if(lamp&&Math.round(z/18)%2===0)put(j,{kind:'lamp',x:x+sd*1.8,z,side:sd,col:LAMP_COL[Math.round(z/36)%3],j})}}}
function raceDrawSprite(sp){const nf=clamp((sp.z-cam.z-1.5)/(CFG.camBack-1.5),0,1),fogA=(1-clamp((sp.z-cam.z-120)/(460/ENV.fogK),0,.78))*(1-smooth(.85,1,(sp.z-cam.z)/VIEW_DIST));
  if(sp.kind==='riv'){drawRival(sp.r);return}
  const a=fogA*(sp.kind==='pud'?1:Math.max(nf,.001));if(a<=.01)return;ctx.globalAlpha=a;
  if(sp.kind==='box')drawItemBox(sp.x,sp.z,sp.k);else if(sp.kind==='sign')drawSign(sp.o);else if(sp.kind==='proj'){if(sp.p.k==='cloud')drawCloudProj(sp.p);else drawGhostBoard(sp.p)}else if(sp.kind==='pud')drawPuddle(sp.P);
  ctx.globalAlpha=1}
// 아이템 상자: 둥실 떠서 도는 선물 상자 (반투명 + 무지개 테두리 + ?)
function drawItemBox(x,z,k){const p=proj(x,baseY(z)+1.3,z),g=proj(x,baseY(z),z);if(!p||p.s<.6)return;const t=game.time,S=1.15*p.s,bob=Math.sin(t*3+k)*.12*p.s,cy=p.y+bob,rot=t*1.6+k;
  if(S>6){ctx.fillStyle='rgba(40,72,92,.22)';ctx.beginPath();ctx.ellipse(g.x,g.y,S*.55,S*.14,0,0,Math.PI*2);ctx.fill()}
  ctx.save();ctx.translate(p.x,cy);ctx.rotate(Math.sin(rot)*.35);const hue=(t*90+k*60)%360;
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.strokeStyle='hsl('+hue+',85%,62%)';ctx.lineWidth=Math.max(1.5,S*.09);const r=S*.5;
  ctx.beginPath();ctx.roundRect?ctx.roundRect(-r,-r,2*r,2*r,r*.28):ctx.rect(-r,-r,2*r,2*r);ctx.fill();ctx.stroke();
  if(S>9){ctx.fillStyle='hsl('+((hue+180)%360)+',70%,60%)';ctx.fillRect(-r*.14,-r,r*.28,2*r);ctx.fillRect(-r,-r*.14,2*r,r*.28);
    ctx.font='900 '+Math.round(S*.62)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=Math.max(2,S*.08);ctx.strokeStyle=INK;ctx.strokeText('?',0,S*.03);ctx.fillStyle='#fff';ctx.fillText('?',0,S*.03);ctx.textBaseline='alphabetic'}
  ctx.restore()}
function drawSign(o){const z=o.z,x=pisteCX(z)+o.at,p=proj(x,baseY(z),z),q=proj(x,baseY(z)+3.4,z);if(!p||!q||p.s<.7)return;
  ctx.strokeStyle='#6b4a32';ctx.lineWidth=Math.max(1.5,.22*p.s);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y+.4*p.s);ctx.stroke();
  const fs=Math.max(6,.62*p.s);ctx.font='900 '+fs+'px system-ui';const w=ctx.measureText(o.text).width+fs*1.1,h=fs*1.6;
  ctx.fillStyle='#fbf7ee';ctx.strokeStyle=INK;ctx.lineWidth=Math.max(1,fs*.1);ctx.beginPath();ctx.rect(q.x-w/2,q.y-h/2,w,h);ctx.fill();ctx.stroke();
  if(fs>7){ctx.fillStyle=INK;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.text,q.x,q.y+fs*.05);ctx.textBaseline='alphabetic';ctx.textAlign='left'}}
// 유령보드: 반투명하게 빛나는 보드가 잔상을 남기며 날아감
function drawGhostBoard(pj){const y0=baseY(pj.z)+1+Math.sin(pj.t*8)*.15,p=proj(pj.x,y0,pj.z);if(!p||p.s<.4)return;const S=p.s;
  for(let i=3;i>=1;i--){const q=proj(pj.x,y0,pj.z-i*1.6);if(!q||q.s>S*2.5)continue;ctx.globalAlpha*=.9;ctx.fillStyle='rgba(220,205,255,'+(.18*(4-i)/3)+')';ctx.beginPath();ctx.ellipse(q.x,q.y,.9*q.s,.28*q.s,0,0,Math.PI*2);ctx.fill()}
  const a=ctx.globalAlpha;ctx.globalAlpha=a*.85;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(pj.t*6)*.15);
  const gr=ctx.createRadialGradient(0,0,S*.1,0,0,S*1.3);gr.addColorStop(0,'rgba(240,232,255,.9)');gr.addColorStop(1,'rgba(200,180,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,S*1.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(248,244,255,.95)';ctx.strokeStyle='rgba(126,98,200,.9)';ctx.lineWidth=Math.max(1,S*.06);ctx.beginPath();ctx.ellipse(0,0,S*.95,S*.26,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();ctx.globalAlpha=a;
  GLOWS.push({x:p.x,y:p.y,r:S*1.6,a:.35,g:1,o:-1})}
// 폭설 구름: 둥실둥실 회색 구름 + 아래로 눈발
function drawSnowCloud(x,y,S,t,a){if(S<2)return;ctx.save();ctx.globalAlpha*=a==null?1:a;ctx.fillStyle='rgba(120,136,160,.92)';const P=[[-.7,.05,.42],[-.25,-.18,.55],[.3,-.1,.5],[.72,.08,.38],[0,.12,.5]];
  ctx.beginPath();for(const [dx,dy,r] of P){ctx.moveTo(x+dx*S+r*S,y+dy*S);ctx.arc(x+dx*S,y+dy*S,r*S,0,Math.PI*2)}ctx.fill();
  ctx.fillStyle='rgba(200,212,230,.9)';ctx.beginPath();for(const [dx,dy,r] of P){ctx.moveTo(x+dx*S+r*.55*S,y+(dy-.12)*S);ctx.arc(x+dx*S,y+(dy-.12)*S,r*.55*S,0,Math.PI*2)}ctx.fill();
  ctx.fillStyle='#fff';for(let i=0;i<10;i++){const u=((i*.37+t*1.6)%1),fx=x+((i*53)%100/100-.5)*1.5*S,fy=y+S*.4+u*S*1.6;ctx.globalAlpha*=1;ctx.beginPath();ctx.arc(fx+Math.sin(t*5+i)*S*.05,fy,Math.max(1,S*.05),0,Math.PI*2);ctx.fill()}
  ctx.restore()}
function drawCloudProj(p){const q=proj(p.x,baseY(p.z)+p.y,p.z);if(!q||q.s<.3)return;drawSnowCloud(q.x,q.y,q.s*1.8,p.t)}
function drawPuddle(P){const y=baseY(P.z),pts=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2,q=proj(P.x+Math.cos(a)*RTUNE.puddleR*1.05,y+.03,P.z+Math.sin(a)*1.8);if(!q)return;pts.push(q)}
  ctx.fillStyle='rgba(150,210,248,.82)';ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=Math.max(1,pts[0].s*.08);ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fill();ctx.stroke();
  const c=proj(P.x-.4,y+.03,P.z+.3);if(c&&c.s>3){ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(c.x,c.y,c.s*.45,c.s*.08,-.1,0,Math.PI*2);ctx.fill()}}
// 거대 눈덩이 (나 또는 상대) — 선수를 감싸고 굴러감
function drawSnowball(x,py,z,t,col){const R0=1.7,c=proj(x,py+R0,z),g=proj(x,baseY(z),z);if(!c||!g)return null;const r=R0*c.s;
  ctx.fillStyle='rgba(40,72,92,.25)';ctx.beginPath();ctx.ellipse(g.x,g.y,r*.95,r*.22,0,0,Math.PI*2);ctx.fill();
  const gr=ctx.createRadialGradient(c.x-r*.35,c.y-r*.4,r*.1,c.x,c.y,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.7,'#eef6fd');gr.addColorStop(1,'#bcd6ee');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(140,176,210,.7)';ctx.lineWidth=Math.max(1,r*.05);for(let k=0;k<3;k++){const a=t*7+k*2.1;ctx.beginPath();ctx.ellipse(c.x,c.y,r*.92,Math.abs(Math.cos(a))*r*.9+r*.05,0,0,Math.PI*2);ctx.stroke()}
  ctx.strokeStyle=col||INK;ctx.lineWidth=Math.max(2,r*.07);ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.stroke();return{x:c.x,y:c.y-r,s:c.s}}
function drawShieldRing(x,y,s,t){const r=1.55*s;ctx.save();ctx.strokeStyle='rgba(190,230,255,.9)';ctx.lineWidth=Math.max(1.5,r*.07);ctx.setLineDash([r*.22,r*.12]);ctx.lineDashOffset=-t*40;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.fillStyle='rgba(200,236,255,.12)';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
// 상대 선수: 엔진의 리그 그리기를 그 사람 상태·캐릭터·장비로 잠깐 바꿔 그대로 사용
function drawRival(r){const g=r.g;if(!g)return;const t=g.time;
  if(r.ball){const top=drawSnowball(g.x,baseY(g.z),g.z,t,r.col);if(top)nameTag(r,top.x,top.y-6,top.s);return}
  {const p=proj(g.x,g.py,g.z),gp=proj(g.x,groundY(g.z,g.x),g.z);if(!p||!gp)return;const hp=CFG.riderH*p.s*CFG.rigScale;
    if(hp<54){const CI=CHAR_IMG[r.char]||CHAR_IMG.usagi,img=CI.rear;   // 멀리 있는 상대는 간단히: 보드 + 캐릭터 그림 한 장 (장식 생략)
      ctx.fillStyle='rgba(46,91,111,.22)';ctx.beginPath();ctx.ellipse(gp.x,gp.y,hp*.55,hp*.12,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=r.col;ctx.beginPath();ctx.ellipse(p.x,p.y,hp*.5,hp*.1,0,0,Math.PI*2);ctx.fill();
      if(img&&img.width){const w=hp*img.width/img.height*.82;ctx.drawImage(img,p.x-w/2,p.y-hp*.95,w,hp*.9)}
      g.scr={x:gp.x,y:gp.y,s:p.s*CFG.rigScale};nameTag(r,p.x,p.y-hp-4,p.s);if(r.shield)drawShieldRing(p.x,p.y-hp*.45,p.s,t);return}}
  const sv=game,sCH=CH;g.kickers=RACE.R.kickList;g.rails=RACE.R.railList;game=g;CH=CHARS[r.char]||CHARS.usagi;EQ_OVR=r.eq||{};
  try{drawSnowboardRig()}catch(e){if(!drawRival._e){drawRival._e=1;console.warn('rival draw',e)}}finally{game=sv;CH=sCH;EQ_OVR=null}
  const sc=g.scr;if(!sc)return;const hy=sc.y-CFG.riderH*sc.s*1.08;
  if(r.shield)drawShieldRing(sc.x,sc.y-CFG.riderH*sc.s*.5,sc.s/CFG.rigScale,t);
  if(r.rev){const k=sc.s/CFG.rigScale;ctx.font='900 '+clamp(k*.9,10,34)+'px system-ui';ctx.textAlign='center';ctx.fillText('❓',sc.x,hy-8);ctx.textAlign='left'}
  if(r.cloud||r.cloudT>0){const k=sc.s/CFG.rigScale;drawSnowCloud(sc.x,hy-k*.9,k*1.3,g.time)}
  nameTag(r,sc.x,hy,sc.s/CFG.rigScale)}
function nameTag(r,x,y,s){if(s<1.2)return;const fs=clamp(s*.42,9,15),txt=(RACE.order.indexOf(r)+1)+' '+r.name;ctx.font='900 '+fs+'px system-ui';const w=ctx.measureText(txt).width+fs;
  ctx.globalAlpha=clamp((s-1.2)/1.5,0,1)*.92;ctx.fillStyle=r.col;ctx.beginPath();ctx.roundRect?ctx.roundRect(x-w/2,y-fs*1.35,w,fs*1.5,fs*.75):ctx.rect(x-w/2,y-fs*1.35,w,fs*1.5);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(txt,x,y-fs*.2);ctx.textAlign='left';ctx.globalAlpha=1}
function raceDrawMe(){const s=game;
  if(s.ball>0){const top=drawSnowball(s.x,baseY(s.z),s.z,s.time,'#ff7a2f');const p=proj(s.x,baseY(s.z),s.z);if(p)s.scr={x:p.x,y:p.y,s:p.s*CFG.rigScale};
    if(Math.random()<.8&&top)for(let i=0;i<2;i++)emitSpray(top.x+rand(-60,60)*top.s*.02,top.y+top.s*3.2,rand(-160,160),-rand(40,160),rand(.3,.6),rand(3,7),true);return}
  drawSnowboardRig();drawBoostFlame();const sc=s.scr;if(!sc)return;const k=sc.s/CFG.rigScale,cy=sc.y-CFG.riderH*sc.s*.5;
  if(s.cloudT>0)drawSnowCloud(sc.x,sc.y-CFG.riderH*sc.s*1.25,k*1.5,s.time);
  if(s.shieldT>0)drawShieldRing(sc.x,cy,k,s.time);
  if(s.revT>0){ctx.font='900 '+Math.round(clamp(k*1.1,16,46))+'px system-ui';ctx.textAlign='center';ctx.globalAlpha=.6+.4*Math.sin(s.time*10);ctx.fillText('❓',sc.x+Math.sin(s.time*6)*k*.4,sc.y-CFG.riderH*sc.s*1.15);ctx.globalAlpha=1;ctx.textAlign='left'}
  if(s.slipK>.2){ctx.save();ctx.globalAlpha=s.slipK*.6;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.lineCap='round';for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2+s.time*3,rx=k*1.4,ry=k*1.1,x=sc.x+Math.cos(a)*rx,y=cy+Math.sin(a)*ry*.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+k*.8);ctx.stroke()}ctx.restore()}}
// 레이스 환경: 코스별 시간대 + 돌풍 구간 눈보라 연출
function raceEnv(){const R=RACE.R,key=R?R.C.env:'day',s=game,k=(s&&s.windK)||0;
  if(_envKey!=='race:'+key||k>0||RACE._envK>0){if(_envKey!=='race:'+key){RACE.envBase=JSON.parse(JSON.stringify(ENVS[key]||ENVS.day));_envKey='race:'+key}
    const B=RACE.envBase;for(const q in B){const v=B[q];if(Array.isArray(v)){if(!ENV[q])ENV[q]=[0,0,0];for(let i=0;i<v.length;i++)ENV[q][i]=v[i]}else ENV[q]=v}
    if(k>0){const f=ENV.fog,kk=k*.8;for(const q of ['top','mid','hor','cloud','valley'])if(ENV[q])for(let i=0;i<3;i++)ENV[q][i]=Math.round(lerp(ENV[q][i],f[i],.6*kk));ENV.fogK*=1+1.3*kk;ENV.snow=lerp(ENV.snow,1,kk);ENV.wind=lerp(ENV.wind,1,kk);ENV.white=.5*kk}
    for(let i=0;i<3;i++)C_FOG[i]=Math.round(ENV.fog[i]/4)*4;RACE._envK=k}}

// ---------------- HUD ----------------
const fmtR=t=>t==null?'—':Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
function raceUI(){const s=game,k=HUD.k,R=RACE.R;if(!R)return;ctx.save();ctx.textBaseline='alphabetic';
  const me=RACE.racers.get(RACE.myId),pl=Math.max(1,RACE.order.indexOf(me)+1),n=RACE.racers.size;
  // 왼쪽 위: 내 순위 + 순위표
  ctx.save();ctx.translate(HUD.l,HUD.t);ctx.scale(k,k);{const w=150,h=50+n*19;paperBegin(0,0,w,h,{rot:-.02,seed:3});
    ctx.textAlign='left';ctx.fillStyle=pl===1?'#e0a020':INK;ctx.font='italic 900 34px system-ui';ctx.fillText(pl,12,38);const pw=ctx.measureText(String(pl)).width;ctx.font='900 14px system-ui';ctx.fillStyle=INK2;ctx.fillText('위 / '+n,16+pw,37);
    RACE.order.forEach((r,i)=>{const y=58+i*19,mine=r.id===RACE.myId;ctx.fillStyle=r.col;ctx.fillRect(10,y-11,5,14);ctx.font=(mine?'900 ':'700 ')+'12.5px system-ui';ctx.fillStyle=mine?INK:INK2;ctx.fillText((i+1)+'. '+r.name.slice(0,7),20,y);
      ctx.textAlign='right';ctx.font='700 11px system-ui';const gap=r.fin?'🏁 '+fmtR(r.finT):i===0?'':'-'+Math.max(0,Math.round(RACE.order[0].z-r.z))+'m';ctx.fillText(gap,w-10,y);ctx.textAlign='left'});ctx.restore()}ctx.restore();
  // 가운데 위: 진행 막대 + 모든 선수 점
  if(!HUD.portrait||true){const half=Math.min(W/2-(HUD.l+160*k),HUD.pr-180*k-W/2)/k,wC=clamp(half*2-16,140,360);ctx.save();ctx.translate(W/2,HUD.t);ctx.scale(k,k);
    paperBegin(-wC/2,0,wC,44,{rot:-.012,seed:11});ctx.textAlign='left';ctx.font='900 12px system-ui';ctx.fillStyle=R.C.col;ctx.fillText(wC<230?R.C.emoji:R.C.emoji+' '+R.C.name,12,17);
    ctx.textAlign='right';ctx.fillStyle=INK;ctx.font='900 14px system-ui';ctx.fillText(fmtR(s.finished?s.finishT:RACE.phase==='count'?0:RACE.t),wC-12,18);
    const bx=12,by=27,bw=wC-24,bh=8;ctx.fillStyle='#e8eef2';ctx.fillRect(bx,by,bw,bh);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);
    for(const r of [...RACE.racers.values()].sort((a,b)=>a.id===RACE.myId?1:b.id===RACE.myId?-1:0)){const u=clamp(r.z/R.len,0,1),X=bx+bw*u,mine=r.id===RACE.myId;drawFace(r,X,by+bh/2,mine?9:7,mine)}
    ctx.restore();ctx.restore()}
  // 오른쪽 위: 아이템 칸 + 속도
  ctx.save();ctx.translate(HUD.pr,HUD.t);ctx.scale(k,k);{const w=86,h=78;paperBegin(-w,0,w,h,{rot:.03,seed:5,fill:RACE.item?'#fff6e2':PAPER});
    let em='';if(RACE.roul>0){const L=RSH.ITEM_KEYS;em=RSH.ITEMS[L[Math.floor(s.time*14)%L.length]].e}else if(RACE.item)em=RSH.ITEMS[RACE.item].e;
    ctx.textAlign='center';if(em){ctx.font='44px system-ui';ctx.fillText(em,w/2,54)}else{ctx.font='800 11px system-ui';ctx.fillStyle=INK2;ctx.fillText('아이템',w/2,36);ctx.fillText('없음',w/2,52)}
    if(RACE.item&&!isTouchUI()){ctx.font='900 10.5px system-ui';ctx.fillStyle=INK2;ctx.fillText('E 키로 사용',w/2,72)}else if(RACE.item){ctx.font='900 10.5px system-ui';ctx.fillStyle=INK2;ctx.fillText(RSH.ITEMS[RACE.item].n,w/2,72,w-8)}ctx.restore();
    const kmh=Math.round(s.v*3.6),hot=s.capK>1.03;paperBegin(-98,h+10,98,26,{rot:-.035,seed:9,bw:3,sh:3,fill:hot?'#ffe2c6':PAPER});
    ctx.textAlign='right';ctx.fillStyle=hot?'#c4521c':INK;ctx.font='900 15px system-ui';ctx.fillText(kmh,58,18);ctx.textAlign='left';ctx.font='800 10px system-ui';ctx.fillStyle=INK2;ctx.fillText('km/h',62,18);ctx.restore()}ctx.restore();
  // 왼쪽: 세로 미니맵 (가로 화면·PC)
  if(!HUD.portrait){const top=HUD.t+(58+n*19+14)*k,mh=Math.min(250*k,H-HUD.b-top-120*k);if(mh>110*k)drawMiniMap(HUD.l+4*k,top,58*k,mh)}
  drawPopups();ctx.restore();
  drawRearWarn();drawBoostScreen();
  // 카운트다운
  if(RACE.phase==='count'||(RACE.phase==='run'&&RACE.t<.8)){const c=RACE.phase==='count'?Math.ceil(RACE.cd):0,txt=RACE.phase==='count'?(c>3?'준비':String(c)):'GO!',fr=RACE.phase==='count'?RACE.cd-Math.floor(RACE.cd):1-RACE.t/.8;
    ctx.textAlign='center';sticker(txt,W/2,H*.42,txt==='GO!'?'#7ddc6a':'#ffe066',(70+fr*30)*k,'italic 900');ctx.textAlign='left';
    if(RACE.phase==='count'&&RACE.cd<2.6){ctx.textAlign='center';sticker(isTouchUI()?'GO 직전에 점프 버튼 → 스타트 부스트':'GO 직전에 스페이스 → 스타트 부스트',W/2,H*.42+50*k,'#ffffff',15*k,'900');ctx.textAlign='left'}}
  if(s.finished&&RACE.phase!=='result'){const pl2=RACE.order.indexOf(me)+1;ctx.textAlign='center';sticker('FINISH! '+pl2+'위',W/2,H*.3,'#ffe066',48*k,'italic 900');
    const left=RACE.online?RACE.endLeft:RACE.endT;if(left>0&&left<RSH.FINISH_WAIT+.5)sticker('다른 선수 기다리는 중 · '+Math.ceil(left)+'초',W/2,H*.3+36*k,'#ffffff',15*k,'900');ctx.textAlign='left'}
  else if(RACE.phase==='run'&&!s.finished){const left=RACE.online?RACE.endLeft:RACE.endT;if(left>0){ctx.textAlign='center';sticker('남은 시간 '+Math.ceil(left)+'초',W/2,HUD.t+70*k,'#ff9a8a',22*k,'italic 900');ctx.textAlign='left'}}
  if(s.flash>0){ctx.fillStyle='rgba(255,255,255,'+(.24*s.flash)+')';ctx.fillRect(0,0,W,H)}
  if(paused){ctx.fillStyle='rgba(9,24,34,.3)';ctx.fillRect(0,0,W,H)}
  syncItemBtn()}
const isTouchUI=()=>document.body.classList.contains('touch')||matchMedia('(pointer:coarse)').matches;
