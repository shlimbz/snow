#!/usr/bin/env python3
"""index.html(최종본) + 레이스 모듈 → multi.html 과 server/ 를 만든다.
index.html 이 바뀌면 이 스크립트만 다시 돌리면 됨 (패치 지점이 사라지면 어디인지 알려 줌)."""
import sys, pathlib, re
ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
# 배포 묶음(usagi-multi/build/build.py)에서 돌리면 한 단계 위 폴더의 index.html → multi.html, server/shared.js 로 씀
PACK = ROOT.name == 'build'
DEF_IN = (ROOT.parent / 'index.html') if PACK else (ROOT.parent / 'dist20' / 'index.html')
base = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else DEF_IN).read_text(encoding='utf-8')
h = base

def patch(old, new, count=1):
    global h
    n = h.count(old)
    if n != count:
        raise SystemExit(f'패치 지점을 찾지 못함 ({n}회): {old[:90]!r}')
    h = h.replace(old, new)

# ---------- 엔진 연결 지점 ----------
patch("v=M.free?freeTrees(i):treesAtRaw(i)", "v=M.race?raceTrees(i):M.free?freeTrees(i):treesAtRaw(i)")
patch("tutorial:{halfW:34,kickers:false,rank:false,recover:true}};",
      "tutorial:{halfW:34,kickers:false,rank:false,recover:true},\n  race:{halfW:24,kickers:true,rank:false,recover:true,race:true,slope:27,pitch:9.8,startSpeed:.01,maxSpeed:46,hardLanding:15.5,pcx:[26,9],dragTuck:.0011,fovBoost:.12,arcadeTurnV:20}};")
patch("if(M.free)freeReset();\n", "if(M.free)freeReset();if(M.race)raceReset();\n")
patch("if(M.course)courseSpawn();else if(M.free)freeSpawn();", "if(M.course)courseSpawn();else if(M.free)freeSpawn();")
patch("let steer=input.joyOn?input.joy:(input.right?1:0)-(input.left?1:0);",
      "let steer=input.joyOn?input.joy:(input.right?1:0)-(input.left?1:0);if(M.race)steer=raceSteer(steer);")
patch("s.powder=Math.abs(s.x-pisteCX(s.z))>CFG.halfW;",
      "s.powder=M.race?raceSurfAt(s.z,s.x)===2:Math.abs(s.x-pisteCX(s.z))>CFG.halfW;")
patch("aFric=s.air?0:(s.powder?CFG.muPowder:CFG.mu)*g*Math.cos(ang);",
      "aFric=s.air?0:(s.powder?CFG.muPowder:CFG.mu)*g*Math.cos(ang)*(M.race&&s.ice?.22:1);")
patch("grip=lerp(CFG.grip,CFG.slashGrip,s.slash)*arc*(s.powder?.8:1)",
      "grip=lerp(CFG.grip,CFG.slashGrip,s.slash)*arc*(s.powder?.8:1)*(M.race&&s.ice?.62:1)")
patch("const aPush=(!s.air&&M.course&&!s.finished)?", "const aPush=(!s.air&&(M.course||M.race)&&!s.finished)?")
patch("s.v=clamp(s.v+net*h,0,CFG.maxSpeed*(1+.12*(s.dashK||0)));",
      "if(M.race)net+=raceAccel(h);s.v=clamp(s.v+net*h,0,CFG.maxSpeed*(1+.12*(s.dashK||0))*(M.race?raceCap():1));")
patch("if(M.free){const tw=", "if(M.free||M.race){const tw=")
patch("if(M.free){if(freePhysics(prevZ,hAbove,h))return}else if(game.rails&&game.rails.length)grindStep(prevZ,hAbove,h);",
      "if(M.race){if(racePhysics(prevZ,hAbove,h))return}else if(M.free){if(freePhysics(prevZ,hAbove,h))return}else if(game.rails&&game.rails.length)grindStep(prevZ,hAbove,h);")
patch("if(seg!==s.lastTreeSeg){s.lastTreeSeg=seg;if(hAbove<3)", "if(seg!==s.lastTreeSeg){s.lastTreeSeg=seg;if(hAbove<3&&!(M.race&&s.ball>0))")
patch("if(M.course)courseTick(dt);", "if(M.course)courseTick(dt);if(M.race)raceTick(dt);")
patch("  spawnAhead();\n  const n=Math.max(1,", "  if(M.race&&raceHold(dt))return;spawnAhead();\n  const n=Math.max(1,")
patch("if(MODE==='tutorial'){s.phase=phaseOf(s);tutUpdate(dt)}s.ev.length=0;", "if(MODE==='tutorial'){s.phase=phaseOf(s);tutUpdate(dt)}if(M.race)raceEvents();s.ev.length=0;")
patch("if(s.hitTime>=CH.crashT)", "if(s.hitTime>=CH.crashT*(M.race?.75:1))")
patch("if(Math.abs(s.x-pisteCX(s.z))>CFG.halfW-3)s.x=pisteCX(s.z)+Math.sign(s.x-pisteCX(s.z))*(CFG.halfW-6);",
      "if(M.race)raceRecoverX();else if(Math.abs(s.x-pisteCX(s.z))>CFG.halfW-3)s.x=pisteCX(s.z)+Math.sign(s.x-pisteCX(s.z))*(CFG.halfW-6);")
patch("if(!M.free){const ek=", "if(M.race){raceEnv();return}if(!M.free){const ek=")
patch("lamps=M.free&&ENV.lamp>.03", "lamps=(M.free||M.race)&&ENV.lamp>.03")
patch("put(j,{kind:'lamp',x:c-CFG.halfW-3,z,side:-1,col,j});put(j,{kind:'lamp',x:c+CFG.halfW+3,z,side:1,col,j})",
      "put(j,{kind:'lamp',x:c-HWZ(z)-3,z,side:-1,col,j});put(j,{kind:'lamp',x:c+HWZ(z)+3,z,side:1,col,j})")
patch("put(j,{kind:'pole',x:c-CFG.halfW-1.2,z});put(j,{kind:'pole',x:c+CFG.halfW+1.2,z})",
      "put(j,{kind:'pole',x:c-HWZ(z)-1.2,z});put(j,{kind:'pole',x:c+HWZ(z)+1.2,z})")
patch("if(M.free)for(const it of s.items)if(!it.got){const j=jOf(it.z);put(j,{kind:'item',o:it,z:it.z,j})}",
      "if(M.free||M.race)for(const it of s.items)if(!it.got){const j=jOf(it.z);put(j,{kind:'item',o:it,z:it.z,j})}if(M.race)raceBuckets(put,jOf);")
patch("const hwA=CFG.halfW*a.s,hwB=CFG.halfW*b.s", "const hwA=HWZ(a.z)*a.s,hwB=HWZ(b.z)*b.s")
patch("    if(fog<.9){ctx.strokeStyle='rgba(132,168,204,'", "    if(M.race)raceSurfSeg(a,b,fog);\n    if(fog<.9){ctx.strokeStyle='rgba(132,168,204,'")
patch("function drawSprite(sp){\n", "function drawSprite(sp){if(sp.race){raceDrawSprite(sp);return}\n")
patch("for(const sp of near)sp.kind==='player'?drawSnowboardRig():drawSprite(sp);",
      "for(const sp of near)sp.kind==='player'?(M.race?raceDrawMe():drawSnowboardRig()):drawSprite(sp);")
patch("const eqOf=(cat,cid)=>{const c=cid||CH.id,",
      "let EQ_OVR=null;   // 상대 선수를 그릴 때 그 사람 장비로 잠깐 바꿈\nconst eqOf=(cat,cid)=>{if(EQ_OVR){const v=cat==='fx'?'':(EQ_OVR[cat]||'');return v&&canWear(v,cid||CH.id)?v:(cat==='board'?'d_basic_rect':'')}const c=cid||CH.id,")
patch("return y+s.airSpin+(s.hitTime>=0?s.crashYaw||0:0)}", "return y+s.airSpin+(s.spinVis||0)+(s.hitTime>=0?s.crashYaw||0:0)}")
patch("function drawUI(){const s=game;if(MODE==='menu')return;", "function drawUI(){const s=game;if(MODE==='menu')return;if(M.race){raceUI();return}")
patch("if(document.hidden&&!paused&&MODE!=='menu'&&!game.gameOver)setPaused(true)", "if(document.hidden&&!paused&&MODE!=='menu'&&!game.gameOver&&!(M.race&&RACE.online))setPaused(true)")
patch("if(k==='r'&&MODE!=='menu'&&!e.repeat)startMode(MODE);", "if(k==='r'&&MODE!=='menu'&&MODE!=='race'&&!e.repeat)startMode(MODE);")
patch("if(MODE==='menu'&&!uiBlocking()){const L=['trick','free','tutorial'];", "if(MODE==='menu'&&!uiBlocking()&&false){const L=['trick','free','tutorial'];")
patch("if(k==='m')openMenu();", "if(k==='m'&&MODE!=='race')openMenu();")
patch("function jumpDown(){const s=game;", "function jumpDown(){const s=game;if(M.race&&RACE.phase==='count'){raceStartPress();return}if(M.race&&RACE.phase==='result')return;")
patch("if((k==='enter')&&game.final&&", "if((k==='enter')&&MODE!=='race'&&game.final&&")
# 제목 · 서버 주소 설정
h = re.sub(r'<title>[^<]*</title>', '<title>우사기 스노우보드 · 멀티 레이스</title>', h, count=1)
patch('</head>', """<script>
/* ★ 멀티 레이스 서버 주소 — Render 에 올린 뒤 여기만 바꾸면 됨 (예: 'wss://usagi-race.onrender.com') */
window.RACE_SERVER='';
</script>
</head>""")
i = h.rindex('</style>')
h = h[:i] + (SRC / 'race.css').read_text(encoding='utf-8') + h[i:]
patch('<div class="deck" id="deck">', (SRC / 'race.html').read_text(encoding='utf-8') + '<div class="deck" id="deck">')

# ---------- 레이스 모듈 (초기화 줄 바로 앞에 삽입) ----------
shared = (SRC / 'shared.js').read_text(encoding='utf-8')
names = 'ITEMS,ITEM_KEYS,ITEM_TABLE,NO_BALL_LAST,COURSE_META,COURSE_IDS,FINISH_WAIT,MAX_PLAYERS,REWARD,rankBucket,pickItem,rewardFor'
mod = '\n// ===================== 멀티 레이스 모듈 (build.py 가 넣음) =====================\n'
mod += 'const RSH=(()=>{\n' + shared + f'\nreturn{{{names}}}}})();\n'
for f in ['race_courses.js', 'race_core.js', 'race_draw.js', 'race_net.js', 'race_ui.js']:
    mod += (SRC / f).read_text(encoding='utf-8') + '\n'
init = "useChar(REC.char||'usagi');applySettings();openMenu();fitCanvas();requestAnimationFrame(loop);"
patch(init, mod + init)

out = ROOT.parent if PACK else ROOT / 'out'
out.mkdir(exist_ok=True)
(out / 'multi.html').write_text(h, encoding='utf-8')
# ---------- 서버 ----------
srv = (ROOT.parent / 'server') if PACK else ROOT / 'server'
srv.mkdir(exist_ok=True)
(srv / 'shared.js').write_text('// build.py 가 src/shared.js 에서 복사함 — 직접 고치지 말고 src/shared.js 를 고칠 것\n' + shared + f'\nmodule.exports={{{names}}};\n', encoding='utf-8')
print('ok', len(h), 'bytes')
