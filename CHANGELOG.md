# 變更日誌

版本規則：
- `VERSION` 使用 `MAJOR.MINOR.PATCH`（SemVer 風格）
- `CHANGELOG.md` 每次發布至少新增一個 `## vX.Y.Z - YYYY-MM-DD` 條目
- `PATCH`：Bug 修復、無破壞性微調
- `MINOR`：新增功能、向下兼容
- `MAJOR`：不兼容變更

## v3.0.64 - 2026-07-09

### scripts/serve_local_album.py
- 新增：引入「外部文件優先」的網頁及腳本加載機制（External-Files-First）。主程序啟動時，若檢測到外部工作目錄或同級目錄中存在物理 `local-ig.html`、`ig_download.py` 等資源與腳本，會優先加載與調用外部版本，否則自動回退為使用內置打包默認版本。這使得用戶無需重新編譯打包 EXE，直接通過 `git pull` 即可無痛一鍵實現前端網頁與下載腳本的熱更新。

## v3.0.63 - 2026-07-09

### scripts/build_release.ps1
- 優化：在發布打包中自動拷貝 `一鍵啟動相冊(Tailscale版).bat`。方便用戶在本地 Windows 通過 Tailscale 一鍵啟動局域網監聽，配合 VPS 的 Nginx 轉發，實現 0 磁碟空間佔用及 100% 離線可用。

## v3.0.62 - 2026-07-09

### scripts/serve_local_album.py
- 跨平台優化：修補了 `open_folder_in_explorer` 介面，當後台服務運行在 Linux VPS 伺服器時，自動跳過 Windows 專屬的 `explorer.exe` 調用，防止服務端拋出異常或崩潰。使得「Linux VPS 部署服務器 + Windows 本地瀏覽器遠程訪問」的使用場景能夠安全、穩定地運行。

## v3.0.61 - 2026-07-09

### local-ig.html
- 優化：引入角色標籤隔離（Role-based Isolation）。當前相冊打自定義標籤、編輯標籤或自動推薦標籤（如愛好 L2 推薦）時，會自動進行當前所屬角色的過濾統計。這能百分之百防止多角色模式下角色 A 與角色 B 之間的標籤「串碼」問題，確保不同角色之間的標籤統計與快捷推薦完全獨立。

## v3.0.60 - 2026-07-08

### local-ig.html
- 修復：修復了上一個版本修改時，因內置編碼處理問題導致整個網頁文字變成亂碼的 bug。本版本已將網頁編碼完整修復。
- 補充：在 `📸 角度` 的 L2 子項中增加 `Vlog` 標籤，並同步加入 `QUICK_TAG_DATA` 快捷按鈕。
- 移除：從自定義標籤推薦列表中移除了 `🇲🇾 馬來西亞` 和 `✨ 逼格`，以減少無用快捷項。
- 優化：保留 `😍 愛好` 的大類推薦，並將其 L2 子項改為運行時「動態統計」——會自動分析所有相冊中使用頻率最高的前 4 個 `愛好/xxx` 標籤作為推薦，越用越聰明。

## v3.0.59 - 2026-07-08

### local-ig.html
- 補充：`📸 角度` 的 L2 子項加入 `Vlog`，同步更新 `QUICK_TAG_DATA` 快捷按鈕。
- 優化：移除 `RECOMMENDED_CUSTOM_TAGS` 中的 `🇲🇾 馬來西亞` 與 `✨ 逼格`，減少不必要的快捷推薦干擾。
- 新增：`😍 愛好` 加入 `RECOMMENDED_CUSTOM_TAGS`（標記 `_dynamicL2:true`），其 L2 子標籤由運行時動態統計所有相冊中最常用的前 4 個 `愛好/xxx` 子項決定，無需手動維護。

## v3.0.58 - 2026-07-08

### local-ig.html
- 重構：將普通自定義標籤（逼格、角度、愛好、馬來西亞）與系統物理大類（TAG_HIERARCHY）徹底剝離。以往這些非物理標籤在代碼中被錯誤硬編碼為系統大類，導致了物理移庫時反復創建「📸 角度」等非法目錄的 bug，並污染了頂部統計篩選。重構後，將其完全抽離並封裝為「RECOMMENDED_CUSTOM_TAGS」專用推薦定數，僅用作照片詳情頁的快捷標籤點選與輸入推薦，從根本上解決了非法物理目錄生成與統計干擾。

## v3.0.57 - 2026-07-08

### ig_download.py
- 修复：優化當前會話無法獲取帖子總數時的容錯與自癒機制。以往當前會話受限無法解析總數且未填寫下載數量（--count）時，程式會強制報錯退出。修復後，在 GraphQL 模式下讀不到總數時，會自動降級為「無限制嘗試下載全部」的模式，並安全修復了 `limit = None` 時下載循環判斷 `i < limit` 拋出 Python TypeError 類型錯誤的 bug。

## v3.0.56 - 2026-07-08

### local-ig.html
- 修复：統一所有 Instagram 下載入口（包括主頁面一鍵下載、快速導入面板 📥、以及原有導入彈窗）的 Session ID 錯誤自癒與彈窗機制。當檢測到 sessionid 失效或請求受限時，全面自動彈出 `prompt` 允許更換最新的 sessionid，同步保存後自動重新執行下載任務，徹底解決在快速面板下載失敗時提示更換卻「無處輸入」的問題。

## v3.0.55 - 2026-07-08

### local-ig.html
- 修复：徹底解決「單角色模式」（如直接選擇並開啟 `jovy_irwin` 角色資料夾）與「多角色模式」（開啟 `本地IG` 等父資料夾）下，移動相冊與打分類標籤時對角色前綴（`rolePrefix` 與 `activeRole`）的判定錯誤。修復後完全依賴相冊相對路徑解析出的角色物理前綴，杜絕單角色下生成 `jovy_irwin/jovy_irwin/` 雙重前綴的嵌套路徑與錯誤前綴標籤，保證頂部大類統計無誤。

## v3.0.54 - 2026-07-02

### local-ig.html
- 修复：徹底修復移動相冊或變更物理分類時，`rolePrefix`（角色前綴）和 `activeRole` 的判定錯誤。以往硬碟上若殘留非法資料夾（如 `📸 角度`）會導致其被誤判為角色目錄前綴，從而重新創建並寫入嵌套物理資料夾（如 `📸 角度/吃喝-下午茶`）。修復後，僅允許真正的角色名稱（如 `jovy_irwin`）作為目錄前綴，徹底杜絕非法物理大類重新生成。

## v3.0.53 - 2026-07-01

### scripts/serve_local_album.py
- 修复：新增 `cleanup_illegal_empty_folders()`，在服務器啟動時自動掃描並物理清除用戶角色目錄下因歷史 BUG 或複製殘留的非標準空物理大類外殼資料夾（如 `📸 角度`、`😍 愛好`、`🇲🇾 馬來西亞` 等無實體媒體的空資料夾），確保磁碟目錄乾淨。

### local-ig.html
- 优化：在 UI 頂部物理資料夾標籤篩選列中，於「玩樂」的右側新增了「未分類」篩選按鈕，便於用戶一鍵檢視所有未分類的相簿。

## v3.0.52 - 2026-07-01

### local-ig.html
- 优化：在「導入更多帖子」彈出視窗（Add Posts Modal）的 Instagram 欄位中直接新增了「Session ID」輸入框，支援與主介面雙向即時同步與自動保存。
- 新增：下載啟動失敗或下載執行中因 Session ID 失效（如報 `cannot_resolve_user_id` / `Forbidden` / `Too Many Requests` 等）而被強制終止時，網頁 UI 會自動彈出輸入窗口（Prompt），允許用戶直接填入新 sessionid，按確認後將會立即自動重新啟動下載任務。

## v3.0.51 - 2026-07-01

### scripts/serve_local_album.py
- 修复：将 `_common.py` 添加到 `BOOTSTRAP_SYNC_FILES` 同步列表中，确保释放至磁盘的 `本地IG/` 目录下，从而解决子进程运行 `ig_download.py` 等脚本时因找不到公共模块而报 `ModuleNotFoundError: No module named '_common'` 的错误。

## v3.0.50 - 2026-07-01

### scripts/serve_local_album.py
- 修复：彻底解决绿色打包版（exe）启动系统 Python 子进程时，临时解压目录（`_MEIPASS` 内的 `python312.dll`）干扰外部 Python 运行产生的 `Module use of python312.dll conflicts...` 版本冲突错误。
- 重构：引入 `get_clean_env()` 清理子进程环境变量；重构 `_resolve_script()` 避开临时解压缩路径，优先从磁盘物理文件夹查找并执行辅助脚本。

## v3.0.49 - 2026-07-01

### ig_download.py / xhs_download.py
- 修复：`_require()` 函数检测到缺少依赖包时，不再直接 `sys.exit(1)` 报错退出，而是自动调用 `pip install` 安装缺失的包并重新导入，确保在任意 Python 环境下开箱即用。

## v3.0.48 - 2026-07-01

### scripts/serve_local_album.py
- 重构：子进程执行方式由 `multiprocessing.Process` 全面重构为 `subprocess.Popen`，彻底解决在打包绿色版（exe）隔离沙箱下无法加载系统 Python 外部 `pip` 依赖包（如 `instaloader`, `playwright` 等）的硬性限制。
- 新增：加入「智能依赖自愈系统」。在服务器启动时，会自动检测并安装缺少的 Python 第三方依赖包（`instaloader`、`requests`、`browser-cookie3`、`deep-translator`、`playwright` 及其 Chromium 浏览器内核），实现开箱即用。

## v3.0.47 - 2026-06-29（BUG 修復批次）

### local-ig.html
- 修复：`fillL2()` 生成 L2 建议下拉时，过滤掉 L2 部分本身是物理大类核心词（如 `吃喝`、`玩乐`）的历史脏标签。修复了 `📸 角度` 的 L2 下拉混入 `下午茶`/`宵夜`/`午` 等吃喝子项的 BUG。

### 磁盘数据修复（一次性手工操作）
- 溶解并删除 `📸 角度/`、`😍 愛好/`、`🇲🇾 馬來西亞/` 3 个非法顶层目录（共 58 个相册帖子已安全展开移至 `未分类/`）。
- 溶解并删除 `未分类/` 下 7 个 `_recovered_N` 包装文件夹（共 96 个相册帖子已安全展开移至 `未分类/`）。
- 所有被移动相册的 `notes.json` 标签数据完整保留，无任何媒体文件损失。



### local-ig.html
- 新增：为 `autoFixStaleAlbumFolderPaths()` 增加终极自愈逻辑。每次加载文件夹后，自动检测位于非核心物理大类目录下的相册，将其物理目录名还原为单纯自定义标签（写入 `notes.json`），并将相册物理移回 `未分类`，彻底消灭因历史 BUG 导入后刷新仍出现非法物理文件夹的现象。
- 优化：`autoFixStaleAlbumFolderPaths()` 内部移除了冗余的内联常量 `PHYSICAL_L1_CORES`，直接复用全局 `FOLDER_L1_CORES`，确保未来大类扩充时自愈逻辑自动同步，杜绝出现两份定义不一致的隐患。

## v3.0.47 - 2026-06-28

### _common.py
- 新增：创建公共底座脚本，归口管理 meta.json 写盘、打开系统文件夹、 debug.log 排障日志等，解决跨脚本逻辑重复与维护隐患。
- 优化：引入 `clean_emoji_and_trim()` 与安全物理大类定义 `VALID_CORES`，确保对一切物理文件夹路径进行严格安全性判定。

### ig_download.py
- 修复：修复在下载循环进度中显示地点的死变量 `loc_str`，支持自动读取 post 地理信息并友好印出。
- 修复：强制实施参数合法性校验，引入 `--count` 与范围模式 `--start/--end` 冲突互斥及 `start > end` 的报错检测。
- 优化：规范化 `TYPE_CHECKING` 标志物与 App ID 独立常数。将 390 行 main 拆分为多个模块化私有函数。
- 修复：加入安全核心类判定过滤。在 `_sync_role1_template_dirs` 模板复制阶段，只允许同步属于核心物理类的子文件夹，彻底屏蔽了任何非法物理标签重新在硬盘被 mkdir 刷出来的恶性循环。

### flat_convert.py / hhcat_convert.py
- 优化：使用 `_common.save_meta_json` 替代各脚本里一字不差的 meta.json 重复写盘逻辑，并统一排障 debug.log 记录。

### serve_local_album.py / scripts/build_release.ps1 / LocalAlbum.spec
- 重构：废除 PyInstaller 每次打包时去编译 5 个独立子 exe 程序的逻辑。改为由主程序同进程通过 `multiprocessing` 异步执行对应 Python 源码脚本，彻底解决多头解压、首次启动速度延迟及 52MB+ 的二进制多余体积开销。
- 优化：移除强行内置的 98MB ffmpeg 依赖（改退避寻找系统已安装的 ffmpeg，若 UI 截图裁剪中侦测不到则给予友好安装提示），将发包大小暴减 85%（包瘦身至 ~20MB）。
- 修复：加入了角色模板复制阶段的核心大类安全过滤检测，彻底根治非法物理文件夹误同步。

## v3.0.46 - 2026-06-28

### local-ig.html
- 优化：彻底对齐卡片和主页标签二分法概念。重构“标签分类管理”弹窗渲染布局，移除了底部多余的“自定義分類”模块，将用户自定义大类（非预设标签，如“音樂”）无缝整合进入统一的主列表，共享统一且高内聚的 L2 子项管理、改名、侦测关键字以及大类删除等业务事件，使得界面视觉干净、逻辑清晰一致。

## v3.0.45 - 2026-06-28

### local-ig.html
- 修复：深度重构了 `getEffectiveHierarchy()` 数据源组装算法。实现了内置静态大类（如“馬來西亞”、“中國”、“台灣”）与物理扫描组（如“吉隆坡”、“北京”）的智能重叠合并去重。消除了物理与静态分身多头管理的逻辑缺陷，彻底解决“部分分类不显示 L2，或者 L2 不正确”的 BUG。
- 优化：重定向 `TagManager` 至深度合并后的有效大类数据。确保用户在管理弹窗中能够完美展开、增加、修改和同步这些物理/内置的二级子分类。

## v3.0.44 - 2026-06-28

### local-ig.html
- 修复：彻底修复了主页 UI 缺失多级自定义大类按钮（如“马来西亚”、“中国”等）的问题。删除了 `isFolderRelatedTag` 内部对 `S.defaultFolderCategories`（所有物理文件夹列表）的一刀切包含判定，防止这些拥有对应磁盘目录的自定义大类在主页渲染时被误杀屏蔽。
- 修复：整改了标签分类管理中的“资料夹”Badge 错标问题。在 `buildFolderDefaultCategoryGroups` 生成时，前置拦截非 `FOLDER_L1_CORES`（即非人、工作、吃喝、行、住、玩乐、备忘）的大类，阻止其作为默认物理组生成，恢复自定义大类的清白标识，确保弹窗和主页大类关系归属完全正确。

## v3.0.43 - 2026-06-28

### local-ig.html
- 修复：解决了由于物理大类 counts 优化而导致物理二级单标签（如“自拍”、“摆拍”、“下午茶”）漏入主页第二排自定义标签筛选区域的 BUG。在 `buildFilterBar` 最终渲染过滤时，引入 `isFolderRelatedTag` 对 L1 大类进行全局物理性判别排除，彻底净化自定义筛选区，且不伤害任何卡片端建议（B）逻辑。

## v3.0.42 - 2026-06-27

### local-ig.html
- 修复：解决了由于一刀切逻辑导致多级自定义标签（如 `MY 馬來西亞/吉隆坡`）被错误剔除的问题。删除了 `isFolderRelatedTag` 中对 `/` 的一刀切过滤，彻底修复了主页 UI 缺标签（图三）以及 L2 无法匹配展现已有选项（图二）的问题。
- 修复：为 `splitAlbumTags` 解耦器引入了内存防卫兜底逻辑，若 `folderTags` 意外变空，可自动从现有合并 tags 中安全反向解析物理标签；并补齐了 `setPrimaryFolderCategoryTag` 后的拆分更新调用。
- 修复：解决了 `buildFilterBar` 统计大类 counts 时对单物理标签（如 `📸 角度`）漏加统计的 BUG。
- 修复：解决了卡片“建议”栏对无关大类进行无差别推荐的 BUG（图一）。在 `refreshSug` 中加入 `hasL1` 大类关联拦截，仅在相册拥有该大类标签时才建议该大类下的 L2 内置子项。

## v3.0.41 - 2026-06-27

### local-ig.html
- 优化：落实物理标签与自定义标签的逻辑层解耦。在相册数据模型中拆分并引入了 `alb.folderTags`（纯只读物理标签）与 `alb.customTags`（纯净自定义标签）属性，通过 `splitAlbumTags` 机制在 `materialize`、`addTag` 和 `removeTag` 流程中实时分离，合并集 `alb.tags` 保持一致以完美向下兼容。
- 优化：重构了 `buildFilterBar`（分类统计 Counts 累加）与 `refreshSug`（快捷分类建议收集），直接分别遍历对应的 `customTags` 和 `folderTags`，从数据源头彻底净化，断绝了任何由于老相册 notes 历史脏数据可能导致的界面筛选和建议召回异常。

## v3.0.40 - 2026-06-27

### local-ig.html
- 修复：解决了建议栏仍可能通过历史相册标签召回错误物理二级子项的问题（如推荐“📸 角度/吃喝”、“📸 角度/市区”等）。现在在 `refreshSug` 历史拉取时，前置引入 `EXCLUSIVE_FOLDER_L2_CORES` 过滤，对于专属物理词，如果不是当前大类在 `TAG_HIERARCHY` 中配置的内置合法子项（如自拍、摆拍、vlog），一律予以强行剔除。
- 修复：解决了在“添加其他”联动输入中，L1 选为“爱好”并点击 L2 框时 L1 被错误覆盖还原为“角度”的跳回问题。在 `bindDatalistAutoTrigger` 的 `blur` 还原中增加了 `input.value === ''` 空判定，并绑定 `input`/`change` 实时事件在选值发生变化时立即清空 `oldVal` 备份，阻断非预期还原。

## v3.0.39 - 2026-06-27

### local-ig.html
- 修复：将物理核心大类“备忘”从 `preferredFolderCategoryOrder` 静态大类顺序配置中彻底移除，解决了最上方物理快捷文件夹横栏里依然残留展示“备忘”按钮的问题。同步更新了相关单元测试校验，确保打包正常。

## v3.0.38 - 2026-06-27

### local-ig.html
- 修复：解决了核心物理文件夹大类（人、工作、吃喝、行、住、玩乐、备忘、未分类）在主页下方的自定义大类筛选行中重复出现的问题。在 `buildFilterBar` 的 `allEntries` 组合时，前置过滤屏蔽任何包含在 `FOLDER_L1_CORES` 中的物理核心大类，使其各司其职（仅在最上方物理行中显示），消除了界面按钮的冗余和重复。

## v3.0.37 - 2026-06-27

### local-ig.html
- 修复：解决了 v3.0.35 中过滤过度导致“📸 角度”、“🇨🇳 中國”、“🇲🇾 馬來西亞”等层级大类被统计为 0 变成灰色不可点击状态的问题。原因为一刀切过滤把复合标签（如 📸 角度/自拍）也连带漏掉了。现将 `isFolderRelatedTag` 的过滤限制于无斜杠单标签（`slash === -1`）分支内，恢复层级大类计数的正确性。

## v3.0.36 - 2026-06-27

### local-ig.html
- 优化：在 `isFolderRelatedTag`（物理标签过滤器）、`buildFolderDefaultCategoryGroups`（L2 分类构建）、`materializeAlbumsFromIndexRecords`（L2 继承提取机制）的核心拦截与映射逻辑中，全部补充了极其详尽、附带业务设计背景与“傻瓜式降级关联性说明”的中文代码备注。防范后续版本维护时由于理解不准导致的误修改或回退。

## v3.0.35 - 2026-06-27

### local-ig.html
- 优化：引入 `isFolderRelatedTag` 综合判断函数。除了拦截带 `-` 连字符的物理标签，还深度支持了智能剔除所有“不带连字符”的二级物理细分文件夹标签（如“下午茶”、“自拍”、“摆拍”、“自驾”等）。这些标签在 `buildFilterBar` 计算自定义大类/标签筛选条目时会被前置百分百过滤，达成主页筛选界面的彻底净化。

## v3.0.34 - 2026-06-27

### local-ig.html
- 修复：彻底解决了 BUG6 衍生的问题（即“📸 角度/吃喝”或“😍 愛好/玩乐”这种与大类常识相悖的建议生成）。当前置剥离后发现二级子分类核心词本身即是核心文件夹大类（如“吃喝”、“玩乐”）之一时，直接归入并标记为该核心大类标签，杜绝将其挂在“角度”或“爱好”等无关大类之下。
- 修复：解决了在下方的自定义标签筛选按钮栏里误显出物理文件夹标签的问题（如“工作-辦公室”、“人-擺拍”等连字符物理标签）。在 `buildFilterBar` 聚合标签时，前置彻底过滤任何带有 `-` 连字符或符合标准二级分类的物理标签，保证自定义标签区绝无任何文件夹标签。

## v3.0.33 - 2026-06-27

### local-ig.html
- 修复：彻底解决了 BUG6 二级物理分类文件夹因采用标准 `L1-L2` 前缀命名时产生的建议标签套娃与缺漏问题（如生成“📸 角度/📸 角度-吃喝”）。在 `buildFolderDefaultCategoryGroups` 和 `materialize` 解析中，前置自动剥离 `-` 连字符大类前缀，提取纯净的 L2 字段进行层级树构建和匹配。
- 优化：重构 `refreshSug` 中的建议收集逻辑。现在不仅静态提取配置的二级项目，还会自动分析并动态收集当前所有相册中已用过的、以“爱好”或“角度”为 L1 前缀的历史 L2 复合标签，使得后续手动及物理建立的“酒馆/餐厅/健身房”等爱好标签全部完美呈现在常驻推荐中。

## v3.0.32 - 2026-06-27

### local-ig.html
- 修复：重新梳理合并并彻底恢复了对 BUG 1, 2, 4, 5 的全部修复代码，杜绝了此前本地 Git checkout 回滚造成的逻辑遗失。
- 修复：对 `store` 里的 `getAlbum` / `setAlbum` 和 `getFav` / `setFav` 接口实施了基于角色名字的缓存 Key 前缀动态附加隔离，使得多角色中同名相册（如“未分类”）的收藏状态、标题及描述等完全分立存放，彻底根治了跨相册缓存互相串台和标签污染的 BUG5 问题。
- 优化：限制自动检测标签函数 `autoDetectTags`，只允许其提取并匹配数据库中已存在的标签集合（通过新引入的 `getExistingTagsSet` 精准收集），绝对不随意“凭空创新”标签，保持相册标签管理的纯净一致。

## v3.0.31 - 2026-06-27

### local-ig.html
- 修复：彻底解决了 BUG3 中建议标签繁简体混杂重复展示的问题（如“第一视角”与“第一視角”同时出现在推荐栏中）。通过为 `TAG_HIERARCHY` 精确补全简繁本地化映射，并调整 `tagName` 优先级以保证简体环境下只生成简体词，成功将角度及节日相关的二级标签与快捷标签完美重合，并在 `indexOf` 去重后仅保留唯一的简体项，使建议界面绝对干净整洁。

## v3.0.30 - 2026-06-27

### local-ig.html
- 优化：补全 `TAG_HIERARCHY` 中 `📸 角度`、`🎉 節日` 大类下二级分类的简繁多语言翻译字段，并重构 `tagName` 函数使之在简体中文 `zh-CN` 语言环境下优先匹配和返回简体字字面量（如“第一视角”、“摆拍”、“圣诞”等），彻底消除了推荐栏与已有标签中简繁体混杂重复的视觉隐患。
- 优化：重构 `refreshSug` 中常驻二级分类标签推荐收集器，由单纯“找第一个匹配的‘爱好’组”升级为“遍历合并所有匹配‘爱好’及‘角度’核心字眼的组”，将其旗下所有二级复合子项强制常驻建议区，解决了 BUG3 二级标签缺漏推荐的问题。
- 修复：重构标签输入框 `bindDatalistAutoTrigger` 监听器，改用 `mousedown` 拦截右侧倒三角区域的点击，并通过 `e.preventDefault()` 屏蔽浏览器默认的前缀过滤与触发逻辑，手动聚焦并清空输入值，在 50ms 延迟（以保证空值渲染完毕）后调用 `input.showPicker()`。这彻底克服了在标签框中已有旧值时，点击原生倒三角小箭头无法展开全部列表的 BUG1 问题。

## v3.0.29 - 2026-06-26

### local-ig.html
- 优化：限制自动侦测标签（autoDetectTags）逻辑，杜绝产生前所未有的“创新”新标签，仅基于系统内置层级或已有相册中实际存在的合法标签提供建议。
- 优化：清除建议标签（Tag Suggestion）中内置大类分类（hierarchyL1）的推荐，保持推荐的干净与简洁。
- 优化：强制自动在建议标签中推荐一级大类“😍 愛好”下的所有 L2 二级复合分类标签。
- 优化：增强建议标签（Tag Suggestion）的点击事件与标准分类识别机制。支持传入带斜杠的复合物理分类（例如 `人/人-自拍`），并在点击时自动安全提取其末级子分类字段（如 `人-自拍`）传入 `setPrimaryFolderCategoryTag`。这彻底避免了用户在标签编辑器推荐行中点击建议的复合斜杠标签时，系统因无法提取标准分类而只添加文本但不触发物理移库移动文件夹的逻辑 Bug。
- 修复：解决 BUG1 “输入框写入内容后，原生下拉小指示箭头无法点击查看其他选项” 的问题。在 CSS 中优化了小箭头的点击热区和 cursor 指针；在 JS 中除了 focus 和 click 之外，新增绑定了 `pointerdown` 全选事件，利用在浏览器默认展开 datalist 前触发的文字全选状态拉起全部选项列表，彻底解决小箭头写入后无法看列表其他选项的问题。
- 修复：解决 BUG2 “标签列表选项依然存在没有使用的内置大类（如‘居家’）或已废弃大类（如‘备忘’）” 的问题。重构 `fillL1` 逻辑，除了常用核心大类（📸角度、😍爱好等）常驻外，偏僻大类如果未在任何相册中实际使用过，将彻底不显示在 datalist 选项中。
- 修复：解决 BUG3 “建议栏缺漏推荐‘摆拍’、‘第一视角’等二级分类以及爱好者 L2 标签” 的问题。修改建议标签的 filter 逻辑，将 startsWith 的前缀父类屏蔽改为精确的 includes 屏蔽，解除因相册已有大类而屏蔽该大类下其他子类的错误推荐拦截。
- 修复：解决 BUG4 “主页把空的物理大类/二级标准分类文件夹错当成相册卡片显示” 的问题。修改 `readFolder` 逻辑，对于空的标准分类物理文件夹（`kind === 'empty'`），仅将其加入 `detectedCategories` 作为检测分类以供菜单使用，绝对不再将其作为空相册塞入相册卡片列表中渲染。
- 修复：解决 BUG5 “主页 UI 出现不属于该角色相册拥有的自定义标签（如‘盐湖城’），及打卡等幽灵空卡片” 的问题。修改 tags 的继承规则：如果物理 `notes.json` 备注文件已存在（`nd !== null`），则完全信任物理 `notes.json` 的 tags，不再降级去读取 `localStorage` 中的全局共享缓存。这彻底切断了跨重名相册（例如不同角色下都叫“打卡”、“未分类”）在 localStorage 中对缓存标签的跨相册污染，防止了幽灵卡片与不相干标签的溢出。
- 修复：解决“点击标签框后弹出的 datalist 选项中包含了不存在的标签” 的问题。在 `fillFolder`、`fillL1` 和 `fillL2` 中进行严格的数据有效性清洗，彻底清洗并移除了不合法的复合面包屑路径标签。

## v3.0.28 - 2026-06-21

### local-ig.html
- 修复：优化物理文件夹移库安全与容错。在 `moveAlbumFolderToCategory` 中将更新内存属性与相对路径操作提前至删除旧目录之前，并使用 `try-catch` 保护旧目录删除操作，彻底防范 Windows 下因文件被浏览器占用抛出 `AccessDenied` 导致移库状态中断及后续“打开文件夹”功能失效的问题。
- 修复：修复 `readFolder` 绝对物理路径自适应拼接逻辑。彻底规避了因启动目录环境差异（如在“本地IG”内部双击运行或外部双击运行）导致 `info.root` 结尾自带或不带“本地IG”引发的前端绝对路径多重拼装（拼装出 `.../本地IG/本地IG/角色`）的重大缺陷，恢复了“打开文件夹”功能。

## v3.0.27 - 2026-06-18

### local-ig.html
- 修复：修复在角色根目录下打开时（S.rootName 与当前角色相同），物理移库与自动纠偏在比对期望相对路径时错误重复叠加拼装角色前缀的 BUG，解决了反复物理移库引发的标签与物理层级混乱问题。
- 修复：修正 `readFolder` 物理路径自动加载和拼接时，在角色根目录子路径下漏掉 `本地IG`（引导目录）物理层级的 Bug，修复了改标签后或正常访问下点击“打开文件夹”无法直接呼出 Windows 资源管理器的故障。

### scripts/serve_local_album.py
- 优化：在后端 `__get_server_info__` 路由中返回实际的 `bootstrap_dir` (即“本地IG”) 引导目录字段，以便前端动态适应多路径下的绝对物理路径构建。

## v3.0.26 - 2026-06-18

### local-ig.html
- 重构：优化标签树层级规范化，`buildCanonicalFolderCategoryTags` 改为只生成组合层级格式标签（如 `住/住-旅店`），不再生成独立的单层级大类（`住`）和细分类（`住-旅店`）标签。
- 优化：引入 `cleanupStaleFolderTags` 标签深度清洗机制，在相册加载反序列化和手动更新分类时，全自动合并、重构与净化历史残留或不规范的散乱单层大类及小类标签碎片，实现完美无暇的层级树状展现。

## v3.0.25 - 2026-06-18

### local-ig.html
- 重构：全面拉平与扁平化物理分类路径继承与标签管理。在 `materializeAlbumsFromIndexRecords` 中引入基于路径精确解析的扁平继承逻辑，仅生成直接对应的叶子标签而不再向上冗余生成一级大类。
- 修复：解决修改标签时一级大类与二级分类多系列标签残留及跨系列共存的 Bug。
- 修复：删除了“备忘”系列以及“行-地铁”分类，并将“人”、“工作”、“行”、“住”等补齐为平级的标准物理分类，实现各分类逻辑相互独立且在物理层级上完全扁平共存。

### scripts/serve_local_album.py
- 重构：更新 `STANDARD_SECOND_LEVEL_FOLDERS` 标准物理分类列表，对齐前端的模板文件夹自动生成逻辑。

## v3.0.24 - 2026-06-18

### local-ig.html
- 修复：解决物理归档路径组织中空标准分类文件夹占位符（0张照片的相册记录）被误移库，导致产生无限循环递归创建 `玩乐/玩乐/玩乐/...` 的严重 Bug。在 `moveAlbumFolderToCategory` 和 `autoFixStaleAlbumFolderPaths` 中增加了空相册拦截和分类自嵌套防护逻辑。

## v3.0.23 - 2026-06-18

### local-ig.html
- 修复：重构 `getPrimaryFolderCategoryTag`，确立“二级细分类匹配优先级高于一级大类”原则。防止相册同时带大类与细分类标签时被错误归档至物理大类下。
- 修复：解决空标准分类蒸发 Bug。合并 `STANDARD_SECOND_LEVEL_FOLDERS` 与物理检测得到的 `detectedCategories`，确保未建物理文件夹的标准二级分类在顶栏及移库菜单中永久常驻。
- 重构：全面重构顶栏大类筛选及过滤交互。点击一级分类大按钮（如 `玩乐`）时，展开其旗下二级分类的同时**只展示直接属于大类本身（未被分配到二级分类）的相册卡片组**。再次点击二级细分类（如 `玩乐-旅行`）才展示相应细分卡片。同时，在二级面包屑中隐去已多余的虚拟未分类按钮。

## v3.0.22 - 2026-06-18

### local-ig.html
- 重构：将文件夹物理归档校验与移库逻辑由“基于不确定相对路径分类的正则猜测”升级为“基于相册权威标签的期望物理相对路径严格比对”。
- 优化：引入严格比对校验，只有当第一级子目录在 `getOnlyPhysicalRoles()` 物理角色黑名单剔除结果中时，才在 `parseFolderRelPath` 中认作 `role`；同时，直接计算“期望物理路径”与“当前物理路径”并比对决定是否移动。这彻底解决了嵌套在错位非角色大类（如 `角度/工作-办公室/`）下的文件夹无法被自动校对、搬迁和物理归位的严重 Bug。

## v3.0.21 - 2026-06-18

### local-ig.html
- 修复：修复在多角色自动物理归档中，系统内置硬编码大类（如 `📸 角度`、`😍 愛好` 等）由于不含 `_custom` 属性而依然被误认作物理“角色文件夹前缀”的严重 Bug。
- 优化：引入专门的物理角色推导函数 `getOnlyPhysicalRoles()`，在物理移库、手动设置及文件夹分类判定时，将所有内置预设 `TAG_HIERARCHY` 标签及用户自定义普通一级大类全部干净排除，只采信真正的物理角色文件夹名（如 `jovy_irwin`、`角色1` 等），彻底解决被误迁移至 `角度/工作-办公室` 等非角色前缀物理路径的 Bug。

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
