# 멀티 레이스 서버 (Render 무료)

설치할 패키지가 없는 Node.js 서버예요. 방 관리, 위치 중계(초당 15회), 아이템 추첨, 순위·골인 판정만 해요.
게임 물리는 각자 브라우저에서 돌아서 서버가 느려도 조작감은 그대로예요.

## Render에 올리기

1. 이 `server` 폴더를 GitHub 저장소에 올려요. 게임 저장소 안에 넣어도 되고, 새 저장소를 만들어도 돼요.
2. Render 대시보드에서 **New → Web Service**를 누르고 그 저장소를 골라요.
3. 설정은 이렇게 해요.
   - Root Directory: `server` (게임 저장소 안에 넣었을 때만)
   - Runtime: Node
   - Build Command: `npm install` (설치할 게 없어서 금방 끝나요)
   - Start Command: `node server.js`
   - Instance Type: Free
   - Region: Singapore (한국에서 가장 가까워요)
4. 배포가 끝나면 `https://이름.onrender.com` 주소가 생겨요. 브라우저로 열어서 `usagi race server ok`가 보이면 성공이에요.
5. `multi.html` 위쪽의 이 줄에 주소를 넣어요. `https`를 `wss`로 바꿔야 해요.
   ```html
   window.RACE_SERVER='wss://이름.onrender.com';
   ```

## 알아 둘 점

- **무료 서버는 15분 동안 아무도 없으면 잠들어요.** 다음에 누가 들어오면 깨어나는 데 1분쯤 걸려요. 게임은 그동안 "서버를 깨우는 중" 메시지를 띄우고 계속 다시 연결해요.
- **서버가 다시 시작되면 진행 중이던 판은 취소돼요.** 방 정보는 메모리에만 있어서예요. 한 판이 2분 남짓이라 피해는 작아요.
- 주소 뒤에 `?server=wss://…`를 붙이면 그 서버로 접속해요(테스트용). 이 값은 그 브라우저에 저장돼요.

## 내 컴퓨터에서 시험하기

```bash
cd server && node server.js          # ws://localhost:8080
cd .. && python3 -m http.server 8000  # 다른 창에서, multi.html 이 있는 폴더
```
브라우저에서 `http://localhost:8000/multi.html`을 열면 자동으로 `ws://localhost:8080`에 붙어요.
창을 여러 개 열면 혼자서도 멀티를 시험할 수 있어요.

## 고칠 곳

- 아이템 확률, 보상, 코스 길이, 인원: `shared.js` (원본은 `build/src/shared.js`라서 그쪽을 고치고 `build.py`를 다시 돌리면 양쪽에 같이 들어가요)
- 빠른 매칭 대기 시간(20초), 카운트다운: `server.js` 맨 위 `QUICK_WAIT`, `COUNT_MS`
