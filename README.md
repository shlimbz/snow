# 우사기 스노우보드 · 멀티 레이스

## 올리는 법
1. `multi.html`을 GitHub Pages의 `index.html` 바로 옆에 둬요. `assets` 폴더를 같이 써요.
2. `server` 폴더를 Render에 올려요. 방법은 `server/README.md`에 있어요.
3. `multi.html` 위쪽의 `window.RACE_SERVER=''`에 Render 주소(`wss://…`)를 넣어요.

`multi.html`은 `index.html`과 같은 주소에 있으면 당근·캐릭터·치장을 그대로 같이 써요.
레이스 보상 당근도 같은 지갑으로 들어가요.

## index.html이 바뀌었을 때
`index.html`을 이 폴더에 두고 아래를 실행하면 `multi.html`이 새로 만들어져요.
```bash
python3 build/build.py
```
게임 코드가 많이 바뀌어서 연결 지점을 못 찾으면 어느 줄인지 알려 주고 멈춰요.

## 조작
- PC: 기존 조작 그대로 + 아이템은 E (또는 Shift, X)
- 모바일: 점프 버튼 바로 위의 동그란 아이템 버튼
- 카운트다운 GO 직전(0.45초 안)에 점프 → 스타트 부스트
- 깊게 꺾은 채 버티면 파랑→주황 불꽃 → 반대로 꺾는 순간 카빙 부스트
- 레일은 빠른 길: 타는 동안 점점 빨라지고, 끝까지 타면 부스트
- 협곡·낭떠러지에 떨어지면 1.5초 뒤 가까운 길 위에서 다시 출발

## 숫자 고치는 곳 (build/src)
- 아이템 확률·보상·코스 길이: shared.js  (고친 뒤 build.py 를 돌리면 서버 쪽에도 같이 들어감)
- 순위별 가속 보정·아이템 세기·부스트 수치: race_core.js 맨 위 RTUNE
- 카빙 부스트·몸싸움: race_fx.js 의 CARVE · BUMP
- 코스: race_courses.js
