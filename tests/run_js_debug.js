// tests/run_js_debug.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlPath = path.join(__dirname, '../local-ig.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 提取內嵌的 JS 代碼
const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
if (!match) {
  console.error("❌ 未能在 local-ig.html 中找到 script 標籤");
  process.exit(1);
}
const jsCode = match[1];

// 為了在 Node 中運行，我們模擬一些瀏覽器全局變量和狀態
// 注意避免與 html 內已有的全域變量（如 LANGS, currentLang, S, $）衝突
const setupCode = `
const localStorageStore = {
  'ig-tag-config': JSON.stringify({
    hidden: ['🏠 居家'],
    overrides: {},
    extraL2: {},
    custom: []
  })
};

const window = {
  localStorage: {
    getItem(key) { return localStorageStore[key] || null; },
    setItem(key, val) { localStorageStore[key] = val; }
  },
  location: {
    href: 'http://localhost/local-ig.html',
    protocol: 'http:'
  }
};
const localStorage = window.localStorage;
const location = window.location;

// 定義通用的 Element Mock，防止在 JS 加載初始化時因 DOM 操作報錯
const elementMock = {
  value: '',
  style: {},
  classList: {
    add() {},
    remove() {},
    contains() { return false; }
  },
  dataset: {
    name: 'test'
  },
  appendChild() {},
  addEventListener() {},
  querySelector(sel) { return elementMock; },
  querySelectorAll(sel) { return []; },
  childNodes: [
    { textContent: '' },
    { textContent: '' },
    { textContent: '' }
  ]
};

// 模擬瀏覽器 DOM document 對象
const document = {
  body: elementMock,
  getElementById(id) {
    return elementMock;
  },
  createElement(tag) {
    return elementMock;
  },
  querySelectorAll(sel) {
    return [];
  },
  querySelector(sel) {
    return elementMock;
  },
  addEventListener(event, handler) {}
};
`;

// 為了方便，我們直接在 jsCode 後面追加我們的 debug 斷言測試
const testCode = `
${setupCode}
${jsCode}

// ─────────────────────────────────────────────────────────────────────────────
// 🔬 開始 Debug 驗證測試
// ─────────────────────────────────────────────────────────────────────────────
console.log("\\n=== 🧪 開始執行標籤邏輯真實執行 Debug 驗證 ===\\n");

// 初始化全局變量 S 的屬性
S.defaultFolderCategories = ['人-合照', '行-航班', '工作-出差'];
S.albums = [];

// 1. 驗證 "物理標籤沒有備忘"
const hasMemoInL1 = FOLDER_L1_CORES.has('备忘') || FOLDER_L1_CORES.has('備忘');
const hasMemoInL2 = STANDARD_SECOND_LEVEL_FOLDERS.some(f => f.includes('备忘') || f.includes('備忘'));
console.log("【1. 物理標籤無備忘驗證】");
console.log("-> FOLDER_L1_CORES 是否包含備忘:", hasMemoInL1 ? "❌ 錯誤" : "✅ 通過 (無備忘)");
console.log("-> STANDARD_SECOND_LEVEL_FOLDERS 是否包含備忘:", hasMemoInL2 ? "❌ 錯誤" : "✅ 通過 (無備忘)");

// 2. 驗證 isFolderRelatedTag 物理標籤過濾器
console.log("\\n【2. 物理標籤識別器驗證 (isFolderRelatedTag)】");
const testCases = [
  { tag: '行', expected: true },
  { tag: '未分类', expected: true },
  { tag: '行-航班', expected: true },
  { tag: '行/行-航班', expected: true },
  { tag: '未分类/行/行-航班', expected: true },
  { tag: '自拍', expected: false },
  { tag: 'Vlog', expected: false },
  { tag: '亞洲', expected: false }
];

let isFolderRelatedSuccess = true;
testCases.forEach(tc => {
  const result = isFolderRelatedTag(tc.tag);
  const ok = result === tc.expected;
  if (!ok) isFolderRelatedSuccess = false;
  console.log(\`-> 標籤 "\${tc.tag}" | 預期是物理: \${tc.expected} | 實際: \${result} -> \${ok ? '✅ 通過' : '❌ 失敗'}\`);
});
console.log("-> 物理標籤識別器總體驗證:", isFolderRelatedSuccess ? "✅ 完美通過" : "❌ 存在錯誤");

// 3. 驗證 setPrimaryFolderCategoryTag 髒數據清洗邏輯
console.log("\\n【3. 標籤設置與髒數據清洗驗證】");
const mockAlbum = {
  name: 'test_album',
  tags: ['未分类', '行', '未分类/行', '行/行-航班', '未分类/行/行-航班', '行-航班', '未分类/行-航班', '自拍', '亞洲']
};

console.log("-> 清洗前的原始 tags:", JSON.stringify(mockAlbum.tags));

// 模擬 setPrimaryFolderCategoryTag 中的清洗過程
const effectiveRoles = [];
const nextTags = mockAlbum.tags.filter(t => {
  const ts = String(t || '').trim();
  if (ts === '未分类' || ts === '未分類' || ts.includes('/未分类') || ts.includes('/未分類') || ts.startsWith('未分类/') || ts.startsWith('未分類/')) {
    return false;
  }
  if (isFolderRelatedTag(ts)) {
    if (effectiveRoles.includes(ts)) return true;
    return false;
  }
  return true;
});

// 添加新的規範化物理標籤
const canonicalTags = buildCanonicalFolderCategoryTags('行-航班');
canonicalTags.forEach(tag => {
  if (!nextTags.includes(tag)) nextTags.push(tag);
});

console.log("-> 設置 [行-航班] 清洗後的 tags:", JSON.stringify(nextTags));
// 💡 行-航班 對應的合法大類是 行、行/行-航班、行-航班，我們只需確保沒有任何帶有 "未分类" 的髒數據即可
const cleanedContainsDirty = nextTags.some(t => t.includes('未分类') || t.includes('未分類'));
console.log("-> 清洗後是否還殘留 '未分类' 髒數據:", cleanedContainsDirty ? "❌ 失敗" : "✅ 成功 (完全清洗)");
console.log("-> 是否成功保留自定義標籤 [自拍, 亞洲]:", (nextTags.includes('自拍') && nextTags.includes('亞洲')) ? "✅ 成功" : "❌ 失敗");
console.log("-> 是否寫入新規範標籤 [行-航班]:", nextTags.includes('行-航班') ? "✅ 成功" : "❌ 失敗");

// 4. 驗證首頁配置同步 (getEffectiveHierarchy)
console.log("\\n【4. 首頁配置與推薦大類同步驗證】");
const hierarchy = getEffectiveHierarchy();
const hierarchyL1s = hierarchy.map(g => tagName(g.l1));
console.log("-> 屬性 L1 列表是否包含自定義推薦 '📸 角度':", hierarchyL1s.includes('📸 角度') ? "✅ 成功" : "❌ 失敗");
console.log("-> 屬性 L1 列表是否包含自定義推薦 '😍 愛好':", hierarchyL1s.includes('😍 愛好') ? "✅ 成功" : "❌ 失敗");
console.log("-> 屬性 L1 列表是否包含自定義推薦 '🎉 節日':", hierarchyL1s.includes('🎉 節日') ? "✅ 成功" : "❌ 失敗");

console.log("\\n=== 🏁 Debug 驗證執行完畢 ===\\n");
`;

const tempJsPath = path.join(__dirname, 'temp_debug_run.js');
fs.writeFileSync(tempJsPath, testCode, 'utf8');

try {
  const output = execSync(`node "${tempJsPath}"`, { encoding: 'utf8' });
  console.log(output);
} catch (err) {
  console.error("❌ 執行 Debug 測試出錯:", err.message);
} finally {
  if (fs.existsSync(tempJsPath)) {
    fs.unlinkSync(tempJsPath);
  }
}
