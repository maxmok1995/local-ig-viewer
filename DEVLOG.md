# IG Bot 維護日誌

## 系統架構

```
使用者 TG → ig-tg-bot (Docker) → Dify AI (port 8080)
                               → ig-renderer (Docker, port 3001)
                               → Google Cloud Storage
                               → Instagram Graph API
```

### 兩個 Docker 容器
| 容器 | 功能 | 入口 |
|------|------|------|
| `ig-tg-bot` | 接收 TG 訊息、呼叫 AI、回傳圖片、發 IG | `tg_bot.js` |
| `ig-renderer` | 接收 HTML 模板、Puppeteer 截圖、上傳 GCS | `server.js` |

### 檔案掛載（volume mount）
docker-compose.yml 中重要的 volume：
- `tg_bot.js` → `/app/tg_bot.js`（改 host 檔案 + restart 即生效）
- `server.js` → `/app/server.js`（改 host 檔案 + restart 即生效）
- `whitelist.json` → `/app/whitelist.json`

---

## 已知問題與解法

### ❌ TG Bot 重複回覆（每條訊息回兩次）
**根本原因：雙重部署並存**

伺服器上同時存在兩套 bot：
1. **Docker 容器** `ig-tg-bot`（新版，docker-compose 管理）
2. **PM2 直接在 host 上跑** `node /home/maxmok1995/renderer/tg_bot.js`（舊版）

兩者共用同一個 Telegram Bot Token，都在輪詢 getUpdates，所以每條訊息被處理兩次。

**為何每次微調後都復活：**
- `pm2-maxmok1995.service` systemd 服務會在開機時自動啟動 PM2
- PM2 保存了 `tg-bot` 的啟動狀態（`~/.pm2/dump.pm2`）
- 每次伺服器重啟，PM2 的 tg-bot 就自動復活

**永久修法（已執行）：**
```bash
sudo -u maxmok1995 pm2 delete tg-bot
sudo -u maxmok1995 pm2 save
```

**確認方法：**
```bash
ps aux | grep tg_bot | grep -v grep
# 應只有一行（Docker 容器內的 node tg_bot.js，user=root）
```

**防護措施（已加入 tg_bot.js）：**
```js
const seenIds = new Set()
// processUpdate 開頭：
if (seenIds.has(update.update_id)) return
seenIds.add(update.update_id)
```

---

### ❌ TG Bot 停止運作（3 天沒反應）
**原因：** OOM（Exit code 137），容器被系統殺掉

**修法：**
```bash
cd /home/maxmok1995/renderer && docker-compose up -d tg-bot
```

**預防：** docker-compose.yml 已設 `restart: always`，但 OOM 後不一定自動重啟。
建議長期方案：升級 VM 規格，或加 swap。

---

### ❌ 圖片字符顯示方框（亂碼）
**原因：** Docker 容器內 Google Fonts DNS 解析失敗，字型沒載入，回退到無字型狀態

**修法：** server.js 中將所有 `@import url('https://fonts.googleapis.com/...')` 改為本地字型：
```css
@font-face {
  font-family: 'Noto Serif TC';
  src: local('Noto Serif CJK TC'), local('Noto Serif CJK HK');
}
```
容器內已安裝：`/usr/share/fonts/noto/NotoSerifCJK-*.ttc`

---

### ❌ 圖片背景純色、SVG 視覺效果不顯示
**原因（多層）：**
1. `getThemeOverlay` opacity 過低（原本 0.055，幾乎不可見）
2. SVG 使用 `feGaussianBlur` filter，在 headless Chromium 有時不渲染
3. `detectTheme` 關鍵字太少，大多數主題回傳 `null`，走幾乎空白的 default
4. body 背景為純色，沒有漸層

**修法：**
- opacity 提高至 0.28–0.75
- 移除所有 `filter="url(#...)"` 引用
- `detectTheme` 補充大量中文關鍵字，fallback 改為 `'finance'` 而非 `null`
- 加入 `gradientOverlay(ac)` 函數（三個徑向漸層）注入所有風格
- body 背景改為 `linear-gradient`

---

### ❌ 容器修改後沒生效
**原因：** Docker image 是 build 時烘入的，直接修改 host 上的 .js 檔案不影響容器

**修法：** 在 docker-compose.yml 加 volume mount：
```yaml
volumes:
  - /home/maxmok1995/renderer/server.js:/app/server.js
  - /home/maxmok1995/renderer/tg_bot.js:/app/tg_bot.js
```
之後改檔案只需 `docker-compose restart renderer` 或 `restart tg-bot`

---

## 常用維運指令

```bash
cd /home/maxmok1995/renderer

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs --tail=50 tg-bot
docker-compose logs --tail=50 renderer

# 重啟單一容器
docker-compose restart tg-bot
docker-compose restart renderer

# 確認沒有重複 bot 進程
ps aux | grep tg_bot | grep -v grep   # 應只有一行

# 確認 PM2 沒有 tg-bot
sudo -u maxmok1995 pm2 list           # 應只有 renderer，無 tg-bot

# 緊急：bot 沒反應時
docker-compose up -d tg-bot
```

---

## Port 對應

| Port | 服務 | 備註 |
|------|------|------|
| 3000 | PM2 renderer（舊版） | 仍在跑，不影響新版 |
| 3001 | Docker ig-renderer | 新版，tg-bot 使用此 port |
| 8080 | Dify AI | 內網 10.138.0.2 |
| 8081 | 1Panel 管理面板 | — |
