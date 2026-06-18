# 變更日誌

版本規則：
- `VERSION` 使用 `MAJOR.MINOR.PATCH`（SemVer 風格）
- `CHANGELOG.md` 每次發布至少新增一個 `## vX.Y.Z - YYYY-MM-DD` 條目
- `PATCH`：Bug 修復、無破壞性微調
- `MINOR`：新增功能、向下兼容
- `MAJOR`：不兼容變更

## v3.0.20 - 2026-06-18

### local-ig.html
- 修复：解决当用户在 TagManager 自定义标签中定义的一级大类名（如 `'角度'`）与系统标准物理文件夹标签名（如 `'玩乐'`）相似或与物理层级标签发生重名时，自动归档逻辑发生的严重层级解析冲突和误移库 Bug。
- 优化：在 `getPrimaryFolderCategoryTag`、`moveAlbumFolderToCategory` 和 `setPrimaryFolderCategoryTag` 中，在解析和识别物理角色前缀 `effectiveRoles` 时过滤排除了带 `_custom: true` 的非物理自定义标签；同时严格限定只有“有效物理角色前缀 + 目标分类”等格式的拼接才能配对成功，彻底防范了非物理自定义普通标签（如 `角度/玩乐`）对硬盘物理自动分类移库机制的干扰。

## v3.0.19 - 2026-06-18

### local-ig.html
- 修复：修复物理相对路径处于单层级（即直属于当前打开的主根目录下，如 `jovy_irwin/帖子A` 被直接作为根目录打开时的 `帖子A` 路径）时，在 `moveAlbumFolderToCategory` 中因 `srcParts.length === 0` 被直接判定为非法而强行拦截的 Bug。现在会兼容单层级路径，并自动将其物理父句柄指向当前打开的根目录句柄 `S.rootDirHandle`，彻底打通根目录下直属帖子文件夹的自动物理分类通道。

## v3.0.18 - 2026-06-18

### local-ig.html
- 修复：解决多角色分类模式下，自动归档物理移库与文件夹分类标签的几处逻辑缺陷：
  - 增强 `getPrimaryFolderCategoryTag`，使其兼容匹配形如 `角色名/二级标签` 等带角色前缀的二级文件夹标签，防止历史相册被自动校对跳过。
  - 重构 `moveAlbumFolderToCategory`，当原物理路径处于 `未分类` 或主根目录时，优先从相册 tags 反推关联的有效角色前缀作为 `rolePrefix`，避免移动到不合法的物理文件夹。
  - 优化 `setPrimaryFolderCategoryTag`，在手动变更标签时，彻底清洗并过滤所有旧分类的带前缀及标准标签，并根据当前相册关联的角色，自动补齐对应的前缀标签以保证物理与数据完美对齐。

## v3.0.17 - 2026-06-18

### local-ig.html
- 新增：引入 `autoFixStaleAlbumFolderPaths` 自动校对归档模块。在加载文件夹后自动对比“已设置好的标签”与“实际的物理相对路径”。若发现相册标签指向标准分类，但物理文件夹还停留在旧路径（如遗留在未分类中），系统会自动在硬盘上将其物理移动并归档至正确的角色分类层级下，同时自动更新并重构前端快照缓存索引 `.local-ig-index.json`，确保老用户无感升级并瞬间归位所有历史相册文件夹

## v3.0.16 - 2026-06-18

### local-ig.html
- 修复：重构 `locToCountry`，支持中文短地名（如“日本”、“中国”、“首尔”）在长句定位中的包含模糊提取，并配合西文 `\b` 边界防范粘连误触发
- 修复：优化 `applyLocationL2`，当用户修改相册定位导致国家变动或清空定位时，自动擦除旧的且过期的国家 L2 标签，防止其永久残留于相册中

## v3.0.15 - 2026-06-17

### local-ig.html
- 修复：文件夹标签移动逻辑未正确保留角色目录前缀（如 `角色1` 等）导致在角色模式下移动失效且破坏物理目录结构的 Bug

## v3.0.14 - 2026-06-17

### local-ig.html / serve_local_album.py
- 新增：视频大图预览侧边栏区间剪辑/短视频裁剪导出功能，支持可选的高精度 H.264 + AAC 重新编码及流复制极速秒切双模式，智能校对并动态显示区间剪切时长
- 优化：独立 EXE 打包内置 FFmpeg，彻底实现零配置免安装的开箱即用视频截图与视频裁剪体验

## v0.4.0 - 2026-04-27

### local-ig.html
- 修復：「打開資料夾 / 打开文件夹」在 `_path.txt` 已保存真實存儲路徑時，仍可能被 `HTML` 源碼所在目錄覆蓋，導致複製出錯誤的源碼路徑
- 調整：`readFolder()` 現在在 `_path.txt` 的最後一段與當前根目錄名稱一致時，直接信任已保存的真實路徑，不再重寫為 HTML 同級目錄

### 項目規範
- 新增：根目錄 `VERSION` 文件
- 新增：版本約定（`VERSION` + `CHANGELOG`）
- 新增：`tests/test_root_path_behavior.py`
- 新增：`tests/test_versioning_convention.py`

## v0.4.1 - 2026-05-21

### local-ig.html
- 修復：IG 導入命令中的 `--sessionid` 現在會自動加引號，避免特殊字元造成命令解析錯誤
- 優化：未填 `Session ID` 時，生成命令自動改用 `--cookies-from-browser chrome`，降低 `--login` 失敗與 403 風險
- 優化：`pip` 安裝命令新增 `browser-cookie3`，與新默認導入方式一致
- 優化：導入命令生成時會檢查 `ig_download.py` 是否可訪問；若可能缺失，會給出更明確提示，避免誤以為腳本可直接執行

### ig_download.py
- 優化：新增 `sessionid` 清洗流程，自動去除首尾引號並解碼 URL 編碼值
- 優化：`sessionid` 為空時直接報錯並退出，避免繼續發送無效請求
- 優化：新增 Instagram `403 Forbidden` 的專用錯誤指引，明確建議 `--cookies-from-browser` / `--sessionid` / `--login` 的優先順序

## v0.4.2 - 2026-05-22

### ig_download.py
- 新增：`--doctor` 自檢參數，輸出腳本路徑、版本、功能支持（含 `--sessionid`），便於快速辨識是否跑到舊腳本

### local-ig.html
- 優化：IG 導入第 1 步命令新增 `python <script> --doctor`，先驗證腳本版本再下載
- 優化：當 Session ID 看起來是占位文字（如「你的新sessionid」）時，直接顯示明確警告

## v0.4.3 - 2026-05-22

### ig_download.py
- 修復：`profile.mediacount` 在部分會話下觸發 `graphql/query 400 invalid request` 時，不再直接崩潰
- 優化：總數讀取失敗時切換降級模式，允許在 `--count N` 條件下繼續下載
- 優化：`--check` 在無法讀取總數時改為明確提示（返回可理解錯誤）而非 traceback
- 優化：當總數不可用時，阻止 `--start/--end` 並給出可執行替代方案

## v3.0.11 - 2026-06-15

### local-ig.html
- 优化：修改 `readFolder` 扫描机制。现在即使本地磁盘上的标准二级分类文件夹是空的，也允许将其作为空相册记录载入。这使用户能在首页中看到空文件夹卡片，并在大图详情“移动相册”弹窗中直接把图片归档进去。
- 修复：在 `doMovePhoto` 移动照片到空相册后，自动为目标相册生成并更新封面图 `coverUrl`，实现移动后封面即时显示。

## v3.0.10 - 2026-06-15

### 项目规范
- 新增：标准物理二级分类（文件夹标签）列表中默认加入 `玩乐-旅行` 标签。

## v3.0.9 - 2026-06-15

### local-ig.html
- 重构：将大图详情弹出层（Lightbox）原本底部的操作控制栏与备注输入框重构为右侧固定宽度（340px）的侧边栏布局（仅在屏幕宽度 >= 768px 时生效）。
- 优化：侧边栏模式下操作按钮重构为 2x2 网格，美化排版；备注框的最大限高提升为 400px，既拓宽了备注展示空间，又彻底防止大段字数备注对左侧大图展示区产生的挤压。
- 兼容：宽度小于 768px（如移动端设备）时自动退回底栏“上下”传统布局，确保响应式体验良好。

## v3.0.8 - 2026-06-15

### local-ig.html
- 优化：限制大图浏览弹窗底部的备注输入框最大高度为 120px，并允许垂直滚动。当备注文字较多时，输入框不会无限撑高而挤压或遮挡上方的图片/视频素材。

## v3.0.7 - 2026-06-14

### local-ig.html
- 修复：修复了“UI 顶部导航分类文件夹展示不全，遗漏包含图片的物理分类二级目录”的 Bug。现在在相册识别后，会自动扫描并补全那些直接包含图片的标准物理二级分类文件夹名字（如“吃喝-午”），保证其能完整正确地在 UI 顶部的子菜单中展示。

## v3.0.6 - 2026-06-09

### serve_local_album.py
- 新增：`/__get_server_info__` 路由以返回主程序的真实物理磁盘可执行路径 `resolve_launch_dir()`。

### local-ig.html
- 修复：一键下载时由于没有在总目录生成 `_path.txt` 导致定位漂移到旧版 `F:\Download\本地IG` 的问题。现在在页面加载时会自动从后端拉取真实运行路径，并在总目录中生成/校准 `_path.txt`。
- 修复：一键下载时 `getOutPath()` 方法的目录层级处理逻辑。当前打开为总相册根目录时，不予进行多余的最后一级目录切除，使生成的子相册精准存入当前打开的目录。
- 修复：在相册页右侧添加“其他层级标签”（如：旅行/西安）时，由于使用包含普通标签的 `isManagedCategoryTag` 检查，导致正常自定义大类标签被误伤拦截报错为“文件夹标签”的 Bug。已将检查更正为物理相册文件夹专属的 `isFolderCategoryTag`。
- 修复：修复了“打开文件夹”打不开物理相册的 Bug，该 Bug 同样由 `S.rootAbsPath` 未同步对准物理路径引起。

## v3.0.5 - 2026-06-07

### local-ig.html
- 優化：在「添加帖子」彈窗中的導入/轉換任務輪詢中，新增實時日誌與進度顯示，消除盲目等待感，對齊首頁 IG 下載進度條體驗
- 修復：修復在 HTTP 服務模式下若相冊缺乏 `_path.txt`，進行「打開資料夾」與「複製路徑」時可能拼接出包含 `null` 字符的無效路徑隱患

### xhs_download.py
- 優化：在 `load_cookie` 交互式輸入處捕获了 `EOFError` 異常，避免在非交互式後台環境下因 stdin 缺失而拋出 Traceback 閃退，代以友好的 Cookie 填寫引導提示

## v3.0.3 - 2026-05-31

### 項目規範
- 升級版本號至 3.0.3

## v0.5.0 - 2026-05-22

### EXE 一鍵下載（重點）
- 新增：本地服務 API `POST /__run_ig_download__`，由 EXE 直接啟動 IG 下載任務，不再要求手動複製終端命令
- 新增：IG 面板「在本地IG中一鍵開始下載」按鈕，點擊後自動拼裝參數並啟動下載
- 新增：輸出路徑防呆校驗，阻止把 `--output` 填成 `.exe/.cmd` 等文件路徑
- 保留：原「生成命令」流程作為進階備援，不影響老用戶習慣

## 2026-04-20

### local-ig.html
- **BUG3 修復（備注丟失）**：`writeNotes()` 原本只從 localStorage 讀取 per-photo captions，在 localStorage 為空時會覆蓋 notes.json 並清除所有備注；改為將 `alb.notesData.photos`（從 notes.json 讀入的記憶體副本）與 localStorage 合併，localStorage 編輯優先，notesData 填補缺口
- **自動恢復**：新增 `recoverNotesFromMemory()`，在每次載入文件夾後自動執行；將記憶體中的 notesData.photos 同步回 localStorage 並觸發 `scheduleWrite`；首次恢復時顯示 Toast 提示恢復數量
- **BUG4 修復（LB 備注編輯）**：Lightbox 底部新增可編輯備注欄（✏️ 圖示 + textarea）；優先讀取 `alb.notesData?.photos`，其次 localStorage，index 0 fallback 到相冊整體文案
- **BUG5 修復（標簽篩選不全）**：`buildFilterBar()` 中 `classifiedSuffixes` 改為 per-album（原本 global 導致跨相冊誤排除相同字串的 bare tag）
- **BUG6 修復（路徑漂移）**：`readFolder()` 改用 `getHtmlDir()` 驗證並更正 `S.rootAbsPath`，解決文件夾移動後「添加帖子」和「打開文件夾」仍使用舊路徑的問題
- **功能：九宮格備注快速編輯**：每格 caption 條 hover 顯示 ✏ 按鈕；點擊 ✏ 或直接點文字區進入編輯模式（textarea）；`Blur` / `Esc` 儲存；即時同步 `notesData` + localStorage + `scheduleWrite`；編輯時不觸發 Lightbox

---

## 2026-04-13（功能擴展：相冊導航 + 搜尋高亮 + 地點篩選 + 地圖視圖）

### local-ig.html
- **功能3 相冊導航列**：進入相冊後頂部顯示 `N / 總數` 進度列，← → 按鈕切換上下相冊（基於當前篩選結果順序）
- **功能6 地點篩選 Chips**：FilterBar 底部新增 📍 地點行，顯示所有有地點資料的相冊（依數量排序）；點擊 chip 篩選該地點；「全部」chip 同時清除地點篩選
- **功能7 搜尋高亮**：首頁卡片的相冊名稱、文案、地點顯示中，符合搜尋關鍵字的文字以黃色 `<mark>` 高亮標示；`hlText()` 遞迴安全轉義 HTML
- **功能9 地圖視圖**：Header 新增 🗺 按鈕；按下後切換至地圖視圖，動態載入 Leaflet.js（CDN，按需加載）；以 Nominatim/OSM 對每個地點 geocode（座標緩存至 localStorage）；每個地點顯示圓點圖釘，popup 含縮圖 + 相冊名 + 「查看相冊」連結；Nominatim 請求間隔 250ms 符合速率限制；`Esc` 退出地圖視圖

---

## 2026-04-13（標籤 BUG 修復 + 優化）

### local-ig.html
- **BUG1 修復**：`cleanupStaleLocationTags()` 改用跨語言比對（所有 `zh/zh-TW/zh-CN/en/...` 變體），避免語言切換時誤刪 `🇹🇼 台灣` 等國家 L2 tag
- **BUG2 修復**：`locToCountry()` 移除反向包含匹配（`kw.includes(l)`），改為正向匹配且要求關鍵字長度 ≥ 3，防止短字串誤觸發錯誤國家
- **優化1**：手動加標籤的 L2 下拉：旅行（`_useCountryMap`）不再掃描現有 tag，其他分類也過濾掉含 `/` 的 L3 部分，只顯示純 L2
- **優化2**：TagManager「新增自定義分類」新增「初始 L2」欄位（逗號分隔），一次建立 L1 + 多個 L2

---

## 2026-04-13

### 項目發佈
- **GitHub 私有倉庫**：https://github.com/maxmok1995/local-ig-viewer
  - 包含：`local-ig.html`、`ig_download.py`、`xhs_download.py`、`flat_convert.py`、`hhcat_convert.py`、`APP - deep-translator.py`、`CHANGELOG.md`、`PROJECT_MANUAL.md`
  - 排除：`xhs_cookie.txt`（敏感 Cookie）、`downloads/`、`.claude/`

---

## 2026-04-12（第五批優化）

### local-ig.html
- **標籤管理 Modal**：⚙ 按鈕改為開啟全頁 Modal（`#tagMgrModal`），取代舊版 `l1Manager` 浮動面板
  - 預設分類：顯示所有 TAG_HIERARCHY 項目；可隱藏/顯示、重命名、修改關鍵字；不可刪除
  - 自定義分類：完整 CRUD（新增、改名/改 kw、刪除）
  - L2 管理（點 ▼ L2 展開）：預設分類可新增 extra L2；自定義分類可新增/編輯/刪除 L2
  - 地點自動 L2（`_useLocationAsL2`）顯示只讀提示
  - Esc / 點背景 / × 按鈕關閉；展開狀態在重渲染間保持
- **`getEffectiveHierarchy()` 擴展**：支援 `cfg.overrides`（預設 L1 的名稱/kw 覆蓋）與 `cfg.extraL2`（預設 L1 的額外 L2 子項）；自定義分類新增支援 `children`（L2 子分類）

---

## 2026-04-12（第四批優化）

### local-ig.html
- **九宮格 Caption 條**：相冊九宮格模式每張照片下方加固定高度（40px）文字條，顯示 per-photo caption；無備注時留空灰條維持整齊高度；index 0 照片無獨立備注時 fallback 到相冊整體文案；CSS 重構為 `.gridCellWrap`（flex column）+ `.gridImgWrap`（aspect-ratio:1）+ `.gridCaption`

---

## 2026-04-12（第三批優化）

### local-ig.html
- **刪除相冊**：批量操作欄新增「🗑 刪除」按鈕；相冊詳情頁也有「🗑 刪除」連結；彈出確認對話框後呼叫 `removeEntry(name, {recursive:true})` 刪除文件夾，同步清除 localStorage 殘留
- **時間軸視圖**：Header 新增 📅 按鈕，點擊切換時間軸模式；相冊按 YYYY.MM 分組，各月份顯示黏性月份標題；再次點擊恢復格狀視圖
- **全屏 Lightbox**：LB Header 新增 ⛶ 按鈕，呼叫 `requestFullscreen()`；關閉 LB 或 Esc 自動退出全屏
- **幻燈片模式**：LB Header 新增 ▶ 按鈕，點擊開始 3.5s 自動翻頁；顯示 ⏸ 表示播放中；Space 鍵切換播放/暫停；最後一張自動停止
- **手勢滑動擴大**：觸控滑動由 `lbImg` 擴大至整個 `lbImgArea`，垂直滑動不觸發翻頁

### ig_download.py
- **修復 IG 定位導入失敗**：改為優先從 `post._node['location']['name']` 讀取（GraphQL 緩存，無額外 API 請求），找不到再回退至 `post.location.name`；解決大量帖子地點為空的問題

---

## 2026-04-12（第二批優化）

### local-ig.html
- **#10 容錯**：`meta.json` 解析失敗時標記 `_corruptMeta`，卡片顯示 ⚠️ 徽章，統計列計數損壞數
- **#2 日期排序**：排序按鈕改為 4 段循環（名稱↓ / 名稱↑ / 日期↓ / 日期↑），新增 `getAlbumDate()` 輔助函數
- **#1 全文搜尋**：Home 頂部加搜尋欄，即時過濾相冊名稱 / 文案 / 地點；`/` 鍵或 Ctrl+F 聚焦
- **#7 統計列**：搜尋欄下方顯示「N 個相冊 · M 張圖 · V 支影片 · ⚠️ K 個損壞」，篩選後即時更新
- **#3 收藏**：相冊卡片右上角 ☆/★ 按鈕，收藏持久化於 localStorage；FilterBar 加「⭐ 收藏 N」chip
- **#8 封面替換**：相冊 grid view 每張縮圖 hover 顯示「設為封面」，點擊寫入 `notes.json.coverPhoto`；下次載入自動套用
- **#6 鍵盤快捷鍵**：`/` / Ctrl+F 搜尋、`r` 刷新、`Esc` 關 modal / 返回、`←→` Lightbox 翻頁
- **#5 翻譯 Modal**：底部加「↻ 刷新相冊」按鈕，翻譯完直接刷新不需關 modal 再點 header
- **#4 導入 Modal 整合腳本**：新增「📁 散圖轉換」和「🐱 哼哼猫」tab，各自帶路徑輸入 + --dry-run checkbox；轉換工具隱藏數量欄；路徑預填當前開啟文件夾

### ig_download.py
- **#9 進度條**：每條帖子顯示進度條（`█░` 字元）、百分比、已下載數；等待延遲顯示倒計時

---

## 2026-04-12

### local-ig.html
- 修復：↻ 刷新按鈕點擊後無反應（`S.rootDirHandle` 為 null 時靜默返回）→ 改為顯示提示 Toast
- 改善：↻ 刷新成功後 Toast 顯示相冊數量變化（+N / -N / 共N個），方便確認是否抓到新內容
- 修復：刷新前清除舊封面 Object URL（避免記憶體洩漏，確保圖片重新載入）
- 修復：有新相冊且標籤篩選生效時，自動清除篩選以確保新內容可見
- 新增：導入 Modal 平台切換 Tab（📷 Instagram / 🔴 小紅書），各平台顯示對應輸入欄與腳本命令
- 新增：數量欄加入「自訂」輸入框，可直接填入任意數字；與 chips 互斥（填數字則清除 chip 選中，點 chip 則清除數字）
- 改善：小紅書 Cookie 自動 localStorage 持久化（key: `xhs-cookie`）
- 同步：導入 Modal 內「↻ 刷新相冊」亦加入數量差異 Toast，與 header ↻ 行為一致
- 新增：Header 🌐 翻譯按鈕（文件夾開啟後顯示），開啟「批量翻譯」Modal
- Modal：選擇目標語言（EN/繁中/简中/日語/한국어/ภาษาไทย/FR/DE）→ 生成命令並複製
- 命令自動帶入當前文件夾路徑（`--folder`）與語言（`--lang`），直接在終端執行即可

### APP - deep-translator.py
- 新增：支援 CLI 參數 `--folder DIR` 和 `--lang LANG`，從外部調用時自動預填 GUI 欄位

---

## 2026-04-11

### local-ig.html
- 修復：更換「儲存路徑」（igOutput）後，`S.rootAbsPath` 未同步 → 「打開文件夾」、路徑複製等功能仍顯示舊路徑
- 修復：Quick IG 面板開啟狀態下切換文件夾或更換輸出路徑，面板路徑不自動刷新
- 實作：`ig-output-changed` / `folder-loaded` 自定義事件，跨模組通知路徑更新
- 新增：刷新頁面後自動恢復上次文件夾（若已有權限則靜默載入；否則顯示一鍵恢復畫面，不再跳回 Welcome）
- 新增：`↻` 重新掃描按鈕（Header），可同步後台對文件夾的增刪改（如 Python 腳本下載新帖子後）
- 重構：`doLoadFolder()` 提取公用載入邏輯，`openFolder` 與 restore 共用
- 新增：每張相冊卡片右上角加號按鈕（hover 顯示），點擊開啟「導入更多帖子」Modal
- Modal：預填用戶名（`S.rootName`）、最新 N 筆選擇器（10/20/50/100/全部，預設 20）
- Modal：自動帶入 ig-output-path 輸出路徑、sessionid（若有），即時生成下載命令
- Modal：「複製命令」一鍵複製 + 「↻ 刷新相冊」執行腳本後直接同步新帖子

---

## 2026-04-10

### ig_download.py
- 修復 `--sessionid` 傳入 URL 編碼值時自動 decode（`%3A` → `:`）
- 新增：設置 sessionid 後自動向 Instagram 行動 API 取得登入用戶名，確保 instaloader 使用已登入 endpoint（修復 `'edges'` 錯誤）

### local-ig.html
- IG 面板新增 **Session ID** 輸入欄，填入後自動帶入命令（取代失效的 `--cookies-from-browser chrome`）
- Session ID 自動 localStorage 持久化，下次開啟不需重填
- 依賴安裝命令移除 `browser-cookie3`（已不需要）

---

## 2026-04-09

### 初始狀態記錄

專案工具集建立，包含以下 6 個文件：

- `local-ig.html` — 瀏覽器本地相冊查看器（核心 UI）
- `ig_download.py` — Instagram 帖子下載器（支援公開/私密帳號、Cookie 登入、範圍下載、限流自動重試）
- `xhs_download.py` — 小紅書筆記下載器（支援圖文/視頻、Cookie 文件持久化）
- `flat_convert.py` — 散圖文件夾轉換器（`YY.MM.DD 標題` 命名規律，支援子目錄遞歸）
- `hhcat_convert.py` — 哼哼猫下載包轉換器（`{序號}_{文案}` 結構，序號自動補零）
- `APP - deep-translator.py` — JSON 批量翻譯 GUI（Google Translate，5 並發線程，含緩存）

所有工具共用同一個 `meta.json` 結構，均兼容 `local-ig.html` 讀取。

---

<!-- 在此往上新增新的變更記錄，格式：
## YYYY-MM-DD
### 工具名稱
- 變更內容
-->
