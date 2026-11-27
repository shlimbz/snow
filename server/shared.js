// build.py 가 src/shared.js 에서 복사함 — 직접 고치지 말고 src/shared.js 를 고칠 것
// ===== 멀티 레이스 공용 규칙 (클라이언트 multi.html 과 서버 server.js 가 똑같이 사용) =====
// 이 파일만 고치면 build.py 가 양쪽에 같이 넣어 줌
const ITEMS={
  broc:{n:'브로콜리 부스트',e:'🥦'},
  ghost:{n:'유령보드',e:'👻'},
  q:{n:'물음표',e:'❓'},
  wall:{n:'눈 방벽',e:'🛡️'},
  ice:{n:'얼음 웅덩이',e:'🧊'},
  ball:{n:'거대 눈덩이',e:'☃️'},
  cloud:{n:'폭설 구름',e:'🌨️'}};
const ITEM_KEYS=['broc','ghost','q','wall','ice','ball','cloud'];
// 순위 구간별 확률(%) — [1등, 2등, 3등, 4등]. 인원이 적으면 1등=첫 칸, 꼴찌=마지막 칸
const ITEM_TABLE={
  broc:[25,25,25,20],
  ghost:[0,25,25,15],
  q:[10,15,15,10],
  wall:[30,20,5,0],
  ice:[35,15,0,0],
  ball:[0,0,15,30],
  cloud:[0,0,15,25]};   // 폭설 구름: 1등을 쫓아가 3초 동안 느리게 (3·4등 전용)
const NO_BALL_LAST=200;   // 결승선 앞 마지막 200m 에서는 거대 눈덩이 안 나옴
// 코스 길이(m) — 서버는 순위·눈덩이 제한 판정에만 씀
const COURSE_META={
  carrot:{name:'당근밭 슬로프',len:4400},
  ice:{name:'얼음 협곡',len:4600},
  aurora:{name:'오로라 빅에어 피크',len:4800},
  rainbow:{name:'무지개 스카이로드',len:5200}};
const COURSE_IDS=['carrot','ice','aurora','rainbow'];
const FINISH_WAIT=20;     // 1등 골인 후 남은 사람 대기 시간(초)
const MAX_PLAYERS=4;
// 순위 보상(당근): 인원수별 [1등,2등,…] + 완주 보너스. 레이스 중 먹은 당근은 따로 더함(최대 40)
const REWARD={place:{1:[12],2:[20,8],3:[24,14,6],4:[26,16,10,5]},finish:10,carrotCap:40};
function rankBucket(rank,n){if(n<=1)return 0;return Math.round((rank-1)/(n-1)*3)}
// rnd: 0~1 난수 함수, z: 상자를 먹은 위치, len: 코스 길이
function pickItem(rank,n,z,len,rnd){const b=rankBucket(rank,n),late=z>len-NO_BALL_LAST;let tot=0;const w=ITEM_KEYS.map(k=>{let v=ITEM_TABLE[k][b];if(late&&k==='ball')v=0;tot+=v;return v});
  let r=(rnd||Math.random)()*tot;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return ITEM_KEYS[i]}return'broc'}
function rewardFor(place,n,finished,carrots){const t=REWARD.place[Math.min(MAX_PLAYERS,Math.max(1,n))]||REWARD.place[4];return (t[place-1]||0)+(finished?REWARD.finish:0)+Math.min(REWARD.carrotCap,carrots|0)}

module.exports={ITEMS,ITEM_KEYS,ITEM_TABLE,NO_BALL_LAST,COURSE_META,COURSE_IDS,FINISH_WAIT,MAX_PLAYERS,REWARD,rankBucket,pickItem,rewardFor};
