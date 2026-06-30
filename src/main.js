const navRoutes = ['home', 'wait', 'survey', 'katsuo', 'market', 'tower', 'rental'];
const routes = [...navRoutes, 'reserve'];

const routeMeta = {
  home: { label: 'ホーム', icon: '🏠', subtitle: '大正町市場で、待つ時間も旅の思い出に。' },
  wait: { label: '待ち時間', icon: '⏱️', subtitle: '今の待ち時間に合わせて、おすすめを選べます。' },
  survey: { label: 'アンケート', icon: '🎮', subtitle: '旅の声を、ゲーム感覚で気軽に残せます。' },
  katsuo: { label: '豆知識', icon: '🐟', subtitle: '食べる前に読む、久礼のカツオ小話。' },
  market: { label: '市場', icon: '🏮', subtitle: '市場の楽しみ方を短く紹介します。' },
  tower: { label: '防災', icon: '🌊', subtitle: '海のまちで知っておきたい防災の目印。' },
  rental: { label: '車いす', icon: '♿', subtitle: '車いすの貸し出し予約と返却タイマー。' },
  reserve: { label: '研修室', icon: '📅', subtitle: '2階研修室の空きを見て、その場で予約できます。' },
};


const audioGuides = {
  home: {
    id: 'audio-home-intro',
    title: '久礼の待ち時間ガイド 音声版',
    duration: '約1分',
    description: 'アプリの使い方と、待ち時間を楽しむコツを音声で案内する想定です。',
    status: '準備中',
    sources: {
      mp3: '',
      spotify: '',
      substack: '',
    },
  },
  wait: {
    id: 'audio-wait-plan',
    title: '待ち時間別おすすめ案内',
    duration: '約2分',
    description: '5分・10分・20分・30分以上の過ごし方を、歩きながら聞ける構成にします。',
    status: '準備中',
    sources: {
      mp3: '',
      spotify: '',
      substack: '',
    },
  },
  katsuo: {
    id: 'audio-katsuo-story',
    title: '久礼のカツオ豆知識 音声ガイド',
    duration: '約3分',
    description: '一本釣り、たたき、旬の違いを食事前に聞ける短い音声として追加予定です。',
    status: '準備中',
    sources: {
      mp3: '',
      spotify: '',
      substack: '',
    },
  },
  market: {
    id: 'audio-market-walk',
    title: '大正町市場 ミニ散策音声',
    duration: '約3分',
    description: '市場の雰囲気、楽しみ方、マナーを歩きながら聞ける音声にします。',
    status: '準備中',
    sources: {
      mp3: '',
      spotify: '',
      substack: '',
    },
  },
  tower: {
    id: 'audio-tower-safety',
    title: '防災タワーと避難の音声案内',
    duration: '約2分',
    description: '観光中にも確認しやすい避難の考え方を、落ち着いた音声で伝える想定です。',
    status: '準備中',
    sources: {
      mp3: '',
      spotify: '',
      substack: '',
    },
  },
};


const APP_URL = 'https://hitomikkusu-design.github.io/kure-katsuo-guide/';
const APP_QR_SRC = 'qr-kure-katsuo-guide.svg';
const SUBSTACK_URL = 'https://substack.com/@taishomachi';
const SURVEY_STORAGE_KEY = 'kure-katsuo-guide-survey-responses';
// アンケート・車いす・会議室予約、すべて kureomiyasan の同じApps Script
// （＝同じスプレッドシート「久礼大正町予約アプリ」）へ送信し、formType で振り分けます。
// 旧 hitomikkusu 側エンドポイント（参考・未使用）:
//   https://script.google.com/macros/s/AKfycbziyW9dgy3m0-BsTKBm7uEHVNJLRCFsYibsBX5HfJRm7JQsJlbsBYL1FFoO-h9SHGcC/exec
const SURVEY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzLI-UOEdOpb5L8FWrrEBALXthbA7S7v2gbhqe7DYWTf73IgIgRCZFZLunUjP_ERf78nw/exec';

// 車いす予約は同じApps Scriptに送信し、formType で振り分けます。
const RENTAL_ENDPOINT = SURVEY_ENDPOINT;
const RENTAL_STORAGE_KEY = 'kure-katsuo-guide-rental-active';
const rentalDurations = [
  { label: 'テスト1分', minutes: 1 },
  { label: '30分', minutes: 30 },
  { label: '1時間', minutes: 60 },
  { label: '2時間', minutes: 120 },
  { label: '3時間', minutes: 180 },
];

// 2階研修室の予約も同じ kureomiyasan のApps Scriptへ（formType:'reservation' で振り分け）。
const RESERVE_ENDPOINT = SURVEY_ENDPOINT;
const RESERVE_STORAGE_KEY = 'kure-katsuo-guide-reservations';
const ROOM_NAME = '2階研修室';
const RESERVE_OPEN_HOUR = 9; // 受付開始（時）
const RESERVE_CLOSE_HOUR = 20; // 受付終了（時）= 午後8時（ぜよぴあ規約）
const reserveDurations = [
  { label: '1時間', hours: 1 },
  { label: '2時間', hours: 2 },
  { label: '3時間', hours: 3 },
];

// 利用者区分と1時間あたりの料金（ぜよぴあ利用規約 令和8年5月版）。
const reserveCategories = [
  { id: 'kyoryokutai', label: '大正町協力隊', rate: 0 },
  { id: 'taishocho', label: '大正町の方', rate: 500 },
  { id: 'kyoryoku-other', label: 'その他協力隊・町内の方', rate: 500 },
  { id: 'gaibu', label: '町外の方', rate: 1000 },
];

// 振込先（前払い）。利用料が発生する区分では、予約完了画面でこの案内を表示します。
const BANK_INFO = {
  bankName: '高知信用金庫',
  branch: '久礼支店',
  type: '普通',
  number: '0191657',
  holder: '久礼お宮さん通り商店街組合',
  deadlineText: '利用日の前日まで',
  note: '振込手数料はご負担ください。入金確認をもって予約確定となります。当日予約は不可（事務局へお電話ください）。',
};

const surveyQuestions = [
  {
    id: 'origin',
    label: 'どっから来たがぜ？',
    shortLabel: '出発地',
    icon: '📍',
    prompt: 'どっから久礼に来たがぜ？',
    type: 'chips',
    options: ['高知県内', '四国から', '関西から', '中国地方から', '関東から', '九州から', '海外から'],
    placeholder: '市町村名や都道府県など',
    marketing: '来訪者エリアを把握して、PRする地域や交通案内づくりに活用できます。',
  },
  {
    id: 'reason',
    label: 'なんで久礼に来たがぞ？',
    shortLabel: '来訪理由',
    icon: '✨',
    prompt: '久礼に来ようと思ったきっかけは何がぞ？',
    type: 'chips',
    options: ['カツオを食べたい', '大正町市場に来たい', 'SNSで見た', '家族・友人のおすすめ', 'ドライブ・旅行中', '防災・まち歩きに関心', 'なんとなく気になった'],
    placeholder: 'きっかけをひとこと',
    marketing: '来訪動機を知ることで、刺さる発信テーマを見つけやすくなります。',
  },
  {
    id: 'food',
    label: 'なにを食べたがえ？まだかえ？',
    shortLabel: '食体験',
    icon: '🐟',
    prompt: '食べたもの、または今か今かと待ちゆうお店・メニューは？',
    type: 'chips',
    options: ['カツオのたたき', '刺身・丼', '定食', '市場で買い物', 'スイーツ・飲み物', 'これから決める'],
    placeholder: 'お店名・メニュー名など',
    marketing: '人気メニューや待ち時間中の関心を把握できます。',
  },
  {
    id: 'discovery',
    label: '久礼を何で知ったがぞ？',
    shortLabel: '認知経路',
    icon: '📣',
    prompt: '久礼やこのお店・市場を何で知ったがぞ？',
    type: 'chips',
    options: ['Instagram', 'X', 'TikTok', 'YouTube', 'Google検索・マップ', 'テレビ・雑誌', '観光サイト', '口コミ'],
    placeholder: '見た投稿・番組・サイトなど',
    marketing: 'マーケティングで重要な認知経路を測れます。',
  },
  {
    id: 'visitStyle',
    label: 'だれと来たがぞね？',
    shortLabel: '旅の形',
    icon: '👥',
    prompt: '今日はだれと来たがぞね？',
    type: 'chips',
    options: ['ひとり旅', '友人と', 'カップル・夫婦', '家族で', '団体・ツアー', '仕事・視察'],
    placeholder: '人数や旅のスタイルなど',
    marketing: '客層ごとの体験設計やキャンペーンづくりに役立ちます。',
  },
  {
    id: 'sentiment',
    label: '今日の久礼、どうやった？',
    shortLabel: '満足度',
    icon: '❤️',
    prompt: '今日の久礼、どうやった？気分を選んでや！',
    type: 'rating',
    options: ['😌 のんびり', '😋 おいしい', '😍 最高', '📸 シェアしたい', '🔁 また来たい'],
    placeholder: '感想をひとこと',
    marketing: '満足度やSNS投稿意向、再訪意向を軽く測れます。',
  },
  {
    id: 'request',
    label: 'もっとこんなんあったらえいに！',
    shortLabel: '要望',
    icon: '💡',
    prompt: 'もっとこんなんあったらえいに、ゆうことあるかえ？',
    type: 'chips',
    options: ['待ち時間が知りたい', '混雑予報がほしい', 'おすすめ順路がほしい', '駐車場情報がほしい', '子連れ情報がほしい', '多言語案内がほしい', 'クーポンがほしい'],
    placeholder: '要望や困ったことなど',
    marketing: '次に作るべき機能や改善テーマの優先順位を決めやすくなります。',
  },
];

const waitGuides = [
  {
    minutes: '5分',
    title: '食べる前の小ネタを読む',
    description: '席に呼ばれる前に、久礼のカツオをもっと楽しむための豆知識を一つだけ。',
    actions: [{ label: 'カツオ豆知識へ', route: 'katsuo' }],
  },
  {
    minutes: '10分',
    title: '市場の見どころを確認',
    description: '大正町市場の雰囲気や楽しみ方を知って、短い待ち時間も散策気分に。',
    actions: [
      { label: '市場紹介を見る', route: 'market' },
      { label: '豆知識も読む', route: 'katsuo' },
    ],
  },
  {
    minutes: '20分',
    title: '久礼のまちを少し知る',
    description: 'カツオ、商店街、港町の暮らしを軽く予習。食事の時間がより印象的になります。',
    actions: [
      { label: 'カツオ豆知識へ', route: 'katsuo' },
      { label: '市場紹介へ', route: 'market' },
    ],
  },
  {
    minutes: '30分以上',
    title: '防災タワーまで意識を広げる',
    description: '海のそばの町を楽しむなら、防災の視点も大切。観光中に知っておきたい備えを紹介します。',
    actions: [
      { label: '防災タワー紹介へ', route: 'tower' },
      { label: '市場紹介へ', route: 'market' },
    ],
  },
];

const katsuoFacts = [
  {
    badge: '歴史',
    title: '400年続く一本釣りのまち',
    lead: '久礼でのカツオ一本釣りは、400年以上の歴史を持ちます。',
    body: '室町時代後期から続くとされる久礼の一本釣り漁。竿一本で魚を引き上げるこの漁法は魚体を傷つけにくく、鮮度抜群の刺身が楽しめます。藁焼きたたきは家庭料理とも言えるほど高知の食卓に根付いており、高知の人々は楽しみながらたたきを振る舞います。今も現役の漁師たちが受け継ぐ、久礼の誇りです。',
  },
  {
    badge: '文化',
    title: '市場入口に並ぶ8体のお地蔵さん',
    lead: '大正町市場の入口には、8体のお地蔵さんが静かに並んでいます。',
    body: '女性と子供を守るお地蔵さんとして古くから信仰されてきた8体のお地蔵さん。妊娠したら安産を祈願しに来る女性も多く、子供の健やかな成長を願う地域の人々に大切にされてきました。お賽銭が100万円貯まった時、お地蔵さんを守る3人のおばあさんそれぞれの枕元に、ある夜お地蔵さんが立ち「屋根はいらん。子ども達に使ってあげなさい」と同じお告げをしたといいます。そこで久礼小学校と中学校に50万円ずつ寄付されました。寄付を伝えに3人のおばあさんが久礼小学校の坂を上ってきた時、大きな石の音がしました。何事かと校長先生が覗きに行くと、3人のおばあさんが入ってきたのです。校長先生はその音にひどく驚いたといいます。お地蔵さんも一緒についてきていたのかもしれません。地域の子供たちへの深い愛情が、今も語り継がれています。',
  },
  {
    badge: '文化',
    title: 'ふるさと海岸の青柳裕介銅像',
    lead: '久礼のふるさと海岸には、青柳裕介さんの銅像が建っています。',
    body: '「土佐の一本釣り」で久礼の漁師の暮らしとカツオ一本釣りの魂を全国に伝えた漫画家・青柳裕介さん。その功績をたたえ、ふるさと海岸に銅像が建てられました。久礼を訪れたらぜひ立ち寄ってみてください。',
  },
  {
    badge: '伝説',
    title: '双名島（土佐十景）',
    lead: '久礼湾に浮かぶ弁天島と観音島、2つ合わせて「双名島」と呼びます。',
    body: '昔、久礼の浦は台風のたびに大波が押し寄せる浦でした。見かねた鬼の親子が大きな岩を運んで島をつくり、「双名島」になったという伝説があります。鬼が金棒を刺したといわれる穴も実際に残っています。久礼の漁師たちにとって双名島は海の守り神として祀られ、漁に出るときは安全と大漁を祈願する大切な場所です。',
  },
  {
    badge: '由来',
    title: '「地蔵町商店街」から「大正町市場」へ',
    lead: '今の「大正町市場」は、もとは「地蔵町商店街」という名前でした。',
    body: '大正町市場の始まりは明治時代。漁師のおばあちゃんたちが魚を売り出したのがきっかけでした。大正4年、市場周辺で大火事が起き、230戸が焼失しました。そのとき、大正天皇から復興費として350円のお金が届けられました。町民はこれに深く感激し、それまでの「地蔵通り」を改めて「大正町」と命名。大正天皇への感謝の気持ちが、この市場の名前に今も刻まれています。',
  },
  {
    badge: '栄養',
    title: 'カツオは栄養の宝庫',
    lead: '高タンパク・低脂肪で、鉄分やビタミンB12も豊富です。',
    body: '100gあたりのタンパク質は約25g。鉄分はほうれん草の約1.5倍、ビタミンB12は貧血予防にも効果的です。低カロリーで筋肉や血液づくりを助ける栄養素がそろっており、アスリートや健康志向の方からも注目されています。',
  },
  {
    badge: '部位',
    title: 'ハランボ一串でタンパク質25g',
    lead: 'ハランボはカツオのお腹側、脂のりが豊かな部位です。',
    body: 'カツオの腹身「ハランボ」は、程よく脂がのり濃厚な旨味が特徴。一串（約100g）食べればタンパク質25gが摂れます。市場で焼いた串を片手に歩ける久礼スタイルは、カロリーを気にせず楽しめる最高のおやつです。',
  },
  {
    badge: '珍味',
    title: 'めじかのしんことは？',
    lead: '「めじかのしんこ」は土佐を代表する高級珍味です。',
    body: 'めじか（ヤマトソウダガツオ）の稚魚を塩辛にしたもの。その濃厚な旨味と独特の風味は「土佐の三大珍味」のひとつとも称されます。ご飯のお供や酒の肴として古くから愛されており、市場で見かけたらぜひ試してみてください。',
  },
  {
    badge: '安心',
    title: 'カツオは妊婦さんにも安心な魚',
    lead: 'カツオは高速回遊魚で、水銀蓄積の心配がほとんどありません。',
    body: 'マグロなど大型魚は食物連鎖の上位にいるため水銀が蓄積しやすいですが、カツオは成長が早く寿命が短いため体内に水銀がたまりにくいのが特徴。厚生労働省も妊婦の摂取制限対象外としており、栄養豊富なカツオを安心して食べられます。',
  },
];

const marketGuides = [
  {
    badge: '概要',
    title: '大正町市場とは',
    lead: '久礼の食と暮らしが近くに感じられる市場です。',
    body: '鮮魚、食事、買い物、地元の会話がぎゅっと集まる場所です。観光地でありながら、地域の日常にも触れられるのが魅力です。',
  },
  {
    badge: '過ごし方',
    title: '待ち時間は小さく一周',
    lead: '長く歩かなくても、市場の雰囲気を味わえます。',
    body: '店先を眺めたり、今日の魚を見たり、周辺の路地に目を向けたり。短い待ち時間でも、久礼らしさを発見できます。',
  },
  {
    badge: 'マナー',
    title: '市場を気持ちよく楽しむために',
    lead: '混雑時は譲り合いとお店への配慮を。',
    body: '通路では立ち止まりすぎず、写真撮影は周囲とお店の迷惑にならないようにしましょう。ゴミは決められた場所へ。',
  },
];

const towerGuides = [
  {
    badge: '防災',
    title: '八千代タワーと純平タワー',
    lead: '久礼には2つの防災タワーがあり、それぞれ愛称があります。',
    body: '「八千代タワー」と「純平タワー」は、久礼を舞台にした漫画「土佐の一本釣り」の登場人物に由来しています。この漫画を描いたのは高知出身の漫画家・青柳裕介さん。主人公の青野純平とヒロインの八千代の名前が、地域の大切な防災施設に刻まれています。',
  },
  {
    badge: '観光客向け',
    title: '到着したら避難方向を確認',
    lead: '楽しむ前に、まず安全の目印を一つ覚えておきましょう。',
    body: '市場周辺では、避難場所や避難経路の表示を確認しておくと安心です。地震を感じたら、海を見に行かず、周囲の案内に従って避難してください。',
  },
  {
    badge: '注意',
    title: '正確な情報は公式案内で確認',
    lead: 'このガイドは観光中の気づきを助ける補助情報です。',
    body: '災害時の避難情報や施設情報は、自治体や現地表示などの公式情報を必ず確認してください。',
  },
];

function getRoute() {
  const route = window.location.hash.replace('#/', '') || 'home';
  return routes.includes(route) ? route : 'home';
}

function navigate(route) {
  window.location.hash = route === 'home' ? '#/' : `#/${route}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function button(label, route, variant = 'primary') {
  return `<button class="button button--${variant}" data-route="${route}" type="button">${label}</button>`;
}

function sectionTitle(eyebrow, title, description) {
  return `
    <div class="section-title">
      <p class="section-title__eyebrow">${eyebrow}</p>
      <h2>${title}</h2>
      <p>${description}</p>
    </div>
  `;
}

function waitCard(option) {
  return `
    <article class="wait-card">
      <div>
        <span class="wait-card__minutes">${option.minutes}</span>
        <h3>${option.title}</h3>
        <p>${option.description}</p>
      </div>
      <div class="wait-card__actions">
        ${option.actions.map((action) => button(action.label, action.route, 'secondary')).join('')}
      </div>
    </article>
  `;
}

function guideCard(article) {
  return `
    <article class="guide-card">
      <span class="badge">${article.badge}</span>
      <h3>${article.title}</h3>
      <p class="guide-card__lead">${article.lead}</p>
      <p>${article.body}</p>
    </article>
  `;
}

function infoCard(title, body, tone = 'sea') {
  return `
    <section class="info-card info-card--${tone}">
      <h3>${title}</h3>
      <p>${body}</p>
    </section>
  `;
}

function appQrCard(placement = 'page') {
  return `
    <section class="app-qr-card app-qr-card--${placement}" aria-labelledby="app-qr-card-title" data-pr3-feature="app-qr">
      <div class="app-qr-card__body">
        <div>
          <p class="app-qr-card__eyebrow">KURE KATSUO GUIDE QR</p>
          <h3 id="app-qr-card-title">このアプリを開くQRコード</h3>
          <p>このQRはアプリの公開URLを開きます。アプリの中身を更新してもURLが同じなら、印刷済みのQRコードはそのまま使えます。</p>
          <p class="app-qr-card__url">${APP_URL}</p>
        </div>
        <img class="app-qr-card__qr" src="${APP_QR_SRC}" alt="久礼カツオ待ち時間ガイドを開くQRコード" width="148" height="148" loading="lazy" />
      </div>
      <div class="app-qr-card__actions">
        <a class="button button--app" href="${APP_URL}" target="_blank" rel="noopener noreferrer">アプリを開く</a>
        <a class="button button--substack" href="${SUBSTACK_URL}" target="_blank" rel="noopener noreferrer">Substackを開く</a>
      </div>
    </section>
  `;
}

function surveyPreviewCard() {
  const previewItems = surveyQuestions.map((question) => `<li><span>${question.icon}</span><strong>${question.label}</strong><small>${question.prompt}</small></li>`).join('');

  return `
    <section class="survey-preview-card" aria-labelledby="survey-preview-title" data-pr3-feature="survey-preview">
      <p class="survey-preview-card__eyebrow">VOICE QUEST</p>
      <h3 id="survey-preview-title">アンケート内容はここに入っています</h3>
      <p>来訪理由だけでなく、SNS・マーケティング施策に使いやすい認知経路、同行者、満足度、欲しい情報までまとめて集めます。設問一覧はホーム画面でも確認できます。</p>
      <ol class="survey-preview-card__list">${previewItems}</ol>
      ${button('アンケートに答える', 'survey', 'primary')}
    </section>
  `;
}

function substackLinkCard(placement = 'page') {
  return `
    <section class="substack-link-card substack-link-card--${placement}" aria-labelledby="substack-link-title" data-pr3-feature="substack-link">
      <p class="substack-link-card__eyebrow">TAISHOMACHI SUBSTACK</p>
      <h3 id="substack-link-title">大正町市場のSubstackはこちら</h3>
      <p>大正町市場・久礼の発信は、表示中のURLまたは下のボタンからSubstackで開けます。</p>
      <p class="substack-link-card__url" aria-label="Substack URL">${SUBSTACK_URL}</p>
      <a class="button button--substack" href="${SUBSTACK_URL}" target="_blank" rel="noopener noreferrer">Substackを開く</a>
    </section>
  `;
}

function hasAudioSource(guide) {
  return Boolean(guide.sources.mp3 || guide.sources.spotify || guide.sources.substack);
}

function audioEmbed(guide) {
  if (guide.sources.mp3) {
    return `<audio class="audio-embed" controls preload="none" src="${guide.sources.mp3}"></audio>`;
  }

  if (guide.sources.spotify) {
    return `
      <iframe
        class="audio-embed audio-embed--frame"
        title="${guide.title} Spotify埋め込み"
        src="${guide.sources.spotify}"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      ></iframe>
    `;
  }

  if (guide.sources.substack) {
    return `
      <iframe
        class="audio-embed audio-embed--frame"
        title="${guide.title} Substack音声埋め込み"
        src="${guide.sources.substack}"
        loading="lazy"
      ></iframe>
    `;
  }

  return `
    <div class="audio-placeholder" aria-label="音声ガイド準備中">
      <span aria-hidden="true">🎧</span>
      <p>MP3 / Spotify / Substack のURLを設定すると、ここにプレーヤーを表示できます。</p>
    </div>
  `;
}

function audioGuideCard(route, placement = 'page') {
  const guide = audioGuides[route];
  const playable = hasAudioSource(guide);

  return `
    <section class="audio-guide audio-guide--${placement}" aria-labelledby="${guide.id}-title">
      <div class="audio-guide__header">
        <span class="audio-guide__icon" aria-hidden="true">▶︎</span>
        <div>
          <p class="audio-guide__eyebrow">将来の重要機能：音声ガイド</p>
          <h3 id="${guide.id}-title">${guide.title}</h3>
        </div>
      </div>
      <p>${guide.description}</p>
      <div class="audio-guide__meta">
        <span>${guide.duration}</span>
        <span>${guide.status}</span>
      </div>
      <button class="audio-play-button" data-audio-id="${guide.id}" ${playable ? '' : 'aria-disabled="true"'} type="button">
        ${playable ? '音声を再生する' : '音声準備中（再生ボタン枠）'}
      </button>
      <details class="audio-guide__details">
        <summary>埋め込み対応の設計を見る</summary>
        <ul>
          <li>MP3: <code>sources.mp3</code> に音声ファイルURLを設定</li>
          <li>Spotify: <code>sources.spotify</code> に埋め込みURLを設定</li>
          <li>Substack: <code>sources.substack</code> に音声投稿の埋め込みURLを設定</li>
        </ul>
      </details>
      ${audioEmbed(guide)}
    </section>
  `;
}


function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getStoredSurveyResponses() {
  try {
    return JSON.parse(window.localStorage.getItem(SURVEY_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSurveyResponse(response) {
  const responses = getStoredSurveyResponses();
  responses.unshift(response);
  window.localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(responses.slice(0, 20)));
}

function surveyQuestionCard(question, index) {
  const optionClass = question.type === 'rating' ? 'survey-options survey-options--emoji' : 'survey-options';

  return `
    <fieldset class="survey-question" data-survey-question="${question.id}">
      <legend>
        <span class="survey-question__number">${index + 1}</span>
        <span class="survey-question__icon" aria-hidden="true">${question.icon}</span>
        <span>${question.prompt}</span>
      </legend>
      <div class="${optionClass}">
        ${question.options
          .map(
            (option) => `
              <label class="survey-chip">
                <input type="checkbox" name="${question.id}" value="${option}" />
                <span>${option}</span>
              </label>
            `,
          )
          .join('')}
      </div>
      <label class="survey-free-text">
        <span>${question.label}をひとこと追加</span>
        <input name="${question.id}Text" type="text" maxlength="80" placeholder="${question.placeholder}" />
      </label>
      <p class="survey-marketing-note">${question.marketing}</p>
    </fieldset>
  `;
}

function surveyPage() {
  const savedCount = getStoredSurveyResponses().length;

  return `
    <div class="stack">
      <section class="survey-hero">
        <p class="hero__eyebrow">KURE VOICE QUEST</p>
        <h2>久礼のこと、教えてや！</h2>
        <p>タップするだけで約1分！答えたら「旅メモカード」ができるき、ぜひやってみてや。</p>
        <div class="survey-stats" aria-label="アンケートの特徴">
          <span>🎮 7クエスト</span>
          <span>⭐ 最大700pt</span>
          <span>📱 端末に保存</span>
        </div>
      </section>

      <form class="survey-form" id="survey-form">
        <div class="survey-progress" aria-live="polite">
          <div>
            <span class="survey-progress__label">達成度</span>
            <strong id="survey-progress-text">0 / ${surveyQuestions.length} クエスト</strong>
          </div>
          <div class="survey-progress__track" aria-hidden="true"><span id="survey-progress-bar"></span></div>
        </div>

        ${surveyQuestions.map(surveyQuestionCard).join('')}

        <label class="survey-free-text survey-free-text--textarea">
          <span>自由コメント・感想</span>
          <textarea name="comment" maxlength="240" rows="4" placeholder="久礼のこと、なんでも書いてや！良かったこと、困ったこと、また来たい理由でも何でも。"></textarea>
        </label>

        <label class="survey-consent">
          <input type="checkbox" name="shareable" />
          <span>個人が特定されない形で、観光改善やPRのヒントとして活用してOK</span>
        </label>

        <button class="button button--primary survey-submit" type="submit">旅メモカードを作るぜよ！</button>
      </form>

      <section class="survey-share-card" id="survey-share-card" aria-live="polite">
        <p class="survey-share-card__eyebrow">YOUR KURE CARD</p>
        <h3>まだ旅メモはありません</h3>
        <p>アンケートに答えると、ここにSNS投稿風のカードが表示されます。</p>
        <div class="survey-share-card__tags">
          <span>#久礼</span><span>#大正町市場</span><span>#カツオ待ち</span>
        </div>
      </section>

      ${appQrCard('survey')}
      ${substackLinkCard('survey')}
    </div>
  `;
}

function collectSurveyAnswer(form, question) {
  const checked = [...form.querySelectorAll(`input[name="${question.id}"]:checked`)].map((input) => input.value);
  const text = form.elements[`${question.id}Text`]?.value.trim();
  return {
    label: question.shortLabel,
    values: checked,
    text,
  };
}

function getSurveyCompletion(response) {
  return response.answers.filter((answer) => answer.values.length || answer.text).length;
}

function renderSurveyProgress() {
  const form = document.querySelector('#survey-form');
  const progressText = document.querySelector('#survey-progress-text');
  const progressBar = document.querySelector('#survey-progress-bar');
  if (!form || !progressText || !progressBar) return;

  const response = { answers: surveyQuestions.map((question) => collectSurveyAnswer(form, question)) };
  const completed = getSurveyCompletion(response);
  const percent = Math.round((completed / surveyQuestions.length) * 100);
  progressText.textContent = `${completed} / ${surveyQuestions.length} クエスト・${completed * 100}pt`;
  progressBar.style.width = `${percent}%`;
}

function renderSurveyShareCard(response) {
  const card = document.querySelector('#survey-share-card');
  if (!card) return;

  const completed = getSurveyCompletion(response);
  const picked = response.answers
    .filter((answer) => answer.values.length || answer.text)
    .slice(0, 5)
    .map((answer) => {
      const value = [...answer.values, answer.text].filter(Boolean).slice(0, 2).join(' / ');
      return `<span>${escapeHtml(answer.label)}: ${escapeHtml(value)}</span>`;
    })
    .join('');
  const comment = response.comment ? escapeHtml(response.comment) : '久礼の旅メモを残しました。';
  const title = completed >= surveyQuestions.length ? '全クエスト達成！久礼マスター' : `${completed}クエスト達成！久礼旅メモ`;

  card.innerHTML = `
    <p class="survey-share-card__eyebrow">YOUR KURE CARD</p>
    <h3>${title}</h3>
    <p>${comment}</p>
    <div class="survey-share-card__score"><span>⭐ ${completed * 100}pt</span><span>🎁 ${response.shareable ? '改善に活用OK' : '端末内メモ'}</span></div>
    <div class="survey-share-card__tags">${picked}<span>#久礼</span><span>#大正町市場</span></div>
  `;
}

function setupSurveyInteractions() {
  const form = document.querySelector('#survey-form');
  if (!form) return;

  form.addEventListener('input', renderSurveyProgress);
  form.addEventListener('change', renderSurveyProgress);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = {
      id: `survey-${Date.now()}`,
      createdAt: new Date().toISOString(),
      answers: surveyQuestions.map((question) => collectSurveyAnswer(form, question)),
      comment: form.elements.comment.value.trim(),
      shareable: form.elements.shareable.checked,
    };

    saveSurveyResponse(response);
    renderSurveyShareCard(response);

    if (SURVEY_ENDPOINT) {
      await fetch(SURVEY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(response),
      });
    }

    window.alert('旅メモカードを作成しました。回答はこの端末に保存されています。');
  });
  renderSurveyProgress();
}

function getActiveRental() {
  try {
    return JSON.parse(window.localStorage.getItem(RENTAL_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveActiveRental(rental) {
  if (rental) {
    window.localStorage.setItem(RENTAL_STORAGE_KEY, JSON.stringify(rental));
  } else {
    window.localStorage.removeItem(RENTAL_STORAGE_KEY);
  }
}

function formatClock(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function rentalPage() {
  const active = getActiveRental();

  const durationButtons = rentalDurations
    .map(
      (d, i) => `
        <label class="rental-duration">
          <input type="radio" name="duration" value="${d.minutes}" ${i === 1 ? 'checked' : ''} />
          <span>${d.label}</span>
        </label>
      `,
    )
    .join('');

  const wcDurationButtons = reserveDurations
    .map(
      (d, i) => `
        <label class="reserve-duration">
          <input type="radio" name="duration" value="${d.hours}" ${i === 0 ? 'checked' : ''} />
          <span>${d.label}</span>
        </label>
      `,
    )
    .join('');

  return `
    <div class="stack">
      <section class="hero">
        <p class="hero__eyebrow">WHEELCHAIR RENTAL</p>
        <h2>車いす貸し出し予約</h2>
        <p>お名前・電話番号・ご住所と利用時間を入力してください。返却予定の時間になると、このスマホがアラームでお知らせします。</p>
        <p class="rental-deadline">⚠️ 最終返却時刻は16時半です。ご予約は16時までとなります。</p>
      </section>

      <section class="rental-active" id="rental-active" aria-live="polite">
        ${active ? '' : '<p class="rental-active__empty">現在、利用中の予約はありません。</p>'}
      </section>

      <form class="rental-form" id="rental-form">
        <label class="rental-field">
          <span>お名前 <em>必須</em></span>
          <input name="name" type="text" maxlength="40" required placeholder="例：山田 太郎" />
        </label>
        <label class="rental-field">
          <span>電話番号 <em>必須</em></span>
          <input name="phone" type="tel" maxlength="20" required placeholder="例：090-1234-5678" inputmode="tel" />
        </label>
        <label class="rental-field">
          <span>ご住所</span>
          <input name="address" type="text" maxlength="80" placeholder="例：高知県中土佐町久礼…" />
        </label>
        <fieldset class="rental-field rental-field--duration">
          <legend>利用時間</legend>
          <div class="rental-duration-grid">${durationButtons}</div>
        </fieldset>
        <button class="button button--primary" type="submit">予約して返却タイマーを開始</button>
      </form>

      <div class="section-title" style="padding:0 4px">
        <h2 style="font-size:1.25rem">事前予約（日時指定）</h2>
        <p>後日の利用を、日時を指定して先に押さえられます。車いすは1台のため、重なる時間帯は予約できません（無料）。</p>
      </div>

      <section class="reserve-availability" aria-labelledby="wc-availability-title">
        <h3 id="wc-availability-title">空き状況</h3>
        <p class="slot-legend">
          <span><i class="is-free"></i>空き</span>
          <span><i class="is-busy"></i>予約済み</span>
        </p>
        <div class="slot-grid" id="wc-slot-grid">
          <p class="reserve-loading">日付を選ぶと空き状況を表示します。</p>
        </div>
      </section>

      <form class="reserve-form" id="wc-reserve-form">
        <label class="reserve-field">
          <span>利用日 <em>必須</em></span>
          <input name="date" type="date" required min="${tomorrowISODate()}" value="${tomorrowISODate()}" />
        </label>
        <div class="reserve-row">
          <label class="reserve-field">
            <span>開始時間 <em>必須</em></span>
            <select name="startTime" required>${reserveStartOptions()}</select>
          </label>
          <fieldset class="reserve-field">
            <legend>利用時間</legend>
            <div class="reserve-duration-grid">${wcDurationButtons}</div>
          </fieldset>
        </div>
        <label class="reserve-field">
          <span>お名前 <em>必須</em></span>
          <input name="name" type="text" maxlength="40" required placeholder="例：山田 太郎" />
        </label>
        <label class="reserve-field">
          <span>電話番号 <em>必須</em></span>
          <input name="phone" type="tel" maxlength="20" required placeholder="090-1234-5678" inputmode="tel" />
        </label>
        <label class="reserve-field">
          <span>ご住所 <em>必須</em></span>
          <input name="address" type="text" maxlength="80" required placeholder="例：高知県中土佐町久礼…" />
        </label>
        <button class="button button--primary" id="wc-reserve-submit" type="submit">空きを確認して事前予約する</button>
      </form>

      <section id="wc-reserve-result" aria-live="polite"></section>

      ${infoCard('返却のお知らせについて', '返却予定時刻になると、このスマホで音とバイブでお知らせします。確実にお知らせするため、画面を開いたままにするか、ホーム画面に追加したアプリでご利用ください。お知らせを許可すると、より気づきやすくなります。', 'sun')}
      ${infoCard('お店からの呼び出しについて', 'ご予約はお店の名簿にも記録されます。返却時間を過ぎた場合、お店のスタッフからお電話でご連絡することがあります。')}
    </div>
  `;
}

function renderRentalActive() {
  const box = document.querySelector('#rental-active');
  if (!box) return;
  const active = getActiveRental();
  if (!active) {
    box.innerHTML = '<p class="rental-active__empty">現在、利用中の予約はありません。</p>';
    return;
  }

  const now = Date.now();
  const remainMs = active.endAt - now;
  const overdue = remainMs <= 0;
  const absRemain = Math.abs(remainMs);
  const h = Math.floor(absRemain / 3600000);
  const m = Math.floor((absRemain % 3600000) / 60000);
  const s = Math.floor((absRemain % 60000) / 1000);
  const timeText = `${h > 0 ? `${h}時間` : ''}${m}分${String(s).padStart(2, '0')}秒`;

  box.innerHTML = `
    <div class="rental-card ${overdue ? 'rental-card--overdue' : ''}">
      <p class="rental-card__eyebrow">${overdue ? '⏰ 返却時間です' : '♿ 利用中'}</p>
      <h3>${escapeHtml(active.name)} さん</h3>
      <p class="rental-card__time">${overdue ? '返却予定を過ぎています' : '返却まで'} <strong>${timeText}</strong></p>
      <p class="rental-card__return">返却予定時刻：${active.endClock}</p>
      <button class="button button--secondary" id="rental-finish" type="button">返却して終了する</button>
    </div>
  `;
}

let rentalTimerId = null;
let rentalAlarmFired = false;
let rentalAudioCtx = null;

function fireRentalAlarm(rental) {
  if (rentalAlarmFired) return;
  rentalAlarmFired = true;

  if ('vibrate' in navigator) {
    navigator.vibrate([400, 200, 400, 200, 600]);
  }

  try {
    const ctx = rentalAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    [0, 0.6, 1.2].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.5);
    });
  } catch {
    /* 音が出せない環境では無視 */
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('車いすの返却時間です', {
      body: `${rental.name} さん、ご利用ありがとうございました。お近くのスタッフまで返却をお願いします。`,
    });
  }

  window.alert('車いすの返却時間になりました。お近くのスタッフまで返却をお願いします。');
}

function startRentalTimer() {
  if (rentalTimerId) {
    clearInterval(rentalTimerId);
    rentalTimerId = null;
  }
  const active = getActiveRental();
  if (!active) return;

  rentalAlarmFired = false;
  renderRentalActive();

  rentalTimerId = setInterval(() => {
    const current = getActiveRental();
    if (!current) {
      clearInterval(rentalTimerId);
      rentalTimerId = null;
      return;
    }
    renderRentalActive();
    if (Date.now() >= current.endAt) {
      fireRentalAlarm(current);
    }
  }, 1000);
}

function setupRentalInteractions() {
  const form = document.querySelector('#rental-form');

  // 既存の予約があればタイマーを再開（ページ再表示時も継続）
  if (getActiveRental()) {
    startRentalTimer();
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'rental-finish') {
      saveActiveRental(null);
      rentalAlarmFired = false;
      if (rentalTimerId) {
        clearInterval(rentalTimerId);
        rentalTimerId = null;
      }
      renderRentalActive();
    }
  });

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const address = form.elements.address.value.trim();
    const minutes = Number(form.elements.duration.value);

    if (!name || !phone) {
      window.alert('お名前と電話番号を入力してください。');
      return;
    }

    // 受付は16時まで（最終返却時刻16時半）
    const cutoff = new Date();
    cutoff.setHours(16, 0, 0, 0);
    if (Date.now() > cutoff.getTime()) {
      window.alert('本日のご予約受付は終了しました（最終返却16時半／受付は16時まで）。');
      return;
    }

    // 通知許可をリクエスト（任意）
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* 拒否されても続行 */
      }
    }

    // iOSはユーザー操作中にAudioContextを作る必要があるため、ここで初期化
    try {
      if (!rentalAudioCtx) {
        rentalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (rentalAudioCtx.state === 'suspended') rentalAudioCtx.resume();
    } catch { /* 非対応端末は無視 */ }

    const startAt = Date.now();
    const endAt = startAt + minutes * 60000;
    const endDate = new Date(endAt);

    const rental = {
      id: `rental-${startAt}`,
      name,
      phone,
      address,
      minutes,
      startAt,
      endAt,
      endClock: formatClock(endDate),
      createdAt: new Date(startAt).toISOString(),
    };

    saveActiveRental(rental);
    startRentalTimer();
    form.reset();

    if (RENTAL_ENDPOINT) {
      fetch(RENTAL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ formType: 'rental', ...rental }),
      }).catch(() => {
        /* 送信失敗してもローカルのタイマーは動く */
      });
    }

    window.alert(`予約しました。返却予定は ${rental.endClock} です。時間になるとこのスマホでお知らせします。`);
  });
}

// ===== 2階会議室の予約（Googleカレンダー連携・ダブルブッキング防止） =====

function getStoredReservations() {
  try {
    return JSON.parse(window.localStorage.getItem(RESERVE_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReservation(reservation) {
  const list = getStoredReservations();
  list.unshift(reservation);
  window.localStorage.setItem(RESERVE_STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
}

function reservePad(n) {
  return String(n).padStart(2, '0');
}

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${reservePad(d.getMonth() + 1)}-${reservePad(d.getDate())}`;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function reserveOverlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function buildReserveDateTime(dateStr, hhmm) {
  return new Date(`${dateStr}T${hhmm}:00`);
}

function reserveStartOptions() {
  const options = [];
  for (let h = RESERVE_OPEN_HOUR; h < RESERVE_CLOSE_HOUR; h += 1) {
    options.push(`<option value="${reservePad(h)}:00">${reservePad(h)}:00</option>`);
  }
  return options.join('');
}

// 当日予約は不可のため、最短は翌日。
function tomorrowISODate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${reservePad(d.getMonth() + 1)}-${reservePad(d.getDate())}`;
}

function reservePage() {
  const durationButtons = reserveDurations
    .map(
      (d, i) => `
        <label class="reserve-duration">
          <input type="radio" name="duration" value="${d.hours}" ${i === 0 ? 'checked' : ''} />
          <span>${d.label}</span>
        </label>
      `,
    )
    .join('');

  const categoryButtons = reserveCategories
    .map(
      (c) => `
        <label class="reserve-duration reserve-category">
          <input type="radio" name="category" value="${c.id}" />
          <span>${c.label}<small>${c.rate === 0 ? '無料' : `${c.rate.toLocaleString()}円/時`}</small></span>
        </label>
      `,
    )
    .join('');

  return `
    <div class="stack">
      <section class="hero">
        <p class="hero__eyebrow">2階研修室</p>
        <h2>${ROOM_NAME}の予約</h2>
        <p>日付と時間を選ぶと空き状況を確認して予約できます。料金は利用者区分と時間で自動計算、お支払いは<strong>銀行振込（前払い）</strong>です。</p>
        <p class="reserve-deadline">⏰ 受付 ${RESERVE_OPEN_HOUR}:00〜${RESERVE_CLOSE_HOUR}:00／当日予約は不可（要連絡）</p>
      </section>

      <section class="reserve-availability" aria-labelledby="availability-title">
        <h3 id="availability-title">空き状況</h3>
        <p class="slot-legend">
          <span><i class="is-free"></i>空き</span>
          <span><i class="is-busy"></i>予約済み</span>
        </p>
        <div class="slot-grid" id="slot-grid">
          <p class="reserve-loading">日付を選ぶと空き状況を表示します。</p>
        </div>
      </section>

      <form class="reserve-form" id="reserve-form">
        <label class="reserve-field">
          <span>利用日 <em>必須</em></span>
          <input name="date" type="date" required min="${tomorrowISODate()}" value="${tomorrowISODate()}" />
        </label>
        <div class="reserve-row">
          <label class="reserve-field">
            <span>開始時間 <em>必須</em></span>
            <select name="startTime" required>${reserveStartOptions()}</select>
          </label>
          <fieldset class="reserve-field">
            <legend>利用時間</legend>
            <div class="reserve-duration-grid">${durationButtons}</div>
          </fieldset>
        </div>
        <fieldset class="reserve-field">
          <legend>利用者区分 <em>必須</em></legend>
          <div class="reserve-category-grid">${categoryButtons}</div>
        </fieldset>
        <div class="reserve-fee" id="reserve-fee" aria-live="polite">
          <span class="reserve-fee__label">利用料（前払い）</span>
          <strong id="reserve-fee-amount">区分を選択してください</strong>
          <small id="reserve-fee-detail"></small>
        </div>
        <label class="reserve-field">
          <span>お名前・ご担当者 <em>必須</em></span>
          <input name="name" type="text" maxlength="40" required placeholder="例：山田 太郎" />
        </label>
        <label class="reserve-field">
          <span>団体・部署名</span>
          <input name="org" type="text" maxlength="60" placeholder="例：〇〇サークル" />
        </label>
        <div class="reserve-row">
          <label class="reserve-field">
            <span>電話番号 <em>必須</em></span>
            <input name="phone" type="tel" maxlength="20" required placeholder="090-1234-5678" inputmode="tel" />
          </label>
          <label class="reserve-field">
            <span>人数</span>
            <input name="headcount" type="number" min="1" max="100" placeholder="例：6" inputmode="numeric" />
          </label>
        </div>
        <label class="reserve-field">
          <span>利用目的</span>
          <textarea name="purpose" maxlength="120" placeholder="例：定例ミーティング"></textarea>
        </label>
        <button class="button button--primary" id="reserve-submit" type="submit">空きを確認して予約する</button>
      </form>

      <section id="reserve-result" aria-live="polite"></section>

      ${infoCard('お支払い（銀行振込・前払い）', `ご予約後、画面に表示される金額を${BANK_INFO.deadlineText}にお振込みください。振込手数料はご負担をお願いします。入金確認をもって予約確定となります。`, 'sun')}
      ${infoCard('ダブルブッキングの防止について', '予約時にサーバー側（Google Apps Script）でカレンダーを再確認し、同じ時間帯にすでに予約があれば登録せずお知らせします。複数の人が同時に予約しても二重予約になりません。')}
    </div>
  `;
}

async function fetchReserveBusy(dateStr, resource = 'room') {
  if (!RESERVE_ENDPOINT) {
    return getStoredReservations()
      .filter((r) => r.date === dateStr && (r.resource || 'room') === resource)
      .map((r) => ({ start: timeToMinutes(r.startTime), end: timeToMinutes(r.endTime) }));
  }
  const res = await fetch(`${RESERVE_ENDPOINT}?action=reservations&date=${encodeURIComponent(dateStr)}&resource=${encodeURIComponent(resource)}`, { method: 'GET' });
  const data = await res.json();
  return (data.busy || []).map((ev) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return { start: start.getHours() * 60 + start.getMinutes(), end: end.getHours() * 60 + end.getMinutes() };
  });
}

async function renderReserveAvailability(dateStr, resource = 'room', gridSelector = '#slot-grid') {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;
  grid.innerHTML = '<p class="reserve-loading">空き状況を確認しています…</p>';

  let busy = [];
  try {
    busy = await fetchReserveBusy(dateStr, resource);
  } catch {
    grid.innerHTML = '<p class="reserve-loading">空き状況を取得できませんでした。予約時にもう一度確認します。</p>';
    grid.dataset.busy = '';
    return;
  }

  const cells = [];
  for (let h = RESERVE_OPEN_HOUR; h < RESERVE_CLOSE_HOUR; h += 1) {
    const slotStart = h * 60;
    const slotEnd = (h + 1) * 60;
    const isBusy = busy.some((b) => reserveOverlaps(slotStart, slotEnd, b.start, b.end));
    cells.push(`
      <div class="slot slot--${isBusy ? 'busy' : 'free'}">
        <span>${reservePad(h)}:00–${reservePad(h + 1)}:00</span>
        <span class="slot__tag">${isBusy ? '予約済' : '空き'}</span>
      </div>
    `);
  }
  grid.innerHTML = cells.join('');
  grid.dataset.busy = JSON.stringify(busy);
}

function reserveResultCard(ok, title, message, detail = '') {
  return `
    <div class="reserve-result reserve-result--${ok ? 'ok' : 'ng'}">
      <p class="reserve-result__eyebrow">${ok ? '✅ 予約を受け付けました' : '⚠️ ご予約できませんでした'}</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${detail ? `<p class="reserve-result__detail">${escapeHtml(detail)}</p>` : ''}
    </div>
  `;
}

// 予約完了カード（無料区分は振込案内なし、有料区分は振込先を表示）。
function reserveSuccessCard(reservation) {
  const isFree = reservation.amountValue === 0;
  const who = reservation.org ? `${reservation.name}（${reservation.org}）さま` : `${reservation.name} さま`;

  let payBlock;
  if (isFree) {
    payBlock = `<p class="reserve-result__detail">区分「${escapeHtml(reservation.category)}」は利用無料です。お振込みは不要です。</p>`;
  } else if (BANK_INFO.bankName) {
    payBlock = `
      <div class="reserve-pay">
        <p class="reserve-pay__amount">お振込金額　<strong>${escapeHtml(reservation.amountValue.toLocaleString())}円</strong></p>
        <dl class="reserve-pay__bank">
          <div><dt>振込先</dt><dd>${escapeHtml(BANK_INFO.bankName)} ${escapeHtml(BANK_INFO.branch)}</dd></div>
          <div><dt>種別・口座</dt><dd>${escapeHtml(BANK_INFO.type)} ${escapeHtml(BANK_INFO.number)}</dd></div>
          <div><dt>名義</dt><dd>${escapeHtml(BANK_INFO.holder)}</dd></div>
          <div><dt>振込期限</dt><dd>${escapeHtml(BANK_INFO.deadlineText)}</dd></div>
        </dl>
        <p class="reserve-pay__note">${escapeHtml(BANK_INFO.note)}</p>
      </div>`;
  } else {
    payBlock = `<p class="reserve-result__detail">お振込先は事務局よりご案内します。</p>`;
  }

  return `
    <div class="reserve-result reserve-result--ok">
      <p class="reserve-result__eyebrow">✅ ご予約を受け付けました（仮予約）</p>
      <h3>${escapeHtml(reservation.date)}　${escapeHtml(reservation.startTime)}〜${escapeHtml(reservation.endTime)}</h3>
      <p>${escapeHtml(ROOM_NAME)}／${escapeHtml(who)}</p>
      ${payBlock}
    </div>
  `;
}

// 利用者区分・利用時間から利用料を即時計算して表示する。
function updateReserveFee() {
  const form = document.querySelector('#reserve-form');
  const amountEl = document.querySelector('#reserve-fee-amount');
  const detailEl = document.querySelector('#reserve-fee-detail');
  if (!form || !amountEl) return;

  const hours = Number(form.elements.duration.value) || 0;
  const categoryId = form.elements.category ? form.elements.category.value : '';
  const category = reserveCategories.find((c) => c.id === categoryId);

  if (!category) {
    amountEl.textContent = '区分を選択してください';
    if (detailEl) detailEl.textContent = '';
    return;
  }

  const amount = category.rate * hours;
  amountEl.textContent = amount === 0 ? '無料' : `${amount.toLocaleString()} 円`;
  if (detailEl) {
    detailEl.textContent =
      category.rate === 0
        ? `${category.label}（無料）`
        : `${category.label}・${category.rate.toLocaleString()}円 × ${hours}時間`;
  }
}

async function submitReservation(form) {
  const date = form.elements.date.value;
  const startTime = form.elements.startTime.value;
  const hours = Number(form.elements.duration.value);
  const name = form.elements.name.value.trim();
  const org = form.elements.org.value.trim();
  const phone = form.elements.phone.value.trim();
  const headcount = form.elements.headcount.value.trim();
  const purpose = form.elements.purpose.value.trim();
  const categoryId = form.elements.category ? form.elements.category.value : '';

  if (!date || !startTime || !name || !phone) {
    window.alert('利用日・開始時間・お名前・電話番号を入力してください。');
    return null;
  }

  const category = reserveCategories.find((c) => c.id === categoryId);
  if (!category) {
    window.alert('利用者区分を選択してください。');
    return null;
  }

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + hours * 60;
  if (endMin > RESERVE_CLOSE_HOUR * 60) {
    window.alert(`利用時間が受付終了（${RESERVE_CLOSE_HOUR}:00）を超えています。開始時間か利用時間を調整してください。`);
    return null;
  }

  const startDate = buildReserveDateTime(date, startTime);
  const endTime = `${reservePad(Math.floor(endMin / 60))}:${reservePad(endMin % 60)}`;
  const endDate = buildReserveDateTime(date, endTime);

  if (startDate.getTime() < Date.now()) {
    window.alert('過去の時間は予約できません。日付と時間をご確認ください。');
    return null;
  }

  // クライアント側の事前チェック（取得済みの空き状況と照合）
  const grid = document.querySelector('#slot-grid');
  if (grid && grid.dataset.busy) {
    try {
      const busy = JSON.parse(grid.dataset.busy);
      if (busy.some((b) => reserveOverlaps(startMin, endMin, b.start, b.end))) {
        return {
          ok: false,
          card: reserveResultCard(false, 'この時間はすでに予約があります', '別の時間帯を選んでください。', `${date} ${startTime}〜${endTime}`),
        };
      }
    } catch {
      /* 無視して送信時チェックに任せる */
    }
  }

  const amountValue = category.rate * hours;
  const amountText = amountValue === 0 ? `無料（${category.label}）` : `${amountValue.toLocaleString()}円（${category.label}）`;
  const paymentStatus = amountValue === 0 ? '不要' : '未入金';

  const reservation = {
    id: `reserve-${Date.now()}`,
    formType: 'reservation',
    resource: 'room',
    room: ROOM_NAME,
    date,
    startTime,
    endTime,
    hours,
    name,
    org,
    phone,
    headcount,
    purpose,
    category: category.label,
    amount: amountText,
    amountValue,
    paymentStatus,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  // 送信先が未設定の場合は端末内に仮記録（カレンダー連携はApps Script接続後に有効）
  if (!RESERVE_ENDPOINT) {
    saveReservation(reservation);
    return {
      ok: true,
      card: reserveResultCard(
        true,
        `${date} ${startTime}〜${endTime}`,
        `${ROOM_NAME}を仮予約として端末に記録しました。`,
        'Apps Scriptを接続すると、Googleカレンダーへ自動登録され二重予約も防止されます。',
      ),
    };
  }

  // サーバー側でカレンダーを確認し、空いていれば登録（ダブルブッキング防止の本判定）
  const res = await fetch(RESERVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(reservation),
  });
  const data = await res.json();

  if (data.ok) {
    saveReservation({ ...reservation, eventId: data.eventId });
    return { ok: true, card: reserveSuccessCard(reservation) };
  }

  if (data.reason === 'conflict') {
    return {
      ok: false,
      card: reserveResultCard(false, 'この時間はすでに予約があります', '空き状況を更新しました。別の時間帯を選んでください。', `${date} ${startTime}〜${endTime}`),
    };
  }

  return {
    ok: false,
    card: reserveResultCard(false, '予約処理でエラーが発生しました', 'お手数ですが、時間をおいて再度お試しください。', data.message || ''),
  };
}

function setupReserveInteractions() {
  const form = document.querySelector('#reserve-form');
  if (!form) return;

  const dateInput = form.elements.date;
  renderReserveAvailability(dateInput.value);
  dateInput.addEventListener('change', () => renderReserveAvailability(dateInput.value));

  form.addEventListener('change', updateReserveFee);
  form.addEventListener('input', updateReserveFee);
  updateReserveFee();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.querySelector('#reserve-submit');
    const resultBox = document.querySelector('#reserve-result');
    if (submit) {
      submit.setAttribute('aria-disabled', 'true');
      submit.textContent = '確認中…';
    }

    let outcome = null;
    try {
      outcome = await submitReservation(form);
    } catch {
      outcome = {
        ok: false,
        card: reserveResultCard(false, '通信エラー', 'ネットワークの状態をご確認のうえ、再度お試しください。'),
      };
    }

    if (submit) {
      submit.removeAttribute('aria-disabled');
      submit.textContent = '空きを確認して予約する';
    }

    if (outcome && resultBox) {
      resultBox.innerHTML = outcome.card;
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (outcome.ok) {
        form.reset();
        if (!dateInput.value) dateInput.value = tomorrowISODate();
        updateReserveFee();
      }
      renderReserveAvailability(dateInput.value);
    }
  });
}

// ===== 車いすの事前予約（1台・日時指定・ダブルブッキング防止） =====
async function submitWheelchairReserve(form) {
  const date = form.elements.date.value;
  const startTime = form.elements.startTime.value;
  const hours = Number(form.elements.duration.value);
  const name = form.elements.name.value.trim();
  const phone = form.elements.phone.value.trim();
  const address = form.elements.address.value.trim();

  if (!date || !startTime || !name || !phone || !address) {
    window.alert('利用日・開始時間・お名前・電話番号・ご住所を入力してください。');
    return null;
  }

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + hours * 60;
  if (endMin > RESERVE_CLOSE_HOUR * 60) {
    window.alert(`利用時間が受付終了（${RESERVE_CLOSE_HOUR}:00）を超えています。開始時間か利用時間を調整してください。`);
    return null;
  }

  const startDate = buildReserveDateTime(date, startTime);
  const endTime = `${reservePad(Math.floor(endMin / 60))}:${reservePad(endMin % 60)}`;
  const endDate = buildReserveDateTime(date, endTime);

  if (startDate.getTime() < Date.now()) {
    window.alert('過去の時間は予約できません。日付と時間をご確認ください。');
    return null;
  }

  const grid = document.querySelector('#wc-slot-grid');
  if (grid && grid.dataset.busy) {
    try {
      const busy = JSON.parse(grid.dataset.busy);
      if (busy.some((b) => reserveOverlaps(startMin, endMin, b.start, b.end))) {
        return {
          ok: false,
          card: reserveResultCard(false, 'この時間はすでに予約があります', '車いすは1台のため、別の時間帯を選んでください。', `${date} ${startTime}〜${endTime}`),
        };
      }
    } catch {
      /* 無視して送信時チェックに任せる */
    }
  }

  const reservation = {
    id: `wc-${Date.now()}`,
    formType: 'reservation',
    resource: 'wheelchair',
    room: '車いす',
    date,
    startTime,
    endTime,
    hours,
    name,
    phone,
    address,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  if (!RESERVE_ENDPOINT) {
    saveReservation(reservation);
    return {
      ok: true,
      card: reserveResultCard(true, `${date} ${startTime}〜${endTime}`, '車いすを仮予約として端末に記録しました。'),
    };
  }

  const res = await fetch(RESERVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(reservation),
  });
  const data = await res.json();

  if (data.ok) {
    saveReservation({ ...reservation, eventId: data.eventId });
    return {
      ok: true,
      card: reserveResultCard(true, `${date} ${startTime}〜${endTime}`, `車いすを事前予約しました（${name} さま）。`, '当日はぜよぴあ1階・TVの下からご使用いただき、お時間までにぜよぴあTV下までお戻しください。（無料）'),
    };
  }

  if (data.reason === 'conflict') {
    return {
      ok: false,
      card: reserveResultCard(false, 'この時間はすでに予約があります', '空き状況を更新しました。別の時間帯を選んでください。', `${date} ${startTime}〜${endTime}`),
    };
  }

  return {
    ok: false,
    card: reserveResultCard(false, '予約処理でエラーが発生しました', 'お手数ですが、時間をおいて再度お試しください。', data.message || ''),
  };
}

function setupWheelchairReserve() {
  const form = document.querySelector('#wc-reserve-form');
  if (!form) return;

  const dateInput = form.elements.date;
  renderReserveAvailability(dateInput.value, 'wheelchair', '#wc-slot-grid');
  dateInput.addEventListener('change', () => renderReserveAvailability(dateInput.value, 'wheelchair', '#wc-slot-grid'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.querySelector('#wc-reserve-submit');
    const resultBox = document.querySelector('#wc-reserve-result');
    if (submit) {
      submit.setAttribute('aria-disabled', 'true');
      submit.textContent = '確認中…';
    }

    let outcome = null;
    try {
      outcome = await submitWheelchairReserve(form);
    } catch {
      outcome = {
        ok: false,
        card: reserveResultCard(false, '通信エラー', 'ネットワークの状態をご確認のうえ、再度お試しください。'),
      };
    }

    if (submit) {
      submit.removeAttribute('aria-disabled');
      submit.textContent = '空きを確認して事前予約する';
    }

    if (outcome && resultBox) {
      resultBox.innerHTML = outcome.card;
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (outcome.ok) {
        form.reset();
        if (!dateInput.value) dateInput.value = tomorrowISODate();
      }
      renderReserveAvailability(dateInput.value, 'wheelchair', '#wc-slot-grid');
    }
  });
}

function homePage() {
  return `
    <div class="stack">
      <section class="hero">
        <p class="hero__eyebrow">スマホ専用PWA</p>
        <h2>待っている時間も、久礼を楽しむ時間に。</h2>
        <p>カツオを待つあいだに、久礼のこと、大正町市場のこと、海のまちの防災のことを少しだけ知ってみませんか。</p>
        <div class="hero__actions">
          ${button('待ち時間を選ぶ', 'wait')}
          ${button('豆知識を読む', 'katsuo', 'ghost')}
          ${button('旅の声を投稿する', 'survey', 'secondary')}
        </div>
      </section>

      <button class="survey-game-banner" data-route="survey" type="button">
        <span class="survey-game-banner__icon">🎮</span>
        <div class="survey-game-banner__body">
          <strong>久礼クエスト、挑戦してみる？</strong>
          <span>タップするだけ・約1分・旅メモカードが完成するき！</span>
        </div>
        <span class="survey-game-banner__arrow">›</span>
      </button>

      <button class="survey-game-banner reserve-banner" data-route="reserve" type="button">
        <span class="survey-game-banner__icon">📅</span>
        <div class="survey-game-banner__body">
          <strong>2階研修室、予約できます</strong>
          <span>空きを見て予約・料金自動計算・振込前払い</span>
        </div>
        <span class="survey-game-banner__arrow">›</span>
      </button>

      ${sectionTitle('WAIT TIME', '待ち時間から選ぶ', '今の待ち時間に近いカードを選んでください。')}
      <div class="wait-grid compact">${waitGuides.slice(0, 2).map(waitCard).join('')}</div>
      ${button('すべての待ち時間を見る', 'wait', 'secondary')}

      <div class="quick-menu" aria-label="ガイドメニュー">
        <button data-route="reserve" type="button"><span>📅</span>2階研修室の予約</button>
        <button data-route="survey" type="button"><span>🎮</span>旅の声アンケート</button>
        <button data-route="katsuo" type="button"><span>🐟</span>カツオ豆知識</button>
        <button data-route="market" type="button"><span>🏮</span>大正町市場紹介</button>
        <button data-route="tower" type="button"><span>🌊</span>防災タワー紹介</button>
        <button data-route="rental" type="button"><span>♿</span>車いす貸し出し予約</button>
        <a class="quick-menu__link" href="tower-warrior.html"><span>🕹️</span>Tower Warrior</a>
      </div>

      ${audioGuideCard('home', 'home')}
      ${appQrCard('home')}
      ${substackLinkCard('home')}
      ${infoCard('オフラインでも開ける準備', '一度読み込むと、基本情報は通信が不安定な場所でも見返しやすいPWAとして動作します。', 'sun')}
    </div>
  `;
}

function waitPage() {
  return `
    <div class="stack">
      ${sectionTitle('WAIT GUIDE', '待ち時間ガイド', '5分から30分以上まで、待ち時間に合わせておすすめの過ごし方を選べます。')}
      <div class="wait-grid">${waitGuides.map(waitCard).join('')}</div>
      ${audioGuideCard('wait')}
      ${infoCard('迷ったら10分コース', 'まずは市場紹介を読んでから、気になったらカツオ豆知識へ。食事の前後どちらでも楽しめます。')}
    </div>
  `;
}

function articlePage(route, eyebrow, title, description, articles, extra) {
  return `
    <div class="stack">
      ${sectionTitle(eyebrow, title, description)}
      <div class="article-list">${articles.map(guideCard).join('')}</div>
      ${audioGuideCard(route)}
      ${extra}
    </div>
  `;
}

function pageFor(route) {
  if (route === 'wait') return waitPage();
  if (route === 'survey') return surveyPage();
  if (route === 'rental') return rentalPage();
  if (route === 'reserve') return reservePage();
  if (route === 'katsuo') {
    return articlePage(
      'katsuo',
      'KATSUO',
      '久礼のカツオ豆知識',
      '食べる前に1分で読める、カツオと久礼の小さな話です。',
      katsuoFacts,
      infoCard('食べる時の楽しみ方', '香り、食感、薬味、季節感に注目すると、同じ一皿でもより豊かに味わえます。', 'sun'),
    );
  }
  if (route === 'market') {
    return articlePage(
      'market',
      'MARKET',
      '大正町市場紹介',
      'カツオを待つ間に、市場の雰囲気や楽しみ方を軽く予習できます。',
      marketGuides,
      infoCard('待ち時間のおすすめ', '席を離れる場合は、呼び出し方法や戻る目安をお店で確認してから散策しましょう。'),
    );
  }
  if (route === 'tower') {
    const evacuationCard = `
      <section class="evacuation-card">
        <h3>🚨 久礼の避難場所</h3>
        <p class="evacuation-card__note">地震を感じたらすぐ高台へ。最寄りの避難場所を確認しておきましょう。</p>
        <ul class="evacuation-list">
          <li class="evacuation-item">
            <span class="evacuation-item__icon">🗼</span>
            <div class="evacuation-item__body">
              <strong>純平タワー（避難タワー）</strong>
              <span>市場近くの防災タワー。すぐ登れます。</span>
            </div>
            <a class="evacuation-item__map" href="https://maps.app.goo.gl/fu8v87739dH3YpoK9" target="_blank" rel="noopener">地図</a>
          </li>
          <li class="evacuation-item">
            <span class="evacuation-item__icon">🗼</span>
            <div class="evacuation-item__body">
              <strong>八千代タワー（避難タワー）</strong>
              <span>もう一つの防災タワー。</span>
            </div>
            <a class="evacuation-item__map" href="https://maps.app.goo.gl/Lrp8y635wbLYcwra9" target="_blank" rel="noopener">地図</a>
          </li>
          <li class="evacuation-item">
            <span class="evacuation-item__icon">🏫</span>
            <div class="evacuation-item__body">
              <strong>久礼小学校</strong>
              <span>高台にある避難場所。</span>
            </div>
            <a class="evacuation-item__map" href="https://maps.app.goo.gl/eU6YH7uDq2HuMZ6E6" target="_blank" rel="noopener">地図</a>
          </li>
          <li class="evacuation-item">
            <span class="evacuation-item__icon">🏛️</span>
            <div class="evacuation-item__body">
              <strong>町民交流会館</strong>
              <span>避難場所として指定されています。</span>
            </div>
            <a class="evacuation-item__map" href="https://maps.app.goo.gl/EvAHWMeksnKiWUDh8" target="_blank" rel="noopener">地図</a>
          </li>
        </ul>
      </section>
    `;
    return articlePage(
      'tower',
      'SAFETY',
      '防災タワー紹介',
      '海のまちを楽しむために、観光中にも知っておきたい防災の視点をまとめました。',
      towerGuides,
      evacuationCard + infoCard('災害時のお願い', '地震を感じたら海の様子を見に行かず、現地表示・防災無線・自治体の公式案内に従ってください。', 'safety'),
    );
  }
  return homePage();
}

function appHeader(route) {
  return `
    <header class="app-header">
      <div class="app-header__mark" aria-hidden="true">鰹</div>
      <div>
        <p>高知県中土佐町 久礼</p>
        <h1>カツオ待ち時間ガイド</h1>
        <span>${routeMeta[route].subtitle}</span>
      </div>
    </header>
  `;
}

function bottomNav(currentRoute) {
  return `
    <nav class="bottom-nav" aria-label="主要メニュー">
      ${navRoutes
        .map(
          (route) => `
            <button class="bottom-nav__item" data-route="${route}" type="button" ${currentRoute === route ? 'aria-current="page"' : ''}>
              <span aria-hidden="true">${routeMeta[route].icon}</span>
              <strong>${routeMeta[route].label}</strong>
            </button>
          `,
        )
        .join('')}
    </nav>
  `;
}

function render() {
  const route = getRoute();
  document.querySelector('#root').innerHTML = `
    <div class="app-shell">
      <div class="phone-frame">
        ${appHeader(route)}
        <main class="page-container">${pageFor(route)}</main>
        ${bottomNav(route)}
      </div>
    </div>
  `;

  document.querySelectorAll('[data-route]').forEach((element) => {
    element.addEventListener('click', () => navigate(element.dataset.route));
  });

  setupSurveyInteractions();
  setupRentalInteractions();
  setupReserveInteractions();
  setupWheelchairReserve();

  document.querySelectorAll('[data-audio-id]').forEach((element) => {
    element.addEventListener('click', () => {
      if (element.getAttribute('aria-disabled') === 'true') {
        window.alert('音声ガイドは準備中です。将来、MP3・Spotify・Substack音声をここから再生できます。');
      }
    });
  });
}

window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  });
}
