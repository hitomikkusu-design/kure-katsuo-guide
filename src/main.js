const routes = ['home', 'wait', 'survey', 'katsuo', 'market', 'tower', 'rental'];

const routeMeta = {
  home: { label: 'ホーム', icon: '🏠', subtitle: '大正町市場で、待つ時間も旅の思い出に。' },
  wait: { label: '待ち時間', icon: '⏱️', subtitle: '今の待ち時間に合わせて、おすすめを選べます。' },
  survey: { label: 'アンケート', icon: '🎮', subtitle: '旅の声を、ゲーム感覚で気軽に残せます。' },
  katsuo: { label: '豆知識', icon: '🐟', subtitle: '食べる前に読む、久礼のカツオ小話。' },
  market: { label: '市場', icon: '🏮', subtitle: '市場の楽しみ方を短く紹介します。' },
  tower: { label: '防災', icon: '🌊', subtitle: '海のまちで知っておきたい防災の目印。' },
  rental: { label: '車いす', icon: '♿', subtitle: '車いすの貸し出し予約と返却タイマー。' },
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
const SURVEY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbziyW9dgy3m0-BsTKBm7uEHVNJLRCFsYibsBX5HfJRm7JQsJlbsBYL1FFoO-h9SHGcC/exec';

// 車いす予約は同じApps Scriptに送信し、formType で振り分けます。
const RENTAL_ENDPOINT = SURVEY_ENDPOINT;
const RENTAL_STORAGE_KEY = 'kure-katsuo-guide-rental-active';
const rentalDurations = [
  { label: '30分', minutes: 30 },
  { label: '1時間', minutes: 60 },
  { label: '2時間', minutes: 120 },
  { label: '3時間', minutes: 180 },
];

const surveyQuestions = [
  {
    id: 'origin',
    label: 'どこから来た？',
    shortLabel: '出発地',
    icon: '📍',
    prompt: '今日はどこから久礼へ来ましたか？',
    type: 'chips',
    options: ['高知県内', '四国から', '関西から', '中国地方から', '関東から', '九州から', '海外から'],
    placeholder: '市町村名や都道府県など',
    marketing: '来訪者エリアを把握して、PRする地域や交通案内づくりに活用できます。',
  },
  {
    id: 'reason',
    label: 'なぜ久礼？',
    shortLabel: '来訪理由',
    icon: '✨',
    prompt: '久礼に来ようと思ったきっかけは？',
    type: 'chips',
    options: ['カツオを食べたい', '大正町市場に来たい', 'SNSで見た', '家族・友人のおすすめ', 'ドライブ・旅行中', '防災・まち歩きに関心', 'なんとなく気になった'],
    placeholder: 'きっかけをひとこと',
    marketing: '来訪動機を知ることで、刺さる発信テーマを見つけやすくなります。',
  },
  {
    id: 'food',
    label: 'なに待ち・なに食べた？',
    shortLabel: '食体験',
    icon: '🐟',
    prompt: '食べたもの、または待っているお店・メニューは？',
    type: 'chips',
    options: ['カツオのたたき', '刺身・丼', '定食', '市場で買い物', 'スイーツ・飲み物', 'これから決める'],
    placeholder: 'お店名・メニュー名など',
    marketing: '人気メニューや待ち時間中の関心を把握できます。',
  },
  {
    id: 'discovery',
    label: '何で知った？',
    shortLabel: '認知経路',
    icon: '📣',
    prompt: '久礼やこのお店・市場を何で知りましたか？',
    type: 'chips',
    options: ['Instagram', 'X', 'TikTok', 'YouTube', 'Google検索・マップ', 'テレビ・雑誌', '観光サイト', '口コミ'],
    placeholder: '見た投稿・番組・サイトなど',
    marketing: 'マーケティングで重要な認知経路を測れます。',
  },
  {
    id: 'visitStyle',
    label: 'だれと来た？',
    shortLabel: '旅の形',
    icon: '👥',
    prompt: '今日はどんなスタイルで来ていますか？',
    type: 'chips',
    options: ['ひとり旅', '友人と', 'カップル・夫婦', '家族で', '団体・ツアー', '仕事・視察'],
    placeholder: '人数や旅のスタイルなど',
    marketing: '客層ごとの体験設計やキャンペーンづくりに役立ちます。',
  },
  {
    id: 'sentiment',
    label: '今の気分は？',
    shortLabel: '満足度',
    icon: '❤️',
    prompt: '久礼での体験をスタンプで表すなら？',
    type: 'rating',
    options: ['😌 のんびり', '😋 おいしい', '😍 最高', '📸 シェアしたい', '🔁 また来たい'],
    placeholder: '感想をひとこと',
    marketing: '満足度やSNS投稿意向、再訪意向を軽く測れます。',
  },
  {
    id: 'request',
    label: 'もっと良くするなら？',
    shortLabel: '要望',
    icon: '💡',
    prompt: 'あったら嬉しい情報・サービスは？',
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
    body: '室町時代後期から続くとされる久礼の一本釣り漁。竿一本で魚を引き上げるこの漁法は魚体を傷つけにくく、鮮度抜群の「たたき」文化を育ててきました。今も現役の漁師たちが受け継ぐ、久礼の誇りです。',
  },
  {
    badge: '文化',
    title: '市場入口に並ぶ8体のお地蔵さん',
    lead: '大正町市場の入口には、8体のお地蔵さんが静かに並んでいます。',
    body: '商売繁盛と訪れる人々の安全を願って祀られた8体のお地蔵さん。かつてこの一帯が「地蔵町商店街」と呼ばれていたのも、このお地蔵さんたちがいたからです。市場に入る前にちょっとお参りしていくのが、地元流の過ごし方です。',
  },
  {
    badge: '由来',
    title: '「地蔵町商店街」から「大正町市場」へ',
    lead: '今の「大正町市場」は、もとは「地蔵町商店街」という名前でした。',
    body: '8体のお地蔵さんが祀られていたことから「地蔵町」と呼ばれていたこの一帯。昭和の時代に「大正町市場」へと改称されました。名前は変わっても、お地蔵さんたちは今も入口で市場を見守り続けています。',
  },
  {
    badge: '名物',
    title: 'ゴカシキン 350円',
    lead: '市場名物のごかしきんは、カツオを丸ごと楽しめる一品です。',
    body: '大正町市場で食べられるごかしきん（御加持金）は350円。久礼ならではの調理法で仕上げた一品で、観光客にも地元の方にも人気があります。市場散策のお供にぜひどうぞ。',
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
    title: '防災タワーの役割',
    lead: '海の近くで過ごす時に知っておきたい避難の目印です。',
    body: '防災タワーは、津波などの災害時に高い場所へ避難するための施設です。観光中でも、いざという時の避難先を意識しておくことが大切です。',
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
        <h2>旅の声を投稿して、久礼の未来づくりに参加。</h2>
        <p>タップ中心で約1分。答えるほど「旅メモカード」が育つ、SNS投稿みたいなアンケートです。</p>
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
          <textarea name="comment" maxlength="240" rows="4" placeholder="久礼で良かったこと、困ったこと、また来たい理由などを自由にどうぞ。"></textarea>
        </label>

        <label class="survey-consent">
          <input type="checkbox" name="shareable" />
          <span>個人が特定されない形で、観光改善やPRのヒントとして活用してOK</span>
        </label>

        <button class="button button--primary survey-submit" type="submit">旅メモカードを作る</button>
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
      ${infoCard('マーケティングで見たい追加項目', '認知経路、同行者、満足度、再訪・紹介意向、欲しい情報を入れています。単なる感想だけでなく、次のPR施策や機能改善につながる声を集められます。', 'sun')}
      ${infoCard('保存について', `このMVPでは回答を端末内に保存します。現在この端末に保存されている回答は${savedCount}件です。外部集計を行う場合は、SURVEY_ENDPOINTに送信先URLを設定できます。`)}
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

  return `
    <div class="stack">
      <section class="hero">
        <p class="hero__eyebrow">WHEELCHAIR RENTAL</p>
        <h2>車いす貸し出し予約</h2>
        <p>お名前・電話番号・ご住所と利用時間を入力してください。返却予定の時間になると、このスマホがアラームでお知らせします。</p>
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

function fireRentalAlarm(rental) {
  if (rentalAlarmFired) return;
  rentalAlarmFired = true;

  if ('vibrate' in navigator) {
    navigator.vibrate([400, 200, 400, 200, 600]);
  }

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

  const finishBtn = document.querySelector('#rental-finish');
  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      saveActiveRental(null);
      if (rentalTimerId) {
        clearInterval(rentalTimerId);
        rentalTimerId = null;
      }
      renderRentalActive();
    });
  }

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

    // 通知許可をリクエスト（任意）
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* 拒否されても続行 */
      }
    }

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

      ${surveyPreviewCard()}

      ${sectionTitle('WAIT TIME', '待ち時間から選ぶ', '今の待ち時間に近いカードを選んでください。')}
      <div class="wait-grid compact">${waitGuides.slice(0, 2).map(waitCard).join('')}</div>
      ${button('すべての待ち時間を見る', 'wait', 'secondary')}

      <div class="quick-menu" aria-label="ガイドメニュー">
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
    return articlePage(
      'tower',
      'SAFETY',
      '防災タワー紹介',
      '海のまちを楽しむために、観光中にも知っておきたい防災の視点をまとめました。',
      towerGuides,
      infoCard('災害時のお願い', '地震を感じたら海の様子を見に行かず、現地表示・防災無線・自治体の公式案内に従ってください。', 'safety'),
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
      ${routes
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
