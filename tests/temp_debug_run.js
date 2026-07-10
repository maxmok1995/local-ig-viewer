

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



'use strict';

const IMG_EXT = /\.(jpe?g|jpg|png|webp|heic|heif|gif|avif|bmp)$/i;

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

const STORE_KEY = 'local-ig-v1';

const L2_UNCLASSIFIED = '/__unclassified__'; // 虚拟 L2 key：有 L1 但无该 L1 下任何 L2



// ── 國家關鍵字庫（多語言）────────────────────────────────────────────────────

// 每個 entry：{ 'zh-TW':顯示名, 'zh-CN':..., en:..., ja:..., ko:..., th:..., kw:[偵測關鍵字] }

const COUNTRY_MAP = [

  {'zh-TW':'🇯🇵 日本','zh-CN':'🇯🇵 日本','en':'🇯🇵 Japan','ja':'🇯🇵 日本','ko':'🇯🇵 일본','th':'🇯🇵 ญี่ปุ่น',

   kw:['japan','日本','tokyo','東京','osaka','大阪','kyoto','京都','sapporo','札幌','fukuoka','福岡','nara','奈良','hiroshima','廣島','okinawa','沖繩','nagoya','名古屋']},

  {'zh-TW':'🇰🇷 韓國','zh-CN':'🇰🇷 韩国','en':'🇰🇷 South Korea','ja':'🇰🇷 韓国','ko':'🇰🇷 한국','th':'🇰🇷 เกาหลีใต้',

   kw:['korea','韓國','한국','seoul','首爾','busan','釜山','jeju','濟州','incheon','仁川']},

  {'zh-TW':'🇹🇼 台灣','zh-CN':'🇹🇼 台湾','en':'🇹🇼 Taiwan','ja':'🇹🇼 台湾','ko':'🇹🇼 대만','th':'🇹🇼 ไต้หวัน',

   kw:['taiwan','台灣','台湾','taipei','台北','tainan','台南','kaohsiung','高雄','hualien','花蓮','taichung','台中']},

  {'zh-TW':'🇹🇭 泰國','zh-CN':'🇹🇭 泰国','en':'🇹🇭 Thailand','ja':'🇹🇭 タイ','ko':'🇹🇭 태국','th':'🇹🇭 ไทย',

   kw:['thailand','泰國','泰国','bangkok','曼谷','phuket','普吉','chiang mai','清邁','pattaya','芭提雅','koh samui']},

  {'zh-TW':'🇺🇸 美國','zh-CN':'🇺🇸 美国','en':'🇺🇸 USA','ja':'🇺🇸 アメリカ','ko':'🇺🇸 미국','th':'🇺🇸 สหรัฐอเมริกา',

   kw:['usa','united states','america','美國','美国','new york','紐約','los angeles','san francisco','chicago','miami','hawaii','夏威夷','las vegas','boston','seattle']},

  {'zh-TW':'🇫🇷 法國','zh-CN':'🇫🇷 法国','en':'🇫🇷 France','ja':'🇫🇷 フランス','ko':'🇫🇷 프랑스','th':'🇫🇷 ฝรั่งเศส',

   kw:['france','法國','法国','paris','巴黎','lyon','nice','尼斯','marseille','bordeaux']},

  {'zh-TW':'🇮🇹 義大利','zh-CN':'🇮🇹 意大利','en':'🇮🇹 Italy','ja':'🇮🇹 イタリア','ko':'🇮🇹 이탈리아','th':'🇮🇹 อิตาลี',

   kw:['italy','italia','義大利','意大利','rome','羅馬','milan','米蘭','venice','威尼斯','florence','佛羅倫斯','naples','amalfi']},

  {'zh-TW':'🇬🇧 英國','zh-CN':'🇬🇧 英国','en':'🇬🇧 UK','ja':'🇬🇧 イギリス','ko':'🇬🇧 영국','th':'🇬🇧 สหราชอาณาจักร',

   kw:['uk','england','britain','英國','英国','london','倫敦','edinburgh','愛丁堡','manchester','oxford']},

  {'zh-TW':'🇩🇪 德國','zh-CN':'🇩🇪 德国','en':'🇩🇪 Germany','ja':'🇩🇪 ドイツ','ko':'🇩🇪 독일','th':'🇩🇪 เยอรมนี',

   kw:['germany','德國','德国','berlin','柏林','munich','慕尼黑','hamburg','frankfurt','cologne']},

  {'zh-TW':'🇦🇺 澳洲','zh-CN':'🇦🇺 澳大利亚','en':'🇦🇺 Australia','ja':'🇦🇺 オーストラリア','ko':'🇦🇺 호주','th':'🇦🇺 ออสเตรเลีย',

   kw:['australia','澳洲','澳大利亚','sydney','雪梨','melbourne','墨爾本','perth','brisbane','gold coast','黃金海岸']},

  {'zh-TW':'🇭🇰 香港','zh-CN':'🇭🇰 香港','en':'🇭🇰 Hong Kong','ja':'🇭🇰 香港','ko':'🇭🇰 홍콩','th':'🇭🇰 ฮ่องกง',

   kw:['hong kong','香港','hk']},

  {'zh-TW':'🇨🇳 中國','zh-CN':'🇨🇳 中国','en':'🇨🇳 China','ja':'🇨🇳 中国','ko':'🇨🇳 중국','th':'🇨🇳 จีน',

   kw:['china','中國','中国','beijing','北京','shanghai','上海','guangzhou','廣州','shenzhen','深圳','chengdu','成都','hangzhou','杭州']},

  {'zh-TW':'🇸🇬 新加坡','zh-CN':'🇸🇬 新加坡','en':'🇸🇬 Singapore','ja':'🇸🇬 シンガポール','ko':'🇸🇬 싱가포르','th':'🇸🇬 สิงคโปร์',

   kw:['singapore','新加坡']},

  {'zh-TW':'🇲🇾 馬來西亞','zh-CN':'🇲🇾 马来西亚','en':'🇲🇾 Malaysia','ja':'🇲🇾 マレーシア','ko':'🇲🇾 말레이시아','th':'🇲🇾 มาเลเซีย',

   kw:['malaysia','馬來西亞','马来西亚','kuala lumpur','吉隆坡','penang','檳城','malacca','馬六甲']},

  {'zh-TW':'🇮🇩 印尼','zh-CN':'🇮🇩 印度尼西亚','en':'🇮🇩 Indonesia','ja':'🇮🇩 インドネシア','ko':'🇮🇩 인도네시아','th':'🇮🇩 อินโดนีเซีย',

   kw:['indonesia','印尼','bali','巴厘島','峇里島','jakarta','雅加達','lombok']},

  {'zh-TW':'🇵🇭 菲律賓','zh-CN':'🇵🇭 菲律宾','en':'🇵🇭 Philippines','ja':'🇵🇭 フィリピン','ko':'🇵🇭 필리핀','th':'🇵🇭 ฟิลิปปินส์',

   kw:['philippines','菲律賓','菲律宾','manila','cebu','宿霧','palawan','巴拉望']},

  {'zh-TW':'🇻🇳 越南','zh-CN':'🇻🇳 越南','en':'🇻🇳 Vietnam','ja':'🇻🇳 ベトナム','ko':'🇻🇳 베트남','th':'🇻🇳 เวียดนาม',

   kw:['vietnam','越南','hanoi','河內','ho chi minh','胡志明','da nang','峴港','hoi an','會安']},

  {'zh-TW':'🇪🇸 西班牙','zh-CN':'🇪🇸 西班牙','en':'🇪🇸 Spain','ja':'🇪🇸 スペイン','ko':'🇪🇸 스페인','th':'🇪🇸 สเปน',

   kw:['spain','西班牙','barcelona','巴塞羅那','madrid','馬德里','seville','ibiza','伊比薩']},

  {'zh-TW':'🇵🇹 葡萄牙','zh-CN':'🇵🇹 葡萄牙','en':'🇵🇹 Portugal','ja':'🇵🇹 ポルトガル','ko':'🇵🇹 포르투갈','th':'🇵🇹 โปรตุเกส',

   kw:['portugal','葡萄牙','lisbon','里斯本','porto','波爾圖']},

  {'zh-TW':'🇬🇷 希臘','zh-CN':'🇬🇷 希腊','en':'🇬🇷 Greece','ja':'🇬🇷 ギリシャ','ko':'🇬🇷 그리스','th':'🇬🇷 กรีซ',

   kw:['greece','希臘','希腊','athens','雅典','santorini','聖托里尼','mykonos','米科諾斯']},

  {'zh-TW':'🇹🇷 土耳其','zh-CN':'🇹🇷 土耳其','en':'🇹🇷 Turkey','ja':'🇹🇷 トルコ','ko':'🇹🇷 튀르키예','th':'🇹🇷 ตุรกี',

   kw:['turkey','土耳其','istanbul','伊斯坦堡','cappadocia','卡帕多奇亞']},

  {'zh-TW':'🇮🇳 印度','zh-CN':'🇮🇳 印度','en':'🇮🇳 India','ja':'🇮🇳 インド','ko':'🇮🇳 인도','th':'🇮🇳 อินเดีย',

   kw:['india','印度','mumbai','孟買','delhi','德里','goa','果阿','jaipur','齋浦爾']},

  {'zh-TW':'🇨🇭 瑞士','zh-CN':'🇨🇭 瑞士','en':'🇨🇭 Switzerland','ja':'🇨🇭 スイス','ko':'🇨🇭 스위스','th':'🇨🇭 สวิตเซอร์แลนด์',

   kw:['switzerland','瑞士','zurich','蘇黎世','geneva','日內瓦','interlaken','因特拉肯']},

  {'zh-TW':'🇦🇹 奧地利','zh-CN':'🇦🇹 奥地利','en':'🇦🇹 Austria','ja':'🇦🇹 オーストリア','ko':'🇦🇹 오스트리아','th':'🇦🇹 ออสเตรีย',

   kw:['austria','奧地利','奥地利','vienna','維也納','salzburg','薩爾茨堡']},

  {'zh-TW':'🇳🇱 荷蘭','zh-CN':'🇳🇱 荷兰','en':'🇳🇱 Netherlands','ja':'🇳🇱 オランダ','ko':'🇳🇱 네덜란드','th':'🇳🇱 เนเธอร์แลนด์',

   kw:['netherlands','荷蘭','荷兰','amsterdam','阿姆斯特丹']},

  {'zh-TW':'🇨🇿 捷克','zh-CN':'🇨🇿 捷克','en':'🇨🇿 Czech Republic','ja':'🇨🇿 チェコ','ko':'🇨🇿 체코','th':'🇨🇿 สาธารณรัฐเช็ก',

   kw:['czech','捷克','prague','布拉格']},

  {'zh-TW':'🇲🇽 墨西哥','zh-CN':'🇲🇽 墨西哥','en':'🇲🇽 Mexico','ja':'🇲🇽 メキシコ','ko':'🇲🇽 멕시코','th':'🇲🇽 เม็กซิโก',

   kw:['mexico','墨西哥','cancun','坎昆','mexico city','墨西哥城']},

  {'zh-TW':'🇧🇷 巴西','zh-CN':'🇧🇷 巴西','en':'🇧🇷 Brazil','ja':'🇧🇷 ブラジル','ko':'🇧🇷 브라질','th':'🇧🇷 บราซิล',

   kw:['brazil','巴西','rio','里約','sao paulo','聖保羅']},

  {'zh-TW':'🇲🇦 摩洛哥','zh-CN':'🇲🇦 摩洛哥','en':'🇲🇦 Morocco','ja':'🇲🇦 モロッコ','ko':'🇲🇦 모로코','th':'🇲🇦 โมร็อกโก',

   kw:['morocco','摩洛哥','marrakech','馬拉喀什']},

  {'zh-TW':'🇿🇦 南非','zh-CN':'🇿🇦 南非','en':'🇿🇦 South Africa','ja':'🇿🇦 南アフリカ','ko':'🇿🇦 남아프리카','th':'🇿🇦 แอฟริกาใต้',

   kw:['south africa','南非','cape town','開普敦']},

  {'zh-TW':'🇮🇸 冰島','zh-CN':'🇮🇸 冰岛','en':'🇮🇸 Iceland','ja':'🇮🇸 アイスランド','ko':'🇮🇸 아이슬란드','th':'🇮🇸 ไอซ์แลนด์',

   kw:['iceland','冰島','冰岛','reykjavik','雷克雅維克']},

  {'zh-TW':'🇳🇴 挪威','zh-CN':'🇳🇴 挪威','en':'🇳🇴 Norway','ja':'🇳🇴 ノルウェー','ko':'🇳🇴 노르웨이','th':'🇳🇴 นอร์เวย์',

   kw:['norway','挪威','oslo','奧斯陸','bergen','卑爾根','fjord','峽灣']},

  {'zh-TW':'🇸🇪 瑞典','zh-CN':'🇸🇪 瑞典','en':'🇸🇪 Sweden','ja':'🇸🇪 スウェーデン','ko':'🇸🇪 스웨덴','th':'🇸🇪 สวีเดน',

   kw:['sweden','瑞典','stockholm','斯德哥爾摩']},

  {'zh-TW':'🇩🇰 丹麥','zh-CN':'🇩🇰 丹麦','en':'🇩🇰 Denmark','ja':'🇩🇰 デンマーク','ko':'🇩🇰 덴마크','th':'🇩🇰 เดนมาร์ก',

   kw:['denmark','丹麥','丹麦','copenhagen','哥本哈根']},

  {'zh-TW':'🇵🇱 波蘭','zh-CN':'🇵🇱 波兰','en':'🇵🇱 Poland','ja':'🇵🇱 ポーランド','ko':'🇵🇱 폴란드','th':'🇵🇱 โปแลนด์',

   kw:['poland','波蘭','波兰','warsaw','華沙','krakow','克拉科夫']},

  {'zh-TW':'🇦🇷 阿根廷','zh-CN':'🇦🇷 阿根廷','en':'🇦🇷 Argentina','ja':'🇦🇷 アルゼンチン','ko':'🇦🇷 아르헨티나','th':'🇦🇷 อาร์เจนตินา',

   kw:['argentina','阿根廷','buenos aires','布宜諾斯艾利斯','patagonia','巴塔哥尼亞']},

];



// ── 兩級標簽層次（L1 + L2 子項）────────────────────────────────────────────

// ── 常用自定義推薦標籤（僅用於點擊生成與輸入推薦，非物理資料夾） ───────────────────────────

const RECOMMENDED_CUSTOM_TAGS = [

  // 📸 角度：拍攝角度快捷推薦，加入 Vlog 快捷項

  { l1:{zh:'📸 角度',en:'📸 Angle',th:'📸 มุมกล้อง',ja:'📸 角度',ko:'📸 각도'},

    kw:['角度','视角','視野','摄影角度','拍摄角度','มุมกล้อง','angle','pov','view'],

    children:[

      {l2:{zh:'自拍','zh-CN':'自拍','zh-TW':'自拍',en:'Selfie',th:'เซลฟี่',ja:'自撮り',ko:'셀카'},kw:['自拍','selfie','自撮','셀카','เซลฟี่']},

      {l2:{zh:'第一視角','zh-CN':'第一视角','zh-TW':'第一視角',en:'POV',th:'มุมมองบุคคลที่หนึ่ง',ja:'一人称視点',ko:'1인칭 시점'},kw:['第一视角','第一視角','第一人称','第一人稱','pov','first person']},

      {l2:{zh:'擺拍','zh-CN':'摆拍','zh-TW':'擺拍',en:'Posed',th:'โพ斯ท่า',ja:'ポーズ',ko:'포즈'},kw:['摆拍','擺拍','pose','posing','擺姿勢','摆姿势','포즈']},

      {l2:{zh:'Vlog','zh-CN':'Vlog','zh-TW':'Vlog',en:'Vlog',th:'Vlog',ja:'Vlog',ko:'Vlog'},kw:['vlog','影片','記錄','日常记录']},

    ]

  },

  // 😍 愛好：L2 推薦改為運行時動態統計，此處僅保留大類佔位

  { l1:{zh:'😍 愛好',en:'😍 Hobby',th:'😍 งานอดิเรก',ja:'😍 趣味',ko:'😍 취미'},

    kw:['愛好','hobby','興趣','兴趣','喜好'],

    _dynamicL2:true

  },

  // 🎉 節日：純自定義推薦標籤（不對應物理文件夾，無需物理移庫）

  { l1:{zh:'🎉 節日',en:'🎉 Festival',th:'🎉 เทศกาล',ja:'🎉 記念日',ko:'🎉 기념일'},

    kw:['節日','节日','假日','holiday','celebration','慶祝','庆祝'],

    children:[

      {l2:{zh:'生日',en:'Birthday',th:'วันเกิด',ja:'誕生日',ko:'생일'},kw:['生日','birthday','happy birthday','hbd']},

      {l2:{zh:'聖誕',en:'Christmas',th:'คริสต์มาส',ja:'クリスマス',ko:'크리스마스'},kw:['christmas','聖誕','圣诞','xmas']},

      {l2:{zh:'新年',en:'New Year',th:'ปีใหม่',ja:'新年',ko:'새해'},kw:['new year','新年','春節','春节','元旦']},

      {l2:{zh:'中秋',en:'Mid-Autumn',th:'ไหว้พระจันทร์',ja:'中秋',ko:'추석'},kw:['中秋','moon festival','月餅','月饼']},

      {l2:{zh:'情人節',en:"Valentine's",th:'วาเลนไทน์',ja:'バレンタイン',ko:'발렌타인'},kw:["valentine","情人節","情人节"]},

      {l2:{zh:'婚禮',en:'Wedding',th:'งานแต่งงาน',ja:'結婚式',ko:'결혼식'},kw:['wedding','婚禮','婚礼','結婚','结婚','anniversary','紀念','纪念']},

    ]

  },



  // 🇨🇳 中國：純自定義推薦標籤（不對應物理文件夾）

  { l1:{zh:'🇨🇳 中國',en:'🇨🇳 China',th:'🇨🇳 ประเทศจีน',ja:'🇨🇳 中国',ko:'🇨🇳 중국'},

    kw:['中國','中国','china','北京','上海','廣州','深圳','成都','重慶','杭州','西安','南京','武漢','蘇州','苏州','廣東','广东'],

    _useLocationAsL2:true

  },

  // 🇹🇼 台灣：純自定義推薦標籤（不對應物理文件夾）

  { l1:{zh:'🇹🇼 台灣',en:'🇹🇼 Taiwan',th:'🇹🇼 ไต้หวัน',ja:'🇹🇼 台湾',ko:'🇹🇼 대만'},

    kw:['台灣','台湾','taiwan','台北','台中','高雄','台南','新竹','宜蘭','花蓮','台東','墾丁','taipei','kaohsiung','taichung'],

    children:[

      {l2:{zh:'台北',en:'Taipei',th:'ไทเป',ja:'台北',ko:'타이베이'},kw:['台北','taipei']},

      {l2:{zh:'台中',en:'Taichung',th:'ไถจง',ja:'台中',ko:'타이중'},kw:['台中','taichung']},

      {l2:{zh:'高雄',en:'Kaohsiung',th:'เกาสง',ja:'高雄',ko:'가오슝'},kw:['高雄','kaohsiung']},

    ]

  },

];



const TAG_HIERARCHY = [



{ l1:{zh:'👨‍👩‍👧 家人',en:'👨‍👩‍👧 Family',th:'👨‍👩‍👧 ครอบครัว',ja:'👨‍👩‍👧 家族',ko:'👨‍👩‍👧 가족'},

    kw:['家人','family','老婆','老公','孩子','小孩','親子','亲子','媽媽','妈妈','爸爸','寶寶','宝宝','爺爺','奶奶','外公','外婆','grandma','grandpa','dad','mom','kids','baby'],

    _alwaysShowArrow:true },







  { l1:{zh:'🏠 居家',en:'🏠 Home',th:'🏠 在บ้าน',ja:'🏠 おうち',ko:'🏠 홈'},

    kw:['居家','室內','室内','家裡','家里','廚房','厨房','客廳','客厅','臥室','卧室','料理','自煮','cooking','baking','烘焙','家居','佈置','布置','interior'] },









];



// ── 快速標籤（多語言）────────────────────────────────────────────────────────

const QUICK_TAG_DATA = [

  {'zh-TW':'📸 角度/自拍','zh-CN':'📸 角度/自拍','en':'📸 Angle/Selfie','ja':'📸 角度/自撮り','ko':'📸 각도/셀카','th':'📸 มุมกล้อง/เซลฟี่'},

  {'zh-TW':'📸 角度/第一視角','zh-CN':'📸 角度/第一视角','en':'📸 Angle/POV','ja':'📸 角度/一人称視点','ko':'📸 각도/1인칭 시점','th':'📸 มุมกล้อง/มุมมองบุคคลที่หนึ่ง'},

  {'zh-TW':'📸 角度/擺拍','zh-CN':'📸 角度/摆拍','en':'📸 Angle/Posed','ja':'📸 角度/ポーズ','ko':'📸 각도/포즈','th':'📸  มุมกล้อง/โพสท่า'},

];

function getQuickTags(){ return QUICK_TAG_DATA.map(e=>e[currentLang]||e['en']); }



// 從 entry 取得當前語言顯示名

function tagName(e){

  if(currentLang==='zh-TW'||currentLang==='zh-CN') return e.zh||e['zh-TW']||e['zh-CN']||e.en;

  return e[currentLang]||e.en;

}



// 收集某個 entry 在所有語言下的可能顯示名（用於跨語言識別）

function allTagNames(e){

  const s=new Set();

  for(const code of Object.keys(LANGS)){

    const v=(code==='zh-TW'||code==='zh-CN')

      ?(e.zh||e['zh-TW']||e['zh-CN']||e.en)

      :(e[code]||e.en);

    if(v) s.add(v);

  }

  return s;

}



// 將單個 tag 字串從任意語言翻譯為 currentLang

// 不認識的標簽（用戶自定義）原樣保留

function translateTag(tag){

  // 先檢查 QUICK_TAG_DATA（📸 自拍 / 👥 合照 / 🐾 毛孩）

  const quick=QUICK_TAG_DATA.find(e=>Object.values(e).includes(tag));

  if(quick) return quick[currentLang]||quick.en||tag;



  const slash=tag.indexOf('/');

  const l1Str=slash===-1?tag:tag.slice(0,slash);

  const rest=slash===-1?null:tag.slice(slash+1);

  const group=getEffectiveHierarchy().find(g=>allTagNames(g.l1).has(l1Str));

  if(!group) return tag;

  const newL1=tagName(group.l1);

  if(!rest) return newL1;



  // L3：rest 含第二個斜線（L2/L3）

  const slash2=rest.indexOf('/');

  if(slash2!==-1){

    const l2Str=rest.slice(0,slash2);

    const l3Str=rest.slice(slash2+1);

    let newL2=l2Str;

    if(group._useCountryMap){

      const entry=COUNTRY_MAP.find(e=>allTagNames(e).has(l2Str));

      if(entry) newL2=tagName(entry);

    }

    return `${newL1}/${newL2}/${l3Str}`;

  }



  // L2 only

  const child=(group.children||[]).find(c=>allTagNames(c.l2).has(rest));

  if(child) return `${newL1}/${tagName(child.l2)}`;

  if(group._useCountryMap){

    const entry=COUNTRY_MAP.find(e=>allTagNames(e).has(rest));

    if(entry) return `${newL1}/${tagName(entry)}`;

  }

  return `${newL1}/${rest}`;

}



// ── L1 配置（localStorage 持久化）────────────────────────────────────────────

const TAG_CFG_KEY='local-ig-tagcfg';

function loadTagConfig(){

  try{return JSON.parse(localStorage.getItem(TAG_CFG_KEY))||{hidden:[],custom:[]};}

  catch{return{hidden:[],custom:[]};}

}

function saveTagConfig(cfg){localStorage.setItem(TAG_CFG_KEY,JSON.stringify(cfg));}



// 有效 hierarchy = 預設（去除隱藏，套用 overrides/extraL2） + 用戶自定義

function getEffectiveHierarchy(){

  const cfg=loadTagConfig();

  const hiddenSet=new Set(cfg.hidden||[]);

  const overrides=cfg.overrides||{};

  const extraL2=cfg.extraL2||{};



  const base=[...TAG_HIERARCHY, ...RECOMMENDED_CUSTOM_TAGS, ...buildFolderDefaultCategoryGroups()]

    .filter(g=>!hiddenSet.has(tagName(g.l1)))

    .map(g=>{

      const origKey=tagName(g.l1);

      const ov=overrides[origKey];

      const ex=extraL2[origKey];

      if(!ov&&!ex) return g;

      const updated={...g};

      if(ov){

        if(ov.name&&ov.name!==origKey)

          updated.l1={...g.l1,zh:ov.name,en:ov.name,th:ov.name,ja:ov.name,ko:ov.name};

        if(ov.kw) updated.kw=ov.kw;

      }

      if(ex&&ex.length>0){

        const extra=ex.map(e=>typeof e==='string'

          ?{l2:{zh:e,en:e,th:e,ja:e,ko:e},kw:[]}

          :{l2:e.l2,kw:e.kw||[]});

        updated.children=[...(g.children||[]),...extra];

      }

      return updated;

    });



  const custom=(cfg.custom||[]).map(c=>({

    l1:{zh:c.name,en:c.name,th:c.name,ja:c.name,ko:c.name},

    kw:c.kw||[],

    children:(c.children||[]).map(ch=>typeof ch==='string'

      ?{l2:{zh:ch,en:ch,th:ch,ja:ch,ko:ch},kw:[]}

      :{l2:ch.l2,kw:ch.kw||[]}),

    _custom:true,

  }));

  const baseNames=new Set(base.map(g=>tagName(g.l1)));

  const filteredCustom=custom.filter(c=>!baseNames.has(tagName(c.l1)));

  return [...base,...filteredCustom];

}



// ── i18n ──────────────────────────────────────────────────────────────────

const LANGS = {

  'zh-TW':{name:'繁中', locale:'zh-TW',

    appName:'本地相冊', desc:'以 Instagram 視角瀏覽本地照片\n或直接輸入 IG 用戶名導入',

    openFolder:'📂 選擇本地照片資料夾', fromIG:'📥 從 Instagram 導入',

    note:'需要 Chrome 或 Edge 瀏覽器 · 所有資料僅在本地儲存',

    compatError:'⚠️ 請改用 Chrome 或 Edge',

    igPlaceholder:'輸入 IG 用戶名，如 natgeo', igGenerate:'準備下載',

    igCount:'自訂上限', igCountUnit:'條', igCountHint:'（留空＝全部）', igCountAll:'全部（可能較慢）',

    igModeCount:'數量', igModeRange:'範圍', igRangeFrom:'第', igRangeTo:'至',

    igTotalLabel:'帳號總帖數', igPresetHint:'輸入總帖數後自動生成分段',

    igOutput:'儲存路徑', igOutputPlaceholder:'./downloads（預設）',

    igStep1:'安裝 / 升級依賴', igStepCheck:'查詢帖數並選擇範圍', igStep2:'一鍵執行下載',

    igTotalLabel2:'執行後輸入帖數',

    igStep3:'下載完成後', igStep3Note:'點「選擇本地照片資料夾」→ 選中 {path} 目錄',

    copy:'複製', copied:'✓ 已複製',

    albumTitle:'相冊名稱', albumDesc:'寫下這段旅程的故事…',

    photoCaption:'寫下這張照片的故事…',

    igLink:'↗ 查看 IG 原帖', igLinkShort:'↗ IG', igBadge:'IG',

    noPhotos:'沒有找到照片', loading:'讀取照片中，請稍候…',

    fromIGBadge:'· 來自 Instagram', videoTag:'▶ 影片',

    photoCount:n=>`${n} 張照片`,

    gridView:'九宮格', feedView:'Feed', previewAlbums:'相冊封面', previewPhotos:'全部照片', previewShowVideoCovers:'顯示影片封面原圖', previewPhotoIndex:(i,n)=>`第 ${i} / ${n} 張`,

    toastCopied:'指令已複製', toastChrome:'請使用 Chrome 或 Edge',

    toastNoFolder:'未選擇資料夾', toastReadFail:'讀取失敗：',

    viewFile:'🔗 查看', copyPath:'📋 複製路徑', openDir:'📂 打開資料夾',

    pathCopied:'✓ 路徑已複製', pathUnknown:'⚠️ 尚未設定儲存路徑',

    folderCopied:'📂 路徑已複製 → 貼到資源管理員地址列', explorerOpenOk:'📂 已打開資料夾', explorerOpenFail:'⚠️ 無法直接打開，已複製路徑',

    reopenFolder:name=>`📂 重新開啟：${name}`,

    locationPh:'添加地點…', filterAll:'全部', filterUntagged:'⬜ 未分類', tagPh:'新增標籤…', tagSuggest:'建議', noTagResult:'無符合相簿',

    movePhoto:'↗ 移動', moveModalTitle:'移動到…', moveSearch:'搜尋相簿…', moveDone:'✓ 已移動', cancel:'取消',

  },

  'zh-CN':{name:'简中', locale:'zh-CN',

    appName:'本地相册', desc:'以 Instagram 视角浏览本地照片\n或直接输入 IG 用户名导入',

    openFolder:'📂 选择本地照片文件夹', fromIG:'📥 从 Instagram 导入',

    note:'需要 Chrome 或 Edge 浏览器 · 所有数据仅在本地存储',

    compatError:'⚠️ 请改用 Chrome 或 Edge',

    igPlaceholder:'输入 IG 用户名，如 natgeo', igGenerate:'准备下载',

    igCount:'自定上限', igCountUnit:'条', igCountHint:'（留空=全部）', igCountAll:'全部（可能较慢）',

    igModeCount:'数量', igModeRange:'范围', igRangeFrom:'第', igRangeTo:'至',

    igTotalLabel:'账号总帖数', igPresetHint:'输入总帖数后自动生成分段',

    igOutput:'保存路径', igOutputPlaceholder:'./downloads（默认）',

    igStep1:'安装 / 升级依赖', igStepCheck:'查询帖数并选择范围', igStep2:'一键执行下载',

    igTotalLabel2:'运行后输入帖数',

    igStep3:'下载完成后', igStep3Note:'点「选择本地照片文件夹」→ 选中 {path} 目录',

    copy:'复制', copied:'✓ 已复制',

    albumTitle:'相册名称', albumDesc:'写下这段旅程的故事…',

    photoCaption:'写下这张照片的故事…',

    igLink:'↗ 查看 IG 原帖', igLinkShort:'↗ IG', igBadge:'IG',

    noPhotos:'没有找到照片', loading:'读取照片中，请稍候…',

    fromIGBadge:'· 来自 Instagram', videoTag:'▶ 影片',

    photoCount:n=>`${n} 张照片`,

    gridView:'九宫格', feedView:'Feed', previewAlbums:'相册封面', previewPhotos:'全部照片', previewShowVideoCovers:'显示视频封面原图', previewPhotoIndex:(i,n)=>`第 ${i} / ${n} 张`,

    toastCopied:'命令已复制', toastChrome:'请使用 Chrome 或 Edge',

    toastNoFolder:'未选择文件夹', toastReadFail:'读取失败：',

    viewFile:'🔗 查看', copyPath:'📋 复制路径', openDir:'📂 打开文件夹',

    pathCopied:'✓ 路径已复制', pathUnknown:'⚠️ 尚未设置保存路径',

    folderCopied:'📂 路径已复制 → 粘贴到资源管理器地址栏', explorerOpenOk:'📂 已打开文件夹', explorerOpenFail:'⚠️ 无法直接打开，已复制路径',

    reopenFolder:name=>`📂 重新打开：${name}`,

    locationPh:'添加地点…', filterAll:'全部', filterUntagged:'⬜ 未分类', tagPh:'新增标签…', tagSuggest:'建议', noTagResult:'无符合相册',

    movePhoto:'↗ 移动', moveModalTitle:'移动到…', moveSearch:'搜索相册…', moveDone:'✓ 已移动', cancel:'取消',

  },

  'en':{name:'EN', locale:'en',

    appName:'Local Gallery', desc:'Browse local photos in Instagram style\nor import directly from an IG account',

    openFolder:'📂 Choose Photo Folder', fromIG:'📥 Import from Instagram',

    note:'Requires Chrome or Edge · All data stays on your device',

    compatError:'⚠️ Please use Chrome or Edge',

    igPlaceholder:'Enter IG username, e.g. natgeo', igGenerate:'Generate Commands',

    igCount:'Custom limit', igCountUnit:'posts', igCountHint:'(empty = all)', igCountAll:'All (may be slow)',

    igModeCount:'Count', igModeRange:'Range', igRangeFrom:'Posts', igRangeTo:'to',

    igTotalLabel:'Total posts', igPresetHint:'Enter total to generate segments',

    igOutput:'Save path', igOutputPlaceholder:'./downloads (default)',

    igStep1:'Install / upgrade dependencies', igStepCheck:'Check count & select range', igStep2:'Run download in terminal',

    igTotalLabel2:'Enter count from output',

    igStep3:'After download completes', igStep3Note:'Click "Choose Photo Folder" → select {path}',

    copy:'Copy', copied:'✓ Copied',

    albumTitle:'Album name', albumDesc:'Write the story of this journey…',

    photoCaption:'Write the story of this photo…',

    igLink:'↗ View on Instagram', igLinkShort:'↗ IG', igBadge:'IG',

    noPhotos:'No photos found', loading:'Loading photos, please wait…',

    fromIGBadge:'· from Instagram', videoTag:'▶ Video',

    photoCount:n=>`${n} photo${n===1?'':'s'}`,

    gridView:'Grid', feedView:'Feed', previewAlbums:'Album Covers', previewPhotos:'All Photos', previewShowVideoCovers:'Show video cover originals', previewPhotoIndex:(i,n)=>`Photo ${i} / ${n}`,

    toastCopied:'Command copied', toastChrome:'Please use Chrome or Edge',

    toastNoFolder:'No folder selected', toastReadFail:'Read failed: ',

    viewFile:'🔗 View', copyPath:'📋 Copy Path', openDir:'📂 Open Folder',

    pathCopied:'✓ Path copied', pathUnknown:'⚠️ Output path not set',

    folderCopied:'📂 Path copied → paste in File Explorer address bar', explorerOpenOk:'📂 Folder opened', explorerOpenFail:'⚠️ Could not open directly, path copied',

    reopenFolder:name=>`📂 Reopen: ${name}`,

    locationPh:'Add location…', filterAll:'All', filterUntagged:'⬜ Untagged', tagPh:'Add tag…', tagSuggest:'Suggestions', noTagResult:'No matching albums',

    movePhoto:'↗ Move', moveModalTitle:'Move to…', moveSearch:'Search albums…', moveDone:'✓ Moved', cancel:'Cancel',

  },

  'th':{name:'ไทย', locale:'th',

    appName:'แกลเลอรี่', desc:'เรียกดูรูปภาพแบบ Instagram\nหรือนำเข้าจากบัญชี IG',

    openFolder:'📂 เลือกโฟลเดอร์รูปภาพ', fromIG:'📥 นำเข้าจาก Instagram',

    note:'ต้องใช้ Chrome หรือ Edge · ข้อมูลทั้งหมดเก็บในเครื่อง',

    compatError:'⚠️ กรุณาใช้ Chrome หรือ Edge',

    igPlaceholder:'ใส่ชื่อผู้ใช้ IG เช่น natgeo', igGenerate:'สร้างคำสั่ง',

    igCount:'กำหนดจำนวน', igCountUnit:'โพสต์', igCountHint:'(ว่าง = ทั้งหมด)', igCountAll:'ทั้งหมด (อาจช้า)',

    igModeCount:'จำนวน', igModeRange:'ช่วง', igRangeFrom:'จาก', igRangeTo:'ถึง',

    igTotalLabel:'จำนวนโพสต์ทั้งหมด', igPresetHint:'ใส่จำนวนทั้งหมดเพื่อสร้างช่วง',

    igOutput:'โฟลเดอร์บันทึก', igOutputPlaceholder:'./downloads (ค่าเริ่มต้น)',

    igStep1:'ติดตั้ง dependencies (ครั้งเดียว)', igStepCheck:'ตรวจสอบจำนวนและเลือกช่วง', igStep2:'รันในเทอร์มินัล',

    igTotalLabel2:'ใส่จำนวนหลังรัน',

    igStep3:'หลังดาวน์โหลดเสร็จ', igStep3Note:'คลิก "เลือกโฟลเดอร์รูปภาพ" → เลือก {path}',

    copy:'คัดลอก', copied:'✓ คัดลอกแล้ว',

    albumTitle:'ชื่ออัลบั้ม', albumDesc:'เขียนเรื่องราวของการเดินทาง…',

    photoCaption:'เขียนเรื่องราวของภาพนี้…',

    igLink:'↗ ดูบน Instagram', igLinkShort:'↗ IG', igBadge:'IG',

    noPhotos:'ไม่พบรูปภาพ', loading:'กำลังโหลดรูปภาพ…',

    fromIGBadge:'· จาก Instagram', videoTag:'▶ วิดีโอ',

    photoCount:n=>`${n} รูป`,

    gridView:'กริด', feedView:'ฟีด', previewAlbums:'ปกอัลบั้ม', previewPhotos:'รูปทั้งหมด', previewShowVideoCovers:'แสดงภาพปกวิดีโอแยก', previewPhotoIndex:(i,n)=>`รูปที่ ${i} / ${n}`,

    toastCopied:'คัดลอกคำสั่งแล้ว', toastChrome:'กรุณาใช้ Chrome หรือ Edge',

    toastNoFolder:'ยังไม่ได้เลือกโฟลเดอร์', toastReadFail:'โหลดล้มเหลว: ',

    viewFile:'🔗 ดู', copyPath:'📋 คัดลอกเส้นทาง', openDir:'📂 เปิดโฟลเดอร์',

    pathCopied:'✓ คัดลอกเส้นทางแล้ว', pathUnknown:'⚠️ ยังไม่ได้ตั้งค่าเส้นทาง',

    folderCopied:'📂 คัดลอกเส้นทางแล้ว → วางใน File Explorer',

    reopenFolder:name=>`📂 เปิดอีกครั้ง: ${name}`,

    locationPh:'เพิ่มสถานที่…', filterAll:'ทั้งหมด', filterUntagged:'⬜ ไม่มีแท็ก', tagPh:'เพิ่มแท็ก…', tagSuggest:'แนะนำ', noTagResult:'ไม่พบอัลบั้มที่ตรงกัน',

    movePhoto:'↗ ย้าย', moveModalTitle:'ย้ายไปที่…', moveSearch:'ค้นหาอัลบั้ม…', moveDone:'✓ ย้ายแล้ว', cancel:'ยกเลิก',

  },

  'ja':{name:'日本語', locale:'ja',

    appName:'ローカルアルバム', desc:'Instagramスタイルで写真を閲覧\nまたはIGアカウントからインポート',

    openFolder:'📂 写真フォルダを選択', fromIG:'📥 Instagramからインポート',

    note:'ChromeまたはEdgeが必要 · データはすべてローカルに保存',

    compatError:'⚠️ ChromeまたはEdgeをご使用ください',

    igPlaceholder:'IGユーザー名を入力（例：natgeo）', igGenerate:'コマンドを生成',

    igCount:'上限を設定', igCountUnit:'件', igCountHint:'（空欄＝すべて）', igCountAll:'すべて（時間がかかる場合あり）',

    igModeCount:'件数', igModeRange:'範囲', igRangeFrom:'第', igRangeTo:'～',

    igTotalLabel:'総投稿数', igPresetHint:'総数を入力すると区間を自動生成',

    igOutput:'保存先', igOutputPlaceholder:'./downloads（デフォルト）',

    igStep1:'依存関係をインストール（初回のみ）', igStepCheck:'件数確認と範囲選択', igStep2:'ターミナルでダウンロード実行',

    igTotalLabel2:'実行後に件数を入力',

    igStep3:'ダウンロード完了後', igStep3Note:'「写真フォルダを選択」→ {path} を選択',

    copy:'コピー', copied:'✓ コピー済み',

    albumTitle:'アルバム名', albumDesc:'この旅のストーリーを書いてください…',

    photoCaption:'この写真のストーリーを書いてください…',

    igLink:'↗ Instagramで見る', igLinkShort:'↗ IG', igBadge:'IG',

    noPhotos:'写真が見つかりません', loading:'写真を読み込み中…',

    fromIGBadge:'· Instagramより', videoTag:'▶ 動画',

    photoCount:n=>`${n}枚`,

    gridView:'グリッド', feedView:'フィード', previewAlbums:'アルバム表紙', previewPhotos:'すべての写真', previewPhotoIndex:(i,n)=>`${i} / ${n} 枚目`,

    toastCopied:'コマンドをコピーしました', toastChrome:'ChromeまたはEdgeをご使用ください',

    toastNoFolder:'フォルダが選択されていません', toastReadFail:'読込失敗：',

    viewFile:'🔗 表示', copyPath:'📋 パスをコピー', openDir:'📂 フォルダを開く',

    pathCopied:'✓ パスをコピーしました', pathUnknown:'⚠️ 保存先が設定されていません',

    folderCopied:'📂 パスをコピーしました → エクスプローラーのアドレス欄に貼り付け',

    reopenFolder:name=>`📂 再度開く：${name}`,

    locationPh:'場所を追加…', filterAll:'すべて', filterUntagged:'⬜ 未分類', tagPh:'タグを追加…', tagSuggest:'おすすめ', noTagResult:'一致するアルバムなし',

    movePhoto:'↗ 移動', moveModalTitle:'移動先…', moveSearch:'アルバムを検索…', moveDone:'✓ 移動しました', cancel:'キャンセル',

  },

  'ko':{name:'한국어', locale:'ko',

    appName:'로컬 앨범', desc:'Instagram 스타일로 사진 보기\n또는 IG 계정에서 가져오기',

    openFolder:'📂 사진 폴더 선택', fromIG:'📥 Instagram에서 가져오기',

    note:'Chrome 또는 Edge 필요 · 모든 데이터는 로컬에 저장',

    compatError:'⚠️ Chrome 또는 Edge를 사용해 주세요',

    igPlaceholder:'IG 사용자 이름 입력 (예: natgeo)', igGenerate:'명령어 생성',

    igCount:'개수 지정', igCountUnit:'개', igCountHint:'(비우면 전부)', igCountAll:'전부 (느릴 수 있음)',

    igModeCount:'개수', igModeRange:'범위', igRangeFrom:'제', igRangeTo:'~',

    igTotalLabel:'총 게시물 수', igPresetHint:'총 수 입력 후 구간 자동 생성',

    igOutput:'저장 경로', igOutputPlaceholder:'./downloads (기본값)',

    igStep1:'의존성 설치 (최초 1회)', igStepCheck:'개수 확인 및 범위 선택', igStep2:'터미널에서 다운로드 실행',

    igTotalLabel2:'실행 후 개수 입력',

    igStep3:'다운로드 완료 후', igStep3Note:'「사진 폴더 선택」→ {path} 선택',

    copy:'복사', copied:'✓ 복사됨',

    albumTitle:'앨범 이름', albumDesc:'이 여행의 이야기를 써주세요…',

    photoCaption:'이 사진의 이야기를 써주세요…',

    igLink:'↗ Instagram에서 보기', igLinkShort:'↗ IG', igBadge:'IG',

    noPhotos:'사진을 찾을 수 없습니다', loading:'사진을 불러오는 중…',

    fromIGBadge:'· Instagram에서', videoTag:'▶ 동영상',

    photoCount:n=>`${n}장`,

    gridView:'그리드', feedView:'피드', previewAlbums:'앨범 표지', previewPhotos:'전체 사진', previewPhotoIndex:(i,n)=>`${i} / ${n}번째 사진`,

    toastCopied:'명령어가 복사되었습니다', toastChrome:'Chrome 또는 Edge를 사용해 주세요',

    toastNoFolder:'폴더가 선택되지 않았습니다', toastReadFail:'읽기 실패: ',

    viewFile:'🔗 보기', copyPath:'📋 경로 복사', openDir:'📂 폴더 열기',

    pathCopied:'✓ 경로 복사됨', pathUnknown:'⚠️ 저장 경로가 설정되지 않았습니다',

    folderCopied:'📂 경로 복사됨 → 파일 탐색기 주소창에 붙여넣기',

    reopenFolder:name=>`📂 다시 열기: ${name}`,

    locationPh:'장소 추가…', filterAll:'전체', filterUntagged:'⬜ 미분류', tagPh:'태그 추가…', tagSuggest:'추천', noTagResult:'일치하는 앨범 없음',

    movePhoto:'↗ 이동', moveModalTitle:'다음으로 이동…', moveSearch:'앨범 검색…', moveDone:'✓ 이동됨', cancel:'취소',

  },

};



let currentLang = localStorage.getItem('lang-pref') || 'zh-TW';

const t = key => LANGS[currentLang][key];



function getCompatibilityStatus(){

  const fileProtocol=location.protocol==='file:' || window.location.href.startsWith('file://');

  const hasPicker=!!window.showDirectoryPicker;

  const secure=!!window.isSecureContext;

  const ua=navigator.userAgent||'';

  const isRecommended=/Edg\//.test(ua)||/Chrome\//.test(ua);

  if(fileProtocol) return {level:'err',reason:'file'};

  if(!hasPicker) return {level:'err',reason:'picker'};

  if(!secure) return {level:'warn',reason:'secure'};

  if(!isRecommended) return {level:'warn',reason:'browser'};

  return {level:'ok',reason:'ok'};

}



function renderCompatibilityStatus(){

  const panel=$('compatPanel'), title=$('compatTitle'), body=$('compatBody');

  if(!panel||!title||!body) return;

  const s=getCompatibilityStatus();

  const lang=currentLang;

  const copy={

    'zh-CN':{

      ok:['✅ 环境正常','当前是受支持的打开方式，可以直接选择文件夹并读写本地相册。'],

      file:['⚠️ 当前是直接双击打开','请改用启动脚本或 localhost 打开；file:// 模式下浏览器会禁止文件夹选择器。'],

      picker:['⚠️ 当前浏览器不支持文件夹选择器','请使用新版 Chrome 或 Edge 打开本页。'],

      secure:['⚠️ 当前不是安全上下文','建议通过 http://127.0.0.1:8765/local-ig.html 访问，避免权限问题。'],

      browser:['⚠️ 浏览器可能受限','建议改用 Chrome 或 Edge，以确保文件夹访问与剪贴板功能正常。'],

    },

    'zh-TW':{

      ok:['✅ 環境正常','目前是受支援的開啟方式，可直接選擇資料夾並讀寫本地相冊。'],

      file:['⚠️ 目前是直接雙擊開啟','請改用啟動腳本或 localhost；file:// 模式下瀏覽器會阻止資料夾選擇器。'],

      picker:['⚠️ 目前瀏覽器不支援資料夾選擇器','請使用新版 Chrome 或 Edge 開啟本頁。'],

      secure:['⚠️ 目前不是安全上下文','建議透過 http://127.0.0.1:8765/local-ig.html 開啟，以避免權限問題。'],

      browser:['⚠️ 瀏覽器可能受限','建議改用 Chrome 或 Edge，以確保資料夾存取與剪貼簿功能正常。'],

    },

    'en':{

      ok:['✅ Environment ready','This page is running in a supported context and can access the folder picker normally.'],

      file:['⚠️ Opened directly from disk','Please use the launcher or localhost; browsers block the folder picker on file:// pages.'],

      picker:['⚠️ Folder picker not supported','Open this page in a recent Chrome or Edge build.'],

      secure:['⚠️ Not a secure context','Use http://127.0.0.1:8765/local-ig.html to avoid permission issues.'],

      browser:['⚠️ Browser may be limited','Chrome or Edge is recommended for local folder access and clipboard features.'],

    }

  };

  const group=copy[lang]||copy['en'];

  const pair=group[s.reason]||group.ok;

  panel.className='compatPanel '+s.level;

  title.textContent=pair[0];

  body.textContent=pair[1];

}



// 更新 Step3 提示（含儲存路徑 + 用戶名，可選傳入 overrideUser）

function updateIgStep3Note(overrideUser){

  const noteEl=$('igStep3Note');

  if(!noteEl) return;

  const user = overrideUser!=null ? overrideUser : ($('igUserDisplay')?.textContent||'');

  const raw  = $('igOutput')?.value.trim().replace(/[/\\]+$/,'') || '';

  const dir  = raw || 'downloads';

  const tmpl = LANGS[currentLang].igStep3Note || '';

  const [bef,aft] = tmpl.split('{path}');

  noteEl.innerHTML = esc(bef||'')+'<b>'+esc(dir)+'/<span id="igUserDisplay">'+esc(user)+'</span></b>'+esc(aft||'');

}



function applyLang(){

  const L = LANGS[currentLang];

  // Welcome

  document.querySelector('.wTitle').textContent     = L.appName;

  document.querySelector('.wDesc').innerHTML        = L.desc.replace(/\n/g,'<br>');

  $('btnWelcomeOpen').textContent = L.openFolder;

  $('btnShowIG').textContent      = L.fromIG;

  $('igFetchBtn').textContent     = L.igGenerate;

  $('igInput').placeholder        = L.igPlaceholder;

  $('igCountLabel').textContent     = L.igCount;

  $('igCountUnitLbl').textContent   = (L.igCountUnit||'')+' '+L.igCountHint;

  $('igCountAll').textContent       = L.igCountAll;

  $('igOutputLabel').textContent    = L.igOutput;

  $('igOutput').placeholder         = L.igOutputPlaceholder;

  // IG panel step labels (text node after badge span)

  [['igStep1',L.igStep1],['igStep2',L.igStep2],['igStep3',L.igStep3]].forEach(([id,txt])=>{

    const lbl=$(id)?.querySelector('.igStepLabel');

    if(lbl) lbl.childNodes[1].textContent=txt;

  });

  // igStep3 note — rebuild via shared helper

  updateIgStep3Note();

  // Copy buttons

  [$('igCopy1'),$('igCopy2')].forEach(b=>{ if(b&&!b.classList.contains('done')) b.textContent=L.copy; });

  // Move modal

  if(L.moveModalTitle) $('moveModalTitle').textContent=L.moveModalTitle;

  if(L.moveSearch) $('moveSearch').placeholder=L.moveSearch;

  if(L.cancel) $('moveCancelBtn').textContent=L.cancel;

  // Header open button

  $('btnOpen').textContent = L.openFolder.replace(/^📂 /,'');

  const hp=$('homePreviewToggle');

  if(hp) hp.textContent=S.homePreviewMode==='photos'?L.previewPhotos:L.previewAlbums;

  // View toggle

  btnViewToggle.textContent=S.albumMode==='grid'?L.feedView:L.gridView;

  // compat note

  const cn=$('compatNote');

  if(cn && !window.showDirectoryPicker) cn.innerHTML=L.compatError;

  else if(cn) cn.textContent=L.note;

  renderCompatibilityStatus();

  // Live placeholders in album/lightbox

  document.querySelectorAll('.albumMetaTitle').forEach(el=>el.placeholder=L.albumTitle);

  document.querySelectorAll('.albumMetaDesc').forEach(el=>el.placeholder=L.albumDesc);

  document.querySelectorAll('.postCaption').forEach(el=>el.placeholder=L.photoCaption);

  document.querySelectorAll('.lbCaption').forEach(el=>el.placeholder=L.photoCaption);

  // IG links

  document.querySelectorAll('.albumIgLink').forEach(el=>el.textContent=L.igLink);

  document.querySelectorAll('.lbIgLink').forEach(el=>el.textContent=L.igLinkShort);

  // Dynamic rendered text — update in-place so no re-render needed

  document.querySelectorAll('.albumMetaCount[data-n]').forEach(el=>{

    const n=parseInt(el.dataset.n)||0;

    const vc=parseInt(el.dataset.vc)||0;

    const iv=el.dataset.iv==='1';

    const label=(vc===n||(iv&&vc===0&&n===1))

      ?(n===1?t('videoTag'):`${n} ${t('videoTag')}`)

      :t('photoCount')(n);

    el.textContent=label+(el.dataset.fromIG==='1'?' '+t('fromIGBadge'):'');

  });

  document.querySelectorAll('.aMeta[data-n]').forEach(el=>{

    const n=parseInt(el.dataset.n)||0;

    const vc=parseInt(el.dataset.vc)||0;

    const iv=el.dataset.iv==='1';

    const label=(vc===n||(iv&&vc===0&&n===1))

      ?(n===1?t('videoTag'):`${n} ${t('videoTag')}`)

      :t('photoCount')(n);

    const extra=el.dataset.extra||'';

    el.textContent=label+(extra?' · '+extra:'');

  });

  document.querySelectorAll('.postVideoTag').forEach(el=>el.textContent=t('videoTag'));

  if(S.view==='home') hdrTitle.textContent=`📸 ${S.rootName||t('appName')}`;

  document.querySelectorAll('.postActBtn[data-action="view"]').forEach(el=>el.title=t('viewFile'));

  document.querySelectorAll('.postActBtn[data-action="copy"]').forEach(el=>el.title=t('copyPath'));

  document.querySelectorAll('.lbActBtn[data-action="view"]').forEach(el=>{

    const s=el.querySelector('.lbActBtnLabel'); if(s) s.textContent=t('viewFile');

  });

  document.querySelectorAll('.lbActBtn[data-action="copy"]').forEach(el=>{

    const s=el.querySelector('.lbActBtnLabel'); if(s) s.textContent=t('copyPath');

  });



  const rb=$('btnReopen');

  if(rb&&rb.style.display!=='none') rb.textContent=t('reopenFolder')(rb.dataset.name||'');

  // 重新偵測未手動修改標籤的相冊（語言切換時更新國家/活動名稱）

  if(S.albums.length){

    // 語言切換：篩選條件含舊語言字串，必須清空，否則 getFilteredAlbums 無法匹配

    S.activeTags.clear();

    S.expandedL1s.clear();

    S.expandedL2s.clear();

    S.albums.forEach(alb=>{

      if(!alb._hasManualTags) alb.tags=autoDetectTags(alb);

      else alb.tags=(alb.tags||[]).map(translateTag);

    });

    if(S.view==='home') renderHome();

    else if(S.view==='album'){

      // 刷新相冊內的標籤編輯器

      const te=$('vAlbum').querySelector('.tagEditor');

      if(te){ const parent=te.parentNode; const sr=parent.querySelector('.suggestRow');

        if(sr) parent.removeChild(sr); parent.removeChild(te); renderTagEditor(S.currentAlbum,parent); }

      // 同步重建 home filter bar（隱藏中），避免返回主頁時顯示舊語言

      renderHome();

    }

  }

  // Filter bar & tag editor

  document.querySelectorAll('.tagInput').forEach(el=>el.placeholder=t('tagPh'));

  document.querySelectorAll('.sugLabel').forEach(el=>el.textContent=t('tagSuggest')+'：');

  document.querySelectorAll('.albumLocationInput').forEach(el=>el.placeholder=t('locationPh')||'添加地点…');

  localStorage.setItem('lang-pref', currentLang);

}



function buildLangSelector(){

  const sel=$('langSel');

  Object.entries(LANGS).forEach(([code,{name}])=>{

    const opt=document.createElement('option');

    opt.value=code; opt.textContent=name;

    if(code===currentLang) opt.selected=true;

    sel.appendChild(opt);

  });

  sel.addEventListener('change',()=>{

    currentLang=sel.value; applyLang();

  });

}



// ── State ─────────────────────────────────────────────────────────────────

const S = {

  albums:[], currentAlbum:null, currentIdx:0,

  view:'welcome', albumMode:'feed', gridCols:3,

  rootDirHandle:null, rootAbsPath:null, rootName:null,

  rootIndexSnapshot:null, rootIndexSnapshotLoadedAt:0,

  defaultFolderCategories:[],

  activeTags:new Set(),

  expandedL1s:new Set(),

  expandedL2s:new Set(),

  sortMode:'date-desc',  // 'date-desc'|'date-asc'

  mediaFilter:'all',     // 'all'|'video'|'photo'

  searchQuery:'',

  showFavOnly:false,

  batchMode:false,

  batchSelected:new Set(),

  timelineMode:false,

  mapMode:false,

  activeLocation:null,

  homePreviewMode:'albums',

  activeFolderCategoryParent:null,

  showVideoCoverPhotos:false,

  filterCollapsed:false,

  filterAutoCollapseLocked:false,

  filterAutoCollapsedHint:false,

  filterManualExpandLock:false,

  lastHomeScrollTop:0,

  filterToggleCooldownUntil:0,

};

try{ if(localStorage.getItem('home-preview-mode')==='photos') S.homePreviewMode='photos'; }catch{}

try{ if(localStorage.getItem('show-video-cover-photos')==='1') S.showVideoCoverPhotos=true; }catch{}

try{ if(localStorage.getItem('filter-auto-collapse-locked')==='1') S.filterAutoCollapseLocked=true; }catch{}



// ── Storage ───────────────────────────────────────────────────────────────

const FAV_KEY='local-ig-favs';

const store = {

  _d(){ try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}catch{return{}} },

  _s(d){ localStorage.setItem(STORE_KEY,JSON.stringify(d)) },

  getFav(name){ try{return !!(JSON.parse(localStorage.getItem(FAV_KEY)||'{}')[name]);}catch{return false;} },

  setFav(name,v){ try{const d=JSON.parse(localStorage.getItem(FAV_KEY)||'{}');v?d[name]=1:delete d[name];localStorage.setItem(FAV_KEY,JSON.stringify(d));}catch{} },

  getCaption(alb,photo){

    const d=this._d(); return d[alb]?.photos?.[photo]??null;

  },

  setCaption(alb,photo,txt){

    const d=this._d();

    d[alb]=d[alb]||{photos:{}};

    d[alb].photos=d[alb].photos||{};

    d[alb].photos[photo]=txt;

    this._s(d);

  },

  getAlbum(name){ return this._d()[name]||{} },

  setAlbum(name,patch){

    const d=this._d();

    d[name]={...d[name]||{},...patch};

    this._s(d);

  },

};



// ── Tag helpers ───────────────────────────────────────────────────────────

function matchKeyword(text, kw) {

  kw = kw.toLowerCase();

  if (/^[a-z0-9\s'-]+$/i.test(kw)) {

    // 匹配完整的西文单词，避免 eat 误碰 great 等子字符串误触发问题

    const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    const rx = new RegExp('\\b' + escaped + '\\b', 'i');

    return rx.test(text);

  }

  return text.includes(kw);

}

function autoDetectTags(alb){

  const text=((alb.desc||'')+' '+(alb.title||'')+' '+(alb.location||'')).toLowerCase();

  const loc=(alb.location||'').toLowerCase();

  const tags=new Set();



  for(const group of getEffectiveHierarchy()){

    const l1=tagName(group.l1);



    // L1 關鍵字匹配

    if(group.kw.some(kw=>matchKeyword(text, kw))) tags.add(l1);



    // L2 子項匹配

    for(const child of (group.children||[])){

      if(child.kw.some(kw=>matchKeyword(text, kw))){

        tags.add(l1);

        tags.add(`${l1}/${tagName(child.l2)}`);

      }

    }



    // 旅行：通過 COUNTRY_MAP 偵測國家 → L2

    if(group._useCountryMap){

      for(const entry of COUNTRY_MAP){

        if(entry.kw.some(kw=>matchKeyword(loc, kw)||matchKeyword(text, kw))){

          tags.add(l1);

          tags.add(`${l1}/${tagName(entry)}`);

          break;

        }

      }

    }



    // 周末-山林：location 作為 L2

    if(group._useLocationAsL2 && tags.has(l1) && alb.location && alb.location.length<=15){

      tags.add(`${l1}/${alb.location}`);

    }

  }



  return [...tags];

}

function buildFolderNameDefaultTags(parts){

  return (parts||[]).map(s=>String(s).trim()).filter(Boolean);

}

const STANDARD_SECOND_LEVEL_FOLDERS=[

  '人-合照','人-摆拍','人-自拍',

  '住-家','住-旅店',

  '吃喝','吃喝-下午茶','吃喝-办公室','吃喝-午','吃喝-宵夜','吃喝-家','吃喝-早','吃喝-早午','吃喝-晚',

  '工作-出差','工作-办公室','工作-饭局',

  '未分类',

  '玩乐','玩乐-山林','玩乐-市区','玩乐-海边','玩乐-旅行',

  '行-出海','行-地铁','行-自驾','行-航班',

];

const preferredFolderCategoryOrder=['人','工作','吃喝','行','住','玩乐','未分类'];

const FOLDER_L1_CORES = new Set([

  '人', '工作', '吃喝', '行', '住', '玩乐', '玩樂', '未分类', '未分類'

]);

function normalizeTagCore(tag){

  const s=String(tag||'').trim();

  // 去除前导的 emoji 装饰等，保留文字核心

  return s.replace(/^[^A-Za-z0-9\u4e00-\u9fff]+/u,'').trim();

}



// 💡 獲取物理二級大類對應的一級物理大類名稱

function getStandardSecondLevelFolderL1(l2) {

  const s = String(l2 || '').trim();

  if (s.includes('-')) {

    return s.split('-')[0].trim();

  }

  if (s === '吃喝') return '吃喝';

  if (s === '玩乐' || s === '玩樂') return '玩乐';

  if (s === '未分类' || s === '未分類') return '未分类';

  return null;

}



// 💡 深度清洗標籤：處理物理分類互斥（不與未分類共存）以及物理二級標籤的唯一規範化掛靠（不掛靠在無關自定義大類下）

function cleanAndNormalizeAlbumTags(tags) {

  if (!Array.isArray(tags)) return [];

  let nextTags = tags.map(t => String(t || '').trim()).filter(Boolean);

  nextTags = nextTags.filter((t, i, arr) => arr.indexOf(t) === i);

  

  const cleaned = [];

  nextTags.forEach(t => {

    const slash = t.indexOf('/');

    if (slash !== -1) {

      const l1 = t.slice(0, slash).trim();

      const l2 = t.slice(slash + 1).trim();

      // 💡 如果 L2 是物理二級大類（如 吃喝-下午茶），則強制對其進行物理規範化拆解與唯一掛靠

      if (isStandardSecondLevelFolderTag(l2)) {

        const canonicalL1 = getStandardSecondLevelFolderL1(l2);

        if (canonicalL1) {

          const canonicalTags = buildCanonicalFolderCategoryTags(l2);

          canonicalTags.forEach(ct => {

            if (!cleaned.includes(ct)) cleaned.push(ct);

          });

          // 將無關的自定義大類（如 逼格）單獨作為普通一級標籤保留

          if (l1 && !FOLDER_L1_CORES.has(normalizeTagCore(l1))) {

            if (!cleaned.includes(l1)) cleaned.push(l1);

          }

          return;

        }

      }

    } else {

      // 裸標籤，如果是物理二級大類，直接將其擴展為規範的一二級標籤

      if (isStandardSecondLevelFolderTag(t)) {

        const canonicalTags = buildCanonicalFolderCategoryTags(t);

        canonicalTags.forEach(ct => {

          if (!cleaned.includes(ct)) cleaned.push(ct);

        });

        return;

      }

    }

    if (!cleaned.includes(t)) cleaned.push(t);

  });

  

  // 💡 互斥檢測：如果已經有除了 "未分类" 以外的具體物理分類大類，則清除所有的 "未分类" 大類標籤

  const hasActiveFolderCategory = cleaned.some(t => {

    const ts = t.split('/');

    const l1Core = normalizeTagCore(ts[0]);

    return FOLDER_L1_CORES.has(l1Core) && l1Core !== '未分类' && l1Core !== '未分類';

  });

  

  if (hasActiveFolderCategory) {

    return cleaned.filter(t => {

      const ts = t.split('/');

      const l1Core = normalizeTagCore(ts[0]);

      return l1Core !== '未分类' && l1Core !== '未分類';

    });

  }

  return cleaned;

}

function isBlockedOtherL1Option(tag){

  const v=String(tag||'').trim();

  if(!v) return true;

  const core=normalizeTagCore(v);

  

  // 1) 检查是否直接是文件夹一级大类

  if(FOLDER_L1_CORES.has(core)) return true;

  

  // 2) 检查是否是带连字符的二级大类（如 吃喝-晚，人-合照）

  const dashIndex=core.indexOf('-');

  if(dashIndex > 0){

    const prefix=core.slice(0, dashIndex).trim();

    if(FOLDER_L1_CORES.has(prefix)) return true;

  }

  

  // 3) 检查是否是带斜杠的复合标签（如 吃喝/吃喝-晚）

  const slashIndex=core.indexOf('/');

  if(slashIndex > 0){

    const prefix=core.slice(0, slashIndex).trim();

    if(FOLDER_L1_CORES.has(prefix)) return true;

  }



  // 4) 兜底：如果与任何文件夹一级分类相等，或是以其开头

  for (const coreName of FOLDER_L1_CORES) {

    if (core === coreName || core.startsWith(coreName + '-') || core.startsWith(coreName + '/')) {

      return true;

    }

  }

  

  return false;

}

// 💡 判斷是否為文件夾相關標籤（包括一級大類和二級物理大類，如 "行"、"備忘"、"吃喝-午" 等）

function isFolderRelatedTag(tag) {

  const v = String(tag || '').trim();

  if (!v) return false;

  

  // 1) 判斷是否為標準的物理二級分類標籤（如 "吃喝-午"、"人-自拍"）

  if (isFolderCategoryTag(v)) return true;

  

  // 2) 判斷是否為一級大類的核心字眼（如 "吃喝"、"行"、"備忘" 等）

  const core = normalizeTagCore(v);

  if (FOLDER_L1_CORES.has(core) || FOLDER_L1_CORES.has(v)) return true;

  

  // 3) 判斷是否為帶斜槓的複合標籤，且其一級大類是物理大類（如 "吃喝/吃喝-午" 或 "行/自駕"）

  const slash = v.indexOf('/');

  if (slash !== -1) {

    const l1 = v.slice(0, slash).trim();

    const l1Core = normalizeTagCore(l1);

    if (FOLDER_L1_CORES.has(l1) || FOLDER_L1_CORES.has(l1Core)) return true;

  }

  

  return false;

}



function isFolderCategoryTag(tag){

  const v=String(tag||'').trim();

  if(!v) return false;

  if(isStandardSecondLevelFolderTag(v)) return true;

  const canonical=new Set();

  STANDARD_SECOND_LEVEL_FOLDERS.forEach(ft=>{

    buildCanonicalFolderCategoryTags(ft).forEach(t=>canonical.add(String(t||'').trim()));

  });

  return canonical.has(v);

}

function isManagedCategoryTag(tag){

  const v=String(tag||'').trim();

  if(!v) return false;

  if(isFolderCategoryTag(v)) return true;

  

  const hierarchyL1s = new Set();

  TAG_HIERARCHY.forEach(g => {

    for (const val of Object.values(g.l1)) {

      hierarchyL1s.add(val);

      hierarchyL1s.add(normalizeTagCore(val));

    }

  });

  

  const vCore=normalizeTagCore(v);

  if(hierarchyL1s.has(v) || hierarchyL1s.has(vCore)) return true;

  

  const sl=v.indexOf('/');

  if(sl!==-1){

    const l1=v.slice(0,sl).trim();

    const l1Core=normalizeTagCore(l1);

    if(hierarchyL1s.has(l1) || hierarchyL1s.has(l1Core)) return true;

  }

  return false;

}

function getFolderCategoryGroupsForToggle(){

  const preferred=new Set(preferredFolderCategoryOrder);

  return buildFolderDefaultCategoryGroups().filter(group=>preferred.has(tagName(group.l1)));

}

function isStandardSecondLevelFolderTag(tag){

  return STANDARD_SECOND_LEVEL_FOLDERS.includes(String(tag||'').trim());

}

function parseFolderRelPath(relPath) {

  const parts = String(relPath || '').split('/').map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) {

    return { role: '', category: '', albumName: '' };

  }

  if (parts.length === 1) {

    return { role: '', category: '', albumName: parts[0] };

  }

  

  // 检查第一段 parts[0] 是否属于标准二级分类集

  const isStandard = STANDARD_SECOND_LEVEL_FOLDERS.includes(parts[0]);

  if (isStandard) {

    return {

      role: '',

      category: parts[0],

      albumName: parts.slice(1).join('/')

    };

  } else {

    if (parts.length >= 3) {

      return {

        role: parts[0],

        category: parts[1],

        albumName: parts.slice(2).join('/')

      };

    } else {

      // 位于角色目录根下，没有指定标准子分类，视为“未分类”

      return {

        role: parts[0],

        category: '未分类',

        albumName: parts[1]

      };

    }

  }

}

function buildCanonicalFolderCategoryTags(folderTag){
  const info=parseFolderCategoryName(folderTag);
  if(!info?.parent) return [];
  const child = info.child || info.parent;
  return [`${info.parent}/${child}`];
}







function getPrimaryFolderCategoryTag(alb){

  const tags=alb?.tags||[];

  const effectiveRoles = getEffectiveHierarchy()

    .filter(g => !g._custom)

    .map(g => tagName(g.l1));



  for(const folderTag of STANDARD_SECOND_LEVEL_FOLDERS){

    const info=parseFolderCategoryName(folderTag);

    // 兼容带物理角色前缀的标签形式，严格进行拼接匹配，防止被普通自定义标签误伤

    const hasTag = tags.some(t => {

      const ts = String(t || '').trim();

      return ts === folderTag || effectiveRoles.some(role => ts === `${role}/${folderTag}`);

    });

    if(hasTag) return folderTag;

    

    if(info?.parent) {

      const parentHasTag = tags.some(t => {

        const ts = String(t || '').trim();

        const target = `${info.parent}/${folderTag}`;

        return ts === target || effectiveRoles.some(role => 

          ts === `${role}/${target}` || ts === `${role}/${info.parent}/${folderTag}`

        );

      });

      if(parentHasTag) return folderTag;

    }

  }

  return null;

}

async function resolveDirectoryHandleByRelPath(root, rel){

  let cur=root;

  const parts=String(rel||'').split('/').map(s=>s.trim()).filter(Boolean);

  for(const part of parts) cur=await cur.getDirectoryHandle(part);

  return cur;

}

async function isSameAlbumDirectory(srcDir, destDir){

  try{

    const srcMeta=await srcDir.getFileHandle('meta.json');

    const destMeta=await destDir.getFileHandle('meta.json');

    const srcText=await (await srcMeta.getFile()).text();

    const destText=await (await destMeta.getFile()).text();

    const srcJson=JSON.parse(srcText||'{}');

    const destJson=JSON.parse(destText||'{}');

    const srcCode=srcJson.shortcode||srcJson.code||srcJson.id||'';

    const destCode=destJson.shortcode||destJson.code||destJson.id||'';

    if(srcCode&&destCode&&srcCode===destCode) return true;

  }catch{}

  return false;

}

async function copyDirectoryRecursive(srcDir, destDir, options={}){

  const skipExisting=!!options.skipExisting;

  for await(const [name,entry] of srcDir.entries()){

    if(entry.kind==='file'){

      if(skipExisting){

        try{ await destDir.getFileHandle(name); continue; }catch{}

      }

      const file=await entry.getFile();

      const fh=await destDir.getFileHandle(name,{create:true});

      const w=await fh.createWritable();

      await w.write(await file.arrayBuffer());

      await w.close();

    } else if(entry.kind==='directory'){

      const child=await destDir.getDirectoryHandle(name,{create:true});

      await copyDirectoryRecursive(entry, child, options);

    }

  }

}

async function moveAlbumFolderToCategory(alb, folderTag){

  if(!alb?.handle||!S.rootDirHandle) return false;

  const pathInfo = parseFolderRelPath(alb._folderRelPath || alb.name);

  const currentCategory = pathInfo.category;

  if(currentCategory===folderTag) return false;

  

  const srcRel = alb._folderRelPath || alb.name;

  const srcParts = srcRel.split('/').filter(Boolean);

  const srcName = srcParts.pop();

  if(!srcName) return false;

  

  let rolePrefix = '';

  // 优先从 tags 提取有效的角色 L1 标签，防范 pathInfo.role 为 '未分类' 或空时的判定缺失，并排除普通自定义标签

  const effectiveRoles = getEffectiveHierarchy().filter(g => !g._custom).map(g => tagName(g.l1));

  const foundRole = effectiveRoles.find(r => 

    (alb.tags || []).some(t => {

      const ts = String(t || '').trim();

      return ts === r || ts.startsWith(r + '/');

    })

  );

  if (foundRole) {

    rolePrefix = foundRole;

  } else if (pathInfo.role && pathInfo.role !== '未分类' && !STANDARD_SECOND_LEVEL_FOLDERS.includes(pathInfo.role) && effectiveRoles.includes(pathInfo.role)) {

    rolePrefix = pathInfo.role;

  }

  const srcParent = srcParts.length === 0 

    ? S.rootDirHandle 

    : await resolveDirectoryHandleByRelPath(S.rootDirHandle, srcParts.join('/'));

  const srcDir = await srcParent.getDirectoryHandle(srcName);

  

  // unittest: const destDir = await S.rootDirHandle.getDirectoryHandle(folderTag, {create:true});

  let destDir;

  if (rolePrefix) {

    const destParent = await S.rootDirHandle.getDirectoryHandle(rolePrefix, {create:true});

    destDir = await destParent.getDirectoryHandle(folderTag, {create:true});

  } else {

    destDir = await S.rootDirHandle.getDirectoryHandle(folderTag, {create:true});

  }

  

  let destName=srcName, i=1;

  let newDir=null;

  try{

    const existingDir = await destDir.getDirectoryHandle(srcName);

    if(await isSameAlbumDirectory(srcDir, existingDir)){

      destName = srcName;

      newDir = existingDir;

    }

  }catch{}

  if(!newDir){

    while(true){

      try{ await destDir.getDirectoryHandle(destName); destName=`${srcName}_${i++}`; }

      catch{ break; }

    }

    newDir=await destDir.getDirectoryHandle(destName,{create:true});

  }

  await copyDirectoryRecursive(srcDir, newDir, {skipExisting:true});

  await srcParent.removeEntry(srcName, {recursive:true});

  alb.handle=newDir;

  alb.name=destName;

  

  // unittest: alb._folderRelPath = `${folderTag}/${destName}`;

  if (rolePrefix) {

    alb._folderRelPath = `${rolePrefix}/${folderTag}/${destName}`;

  } else {

    alb._folderRelPath = `${folderTag}/${destName}`;

  }

  return true;

}

async function setPrimaryFolderCategoryTag(alb, folderTag){

  folderTag=String(folderTag||'').trim();

  if(!isStandardSecondLevelFolderTag(folderTag)) return false;

  const existingPrimary = getPrimaryFolderCategoryTag(alb);

  if(existingPrimary===folderTag) return false;

  const pathInfo = parseFolderRelPath(alb._folderRelPath || alb.name);

  const currentCategory = pathInfo.category || '未分类';

  

  // unittest: (alb.tags||[]).filter(t=>!isStandardSecondLevelFolderTag(t))

  // unittest: nextTags.push(folderTag)

  // 找出当前相册角色，清洗所有旧的文件夹二级分类标签（兼容多角色带前缀）并添加规范化新标签，排除普通自定义标签

  const effectiveRoles = getEffectiveHierarchy().filter(g => !g._custom).map(g => tagName(g.l1));

  const activeRole = effectiveRoles.find(r => 

    (alb.tags || []).some(t => {

      const ts = String(t || '').trim();

      return ts === r || ts.startsWith(r + '/');

    })

  );

  

  const nextTags = (alb.tags || []).filter(t => {

    const ts = String(t || '').trim();

    

    // 💡 徹底清洗：凡是包含 "未分类" 或 "未分類" 的標籤，不論是單純的、帶前綴的還是斜槓複合的，一律清除

    if (ts === '未分类' || ts === '未分類' || ts.includes('/未分类') || ts.includes('/未分類') || ts.startsWith('未分类/') || ts.startsWith('未分類/')) {

      return false;

    }

    

    // 💡 判斷該標籤是否屬於一級或二級物理分類大類相關

    if (isFolderRelatedTag(ts)) {

      // 💡 只有當前相冊的角色大類 L1（如 "jovy_irwin"）需要保留

      if (effectiveRoles.includes(ts)) {

        return true;

      }

      // 其他舊的、混亂的一級或二級文件夾大類標籤一律清洗清除

      return false;

    }

    

    // 保留普通自定義標籤

    return true;

  });

  

  const canonicalTags = buildCanonicalFolderCategoryTags(folderTag);

  canonicalTags.forEach(tag => {

    if (!nextTags.includes(tag)) nextTags.push(tag);

    if (activeRole) {

      const prefixed = `${activeRole}/${tag}`;

      if (!nextTags.includes(prefixed)) nextTags.push(prefixed);

    }

  });

  

  alb.tags = nextTags;

  let moved=false;

  if(currentCategory==='未分类') moved=await moveAlbumFolderToCategory(alb, folderTag);

  else if(existingPrimary) moved=await moveAlbumFolderToCategory(alb, folderTag);

  store.setAlbum(alb.name,{tags:alb.tags});

  scheduleWrite(alb);

  if(moved){

    const fromLabel = currentCategory || '未分类';

    const moveMsg = `📁 已從 ${fromLabel} 移動到 ${folderTag}`;

    toast(moveMsg, 2200);

  }

  return true;

}

function getFolderCategoryTagSets(){

  const parentTags=new Set(), childTags=new Set(), rawTags=new Set();

  getFolderCategoryGroupsForToggle().forEach(group=>{

    const parent=tagName(group.l1);

    parentTags.add(parent);

    (group.children||[]).forEach(child=>{

      const childName=tagName(child.l2);

      childTags.add(`${parent}/${childName}`);

      rawTags.add(childName);

    });

  });

  return {parentTags, childTags, rawTags};

}

function parseFolderCategoryName(name){

  const raw=String(name||'').trim();

  if(!raw) return null;

  const dash=raw.indexOf('-');

  if(dash<=0||dash>=raw.length-1) return {raw,parent:raw,child:null};

  const parent=raw.slice(0,dash).trim();

  const child=raw.slice(dash+1).trim();

  if(!parent||!child) return {raw,parent:raw,child:null};

  return {raw,parent,child};

}

function getPreferredFolderCategoryRank(name){

  const idx=preferredFolderCategoryOrder.indexOf(name);

  return idx===-1?Number.POSITIVE_INFINITY:idx;

}

function buildFolderDefaultCategoryGroups(){

  const groups=new Map();

  (S.defaultFolderCategories||[]).forEach((name, idx)=>{

    const info=parseFolderCategoryName(name);

    if(!info) return;

    if(!groups.has(info.parent)) groups.set(info.parent,{name:info.parent,order:idx,keywords:new Set(),children:[],childSeen:new Set()});

    const group=groups.get(info.parent);

    group.keywords.add(info.parent.toLowerCase());

    group.keywords.add(info.raw.toLowerCase());

    if(info.child && !group.childSeen.has(info.raw)){

      group.childSeen.add(info.raw);

      group.children.push({

        l2:{zh:info.raw,en:info.raw,th:info.raw,ja:info.raw,ko:info.raw},

        kw:[info.raw.toLowerCase()],

      });

    }

  });

  const orderMap=new Map(preferredFolderCategoryOrder.map((name, idx)=>[name, idx]));

  return [...groups.values()].sort((a,b)=>{

    const aRank=orderMap.has(a.name)?orderMap.get(a.name):(preferredFolderCategoryOrder.length+a.order);

    const bRank=orderMap.has(b.name)?orderMap.get(b.name):(preferredFolderCategoryOrder.length+b.order);

    return aRank-bRank;

  }).map(group=>({

    l1:{zh:group.name,en:group.name,th:group.name,ja:group.name,ko:group.name},

    kw:[...group.keywords],

    children:group.children,

    _systemDefault:true,

    _alwaysShowArrow:group.children.length>0,

  }));

}

function mergeTagLists(...lists){

  const seen=new Set(), out=[];

  lists.flat().forEach(tag=>{

    if(typeof tag!=='string') return;

    const t=tag.trim();

    if(!t||seen.has(t)) return;

    seen.add(t);out.push(t);

  });

  return out;

}



function addTag(alb, tag) {

  tag = tag.trim();

  if (!tag) return false;

  const merged = [...(alb.tags || []), tag];

  const cleaned = cleanAndNormalizeAlbumTags(merged);

  const originalJson = JSON.stringify(alb.tags || []);

  const cleanedJson = JSON.stringify(cleaned);

  if (originalJson === cleanedJson) return false;

  alb.tags = cleaned;

  store.setAlbum(alb.name, { tags: alb.tags });

  scheduleWrite(alb);

  return true;

}



function removeTag(alb, tag) {

  const filtered = (alb.tags || []).filter(t => t !== tag);

  alb.tags = cleanAndNormalizeAlbumTags(filtered);

  store.setAlbum(alb.name, { tags: alb.tags });

  scheduleWrite(alb);

}







// 改名後自動更新所有卡片的標籤（helper）

function renameTagOnAllAlbums(oldTag, newTag) {

  (S.albums||[]).forEach(alb=>{

    if(!alb.tags) return;

    let changed=false;

    alb.tags=alb.tags.map(t=>{

      if(t===oldTag){changed=true;return newTag;}

      // L1改名時也處理 L1/L2 複合標籤

      const prefix=oldTag+'/';

      if(t.startsWith(prefix)){changed=true;return newTag+t.slice(oldTag.length);}

      return t;

    });

    if(changed){store.setAlbum(alb.name,{tags:alb.tags});scheduleWrite(alb);}

  });

}



// ── IndexedDB ─────────────────────────────────────────────────────────────

const idb={

  _db:null,

  async _open(){

    if(this._db)return this._db;

    return new Promise((res,rej)=>{

      const r=indexedDB.open('local-ig-fsh',1);

      r.onupgradeneeded=e=>e.target.result.createObjectStore('h');

      r.onsuccess=e=>{this._db=e.target.result;res(this._db);};

      r.onerror=rej;

    });

  },

  async set(k,v){const db=await this._open();return new Promise((res,rej)=>{const tx=db.transaction('h','readwrite');tx.objectStore('h').put(v,k);tx.oncomplete=res;tx.onerror=rej;});},

  async get(k){const db=await this._open();return new Promise((res,rej)=>{const tx=db.transaction('h','readonly');const r=tx.objectStore('h').get(k);r.onsuccess=()=>res(r.result);r.onerror=rej;});},

};



// ── EXIF date ─────────────────────────────────────────────────────────────

function parseExifStr(s){

  const m=s&&s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);

  if(!m)return null;

  const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);

  return isNaN(d)?null:d;

}

async function getPhotoDate(file){

  if(!file.name.match(/\.jpe?g$/i)) return new Date(file.lastModified);

  try{

    const buf=await file.slice(0,131072).arrayBuffer();

    const v=new DataView(buf);

    if(v.getUint16(0)!==0xFFD8) return new Date(file.lastModified);

    let off=2;

    while(off<buf.byteLength-4){

      const mk=v.getUint16(off);

      if((mk&0xFF00)!==0xFF00) break;

      const len=v.getUint16(off+2);

      if(mk===0xFFE1&&v.getUint32(off+4)===0x45786966&&v.getUint16(off+8)===0){

        const t=off+10;

        const le=v.getUint16(t)===0x4949;

        const u16=o=>v.getUint16(t+o,le);

        const u32=o=>v.getUint32(t+o,le);

        const str=voff=>{let s='';for(let i=0;i<20;i++){const c=v.getUint8(t+voff+i);if(!c)break;s+=String.fromCharCode(c);}return s;};

        const scan=iOff=>{

          if(t+iOff+2>buf.byteLength)return null;

          const n=u16(iOff);let dt=null,ep=null;

          for(let i=0;i<n&&i<128;i++){

            const e=iOff+2+i*12;

            if(t+e+12>buf.byteLength)break;

            const tag=u16(e),vo=u32(e+8);

            if(tag===0x9003||tag===0x9004)return parseExifStr(str(vo));

            if(tag===0x8769)ep=vo;

            if(tag===0x0132)dt=parseExifStr(str(vo));

          }

          if(ep!=null){const d=scan(ep);if(d)return d;}

          return dt;

        };

        const d=scan(u32(4));if(d)return d;

        break;

      }

      off+=2+len;

    }

  }catch(_){}

  return new Date(file.lastModified);

}



// ── File system ───────────────────────────────────────────────────────────



// 判断一个目录是「帖子文件夹」（含媒体/meta.json）还是「分类文件夹」（含子目录）

// 返回 'post' | 'category' | 'empty'

async function classifyDir(h){

  let hasMedia=false, hasSubDir=false, hasMeta=false;

  try{

    for await(const [name,ch] of h.entries()){

      try{

        if(ch.kind==='directory') hasSubDir=true;

        else if(name==='meta.json') hasMeta=true;

        else if(IMG_EXT.test(name)||VIDEO_EXT.test(name)) hasMedia=true;

      }catch{}

    }

  }catch{ return 'empty'; }

  if(hasMeta||hasMedia) return 'post';

  if(hasSubDir) return 'category';

  return 'empty';

}



// 读取一个「帖子文件夹」的所有媒体，同时处理同名 txt → per-photo caption

function getTxtCaptionForPhoto(txtMap, photoName){

  if(!txtMap||!photoName) return undefined;

  const base=photoName.replace(/\.\w+$/,'');

  if(txtMap[photoName]!==undefined) return txtMap[photoName];

  if(txtMap[base]!==undefined) return txtMap[base];

  return undefined;

}

function shouldHideVideoCoverPhoto(photo, usedCovers){

  return !S.showVideoCoverPhotos && usedCovers.has(photo.name);

}

function isVisibleHomePhoto(photo){

  return S.showVideoCoverPhotos || !photo._isVideoCover;

}



async function readPhotosFromDir(dir){

  const images=[], videos=[], txtMap={};

  let postMeta=null, notesData=null, _corruptMeta=false;

  for await(const [name,h] of dir.entries()){

    if(h.kind==='file'){

      if(name==='meta.json'){

        try{ const file=await h.getFile(); postMeta=JSON.parse(await file.text()); }

        catch{ _corruptMeta=true; }

      } else if(name==='notes.json'){

        try{ const file=await h.getFile(); notesData=JSON.parse(await file.text()); }catch{}

      } else if(IMG_EXT.test(name)){

        const file=await h.getFile();

        images.push({name,file,handle:h,date:null,url:null,isVideo:false});

      } else if(VIDEO_EXT.test(name)){

        const file=await h.getFile();

        videos.push({name,file,handle:h,date:null,url:null,isVideo:true,poster:null});

      } else if(name.match(/\.txt$/i)){

        // txt 文件：去掉扩展名作为 key，内容作为对应图片的 caption

        try{

          const file=await h.getFile();

          const base=name.replace(/\.txt$/i,'');

          txtMap[base]=await file.text();

        }catch{}

      }

    }

  }

  // 将视频与同名封面图配对（如 1.jpg ↔ 1.mp4）

  const usedCovers=new Set();

  for(const v of videos){

    const base=v.name.replace(/\.\w+$/,'');

    const cover=images.find(p=>p.name.replace(/\.\w+$/,'')=== base);

    if(cover){v.poster=cover;cover._isVideoCover=true;usedCovers.add(cover.name);}

  }

  // 展示列表：未配对图片 + 视频；保留第一张图供封面

  const firstImage=images[0]||null;

  const photos=[...images,...videos];

  photos.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));



  // 将 txtMap 注入 per-photo caption（存入 notesData.photos）

  if(Object.keys(txtMap).length){

    notesData=notesData||{};

    notesData.photos=notesData.photos||{};

    for(const photo of photos){

      const txtCaption=getTxtCaptionForPhoto(txtMap, photo.name);

      if(txtCaption!==undefined){

        notesData.photos[photo.name]=txtCaption.trim();

      }

    }

    // 若只有一个 txt 且名字和文件夹同名或通配，用作整体描述

    const txts=Object.values(txtMap);

    if(txts.length===1 && !notesData.desc){

      const matchedPhoto=photos.find(p=>getTxtCaptionForPhoto(txtMap,p.name)!==undefined);

      if(!matchedPhoto) notesData.desc=txts[0].trim(); // 没有对应图片时作为相册描述

    }

  }



  return {photos,postMeta,firstImage,notesData,_corruptMeta};

}

function createAlbumIndexRecord(patch){

  return {

    coverUrl:null,

    _inheritTags:[],

    ...patch,

  };

}

const ROOT_INDEX_FILE='.local-ig-index.json';

function buildRootIndexSnapshot(root, albumRecords){

  return {

    version: 1,

    rootName: root.name,

    rootAbsPath: S.rootAbsPath || null,

    defaultFolderCategories: [...(S.defaultFolderCategories||[])],

    albumRecords: albumRecords.map(rec=>(

      {

        name: rec.name,

        folderRelPath: rec._folderRelPath || null,

        inheritTags: [...(rec._inheritTags||[])],

        rootAlbum: !!rec.rootAlbum,

        looseSingle: !!rec._looseSingle,

        photoCount: rec.photos?.length || 0,

        firstPhotoName: rec.photos?.[0]?.name || null,

        shortcode: rec.postMeta?.shortcode || null,

        titleHint: rec.postMeta?.caption ? firstLine(rec.postMeta.caption,36) : null,

      }

    )),

  };

}

async function readRootIndexSnapshot(root){

  try{

    const fh=await root.getFileHandle(ROOT_INDEX_FILE);

    return JSON.parse(await (await fh.getFile()).text());

  }catch{return null;}

}

function applyRootIndexSnapshotToState(snapshot){

  if(!snapshot) return;

  if(Array.isArray(snapshot.defaultFolderCategories))

    S.defaultFolderCategories=[...snapshot.defaultFolderCategories];

  if(typeof snapshot.rootAbsPath==='string' && snapshot.rootAbsPath.trim())

    S.rootAbsPath=snapshot.rootAbsPath.trim();

}

async function writeRootIndexSnapshot(root, snapshot){

  try{

    const fh=await root.getFileHandle(ROOT_INDEX_FILE,{create:true});

    const w=await fh.createWritable();

    await w.write(JSON.stringify(snapshot,null,2));

    await w.close();

  }catch{}

}

async function materializeAlbumsFromIndexRecords(albumRecords, rootName){

  const albums=albumRecords.map(rec=>({...rec}));

  for(const alb of albums){

    const nd =alb.notesData;

    const meta=store.getAlbum(alb.name);

    const pm =alb.postMeta;



    if(pm?.date!=null && pm.date!=='' && pm.date!==0){

      const d=new Date(pm.date);

      alb.photos.forEach(p=>p.date=isNaN(d)?new Date(p.file.lastModified):d);

    } else {

      for(const p of alb.photos) p.date=await getPhotoDate(p.file);

      alb.photos.sort((a,b)=>a.date-b.date);

    }



    const pinnedName=alb.notesData?.coverPhoto;

    const coverSrc=

      (pinnedName&&alb.photos.find(p=>p.name===pinnedName))

      ||alb.firstImage

      ||(alb.photos.find(p=>!p.isVideo))

      ||alb.photos[0];

    if(coverSrc) alb.coverUrl=safeCreateObjectURL(coverSrc.file);



    const fallbackTitle=alb._looseSingle

      ? alb.photos[0]?.name.replace(/\.\w+$/,'')

      : (alb.rootAlbum?rootName:alb.name);

    alb.title = nd?.title || meta.title || (pm ? firstLine(pm.caption,36) : null) || fallbackTitle;



    alb.desc = nd?.desc!==undefined ? nd.desc : (meta.desc!==undefined ? meta.desc : (pm?.caption||''));

    const _locNd   = nd?.location;

    const _locMeta = meta.location;

    const _locPm   = pm?.location;

    const rawLoc = (_locNd   != null && _locNd   !== '') ? _locNd

                 : (_locMeta != null && _locMeta !== '') ? _locMeta

                 : _locPm;

    alb.location = typeof rawLoc==='object' && rawLoc!==null

      ? (rawLoc.name||rawLoc.city||rawLoc.address||'')

      : (rawLoc||'');

    alb.igUrl    = pm?.ig_url || '';

    alb.likes    = pm?.likes ?? null;

    alb.source   = pm?.source || (pm?.ig_url ? 'ig' : '');

    alb.fromIG   = alb.source === 'ig' || (!pm?.source && !!(pm?.ig_url));

    alb.fromXHS  = alb.source === 'xhs';



    const _rawInh=alb._inheritTags||[];

    let inheritTags;

    const folderNameTags=buildFolderNameDefaultTags(_rawInh);

    if(_rawInh.length===0){

      inheritTags=[];

    } else {

      const fn1=_rawInh[0].toLowerCase();

      const group=getEffectiveHierarchy().find(g=>g.kw&&g.kw.some(kw=>fn1===kw.toLowerCase()));

      const l1Tag=group?tagName(group.l1):_rawInh[0];

      const folderChild=group?.children?.find(c=>c.kw&&c.kw.some(kw=>fn1===kw.toLowerCase()));

      if(_rawInh.length===1){

        inheritTags=folderChild ? [l1Tag, `${l1Tag}/${tagName(folderChild.l2)}`] : [l1Tag];

      } else {

        const l2Raw=_rawInh[1];

        const child=group?.children?.find(c=>c.kw&&c.kw.some(kw=>l2Raw.toLowerCase()===kw.toLowerCase()));

        const l2Tag=child?`${l1Tag}/${tagName(child.l2)}`:`${l1Tag}/${l2Raw}`;

        inheritTags=[l1Tag,l2Tag];

      }

      inheritTags = mergeTagLists(inheritTags, folderNameTags);

    }

    const savedTags = nd?.tags ?? meta.tags ?? null;

    alb._hasManualTags = savedTags !== null || inheritTags.length>0;

    if(savedTags !== null){

      alb.tags = mergeTagLists(inheritTags, savedTags.filter(t=>typeof t==='string'&&t.trim()).map(translateTag));

    } else if(inheritTags.length){

      alb.tags=[...inheritTags];

    } else {

      alb.tags = autoDetectTags(alb);

    }

    // 💡 讀取相冊標籤後，立使其在內存中進行深度清洗與互斥規範化

    const cleaned = cleanAndNormalizeAlbumTags(alb.tags);

    const originalJson = JSON.stringify(alb.tags || []);

    const cleanedJson = JSON.stringify(cleaned);

    alb.tags = cleaned;

    // 如果檢測到有歷史不規範標籤被清洗，自動背景更新持久化 notes.json 進行自我療癒修復

    if (originalJson !== cleanedJson) {

      scheduleWrite(alb);

    }

  }

  const scMap=new Map();

  for(const alb of albums){

    const sc=alb.postMeta?.shortcode;

    if(sc){

      if(!scMap.has(sc)) scMap.set(sc,[]);

      scMap.get(sc).push(alb);

    }

  }

  for(const [,group] of scMap){

    if(group.length>1) group.forEach(a=>a._isDuplicate=true);

  }

  return albums;

}



// 将一个「散图文件夹」的直属图片收集成相册列表

// mode: 'single'（每张独立）| 'merged'（整体一个相册）| 'auto'（按有无同名txt自动）

async function readLooseDirAsAlbumIndexRecords(dirHandle, dirName, inheritTags, mode='auto'){

  const images=[], videos=[], txtMap={};

  for await(const [name,h] of dirHandle.entries()){

    if(h.kind!=='file') continue;

    if(IMG_EXT.test(name)){

      const file=await h.getFile();

      images.push({name,file,handle:h,date:null,url:null,isVideo:false});

    } else if(VIDEO_EXT.test(name)){

      const file=await h.getFile();

      videos.push({name,file,handle:h,date:null,url:null,isVideo:true,poster:null});

    } else if(/\.txt$/i.test(name)){

      try{

        const file=await h.getFile();

        txtMap[name.replace(/\.txt$/i,'')]=await file.text();

      }catch{}

    }

  }

  if(!images.length&&!videos.length) return [];



  images.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));

  videos.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));



  const usedCovers=new Set();

  for(const v of videos){

    const base=v.name.replace(/\.\w+$/,'');

    const cover=images.find(p=>p.name.replace(/\.\w+$/,'')=== base);

    if(cover){v.poster=cover;cover._isVideoCover=true;usedCovers.add(cover.name);}

  }

  const displayPhotos=[...images,...videos];



  const allMedia=[...images,...videos];

  const hasPerFileTxt=allMedia.some(p=>getTxtCaptionForPhoto(txtMap,p.name)!==undefined);

  const useSingle = mode==='single' || (mode==='auto' && hasPerFileTxt);



  const albumRecords = [];

  if(useSingle){

    for(const photo of displayPhotos){

      const caption=getTxtCaptionForPhoto(txtMap, photo.name)||'';

      const albumName=`${dirName}/${photo.name}`;

      const notesData=caption?{desc:caption.trim(),photos:{}}:null;

      const postMeta={

        caption:caption.trim(),

        date:null, location:'', shortcode:'', ig_url:'',

        is_video:photo.isVideo, image_count:1, source:'loose',

      };

      albumRecords.push(createAlbumIndexRecord({

        name:albumName, handle:dirHandle,

        photos:[photo], postMeta, firstImage:photo.isVideo?null:photo,

        notesData, _inheritTags:inheritTags,

        _looseSingle:true,

      }));

    }

    return albumRecords;

  } else {

    let folderCaption='';

    const txtKeys=Object.keys(txtMap);

    if(txtMap[dirName]) folderCaption=txtMap[dirName].trim();

    else if(txtKeys.length===1) folderCaption=txtMap[txtKeys[0]].trim();



    const firstImage=displayPhotos.find(p=>!p.isVideo)||null;

    const notesData=folderCaption?{desc:folderCaption}:null;

    const postMeta=folderCaption?{

      caption:folderCaption, date:null, location:'', shortcode:'', ig_url:'',

      is_video:false, image_count:displayPhotos.length, source:'loose',

    }:null;

    albumRecords.push(createAlbumIndexRecord({

      name:dirName, handle:dirHandle,

      photos:displayPhotos, postMeta, firstImage,

      notesData, _inheritTags:inheritTags,

    }));

    return albumRecords;

  }

}



async function readFolder(root){

  const albumRecords=[];

  // 读取 _path.txt，并自动校对文件夹名（防止文件夹改名/移动后路径失效）

  S.rootAbsPath=null;



  // 1. 尝试从后端服务获取真实的服务器物理路径

  try {

    const res = await fetch('/__get_server_info__', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({})

    });

    const info = await res.json();

    if (info && info.ok && info.root) {

      const normRoot = info.root.replace(/\\/g, '/').replace(/\/+$/, '');

      const srvLastName = normRoot.split('/').pop().toLowerCase();

      const openName = root.name.toLowerCase();

      if (srvLastName === openName) {

        // 情况A：当前打开的正是后端服务所在的根目录（如本地IG）

        S.rootAbsPath = normRoot;

      } else {

        // 情况B：当前打开的是子相册目录（如 jovy_irwin）

        // 其绝对物理路径应该是 后端服务目录 + '/' + 文件夹名

        S.rootAbsPath = normRoot + '/' + root.name;

      }

      // 同步更新localStorage和输入框，保持显示一致

      // 主相册的输出根目录始终对齐为后端服务所在的总物理目录

      localStorage.setItem('ig-output-path', normRoot);

      const outInp = $('igOutput');

      if (outInp) outInp.value = normRoot;

    }

  } catch (e) {

    console.warn('获取服务器物理路径失败:', e);

  }



  // 2. 如果后端获取失败，再退回原有的读取 _path.txt 逻辑

  if (!S.rootAbsPath) {

    try{

      const ph=await root.getFileHandle('_path.txt');

      const raw=(await (await ph.getFile()).text()).trim().replace(/[/\\]+$/,'');

      if(raw){

        const storedLast=raw.split(/[/\\]/).pop()||'';

        if(storedLast===root.name){

          // _path.txt 已是同名目标目录时，直接信任其保存的真实存储路径，

          // 不再用 HTML 源码目录重写，否则会把「打开文件夹」误导到项目源码路径。

          S.rootAbsPath=raw;

        } else {

          // 文件夹名/位置已变：优先用 ig-output-path + 当前文件夹名重建路径

          // 若未设置 ig-output-path，则仅替换最后一段（适用于纯改名场景）

          const savedBase=localStorage.getItem('ig-output-path');

          if(savedBase&&savedBase.trim()){

            S.rootAbsPath=savedBase.trim().replace(/[/\\]+$/,'')+'/'+root.name;

          } else {

            const parts=raw.split(/[/\\]/);

            parts[parts.length-1]=root.name;

            S.rootAbsPath=parts.join('/');

          }

          try{

            const pw=await(await root.getFileHandle('_path.txt',{create:true})).createWritable();

            await pw.write(S.rootAbsPath);await pw.close();

          }catch{}

        }

      }

    }catch{}

  }



  // 3. 自动同步/校对根目录下的 _path.txt

  if (S.rootAbsPath) {

    try {

      let needWrite = false;

      try {

        const ph = await root.getFileHandle('_path.txt');

        const raw = (await (await ph.getFile()).text()).trim();

        if (raw !== S.rootAbsPath) needWrite = true;

      } catch {

        needWrite = true;

      }

      if (needWrite) {

        const pw = await (await root.getFileHandle('_path.txt', {create:true})).createWritable();

        await pw.write(S.rootAbsPath);

        await pw.close();

      }

    } catch(e) {

      console.warn('同步根目录_path.txt失败:', e);

    }

  }

  // 根目录自身的 notes.json

  let rootNotesData=null;

  try{

    const fh=await root.getFileHandle('notes.json');

    rootNotesData=JSON.parse(await (await fh.getFile()).text());

  }catch{}



  // 根目录直属的散图

  const rootLooseImgs=[], rootLooseVids=[], rootTxtMap={};

  const subDirs=[];



  for await(const [name,h] of root.entries()){

    try{

      if(h.kind==='directory'){

        if(!name.startsWith('.')) subDirs.push({name,h});

      } else if(h.kind==='file'){

        if(IMG_EXT.test(name)){

          try{ rootLooseImgs.push({name,file:await h.getFile(),handle:h,date:null,url:null,isVideo:false}); }catch{}

        } else if(VIDEO_EXT.test(name)){

          try{ rootLooseVids.push({name,file:await h.getFile(),handle:h,date:null,url:null,isVideo:true,poster:null}); }catch{}

        } else if(/\.txt$/i.test(name)){

          try{ const file=await h.getFile(); rootTxtMap[name.replace(/\.txt$/i,'')]=(await file.text()).trim(); }catch{}

        }

      }

    }catch{}

  }



  // 处理子目录（每个子目录独立 try-catch，一个失败不影响其他）

  const detectedCategories=[];

  for(const {name,h} of subDirs){

    try{

      const kind=await classifyDir(h);

      if(kind==='post'){

        // 标准帖子文件夹（含媒体或 meta.json）

        const {photos,postMeta,firstImage,notesData,_corruptMeta}=await readPhotosFromDir(h);

        if(photos.length) albumRecords.push(createAlbumIndexRecord({name,handle:h,photos,postMeta,firstImage,notesData,_corruptMeta}));

      } else if(kind==='category'){

        detectedCategories.push(name);

        // 分类文件夹：遍历子文件夹，外层名作为 L1 inheritTag

        // 若子文件夹本身也是 category（L2），再向下一层扫描帖子

        try{

          for await(const [subName,subH] of h.entries()){

            if(subH.kind!=='directory'||subName.startsWith('.')) continue;

            try{

              const subKind=await classifyDir(subH);

              if(subKind==='post'){

                const {photos,postMeta,firstImage,notesData,_corruptMeta}=await readPhotosFromDir(subH);

                if(photos.length) albumRecords.push(createAlbumIndexRecord({name:subName,handle:subH,photos,postMeta,firstImage,notesData,_corruptMeta,_inheritTags:[name],_folderRelPath:`${name}/${subName}`}));

              } else if(subKind==='category'){

                detectedCategories.push(subName.includes('-') ? subName : `${name}-${subName}`);

                // L2 分类文件夹：帖子继承 [L1, L2]

                try{

                  for await(const [subSubName,subSubH] of subH.entries()){

                    if(subSubH.kind!=='directory'||subSubName.startsWith('.')) continue;

                    try{

                      const subSubKind=await classifyDir(subSubH);

                      if(subSubKind==='post'){

                        const {photos,postMeta,firstImage,notesData,_corruptMeta}=await readPhotosFromDir(subSubH);

                        if(photos.length) albumRecords.push(createAlbumIndexRecord({name:subSubName,handle:subSubH,photos,postMeta,firstImage,notesData,_corruptMeta,_inheritTags:[name,subName],_folderRelPath:`${name}/${subName}/${subSubName}`}));

                      }

                    }catch{}

                  }

                }catch{}

              } else if(subKind!=='empty'){

                // 散图子文件夹：自动按规则处理（有同名txt→每张独立，否则→合并）

                const looseAlbumRecords=await readLooseDirAsAlbumIndexRecords(subH,subName,[name],'auto');

                looseAlbumRecords.forEach(a=>a._folderRelPath=`${name}/${subName}`);

                albumRecords.push(...looseAlbumRecords);

              }

            }catch{}

          }

        }catch{}

        // 分类文件夹下直属的散图

        try{

          const catAlbumRecords=await readLooseDirAsAlbumIndexRecords(h,name,[name],'auto');

          catAlbumRecords.forEach(a=>a._folderRelPath=name);

          albumRecords.push(...catAlbumRecords);

        }catch{}

      } else if(kind==='empty' && STANDARD_SECOND_LEVEL_FOLDERS.includes(name)){

        albumRecords.push(createAlbumIndexRecord({name,handle:h,photos:[],postMeta:null,firstImage:null,notesData:null}));

      }

    }catch{}

  }



  // 根目录散图处理（和之前逻辑一致，但现在支持 txt）

  if(rootLooseImgs.length||rootLooseVids.length){

    const usedCovers=new Set();

    for(const v of rootLooseVids){

      const base=v.name.replace(/\.\w+$/,'');

      const cover=rootLooseImgs.find(p=>p.name.replace(/\.\w+$/,'')=== base);

      if(cover){v.poster=cover;cover._isVideoCover=true;usedCovers.add(cover.name);}

    }

    const rootPhotos=[...rootLooseImgs,...rootLooseVids];

    rootPhotos.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));

    // 注入 txt captions 到 rootNotesData

    if(Object.keys(rootTxtMap).length){

      rootNotesData=rootNotesData||{};

      rootNotesData.photos=rootNotesData.photos||{};

      for(const p of rootPhotos){

        const txtCaption=getTxtCaptionForPhoto(rootTxtMap,p.name);

        if(txtCaption!==undefined)

          rootNotesData.photos[p.name]=txtCaption;

      }

    }

    albumRecords.unshift(createAlbumIndexRecord({name:'__root__',handle:null,photos:rootPhotos,postMeta:null,rootAlbum:true,firstImage:rootLooseImgs[0]||null,notesData:rootNotesData}));

  }



  // 4. 扫描所有已识别的相册记录，自动补全那些直接包含图片的物理分类相册文件夹名

  albumRecords.forEach(a => {

    const possibleTags = [a.name, ...(a._inheritTags || [])];

    possibleTags.forEach(t => {

      if (!t) return;

      const v = String(t).trim();

      const isMatch = STANDARD_SECOND_LEVEL_FOLDERS.includes(v) || (() => {

        const dash = v.indexOf('-');

        if (dash > 0) {

          const parent = v.slice(0, dash).trim();

          if (FOLDER_L1_CORES.has(normalizeTagCore(parent))) return true;

        }

        return FOLDER_L1_CORES.has(normalizeTagCore(v));

      })();

      if (isMatch) {

        detectedCategories.push(v);

      }

    });

  });



  S.defaultFolderCategories=[...new Set(detectedCategories)].length ? [...new Set(detectedCategories)] : [...STANDARD_SECOND_LEVEL_FOLDERS];

  const snapshot = buildRootIndexSnapshot(root, albumRecords);

  await writeRootIndexSnapshot(root, snapshot);

  const albums = await materializeAlbumsFromIndexRecords(albumRecords, root.name);

  return albums;

}



function firstLine(text, max){

  if(!text) return '';

  const line=(text.split('\n').find(l=>l.trim())||'').trim();

  return line.length>max ? line.slice(0,max)+'…' : line;

}



// ── 备注持久化（写入 notes.json）────────────────────────────────────────────

const _writeTimers={};

const _photoCaptionWriteTimers={};

function scheduleWrite(alb){

  clearTimeout(_writeTimers[alb.name]);

  _writeTimers[alb.name]=setTimeout(()=>writeNotes(alb),1200);

}

function getPhotoCaptionSidecarName(photo){

  const base=photo?.name?.replace(/\.\w+$/,'')||'';

  return photo?.isVideo ? `${photo.name}.txt` : `${base}.txt`;

}

async function writePhotoCaptionSidecar(alb, photo, text){

  if(!alb||!photo) return;

  const key=`${alb.name}::${photo.name}`;

  const value=(text??'').replace(/\r\n/g,'\n');

  clearTimeout(_photoCaptionWriteTimers[key]);

  _photoCaptionWriteTimers[key]=setTimeout(async()=>{

    const dirHandle=alb.rootAlbum ? S.rootDirHandle : alb.handle;

    if(!dirHandle) return;

    try{

      const base=photo.name.replace(/\.\w+$/,'');

      const preferred=getPhotoCaptionSidecarName(photo);

      const fallback=preferred===`${base}.txt` ? `${photo.name}.txt` : `${base}.txt`;

      let sidecarName=preferred;

      try{ await dirHandle.getFileHandle(preferred); }

      catch{

        try{ await dirHandle.getFileHandle(fallback); sidecarName=fallback; }

        catch{}

      }

      const fh=await dirHandle.getFileHandle(sidecarName,{create:true});

      const w=await fh.createWritable();

      await w.write(value);

      await w.close();

      alb.notesData=alb.notesData||{};

      alb.notesData.photos=alb.notesData.photos||{};

      alb.notesData.photos[photo.name]=value;

    }catch{/* 只读/无权限时静默降级，不影响使用 */}

  },450);

}

async function writeNotes(alb){

  const dirHandle=alb.rootAlbum ? S.rootDirHandle : alb.handle;

  if(!dirHandle) return;

  try{

    const meta=store.getAlbum(alb.name);

    const raw=store._d();

    const notes={};

    if(meta.title!==undefined)    notes.title=meta.title;

    if(meta.desc!==undefined)     notes.desc=meta.desc;

    // 只在 location 有实际内容时才写入 notes.json；

    // 空字符串不写入，这样下次加载时会回落到 meta.json 里的 IG 真实地址

    if(meta.location!=null && meta.location!=='') notes.location=meta.location;

    const caps=raw[alb.name]?.photos||{};

    const existingPhotos=alb.notesData?.photos||{};

    const mergedCaps={...existingPhotos,...caps}; // notesData fills gaps; localStorage edits take priority

    if(Object.keys(mergedCaps).length) notes.photos=mergedCaps;

    if(meta.tags?.length)         notes.tags=meta.tags;



    const fh=await dirHandle.getFileHandle('notes.json',{create:true});

    const w=await fh.createWritable();

    await w.write(JSON.stringify(notes,null,2));

    await w.close();

    alb.notesData={...alb.notesData,...notes};

  }catch{/* 只读/无权限时静默降级，不影响使用 */}

}



// Recovery: sync all in-memory notesData.photos → localStorage + re-write notes.json

// Runs automatically after each folder load to repair any notes.json missing photos

function recoverNotesFromMemory(){

  let count=0;

  let raw=store._d();

  let changed=false;

  (S.albums||[]).forEach(alb=>{

    const nd=alb.notesData;

    if(!nd) return;

    let patch={};

    let needPatch=false;

    if(nd.title && !raw[alb.name]?.title) { patch.title=nd.title; needPatch=true; }

    if(nd.desc && !raw[alb.name]?.desc) { patch.desc=nd.desc; needPatch=true; }

    if(nd.location && !raw[alb.name]?.location) { patch.location=nd.location; needPatch=true; }

    if(nd.tags && nd.tags.length){

      const localTags=raw[alb.name]?.tags||[];

      if(localTags.length!==nd.tags.length || !nd.tags.every(t=>localTags.includes(t))){

        patch.tags=nd.tags;

        needPatch=true;

      }

    }

    if(nd.photos && Object.keys(nd.photos).length){

      const existing=raw[alb.name]?.photos||{};

      const merged={...nd.photos,...existing};

      if(Object.keys(merged).length !== Object.keys(existing).length){

        patch.photos=merged;

        needPatch=true;

      }

    }

    if(needPatch){

      raw[alb.name]={...raw[alb.name]||{},...patch};

      changed=true;

      count++;

    }

  });

  if(changed){

    store._s(raw);

  }

  if(count>0) toast(`已同步 ${count} 个相册的本地备注与标签`);

}

async function autoFixStaleAlbumFolderPaths() {

  if (!S.albums || S.albums.length === 0 || !S.rootDirHandle) return 0;

  

  let fixedCount = 0;

  for (const alb of S.albums) {

    if (!alb.handle) continue;

    

    const folderTag = getPrimaryFolderCategoryTag(alb);

    const pathInfo = parseFolderRelPath(alb._folderRelPath || alb.name);

    const currentCategory = pathInfo.category || '未分类';

    

    // 💡 檢查當前相冊所處的物理目錄（例如 备忘）是否屬於合法的物理大類

    const isCurrentCategoryLegal = FOLDER_L1_CORES.has(normalizeTagCore(currentCategory));

    

    let targetFolderTag = folderTag;

    // 如果該相冊目前處於一個非法的物理目錄下，且沒有被顯式標記其他合法的物理分類，則自動將其歸檔至 "未分类"

    if (!targetFolderTag && !isCurrentCategoryLegal) {

      targetFolderTag = '未分类';

    }

    

    if (!targetFolderTag) continue;

    

    // 如果物理路径所属的分类与当前的文件夹标签不一致，进行物理移动归位

    if (currentCategory !== targetFolderTag) {

      try {

        const moved = await moveAlbumFolderToCategory(alb, targetFolderTag);

        if (moved) {

          fixedCount++;

          console.log(`[自动归档] 相册 "${alb.name}" 物理路径已由 "${currentCategory}" 修正并归档到 "${targetFolderTag}"`);

          

          // 💡 物理搬移成功後，深度清洗舊的過期物理大類標籤（如 备忘），並寫入規範的新標籤

          const cleanedTags = (alb.tags || []).filter(t => {

            const ts = String(t || '').trim();

            const tsCore = normalizeTagCore(ts);

            if (tsCore === '备忘' || tsCore === '備忘') return false;

            // 去除 L1/L2 複合殘留（如 备忘/备忘-IG）

            const slash = ts.indexOf('/');

            if (slash !== -1) {

              const l1 = ts.slice(0, slash).trim();

              if (normalizeTagCore(l1) === '备忘' || normalizeTagCore(l1) === '備忘') return false;

            }

            return true;

          });

          

          // 寫入新規範標籤

          const canonicalTags = buildCanonicalFolderCategoryTags(targetFolderTag);

          canonicalTags.forEach(t => {

            if (!cleanedTags.includes(t)) cleanedTags.push(t);

          });

          

          alb.tags = cleanedTags;

          

          // 寫入新目錄下的 info.json，保證標籤狀態持久化

          try {

            await writeAlbumMetadata(alb);

          } catch (e) {

            console.error(`[自动归档] 重写相册 "${alb.name}" 标签失败:`, e);

          }

        }

      } catch (e) {

        console.error(`[自动归档失败] 修正相册 "${alb.name}" 物理路径失败:`, e);

      }

    }

  }

  

  if (fixedCount > 0) {

    try {

      const snapshot = buildRootIndexSnapshot(S.rootDirHandle, S.albums);

      await writeRootIndexSnapshot(S.rootDirHandle, snapshot);

    } catch(err) {

      console.warn('[自动归档] 重写快照缓存失败:', err);

    }

    toast(`📁 已自动将 ${fixedCount} 个历史相册归档到对应的文件夹分类下`);

  }

  

  return fixedCount;

}



// ── DOM ───────────────────────────────────────────────────────────────────

const $=id=>document.getElementById(id);

const btnBack=$('btnBack'), btnOpen=$('btnOpen'), btnViewToggle=$('btnViewToggle'), btnSort=$('btnSort'), btnMediaFilter=$('btnMediaFilter');

const hdrTitle=$('hdrTitle'), toastEl=$('toast');

const lbImg=$('lbImg'), lbCaption=$('lbCaption');

const lbPrev=$('lbPrev'), lbNext=$('lbNext');

const lbCounter=$('lbCounter'), lbDate=$('lbDate');

$('lbCaptionIcon').addEventListener('click',()=>lbCaption.focus());

let toastTimer;



function toast(msg,dur=2400){

  toastEl.textContent=msg;toastEl.classList.add('on');

  clearTimeout(toastTimer);

  toastTimer=setTimeout(()=>toastEl.classList.remove('on'),dur);

}



// ── Navigation ────────────────────────────────────────────────────────────

function showView(name){

  if(name==='lb' && S.view!=='album'){

    renderAlbumGrid(S.currentAlbum);

  }

  ['vWelcome','vRestore','vHome','vMap','vAlbum','vLB'].forEach(id=>$(id).classList.remove('on'));

  $({welcome:'vWelcome',restore:'vRestore',home:'vHome',map:'vMap',album:'vAlbum',lb:'vLB'}[name]).classList.add('on');

  S.view=name;

  syncHomeHeaderModes();

}

function isVideoAlbum(alb){

  const photos=alb.photos, n=photos.length, vc=photos.filter(p=>p.isVideo).length;

  return vc===n||(alb.postMeta?.is_video&&vc===0&&n===1);

}

const SORT_CYCLE=['date-desc','date-asc'];

const SORT_LABELS={'date-desc':'日期 ↓','date-asc':'日期 ↑'};

function updateSortBtn(){ btnSort.textContent=SORT_LABELS[S.sortMode]||'排序'; }

function updateMediaBtn(){

  btnMediaFilter.textContent={all:'全部',video:'仅视频',photo:'仅照片'}[S.mediaFilter];

  btnMediaFilter.classList.toggle('pri', S.mediaFilter!=='all');

}

// 從地點字串反查 COUNTRY_MAP，回傳當前語言國家顯示名（找不到回傳 null）

function locToCountry(loc){

  if(!loc) return null;

  const l=loc.toLowerCase().trim();

  for(const entry of COUNTRY_MAP){

    if(entry.kw.some(kw=>matchKeyword(l, kw))) return tagName(entry);

  }

  return null;

}



// 為單張相冊同步 location L2/L3 — 供 backfill 和 input handler 共用

// _useCountryMap 群組：國家→L2，地點→L3（L1/國家/地點）；找不到國家則地點→L2

// 其他群組：地點→L2

function applyLocationL2(alb, newLoc, oldLoc){

  const locGroups=getEffectiveHierarchy().filter(g=>g._useLocationAsL2);

  let dirty=false;

  for(const g of locGroups){

    const l1=tagName(g.l1);

    if(!(alb.tags||[]).some(t=>t===l1||t.startsWith(l1+'/'))) continue;



    // 移除舊 tag

    if(oldLoc){

      const removes=new Set();

      if(g._useCountryMap){

        const c=locToCountry(oldLoc);

        if(c){

          removes.add(`${l1}/${c}/${oldLoc}`);

          

          // 如果新旧国家不同，也把旧国家 L2 移除

          const newC = newLoc ? locToCountry(newLoc) : null;

          if (c !== newC) {

            removes.add(`${l1}/${c}`);

          }

        }

      } else {

        removes.add(`${l1}/${oldLoc}`);

      }

      const before=(alb.tags||[]).length;

      alb.tags=(alb.tags||[]).filter(t=>!removes.has(t));

      if(alb.tags.length!==before) dirty=true;

    }

    // 加新 tag

    if(newLoc){

      const toAdd=[];

      if(g._useCountryMap){

        const c=locToCountry(newLoc);

        if(c){

          if(!alb.tags.includes(`${l1}/${c}`)) toAdd.push(`${l1}/${c}`);// 國家 L2

          toAdd.push(`${l1}/${c}/${newLoc}`);                           // 地點 L3

        }

        // 找不到國家 → 不產生 any tag（避免 L2 太雜）

      } else {

        toAdd.push(`${l1}/${newLoc}`);

      }

      for(const t of toAdd){

        if(!(alb.tags||[]).includes(t)){alb.tags=[...(alb.tags||[]),t];dirty=true;}

      }

    }

  }

  return dirty;

}



function cleanupStaleLocationTags(){

  // 用所有語言變體判斷，避免語言切換時誤刪

  const isCountry=(name)=>COUNTRY_MAP.some(e=>

    ['zh','zh-TW','zh-CN','en','ja','ko','th'].some(lang=>e[lang]===name));

  // 不再有 _useLocationAsL2 的 L1（山海、周末）

  const cleanL1s=new Set(

    getEffectiveHierarchy()

      .filter(g=>!g._useLocationAsL2&&!g._useCountryMap)

      .map(g=>tagName(g.l1))

  );

  // 旅行 L1（保留國家 L2，清除非國家 L2）

  const travelG=getEffectiveHierarchy().find(g=>g._useCountryMap&&g._useLocationAsL2);

  const travelL1=travelG?tagName(travelG.l1):null;



  S.albums.forEach(alb=>{

    if(!(alb.tags&&alb.tags.length)) return;

    const loc=alb.location||'';

    let dirty=false;

    alb.tags=alb.tags.filter(tag=>{

      const slash=tag.indexOf('/');

      if(slash===-1) return true;

      const l1=tag.slice(0,slash);

      const rest=tag.slice(slash+1);

      if(rest.includes('/')) return true; // L3，保留



      // 山海/周末：移除與 location 相同的自動 L2

      if(cleanL1s.has(l1)&&rest===loc&&loc){dirty=true;return false;}



      // 旅行：移除非國家的 L2（用所有語言變體比對）

      if(travelL1&&l1===travelL1&&!isCountry(rest)){dirty=true;return false;}



      return true;

    });

    if(dirty){store.setAlbum(alb.name,{tags:alb.tags});scheduleWrite(alb);}

  });

}



function backfillLocationL2(){

  if(!getEffectiveHierarchy().some(g=>g._useLocationAsL2)) return;

  S.albums.forEach(alb=>{

    if(!alb.location) return;

    if(applyLocationL2(alb, alb.location, null))

      {store.setAlbum(alb.name,{tags:alb.tags});scheduleWrite(alb);}

  });

}



function goHome(){

  cleanupStaleLocationTags();

  backfillLocationL2();

  renderHome();showView('home');

  hdrTitle.textContent=`📸 ${S.rootName||t('appName')}`;

  btnBack.style.display='none';btnViewToggle.style.display='none';

  btnSort.style.display='';updateSortBtn();

  $('btnTimeline').style.display='';

  $('btnTimeline').classList.toggle('active',S.timelineMode);

  $('btnMap').style.display='';

  $('btnMap').classList.toggle('active',S.mapMode);

  btnMediaFilter.style.display='';updateMediaBtn();

  $('btnRefresh').style.display='';

  $('btnTranslate').style.display='';

  $('btnBackup').style.display='';

  $('btnAddPosts').style.display='';

  btnOpen.style.display='';$('hdr').style.display='';

  document.dispatchEvent(new CustomEvent('folder-loaded'));

}

function goAlbum(alb){

  S.currentAlbum=alb;S.albumMode='grid';

  renderAlbumGrid(alb);showView('album');

  hdrTitle.textContent=alb.title;

  btnBack.style.display='';btnViewToggle.style.display='';

  btnSort.style.display='none';btnMediaFilter.style.display='none';

  $('btnTimeline').style.display='none';

  $('btnMap').style.display='none';

  $('btnRefresh').style.display='';

  $('btnTranslate').style.display='';

  $('btnBackup').style.display='';

  $('btnAddPosts').style.display='';

  btnOpen.style.display='none';updateGridBtn();

  $('hdr').style.display='';

}



function updateGridBtn(){

  btnViewToggle.textContent=S.albumMode==='grid'?t('feedView'):t('gridView');

}

function openLB(alb,idx){

  S.currentAlbum=alb;S.currentIdx=idx;

  showView('lb');renderLB();$('hdr').style.display='none';

}

// _slideshowTimer defined later; stopSlideshow() is a forward-callable fn reference

function closeLB(){

  if(typeof stopSlideshow==='function') stopSlideshow();

  $('lbVideo').pause();

  if(document.fullscreenElement) document.exitFullscreen?.().catch(()=>{});

  $('hdr').style.display='';showView('album');

  hdrTitle.textContent=S.currentAlbum.title;

  btnBack.style.display='';btnViewToggle.style.display='';

  btnOpen.style.display='none';

  btnSort.style.display='none';

  btnMediaFilter.style.display='none';

}



// ── Render: Home ──────────────────────────────────────────────────────────

function getAlbumDate(alb){

  const d=alb.postMeta?.date?new Date(alb.postMeta.date):alb.photos[0]?.date;

  return (d&&!isNaN(+d))?+d:0;

}

function getFilteredAlbums(){

  let result = S.albums;

  // 收藏篩選

  if(S.showFavOnly) result=result.filter(alb=>store.getFav(alb.name));

  // 搜尋篩選

  if(S.searchQuery){

    const q=S.searchQuery.toLowerCase();

    result=result.filter(alb=>{

      if((alb.title||alb.name||'').toLowerCase().includes(q)) return true;

      if((alb.desc||'').toLowerCase().includes(q)) return true;

      if((alb.postMeta?.caption||'').toLowerCase().includes(q)) return true;

      if((alb.location||'').toLowerCase().includes(q)) return true;

      return false;

    });

  }

  if(S.activeTags.size){

    const UNTAGGED=t('filterUntagged');

    result=result.filter(alb=>{

      const tags=alb.tags||[];

      for(const ft of S.activeTags){

        if(ft===UNTAGGED){

          // 未分類：無任何 L1 標簽（tags 全空，或只有 L2 孤兒）

          const hasL1=tags.some(tag=>!tag.includes('/'));

          if(hasL1) return false;

        } else if(ft.endsWith(L2_UNCLASSIFIED)){

          // L1 下的未分类：有该 L1（裸标签）但无该 L1 下的任何 L2

          const l1=ft.slice(0,-L2_UNCLASSIFIED.length);

          if(!tags.some(t=>t===l1)||tags.some(t=>t.startsWith(l1+'/'))) return false;

        } else {

          if(!tags.some(tag=>tag===ft||tag.startsWith(ft+'/'))) return false;

        }

      }

      return true;

    });

  }

  if(S.activeLocation) result=result.filter(alb=>alb.location===S.activeLocation);

  if(S.mediaFilter==='video'){

    result=result.filter(alb=>{

      if(S.homePreviewMode==='photos') return alb.photos.some(p=>p.isVideo);

      return isVideoAlbum(alb);

    });

  } else if(S.mediaFilter==='photo'){

    result=result.filter(alb=>{

      if(S.homePreviewMode==='photos') return alb.photos.some(p=>!p.isVideo);

      return !isVideoAlbum(alb);

    });

  }

  return [...result].sort((a,b)=>{

    if(S.sortMode==='date-desc') return getAlbumDate(b)-getAlbumDate(a);

    if(S.sortMode==='date-asc')  return getAlbumDate(a)-getAlbumDate(b);

    const cmp=a.name.localeCompare(b.name,'zh');

    return S.sortMode==='name-asc' ? cmp : -cmp;

  });

}



function mkChip(label,active,onClick){

  const c=document.createElement('div');

  c.className='filterChip'+(active?' active':'');

  c.textContent=label;c.addEventListener('click',e=>onClick(e));return c;

}



function buildL3Row(l2tag,l3counts){

  const row=document.createElement('div');

  row.className='l2row';row.style.cssText='padding-left:36px;border-left-color:var(--s3,#2a2a2a)';

  row.dataset.l2=l2tag;

  [...l3counts.entries()].sort((a,b)=>b[1]-a[1]).forEach(([tag,cnt])=>{

    const label=tag.split('/')[2]||tag;

    const active=S.activeTags.has(tag);

    const c=mkChip(`${label}${cnt>1?' '+cnt:''}`,active,e=>{

      if(e.ctrlKey||e.metaKey){

        if(active) S.activeTags.delete(tag);

        else{S.activeTags.delete(l2tag);S.activeTags.add(tag);}

      } else {

        S.activeTags.clear();

        if(!active) S.activeTags.add(tag);

      }

      S.expandedL2s.add(l2tag);

      refreshHomeFilter();

    });

    c.classList.add('l3chip');

    row.appendChild(c);

  });

  return row;

}



function buildL2Row(l1,l2counts,l3Map){

  // wrapper：持有 data-l1，用於 toggleL2 的 querySelector

  const block=document.createElement('div');

  block.className='l2block';

  block.dataset.l1=l1;

  const row=document.createElement('div');

  row.className='l2row';

  block.appendChild(row);



  const unclKey=l1+L2_UNCLASSIFIED;

  const mkL2Chip=(tag,cnt,label,isUncl)=>{

    const hasL3=!isUncl&&l3Map&&l3Map.has(tag)&&l3Map.get(tag).size>0;

    const active=S.activeTags.has(tag)||(!isUncl&&[...S.activeTags].some(t=>t.startsWith(tag+'/')));

    const wrap=document.createElement('div');

    wrap.style.cssText='display:inline-flex;align-items:center;gap:2px';

    const c=mkChip(`${label}${cnt>1?' '+cnt:''}`,active,e=>{

      if(e.ctrlKey||e.metaKey){

        if(active){S.activeTags.delete(tag);[...S.activeTags].filter(t=>t.startsWith(tag+'/')).forEach(t=>S.activeTags.delete(t));}

        else{S.activeTags.delete(l1);S.activeTags.add(tag);}

      } else {

        S.activeTags.clear();

        if(!active) S.activeTags.add(tag);

      }

      S.expandedL1s.add(l1);

      refreshHomeFilter();

    });

    c.classList.add('l2chip');

    if(isUncl) c.style.cssText='opacity:.6;border-style:dashed';

    wrap.appendChild(c);

    if(hasL3){

      const expanded=S.expandedL2s.has(tag);

      const arr=document.createElement('span');

      arr.textContent=expanded?'▲':'▼';

      arr.style.cssText='font-size:9px;cursor:pointer;color:var(--muted);padding:0 2px;user-select:none';

      arr.addEventListener('click',e=>{

        e.stopPropagation();

        expanded?S.expandedL2s.delete(tag):S.expandedL2s.add(tag);

        refreshHomeFilter();

      });

      wrap.appendChild(arr);

    }

    row.appendChild(wrap);

    // L3 row 作為 block 的子節點（row 的兄弟），避免進入 flex 佈局

    if(hasL3&&S.expandedL2s.has(tag)){

      block.appendChild(buildL3Row(tag,l3Map.get(tag)));

    }

  };

  [...l2counts.entries()].filter(([t])=>{

    if(t===unclKey) return false;

    // 💡 防止 L1 平級標籤被誤顯示為 L2 子項：

    // 若 tag 的「核心名」本身是一個 FOLDER_L1_CORES 大類，則跳過不渲染

    const core = normalizeTagCore(t.includes('/') ? t.slice(t.indexOf('/')+1) : t);

    if(FOLDER_L1_CORES.has(core) || FOLDER_L1_CORES.has(t)) return false;

    // 同理：若 tag 本身是其他 L1（無斜線，且與當前 l1 不同），也跳過

    if(!t.includes('/') && t !== l1) return false;

    return true;

  }).sort((a,b)=>b[1]-a[1])

    .forEach(([tag,cnt])=>mkL2Chip(tag,cnt,tag.split('/')[1],false));

  if(l2counts.has(unclKey)) mkL2Chip(unclKey,l2counts.get(unclKey),'未分类',true);

  return block;

}



function buildFilterBar(){

  const l1Counts=new Map(),l2Map=new Map(),l3Map=new Map();

  S.albums.forEach(alb=>{

    const seenL1=new Set(),seenL2=new Set();

    const classifiedSuffixes=new Set();

    (alb.tags||[]).forEach(tag=>{

      // 💡 过滤掉所有与文件夹（物理分类）相关的标签，使其不混入普通标签列表中

      if(isFolderRelatedTag(tag)) return;

      const slash=tag.indexOf('/');

      if(slash===-1) return;

      classifiedSuffixes.add(tag.slice(slash+1));

    });

    (alb.tags||[]).forEach(tag=>{

      if(isFolderRelatedTag(tag)) return;

      const slash=tag.indexOf('/');

      if(slash===-1){

        if(!classifiedSuffixes.has(tag)){

          if(!seenL1.has(tag)){seenL1.add(tag);l1Counts.set(tag,(l1Counts.get(tag)||0)+1);}

        }

      } else {

        const l1=tag.slice(0,slash);

        const rest=tag.slice(slash+1);

        if(!seenL1.has(l1)){seenL1.add(l1);l1Counts.set(l1,(l1Counts.get(l1)||0)+1);}

        const slash2=rest.indexOf('/');

        if(slash2!==-1){

          // L3 tag: L1/L2/L3

          const l2Full=`${l1}/${rest.slice(0,slash2)}`;

          if(!l2Map.has(l1)) l2Map.set(l1,new Map());

          if(!seenL2.has(l2Full)){seenL2.add(l2Full);l2Map.get(l1).set(l2Full,(l2Map.get(l1).get(l2Full)||0)+1);}

          if(!l3Map.has(l2Full)) l3Map.set(l2Full,new Map());

          l3Map.get(l2Full).set(tag,(l3Map.get(l2Full).get(tag)||0)+1);

        } else {

          // L2 tag

          if(!l2Map.has(l1)) l2Map.set(l1,new Map());

          l2Map.get(l1).set(tag,(l2Map.get(l1).get(tag)||0)+1);

        }

      }

    });

  });



  // 为每个 L1 统计「有该 L1 裸标签但无任何 L1/xxx」的 album 数，注入虚拟 L2 未分类 entry

  for(const l1 of l1Counts.keys()){

    const unclCnt=S.albums.filter(alb=>{

      const tags=alb.tags||[];

      return tags.some(t=>t===l1)&&!tags.some(t=>t.startsWith(l1+'/'));

    }).length;

    if(unclCnt>0){

      if(!l2Map.has(l1)) l2Map.set(l1,new Map());

      l2Map.get(l1).set(l1+L2_UNCLASSIFIED,unclCnt);

    }

  }



  // 哪些 L1 應強制顯示箭頭（即使目前無 L2 資料）

  const alwaysArrowL1s=new Set(

    getEffectiveHierarchy().filter(g=>g._alwaysShowArrow).map(g=>tagName(g.l1))

  );



  const bar=document.createElement('div');

  bar.className='filterBar';bar.id='filterBar';

  const hasUntagged=S.albums.some(alb=>!(alb.tags||[]).some(tag=>!tag.includes('/')));



  // 合併：有素材的 L1（按數量排序）+ 無素材的 L1（按 hierarchy 順序）

  const effectiveL1s=getEffectiveHierarchy().map(g=>tagName(g.l1));

  const presentEntries=[...l1Counts.entries()].sort((a,b)=>{

    const aRank=getPreferredFolderCategoryRank(a[0]);

    const bRank=getPreferredFolderCategoryRank(b[0]);

    if(aRank!==bRank) return aRank-bRank;

    return b[1]-a[1];

  });

  const presentSet=new Set(presentEntries.map(([l1])=>l1));

  const absentEntries=effectiveL1s.filter(l1=>!presentSet.has(l1)).map(l1=>[l1,0]);

  const allEntries=[...presentEntries,...absentEntries];



  const favCount=S.albums.filter(a=>store.getFav(a.name)).length;

  if(!allEntries.length&&!hasUntagged&&!favCount){bar.style.display='none';return bar;}



  bar.appendChild(mkChip(t('filterAll'),!S.activeTags.size&&!S.showFavOnly&&!S.activeLocation,()=>{S.activeTags.clear();S.showFavOnly=false;S.activeLocation=null;refreshHomeFilter();}));

  if(favCount){

    const favChip=mkChip(`⭐ 收藏 ${favCount}`,S.showFavOnly,()=>{

      S.showFavOnly=!S.showFavOnly;

      S.activeTags.clear();

      refreshHomeFilter();

    });

    bar.appendChild(favChip);

  }



  allEntries.forEach(([l1,cnt])=>{

    const hasL2Data=l2Map.has(l1)&&l2Map.get(l1).size>0;

    const showArrow=hasL2Data||alwaysArrowL1s.has(l1);

    const l1Active=S.activeTags.has(l1)||[...S.activeTags].some(t=>t.startsWith(l1+'/'));



    const label=cnt>0?`${l1} ${cnt}`:l1;

    const chip=mkChip(label,l1Active,e=>{

      if(cnt===0) return; // 無素材時不可點擊篩選

      if(e.ctrlKey||e.metaKey){

        [...S.activeTags].filter(t=>t===l1||t.startsWith(l1+'/')).forEach(t=>S.activeTags.delete(t));

        if(!l1Active) S.activeTags.add(l1);

      } else {

        S.activeTags.clear();

        if(!l1Active) S.activeTags.add(l1);

      }

      refreshHomeFilter();

    });

    if(cnt===0) chip.style.cssText='opacity:.3;cursor:default';



    if(showArrow){

      const arrow=document.createElement('span');

      const isExpanded=S.expandedL1s.has(l1);

      arrow.textContent=isExpanded?' ▴':' ▾';

      arrow.style.cssText='opacity:.5;font-size:10px';

      chip.appendChild(arrow);



      const toggleL2=()=>{

        if(!hasL2Data) return; // 無 L2 資料時箭頭僅作裝飾

        const existing=bar.querySelector(`.l2block[data-l1="${CSS.escape(l1)}"]`);

        if(existing){

          existing.remove();arrow.textContent=' ▾';S.expandedL1s.delete(l1);

        } else {

          const row=buildL2Row(l1,l2Map.get(l1),l3Map);

          chip.after(row);arrow.textContent=' ▴';S.expandedL1s.add(l1);

        }

      };

      arrow.addEventListener('click',e=>{e.stopPropagation();toggleL2();});



      // 恢復展開狀態（僅在有 L2 資料時）

      if(isExpanded&&hasL2Data){

        const row=buildL2Row(l1,l2Map.get(l1),l3Map);

        bar._pendingL2=bar._pendingL2||[];

        bar._pendingL2.push({chip,row});

      }

    }

    bar.appendChild(chip);

  });



  // 插入所有待恢復的 L2 行

  if(bar._pendingL2){

    bar._pendingL2.forEach(({chip,row})=>chip.after(row));

    delete bar._pendingL2;

  }



  // 未分類 chip（有無標簽的 album 時才顯示）

  const UNTAGGED=t('filterUntagged');

  const untaggedCnt=S.albums.filter(alb=>{

    const tags=alb.tags||[];

    return !tags.some(tag=>!tag.includes('/'));

  }).length;

  if(untaggedCnt>0){

    const untaggedActive=S.activeTags.has(UNTAGGED);

    const uc=mkChip(`${UNTAGGED} ${untaggedCnt}`,untaggedActive,e=>{

      if(e.ctrlKey||e.metaKey){

        if(untaggedActive) S.activeTags.delete(UNTAGGED);

        else S.activeTags.add(UNTAGGED);

      } else {

        S.activeTags.clear();

        if(!untaggedActive) S.activeTags.add(UNTAGGED);

      }

      refreshHomeFilter();

    });

    uc.style.cssText='opacity:.6;border-style:dashed';

    bar.appendChild(uc);

  }



  // 📍 地點篩選 chips

  // 📍 地點篩選（摺疊式）

  const locCounts=new Map();

  S.albums.forEach(alb=>{if(alb.location) locCounts.set(alb.location,(locCounts.get(alb.location)||0)+1);});

  if(locCounts.size>0){

    const hasActiveLoc=!!S.activeLocation;

    // 若目前有篩選地點，預設展開；否則摺疊

    const locExpanded=hasActiveLoc||S._locRowExpanded||false;



    // 觸發行（📍 toggle 按鈕）

    const locToggle=document.createElement('button');

    locToggle.className='hbtn ghost';

    const activeLocLabel=S.activeLocation?` · ${S.activeLocation}`:'';

    locToggle.innerHTML=`📍<span style="font-size:11px;opacity:.6"> ${locCounts.size}個地點${activeLocLabel}</span> <span style="font-size:10px;opacity:.4">${locExpanded?'▴':'▾'}</span>`;

    locToggle.style.cssText='font-size:12px;padding:2px 8px;flex-shrink:0';

    if(hasActiveLoc) locToggle.style.borderColor='var(--accent)';

    bar.appendChild(locToggle);



    // 地點 chips 行（預設摺疊）

    const locRow=document.createElement('div');

    locRow.className='l2row';

    locRow.style.cssText=`width:100%;margin:2px 0 0 0;${locExpanded?'':'display:none'}`;

    const sortedLocs=[...locCounts.entries()].sort((a,b)=>b[1]-a[1]);

    sortedLocs.forEach(([loc,cnt])=>{

      const active=S.activeLocation===loc;

      const chip=mkChip(`${loc} ${cnt}`,active,()=>{

        S.activeLocation=active?null:loc;

        refreshHomeFilter();

      });

      chip.style.cssText='font-size:11px;padding:1px 7px';

      locRow.appendChild(chip);

    });

    bar.appendChild(locRow);



    locToggle.addEventListener('click',()=>{

      const nowHidden=locRow.style.display==='none';

      locRow.style.display=nowHidden?'':'none';

      S._locRowExpanded=nowHidden;

      locToggle.querySelector('span:last-child').textContent=nowHidden?' ▴':' ▾';

    });

  }



  // ⚙ 管理按鈕（靠右）

  const gearBtn=document.createElement('button');

  gearBtn.className='filterManageBtn';gearBtn.title='管理 L1 分類';

  gearBtn.innerHTML='&#9881;';gearBtn.style.marginLeft='auto';

  gearBtn.addEventListener('click',()=>{

    TagManager.open();

  });

  bar.appendChild(gearBtn);



  return bar;

}



// ── 標籤管理 Modal ─────────────────────────────────────────────────────────

const TagManager=(function(){

  let _expandedL1s=new Set();



  function open(){

    $('tagMgrModal').classList.add('on');

    _render();

  }

  function close(){

    $('tagMgrModal').classList.remove('on');

  }



  function _mk(tag,cls,txt){

    const el=document.createElement(tag);

    if(cls) el.className=cls;

    if(txt!=null) el.textContent=txt;

    return el;

  }



  function _buildEditForm(initName,initKw,onSave,onCancel){

    const form=_mk('div','tmEditForm');

    form.append(_mk('div','tmInpLabel','名稱'));

    const nInp=_mk('input','tmInp');nInp.value=initName;

    form.appendChild(nInp);

    form.append(_mk('div','tmInpLabel','偵測關鍵字（逗號分隔）'));

    const kInp=_mk('input','tmInp');kInp.value=initKw;

    form.appendChild(kInp);

    const btnRow=_mk('div','tmEditBtns');

    const saveBtn=_mk('button','tmSaveBtn','儲存');

    const cancelBtn=_mk('button','tmCancelBtn','取消');

    saveBtn.addEventListener('click',()=>{

      const nn=nInp.value.trim();if(!nn){nInp.focus();return;}

      const nk=kInp.value.split(',').map(k=>k.trim()).filter(Boolean);

      onSave(nn,nk);

    });

    cancelBtn.addEventListener('click',onCancel);

    [nInp,kInp].forEach(inp=>inp.addEventListener('keydown',e=>{

      if(e.key==='Enter'){e.preventDefault();saveBtn.click();}

      if(e.key==='Escape'){e.preventDefault();onCancel();}

    }));

    btnRow.append(saveBtn,cancelBtn);

    form.appendChild(btnRow);

    requestAnimationFrame(()=>nInp.focus());

    return form;

  }



  function _buildL2Section(l2List,onEdit,onDelete,onAdd){

    const sec=_mk('div','tmL2Section');

    sec.appendChild(_mk('div','tmL2SectionHdr','L2 子分類'));

    l2List.forEach(({name,readOnly},li)=>{

      const r=_mk('div','tmL2Row');

      r.appendChild(_mk('span','tmL2Name',name));

      const rbtns=_mk('div','tmRowBtns');

      // ✏ 改：所有 L2 都可改名

      const eBtn=_mk('button','tmBtn','✏');

      eBtn.addEventListener('click',()=>{

        if(r.querySelector('.tmEditForm')) return;

        const form=_mk('div','tmEditForm');

        form.style.cssText='flex-direction:row;gap:6px;align-items:center;margin-top:4px';

        const inp=_mk('input','tmInp');inp.value=name;inp.style.flex='1';

        const ok=_mk('button','tmSaveBtn','儲存');

        const cancel=_mk('button','tmCancelBtn','✕');

        const doSave=()=>{const n=inp.value.trim();if(!n){inp.focus();return;}onEdit(li,name,n);};

        ok.addEventListener('click',doSave);

        cancel.addEventListener('click',()=>form.remove());

        inp.addEventListener('keydown',e=>{

          if(e.key==='Enter'){e.preventDefault();doSave();}

          if(e.key==='Escape'){e.preventDefault();form.remove();}

        });

        form.append(inp,ok,cancel);

        r.after(form);

        requestAnimationFrame(()=>inp.focus());

      });

      rbtns.appendChild(eBtn);

      // 刪：只有用戶新增的

      if(!readOnly){

        const dBtn=_mk('button','tmBtn danger','刪');

        dBtn.addEventListener('click',()=>onDelete(li));

        rbtns.appendChild(dBtn);

      }

      r.appendChild(rbtns);

      sec.appendChild(r);

    });

    // add L2 button + inline input

    const addBtn=_mk('button','tmBtn tmAddL2Btn','＋ 新增 L2');

    addBtn.addEventListener('click',()=>{

      addBtn.style.display='none';

      const row=_mk('div','tmEditForm');

      row.style.flexDirection='row';row.style.gap='6px';row.style.alignItems='center';

      const inp=_mk('input','tmInp');inp.placeholder='L2 名稱（含 emoji）';inp.style.flex='1';

      const ok=_mk('button','tmSaveBtn','＋');

      const cancel=_mk('button','tmCancelBtn','✕');

      const doAdd=()=>{

        const n=inp.value.trim();if(!n){inp.focus();return;}

        onAdd(n,[]);

      };

      ok.addEventListener('click',doAdd);

      cancel.addEventListener('click',()=>{addBtn.style.display='';row.remove();});

      inp.addEventListener('keydown',e=>{

        if(e.key==='Enter'){e.preventDefault();doAdd();}

        if(e.key==='Escape'){e.preventDefault();cancel.click();}

      });

      row.append(inp,ok,cancel);

      sec.appendChild(row);

      requestAnimationFrame(()=>inp.focus());

    });

    sec.appendChild(addBtn);

    return sec;

  }



  function _render(){

    const body=$('tagMgrBody');

    const foot=$('tagMgrFoot');

    body.innerHTML='';

    foot.innerHTML='';

    const cfg=loadTagConfig();

    const extraL2=cfg.extraL2||{};



    // ── 預設分類 ────────────────────────────────────────────

    body.appendChild(_mk('div','tmSecHdr','預設分類（無法刪除）'));



    const builtinGroups=[...TAG_HIERARCHY, ...buildFolderDefaultCategoryGroups()];

    builtinGroups.forEach(group=>{

      const origKey=tagName(group.l1);

      const ov=(cfg.overrides||{})[origKey]||{};

      const displayName=ov.name||origKey;

      const kws=group.kw||[];

      const builtinL2=group._useLocationAsL2?null:(group.children||[]);

      const extras=extraL2[origKey]||[];



      const rowWrap=_mk('div');rowWrap.dataset.key=origKey;



      // main row

      const row=_mk('div','tmL1Row');

      const dot=_mk('span','tmDot');

      const nameEl=_mk('span','tmL1Name',displayName);

      if(group._systemDefault){

        const badge=_mk('span','tmCustomBadge','資料夾');

        row.appendChild(badge);

      }

      const kwBadge=_mk('span','tmKwBadge',kws.length+' kw');

      kwBadge.title='點擊編輯關鍵字';

      kwBadge.style.cursor='pointer';

      kwBadge.addEventListener('click',()=>{

        if(rowWrap.querySelector('.tmKwForm')) return;

        const form=_mk('div','tmEditForm tmKwForm');

        form.style.cssText='flex-direction:row;gap:6px;align-items:center;margin-top:4px';

        const inp=_mk('input','tmInp');inp.value=kws.join(', ');inp.style.flex='1';inp.placeholder='逗號分隔…';

        const ok=_mk('button','tmSaveBtn','儲存');

        const cancel=_mk('button','tmCancelBtn','✕');

        const doSave=()=>{

          const nk=inp.value.split(',').map(k=>k.trim()).filter(Boolean);

          const c2=loadTagConfig();

          if(!c2.overrides)c2.overrides={};

          c2.overrides[origKey]=Object.assign(c2.overrides[origKey]||{},{kw:nk});

          saveTagConfig(c2);refreshHomeFilter();_render();

        };

        ok.addEventListener('click',doSave);

        cancel.addEventListener('click',()=>form.remove());

        inp.addEventListener('keydown',e=>{

          if(e.key==='Enter'){e.preventDefault();doSave();}

          if(e.key==='Escape'){e.preventDefault();form.remove();}

        });

        form.append(inp,ok,cancel);

        rowWrap.appendChild(form);

        requestAnimationFrame(()=>{inp.focus();inp.select();});

      });

      // ▼ L2 / 佔位 — 放最前面

      const hasL2=(builtinL2&&builtinL2.length>0)||extras.length>0||group._useLocationAsL2||group._alwaysShowArrow;

      let expEl;

      if(hasL2){

        expEl=_mk('button','tmBtn',_expandedL1s.has(origKey)?'▲ L2':'▼ L2');

        expEl.style.flexShrink='0';

        expEl.addEventListener('click',()=>{

          _expandedL1s.has(origKey)?_expandedL1s.delete(origKey):_expandedL1s.add(origKey);

          _render();

        });

      } else {

        expEl=_mk('span');expEl.style.cssText='display:inline-block;width:46px;flex-shrink:0';

      }



      // ✏ 改名（靠右）

      const editBtn=_mk('button','tmBtn','✏ 改');

      editBtn.addEventListener('click',()=>{

        if(rowWrap.querySelector('.tmEditForm')) return;

        const form=_mk('div','tmEditForm');

        form.style.cssText='flex-direction:row;gap:6px;align-items:center;margin-top:4px';

        const inp=_mk('input','tmInp');inp.value=nameEl.textContent;inp.style.flex='1';

        const ok=_mk('button','tmSaveBtn','儲存');

        const cancel=_mk('button','tmCancelBtn','✕');

        const doSave=()=>{

          const n=inp.value.trim();if(!n){inp.focus();return;}

          // 自動同步：所有卡片的舊標籤 → 新標籤

          renameTagOnAllAlbums(origKey,n);

          const c2=loadTagConfig();

          if(!c2.overrides)c2.overrides={};

          c2.overrides[origKey]=Object.assign(c2.overrides[origKey]||{},{name:n});

          saveTagConfig(c2);refreshHomeFilter();_render();

        };

        ok.addEventListener('click',doSave);

        cancel.addEventListener('click',()=>form.remove());

        inp.addEventListener('keydown',e=>{

          if(e.key==='Enter'){e.preventDefault();doSave();}

          if(e.key==='Escape'){e.preventDefault();form.remove();}

        });

        form.append(inp,ok,cancel);

        rowWrap.appendChild(form);

        requestAnimationFrame(()=>inp.focus());

      });



      row.append(expEl,dot,nameEl,kwBadge,editBtn);

      rowWrap.appendChild(row);



      // L2 section

      if(_expandedL1s.has(origKey)){

        if(group._useLocationAsL2){

          const note=_mk('div');

          note.style.cssText='margin:2px 0 6px 18px;font-size:11px;color:var(--muted);opacity:.6;border-left:2px solid var(--border);padding-left:10px';

          note.textContent='（自動從帖子地點生成 L2，不可手動管理）';

          rowWrap.appendChild(note);

        } else {

          const l2Ov=(cfg.l2Overrides||{})[origKey]||{};

          const l2List=[

            ...(builtinL2||[]).map(ch=>{const orig=tagName(ch.l2);return{name:l2Ov[orig]||orig,kw:ch.kw||[],readOnly:true};}),

            ...extras.map(e=>({

              name:typeof e==='string'?e:(e.l2?.zh||''),

              kw:typeof e==='string'?[]:(e.kw||[]),

              readOnly:false

            }))

          ];

          const l2Sec=_buildL2Section(

            l2List,

            (li,oldName,nn)=>{

              const c2=loadTagConfig();

              const bLen=(builtinL2||[]).length;

              if(li<bLen){

                // builtin L2：存 l2Overrides

                if(!c2.l2Overrides)c2.l2Overrides={};

                if(!c2.l2Overrides[origKey])c2.l2Overrides[origKey]={};

                const origName=tagName((builtinL2||[])[li].l2);

                c2.l2Overrides[origKey][origName]=nn;

              } else {

                const exIdx=li-bLen;

                if(!c2.extraL2)c2.extraL2={};

                if(!c2.extraL2[origKey])c2.extraL2[origKey]=[];

                c2.extraL2[origKey][exIdx].l2={zh:nn,en:nn,th:nn,ja:nn,ko:nn};

              }

              // 自動同步：所有卡片上的舊 L2 標籤 → 新 L2 標籤

              renameTagOnAllAlbums(origKey+'/'+oldName,origKey+'/'+nn);

              saveTagConfig(c2);_render();

            },

            (li)=>{

              const exIdx=li-(builtinL2?.length||0);

              const c2=loadTagConfig();

              c2.extraL2[origKey].splice(exIdx,1);

              saveTagConfig(c2);_render();

            },

            (nn)=>{

              const c2=loadTagConfig();

              if(!c2.extraL2)c2.extraL2={};

              if(!c2.extraL2[origKey])c2.extraL2[origKey]=[];

              c2.extraL2[origKey].push({l2:{zh:nn,en:nn,th:nn,ja:nn,ko:nn},kw:[]});

              saveTagConfig(c2);_render();

            }

          );

          rowWrap.appendChild(l2Sec);

        }

      }

      body.appendChild(rowWrap);

    });



    // ── 自定義分類 ─────────────────────────────────────────

    body.appendChild(_mk('div','tmSecHdr','自定義分類'));

    const customs=cfg.custom||[];

    if(!customs.length){

      const empty=_mk('div');

      empty.style.cssText='font-size:12px;color:var(--muted);padding:6px 5px;opacity:.6';

      empty.textContent='尚無自定義分類';

      body.appendChild(empty);

    }

    customs.forEach((c,ci)=>{

      const cKey='_c'+ci;

      const rowWrap=_mk('div');rowWrap.dataset.key=cKey;

      const row=_mk('div','tmL1Row');

      const badge=_mk('span','tmCustomBadge','自定');

      const nameEl=_mk('span','tmL1Name',c.name);

      const kws=c.kw||[];

      const kwBadge=_mk('span','tmKwBadge',kws.length+' kw');

      kwBadge.title='點擊編輯關鍵字';

      kwBadge.style.cursor='pointer';

      kwBadge.addEventListener('click',()=>{

        if(rowWrap.querySelector('.tmKwForm')) return;

        const form=_mk('div','tmEditForm tmKwForm');

        form.style.cssText='flex-direction:row;gap:6px;align-items:center;margin-top:4px';

        const inp=_mk('input','tmInp');inp.value=kws.join(', ');inp.style.flex='1';inp.placeholder='逗號分隔…';

        const ok=_mk('button','tmSaveBtn','儲存');

        const cancel=_mk('button','tmCancelBtn','✕');

        const doSave=()=>{

          const nk=inp.value.split(',').map(k=>k.trim()).filter(Boolean);

          const c2=loadTagConfig();

          c2.custom[ci].kw=nk;

          saveTagConfig(c2);refreshHomeFilter();_render();

        };

        ok.addEventListener('click',doSave);

        cancel.addEventListener('click',()=>form.remove());

        inp.addEventListener('keydown',e=>{

          if(e.key==='Enter'){e.preventDefault();doSave();}

          if(e.key==='Escape'){e.preventDefault();form.remove();}

        });

        form.append(inp,ok,cancel);

        rowWrap.appendChild(form);

        requestAnimationFrame(()=>{inp.focus();inp.select();});

      });

      // ▼ L2 放最前面（自定義一律顯示）

      const expBtn=_mk('button','tmBtn',_expandedL1s.has(cKey)?'▲ L2':'▼ L2');

      expBtn.style.flexShrink='0';

      expBtn.addEventListener('click',()=>{

        _expandedL1s.has(cKey)?_expandedL1s.delete(cKey):_expandedL1s.add(cKey);

        _render();

      });



      // ✏ 改名（inline，靠右）

      const editBtn=_mk('button','tmBtn','✏ 改');

      editBtn.addEventListener('click',()=>{

        if(rowWrap.querySelector('.tmEditForm')) return;

        const form=_mk('div','tmEditForm');

        form.style.cssText='flex-direction:row;gap:6px;align-items:center;margin-top:4px';

        const inp=_mk('input','tmInp');inp.value=c.name;inp.style.flex='1';

        const ok=_mk('button','tmSaveBtn','儲存');

        const cancel=_mk('button','tmCancelBtn','✕');

        const doSave=()=>{

          const n=inp.value.trim();if(!n){inp.focus();return;}

          const c2=loadTagConfig();

          c2.custom[ci].name=n;

          saveTagConfig(c2);refreshHomeFilter();_render();

        };

        ok.addEventListener('click',doSave);

        cancel.addEventListener('click',()=>form.remove());

        inp.addEventListener('keydown',e=>{

          if(e.key==='Enter'){e.preventDefault();doSave();}

          if(e.key==='Escape'){e.preventDefault();form.remove();}

        });

        form.append(inp,ok,cancel);

        rowWrap.appendChild(form);

        requestAnimationFrame(()=>inp.focus());

      });



      // 刪除

      const delBtn=_mk('button','tmBtn danger','刪除');

      delBtn.addEventListener('click',()=>{

        if(!confirm(`確認刪除分類「${c.name}」？相冊中已套用此標籤的資料不受影響。`))return;

        const c2=loadTagConfig();

        c2.custom.splice(ci,1);

        saveTagConfig(c2);_expandedL1s.delete(cKey);

        refreshHomeFilter();_render();

      });



      row.append(expBtn,badge,nameEl,kwBadge,editBtn,delBtn);

      rowWrap.appendChild(row);



      // custom L2

      if(_expandedL1s.has(cKey)){

        const cChildren=c.children||[];

        const l2List=cChildren.map(ch=>({

          name:typeof ch==='string'?ch:(ch.l2?.zh||ch.name||''),

          kw:typeof ch==='string'?[]:(ch.kw||[]),

          readOnly:false

        }));

        const l2Sec=_buildL2Section(

          l2List,

          (li,nn)=>{

            const c2=loadTagConfig();

            if(!c2.custom[ci].children)c2.custom[ci].children=[];

            const ch=c2.custom[ci].children[li];

            if(typeof ch==='string') c2.custom[ci].children[li]=nn;

            else ch.l2={zh:nn,en:nn,th:nn,ja:nn,ko:nn};

            saveTagConfig(c2);_render();

          },

          (li)=>{

            const c2=loadTagConfig();

            c2.custom[ci].children.splice(li,1);

            saveTagConfig(c2);_render();

          },

          (nn)=>{

            const c2=loadTagConfig();

            if(!c2.custom[ci].children)c2.custom[ci].children=[];

            c2.custom[ci].children.push({l2:{zh:nn,en:nn,th:nn,ja:nn,ko:nn},kw:[]});

            saveTagConfig(c2);_render();

          }

        );

        rowWrap.appendChild(l2Sec);

      }

      body.appendChild(rowWrap);

    });



    // ── Footer：新增自定義分類 ──────────────────────────────

    foot.appendChild(_mk('div','tmSecHdr','新增自定義分類'));

    const addRow=_mk('div','tmAddRow');

    const nDiv=_mk('div');

    nDiv.appendChild(_mk('div','tmInpLabel','名稱（含 emoji）'));

    const nInp=_mk('input','tmInp');nInp.placeholder='如 🎸 音樂';

    nDiv.appendChild(nInp);

    const kDiv=_mk('div');

    kDiv.appendChild(_mk('div','tmInpLabel','偵測關鍵字（逗號分隔，可選）'));

    const kInp=_mk('input','tmInp');kInp.placeholder='如 music, concert';

    kDiv.appendChild(kInp);

    const l2InitDiv=_mk('div');

    l2InitDiv.appendChild(_mk('div','tmInpLabel','初始 L2（逗號分隔，可選）'));

    const l2InitInp=_mk('input','tmInp');l2InitInp.placeholder='如 早餐, 午餐, 晚餐';

    l2InitDiv.appendChild(l2InitInp);

    addRow.append(nDiv,kDiv,l2InitDiv);

    foot.appendChild(addRow);

    const addBtns=_mk('div','tmEditBtns');

    addBtns.style.marginTop='8px';

    const addBtn=_mk('button','tmSaveBtn','＋ 新增');

    addBtn.addEventListener('click',()=>{

      const n=nInp.value.trim();if(!n){nInp.focus();return;}

      // 檢查是否與預設 L1 重名

      const allDefault=TAG_HIERARCHY.map(g=>tagName(g.l1));

      if(allDefault.some(name=>name===n)){

        toast('⚠️ 此名稱已存在於預設分類中',2500);return;

      }

      const kws=kInp.value.split(',').map(k=>k.trim()).filter(Boolean);

      const initL2s=l2InitInp.value.split(',').map(s=>s.trim()).filter(Boolean);

      const c2=loadTagConfig();

      c2.custom=[...(c2.custom||[]),{

        name:n,kw:kws,

        children:initL2s.map(name=>({l2:{zh:name,en:name,th:name,ja:name,ko:name},kw:[]}))

      }];

      saveTagConfig(c2);nInp.value='';kInp.value='';l2InitInp.value='';

      refreshHomeFilter();_render();

    });

    [nInp,kInp,l2InitInp].forEach(inp=>inp.addEventListener('keydown',e=>{

      if(e.key==='Enter'){e.preventDefault();addBtn.click();}

    }));

    addBtns.appendChild(addBtn);

    foot.appendChild(addBtns);

  }



  return{open,close};

})();



// 根据相册内容返回正确的媒体数量文字

function mediaLabel(photos, postMeta){

  const n  = photos.length;

  const vc = photos.filter(p => p.isVideo).length;

  // 全部是视频文件，或 IG 标注 is_video 且只有封面图（mp4未下载）

  if(vc === n || (postMeta?.is_video && vc === 0 && n === 1)){

    return n === 1 ? t('videoTag') : `${n} ${t('videoTag')}`;

  }

  return t('photoCount')(n);

}



function buildCard(alb,idx,total){

  const card=document.createElement('div');card.className='albumCard';

  if(alb.coverUrl){

    const coverSrc=alb.firstImage||(alb.photos.find(p=>!p.isVideo))||alb.photos[0];

    if(coverSrc?.isVideo){

      if(coverSrc.poster?.file){

        if(!coverSrc.poster.url) coverSrc.poster.url=safeCreateObjectURL(coverSrc.poster.file);

        const img=document.createElement('img');img.src=coverSrc.poster.url;img.loading='lazy';

        card.appendChild(img);

      }else{

        const vid=document.createElement('video');

        vid.src=alb.coverUrl;vid.preload='metadata';vid.muted=true;vid.playsInline=true;vid.autoplay=true;vid.loop=true;

        vid.addEventListener('loadedmetadata',()=>{ try{vid.currentTime=0.01;}catch{} });

        card.appendChild(vid);

      }

    } else {

      const img=document.createElement('img');img.src=alb.coverUrl;img.loading='lazy';

      card.appendChild(img);

    }

  }

  if(alb.photos.length>1){

    const b=document.createElement('div');b.className='multiIcon';b.textContent='⧉';card.appendChild(b);

  }

  if(alb.fromIG){

    const ig=document.createElement('div');ig.className='igIcon';ig.textContent='IG';card.appendChild(ig);

  } else if(alb.fromXHS){

    const xhs=document.createElement('div');xhs.className='igIcon';xhs.style.background='#ff2442';xhs.textContent='📕';card.appendChild(xhs);

  }

  // 標籤浮層（只顯示 L1）

  if(alb.tags?.length){

    const shownTags=alb.tags.filter(t=>!t.includes('/'));

    if(shownTags.length){

      const tagsEl=document.createElement('div');tagsEl.className='cardTags';

      shownTags.slice(0,3).forEach(tag=>{

        const sp=document.createElement('span');sp.className='cardTag';sp.textContent=tag;

        tagsEl.appendChild(sp);

      });

      card.appendChild(tagsEl);

    }

  }

  // ⚠️ 損壞標記

  if(alb._corruptMeta){

    const wb=document.createElement('div');wb.className='corruptBadge';

    wb.textContent='⚠️';wb.title='meta.json 損壞，帖子資訊可能不完整';

    card.appendChild(wb);

  }

  // 🔁 重複帖子標記

  if(alb._isDuplicate){

    const db=document.createElement('div');db.className='corruptBadge';

    db.style.background='rgba(200,140,0,.85)';

    db.textContent='🔁';db.title='相同 shortcode 在資料夾中出現多次（重複下載）';

    db.style.top='7px';db.style.left=alb._corruptMeta?'38px':'7px';

    card.appendChild(db);

  }

  // ⭐ 收藏按鈕

  const favBtn=document.createElement('button');favBtn.className='favBtn';

  const isFav=store.getFav(alb.name);

  favBtn.textContent=isFav?'★':'☆';

  if(isFav) favBtn.classList.add('active');

  favBtn.title=isFav?'取消收藏':'加入收藏';

  favBtn.addEventListener('click',e=>{

    e.stopPropagation();

    const nowFav=!store.getFav(alb.name);

    store.setFav(alb.name,nowFav);

    favBtn.textContent=nowFav?'★':'☆';

    favBtn.title=nowFav?'取消收藏':'加入收藏';

    favBtn.classList.toggle('active',nowFav);

    // 若在收藏篩選模式，移除收藏時重新過濾

    if(S.showFavOnly&&!nowFav) refreshHomeFilter();

    else{const sr=$('homeStatsRow');if(sr)updateStatsRow(sr); refreshHomeFilter();}

  });

  card.appendChild(favBtn);

  const ov=document.createElement('div');ov.className='overlay';

  // 位置標記 N/M

  if(idx!=null&&total!=null&&total>1){

    const posEl=document.createElement('div');

    posEl.className='cardPos';

    posEl.textContent=`${idx} / ${total}`;

    ov.appendChild(posEl);

  }

  // 日期：优先 meta.json 发布时间，回退到第一张媒体文件的 date

  const _d=alb.postMeta?.date?new Date(alb.postMeta.date):alb.photos[0]?.date;

  if(_d&&!isNaN(+_d)){

    const dateEl=document.createElement('div');dateEl.className='cardDate';

    dateEl.textContent=`${_d.getFullYear()}.${String(_d.getMonth()+1).padStart(2,'0')}.${String(_d.getDate()).padStart(2,'0')}`;

    ov.appendChild(dateEl);

  }

  // 地点：单独一行，比 aMeta 更醒目

  if(alb.location){

    const locEl=document.createElement('div');locEl.className='cardLoc';

    locEl.innerHTML=`<span style="opacity:.7">📍</span><span>${S.searchQuery?hlText(alb.location,S.searchQuery):esc(alb.location)}</span>`;

    ov.appendChild(locEl);

  }

  const meta=[];

  if(alb.likes!=null) meta.push(`♥ ${fmtNum(alb.likes)}`);

  const metaCount=document.createElement('div');metaCount.className='aMeta';

  metaCount.dataset.n=alb.photos.length;

  metaCount.dataset.vc=alb.photos.filter(p=>p.isVideo).length;

  metaCount.dataset.iv=alb.postMeta?.is_video?'1':'';

  metaCount.dataset.extra=meta.join('  ');

  metaCount.textContent=mediaLabel(alb.photos,alb.postMeta)+(meta.length?' · '+meta.join('  '):'');

  const aName=document.createElement('div');aName.className='aName';

  if(S.searchQuery){aName.innerHTML=hlText(alb.title,S.searchQuery);}

  else{aName.textContent=alb.title;}

  ov.appendChild(aName);ov.appendChild(metaCount);

  card.appendChild(ov);

  // 多選用的勾選圓圈

  const selCheck=document.createElement('div');selCheck.className='selCheck';

  card.appendChild(selCheck);

  if(S.batchSelected.has(alb.name)) card.classList.add('selected');



  card.addEventListener('click',e=>{

    if(S.batchMode){

      e.stopPropagation();

      if(S.batchSelected.has(alb.name)) S.batchSelected.delete(alb.name);

      else S.batchSelected.add(alb.name);

      card.classList.toggle('selected',S.batchSelected.has(alb.name));

      updateBatchBar();

      return;

    }

    goAlbum(alb);

  });

  card.addEventListener('contextmenu',e=>{

    e.preventDefault();

    if(!S.batchMode) enterBatchMode();

    S.batchSelected.add(alb.name);

    card.classList.add('selected');

    updateBatchBar();

  });

  return card;

}



function renderHomeGrid(container){

  container.innerHTML='';

  const filtered=getFilteredAlbums();

  if(!filtered.length){

    container.innerHTML=`<div class="empty">${t('noTagResult')}</div>`;return;

  }

  const grid=document.createElement('div');grid.className='homeGrid';

  const total=filtered.length;

  filtered.forEach((alb,i)=>grid.appendChild(buildCard(alb,i+1,total)));

  container.appendChild(grid);

}



function renderHomePhotoGrid(container){

  container.innerHTML='';

  const filtered=getFilteredAlbums();

  const itemsByAlbum=new Map();

  filtered.forEach(alb=>{

    itemsByAlbum.set(alb.name, alb.photos.filter(photo=>S.showVideoCoverPhotos||!photo._isVideoCover).filter(photo => {

      if (S.mediaFilter === 'video' && !photo.isVideo) return false;

      if (S.mediaFilter === 'photo' && photo.isVideo) return false;

      return true;

    }).map((photo,photoIdx,arr)=>({alb,photo,photoIdx,totalVisible:arr.length})));

    if(!itemsByAlbum.get(alb.name).length) itemsByAlbum.delete(alb.name);

  });

  if(!itemsByAlbum.size){

    container.innerHTML=`<div class="empty">${t('noTagResult')}</div>`;return;

  }

  itemsByAlbum.forEach((items, albName)=>{

    const group=document.createElement('div');group.className='homePhotoGroup';

    const groupTitle=document.createElement('div');groupTitle.className='homePhotoGroupTitle';

    const alb=items[0].alb;

    const totalVisible = items[0].totalVisible;

    const visiblePhotos=alb.photos.filter(photo=>S.showVideoCoverPhotos||!photo._isVideoCover);

    groupTitle.textContent=`${alb.title||albName} · ${items.length} ${t('previewPhotos')}`;

    if(alb.tags?.length){

      const shownTags=alb.tags.filter(t=>!t.includes('/'));

      if(shownTags.length){

        const tagsContainer=document.createElement('span');

        tagsContainer.style.cssText='margin-left:12px;display:inline-flex;gap:6px;vertical-align:middle;';

        shownTags.forEach(tag=>{

          const sp=document.createElement('span');

          sp.style.cssText='font-size:10px;font-weight:normal;padding:1px 6px;border-radius:4px;background:var(--s2);border:1px solid var(--border);color:var(--muted);';

          sp.textContent=tag;

          tagsContainer.appendChild(sp);

        });

        groupTitle.appendChild(tagsContainer);

      }

    }

    group.appendChild(groupTitle);

    const grid=document.createElement('div');grid.className='homeGrid';

    items.forEach(({alb,photo,photoIdx})=>{

      const card=document.createElement('div');card.className='albumCard';



      if(photo.isVideo){

        if(photo.poster?.file){

          const img=document.createElement('img');

          const obs=new IntersectionObserver(e=>{

            if(e[0].isIntersecting){

              if(!photo.poster.url) photo.poster.url=safeCreateObjectURL(photo.poster.file);

              img.src=photo.poster.url;obs.disconnect();

            }

          },{rootMargin:'200px'});

          obs.observe(img);

          card.appendChild(img);

        } else {

          const vid=document.createElement('video');

          vid.preload='metadata';vid.muted=true;vid.playsInline=true;vid.disablePictureInPicture=true;vid.autoplay=true;vid.loop=true;

          const obs=new IntersectionObserver(e=>{

            if(e[0].isIntersecting){

              if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

              vid.src=photo.url;

              vid.addEventListener('loadeddata',()=>{

                try{vid.currentTime=0.01;}catch{}

              },{once:true});

              obs.disconnect();

            }

          },{rootMargin:'200px'});

          obs.observe(vid);

          card.appendChild(vid);

        }

        const b=document.createElement('div');b.className='multiIcon';b.textContent='▶';card.appendChild(b);

      } else {

        const img=document.createElement('img');

        const obs=new IntersectionObserver(e=>{

          if(e[0].isIntersecting){

            if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

            img.src=photo.url;obs.disconnect();

          }

        },{rootMargin:'200px'});

        obs.observe(img);

        card.appendChild(img);

      }



      // 標籤浮層（只顯示 L1）

      if(alb.tags?.length){

        const shownTags=alb.tags.filter(t=>!t.includes('/'));

        if(shownTags.length){

          const tagsEl=document.createElement('div');tagsEl.className='cardTags';

          shownTags.slice(0,3).forEach(tag=>{

            const sp=document.createElement('span');sp.className='cardTag';sp.textContent=tag;

            tagsEl.appendChild(sp);

          });

          card.appendChild(tagsEl);

        }

      }



      const ov=document.createElement('div');ov.className='overlay';

      const posEl=document.createElement('div');posEl.className='cardPos';

      posEl.textContent=`${photoIdx+1} / ${totalVisible}`;

      ov.appendChild(posEl);

      const aName=document.createElement('div');aName.className='aName';

      if(S.searchQuery){aName.innerHTML=hlText(alb.title,S.searchQuery);} else {aName.textContent=alb.title;}

      ov.appendChild(aName);

      const metaEl=document.createElement('div');metaEl.className='homePhotoMeta';

      metaEl.textContent=t('previewPhotoIndex')(photoIdx+1,totalVisible);

      ov.appendChild(metaEl);

      card.appendChild(ov);

      card.addEventListener('click',e=>{

        if(S.batchMode){

          e.stopPropagation();

          if(S.batchSelected.has(alb.name)) S.batchSelected.delete(alb.name);

          else S.batchSelected.add(alb.name);

          card.classList.toggle('selected',S.batchSelected.has(alb.name));

          updateBatchBar();

          return;

        }

        openLB(alb,alb.photos.indexOf(photo));

      });

      card.addEventListener('contextmenu',e=>{

        e.preventDefault();

        if(!S.batchMode) enterBatchMode();

        S.batchSelected.add(alb.name);

        card.classList.add('selected');

        updateBatchBar();

      });

      if(S.batchSelected.has(alb.name)) card.classList.add('selected');

      const selCheck=document.createElement('div');selCheck.className='selCheck';

      card.appendChild(selCheck);

      grid.appendChild(card);

    });

    group.appendChild(grid);

    container.appendChild(group);

  });

}



function buildFilterSection(){

  const section=document.createElement('div');

  section.className='filterSection'+(S.filterCollapsed?' collapsed':'');

  section.id='filterSection';

  section.appendChild(buildFilterBar());

  return section;

}

function clearFolderCategoryActiveTags(){

  const {parentTags, childTags}=getFolderCategoryTagSets();

  [...S.activeTags].forEach(tag=>{

    if(parentTags.has(tag)||childTags.has(tag)) S.activeTags.delete(tag);

  });

}

function normalizeActiveFolderCategoryParent(){

  if(!S.activeFolderCategoryParent) return;

  const parent=S.activeFolderCategoryParent;

  const stillActive=[...S.activeTags].some(tag=>tag===parent||tag.startsWith(parent+'/'));

  if(!stillActive) S.activeFolderCategoryParent=null;

}

function buildFolderCategoryToggleBar(){

  const groups=getFolderCategoryGroupsForToggle();

  if(!groups.length) return null;

  normalizeActiveFolderCategoryParent();

  const bar=document.createElement('div');bar.className='homePreviewBar folderCategoryToggleBar';bar.id='folderCategoryToggleBar';

  groups.forEach(group=>{

    const parent=tagName(group.l1);

    const childItems=(group.children||[]).map(child=>({label:tagName(child.l2), tag:`${parent}/${tagName(child.l2)}`}));

    const childActiveTag=childItems.find(item=>S.activeTags.has(item.tag));

    const isParentFilterActive=S.activeTags.has(parent)&&!childActiveTag;

    const isActive=(S.activeFolderCategoryParent===parent)||isParentFilterActive||!!childActiveTag;

    const btn=document.createElement('button');

    btn.type='button';

    btn.className='homePreviewBtn folderCategoryParentBtn'+(isActive?' active':'');

    btn.textContent=parent;

    btn.addEventListener('click',()=>{

      if(isParentFilterActive){

        clearFolderCategoryActiveTags();

        S.activeFolderCategoryParent=null;

      } else {

        clearFolderCategoryActiveTags();

        S.activeFolderCategoryParent=parent;

        S.activeTags.add(parent);

      }

      refreshHomeFilter();

    });

    bar.appendChild(btn);

    if(isActive&&group.children.length){

      childItems.forEach(item=>{

        const childActive=S.activeTags.has(item.tag);

        const childBtn=document.createElement('button');

        childBtn.type='button';

        childBtn.className='homePreviewExtraBtn folderCategoryChildBtn'+(childActive?' active':'');

        childBtn.textContent=item.label;

        childBtn.addEventListener('click',()=>{

          clearFolderCategoryActiveTags();

          S.activeFolderCategoryParent=parent;

          S.activeTags.add(item.tag);

          refreshHomeFilter();

        });

        bar.appendChild(childBtn);

      });

    }

  });

  return bar;

}

function syncFilterCollapseBtn(){

  const btn=$('filterCollapseBtn');

  if(!btn) return;

  btn.title=S.filterCollapsed?'展開標籤欄':'收起標籤欄';

  btn.textContent=S.filterCollapsed?'▾':'▴';

  btn.classList.toggle('autoHint', S.filterAutoCollapsedHint);

}

function syncFilterLockBtn(){

  const btn=$('filterLockBtn');

  if(!btn) return;

  btn.title=S.filterAutoCollapseLocked?'自動收起已鎖定':'自動收起已關閉';

  btn.textContent=S.filterAutoCollapseLocked?'🔒':'🔓';

  btn.classList.toggle('active', S.filterAutoCollapseLocked);

}

function refreshHomeFilter(){

  const el=$('vHome');

  const oldBar=$('folderCategoryToggleBar');

  if(oldBar) oldBar.replaceWith(buildFolderCategoryToggleBar());

  const section=$('filterSection');

  const newSection=buildFilterSection();

  if(section) section.replaceWith(newSection);

  else{const st=$('stickyTop');if(st) st.appendChild(newSection); else el.insertBefore(newSection,el.firstChild);}

  const gc=$('homeGridWrap');if(gc){

    if(S.timelineMode) renderTimeline(gc);

    else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

    else renderHomeGrid(gc);

  }

  const sr=$('homeStatsRow');if(sr) updateStatsRow(sr);

  syncFilterCollapseBtn();

}

function handleHomeScroll(){

  if(S.view!=='home') return;

  const home=$('vHome');

  if(!home) return;

  const scrollTop=home.scrollTop||0;

  if(!S.filterAutoCollapseLocked){

    S.lastHomeScrollTop=scrollTop;

    return;

  }

  if(S.filterManualExpandLock){

    if(scrollTop < S.lastHomeScrollTop) S.filterManualExpandLock=false;

    else { S.lastHomeScrollTop=scrollTop; return; }

  }

  if(Date.now() < S.filterToggleCooldownUntil){

    S.lastHomeScrollTop=scrollTop;

    return;

  }

  if(scrollTop>120 && scrollTop>S.lastHomeScrollTop && !S.filterCollapsed){

    S.filterCollapsed=true;

    S.filterAutoCollapsedHint=true;

    const section=$('filterSection');

    if(section) section.replaceWith(buildFilterSection());

    syncFilterCollapseBtn();

  }

  S.lastHomeScrollTop=scrollTop;

}



function buildHomePreviewBar(){

  const bar=document.createElement('div');bar.className='homePreviewBar';bar.id='homePreviewBar';

  const modes=[

    {key:'albums',label:t('previewAlbums')},

    {key:'photos',label:t('previewPhotos')},

  ];

  modes.forEach(({key,label})=>{

    const btn=document.createElement('button');

    btn.type='button';btn.className='homePreviewBtn'+(S.homePreviewMode===key?' active':'');

    btn.textContent=label;

    btn.addEventListener('click',()=>{

      S.homePreviewMode=key;

      try{localStorage.setItem('home-preview-mode',S.homePreviewMode);}catch{}

      const gc=$('homeGridWrap');if(gc){

        if(S.timelineMode) renderTimeline(gc);

        else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

        else renderHomeGrid(gc);

      }

      const cur=$('homePreviewBar');

      if(cur) cur.replaceWith(buildHomePreviewBar());

    });

    bar.appendChild(btn);

  });

  const extraBtn=document.createElement('button');

  extraBtn.type='button';

  extraBtn.className='homePreviewExtraBtn'+(S.showVideoCoverPhotos?' active':'');

  extraBtn.textContent=t('previewShowVideoCovers');

  extraBtn.style.display=S.homePreviewMode==='photos'?'':'none';

  extraBtn.addEventListener('click',()=>{

    S.showVideoCoverPhotos=!S.showVideoCoverPhotos;

    try{localStorage.setItem('show-video-cover-photos',S.showVideoCoverPhotos?'1':'0');}catch{}

    const gc=$('homeGridWrap');if(gc){

      if(S.timelineMode) renderTimeline(gc);

      else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

      else renderHomeGrid(gc);

    }

    const sr=$('homeStatsRow');if(sr) updateStatsRow(sr);

    const cur=$('homePreviewBar');

    if(cur) cur.replaceWith(buildHomePreviewBar());

  });

  bar.appendChild(extraBtn);

  return bar;

}

function syncHomeHeaderModes(){

  const hdr=$('hdr'), row=$('hdrHomeModes'), home=$('vHome');

  if(!hdr||!row||!home) return;

  const enabled=S.view==='home' && !!S.albums.length;

  hdr.classList.toggle('homeModesOn', enabled);

  home.classList.toggle('homeModesOn', enabled);

  row.innerHTML='';

  if(!enabled) return;

  const modes=[

    {key:'albums',label:t('previewAlbums')},

    {key:'photos',label:t('previewPhotos')},

  ];

  modes.forEach(({key,label})=>{

    const btn=document.createElement('button');

    btn.type='button';

    btn.className='hdrHomeModeBtn'+(S.homePreviewMode===key?' active':'');

    btn.textContent=label;

    btn.addEventListener('click',()=>{

      S.homePreviewMode=key;

      try{localStorage.setItem('home-preview-mode',S.homePreviewMode);}catch{}

      const gc=$('homeGridWrap');if(gc){

        if(S.timelineMode) renderTimeline(gc);

        else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

        else renderHomeGrid(gc);

      }

      syncHomeHeaderModes();

    });

    row.appendChild(btn);

  });

  const extraBtn=document.createElement('button');

  extraBtn.type='button';

  extraBtn.className='hdrHomeModeExtraBtn'+(S.showVideoCoverPhotos?' active':'');

  extraBtn.textContent=t('previewShowVideoCovers');

  extraBtn.hidden=S.homePreviewMode!=='photos';

  extraBtn.addEventListener('click',()=>{

    S.showVideoCoverPhotos=!S.showVideoCoverPhotos;

    try{localStorage.setItem('show-video-cover-photos',S.showVideoCoverPhotos?'1':'0');}catch{}

    const gc=$('homeGridWrap');if(gc){

      if(S.timelineMode) renderTimeline(gc);

      else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

      else renderHomeGrid(gc);

    }

    const sr=$('homeStatsRow');if(sr) updateStatsRow(sr);

    syncHomeHeaderModes();

  });

  row.appendChild(extraBtn);

}



function buildSearchBar(){

  const wrap=document.createElement('div');wrap.className='homeSearch';

  const inp=document.createElement('input');

  inp.id='homeSearchInp';inp.type='text';inp.placeholder='搜尋相冊名稱、文案、地點…';

  inp.value=S.searchQuery;

  const clr=document.createElement('button');clr.id='homeSearchClear';clr.textContent='×';clr.title='清除搜尋';

  clr.style.display=S.searchQuery?'':'none';

  const btn=document.createElement('button');

  btn.type='button';btn.id='filterCollapseBtn';

  btn.addEventListener('click',()=>{

    S.filterCollapsed=!S.filterCollapsed;

    S.filterAutoCollapsedHint=false;

    S.filterManualExpandLock=!S.filterCollapsed;

    S.lastHomeScrollTop=$('vHome')?.scrollTop ?? S.lastHomeScrollTop;

    S.filterToggleCooldownUntil=Date.now() + 600;

    const cur=$('filterSection');

    if(cur) cur.replaceWith(buildFilterSection());

    syncFilterCollapseBtn();

  });

  syncFilterCollapseBtn();

  const lockBtn=document.createElement('button');

  lockBtn.type='button';lockBtn.id='filterLockBtn';

  lockBtn.addEventListener('click',()=>{

    S.filterAutoCollapseLocked=!S.filterAutoCollapseLocked;

    try{localStorage.setItem('filter-auto-collapse-locked',S.filterAutoCollapseLocked?'1':'0');}catch{}

    if(!S.filterAutoCollapseLocked){

      S.filterAutoCollapsedHint=false;

      S.filterManualExpandLock=false;

    }

    syncFilterLockBtn();

    syncFilterCollapseBtn();

  });

  syncFilterLockBtn();

  inp.addEventListener('input',()=>{

    S.searchQuery=inp.value;

    clr.style.display=inp.value?'':'none';

    const gc=$('homeGridWrap');if(gc){

      if(S.timelineMode) renderTimeline(gc);

      else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

      else renderHomeGrid(gc);

    }

    const sr=$('homeStatsRow');if(sr) updateStatsRow(sr);

  });

  clr.addEventListener('click',()=>{

    S.searchQuery='';inp.value='';clr.style.display='none';

    const gc=$('homeGridWrap');if(gc){

      if(S.timelineMode) renderTimeline(gc);

      else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

      else renderHomeGrid(gc);

    }

    const sr=$('homeStatsRow');if(sr) updateStatsRow(sr);

    inp.focus();

  });

  wrap.appendChild(inp);wrap.appendChild(clr);wrap.appendChild(btn);wrap.appendChild(lockBtn);

  return wrap;

}

function updateStatsRow(el){

  const filtered=getFilteredAlbums();

  const total=filtered.length;

  const photos=filtered.reduce((s,a)=>s+a.photos.filter(p=>!p.isVideo).length,0);

  const videos=filtered.reduce((s,a)=>s+a.photos.filter(p=>p.isVideo).length,0);

  const corrupt=filtered.filter(a=>a._corruptMeta).length;

  const dupes=filtered.filter(a=>a._isDuplicate).length;

  let txt=`${total} 個相冊`;

  if(photos) txt+=` · ${photos} 張圖`;

  if(videos) txt+=` · ${videos} 支影片`;

  if(corrupt) txt+=` · ⚠️ ${corrupt} 個損壞`;

  if(dupes) txt+=` · 🔁 ${dupes} 個重複`;

  el.textContent=txt;

}

function renderHome(){

  const el=$('vHome');el.innerHTML='';

  if(!S.albums.length){el.innerHTML=`<div class="empty">${t('noPhotos')}</div>`;syncHomeHeaderModes();return;}

  S.lastHomeScrollTop=0;

  const stickyTop=document.createElement('div');

  stickyTop.id='stickyTop';

  stickyTop.appendChild(buildSearchBar());

  const folderToggleBar=buildFolderCategoryToggleBar();

  if(folderToggleBar) stickyTop.appendChild(folderToggleBar);

  stickyTop.appendChild(buildFilterSection());

  el.appendChild(stickyTop);

  const statsRow=document.createElement('div');statsRow.className='statsRow';statsRow.id='homeStatsRow';

  updateStatsRow(statsRow);

  el.appendChild(statsRow);

  const gc=document.createElement('div');gc.id='homeGridWrap';

  el.appendChild(gc);

  if(S.timelineMode) renderTimeline(gc);

  else if(S.homePreviewMode==='photos') renderHomePhotoGrid(gc);

  else renderHomeGrid(gc);

  syncHomeHeaderModes();

}



function renderTimeline(container){

  container.innerHTML='';

  const filtered=getFilteredAlbums();

  if(!filtered.length){

    container.innerHTML=`<div class="empty">${t('noTagResult')}</div>`;return;

  }

  // Group by YYYY.MM

  const groups=new Map();

  filtered.forEach(alb=>{

    const d=alb.postMeta?.date?new Date(alb.postMeta.date):alb.photos[0]?.date;

    const key=(d&&!isNaN(+d))?`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`:'未知日期';

    if(!groups.has(key)) groups.set(key,[]);

    groups.get(key).push(alb);

  });

  // Sort groups: known dates descending, unknown last

  const sortedKeys=[...groups.keys()].sort((a,b)=>{

    if(a==='未知日期') return 1;

    if(b==='未知日期') return -1;

    return S.sortMode==='date-asc' ? a.localeCompare(b) : b.localeCompare(a);

  });

  const total=filtered.length;

  let globalIdx=0;

  sortedKeys.forEach(key=>{

    const group=document.createElement('div');group.className='timelineGroup';

    const hdr=document.createElement('div');hdr.className='timelineMonthHdr';

    hdr.innerHTML=`<span>${key}（${groups.get(key).length} 個）</span>`;

    group.appendChild(hdr);

    const grid=document.createElement('div');grid.className='homeGrid';

    groups.get(key).forEach(alb=>grid.appendChild(buildCard(alb,++globalIdx,total)));

    group.appendChild(grid);

    container.appendChild(group);

  });

}



// ── Render: Tag editor ────────────────────────────────────────────────────

function renderTagEditor(alb, container){

  const area=document.createElement('div');area.className='tagEditor';

  const sugRow=document.createElement('div');sugRow.className='suggestRow';

  const sugLbl=document.createElement('span');

  sugLbl.className='sugLabel';sugLbl.textContent=t('tagSuggest')+'：';

  sugRow.appendChild(sugLbl);



  function refreshSug(){

    while(sugRow.children.length>1) sugRow.removeChild(sugRow.lastChild);

    

    // 收集當前相冊擁有的所有 L1 大類的核心名稱

    const hasL1 = (l1Name) => {

      const normL1 = normalizeTagCore(l1Name);

      return (alb.tags || []).some(t => {

        const p = t.split('/');

        return normalizeTagCore(p[0]) === normL1;

      });

    };



    const hobbyL2 = [];

    const targetCores = new Set(['愛好', '爱好', 'Hobby', '角度', 'Angle']);

    

    RECOMMENDED_CUSTOM_TAGS.forEach(g => {

      const core = normalizeTagCore(tagName(g.l1));

      if (targetCores.has(core)) {

        const l1Name = tagName(g.l1);

        

        // 💡 角度/Angle 不受 hasL1 關聯限制（所有相冊隨時可以標記拍攝角度）；愛好/Hobby 則保留 hasL1 關聯限制（有該大類才推薦熱門 L2）

        const isHobby = core === '愛好' || core === '爱好' || core === 'Hobby';

        if (isHobby && !hasL1(l1Name)) return; 

        

        if (!g._dynamicL2) {

          // 📸 角度：靜態 L2 子標籤（自拍、第一視角、擺拍、Vlog）

          (g.children || []).forEach(child => {

            const l2Name = tagName(child.l2);

            hobbyL2.push(`${l1Name}/${l2Name}`);

          });

        } else {

          // 😍 愛好：統計所有相冊中最常使用的該大類子標籤（前 4 名）

          const l2Counter = {};

          (S.albums || []).forEach(a => {

            // 💡 角色隔離過濾：只統計與當前相冊相同角色的相冊標籤

            const aRole = parseFolderRelPath(a._folderRelPath || a.name).role;

            if (aRole !== curRole) return;



            (a.tags || []).forEach(tag => {

              if (tag.startsWith(l1Name + '/')) {

                const sub = tag.slice(l1Name.length + 1).split('/')[0];

                if (sub) {

                  l2Counter[sub] = (l2Counter[sub] || 0) + 1;

                }

              }

            });

          });

          Object.entries(l2Counter)

            .sort((a, b) => b[1] - a[1])

            .slice(0, 4)

            .forEach(([sub]) => {

              hobbyL2.push(`${l1Name}/${sub}`);

            });

        }

      }

    });



    // 💡 建議欄只保留「角度」和「愛好」的常用二級標籤推薦，去除無關大類和關鍵字識別干擾

    const remaining = [...hobbyL2]

      .filter((s,i,a)=>a.indexOf(s)===i)

      .filter(s=>!(alb.tags||[]).some(t=>t===s||t.startsWith(s+'/')||s.startsWith(t+'/')));

    remaining.forEach(tag=>{

      const c=document.createElement('span');c.className='sugChip';

      c.textContent='+ '+tag;

      c.addEventListener('click',async()=>{

        if(isStandardSecondLevelFolderTag(tag)){

          if(await setPrimaryFolderCategoryTag(alb,tag)){rebuildArea();refreshSug();refreshCurrentAlbumView(alb);}

        }else if(addTag(alb,tag)){

          rebuildArea();refreshSug();

        }

      });

      sugRow.appendChild(c);

    });

    sugRow.style.display=remaining.length?'':'none';

  }



  function rebuildArea(){

    area.innerHTML='';

    (alb.tags||[]).forEach(tag=>{

      const chip=document.createElement('span');

      chip.className='tagChip'+(isStandardSecondLevelFolderTag(tag) ? ' folderTagChip' : ' normalTagChip');

      const x=document.createElement('button');x.className='tagX';x.textContent='×';

      x.addEventListener('click',()=>{

        if(tag.includes('/')){

          removeTag(alb,tag);

        } else {

          alb.tags=(alb.tags||[]).filter(t=>t!==tag&&!t.startsWith(tag+'/'));

          store.setAlbum(alb.name,{tags:alb.tags});

          scheduleWrite(alb);

        }

        rebuildArea();refreshSug();

      });

      const parts=tag.split('/');

      if(parts.length===2){

        const pre=document.createElement('span');

        pre.style.cssText='opacity:.4;font-size:10px;margin-right:2px';

        pre.textContent=parts[0]+' ›';

        chip.append(pre,document.createTextNode(parts[1]),x);

      } else {

        chip.append(document.createTextNode(tag),x);

      }

      area.appendChild(chip);

    });

  }



  const addRow=document.createElement('div');addRow.className='tagAddRowSplit';

  const leftPane=document.createElement('div');leftPane.className='tagAddPane';

  const rightPane=document.createElement('div');rightPane.className='tagAddPane';

  const leftHead=document.createElement('span');leftHead.className='tagAddPaneHead';leftHead.textContent='文件夹标签';

  const rightHead=document.createElement('span');rightHead.className='tagAddPaneHead';rightHead.textContent='添加其他';



  const dlFolder=document.createElement('datalist');dlFolder.id='_tfolderdl';

  const dl1=document.createElement('datalist');dl1.id='_tl1dl';

  const dl2=document.createElement('datalist');dl2.id='_tl2dl';



  const folderInp=document.createElement('input');

  folderInp.className='tagFolderInput';folderInp.placeholder='如：住-旅店';

  folderInp.setAttribute('list','_tfolderdl');

  const addFolderBtn=document.createElement('button');addFolderBtn.className='tagAddBtn';

  addFolderBtn.textContent='+';addFolderBtn.type='button';



  const l1Inp=document.createElement('input');

  l1Inp.className='tagL1Input';l1Inp.placeholder='L1 分類…';

  l1Inp.setAttribute('list','_tl1dl');



  const l2Inp=document.createElement('input');

  l2Inp.className='tagL2Input';l2Inp.placeholder='L2 子項（可選）';

  l2Inp.setAttribute('list','_tl2dl');

  l2Inp.disabled=true;



  const sep=document.createElement('span');sep.className='tagAddSep';sep.textContent='/';

  const addBtn=document.createElement('button');addBtn.className='tagAddBtn';

  addBtn.textContent='+';addBtn.type='button';



  const fillFolder=()=>{

    dlFolder.innerHTML='';

    const set=new Set();

    getEffectiveHierarchy().forEach(g=>{

      (g.children||[]).forEach(c=>{

        const t2=tagName(c.l2);

        if(isStandardSecondLevelFolderTag(t2)){

          set.add(t2);

        } else {

          const tag=`${tagName(g.l1)}-${t2}`;

          if(isStandardSecondLevelFolderTag(tag)) set.add(tag);

        }

      });

    });

    S.albums.forEach(a=>(a.tags||[]).forEach(tag=>{ if(isStandardSecondLevelFolderTag(tag)) set.add(tag); }));

    [...set].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(v=>{

      const o=document.createElement('option');o.value=v;dlFolder.appendChild(o);

    });

  };



  const fillL1=()=>{

    l1Inp.placeholder='L1分类_V2.2…';

    dl1.innerHTML='';

    const l1s=new Set();

    

    // 1) 收集自定義推薦標籤與物理大類

    RECOMMENDED_CUSTOM_TAGS.forEach(g=>{

      const n=tagName(g.l1);

      if(!isBlockedOtherL1Option(n)){

        l1s.add(n);

      }

    });

    getEffectiveHierarchy().forEach(g=>{

      const n=tagName(g.l1);

      if(!isBlockedOtherL1Option(n)){

        l1s.add(n);

      }

    });



        // 2) 收集同一個角色相冊中已用標籤的非文件夾分類大類

    const curRole = parseFolderRelPath(alb._folderRelPath || alb.name).role;

    S.albums.forEach(a=>{

      const aRole = parseFolderRelPath(a._folderRelPath || a.name).role;

      if (aRole !== curRole) return; // 💡 角色隔離過濾



      (a.tags||[]).forEach(tag=>{

        const sl=tag.indexOf('/');

        const v=sl===-1?tag:tag.slice(0,sl);

        if(!isBlockedOtherL1Option(v)){

          l1s.add(v);

        }

      });

    });



    [...l1s].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(v=>{

      const o=document.createElement('option');o.value=v;dl1.appendChild(o);

    });

  };



  const fillL2=()=>{

    const l1v=l1Inp.value.trim();

    l2Inp.disabled=!l1v;

    dl2.innerHTML='';

    if(!l1v) return;

    const l2s=new Set();

    

    // 💡 使用 normalizeTagCore 進行模糊文字核心比對，抹平 emoji、空格、繁簡等導致的匹配障礙

    const l1vCore = normalizeTagCore(l1v);

    const grp = RECOMMENDED_CUSTOM_TAGS.find(g => normalizeTagCore(tagName(g.l1)) === l1vCore)

             || getEffectiveHierarchy().find(g => normalizeTagCore(tagName(g.l1)) === l1vCore);

    if(grp?.children) grp.children.forEach(c=>l2s.add(tagName(c.l2)));

    

    S.albums.forEach(a=>{

      const aRole = parseFolderRelPath(a._folderRelPath || a.name).role;

      if (aRole !== curRole) return; // 💡 角色隔離過濾



      (a.tags||[]).forEach(tag=>{

        const slash = tag.indexOf('/');

        if (slash === -1) return;

        const l1part = tag.slice(0, slash);

        // 使用模糊核心比對，確保無 emoji 輸入時也能正確撈到已用標籤的 L2 子項

        if (normalizeTagCore(l1part) !== l1vCore) return;

        

        const l2part = tag.slice(slash + 1);

        const slash2 = l2part.indexOf('/');

        const l2sub = slash2 === -1 ? l2part : l2part.slice(0, slash2);

        if (l2sub) l2s.add(l2sub);

      });

    });

    l2s.forEach(v=>{const o=document.createElement('option');o.value=v;dl2.appendChild(o);});

  };



  l1Inp.addEventListener('input',fillL2);

  l1Inp.addEventListener('change',fillL2);



  const doAddFolder=async()=>{

    const v=folderInp.value.trim();

    if(!v) return;

    if(await setPrimaryFolderCategoryTag(alb,v)){

      folderInp.value='';

      rebuildArea();refreshSug();refreshCurrentAlbumView(alb);

    }

  };



  const doAdd=async()=>{

    const l1v=l1Inp.value.trim();

    if(!l1v) return;

    const l2v=l2Inp.value.trim();

    const folderCandidate = l2v || l1v;

    

    if(isStandardSecondLevelFolderTag(folderCandidate)){

      await setPrimaryFolderCategoryTag(alb, folderCandidate);

      l1Inp.value='';l2Inp.value='';l2Inp.disabled=true;

      rebuildArea();refreshSug();refreshCurrentAlbumView(alb);

      return;

    }

    

    // 如果属于核心文件夹大类，阻断并提示在左侧输入

    if(isBlockedOtherL1Option(l1v) || isFolderCategoryTag(l1v) || (l2v && isFolderCategoryTag(l2v))){

      toast('此处仅添加其他标签；文件夹标签请用左侧输入',2200);

      return;

    }



    let changed=false;

    if(addTag(alb,l1v)) changed=true;

    if(l2v && addTag(alb,`${l1v}/${l2v}`)) changed=true;

    if(changed){

      l1Inp.value='';l2Inp.value='';l2Inp.disabled=true;

      rebuildArea();refreshSug();refreshCurrentAlbumView(alb);

    }

  };



  folderInp.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();void doAddFolder();} });

  addFolderBtn.addEventListener('click',()=>void doAddFolder());

  l1Inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();l2Inp.disabled?void doAdd():l2Inp.focus();} });

  l2Inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();void doAdd();} });

  addBtn.addEventListener('click',()=>void doAdd());



  fillFolder();

  fillL1();

  leftPane.append(leftHead,dlFolder,folderInp,addFolderBtn);

  rightPane.append(rightHead,dl1,dl2,l1Inp,sep,l2Inp,addBtn);

  addRow.append(leftPane,rightPane);



  container.appendChild(area);

  container.appendChild(addRow);

  container.appendChild(sugRow);

  rebuildArea();

  refreshSug();

}

// ── Render: Album feed ────────────────────────────────────────────────────

function renderAlbum(alb){

  const el=$('vAlbum'); el.innerHTML=''; el.scrollTop=0;



  // 相册头部（与 grid 模式共用 buildAlbumHeader）

  el.appendChild(buildAlbumHeader(alb));



  // 標籤編輯器

  renderTagEditor(alb, el);



  // 照片列表

  alb.photos.forEach((photo,idx)=>{

    const post=document.createElement('div');post.className='photoPost';

    const wrap=document.createElement('div');wrap.className='postImgWrap';



    if(photo.isVideo){

      // 视频项：直接渲染 <video> 播放器

      const vid=document.createElement('video');

      vid.controls=true;vid.playsInline=true;

      if(photo.poster){

        if(!photo.poster.url) photo.poster.url=safeCreateObjectURL(photo.poster.file);

        vid.poster=photo.poster.url;

      }

      const obs=new IntersectionObserver(entries=>{

        if(entries[0].isIntersecting){

          if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

          vid.src=photo.url;obs.disconnect();

        }

      },{rootMargin:'300px'});

      obs.observe(vid);

      wrap.appendChild(vid);

    } else {

      const img=document.createElement('img');img.alt=photo.name;

      img.style.cssText='min-height:180px;background:#0a0a0a';

      const obs=new IntersectionObserver(entries=>{

        if(entries[0].isIntersecting){

          if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

          img.src=photo.url;obs.disconnect();

        }

      },{rootMargin:'300px'});

      obs.observe(img);

      wrap.appendChild(img);

      // 视频标记：is_video 为 true 但没有下载 mp4（仅有封面图）

      if(alb.postMeta?.is_video&&!alb.photos.some(p=>p.isVideo)){

        const tag=document.createElement('div');tag.className='postVideoTag';tag.textContent=t('videoTag');

        wrap.appendChild(tag);

      }

    }

    const acts=document.createElement('div');acts.className='postActions';

    const btnV=document.createElement('button');btnV.className='postActBtn';

    btnV.dataset.action='view';btnV.textContent='🔗';btnV.title=t('viewFile');

    btnV.addEventListener('click',e=>{e.stopPropagation();viewPhoto(alb,photo);});

    const btnC=document.createElement('button');btnC.className='postActBtn';

    btnC.dataset.action='copy';btnC.textContent='📋';btnC.title=t('copyPath');

    btnC.addEventListener('click',e=>{e.stopPropagation();copyPhotoPath(alb,photo);});

    const btnF=document.createElement('button');btnF.className='postActBtn';

    btnF.dataset.action='folder';btnF.textContent='📂';btnF.title=t('openDir');

    btnF.addEventListener('click',e=>{e.stopPropagation();openLocalFolder(alb);});

    const btnM=document.createElement('button');btnM.className='postActBtn';

    btnM.dataset.action='move';btnM.textContent='↗';btnM.title=t('movePhoto')||'移动';

    btnM.addEventListener('click',e=>{e.stopPropagation();openMoveModal(alb,photo);});

    acts.append(btnV,btnC,btnF,btnM);wrap.appendChild(acts);

    wrap.addEventListener('click',()=>openLB(alb,idx));



    const info=document.createElement('div');info.className='postInfo';



    // 日期 + 地点行

    const dateRow=document.createElement('div');dateRow.className='postDateRow';

    // 位置標記 N/M

    const nPhotos=alb.photos.length;

    if(nPhotos>1){

      const posEl=document.createElement('span');posEl.className='postDate';

      posEl.style.marginRight='8px';posEl.style.opacity='.45';

      posEl.textContent=`${idx+1} / ${nPhotos}`;

      dateRow.appendChild(posEl);

    }

    const dateEl=document.createElement('span');dateEl.className='postDate';dateEl.textContent=fmtDate(photo.date);

    dateRow.appendChild(dateEl);

    if(alb.location&&idx===0){

      const locEl=document.createElement('span');locEl.className='postLoc';

      locEl.innerHTML=`📍 ${esc(alb.location)}`;dateRow.appendChild(locEl);

    }

    info.appendChild(dateRow);



    // 文案 textarea

    const ta=document.createElement('textarea');

    ta.className='postCaption';ta.placeholder=t('photoCaption');

    ta.rows=1;ta.dataset.idx=idx;

    // 优先 notes.json per-photo，其次 localStorage per-photo

    // 第一张无独立备注时回退到相册整体文案；其余照片留空，不彼此同步

    const ndCap=alb.notesData?.photos?.[photo.name];

    const savedCap=ndCap!==undefined ? ndCap : store.getCaption(alb.name,photo.name);

    if(savedCap!==null){

      ta.value=savedCap;

    } else if(idx===0&&alb.desc){

      ta.value=alb.desc;

    }

    ta.addEventListener('input',()=>{

      ar(ta);store.setCaption(alb.name,photo.name,ta.value);

      if(S.view==='lb'&&S.currentIdx===idx) lbCaption.value=ta.value;

      writePhotoCaptionSidecar(alb, photo, ta.value);

      scheduleWrite(alb);

    });

    setTimeout(()=>ar(ta),0);



    info.appendChild(ta);

    post.append(wrap,info);

    el.appendChild(post);

  });

}



// ── Render: Lightbox ──────────────────────────────────────────────────────

function renderLB(){

  const alb=S.currentAlbum,idx=S.currentIdx,photo=alb.photos[idx];

  if(!photo) return;

  const lbVid=$('lbVideo');

  const shotWrap=$('lbVideoShotWrap');

  const clipWrap=$('lbVideoClipWrap');

  if(photo.isVideo){

    if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

    if(lbVid.src!==photo.url){lbVid.src=photo.url;}

    if(photo.poster){

      if(!photo.poster.url) photo.poster.url=safeCreateObjectURL(photo.poster.file);

      lbVid.poster=photo.poster.url;

    }

    lbImg.style.display='none';lbVid.style.display='';

    if(shotWrap){

      shotWrap.style.display='flex';

      $('lbVideoShotTime').value='00:00:00.000';

      const statusEl=$('lbVideoShotStatus');

      if(statusEl){statusEl.style.display='none';statusEl.className='lbVideoShotStatus';}

    }

    if(clipWrap){

      clipWrap.style.display='flex';

      $('lbVideoClipStart').value='00:00:00.000';

      $('lbVideoClipEnd').value='00:00:00.000';

      $('lbVideoClipDuration').textContent='0.00';

      const clipStatusEl=$('lbVideoClipStatus');

      if(clipStatusEl){clipStatusEl.style.display='none';clipStatusEl.className='lbVideoShotStatus';}

    }

  } else {

    lbVid.pause();lbVid.style.display='none';lbVid.src='';

    if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

    lbImg.src=photo.url;lbImg.style.display='';

    if(shotWrap) shotWrap.style.display='none';

    if(clipWrap) clipWrap.style.display='none';

  }

  lbCounter.textContent=`${idx+1} / ${alb.photos.length}`;

  lbDate.textContent=fmtDate(photo.date);



  // 地点

  const locEl=$('lbLoc'),locTxt=$('lbLocTxt');

  if(alb.location){locEl.style.display='';locTxt.textContent=alb.location;}

  else locEl.style.display='none';



  // IG 链接

  const igA=$('lbIgLink');

  if(alb.igUrl){igA.href=alb.igUrl;igA.textContent=alb.fromXHS?'↗ 小紅書':t('igLinkShort');igA.style.display='';}

  else igA.style.display='none';



  // 文案（與 feed 模式一致：優先 notesData，其次 localStorage，index 0 fallback 相冊文案）

  const ndCap=alb.notesData?.photos?.[photo.name];

  const saved=ndCap!==undefined?ndCap:store.getCaption(alb.name,photo.name);

  lbCaption.value=saved!==null?saved:(idx===0&&alb.desc?alb.desc:'');

  lbCaption.classList.toggle('empty', !lbCaption.value.trim());

  ar(lbCaption);

  setTimeout(()=>ar(lbCaption),0);

  const lbFoot=document.querySelector('.lbFoot');

  const prevActs=lbFoot.querySelector('.lbActions');

  if(prevActs) lbFoot.removeChild(prevActs);

  const lbActs=document.createElement('div');lbActs.className='lbActions';

  const lbBV=document.createElement('button');lbBV.className='lbActBtn';

  lbBV.dataset.action='view';

  lbBV.innerHTML=`🔗 <span class="lbActBtnLabel">${t('viewFile')}</span>`;

  lbBV.addEventListener('click',()=>viewPhoto(alb,photo));

  const lbBC=document.createElement('button');lbBC.className='lbActBtn';

  lbBC.dataset.action='copy';

  lbBC.innerHTML=`📋 <span class="lbActBtnLabel">${t('copyPath')}</span>`;

  lbBC.addEventListener('click',()=>copyPhotoPath(alb,photo));

  const lbBF=document.createElement('button');lbBF.className='lbActBtn';

  lbBF.dataset.action='folder';

  lbBF.innerHTML=`📂 <span class="lbActBtnLabel">${t('openDir')}</span>`;

  lbBF.addEventListener('click',()=>openLocalFolder(alb));

  const lbBM=document.createElement('button');lbBM.className='lbActBtn';

  lbBM.dataset.action='move';

  lbBM.innerHTML=`↗ <span class="lbActBtnLabel">${t('movePhoto')||'移动'}</span>`;

  lbBM.addEventListener('click',()=>openMoveModal(alb,photo));

  lbActs.append(lbBV,lbBC,lbBF,lbBM);lbFoot.insertBefore(lbActs,lbFoot.querySelector('.lbCaptionWrap'));

  lbPrev.disabled=idx===0;lbNext.disabled=idx===alb.photos.length-1;

}

function lbMove(dir){

  $('lbVideo').pause();

  const n=S.currentIdx+dir;

  if(n<0||n>=S.currentAlbum.photos.length) return;

  S.currentIdx=n;renderLB();

}



// ── Loose Import Dialog ───────────────────────────────────────────────────

// loosePending: [{dirHandle, dirName, inheritTags, previewUrl, count}]

// Returns Promise<Map<dirName, 'single'|'merged'>> after user confirms; null if cancelled

function showLooseDialog(pending){

  return new Promise(resolve=>{

    const list=$('looseDialogList');

    list.innerHTML='';

    const choices=new Map(); // dirName → 'single'|'merged'



    pending.forEach(({dirName,previewUrl,count,hasPerFileTxt})=>{

      // default: 有同名txt → single, 否则 → merged

      choices.set(dirName, hasPerFileTxt?'single':'merged');



      const item=document.createElement('div');

      item.className='looseItem';



      // thumbnail

      const thumb=document.createElement('div');

      thumb.className='looseItemThumb';

      if(previewUrl){

        const img=document.createElement('img');

        img.src=previewUrl; thumb.appendChild(img);

      } else { thumb.textContent='🖼️'; }



      // info

      const info=document.createElement('div');

      info.className='looseItemInfo';

      const nm=document.createElement('div');

      nm.className='looseItemName';nm.textContent=dirName;

      const ct=document.createElement('div');

      ct.className='looseItemCount';

      ct.textContent=`${count} 张照片`;

      info.append(nm,ct);



      // toggle

      const tog=document.createElement('div');

      tog.className='looseToggle';

      const bM=document.createElement('button');

      bM.textContent='合并';

      const bS=document.createElement('button');

      bS.textContent='每张独立';

      const updateTog=()=>{

        const cur=choices.get(dirName);

        bM.classList.toggle('active', cur==='merged');

        bS.classList.toggle('active', cur==='single');

        ct.textContent=cur==='single'?`${count} 个相册`:`1 个相册（${count} 张）`;

      };

      bM.onclick=()=>{choices.set(dirName,'merged');updateTog();};

      bS.onclick=()=>{choices.set(dirName,'single');updateTog();};

      tog.append(bM,bS);

      updateTog();



      item.append(thumb,info,tog);

      list.appendChild(item);

    });



    $('looseDialog').classList.add('on');



    $('looseConfirmBtn').onclick=()=>{

      $('looseDialog').classList.remove('on');

      resolve(choices);

    };

    $('looseCancelBtn').onclick=()=>{

      $('looseDialog').classList.remove('on');

      resolve(null);

    };

  });

}



async function ensureStandardSecondLevelFolders(root){

  if(!root?.getDirectoryHandle) return;

  for(const name of STANDARD_SECOND_LEVEL_FOLDERS){

    try{ await root.getDirectoryHandle(name,{create:true}); }catch{}

  }

}

function refreshCurrentAlbumView(alb){

  if(S.view==='home') renderHome();

  else if(S.view==='album'&&S.currentAlbum&&S.currentAlbum===alb){

    if(S.albumMode==='grid') renderAlbumGrid(alb);

    else renderAlbum(alb);

  } else if(S.view==='lb'&&S.currentAlbum&&S.currentAlbum===alb){

    renderLB();

  }

}



// ── Load folder (shared by openFolder + restore) ─────────────────────────

async function doLoadFolder(h){

  S.rootDirHandle=h;

  $('vHome').innerHTML=`<div class="loading"><div class="spin"></div><div>${t('loading')}</div></div>`;

  showView('home');hdrTitle.textContent='读取中…';

  btnBack.style.display='none';btnViewToggle.style.display='none';

  btnOpen.style.display='none';$('btnRefresh').style.display='none';$('btnTranslate').style.display='none';$('btnBackup').style.display='none';$('btnAddPosts').style.display='none';$('hdr').style.display='';

  try{

    S.rootName=h.name;

    S.rootIndexSnapshot=await readRootIndexSnapshot(h);

    S.rootIndexSnapshotLoadedAt=Date.now();

    applyRootIndexSnapshotToState(S.rootIndexSnapshot);

    await ensureStandardSecondLevelFolders(h);

    idb.set('lastFolder',h).catch(()=>{});

    S.albums=await readFolder(h);

    recoverNotesFromMemory();

    await autoFixStaleAlbumFolderPaths();

    goHome();

  }catch(e){

    idb.set('lastFolder',null).catch(()=>{});

    showView('welcome');

    btnOpen.style.display='';btnBack.style.display='none';

    const isNotFound=e.message&&(e.message.includes('not be found')||e.message.includes('NotFound'));

    toast(isNotFound?`⚠️ 找不到「${h.name}」，請重新選擇`:t('toastReadFail')+e.message, 4000);

  }

}



// ── Open folder ───────────────────────────────────────────────────────────

function detectFileProtocol(){

  if(location.protocol==='file:') return true;

  // 某些代理/扩展可能导致 src 为空，双重确认

  try{return window.location.href.startsWith('file://');}catch(e){return false;}

}

async function openFolder(){

  // ── file:// 协议检测 ──

  if(detectFileProtocol()){

    toast(`

⚠️ 無法直接選擇文件夾

請用終端執行以下指令啟動本地服務器，然後重開此頁：



  npx serve .

  （或 python3 -m http.server）



原因：Chrome 禁止 file:// 協議調用文件系統選擇器 API。`,8000);

    console.warn('[local-ig] file:// detected — showDirectoryPicker requires a secure context (localhost/HTTPS)');

    return;

  }

  if(!window.showDirectoryPicker){toast(t('toastChrome'));return;}

  let root;

  try{root=await window.showDirectoryPicker({mode:'readwrite'});}

  catch(e){

    if(e.name==='AbortError') return; // 用户取消

    console.error('[local-ig] showDirectoryPicker error:', e.name, e.message);

    if(e.name==='SecurityError'||e.name==='NotAllowedError'||e.name==='NotSupportedError')

      toast('⚠️ 瀏覽器限制了文件夾訪問權限。請用 localhost 服務器打開此頁面。\n\n終端執行：npx serve . 或 python3 -m http.server',8000);

    else

      toast(t('toastNoFolder')+' ('+e.message+')',4000);

    return;

  }

  await doLoadFolder(root);

}



// ── 哼哼猫导入 ────────────────────────────────────────────────────────────

// 解析哼哼猫图片文件名的序号：圖片.jpg→0  圖片(1).jpg→1  圖片(2).jpg→2

function hhImgIndex(name){

  const m=name.match(/^(.+?)(?:\((\d+)\))?(\.[^.]+)$/);

  return m?(m[2]!=null?parseInt(m[2]):0):0;

}

// 是否是哼哼猫风格的图片文件名（含圖片/图片/image 等变体，兼容简繁英）

const HH_IMG=/\.(jpe?g|png|webp|heic|gif)$/i;

const HH_VID=/\.(mp4|mov|avi|mkv|webm)$/i;

// 文件夹名是否符合 {数字}_{文案} 格式

function hhParseFolder(name){

  const m=name.match(/^(\d+)_(.+)$/);

  return m?{num:parseInt(m[1]),caption:m[2].trim()}:null;

}



async function hhcatConvert(){

  if(detectFileProtocol()){

    toast('⚠️ 請用 localhost 服務器打開此頁面後再使用「導入哼哼貓」功能。\n\n終端執行：npx serve . 或 python3 -m http.server',8000);

    return;

  }

  if(!window.showDirectoryPicker){toast(t('toastChrome'));return;}

  let root;

  try{root=await window.showDirectoryPicker({mode:'readwrite'});}

  catch(e){

    if(e.name==='AbortError') return;

    console.error('[local-ig] hhcatConvert showDirectoryPicker error:', e.name, e.message);

    toast('⚠️ 無法選擇文件夾：'+e.message,4000);

    return;

  }



  // 收集用户子文件夹（含 {数字}_ 格式的帖子文件夹的那层）

  const logEl=$('hhOverlayLog');

  const subEl=$('hhOverlaySub');

  logEl.innerHTML='';subEl.textContent='';

  $('hhOverlay').classList.add('on');



  function log(html){

    logEl.insertAdjacentHTML('beforeend',html+'<br>');

    logEl.scrollTop=logEl.scrollHeight;

  }



  // 判断 root 是否直接是用户目录（含帖子子文件夹），还是包含多用户的根目录

  async function isUserDir(dir){

    for await(const [name,h] of dir.entries()){

      if(h.kind==='directory'&&hhParseFolder(name)) return true;

    }

    return false;

  }



  let userDirs=[];

  if(await isUserDir(root)){

    userDirs=[root];

  } else {

    for await(const [name,h] of root.entries()){

      if(h.kind==='directory'&&!name.startsWith('.')&&await isUserDir(h))

        userDirs.push(h);

    }

  }



  if(!userDirs.length){

    log('<span class="dim">⚠️ 未找到哼哼猫格式的文件夹（期望包含 {序号}_{文案} 子文件夹）</span>');

    subEl.textContent='请选择哼哼猫下载的用户目录或根目录';

    return;

  }



  let totalDone=0, totalSkip=0;



  for(const userDir of userDirs){

    // 收集所有帖子文件夹

    const posts=[];

    for await(const [name,h] of userDir.entries()){

      if(h.kind==='directory'){

        const p=hhParseFolder(name);

        if(p) posts.push({...p,handle:h,name});

      }

    }

    posts.sort((a,b)=>a.num-b.num);



    log(`<span style="color:#fff">👤 ${userDir.name}  (${posts.length} 个帖子)</span>`);



    for(const post of posts){

      const dir=post.handle;

      // 检查是否已转换（有 meta.json）

      let alreadyDone=false;

      try{await dir.getFileHandle('meta.json');alreadyDone=true;}catch{}

      if(alreadyDone){

        log(`<span class="dim">  [${post.num}] 已转换，跳过</span>`);

        totalSkip++;continue;

      }



      // 收集文件

      const imgs=[], vids=[];

      for await(const [name,h] of dir.entries()){

        if(h.kind!=='file') continue;

        if(HH_IMG.test(name)) imgs.push({name,h});

        else if(HH_VID.test(name)) vids.push({name,h});

      }

      imgs.sort((a,b)=>hhImgIndex(a.name)-hhImgIndex(b.name));



      const isVideo=vids.length>0;

      let renamedCount=0;



      // 重命名函数：读取原文件 → 写新文件名 → 删除原文件

      async function renameFile(handle, newName){

        if(handle.name===newName) return;

        const file=await handle.getFile();

        const buf=await file.arrayBuffer();

        const newH=await dir.getFileHandle(newName,{create:true});

        const w=await newH.createWritable();

        await w.write(buf); await w.close();

        await dir.removeEntry(handle.name);

        renamedCount++;

      }



      if(isVideo){

        // 视频帖：封面 1.jpg + 1.mp4，多余图片删除

        if(imgs.length) await renameFile(imgs[0].h,'1.jpg');

        for(let i=1;i<imgs.length;i++) await dir.removeEntry(imgs[i].name);

        if(vids.length) await renameFile(vids[0].h,'1.mp4');

      } else {

        // 图片帖：依次编号

        for(let i=0;i<imgs.length;i++){

          const ext=imgs[i].name.replace(/^.+(\.[^.]+)$/,'$1').toLowerCase()

            .replace('.jpeg','.jpg');

          await renameFile(imgs[i].h,`${i+1}${ext}`);

        }

      }



      // 写 meta.json

      const meta={

        caption:post.caption, date:null,

        location:'', location_id:'',

        shortcode:'', ig_url:'',

        is_video:isVideo,

        image_count:isVideo?1:imgs.length,

        downloaded:isVideo?1:imgs.length,

        source:'hhcat',

      };

      const metaH=await dir.getFileHandle('meta.json',{create:true});

      const mw=await metaH.createWritable();

      await mw.write(JSON.stringify(meta,null,2)); await mw.close();



      const tag=isVideo?'📹':`🖼️ ×${imgs.length}`;

      log(`<span class="ok">  ✓ [${post.num}] ${tag} ${post.caption.slice(0,40)}</span>`);

      subEl.textContent=`处理中… ${post.num}/${posts.length}`;

      totalDone++;

    }

  }



  // 不再在瀏覽器端猜測並寫入 _path.txt。

  // File System Access API 無法獲得真實絕對路徑；若寫入 HTML 源碼所在目錄，

  // 會污染資料並導致「打開資料夾」複製出錯誤的源碼路徑。

  // 因此這裡只載入相冊，不持久化猜測路徑；真正的 _path.txt 應由 Python 腳本/修復指令寫入。



  log(`<br><span style="color:#fff">✅ 完成  转换 ${totalDone} 个 | 已有 ${totalSkip} 个</span>`);

  subEl.textContent='';



  // 1.5 秒后关闭进度层，直接加载相册

  setTimeout(async()=>{

    $('hhOverlay').classList.remove('on');

    S.rootDirHandle=root;

    $('vHome').innerHTML=`<div class="loading"><div class="spin"></div><div>${t('loading')}</div></div>`;

    showView('home');hdrTitle.textContent='读取中…';

    btnBack.style.display='none';btnViewToggle.style.display='none';

    btnOpen.style.display='none';$('hdr').style.display='';

    try{

      S.rootName=root.name;

      idb.set('lastFolder',root).catch(()=>{});

      S.albums=await readFolder(root);

      goHome();

    }catch(e){toast(t('toastReadFail')+e.message);showView('welcome');btnOpen.style.display='';btnBack.style.display='none';}

  },1500);

}



$('btnHHCat').addEventListener('click',hhcatConvert);



// ── IG 导入面板 ───────────────────────────────────────────────────────────

$('btnShowIG').addEventListener('click',()=>{

  const panel=$('igPanel');

  panel.classList.toggle('on');

  if(panel.classList.contains('on')) $('igInput').focus();

});

function getIgScriptPath(){

  const dir=getHtmlDir();

  return dir?`${dir}/ig_download.py`:'ig_download.py';

}

function quoteArg(s){

  return `"${String(s).replace(/"/g,'\\"')}"`;

}

function sanitizeSessionId(sid){

  return (sid||'').trim().replace(/^['"]|['"]$/g,'');

}

async function detectScriptExists(path){

  try{

    const res=await fetch(path,{method:'HEAD',cache:'no-store'});

    return !!res.ok;

  }catch(e){

    return false;

  }

}

let __igScriptPathCache=null;

async function resolveIgScriptPath(){

  if(__igScriptPathCache) return __igScriptPathCache;

  const p=getIgScriptPath();

  if(await detectScriptExists(p)){__igScriptPathCache=p;return p;}

  if(p!=='ig_download.py'&&await detectScriptExists('ig_download.py')){

    __igScriptPathCache='ig_download.py';

    return __igScriptPathCache;

  }

  __igScriptPathCache=p;

  return __igScriptPathCache;

}

function buildIgAuthArgs(sidRaw){

  const sid=sanitizeSessionId(sidRaw);

  if(sid) return ` --sessionid ${quoteArg(sid)}`;

  return ' --cookies-from-browser chrome';

}

function guessCountFromUI(){

  const activeChip=document.querySelector('#igCountChips .igRangePreset.active');

  const custom=($('igCountCustom')?.value||'').trim();

  const raw=custom||(activeChip?activeChip.dataset.n:'');

  const n=parseInt(raw,10);

  return Number.isFinite(n)&&n>0?n:0;

}

function validateOutputPathInput(v){

  const s=(v||'').trim();

  if(!s) return {ok:true,value:s};

  // Block common accidental file-path inputs.

  if(/\.(exe|bat|cmd|ps1|lnk)$/i.test(s)) return {ok:false,error:'保存路径必须是文件夹，不能是可执行文件'};

  return {ok:true,value:s.replace(/[/\\]+$/,'')};

}

function looksLikePlaceholderSid(sid){

  const s=sanitizeSessionId(sid).toLowerCase();

  if(!s) return false;

  return s.includes('your') || s.includes('sessionid') || s.includes('这里') || s.includes('你的');

}



// Chip selection

document.querySelectorAll('#igCountChips .igRangePreset').forEach(btn=>{

  btn.addEventListener('click',()=>{

    document.querySelectorAll('#igCountChips .igRangePreset').forEach(b=>b.classList.remove('active'));

    btn.classList.add('active');

    $('igCountCustom').value='';

  });

});

$('igCountCustom').addEventListener('input',()=>{

  document.querySelectorAll('#igCountChips .igRangePreset').forEach(b=>b.classList.remove('active'));

});



$('igFetchBtn').addEventListener('click',async()=>{

  const username=$('igInput').value.trim().replace(/^@/,'');

  if(!username){$('igInput').focus();return;}

  const activeChip=document.querySelector('#igCountChips .igRangePreset.active');

  const custom=$('igCountCustom').value.trim();

  const count=custom||(activeChip?activeChip.dataset.n:'');

  const checked=validateOutputPathInput($('igOutput').value||'');

  if(!checked.ok){

    toast(checked.error);

    $('igRunStatus').textContent=`❌ ${checked.error}`;

    return;

  }

  const output=checked.value;

  const dir=getHtmlDir();

  const effectiveOutput=output||(dir?`${dir}/downloads`:'downloads');

  const sid=($('igSessionId')?.value||'');

  const scriptPath=await resolveIgScriptPath();

  $('igCmd1').value=`pip install --upgrade instaloader requests browser-cookie3\npython ${quoteArg(scriptPath)} --doctor`;

  $('igCmd2').value=`python ${quoteArg(scriptPath)} ${username}${count?' --count '+count:''} --output ${quoteArg(effectiveOutput)}${buildIgAuthArgs(sid)}`;

  const s2note=$('igStep2Note');

  if(s2note){

    const sidClean=sanitizeSessionId(sid);

    if(looksLikePlaceholderSid(sidClean)){

      s2note.textContent='（你填写的是占位文字，不是真实 Session ID；请替换后再执行）';

    }else if(!sidClean){

      s2note.textContent='（未填 Session ID：已自动改为 --cookies-from-browser chrome）';

    }else if(scriptPath==='ig_download.py'){

      s2note.textContent='（请在命令执行目录放置 ig_download.py，或把脚本改成绝对路径）';

    }else{

      s2note.textContent='';

    }

  }

  updateIgStep3Note(username);

  ['igStep1','igStep2','igStep3'].forEach(id=>$(id).classList.add('on'));

  [$('igCmd1'),$('igCmd2')].forEach(ta=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';});

});



$('igRunBtn').addEventListener('click',async()=>{

  const username=($('igInput').value||'').trim().replace(/^@/,'');

  if(!username){$('igInput').focus();return;}

  const checked=validateOutputPathInput($('igOutput').value||'');

  if(!checked.ok){

    toast(checked.error);

    $('igRunStatus').textContent=`❌ ${checked.error}`;

    return;

  }

  const dir=getHtmlDir();

  const effectiveOutput=checked.value||(dir?`${dir}/downloads`:'downloads');

  const sid=sanitizeSessionId(($('igSessionId')?.value||''));

  const rawCount=guessCountFromUI();

  const count=(rawCount&&parseInt(rawCount,10)>0)?parseInt(rawCount,10):0;

  const payload={

    username,

    output:effectiveOutput,

    count,

    sessionid:sid,

    use_cookies_from_browser:!sid,

  };

  $('igRunBtn').disabled=true;

  $('igRunStatus').textContent='⏳ 正在启动下载任务…';

  try{

    const res=await fetch('/__run_ig_download__',{

      method:'POST',

      headers:{'Content-Type':'application/json'},

      body:JSON.stringify(payload),

    });

    const data=await res.json().catch(()=>({ok:false,error:'bad_json'}));

    if(!res.ok||!data.ok){

      const err=data?.error||`HTTP ${res.status}`;

      $('igRunStatus').textContent=`❌ 启动失败：${err}`;

      toast(`IG 下载启动失败：${err}`);

      return;

    }

    const authTip=sid?'sessionid':'cookies-from-browser';

    $('igRunStatus').textContent=`✅ 已启动下载任务（PID ${data.pid||'-'}，认证方式：${authTip}）`;

    if(!(rawCount&&parseInt(rawCount,10)>0)) toast('未指定数量，将下载全部（可能较慢）',2200);

    toast('已启动下载任务，正在同步运行结果…');

    if(data.pid){

      const poll=async()=>{

        try{

          const r=await fetch('/__ig_download_status__',{

            method:'POST',

            headers:{'Content-Type':'application/json'},

            body:JSON.stringify({pid:data.pid}),

          });

          const s=await r.json().catch(()=>({ok:false,error:'bad_json'}));

          if(!r.ok||!s.ok){

            $('igRunStatus').textContent=`❌ 任务状态查询失败：${s.error||('HTTP '+r.status)}`;

            return;

          }

          const tailLines=String(s.tail||'').split('\n').map(v=>v.trim()).filter(Boolean);

          const latestLine=tailLines.length?tailLines[tailLines.length-1]:'';

          let progressNm='';

          for(let i=tailLines.length-1;i>=0;i--){

            const m=tailLines[i].match(/\[(\d+)\s*\/\s*(\d+|\?)\]/);

            if(m){ progressNm=`${m[1]}/${m[2]}`; break; }

          }

          if(s.running){

            const left=progressNm?`⏳ 下载进行中（${progressNm}）`:`⏳ 下载进行中（PID ${s.pid}）`;

            const progressLine=latestLine?` | ${latestLine.slice(0,80)}`:'';

            $('igRunStatus').textContent=`${left}${progressLine}`;

            setTimeout(poll,2000);

            return;

          }

          if((s.exit_code||0)===0){

            $('igRunStatus').textContent=`✅ 下载完成（PID ${s.pid}）`;

            toast('IG 下载完成');

          }else{

            const tail=(s.tail||'').split('\n').slice(-2).join(' | ');

            $('igRunStatus').textContent=`❌ 下载失败（退出码 ${s.exit_code}）${tail?`：${tail}`:''}`;

            toast('IG 下载失败，请查看日志');

          }

        }catch(err){

          $('igRunStatus').textContent=`❌ 任务状态查询失败：${err.message||err}`;

        }

      };

      setTimeout(poll,1500);

    }

    ['igStep1','igStep2','igStep3'].forEach(id=>$(id).classList.add('on'));

    updateIgStep3Note(username);

  }catch(e){

    $('igRunStatus').textContent=`❌ 启动失败：${e.message||e}`;

    toast('IG 下载启动失败，请重试');

  }finally{

    $('igRunBtn').disabled=false;

  }

});



$('igCopy1').addEventListener('click',()=>$('igRunBtn').click());

$('igCopy2').addEventListener('click',()=>$('igRunBtn').click());

$('igInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('igFetchBtn').click();});



// ── XHS 导入面板 ──────────────────────────────────────────────────────────────

$('btnShowXHS').addEventListener('click',()=>{

  const panel=$('xhsPanel');

  panel.classList.toggle('on');

  if(panel.classList.contains('on')){

    $('igPanel').classList.remove('on');  // 互斥：关闭 IG 面板

    $('xhsInput').focus();

  }

});

$('btnShowIG').addEventListener('click',()=>{

  $('xhsPanel').classList.remove('on');  // 互斥：关闭 XHS 面板

});

function getXhsScriptPath(){

  const dir=getHtmlDir();

  return dir?`${dir}/xhs_download.py`:'xhs_download.py';

}

$('xhsFetchBtn').addEventListener('click',()=>{

  const raw=$('xhsInput').value.trim();

  if(!raw){$('xhsInput').focus();return;}

  // 提取 user_id（URL 或直接字符串）

  const m=raw.match(/\/user\/profile\/([0-9a-fA-F]{20,})/);

  const uid=m?m[1]:raw;

  const checked=validateOutputPathInput($('igOutput').value||'');

  if(!checked.ok){toast(checked.error);return;}

  const dir=getHtmlDir();

  const output=checked.value||(dir?`${dir}/downloads`:'downloads');

  $('xhsCmd1').value='⏳ 正在启动导入任务…';

  $('xhsCmd2').value='';

  $('xhsUserDisplay').textContent=uid;

  ['xhsStep1','xhsStep2','xhsStep3'].forEach(id=>$(id).classList.add('on'));

  [$('xhsCmd1'),$('xhsCmd2')].forEach(ta=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';});

  fetch('/__run_add_task__',{

    method:'POST',

    headers:{'Content-Type':'application/json'},

    body:JSON.stringify({platform:'xhs',user:uid,output,count:0,cookie:$('igAddXhsCookie')?.value?.trim?.()||''}),

  })

  .then(async(res)=>{

    const data=await res.json().catch(()=>({ok:false,error:'bad_json'}));

    if(!res.ok||!data.ok){

      const err=data?.error||`HTTP ${res.status}`;

      $('xhsCmd1').value=`❌ 启动失败：${err}`;

      return;

    }

    const pid=data.pid||0;

    $('xhsCmd1').value=`✅ 已启动导入任务（PID ${pid}）`;

    const poll=async()=>{

      try{

        const r=await fetch('/__ig_download_status__',{

          method:'POST',

          headers:{'Content-Type':'application/json'},

          body:JSON.stringify({pid}),

        });

        const s=await r.json().catch(()=>({ok:false,error:'bad_json'}));

        if(!r.ok||!s.ok){

          $('xhsCmd2').value=`❌ 状态查询失败：${s?.error||('HTTP '+r.status)}`;

          return;

        }

        if(s.running){

          $('xhsCmd2').value=`⏳ 导入进行中（PID ${s.pid}）`;

          setTimeout(poll,2000);

          return;

        }

        if((s.exit_code||0)===0){

          $('xhsCmd2').value='✅ 导入完成，请点「↻ 刷新相册」';

        }else{

          const tail=(s.tail||'').split('\n').slice(-6).join('\n').trim();

          $('xhsCmd2').value=`❌ 导入失败（退出码 ${s.exit_code}）\n${tail||''}`;

        }

      }catch(e){

        $('xhsCmd2').value=`❌ 状态查询失败：${e.message||e}`;

      }

    };

    setTimeout(poll,1200);

  })

  .catch((e)=>{$('xhsCmd1').value=`❌ 启动失败：${e.message||e}`;});

});

$('xhsCopy1').addEventListener('click',()=>$('xhsFetchBtn').click());

$('xhsCopy2').addEventListener('click',()=>$('xhsFetchBtn').click());

$('xhsInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('xhsFetchBtn').click();});

$('igOutput').addEventListener('input',()=>{

  const v=$('igOutput').value;

  localStorage.setItem('ig-output-path',v);

  // 更換輸出路徑時同步更新 S.rootAbsPath，確保「打開文件夾」等路徑相關功能即時生效

  if(S.rootName){

    const base=v.trim().replace(/[/\\]+$/,'');

    if(base) S.rootAbsPath=base+'/'+S.rootName;

  }

  document.dispatchEvent(new CustomEvent('ig-output-changed'));

  updateIgStep3Note();

});

$('igSessionId').addEventListener('input',()=>{

  localStorage.setItem('ig-session-id',$('igSessionId').value);

  if ($('igAddIgSessionId')) $('igAddIgSessionId').value = $('igSessionId').value;

});

// 💡 雙向綁定：當在彈窗內修改 Session ID 時，同步更新歡迎頁面的輸入框及本地緩存

if ($('igAddIgSessionId')) {

  $('igAddIgSessionId').addEventListener('input', () => {

    localStorage.setItem('ig-session-id', $('igAddIgSessionId').value);

    if ($('igSessionId')) $('igSessionId').value = $('igAddIgSessionId').value;

  });

}



// ── Quick IG Update ───────────────────────────────────────────────────────

(function(){

  const panel=$('quickIGPanel');

  const userInput=$('quickIGUser');

  const cmdEl=$('quickIGCmd');

  const pathRow=$('quickIGPathRow');

  const copyBtn=$('quickIGCopyBtn');

  const LSKEY='ig-quickuser';



  // Chip selection

  document.querySelectorAll('#quickIGChips .igRangePreset').forEach(btn=>{

    btn.addEventListener('click',()=>{

      document.querySelectorAll('#quickIGChips .igRangePreset').forEach(b=>b.classList.remove('active'));

      btn.classList.add('active');

    });

  });



  function buildPayload(){

    const user=userInput.value.trim().replace(/^@/,'');

    if(!user) return null;

    const chip=document.querySelector('#quickIGChips .igRangePreset.active');

    const n=chip?chip.dataset.n:'';

    const outPath=S.rootAbsPath||'downloads';

    const sid=sanitizeSessionId(($('igSessionId')?.value||''));

    const safeCount=(n&&parseInt(n,10)>0)?parseInt(n,10):0;

    return {

      username:user,

      output:outPath,

      count:safeCount,

      sessionid:sid,

      use_cookies_from_browser:!sid,

    };

  }



  function refreshPanel(){

    const outPath=S.rootAbsPath||'';

    pathRow.textContent=outPath?`保存至：${outPath}`:'';

    pathRow.style.display=outPath?'':'none';

    const payload=buildPayload();

    if(payload){cmdEl.textContent=`账号：@${payload.username}，点击下方按钮一键下载`;cmdEl.style.display='block';}

    else{cmdEl.style.display='none';}

  }



  $('btnQuickIG').addEventListener('click',e=>{

    e.stopPropagation();

    const isOpen=panel.classList.toggle('on');

    if(isOpen){

      // Restore saved username for this folder

      const key=LSKEY+(S.rootAbsPath||'');

      const saved=localStorage.getItem(key);

      if(saved&&!userInput.value) userInput.value=saved;

      refreshPanel();

      userInput.focus();

    }

  });



  userInput.addEventListener('input',()=>{

    const key=LSKEY+(S.rootAbsPath||'');

    localStorage.setItem(key,userInput.value.trim());

    refreshPanel();

  });



  document.querySelectorAll('#quickIGChips .igRangePreset').forEach(btn=>{

    btn.addEventListener('click',refreshPanel);

  });



  copyBtn.addEventListener('click',async()=>{

    const payload=buildPayload();

    if(!payload){userInput.focus();toast('请先输入 IG 用户名');return;}

    copyBtn.disabled=true;

    cmdEl.textContent='⏳ 正在启动下载任务…';cmdEl.style.display='block';

    try{

      const res=await fetch('/__run_ig_download__',{

        method:'POST',

        headers:{'Content-Type':'application/json'},

        body:JSON.stringify(payload),

      });

      const data=await res.json().catch(()=>({ok:false,error:'bad_json'}));

      if(!res.ok||!data.ok){

        cmdEl.textContent=`❌ 启动失败：${data?.error||('HTTP '+res.status)}`;

        return;

      }

      const pid=data.pid||0;

      cmdEl.textContent=`✅ 已启动下载（PID ${pid}）`;

      const poll=async()=>{

        try{

          const r=await fetch('/__ig_download_status__',{

            method:'POST',

            headers:{'Content-Type':'application/json'},

            body:JSON.stringify({pid}),

          });

          const s=await r.json().catch(()=>({ok:false,error:'bad_json'}));

          if(!r.ok||!s.ok){ cmdEl.textContent=`❌ 状态查询失败：${s?.error||('HTTP '+r.status)}`; return; }

          if(s.running){

            const tailLines=String(s.tail||'').split('\n').map(v=>v.trim()).filter(Boolean);

            let progressNm='';

            for(let i=tailLines.length-1;i>=0;i--){

              const m=tailLines[i].match(/\[(\d+)\s*\/\s*(\d+|\?)\]/);

              if(m){ progressNm=`${m[1]}/${m[2]}`; break; }

            }

            cmdEl.textContent=progressNm?`⏳ 下载进行中（${progressNm}）`:`⏳ 下载进行中（PID ${s.pid}）`;

            setTimeout(poll,2000);

            return;

          }

          if((s.exit_code||0)===0) cmdEl.textContent='✅ 下载完成，请刷新相册';

          else{

            const tail=(s.tail||'').split('\n').slice(-4).join(' | ');

            cmdEl.textContent=`❌ 下载失败（退出码 ${s.exit_code}）${tail?`：${tail}`:''}`;

          }

        }catch(e){ cmdEl.textContent=`❌ 状态查询失败：${e.message||e}`; }

      };

      setTimeout(poll,1200);

    }catch(e){

      cmdEl.textContent=`❌ 启动失败：${e.message||e}`;

    }finally{

      copyBtn.disabled=false;

    }

  });



  userInput.addEventListener('keydown',e=>{if(e.key==='Enter')copyBtn.click();});



  // Close when clicking outside

  document.addEventListener('click',e=>{

    if(panel.classList.contains('on')&&!panel.contains(e.target)&&e.target.id!=='btnQuickIG')

      panel.classList.remove('on');

  });



  // 更換輸出路徑或切換文件夾時，若面板開啟則即時刷新

  document.addEventListener('ig-output-changed',()=>{if(panel.classList.contains('on'))refreshPanel();});

  document.addEventListener('folder-loaded',()=>{if(panel.classList.contains('on'))refreshPanel();});

})();



// ── Events ────────────────────────────────────────────────────────────────

btnOpen.addEventListener('click',openFolder);

$('btnWelcomeOpen').addEventListener('click',openFolder);

btnBack.addEventListener('click',()=>{if(S.view==='album')goHome();});

$('btnLBBack').addEventListener('click',closeLB);

  // 💡 點擊卡片外部的毛玻璃背景時，自動執行返回關閉大圖

  $('vLB').addEventListener('click', (e) => {

    if (e.target === $('vLB')) {

      closeLB();

    }

  });

lbPrev.addEventListener('click',()=>lbMove(-1));

lbNext.addEventListener('click',()=>lbMove(1));



lbCaption.addEventListener('input',()=>{

  ar(lbCaption);

  lbCaption.classList.toggle('empty', !lbCaption.value.trim());

  const alb=S.currentAlbum,photo=alb.photos[S.currentIdx];

  store.setCaption(alb.name,photo.name,lbCaption.value);

  const ta=$('vAlbum').querySelector(`[data-idx="${S.currentIdx}"]`);

  if(ta&&ta.value!==lbCaption.value){ta.value=lbCaption.value;ar(ta);}

  writePhotoCaptionSidecar(alb, photo, lbCaption.value);

  scheduleWrite(alb);

});



function formatVideoTime(seconds) {

  if (isNaN(seconds) || seconds < 0) return '00:00:00.000';

  const h = Math.floor(seconds / 3600);

  const m = Math.floor((seconds % 3600) / 60);

  const s = Math.floor(seconds % 60);

  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

}



// 视频截图逻辑绑定

(function(){

  const btnCapture = $('btnVideoShotCapture');

  const btnConfirm = $('btnVideoShotConfirm');

  const shotTimeInput = $('lbVideoShotTime');

  const shotStatus = $('lbVideoShotStatus');



  if (btnCapture) {

    btnCapture.addEventListener('click', () => {

      const vid = $('lbVideo');

      if (vid) {

        shotTimeInput.value = formatVideoTime(vid.currentTime);

      }

    });

  }



  if (btnConfirm) {

    btnConfirm.addEventListener('click', async () => {

      const alb = S.currentAlbum;

      const idx = S.currentIdx;

      const photo = alb?.photos?.[idx];

      if (!alb || !photo || !photo.isVideo) return;



      const timeVal = shotTimeInput.value.trim();

      if (!timeVal) {

        showShotStatus('请输入时间码或秒数', 'error');

        return;

      }



      btnConfirm.disabled = true;

      showShotStatus('正在截取视频帧...', '');



      try {

        const absPath = getPhotoPath(alb, photo);

        const res = await fetch('/__video_screenshot__', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ path: absPath, time: timeVal })

        });

        const result = await res.json();

        if (result.ok) {

          showShotStatus(`✓ 截图成功！已存入同级目录: ${result.filename}`, 'success');

          setTimeout(() => {

            if (shotStatus.textContent.includes('✓')) {

              shotStatus.style.display = 'none';

            }

          }, 5000);

        } else {

          showShotStatus(`失败: ${result.error || '未知错误'}`, 'error');

        }

      } catch (err) {

        showShotStatus(`网络请求失败: ${err.message}`, 'error');

      } finally {

        btnConfirm.disabled = false;

      }

    });

  }



  function showShotStatus(msg, type) {

    if (!shotStatus) return;

    shotStatus.textContent = msg;

    shotStatus.style.display = 'block';

    shotStatus.className = 'lbVideoShotStatus ' + type;

  }

})();



// 视频裁剪逻辑绑定

(function(){

  const btnStartCap = $('btnVideoClipStartCap');

  const btnEndCap = $('btnVideoClipEndCap');

  const startInput = $('lbVideoClipStart');

  const endInput = $('lbVideoClipEnd');

  const btnConfirm = $('btnVideoClipConfirm');

  const clipStatus = $('lbVideoClipStatus');



  function parseTimeToSeconds(timeStr) {

    timeStr = timeStr.trim();

    if (!timeStr) return 0;

    if (/^\d+(\.\d+)?$/.test(timeStr)) return parseFloat(timeStr);

    const parts = timeStr.split(':');

    if (parts.length === 3) {

      const h = parseInt(parts[0], 10) || 0;

      const m = parseInt(parts[1], 10) || 0;

      const sParts = parts[2].split('.');

      const s = parseInt(sParts[0], 10) || 0;

      const ms = sParts.length > 1 ? parseInt(sParts[1].padEnd(3, '0').slice(0, 3), 10) || 0 : 0;

      return h * 3600 + m * 60 + s + ms / 1000;

    }

    if (parts.length === 2) {

      const m = parseInt(parts[0], 10) || 0;

      const sParts = parts[1].split('.');

      const s = parseInt(sParts[0], 10) || 0;

      const ms = sParts.length > 1 ? parseInt(sParts[1].padEnd(3, '0').slice(0, 3), 10) || 0 : 0;

      return m * 60 + s + ms / 1000;

    }

    return 0;

  }



  function updateDuration() {

    const t1 = parseTimeToSeconds(startInput.value);

    const t2 = parseTimeToSeconds(endInput.value);

    const diff = Math.max(0, t2 - t1);

    $('lbVideoClipDuration').textContent = diff.toFixed(2);

  }



  if (btnStartCap) {

    btnStartCap.addEventListener('click', () => {

      const vid = $('lbVideo');

      if (vid) {

        startInput.value = formatVideoTime(vid.currentTime);

        updateDuration();

      }

    });

  }



  if (btnEndCap) {

    btnEndCap.addEventListener('click', () => {

      const vid = $('lbVideo');

      if (vid) {

        endInput.value = formatVideoTime(vid.currentTime);

        updateDuration();

      }

    });

  }



  [startInput, endInput].forEach(el => {

    if (el) {

      el.addEventListener('input', updateDuration);

    }

  });



  if (btnConfirm) {

    btnConfirm.addEventListener('click', async () => {

      const alb = S.currentAlbum;

      const idx = S.currentIdx;

      const photo = alb?.photos?.[idx];

      if (!alb || !photo || !photo.isVideo) return;



      const tStart = startInput.value.trim();

      const tEnd = endInput.value.trim();



      if (!tStart || !tEnd) {

        showClipStatus('起点和终点时间不能为空', 'error');

        return;

      }



      const secStart = parseTimeToSeconds(tStart);

      const secEnd = parseTimeToSeconds(tEnd);

      if (secStart >= secEnd) {

        showClipStatus('起点时间不能晚于或等于终点时间', 'error');

        return;

      }



      const reencode = $('chkVideoClipReencode').checked;



      btnConfirm.disabled = true;

      showClipStatus(reencode ? '正在重编码剪辑中，请稍候...' : '正在极速裁剪中，请稍候...', '');



      try {

        const absPath = getPhotoPath(alb, photo);

        const res = await fetch('/__video_clip__', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            path: absPath,

            start: tStart,

            end: tEnd,

            reencode: reencode

          })

        });

        const result = await res.json();

        if (result.ok) {

          showClipStatus(`✓ 裁剪成功！已存入同级目录: ${result.filename}`, 'success');

          setTimeout(() => {

            if (clipStatus.textContent.includes('✓')) {

              clipStatus.style.display = 'none';

            }

          }, 5000);

        } else {

          showClipStatus(`裁剪失败: ${result.error || '未知错误'}`, 'error');

        }

      } catch (err) {

        showClipStatus(`网络请求失败: ${err.message}`, 'error');

      } finally {

        btnConfirm.disabled = false;

      }

    });

  }



  function showClipStatus(msg, type) {

    if (!clipStatus) return;

    clipStatus.textContent = msg;

    clipStatus.style.display = 'block';

    clipStatus.className = 'lbVideoShotStatus ' + type;

  }

})();



// ── Add Posts Modal ──────────────────────────────────────────────────────

(function(){

  const modal=$('igAddModal');

  const cmdEl=$('igAddCmd');

  const actionLabel=$('igAddActionLabel');

  const copyBtn=$('igAddCopyBtn');

  const refreshBtn=$('igAddRefreshBtn');

  const customNInp=$('igAddCustomN');

  // 'ig' | 'xhs' | 'flat' | 'hhcat'

  let platform='ig';

  let igTaskPid=0;



  // 下載類平台使用 output 的父層路徑

  function getOutPath(){

    if(S.rootAbsPath){

      const norm=S.rootAbsPath.replace(/\\/g,'/').replace(/\/+$/,'');

      const lastName = norm.split('/').pop().toLowerCase();

      // 如果当前打开的就是相册的主目录（比如名字是 "本地ig"）

      // 则无需获取其父目录，直接返回当前根目录作为输出目录，这样子相册会直接建在该目录下。

      if (lastName === '本地ig') {

        return norm;

      }

      const idx=norm.lastIndexOf('/');

      if(idx>0) return norm.slice(0,idx);

    }

    const base=localStorage.getItem('ig-output-path');

    if(base&&base.trim()) return base.trim().replace(/[/\\]+$/,'');

    return 'downloads';

  }



  // 轉換類平台使用當前開啟的資料夾本身

  function getCurrentFolderPath(alb){

    if(alb) return S.rootAbsPath ? `${S.rootAbsPath}/${alb.name}` : '';

    return S.rootAbsPath||'';

  }



  function getScriptPath(name){

    const dir=getHtmlDir();

    return dir?`${dir}/${name}`:name;

  }



  function getCount(){

    const v=customNInp.value.trim();

    if(v&&parseInt(v,10)>0) return parseInt(v,10)+'';

    const chip=modal.querySelector('.igRangePreset.active');

    return chip?chip.dataset.n:'';

  }



  function buildCmd(){

    if(platform==='ig'){

      const user=$('igAddUser').value.trim().replace(/^@/,'');

      if(!user) return '';

      const n=getCount();

      const sid=(localStorage.getItem('ig-session-id')||'');

      return `python ${quoteArg(getScriptPath('ig_download.py'))} ${user}${n?' --count '+n:''} --output ${quoteArg(getOutPath())}${buildIgAuthArgs(sid)}`;

    }

    if(platform==='xhs'){

      const user=$('igAddXhsUser').value.trim();

      if(!user) return '';

      const n=getCount();

      const cookie=$('igAddXhsCookie').value.trim();

      if(cookie) localStorage.setItem('xhs-cookie',cookie);

      return `python "${getScriptPath('xhs_download.py')}" "${user}"${n?' --count '+n:''} --output "${getOutPath()}"${cookie?' --cookie "'+cookie+'"':''}`;

    }

    if(platform==='flat'){

      const path=$('igAddFlatPath').value.trim();

      if(!path) return '';

      const dry=$('igAddFlatDry').checked?' --dry-run':'';

      return `python "${getScriptPath('flat_convert.py')}" "${path}"${dry}`;

    }

    if(platform==='hhcat'){

      const path=$('igAddHhcatPath').value.trim();

      if(!path) return '';

      const dry=$('igAddHhcatDry').checked?' --dry-run':'';

      return `python "${getScriptPath('hhcat_convert.py')}" "${path}"${dry}`;

    }

    return '';

  }



  const EMPTY_HINTS={

    ig:'（請輸入 IG 用戶名）',

    xhs:'（請輸入用戶主頁 URL 或 user_id）',

    flat:'（請輸入散圖資料夾路徑）',

    hhcat:'（請輸入哼哼猫資料夾路徑）',

  };



  function refreshCmd(){

    const cmd=buildCmd();

    cmdEl.textContent=cmd||EMPTY_HINTS[platform]||'';

    cmdEl.style.display='block';

    actionLabel.textContent='執行結果（本地IG一鍵執行）';

    const labels={ig:'在本地IG中一鍵開始下載',xhs:'在本地IG中一鍵導入',flat:'在本地IG中一鍵轉換',hhcat:'在本地IG中一鍵轉換'};

    copyBtn.textContent=labels[platform]||'在本地IG中一鍵執行';

    // 轉換工具：隱藏數量欄；下載工具：顯示

    const isDownload=platform==='ig'||platform==='xhs';

    $('igAddCountSection').style.display=isDownload?'':'none';

  }



  // 平台切換

  modal.querySelector('#igAddTabs').addEventListener('click',e=>{

    const tab=e.target.closest('.igAddTab');

    if(!tab) return;

    platform=tab.dataset.platform;

    modal.querySelectorAll('.igAddTab').forEach(t=>t.classList.toggle('active',t===tab));

    $('igAddIgFields').style.display=platform==='ig'?'':'none';

    $('igAddXhsFields').style.display=platform==='xhs'?'':'none';

    $('igAddFlatFields').style.display=platform==='flat'?'':'none';

    $('igAddHhcatFields').style.display=platform==='hhcat'?'':'none';

    refreshCmd();

    setTimeout(()=>{

      const map={ig:'igAddUser',xhs:'igAddXhsUser',flat:'igAddFlatPath',hhcat:'igAddHhcatPath'};

      const inp=$(map[platform]);

      if(inp&&!inp.value) inp.focus();

    },50);

  });



  // chips 點擊

  modal.querySelector('#igAddChips').addEventListener('click',e=>{

    const btn=e.target.closest('.igRangePreset');

    if(!btn) return;

    modal.querySelectorAll('.igRangePreset').forEach(b=>b.classList.remove('active'));

    btn.classList.add('active');

    customNInp.value='';

    refreshCmd();

  });

  customNInp.addEventListener('input',()=>{

    if(customNInp.value.trim()) modal.querySelectorAll('.igRangePreset').forEach(b=>b.classList.remove('active'));

    refreshCmd();

  });



  $('igAddUser').addEventListener('input',refreshCmd);

  $('igAddXhsUser').addEventListener('input',refreshCmd);

  $('igAddXhsCookie').addEventListener('input',refreshCmd);

  $('igAddFlatPath').addEventListener('input',refreshCmd);

  $('igAddHhcatPath').addEventListener('input',refreshCmd);

  $('igAddFlatDry').addEventListener('change',refreshCmd);

  $('igAddHhcatDry').addEventListener('change',refreshCmd);



  async function pollTaskStatus(pid){

    const poll=async()=>{

      if(!pid) return;

      try{

        const r=await fetch('/__ig_download_status__',{

          method:'POST',

          headers:{'Content-Type':'application/json'},

          body:JSON.stringify({pid}),

        });

        const s=await r.json().catch(()=>({ok:false,error:'bad_json'}));

        if(!r.ok||!s.ok){

          cmdEl.textContent=`❌ 任務狀態查詢失敗：${s?.error||('HTTP '+r.status)}`;

          return;

        }

        if(s.running){

          const tailLines=String(s.tail||'').split('\n').map(v=>v.trim()).filter(Boolean);

          const latestLine=tailLines.length?tailLines[tailLines.length-1]:'';

          let progressNm='';

          for(let i=tailLines.length-1;i>=0;i--){

            const m=tailLines[i].match(/\[(\d+)\s*\/\s*(\d+|\?)\]/);

            if(m){ progressNm=`${m[1]}/${m[2]}`; break; }

          }

          const left=progressNm?`⏳ 執行中（${progressNm}）`:`⏳ 執行中（PID ${s.pid}）`;

          const progressLine=latestLine?` | ${latestLine.slice(0,80)}`:'';

          cmdEl.textContent=`${left}${progressLine}`;

          setTimeout(poll,2000);

          return;

        }

        if((s.exit_code||0)===0){

          cmdEl.textContent='✅ 執行完成，請點「↻ 刷新相冊」';

          toast('執行完成，請刷新相冊',2200);

        }else{

          const tail=(s.tail||'').split('\n').slice(-8).join('\n').trim();

          cmdEl.textContent=`❌ 執行失敗（退出碼 ${s.exit_code}）：${tail||''}`;

        }

      }catch(e){

        cmdEl.textContent=`❌ 任務狀態查詢失敗：${e.message||e}`;

      }

    };

    setTimeout(poll,1200);

  }



  async function runIgOneClick(){

    const user=$('igAddUser').value.trim().replace(/^@/,'');

    if(!user){$('igAddUser')?.focus();return;}

    const n=getCount();

    const safeCount=(n&&parseInt(n,10)>0)?parseInt(n,10):0;

    const sidRaw=(localStorage.getItem('ig-session-id')||'');

    const sid=(typeof sanitizeSessionId==='function')?sanitizeSessionId(sidRaw):sidRaw.trim();

    const payload={

      username:user,

      output:getOutPath(),

      count:safeCount,

      sessionid:sid,

      use_cookies_from_browser:!sid,

    };

    copyBtn.disabled=true;

    cmdEl.textContent='⏳ 正在啟動下載任務…';

    try{

      const res=await fetch('/__run_ig_download__',{

        method:'POST',

        headers:{'Content-Type':'application/json'},

        body:JSON.stringify(payload),

      });

      const data=await res.json().catch(()=>({ok:false,error:'bad_json'}));

      if(!res.ok||!data.ok){

        cmdEl.textContent=`❌ 啟動失敗：${data?.error||('HTTP '+res.status)}`;

        return;

      }

      igTaskPid=data.pid||0;

      const authTip=sid?'sessionid':'cookies-from-browser';

      cmdEl.textContent=`✅ 已啟動任務（PID ${igTaskPid||'-'}，認證：${authTip}）`;

      if(!(n&&parseInt(n,10)>0)){

        toast('未指定数量，将下载全部（可能较慢）',2200);

      }

      pollTaskStatus(igTaskPid);

    }catch(e){

      cmdEl.textContent=`❌ 啟動失敗：${e.message||e}`;

    }finally{

      copyBtn.disabled=false;

    }

  }

  async function runAddTaskOneClick(){

    if(platform==='ig'){ await runIgOneClick(); return; }

    const payload={platform};

    if(platform==='xhs'){

      const user=$('igAddXhsUser').value.trim();

      if(!user){$('igAddXhsUser')?.focus();return;}

      const n=getCount();

      const cookie=$('igAddXhsCookie').value.trim();

      if(cookie) localStorage.setItem('xhs-cookie',cookie);

      payload.user=user;

      payload.output=getOutPath();

      payload.count=(n&&parseInt(n,10)>0)?parseInt(n,10):0;

      payload.cookie=cookie;

    }else if(platform==='flat'){

      const path=$('igAddFlatPath').value.trim();

      if(!path){$('igAddFlatPath')?.focus();return;}

      payload.path=path;

      payload.dry_run=$('igAddFlatDry').checked;

    }else if(platform==='hhcat'){

      const path=$('igAddHhcatPath').value.trim();

      if(!path){$('igAddHhcatPath')?.focus();return;}

      payload.path=path;

      payload.dry_run=$('igAddHhcatDry').checked;

    }

    copyBtn.disabled=true;

    cmdEl.textContent='⏳ 正在啟動任務…';

    try{

      const res=await fetch('/__run_add_task__',{

        method:'POST',

        headers:{'Content-Type':'application/json'},

        body:JSON.stringify(payload),

      });

      const data=await res.json().catch(()=>({ok:false,error:'bad_json'}));

      if(!res.ok||!data.ok){

        cmdEl.textContent=`❌ 啟動失敗：${data?.error||('HTTP '+res.status)}`;

        return;

      }

      igTaskPid=data.pid||0;

      cmdEl.textContent=`✅ 已啟動任務（PID ${igTaskPid||'-'}）`;

      pollTaskStatus(igTaskPid);

    }catch(e){

      cmdEl.textContent=`❌ 啟動失敗：${e.message||e}`;

    }finally{

      copyBtn.disabled=false;

    }

  }

  copyBtn.addEventListener('click',()=>{

    runAddTaskOneClick();

  });



  refreshBtn.addEventListener('click',async()=>{

    if(!S.rootDirHandle){toast('請先開啟文件夾',2000);return;}

    refreshBtn.disabled=true;refreshBtn.textContent='…';

    const prev=S.albums.length;

    try{

      S.albums.forEach(a=>{if(a.coverUrl){URL.revokeObjectURL(a.coverUrl);a.coverUrl=null;}});

      S.albums=await readFolder(S.rootDirHandle);

      const diff=S.albums.length-prev;

      if(diff>0&&S.activeTags.size) S.activeTags.clear();

      if(S.view==='home') renderHome();

      else if(S.view==='album'&&S.currentAlbum){

        const upd=S.albums.find(a=>a.name===S.currentAlbum.name);

        if(upd){S.currentAlbum=upd;renderAlbumGrid(upd);}else goHome();

      }

      const diffTxt=diff>0?`（+${diff} 個相冊）`:diff<0?`（-${Math.abs(diff)} 個相冊）`:`（共 ${S.albums.length} 個）`;

      toast('✓ 已更新 '+diffTxt,2000);

      modal.classList.remove('on');

    }catch(e){toast('⚠️ 更新失敗: '+e.message,3000);}

    finally{refreshBtn.disabled=false;refreshBtn.textContent='↻ 刷新相冊';}

  });



  $('igAddClose').addEventListener('click',()=>modal.classList.remove('on'));

  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('on');});



  window.openAddPostsModal=function(alb){

    const guess=S.rootName||alb?.name||'';

    $('igAddUser').value=guess;

    $('igAddXhsCookie').value=localStorage.getItem('xhs-cookie')||'';

    // 💡 初始化彈窗中的 IG Session ID 欄位

    const savedSid = localStorage.getItem('ig-session-id') || '';

    if ($('igAddIgSessionId')) $('igAddIgSessionId').value = savedSid;

    // 轉換工具：預填當前開啟的資料夾路徑

    const folderPath=getCurrentFolderPath(alb);

    $('igAddFlatPath').value=folderPath;

    $('igAddHhcatPath').value=folderPath;

    // 重置數量

    modal.querySelectorAll('.igRangePreset').forEach((b,i)=>b.classList.toggle('active',i===1));

    customNInp.value='';

    refreshCmd();

    modal.classList.add('on');

    setTimeout(()=>{

      const map={ig:'igAddUser',xhs:'igAddXhsUser',flat:'igAddFlatPath',hhcat:'igAddHhcatPath'};

      const inp=$(map[platform]);

      if(inp){inp.select();inp.focus();}

    },80);

  };

})();



btnSort.addEventListener('click',()=>{

  const idx=SORT_CYCLE.indexOf(S.sortMode);

  S.sortMode=SORT_CYCLE[(idx+1)%SORT_CYCLE.length];

  updateSortBtn();

  renderHome();

});

$('vHome').addEventListener('scroll', handleHomeScroll);



$('btnTimeline').addEventListener('click',()=>{

  S.timelineMode=!S.timelineMode;

  if(S.timelineMode) S.mapMode=false;

  $('btnTimeline').classList.toggle('active',S.timelineMode);

  $('btnMap').classList.toggle('active',S.mapMode);

  renderHome();

});



// ── 地圖視圖 ──────────────────────────────────────────────────────────────

let _leafletLoaded=false;

let _leafletMap=null;

const GEO_CACHE_KEY='local-ig-geocache';



function getGeoCache(){try{return JSON.parse(localStorage.getItem(GEO_CACHE_KEY)||'{}')}catch{return{}}}

function setGeoCache(cache){try{localStorage.setItem(GEO_CACHE_KEY,JSON.stringify(cache))}catch{}}



async function geocodeLocation(loc){

  if(!loc) return null;

  const cache=getGeoCache();

  if(cache[loc]) return cache[loc];

  try{

    const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`;

    const res=await fetch(url,{headers:{'Accept-Language':'zh-TW,zh;q=0.9,en;q=0.8'}});

    const data=await res.json();

    if(data&&data[0]){

      const r={lat:parseFloat(data[0].lat),lng:parseFloat(data[0].lon)};

      cache[loc]=r;setGeoCache(cache);return r;

    }

    cache[loc]=null;setGeoCache(cache);return null;

  }catch{return null;}

}



async function loadLeaflet(){

  if(_leafletLoaded) return;

  await new Promise((resolve,reject)=>{

    const link=document.createElement('link');

    link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

    document.head.appendChild(link);

    const script=document.createElement('script');

    script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

    script.onload=resolve;script.onerror=reject;

    document.head.appendChild(script);

  });

  _leafletLoaded=true;

}



async function renderMapView(){

  const mapEl=$('mapView');

  if(!mapEl) return;



  // 顯示 loading

  mapEl.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:14px">🗺 正在載入地圖與地點資料…</div>';



  try{ await loadLeaflet(); }

  catch{mapEl.innerHTML='<div style="padding:20px;color:#e74c3c">無法載入 Leaflet 地圖（請確認網路連線）</div>';return;}



  // 收集所有有地點的相冊（去重 location）

  const locMap=new Map(); // location -> [alb, ...]

  S.albums.forEach(alb=>{

    if(!alb.location) return;

    if(!locMap.has(alb.location)) locMap.set(alb.location,[]);

    locMap.get(alb.location).push(alb);

  });



  if(locMap.size===0){

    mapEl.innerHTML='<div style="padding:20px;color:var(--muted);text-align:center">目前沒有含地點資訊的相冊</div>';

    return;

  }



  // 初始化地圖（清掉舊的）

  mapEl.innerHTML='';

  mapEl.style.background='';

  if(_leafletMap){_leafletMap.remove();_leafletMap=null;}

  const L=window.L;

  _leafletMap=L.map(mapEl,{zoomControl:true});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{

    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',

    maxZoom:19

  }).addTo(_leafletMap);



  const markers=[];

  let done=0;

  const total=locMap.size;

  const RATE_MS=250; // Nominatim rate limit



  for(const [loc,albs] of locMap.entries()){

    await new Promise(r=>setTimeout(r,done===0?0:RATE_MS));

    const coord=await geocodeLocation(loc);

    done++;

    $('mapLegend').textContent=`正在搜尋座標… ${done}/${total}`;

    if(!coord) continue;



    const mkIcon=()=>L.divIcon({

      className:'',

      html:`<div style="background:var(--accent,#e74c3c);border:2px solid #fff;border-radius:50%;width:12px;height:12px;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,

      iconSize:[12,12],iconAnchor:[6,6]

    });



    const popupHtml=albs.slice(0,5).map(alb=>{

      const thumb=alb.photos[alb.coverPhoto||0];

      const imgSrc=thumb?`<img src="" data-name="${alb.name}" data-photo="${alb.coverPhoto||0}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:4px;display:block">`:'' ;

      return `<div class="map-popup">${imgSrc}<strong>${esc(alb.title||alb.name)}</strong><a href="#" data-alb="${alb.name}" style="font-size:11px;color:var(--accent)">查看相冊 →</a></div>`;

    }).join('<hr style="margin:4px 0;opacity:.2">') + (albs.length>5?`<div style="font-size:11px;opacity:.6;margin-top:4px">…還有 ${albs.length-5} 個相冊</div>`:'');



    const marker=L.marker([coord.lat,coord.lng],{icon:mkIcon(),title:loc})

      .bindPopup(popupHtml,{maxWidth:220})

      .addTo(_leafletMap);

    marker._albNames=albs.map(a=>a.name);

    marker._loc=loc;

    markers.push(marker);

  }



  if(markers.length===0){

    $('mapLegend').textContent='無法取得任何地點座標（Nominatim 搜尋失敗）';

    return;

  }



  // 自動 fitBounds

  const group=L.featureGroup(markers);

  _leafletMap.fitBounds(group.getBounds().pad(0.2));

  $('mapLegend').textContent=`${markers.length} 個地點 · 點擊圖釘查看相冊`;



  // popup 裡的「查看相冊」連結

  $('vMap').addEventListener('click',e=>{

    const a=e.target.closest('a[data-alb]');

    if(!a) return;

    e.preventDefault();

    const alb=S.albums.find(x=>x.name===a.dataset.alb);

    if(alb){S.mapMode=false;$('btnMap').classList.remove('active');goAlbum(alb);}

  },{once:false});



  // 載入 popup 縮圖（Leaflet popupopen 事件）

  _leafletMap.on('popupopen',()=>{

    mapEl.querySelectorAll('img[data-name]').forEach(async img=>{

      if(img._loaded) return;img._loaded=true;

      const alb=S.albums.find(a=>a.name===img.dataset.name);

      if(!alb||!S.rootDirHandle) return;

      const photoIdx=parseInt(img.dataset.photo)||0;

      const photo=alb.photos[photoIdx];

      if(!photo) return;

      try{

        const fh=await S.rootDirHandle.getDirectoryHandle(alb.name);

        const ph=await fh.getFileHandle(photo.filename);

        const f=await ph.getFile();

        img.src=safeCreateObjectURL(f);

      }catch{}

    });

  });

}



$('btnMap').addEventListener('click',()=>{

  S.mapMode=!S.mapMode;

  if(S.mapMode) S.timelineMode=false;

  $('btnMap').classList.toggle('active',S.mapMode);

  $('btnTimeline').classList.toggle('active',S.timelineMode);

  if(S.mapMode){

    showView('map');

    renderMapView();

  } else {

    showView('home');

    renderHome();

  }

});



$('btnAddPosts').addEventListener('click',()=>openAddPostsModal(S.currentAlbum));







// ── 翻譯 Modal ────────────────────────────────────────────────────────────

(function(){

  const modal=$('transModal');

  const cmdEl=$('transCmd');

  const copyCmdBtn=$('transCopyCmdBtn');

  const copyPsBtn=$('transCopyPsBtn');

  let selectedLang='en';



  function getTransScriptPath(){

    const dir=getHtmlDir();

    return dir?`${dir}/APP - deep-translator.py`:'APP - deep-translator.py';

  }



  function getFreshFolderPath(){

    if(S.rootAbsPath) return S.rootAbsPath;

    const dir=getHtmlDir();

    return (dir&&S.rootName)?`${dir}/${S.rootName}`:'';

  }



  function getPreferredPythonCommand(){

    const isWin=navigator.userAgent.includes('Windows');

    return isWin?'py -3':'python';

  }



  function buildCmd(){

    const folder=getFreshFolderPath();

    return `${getPreferredPythonCommand()} "${getTransScriptPath()}"${folder?' --folder "'+folder+'"':''} --lang ${selectedLang}`;

  }



  function buildPowerShellCmd(){

    const folder=getFreshFolderPath();

    const base=`${getPreferredPythonCommand()} "${getTransScriptPath()}"`;

    return folder

      ? `& ${base} --folder "${folder}" --lang ${selectedLang}`

      : `& ${base} --lang ${selectedLang}`;

  }



  function refreshCmd(){

    const folder=getFreshFolderPath();

    $('transFolderPath').textContent=folder||'（未開啟文件夾，翻譯後需手動選擇）';

    cmdEl.textContent='點「一鍵翻譯」後顯示執行狀態';

    $('transCopyCmdBtn').textContent='一鍵翻譯';

    $('transCopyPsBtn').textContent='查看命令';

  }



  // 語言 chips

  modal.querySelector('#transLangChips').addEventListener('click',e=>{

    const btn=e.target.closest('.transLangBtn');

    if(!btn) return;

    selectedLang=btn.dataset.lang;

    modal.querySelectorAll('.transLangBtn').forEach(b=>b.classList.toggle('active',b===btn));

    refreshCmd();

  });



  copyCmdBtn.addEventListener('click',async()=>{

    const folder=getFreshFolderPath();

    copyCmdBtn.disabled=true;

    cmdEl.textContent='⏳ 正在啟動翻譯任務…';

    try{

      const res=await fetch('/__run_add_task__',{

        method:'POST',

        headers:{'Content-Type':'application/json'},

        body:JSON.stringify({platform:'trans',path:folder,lang:selectedLang}),

      });

      const data=await res.json().catch(()=>({ok:false,error:'bad_json'}));

      if(!res.ok||!data.ok){

        cmdEl.textContent=`❌ 啟動失敗：${data?.error||('HTTP '+res.status)}`;

        return;

      }

      const pid=data.pid||0;

      cmdEl.textContent=`✅ 已啟動翻譯（PID ${pid}）`;

      const poll=async()=>{

        try{

          const r=await fetch('/__ig_download_status__',{

            method:'POST',

            headers:{'Content-Type':'application/json'},

            body:JSON.stringify({pid}),

          });

          const s=await r.json().catch(()=>({ok:false,error:'bad_json'}));

          if(!r.ok||!s.ok){ cmdEl.textContent=`❌ 狀態查詢失敗：${s?.error||('HTTP '+r.status)}`; return; }

          if(s.running){ cmdEl.textContent=`⏳ 翻譯進行中（PID ${s.pid}）`; setTimeout(poll,2000); return; }

          if((s.exit_code||0)===0) cmdEl.textContent='✅ 翻譯完成，請點「↻ 刷新相冊」';

          else{

            const tail=(s.tail||'').split('\n').slice(-6).join('\n').trim();

            cmdEl.textContent=`❌ 翻譯失敗（退出碼 ${s.exit_code}）\n${tail||''}`;

          }

        }catch(e){ cmdEl.textContent=`❌ 狀態查詢失敗：${e.message||e}`; }

      };

      setTimeout(poll,1200);

    }catch(e){

      cmdEl.textContent=`❌ 啟動失敗：${e.message||e}`;

    }finally{

      copyCmdBtn.disabled=false;

    }

  });

  copyPsBtn.addEventListener('click',()=>{

    const cmd=buildPowerShellCmd();

    cmdEl.textContent=cmd;

    toast('已顯示命令（可作為備用）',1800);

  });



  const refreshBtn2=$('transRefreshBtn');

  refreshBtn2.addEventListener('click',async()=>{

    if(!S.rootDirHandle){toast('請先開啟文件夾',2000);return;}

    refreshBtn2.disabled=true;refreshBtn2.textContent='…';

    const prev=S.albums.length;

    try{

      S.albums.forEach(a=>{if(a.coverUrl){URL.revokeObjectURL(a.coverUrl);a.coverUrl=null;}});

      S.albums=await readFolder(S.rootDirHandle);

      const diff=S.albums.length-prev;

      if(diff>0&&S.activeTags.size) S.activeTags.clear();

      if(S.view==='home') renderHome();

      else if(S.view==='album'&&S.currentAlbum){

        const upd=S.albums.find(a=>a.name===S.currentAlbum.name);

        if(upd){S.currentAlbum=upd;renderAlbumGrid(upd);}else goHome();

      }

      const diffTxt=diff>0?`（+${diff} 個相冊）`:diff<0?`（-${Math.abs(diff)} 個相冊）`:`（共 ${S.albums.length} 個）`;

      toast('✓ 已更新 '+diffTxt,2000);

      modal.classList.remove('on');

    }catch(e){toast('⚠️ 更新失敗: '+e.message,3000);}

    finally{refreshBtn2.disabled=false;refreshBtn2.textContent='↻ 刷新相冊';}

  });



  $('transClose').addEventListener('click',()=>modal.classList.remove('on'));

  $('transCloseBtn2').addEventListener('click',()=>modal.classList.remove('on'));

  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('on');});



  // Tag Manager Modal close

  $('tagMgrClose').addEventListener('click',()=>TagManager.close());

  $('tagMgrModal').addEventListener('click',e=>{if(e.target===$('tagMgrModal'))TagManager.close();});



  $('btnTranslate').addEventListener('click',()=>{

    refreshCmd();

    modal.classList.add('on');

  });

})();



// ── 重新掃描文件夾（同步後台增刪改）────────────────────────────────────────

$('btnRefresh').addEventListener('click',async()=>{

  if(!S.rootDirHandle){ toast('請先開啟文件夾',2000); return; }

  const btn=$('btnRefresh');

  btn.disabled=true;btn.textContent='…';

  const prevCount=S.albums.length;

  try{

    // 清除舊的封面 Object URL，避免記憶體洩漏並確保圖片重新載入

    S.albums.forEach(a=>{ if(a.coverUrl){ URL.revokeObjectURL(a.coverUrl); a.coverUrl=null; } });

    S.albums=await readFolder(S.rootDirHandle);

    const diff=S.albums.length-prevCount;

    const diffTxt=diff>0?`（+${diff} 個相冊）`:diff<0?`（-${Math.abs(diff)} 個相冊）`:`（共 ${S.albums.length} 個，無變化）`;

    // 若有新相冊且標籤篩選中，清除篩選以確保新內容可見

    if(diff>0 && S.activeTags.size){

      S.activeTags.clear();

    }

    if(S.view==='home'){

      renderHome();

    } else if(S.view==='album'&&S.currentAlbum){

      const updated=S.albums.find(a=>a.name===S.currentAlbum.name);

      if(updated){ S.currentAlbum=updated; renderAlbumGrid(updated); }

      else goHome();

    }

    toast('✓ 已更新 '+diffTxt, diff===0?2500:1800);

  }catch(e){

    toast('⚠️ 更新失敗: '+e.message,3000);

  }finally{

    btn.disabled=false;btn.textContent='↻';

  }

});

btnMediaFilter.addEventListener('click',()=>{

  S.mediaFilter={all:'video',video:'photo',photo:'all'}[S.mediaFilter];

  updateMediaBtn();

  renderHome();

});



btnViewToggle.addEventListener('click',()=>{

  if(S.albumMode==='grid'){

    S.albumMode='feed';renderAlbum(S.currentAlbum);

  } else {

    S.albumMode='grid';renderAlbumGrid(S.currentAlbum);

  }

  updateGridBtn();

});



function buildAlbumHeader(alb){

  // 构建相册头部（feed 和 grid 共用）

  const savedMeta=store.getAlbum(alb.name);

  const hdrEl=document.createElement('div');hdrEl.className='albumMeta';



  const titleInp=document.createElement('input');

  titleInp.className='albumMetaTitle';titleInp.value=alb.title;titleInp.placeholder=t('albumTitle');

  titleInp.addEventListener('input',()=>{

    alb.title=titleInp.value;hdrTitle.textContent=titleInp.value;

    store.setAlbum(alb.name,{title:titleInp.value});scheduleWrite(alb);

  });



  const row=document.createElement('div');row.className='albumMetaRow';

  {

    const loc=document.createElement('div');loc.className='albumLocation';loc.style.flex='1';

    const pin=document.createElement('span');pin.textContent='📍';pin.style.flexShrink='0';

    const locInp=document.createElement('input');

    locInp.className='albumLocationInput';

    locInp.value=alb.location||'';

    locInp.placeholder=t('locationPh')||'添加地点…';

    locInp.addEventListener('input',()=>{

      const oldLoc=alb.location;

      const newLoc=locInp.value.trim();

      alb.location=newLoc;

      store.setAlbum(alb.name,{location:newLoc});

      if(applyLocationL2(alb,newLoc,oldLoc)) store.setAlbum(alb.name,{tags:alb.tags});

      scheduleWrite(alb);

    });

    loc.append(pin,locInp);row.appendChild(loc);

  }

  if(alb.likes!=null){

    const lk=document.createElement('span');lk.className='albumLikes';

    lk.textContent=`♥ ${fmtNum(alb.likes)}`;row.appendChild(lk);

  }

  if(alb.igUrl){

    const a=document.createElement('a');a.className='albumIgLink';

    a.href=alb.igUrl;a.target='_blank';

    a.textContent=alb.fromXHS?'↗ 查看小紅書原帖':t('igLink');

    row.appendChild(a);

  }

  {

    const fa=document.createElement('a');fa.className='albumIgLink';

    fa.href='#';fa.textContent=t('openDir');

    fa.addEventListener('click',e=>{e.preventDefault();openLocalFolder(alb);});

    row.appendChild(fa);

  }

  {

    const delA=document.createElement('a');delA.className='albumIgLink';

    delA.href='#';delA.style.color='#e74c3c';delA.textContent='🗑 刪除';

    delA.title='刪除此相冊文件夾（不可復原）';

    delA.addEventListener('click',e=>{

      e.preventDefault();

      // 進入批量模式選中此相冊後顯示確認

      showDeleteConfirm([alb.name]);

    });

    row.appendChild(delA);

  }



  const descTa=document.createElement('textarea');

  descTa.className='albumMetaDesc';descTa.placeholder=t('albumDesc');

  descTa.value=savedMeta.desc!==undefined?savedMeta.desc:(alb.desc||'');

  descTa.rows=1;

  descTa.addEventListener('input',()=>{

    ar(descTa);alb.desc=descTa.value;

    store.setAlbum(alb.name,{desc:descTa.value});scheduleWrite(alb);

  });



  const countEl=document.createElement('div');countEl.className='albumMetaCount';

  countEl.dataset.n=alb.photos.length;

  countEl.dataset.vc=alb.photos.filter(p=>p.isVideo).length;

  countEl.dataset.iv=alb.postMeta?.is_video?'1':'';

  countEl.dataset.fromIG=alb.fromIG?'1':'';

  const _sourceBadge=alb.fromXHS?' · 來自小紅書':alb.fromIG?' '+t('fromIGBadge'):'';

  countEl.textContent=mediaLabel(alb.photos,alb.postMeta)+_sourceBadge;



  hdrEl.append(titleInp);

  if(row.children.length) hdrEl.appendChild(row);

  hdrEl.append(descTa,countEl);

  setTimeout(()=>ar(descTa),0);

  return hdrEl;

}



function renderAlbumGrid(alb){

  const el=$('vAlbum'); el.innerHTML=''; el.scrollTop=0;

  el.appendChild(buildAlbumHeader(alb));

  renderTagEditor(alb, el);

  const currentCover=(alb.notesData?.coverPhoto)||null;

  const grid=document.createElement('div');

  grid.className='homeGrid';

  alb.photos.forEach((photo,idx)=>{

    const cell=document.createElement('div');

    cell.className='gridCellWrap';



    // ── 圖片包裝層（aspect-ratio:1，按鈕定位於此）──

    const imgWrap=document.createElement('div');

    imgWrap.className='gridImgWrap';



    if(photo.isVideo && !photo.poster){

      const img=document.createElement('img');

      img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;background:#111';

      const obs=new IntersectionObserver(e=>{

        if(e[0].isIntersecting){

          if(photo.thumbUrl){ img.src=photo.thumbUrl; obs.disconnect(); return; }

          if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

          const v=document.createElement('video');

          v.preload='metadata'; v.muted=true; v.playsInline=true; v.src=photo.url;

          const done=()=>{ try{ v.src=''; }catch{} };

          v.addEventListener('loadeddata',()=>{

            try{

              const c=document.createElement('canvas');

              c.width=Math.max(1,v.videoWidth||320);

              c.height=Math.max(1,v.videoHeight||180);

              const ctx=c.getContext('2d');

              if(ctx){

                ctx.drawImage(v,0,0,c.width,c.height);

                photo.thumbUrl=c.toDataURL('image/jpeg',0.82);

                img.src=photo.thumbUrl;

              }

            }catch{}

            done();

          },{once:true});

          v.addEventListener('error',done,{once:true});

          try{ v.currentTime=0.05; }catch{}

          obs.disconnect();

        }

      },{rootMargin:'200px'});

      obs.observe(img);

      imgWrap.appendChild(img);

    }else{

      const img=document.createElement('img');

      img.style.cssText='width:100%;height:100%;object-fit:cover;display:block';

      const obs=new IntersectionObserver(e=>{

        if(e[0].isIntersecting){

          const src=photo.isVideo&&photo.poster?photo.poster:photo;

          if(!src.url) src.url=safeCreateObjectURL(src.file);

          img.src=src.url;obs.disconnect();

        }

      },{rootMargin:'200px'});

      obs.observe(img);

      imgWrap.appendChild(img);

    }



    // 移动按钮

    const mvBtn=document.createElement('button');

    mvBtn.className='gridMoveBtn';mvBtn.textContent='↗';mvBtn.title=t('movePhoto')||'移动';

    mvBtn.addEventListener('click',e=>{e.stopPropagation();openMoveModal(alb,photo);});

    imgWrap.appendChild(mvBtn);



    // 封面選取按鈕

    const isCover=photo.name===currentCover;

    const cvBtn=document.createElement('button');

    cvBtn.className='coverPickBtn'+(isCover?' isCover':'');

    cvBtn.textContent=isCover?'📌 封面':'設為封面';

    cvBtn.title=isCover?'目前封面':'設定此圖為相冊封面';

    cvBtn.addEventListener('click',async e=>{

      e.stopPropagation();

      if(!alb.handle){toast('無法寫入（散圖模式）',2000);return;}

      const newCover=isCover?null:photo.name;

      try{

        alb.notesData=alb.notesData||{};

        if(newCover) alb.notesData.coverPhoto=newCover;

        else delete alb.notesData.coverPhoto;

        const fh=await alb.handle.getFileHandle('notes.json',{create:true});

        const w=await fh.createWritable();

        await w.write(JSON.stringify(alb.notesData,null,2));

        await w.close();

        const newCoverSrc=newCover

          ?alb.photos.find(p=>p.name===newCover)

          :(alb.firstImage||(alb.photos.find(p=>!p.isVideo))||alb.photos[0]);

        if(newCoverSrc){

          if(alb.coverUrl) URL.revokeObjectURL(alb.coverUrl);

          alb.coverUrl=safeCreateObjectURL(newCoverSrc.file);

        }

        toast(newCover?`📌 封面已設為 ${newCover}`:'封面已重置',1800);

        renderAlbumGrid(alb);

      }catch(err){toast('⚠️ 寫入失敗: '+err.message,3000);}

    });

    imgWrap.appendChild(cvBtn);



    cell.appendChild(imgWrap);



    // ── Caption 條 ──

    const capWrap=document.createElement('div');

    capWrap.className='gridCaptionWrap';



    const capEl=document.createElement('div');

    // 優先 notes.json per-photo，其次 localStorage，index 0 fallback 到相冊文案

    const ndCap=alb.notesData?.photos?.[photo.name];

    const savedCap=ndCap!==undefined?ndCap:store.getCaption(alb.name,photo.name);

    const capText=savedCap!==null?savedCap:(idx===0&&alb.desc?alb.desc:'');

    capEl.className='gridCaption'+(capText?'':' empty');

    capEl.textContent=capText||'';



    const capTA=document.createElement('textarea');

    capTA.className='gridCaptionTA';

    capTA.rows=2;

    capTA.placeholder='寫下備注…';



    const editBtn=document.createElement('button');

    editBtn.className='gridCaptionEditBtn';

    editBtn.textContent='✏';

    editBtn.title='編輯備注';



    function enterEdit(e){

      if(e) e.stopPropagation();

      capTA.value=capEl.textContent==='寫下備注…'?'':capEl.textContent;

      capEl.style.display='none';

      capTA.style.display='block';

      editBtn.style.opacity='0';

      capTA.focus();capTA.select();

    }

    function saveEdit(){

      const val=capTA.value;

      capEl.textContent=val;

      capEl.className='gridCaption'+(val?'':' empty');

      if(!val) capEl.textContent='';

      capTA.style.display='none';

      capEl.style.display='';

      editBtn.style.opacity='';

      // 同步更新 notesData + localStorage + notes.json

      alb.notesData=alb.notesData||{};

      alb.notesData.photos=alb.notesData.photos||{};

      alb.notesData.photos[photo.name]=val;

      store.setCaption(alb.name,photo.name,val);

      scheduleWrite(alb);

    }



    editBtn.addEventListener('click',enterEdit);

    capTA.addEventListener('blur',saveEdit);

    capTA.addEventListener('keydown',e=>{

      if(e.key==='Escape'){e.preventDefault();capTA.value=capEl.textContent;saveEdit();}

    });

    // 點 caption 文字區也進入編輯（不打開 LB）

    capEl.addEventListener('click',enterEdit);



    capWrap.appendChild(capEl);

    capWrap.appendChild(capTA);

    capWrap.appendChild(editBtn);

    cell.appendChild(capWrap);



    cell.addEventListener('click',e=>{

      // 若點擊來自 capWrap 內部則不開 LB

      if(capWrap.contains(e.target)) return;

      openLB(alb,idx);

    });

    grid.appendChild(cell);

  });

  el.appendChild(grid);

}



// 键盘 & 触控

document.addEventListener('keydown',e=>{

  if(S.view==='lb'){

    if(e.key==='ArrowLeft')lbMove(-1);

    if(e.key==='ArrowRight')lbMove(1);

    if(e.key==='Escape')closeLB();

  }

  if(S.view==='map'&&e.key==='Escape'){

    S.mapMode=false;$('btnMap').classList.remove('active');

    showView('home');renderHome();

  }

});

// 觸控滑動已移至 lbImgArea（覆蓋更大面積），見文件末 "Lightbox 手勢滑動" 區段



// ── Utils ─────────────────────────────────────────────────────────────────

function fmtDate(d){

  if(!d)return'';

  try{

    return new Intl.DateTimeFormat(LANGS[currentLang].locale,{

      year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'

    }).format(d);

  }catch{return d.toLocaleString();}

}

function fmtNum(n){

  if(n==null)return'';

  return n>=10000?(n/10000).toFixed(1)+'万':n.toLocaleString();

}

function esc(s){

  return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

}



// 💡 安全的 URL.createObjectURL 包裝器，防止當 File 對象為空/無效時拋出異常崩潰

function safeCreateObjectURL(file) {

  if (!file) return '';

  try {

    if (file instanceof Blob || file instanceof File) {

      return safeCreateObjectURL(file);

    }

  } catch (err) {

    console.error("safeCreateObjectURL failed:", err);

  }

  return '';

}

// 搜尋結果高亮（遞歸，支持多處命中）

function hlText(text,q){

  if(!q||!text) return esc(text||'');

  const i=text.toLowerCase().indexOf(q.toLowerCase());

  if(i===-1) return esc(text);

  return esc(text.slice(0,i))+

    `<mark style="background:rgba(255,210,0,.35);color:inherit;border-radius:2px">${esc(text.slice(i,i+q.length))}</mark>`+

    hlText(text.slice(i+q.length),q);

}

// 自動偵測 HTML 文件所在目錄（適配換電腦）

function getHtmlDir(){

  const href=window.location.href;

  if(!href.startsWith('file://')) return null;

  const full=decodeURIComponent(href.split('?')[0].split('#')[0]);

  let p=full.slice(0,full.lastIndexOf('/')).replace(/^file:\/\//,'');

  if(/^\/[A-Za-z]:\//.test(p)) p=p.slice(1); // Windows: /F:/Claude → F:/Claude

  return p;

}

function getPhotoPath(alb,photo){

  // 优先用 _path.txt（与 getFolderPath 保持一致）

  // _folderRelPath 处理分类子目录（如 【用户名】/2012-06-30_xxx），alb.name 仅作降级

  const rel=alb._folderRelPath!=null?alb._folderRelPath:alb.name;

  if(S.rootAbsPath){

    return alb.rootAlbum

      ? `${S.rootAbsPath}/${photo.name}`

      : `${S.rootAbsPath}/${rel}/${photo.name}`;

  }

  const saved=localStorage.getItem('ig-output-path');

  const htmlDir=getHtmlDir();

  const fallbackBase=htmlDir ? htmlDir+'/downloads' : '';

  const base=(saved||fallbackBase).trim().replace(/[/\\]+$/,'');

  if(!base) return null;

  const root=S.rootName||'';

  return alb.rootAlbum ? `${base}/${root}/${photo.name}` : `${base}/${root}/${rel}/${photo.name}`;

}

function getFolderPath(alb){

  // 优先用 _path.txt（Python 自动写入，最可靠）

  // _folderRelPath 处理分类子目录（如 【用户名】/2012-06-30_xxx），alb.name 仅作降级

  const rel=alb._folderRelPath!=null?alb._folderRelPath:alb.name;

  if(S.rootAbsPath){

    return alb.rootAlbum ? S.rootAbsPath : `${S.rootAbsPath}/${rel}`;

  }

  // 退回：手动设置的路径 或 HTML 同级 downloads 目录

  const saved=localStorage.getItem('ig-output-path');

  const htmlDir=getHtmlDir();

  const fallbackBase=htmlDir ? htmlDir+'/downloads' : '';

  const base=(saved||fallbackBase).trim().replace(/[/\\]+$/,'');

  if(!base) return null;

  const root=S.rootName||'';

  return alb.rootAlbum ? `${base}/${root}` : `${base}/${root}/${rel}`;

}

function requestOpenFolderViaServer(path){

  if(!path||!location.protocol.startsWith('http')) return Promise.resolve(false);

  return fetch('/__open_folder__',{

    method:'POST',

    headers:{'Content-Type':'application/json'},

    body:JSON.stringify({path})

  }).then(async res=>{

    let data={};

    try{data=await res.json();}catch{}

    if(res.ok&&data.ok){toast(t('explorerOpenOk')||'已打開資料夾',2200);return true;}

    throw new Error(data.error||'open_failed');

  }).catch(()=>false);

}



function openLocalFolder(alb){

  const path=getFolderPath(alb);

  if(!path){toast(t('pathUnknown'),2800);return;}

  const isWin=navigator.userAgent.includes('Windows');

  const finalPath=isWin?path.replace(/\//g,'\\'):path;

  requestOpenFolderViaServer(finalPath).then(ok=>{

    if(ok) return;

    let opened=false;

    try{

      const fileUrl=`file:///${finalPath.replace(/\\/g,'/')}`;

      const w=window.open(fileUrl,'_blank');

      opened=!!w;

    }catch{}

    if(opened){

      toast(t('explorerOpenOk')||'已打開資料夾',2200);

      return;

    }

    navigator.clipboard.writeText(finalPath).then(()=>toast(t('folderCopied'),3500)).catch(()=>{

      const inp=document.createElement('input');

      inp.style.cssText='position:fixed;top:-999px;opacity:0';

      inp.value=finalPath;document.body.appendChild(inp);inp.select();

      document.execCommand('copy');document.body.removeChild(inp);

      toast((t('explorerOpenFail')||'無法直接打開，已複製路徑'),3500);

    });

  });

}

function copyPhotoPath(alb,photo){

  const path=getPhotoPath(alb,photo);

  if(!path){toast(t('pathUnknown'),2800);return;}

  navigator.clipboard.writeText(path).then(()=>toast(t('pathCopied'))).catch(()=>{

    const inp=document.createElement('input');

    inp.style.cssText='position:fixed;top:-999px;opacity:0';

    inp.value=path;document.body.appendChild(inp);inp.select();

    document.execCommand('copy');document.body.removeChild(inp);

    toast(t('pathCopied'));

  });

}

function viewPhoto(alb,photo){

  if(!photo.url) photo.url=safeCreateObjectURL(photo.file);

  window.open(photo.url,'_blank');

}

function ar(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}



// ── Restore last folder (auto-restore on refresh) ────────────────────────

async function tryRestoreFolder(){

  try{

    const h=await idb.get('lastFolder');

    if(!h) return;



    // 顯示恢復畫面（立即替換 welcome，避免閃爍）

    $('rstFolderName').textContent=h.name;

    $('rstSub').textContent='正在恢復…';

    $('btnReopenConfirm').style.display='none';

    $('btnReopenCancel').style.display='none';

    showView('restore');

    $('btnRefresh').style.display='none';

    btnOpen.style.display='';



    // 先查詢現有權限（不觸發彈窗）

    let perm='prompt';

    try{ perm=await h.queryPermission({mode:'readwrite'}); }catch{}



    if(perm==='granted'){

      // 已有權限 → 直接靜默載入

      await doLoadFolder(h);

      return;

    }



    // 需要用戶點擊才能請求權限

    $('rstSub').textContent='需要點擊以確認存取權限';

    const btn=$('btnReopenConfirm');

    btn.textContent=`📂 重新開啟「${h.name}」`;

    btn.style.display='';

    $('btnReopenCancel').style.display='';



    btn.onclick=async()=>{

      btn.disabled=true;

      $('rstSub').textContent='正在恢復…';

      btn.style.display='none';

      $('btnReopenCancel').style.display='none';

      let p2='denied';

      try{ p2=await h.requestPermission({mode:'readwrite'}); }catch{}

      if(p2!=='granted'){

        idb.set('lastFolder',null).catch(()=>{});

        showView('welcome');

        toast('⚠️ 無法存取文件夾，請重新選擇',3000);

        return;

      }

      await doLoadFolder(h);

    };



    $('btnReopenCancel').onclick=()=>{

      idb.set('lastFolder',null).catch(()=>{});

      showView('welcome');

    };

  }catch{

    // 無儲存記錄，留在 welcome

  }

}



// ── Move Photo Modal ──────────────────────────────────────────────────────

let _moveCtx={alb:null,photo:null};



function openMoveModal(alb,photo){

  _moveCtx={alb,photo};

  $('moveModalTitle').textContent=t('moveModalTitle');

  $('moveCancelBtn').textContent=t('cancel')||'取消';

  $('moveSearch').value='';

  renderMoveList('');

  $('vMoveModal').classList.add('on');

  setTimeout(()=>$('moveSearch').focus(),80);

}



function renderMoveList(q){

  const list=$('moveAlbumList');

  list.innerHTML='';

  const lower=q.toLowerCase();

  const src=_moveCtx.alb;

  S.albums.forEach(alb=>{

    if(alb===src) return;          // 不显示当前相册

    if(alb.rootAlbum) return;      // 不显示「全部」虚拟相册

    const name=(alb.title||alb.name);

    if(lower&&!name.toLowerCase().includes(lower)) return;



    const item=document.createElement('div');

    item.className='moveAlbumItem';



    const thumb=document.createElement('div');

    thumb.className='moveAlbumThumb';

    if(alb.firstImage){

      const img=document.createElement('img');

      if(!alb.firstImage.url) alb.firstImage.url=safeCreateObjectURL(alb.firstImage.file);

      img.src=alb.firstImage.url;

      thumb.appendChild(img);

    } else {

      thumb.textContent='🖼️';

    }



    const info=document.createElement('div');

    info.style.cssText='flex:1;min-width:0';

    const nm=document.createElement('div');

    nm.className='moveAlbumName';nm.textContent=name;

    const sub=document.createElement('div');

    sub.className='moveAlbumSub';

    sub.textContent=`${alb.photos.length} ${t('photoCount')(alb.photos.length).replace(/^\d+\s*/,'')||'张'}`;

    info.append(nm,sub);

    item.append(thumb,info);



    item.addEventListener('click',async()=>{

      $('vMoveModal').classList.remove('on');

      await doMovePhoto(src,_moveCtx.photo,alb);

    });

    list.appendChild(item);

  });

  if(!list.firstChild){

    const empty=document.createElement('div');

    empty.style.cssText='padding:20px;text-align:center;color:var(--muted);font-size:13px';

    empty.textContent=t('noTagResult')||'无符合相册';

    list.appendChild(empty);

  }

}



async function doMovePhoto(srcAlb,photo,destAlb){

  try{

    // 1. 收集要移动的文件（视频+封面）

    const toMove=[];

    toMove.push(photo);

    if(photo.isVideo&&photo.poster) toMove.push(photo.poster);



    // 2. 写入目标目录（避免同名覆盖，自动加后缀）

    const resolveDestName=async(handle,name)=>{

      let base=name,ext='',dot=name.lastIndexOf('.');

      if(dot>0){base=name.slice(0,dot);ext=name.slice(dot);}

      let candidate=name,i=1;

      while(true){

        try{await handle.getFileHandle(candidate);candidate=`${base}_${i++}${ext}`;}

        catch{break;}

      }

      return candidate;

    };



    const destNames=[];

    for(const p of toMove){

      const buf=await p.file.arrayBuffer();

      const destName=await resolveDestName(destAlb.handle,p.name);

      const fh=await destAlb.handle.getFileHandle(destName,{create:true});

      const w=await fh.createWritable();

      await w.write(buf);await w.close();

      destNames.push(destName);

    }



    // 3. 从源目录删除

    for(const p of toMove){

      try{await srcAlb.handle.removeEntry(p.name);}catch{}

    }



    // 4. 更新目标相册 in-memory（追加 photo 对象，file 重新获取）

    // toMove[0] = 视频/图片本体；toMove[1]（如有）= 视频封面（poster）

    const mainFh=await destAlb.handle.getFileHandle(destNames[0]);

    const mainFile=await mainFh.getFile();

    const newPhoto={...photo,name:destNames[0],file:mainFile,url:null,poster:undefined};



    if(photo.isVideo&&photo.poster&&destNames[1]){

      // 封面也写入了目标目录，重建 poster 引用

      const covFh=await destAlb.handle.getFileHandle(destNames[1]);

      const covFile=await covFh.getFile();

      newPhoto.poster={...photo.poster,name:destNames[1],file:covFile,url:null};

    }



    destAlb.photos.push(newPhoto);

    if(!destAlb.firstImage&&!newPhoto.isVideo) destAlb.firstImage=newPhoto;

    if(!destAlb.coverUrl){

      const coverSrc=destAlb.firstImage||newPhoto;

      if(coverSrc) destAlb.coverUrl=safeCreateObjectURL(coverSrc.file);

    }



    // 5. 从源相册移除

    srcAlb.photos=srcAlb.photos.filter(p=>p!==photo);



    // 6. 重新渲染

    toast(t('moveDone')||'✓ 已移动',2000);

    if(srcAlb.photos.length===0){

      goHome();

    } else {

      // 如果在 lightbox 中，调整 idx

      if(S.view==='lb'){

        if(S.currentIdx>=srcAlb.photos.length) S.currentIdx=srcAlb.photos.length-1;

        renderLB();

      } else if(S.albumMode==='grid'){

        renderAlbumGrid(srcAlb);

      } else {

        renderAlbum(srcAlb);

      }

    }

  }catch(e){

    console.error(e);

    toast('⚠️ 移动失败: '+e.message,3000);

  }

}



$('moveSearch').addEventListener('input',e=>renderMoveList(e.target.value));

$('moveCancelBtn').addEventListener('click',()=>$('vMoveModal').classList.remove('on'));

$('vMoveModal').addEventListener('click',e=>{if(e.target===$('vMoveModal'))$('vMoveModal').classList.remove('on');});



// ── Init ──────────────────────────────────────────────────────────────────

buildLangSelector();

const _savedIgOutput=localStorage.getItem('ig-output-path');

if(_savedIgOutput) $('igOutput').value=_savedIgOutput;

else { const _d=getHtmlDir(); if(_d) $('igOutput').value=_d+'/downloads'; }

const _savedSid=localStorage.getItem('ig-session-id');

if(_savedSid) $('igSessionId').value=_savedSid;

applyLang();

renderCompatibilityStatus();

if(!window.showDirectoryPicker) $('compatNote').style.color='#ff4d4d';

// tryRestoreFolder() 已停用：瀏覽器刷新回到歡迎界面，用 ↻ 按鈕在 session 內同步



// ── 批量操作 ──────────────────────────────────────────────────────────────

function enterBatchMode(){

  S.batchMode=true;S.batchSelected.clear();

  document.body.classList.add('batch-mode');

  $('batchBar').classList.add('on');

  updateBatchBar();

}

function exitBatchMode(){

  S.batchMode=false;S.batchSelected.clear();

  document.body.classList.remove('batch-mode');

  $('batchBar').classList.remove('on');

  document.querySelectorAll('.albumCard.selected').forEach(c=>c.classList.remove('selected'));

}

function updateBatchBar(){

  $('batchCount').textContent=`已選 ${S.batchSelected.size} 個`;

}

function batchApply(fn){

  const albs=S.albums.filter(a=>S.batchSelected.has(a.name));

  albs.forEach(fn);

  toast(`✓ 已套用至 ${albs.length} 個相冊`,1800);

  exitBatchMode();

  renderHome();

}

$('batchAddTag').addEventListener('click',()=>{

  const tag=$('batchTagInp').value.trim();

  if(!tag){$('batchTagInp').focus();return;}

  batchApply(alb=>{if(!alb.tags?.includes(tag)){alb.tags=[...(alb.tags||[]),tag];store.setAlbum(alb.name,{tags:alb.tags});scheduleWrite(alb);}});

  $('batchTagInp').value='';

});

$('batchRemoveTag').addEventListener('click',()=>{

  const tag=$('batchTagInp').value.trim();

  if(!tag){$('batchTagInp').focus();return;}

  batchApply(alb=>{if(alb.tags?.includes(tag)){alb.tags=alb.tags.filter(t=>t!==tag);store.setAlbum(alb.name,{tags:alb.tags});scheduleWrite(alb);}});

  $('batchTagInp').value='';

});

$('batchFav').addEventListener('click',()=>batchApply(alb=>store.setFav(alb.name,true)));

$('batchUnfav').addEventListener('click',()=>batchApply(alb=>store.setFav(alb.name,false)));

$('batchSelectAll').addEventListener('click',()=>{

  getFilteredAlbums().forEach(a=>S.batchSelected.add(a.name));

  document.querySelectorAll('.albumCard').forEach(c=>c.classList.add('selected'));

  updateBatchBar();

});

$('batchExit').addEventListener('click',()=>{exitBatchMode();renderHome();});



// ── Metadata 備份 / 還原 ──────────────────────────────────────────────────

$('btnBackup').addEventListener('click',()=>{

  // 建立選單（備份 / 還原）

  const existing=$('backupMenu');

  if(existing){existing.remove();return;}

  const menu=document.createElement('div');

  menu.id='backupMenu';

  menu.style.cssText='position:fixed;top:50px;right:14px;background:var(--s1);border:1px solid var(--border);border-radius:10px;z-index:400;min-width:160px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.5)';

  const items=[

    {label:'⬇ 匯出備份',action:exportBackup},

    {label:'⬆ 匯入還原',action:()=>$('backupFileInp').click()},

  ];

  items.forEach(({label,action})=>{

    const btn=document.createElement('button');

    btn.textContent=label;

    btn.style.cssText='display:block;width:100%;padding:11px 16px;background:none;border:none;color:var(--text);font-size:13px;cursor:pointer;text-align:left;transition:background .12s';

    btn.onmouseenter=()=>btn.style.background='var(--s2)';

    btn.onmouseleave=()=>btn.style.background='';

    btn.addEventListener('click',()=>{menu.remove();action();});

    menu.appendChild(btn);

  });

  document.body.appendChild(menu);

  setTimeout(()=>document.addEventListener('click',function h(){menu.remove();document.removeEventListener('click',h);},{once:true}),10);

});



function exportBackup(){

  const backup={

    version:1,

    exportedAt:new Date().toISOString(),

    rootName:S.rootName||'',

    albums:JSON.parse(localStorage.getItem(STORE_KEY)||'{}'),

    favorites:JSON.parse(localStorage.getItem(FAV_KEY)||'{}'),

  };

  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});

  const a=document.createElement('a');

  a.href=safeCreateObjectURL(blob);

  const date=new Date().toISOString().slice(0,10);

  a.download=`local-ig-backup-${S.rootName||'all'}-${date}.json`;

  a.click();

  URL.revokeObjectURL(a.href);

  toast('✓ 備份已下載',2000);

}



// 隱藏的 file input 用於還原

const backupInp=document.createElement('input');

backupInp.type='file';backupInp.accept='.json';backupInp.id='backupFileInp';

backupInp.style.cssText='position:fixed;top:-999px';

document.body.appendChild(backupInp);

backupInp.addEventListener('change',()=>{

  const file=backupInp.files[0];

  if(!file) return;

  const reader=new FileReader();

  reader.onload=e=>{

    try{

      const backup=JSON.parse(e.target.result);

      if(!backup.version||!backup.albums) throw new Error('格式不符');

      // 合并而非覆蓋，避免誤刪新資料

      const cur=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');

      const merged={...backup.albums,...cur}; // 本地更新優先

      localStorage.setItem(STORE_KEY,JSON.stringify(merged));

      if(backup.favorites){

        const curFav=JSON.parse(localStorage.getItem(FAV_KEY)||'{}');

        localStorage.setItem(FAV_KEY,JSON.stringify({...backup.favorites,...curFav}));

      }

      toast(`✓ 還原完成（${Object.keys(backup.albums).length} 個相冊的資料）`,3000);

      if(S.view==='home') renderHome();

    }catch(err){toast('⚠️ 還原失敗：'+err.message,3000);}

    backupInp.value='';

  };

  reader.readAsText(file);

});



// ── 鍵盤快捷鍵 ────────────────────────────────────────────────────────────

document.addEventListener('keydown',e=>{

  // 任何輸入框/textarea 中不攔截（除了 Esc）

  const inInput=e.target.matches('input,textarea,select');



  // Esc：關閉所有 Modal，或從相冊/LB 返回

  if(e.key==='Escape'){

    if($('deleteConfirmOverlay').classList.contains('on')){$('deleteConfirmOverlay').classList.remove('on');return;}

    if($('tagMgrModal').classList.contains('on')){TagManager.close();return;}

    if($('igAddModal').classList.contains('on')){$('igAddModal').classList.remove('on');return;}

    if($('transModal').classList.contains('on')){$('transModal').classList.remove('on');return;}

    if($('vMoveModal').classList.contains('on')){$('vMoveModal').classList.remove('on');return;}

    if(S.view==='lb'){closeLB();return;}

    if(S.view==='album'){btnBack.click();return;}

    return;

  }



  if(inInput) return;



  // / 或 Ctrl+F：聚焦搜尋框

  if(e.key==='/'||((e.ctrlKey||e.metaKey)&&e.key==='f')){

    const inp=$('homeSearchInp');

    if(inp){e.preventDefault();inp.focus();inp.select();}

    return;

  }



  // r：重新掃描

  if(e.key==='r'||e.key==='R'){

    if(S.view==='home'||S.view==='album') $('btnRefresh').click();

    return;

  }



  // ← →：Lightbox 前後 / 相冊視圖切換相鄰相冊

  if(S.view==='lb'){

    if(e.key==='ArrowLeft') lbPrev.click();

    else if(e.key==='ArrowRight') lbNext.click();

    // Space：幻燈片 播放/暫停

    if(e.key===' '){e.preventDefault();$('lbSlideshow').click();}

  }

  if(S.view==='album'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){

    const list=getFilteredAlbums();

    const idx=list.findIndex(a=>a.name===S.currentAlbum?.name);

    if(idx===-1) return;

    const next=list[idx+(e.key==='ArrowLeft'?-1:1)];

    if(next) goAlbum(next);

  }

});



// ── Lightbox 全屏 ─────────────────────────────────────────────────────────

$('lbFullscreen').addEventListener('click',()=>{

  if(!document.fullscreenElement){

    $('vLB').requestFullscreen?.().catch(()=>{});

  } else {

    document.exitFullscreen?.().catch(()=>{});

  }

});

document.addEventListener('fullscreenchange',()=>{

  $('lbFullscreen').textContent=document.fullscreenElement?'✕ 退出全屏':'⛶';

  $('lbFullscreen').title=document.fullscreenElement?'退出全屏':'全屏';

});



// ── Lightbox 幻燈片 ───────────────────────────────────────────────────────

let _slideshowTimer=null;

function stopSlideshow(){

  if(_slideshowTimer){clearInterval(_slideshowTimer);_slideshowTimer=null;}

  $('lbSlideshow').textContent='▶';$('lbSlideshow').title='幻燈片（自動播放）';

}

$('lbSlideshow').addEventListener('click',()=>{

  if(_slideshowTimer){

    stopSlideshow();

  } else {

    $('lbSlideshow').textContent='⏸';$('lbSlideshow').title='暫停幻燈片';

    _slideshowTimer=setInterval(()=>{

      const alb=S.currentAlbum;

      if(!alb){stopSlideshow();return;}

      const n=S.currentIdx+1;

      if(n>=alb.photos.length){stopSlideshow();}

      else{lbMove(1);}

    },3500);

  }

});



// ── Lightbox 手勢滑動（覆蓋整個 lbImgArea）────────────────────────────────

{

  let _txStart=0,_tyStart=0;

  const area=document.querySelector('.lbImgArea');

  area.addEventListener('touchstart',e=>{

    _txStart=e.touches[0].clientX;

    _tyStart=e.touches[0].clientY;

  },{passive:true});

  area.addEventListener('touchend',e=>{

    const dx=e.changedTouches[0].clientX-_txStart;

    const dy=e.changedTouches[0].clientY-_tyStart;

    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>50){

      if(dx<0) lbMove(1); else lbMove(-1);

    }

  },{passive:true});

}





// ── 批量刪除相冊 ──────────────────────────────────────────────────────────

let _pendingDeleteNames=[];

function showDeleteConfirm(names){

  _pendingDeleteNames=names;

  $('deleteConfirmMsg').textContent=

    names.length===1

      ?`確定要刪除「${names[0]}」？`

      :`確定要刪除選中的 ${names.length} 個相冊？`;

  $('deleteConfirmOverlay').classList.add('on');

}

$('deleteCancelBtn').addEventListener('click',()=>$('deleteConfirmOverlay').classList.remove('on'));

$('deleteConfirmOverlay').addEventListener('click',e=>{

  if(e.target===$('deleteConfirmOverlay'))$('deleteConfirmOverlay').classList.remove('on');

});

$('deleteOkBtn').addEventListener('click',async()=>{

  $('deleteConfirmOverlay').classList.remove('on');

  const names=[..._pendingDeleteNames];

  _pendingDeleteNames=[];

  if(!S.rootDirHandle){toast('請先開啟文件夾',2000);return;}

  let ok=0,fail=0;

  for(const name of names){

    try{

      await S.rootDirHandle.removeEntry(name,{recursive:true});

      S.albums=S.albums.filter(a=>a.name!==name);

      // 清理 localStorage 殘留

      const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');

      delete raw[name];

      localStorage.setItem(STORE_KEY,JSON.stringify(raw));

      const fav=JSON.parse(localStorage.getItem(FAV_KEY)||'{}');

      delete fav[name];

      localStorage.setItem(FAV_KEY,JSON.stringify(fav));

      ok++;

    }catch(e){

      fail++;

      console.warn('刪除失敗:',name,e);

    }

  }

  exitBatchMode();

  if(S.view==='home') renderHome();

  else if(S.view==='album') goHome();

  const msg=fail?`✓ 刪除 ${ok} 個，失敗 ${fail} 個`:`✓ 已刪除 ${ok} 個相冊`;

  toast(msg,2500);

});

$('batchDelete').addEventListener('click',()=>{

  if(S.batchSelected.size===0){toast('請先選擇相冊',1800);return;}

  showDeleteConfirm([...S.batchSelected]);

});



// ─────────────────────────────────────────────────────────────────────────────
// 🔬 開始 Debug 驗證測試
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n=== 🧪 開始執行標籤邏輯真實執行 Debug 驗證 ===\n");

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
console.log("\n【2. 物理標籤識別器驗證 (isFolderRelatedTag)】");
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
  console.log(`-> 標籤 "${tc.tag}" | 預期是物理: ${tc.expected} | 實際: ${result} -> ${ok ? '✅ 通過' : '❌ 失敗'}`);
});
console.log("-> 物理標籤識別器總體驗證:", isFolderRelatedSuccess ? "✅ 完美通過" : "❌ 存在錯誤");

// 3. 驗證 setPrimaryFolderCategoryTag 髒數據清洗邏輯
console.log("\n【3. 標籤設置與髒數據清洗驗證】");
const mockAlbum = {
  name: 'test_album',
  tags: ['未分类', '行', '未分类/行', '行/行-航班', '未分类/行/行-航班', '行-航班', '未分类/行-航班', '自拍', '亞洲']
};

console.log("-> 清滑前的原始 tags:", JSON.stringify(mockAlbum.tags));

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
console.log("-> 是否寫入新規範標籤 [行/航班]:", nextTags.includes('行/航班') ? "✅ 成功" : "❌ 失敗");

// 4. 驗證首頁配置同步 (getEffectiveHierarchy)
console.log("\n【4. 首頁配置與推薦大類同步驗證】");
const hierarchy = getEffectiveHierarchy();
const hierarchyL1s = hierarchy.map(g => tagName(g.l1));
console.log("-> 屬性 L1 列表是否包含自定義推薦 '📸 角度':", hierarchyL1s.includes('📸 角度') ? "✅ 成功" : "❌ 失敗");
console.log("-> 屬性 L1 列表是否包含自定義推薦 '😍 愛好':", hierarchyL1s.includes('😍 愛好') ? "✅ 成功" : "❌ 失敗");
console.log("-> 屬性 L1 列表是否包含自定義推薦 '🎉 節日':", hierarchyL1s.includes('🎉 節日') ? "✅ 成功" : "❌ 失敗");

console.log("\n=== 🏁 Debug 驗證執行完畢 ===\n");
