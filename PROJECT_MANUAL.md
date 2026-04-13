# 本地相冊工具集 — 維護手冊

> 路徑：`F:\【Claire】\Claude\新增資料夾`
> 建立日期：2026-04-09
> 最後更新：2026-04-09

---

## 一、專案概覽

這是一套**本地社群媒體相冊查看器**工具集，核心是 `local-ig.html`（瀏覽器端相冊 UI），搭配多個 Python 腳本進行內容下載與格式轉換。

```
local-ig.html           ← 核心：瀏覽器相冊查看介面
ig_download.py          ← Instagram 帖子下載器
xhs_download.py         ← 小紅書筆記下載器
flat_convert.py         ← 散圖文件夾 → 相冊格式轉換器
hhcat_convert.py        ← 哼哼猫下載包 → 相冊格式轉換器
APP - deep-translator.py ← JSON 批量翻譯工具（GUI）
```

---

## 二、各工具說明

### 2.1 `local-ig.html` — 相冊查看器

瀏覽器端靜態 HTML，不需要伺服器。

**使用方式：**
1. 用 Chrome 或 Edge 開啟此 HTML 文件
2. 點「選擇文件夾」，選取已下載的帖子目錄
3. 所有帖子自動載入，顯示圖片、文案、日期、地點

**相冊目錄格式（必須符合此結構才能正確讀取）：**
```
<用戶名>/
  _path.txt                    ← 記錄絕對路徑（自動產生）
  2024-01-15_ABC123/           ← 每個帖子一個子目錄
    1.jpg  2.jpg  3.jpg        ← 圖片（從 1 開始編號）
    1.mp4                      ← 視頻（視頻帖）
    meta.json                  ← 帖子元數據
```

**`meta.json` 欄位說明：**

| 欄位 | 說明 |
|------|------|
| `caption` | 文案 |
| `date` | ISO 8601 日期時間 |
| `location` | 地點名稱 |
| `shortcode` | 帖子 ID（IG）或 note_id（小紅書）|
| `ig_url` | 原始網址 |
| `is_video` | 是否為視頻帖 |
| `image_count` | 圖片數量 |
| `source` | 來源：`ig` / `xhs` / `flat` / `hhcat` |
| `likes` | 點讚數（選填）|

---

### 2.2 `ig_download.py` — Instagram 下載器

**依賴安裝（只需一次）：**
```bash
pip install instaloader requests
# 可選（從瀏覽器讀取 Cookie）：
pip install browser-cookie3
```

**常用指令：**
```bash
# 下載公開帳號全部帖子
python ig_download.py natgeo

# 只下載最新 30 條
python ig_download.py natgeo --count 30

# 下載第 201～400 條（範圍模式）
python ig_download.py natgeo --start 201 --end 400

# 用 Chrome Cookie 免密登入（推薦，適合私密帳號）
# ⚠ 使用前需完全關閉 Chrome
python ig_download.py natgeo --cookies-from-browser chrome

# 手動傳入 sessionid（從瀏覽器 DevTools 複製）
python ig_download.py natgeo --sessionid <sessionid值>

# 登入模式（輸入帳號密碼）
python ig_download.py natgeo --login

# 只查詢帖子總數（不下載）
python ig_download.py natgeo --check

# 自定義保存目錄
python ig_download.py natgeo --output D:/photos

# 移動文件夾後修復 _path.txt
python ig_download.py --fix-path D:/photos/natgeo
```

**保存位置：** 腳本目錄下的 `downloads/<用戶名>/`

**下載間隔：** 預設 2 秒，可用 `--delay 3` 調整（越大越不容易被限流）

**限流處理：** 被限流時自動等待（5 / 10 / 15 / 20 分鐘），可隨時 Ctrl+C 中斷，重跑時已下載的帖子自動跳過（續傳）

---

### 2.3 `xhs_download.py` — 小紅書下載器

**依賴安裝（只需一次）：**
```bash
pip install xhs requests
```

**Cookie 設定（必須，小紅書需要登入）：**
- 首次執行會引導輸入，並自動保存到 `xhs_cookie.txt`
- 下次執行自動讀取，無需重複輸入
- Cookie 失效時，程式會自動刪除舊文件並要求重新輸入

**取得 Cookie 步驟：**
1. Chrome/Edge 開啟 `https://www.xiaohongshu.com` 並登入
2. F12 → Network → 刷新頁面 → 點任意請求
3. 在 Request Headers 找到 `cookie` 行，複製整行值

**常用指令：**
```bash
# 下載指定用戶（URL 或 user_id 均可）
python xhs_download.py https://www.xiaohongshu.com/user/profile/5f8b12345678901234567890
python xhs_download.py 5f8b12345678901234567890

# 只下載最新 50 條
python xhs_download.py <user_id> --count 50

# 直接傳入 Cookie（不從文件讀取）
python xhs_download.py <user_id> --cookie "your_cookie_string"

# 移動文件夾後修復 _path.txt
python xhs_download.py --fix-path D:/photos/user_id
```

**保存位置：** 腳本目錄下的 `downloads/<user_id>/`

---

### 2.4 `flat_convert.py` — 散圖轉換器

將**手動整理的散圖文件夾**轉換成相冊格式。

**適用文件命名規律：**
```
YY.MM.DD 標題.jpg
YY.MM.DD 標題 (1).jpg   ← 同帖多張
YY.MM.DD 標題.mp4       ← 視頻
YY.MM.DD 標題.txt       ← 帖子文案（選填）
```

**使用方式：**
```bash
# 預覽（dry-run，不修改文件）
python flat_convert.py "F:/【Claire】/【Claire Moreno】" --dry-run

# 執行轉換（in-place，在原文件夾內建立子目錄）
python flat_convert.py "F:/【Claire】/【Claire Moreno】"
```

**轉換結果：**
```
原散圖 → YYYY-MM-DD_標題/
              1.jpg  2.jpg  ...
              meta.json
```

**注意：**
- 子目錄（如「辦公」「週末城市」）會自動遞歸處理
- 已轉換過的目錄（含 `meta.json`）會自動跳過
- 轉換後自動在根目錄產生 `_path.txt`

---

### 2.5 `hhcat_convert.py` — 哼哼猫轉換器

將**哼哼猫 App 下載的文件夾**轉換成相冊格式。

**哼哼猫原始結構：**
```
mao/
  用戶名/
    1_文案/
      圖片.jpg  圖片(1).jpg  視頻.mp4
    2_文案/
      ...
```

**使用方式：**
```bash
# 轉換單個用戶文件夾
python hhcat_convert.py mao/用戶名

# 預覽模式
python hhcat_convert.py mao/用戶名 --dry-run

# 批量轉換 mao 下所有用戶
python hhcat_convert.py mao
```

**轉換後結果：**
- 序號補零（確保 HTML 正確排序）
- 圖片重命名為 `1.jpg`, `2.jpg`...
- 視頻重命名為 `1.mp4`
- 寫入 `meta.json`（caption 來自文件夾名稱）

---

### 2.6 `APP - deep-translator.py` — JSON 批量翻譯工具

**GUI 應用**，批量翻譯相冊目錄中 `meta.json` 的文案欄位。

**依賴安裝：**
```bash
pip install deep-translator
```

**啟動方式：**
```bash
python "APP - deep-translator.py"
```

**功能：**
- 選擇相冊根目錄，自動掃描所有 `meta.json` 和 `notes.json`
- 翻譯 `caption`、`title`、`desc` 欄位
- 目標語言可選：`en`、`zh-CN`、`zh-TW`、`ja`、`ko`、`fr`、`de`、`th`
- 5 個並發線程、最多 3 次重試、結果緩存（同文本只翻譯一次）
- 已是目標語言的文本自動跳過
- Emoji 保留不翻譯

**注意：** 使用 Google Translate API，需要能訪問 Google（大陸/老撾需代理）

---

## 三、標準工作流程

### 流程 A：下載 Instagram → 查看

```
1. python ig_download.py <用戶名> [選項]
2. 用 Chrome 開啟 local-ig.html
3. 選擇文件夾：downloads/<用戶名>
```

### 流程 B：下載小紅書 → 查看

```
1. python xhs_download.py <user_id> [選項]
2. 用 Chrome 開啟 local-ig.html
3. 選擇文件夾：downloads/<user_id>
```

### 流程 C：整理散圖 → 查看

```
1. 確認圖片命名格式：YY.MM.DD 標題.jpg
2. python flat_convert.py "文件夾路徑" --dry-run   # 先預覽
3. python flat_convert.py "文件夾路徑"             # 確認後執行
4. 用 Chrome 開啟 local-ig.html，選擇該文件夾
```

### 流程 D：哼哼猫 → 查看

```
1. python hhcat_convert.py <用戶文件夾> --dry-run  # 先預覽
2. python hhcat_convert.py <用戶文件夾>            # 執行
3. 用 Chrome 開啟 local-ig.html，選擇該文件夾
```

### 流程 E：翻譯文案

```
1. 確認能訪問 Google
2. python "APP - deep-translator.py"
3. 選擇相冊根目錄，設定目標語言，點「開始翻譯」
```

---

## 四、常見問題排查

### Instagram 無法下載（403 / 需要登入）

```bash
# 方法 1：用 Chrome Cookie（推薦，需先完全關閉 Chrome）
python ig_download.py <用戶名> --cookies-from-browser chrome

# 方法 2：手動登入
python ig_download.py <用戶名> --login
```

### 小紅書 Cookie 失效

```bash
# 直接刪除舊 Cookie 文件，重新運行即可
del xhs_cookie.txt
python xhs_download.py <user_id>
```

### `_path.txt` 路徑錯誤（文件夾移動後相冊顯示空白）

```bash
# IG
python ig_download.py --fix-path "新路徑/用戶名"

# 小紅書
python xhs_download.py --fix-path "新路徑/user_id"
```

### flat_convert 找不到文件

- 確認文件名有日期前綴：`YY.MM.DD` 或 `YYYY.MM.DD`
- 支持分隔符：`.`（點）或 `-`（橫線）
- 不符合格式的文件會被跳過（不會報錯）

### 翻譯工具提示「連接失敗」

- 確認能訪問 Google（在瀏覽器開啟 google.com 測試）
- 在大陸或老撾需要開啟代理後再運行

---

## 五、變更日誌

| 日期 | 版本 | 說明 |
|------|------|------|
| 2026-04-09 | — | 建立維護手冊，記錄現有工具集狀態 |

---

## 六、依賴一覽

| 工具 | 依賴套件 |
|------|---------|
| `ig_download.py` | `instaloader`, `requests`, `browser-cookie3`（選填）|
| `xhs_download.py` | `xhs`, `requests` |
| `flat_convert.py` | 標準庫（無需額外安裝）|
| `hhcat_convert.py` | 標準庫（無需額外安裝）|
| `APP - deep-translator.py` | `deep-translator`, `tkinter`（標準庫）|

**一次性安裝所有依賴：**
```bash
pip install instaloader requests browser-cookie3 xhs deep-translator
```
