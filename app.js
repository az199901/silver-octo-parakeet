
/* ============================================================
   A. 数据层：读写 localStorage
   ============================================================ */
const STORAGE_KEY = 'mynovel_v1';

/* 角色的四个分类（固定，不开放自定义） */
const CATEGORIES = [
  { name: '主角', icon: '🙂' },
  { name: '配角', icon: '🧑' },
  { name: '反派', icon: '😈' },
  { name: '龙套', icon: '👤' }
];
function iconOfCategory(cat) {
  const c = CATEGORIES.find(c => c.name === cat);
  return c ? c.icon : '👤';
}

/* 一本书的新角色（其余字段边写边补） */
function newChar(bookId) {
  return {
    id: uid('c'), bookId: bookId, name: '', aliases: '',
    category: '主角', identity: '', oneLine: '',
    appearance: '', personality: '', speech: '',
    want: '', flaw: '', secret: '', notes: '',
    relations: []
  };
}

/* 默认提示词：三层（全局 / 场景 / 任务） */
function defaultPrompts() {
  return {
    global:
      '你是一个中文小说写作助手。\n\n' +
      '【输出规则】\n' +
      '1. 只输出结果文本本身。不要开场白、不要解释、不要"好的""以下是"。\n' +
      '2. 不要用 markdown 标题、编号、加粗。\n' +
      '3. 不要用引号把整段包起来。\n' +
      '4. 直接给成品，不要复述我的要求。',
    scenes: {
      'chapter.body':     '这是小说正文。只处理给定的这一段：保持人物、地点、道具、伏笔与本书设定一致，不新增情节，不改变已经发生的事。',
      'chapter.summary':  '这是章节总结。写清发生了什么、关系怎么变、留下了什么线索，供后面几章参考。',
      'char.oneLine':     '用一句话说清这个人是谁，15 字以内。要具体、有画面感，不要形容词堆砌。',
      'char.appearance':  '只写外形可见的部分：长相、衣着、体态、习惯动作。不写性格、不写经历、不做评价。',
      'char.personality': '只写他遇到事会怎么反应：面对危险、面对亲近的人、被冒犯时。用具体行为说明，不用"善良""倔强"这类空词。',
      'char.speech':      '只描述他怎么说话：句子长短、口癖、常用词、语气、会不会反问。不要写他说了什么内容。',
      'char.want':        '写他当下最想要的一件事，要具体。不要写"想变强"这种空话。',
      'char.flaw':        '写一个会真正拖住他的东西：身体、性格、把柄、牵挂。要能和主线冲突。',
      'char.secret':      '写一件别人不知道的事。要具体，且一旦暴露会改变关系或局势。',
      'char.identity':    '写他的身份和谋生方式，一句话。带上能体现阶层的细节。',
      'char.aliases':     '列 1~3 个别人对他的称呼，标明谁这么叫、什么场合叫。',
      'char.notes':       '整理成简短条目，保留原意，不要发挥。'
    },
    tasks: {
      polish: '保留原意和结构，只改字句：用词更准、节奏更顺、删掉冗余、修掉病句。不要增加新信息。',
      expand: '扩写到约 {{目标字数}} 字。补充细节、感官、动作，不新增情节、不改变人物关系。',
      style:  '按以下风格改写：{{风格提示词}}。风格要求优先于其他所有要求。若多种风格冲突，以前面的为主。',
      other:  '按作者的要求处理：{{作者指令}}',
      charGen:
        '你在为小说《{{书名}}》（题材：{{题材}}）设计角色。这次要创建的分类：{{分类}}。\n\n' +
        '【写法标准】\n' +
        '1. 实战优先：每个字段都要问自己"写正文时会用到吗"，用不上就留空，不要凑字数。\n' +
        '2. 一句话人设：15 字以内，具体、有画面感。禁止"善良/神秘/强大"这类空词。\n' +
        '3. 外貌：只写看得见的——长相、衣着、体态、习惯动作。不写性格、不写经历。\n' +
        '4. 性格：写他遇到事会怎么反应（被冒犯时、遇到危险时、面对亲近的人时），用行为，不用形容词。\n' +
        '5. 说话方式：句子长短、口癖、常用词、语气，最后附一句示例台词。\n' +
        '6. 想要 / 弱点 / 秘密：各写一句，要具体，且能和主线或其他角色产生冲突。\n' +
        '7. 别名：别人怎么叫他，注明谁这么叫。\n' +
        '8. 备注：只写和剧情功能有关的信息。\n' +
        '9. 名字不能和本书已有角色重复，风格要符合题材和世界规则。',
      'charGen.主角':
        '主角是视角中心。欲望要清晰、要有代价；弱点必须真能拖住他；秘密要能撑起至少一次反转。',
      'charGen.配角':
        '配角重要但不是视角中心，不能比主角更抢戏。\n' +
        '1. 必须有明确的剧情功能（帮主角 / 拖后腿 / 带信息 / 做镜子 / 制造选择），写进备注。\n' +
        '2. 必须和本书已有角色或世界设定产生联系，不能凭空出现。\n' +
        '3. 有一个让人记住的小特征（一个习惯、一句口头禅、一个物件），但不要太夸张。\n' +
        '4. 他有自己的小算盘，不是只为主角服务的工具人。',
      'charGen.反派':
        '反派与主角对立，但要有自己的逻辑，不是为坏而坏。动机要说得通，并和主角有具体的交集（旧账、利益、立场）。',
      'charGen.龙套':
        '龙套只出现一两次，但要保持前后一致。只写：名字、一句话人设、外貌、说话方式；其余字段留空字符串。'
    }
  };
}

/* 场景名称（给界面显示用） */
const SCENE_LABELS = {
  'char.oneLine': '角色 · 一句话人设',
  'char.appearance': '角色 · 外貌',
  'char.personality': '角色 · 性格',
  'char.speech': '角色 · 说话方式',
  'char.want': '角色 · 想要什么',
  'char.flaw': '角色 · 弱点',
  'char.secret': '角色 · 秘密',
  'char.identity': '角色 · 身份职业',
  'char.aliases': '角色 · 别名',
  'char.notes': '角色 · 备注',
  'chapter.body': '章节 · 正文',
  'chapter.summary': '章节 · 总结',
  'dialogue.surface': '对话 · 嘴上说',
  'dialogue.inner': '对话 · 心里想'
};
function sceneLabel(key) {
  return SCENE_LABELS[key] || key;
}

/* 合并提示词：老数据缺的键用默认补上 */
function mergePrompts(saved, base) {
  const out = { global: base.global, scenes: {}, tasks: {} };
  if (saved && typeof saved === 'object') {
    if (typeof saved.global === 'string') out.global = saved.global;
    Object.assign(out.scenes, base.scenes);
    Object.assign(out.tasks, base.tasks);
    if (saved.scenes) Object.keys(saved.scenes).forEach(k => {
      if (typeof saved.scenes[k] === 'string') out.scenes[k] = saved.scenes[k];
    });
    if (saved.tasks) Object.keys(saved.tasks).forEach(k => {
      if (typeof saved.tasks[k] === 'string') out.tasks[k] = saved.tasks[k];
    });
  } else {
    out.scenes = Object.assign({}, base.scenes);
    out.tasks = Object.assign({}, base.tasks);
  }
  return out;
}

/* 第一次打开时的示例数据 */
function defaultDB() {
  return {
    books: [
      { id: 'b1', title: '雾都旧事', chapters: 3, genre: '悬疑', rules: '' },
      { id: 'b2', title: '星海拾荒者', chapters: 0, genre: '科幻', rules: '' }
    ],
    characters: [
      {
        id: 'c1', bookId: 'b1', name: '沈默', aliases: '沈叔',
        category: '主角', identity: '退役老兵，修鞋匠',
        oneLine: '瘸腿老兵，嘴刻薄心软',
        appearance: '左腿旧伤，走路带金属摩擦声。常年一件洗得发白的灰褂子。',
        personality: '嘴上不饶人，心里护短。',
        speech: '短句，爱用反问，不说软话。',
        want: '把旧城那笔账算清。',
        flaw: '腿伤，阴雨天走不动。',
        secret: '旧城之战，是他点的火。',
        notes: ''
      }
    ],
    styles: [
      { id: 's1', title: '冷峻', prompt: '短句为主，克制情绪，不写内心独白，用环境和动作暗示情绪。' },
      { id: 's2', title: '古风', prompt: '半文半白，多用四字短语，避免现代词汇和网络用语。' },
      { id: 's3', title: '温情', prompt: '语气柔和，多写细节和感官，句子偏长，节奏慢。' }
    ],
    prompts: defaultPrompts(),
    api: { baseUrl: '', model: '', key: '' },
    usage: {},              /* 功能点击统计：{ 'bulb.polish': 12 } */
    lookCustom: {},         /* 外貌构造器里用户自己加的词：{ 发型: ['络腮胡'] } */
    chapters: [],           /* 章节：{ id, bookId, title, goal, text, order, summary, events } */
    materials: [],          /* 其他素材：{ id, bookId, type, name, desc } */
    events: [],             /* 事件库：{ id, bookId, parentId, title, status, participants, ... } */
    regions: [],            /* 地图：{ id, bookId, parentId, name, vibe, desc, ... } */
    items: []               /* 道具：{ id, bookId, cat, name, line, desc } */

  };
}

/* 把老版本 materials 里的主角/配角迁成 characters */
function migrateMaterials(materials) {
  const out = [];
  materials.forEach(m => {
    if (m.type === '主角' || m.type === '配角') {
      out.push({
        id: m.id || uid('c'),
        bookId: (m.scope && m.scope !== 'public') ? m.scope : 'b1',
        name: m.name || '', aliases: '', category: m.type,
        identity: '', oneLine: (m.desc || '').slice(0, 20),
        appearance: m.desc || '', personality: '', speech: '',
        want: '', flaw: '', secret: '', notes: ''
      });
    }
  });
  return out;
}

let db;
function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDB();
    const parsed = JSON.parse(raw);
    const base = defaultDB();
    let chars = Array.isArray(parsed.characters) ? parsed.characters : null;
    if (!chars && Array.isArray(parsed.materials)) chars = migrateMaterials(parsed.materials);
    return {
      books: Array.isArray(parsed.books) ? parsed.books : base.books,
      characters: chars || base.characters,
      styles: Array.isArray(parsed.styles) ? parsed.styles : base.styles,
      prompts: mergePrompts(parsed.prompts, base.prompts),
      api: Object.assign({}, base.api, parsed.api || {}),
      lookCustom: (parsed.lookCustom && typeof parsed.lookCustom === 'object') ? parsed.lookCustom : {},
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      regions: Array.isArray(parsed.regions) ? parsed.regions : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      usage: (parsed.usage && typeof parsed.usage === 'object') ? parsed.usage : {}
    };
  } catch (e) {
    console.warn('读取本地数据失败，使用默认数据', e);
    return defaultDB();
  }
}
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('保存失败（可能是隐私模式或空间满了）', e);
  }
}
db = loadDB();

/* 小工具 */
function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* 功能使用统计：db.usage 里累加，设置页负责显示。
   （之前 runAI 里调了它却没定义 → 润色/扩写/风格/导出全在这一行崩） */
function track(key) {
  if (!key) return;
  db.usage = (db.usage && typeof db.usage === 'object') ? db.usage : {};
  db.usage[key] = (db.usage[key] || 0) + 1;
  saveDB();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ============================================================
   B. 视图导航（用一个栈记住来路）
   ============================================================ */
let navStack = ['view-home'];

function showView(id, { replace = false } = {}) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === id);
  });
  if (replace) navStack[navStack.length - 1] = id;
  else navStack.push(id);
  // 切页时关掉弹层，避免"上一个页面的菜单"残留
  closePopover();
  closeSheet();
  window.scrollTo(0, 0);
}

function goBack() {
  if (navStack.length > 1) navStack.pop();
  const prev = navStack[navStack.length - 1];
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === prev);
  });
  closePopover();
  closeSheet();
  // 回到某些页面时需要刷新内容
  if (prev === 'view-charlist') renderCharList();
  if (prev === 'view-chapterlist') renderChapterList();
  if (prev === 'view-book') renderBook();
  if (prev === 'view-home') renderHome();
}

document.querySelectorAll('[data-back]').forEach(b => {
  b.addEventListener('click', goBack);
});

/* ============================================================
   C. 大厅渲染
   ============================================================ */
const shelfGrid = document.getElementById('shelfGrid');
const styleCount = document.getElementById('styleCount');

let currentBookId = null;
function currentBook() {
  return db.books.find(b => b.id === currentBookId) || null;
}

function renderHome() {
  // 风格数量
  styleCount.textContent = db.styles.length + ' 条';

  // 书架
  const colors = ['book-c1', 'book-c2', 'book-c3'];
  shelfGrid.innerHTML = db.books.map((b, i) => `
    <button class="book ${colors[i % colors.length]}" data-book="${b.id}" type="button">
      <span class="cover-color" style="background:rgba(255,255,255,0.18);"></span>
      <span>${esc(b.title)}</span>
      <span class="meta">${b.chapters || 0} 章</span>
    </button>
  `).join('') + `
    <button class="book-new" id="newBookBtn" type="button">
      <span class="icon">📖</span>
      <span>新建书籍</span>
    </button>
  `;

  shelfGrid.querySelectorAll('[data-book]').forEach(btn => {
    btn.addEventListener('click', () => openBook(btn.dataset.book));
  });
  document.getElementById('newBookBtn').addEventListener('click', openNewBookSheet);
}

/* 进书房 */
function openBook(id) {
  const book = db.books.find(b => b.id === id);
  if (!book) return;
  currentBookId = id;
  renderBook();
  showView('view-book');
}

/* 书房渲染（书名 / 题材 / 角色数） */
function renderBook() {
  const book = currentBook();
  if (!book) return;
  document.getElementById('bookTitle').textContent = book.title;
  document.getElementById('bookGenre').textContent = book.genre || '未设题材';

  const count = db.characters.filter(c => c.bookId === book.id).length;
  document.getElementById('charCount').textContent = count + ' 人';

  const chapCount = db.chapters.filter(c => c.bookId === book.id).length;
  document.getElementById('chapterCount').textContent = chapCount + ' 章';

  const evCount = db.events.filter(e => e.bookId === book.id).length;
  const evEl = document.getElementById('eventCount');
  if (evEl) evEl.textContent = evCount + ' 条';

  const rgCount = db.regions.filter(r => r.bookId === book.id).length;
  const rgEl = document.getElementById('regionCount');
  if (rgEl) rgEl.textContent = rgCount + ' 处';

  const itCount = db.items.filter(i => i.bookId === book.id).length;
  const itEl = document.getElementById('itemCount');
  if (itEl) itEl.textContent = itCount + ' 件';

  /* 伏笔只报"未回收"的数量——已回收的不需要你惦记 */
  const foreOpen = db.events.filter(e => e.bookId === book.id && e.isForeshadow && !e.payoffEventId).length;
  const foreEl = document.getElementById('foreCount');
  if (foreEl) foreEl.textContent = foreOpen + ' 个';
}

document.getElementById('openCharList').addEventListener('click', openCharList);
document.getElementById('openChapterList').addEventListener('click', openChapterList);

/* ============================================================
   D. 角色列表（按分类分组）
   ============================================================ */
function openCharList() {
  renderCharList();
  showView('view-charlist');
}

function renderCharList() {
  const book = currentBook();
  const body = document.getElementById('charListBody');
  if (!book) return;

  document.getElementById('charListTitle').textContent = '角色 · ' + book.title;

  const mine = db.characters.filter(c => c.bookId === book.id);

  if (!mine.length) {
    body.innerHTML = '<div class="empty">这本书还没有角色<br>点右上角「＋」新建一个</div>';
    return;
  }

  body.innerHTML = CATEGORIES.map(cat => {
    const group = mine.filter(c => c.category === cat.name);
    if (!group.length) return '';
    return `
      <div class="group-head">
        <span>${cat.icon} ${cat.name}</span>
        <span class="group-count">${group.length}</span>
      </div>
      ${group.map(c => `
        <button class="row" data-id="${c.id}" type="button">
          <span class="row-icon">${cat.icon}</span>
          <span class="row-main">
            <span class="row-title">${esc(c.name || '未命名')}</span>
            <span class="row-sub">${esc(c.oneLine || '还没有一句话人设')}</span>
          </span>
          <span class="book-tag">${esc(book.title)}</span>
        </button>
      `).join('')}
    `;
  }).join('');

  body.querySelectorAll('.row').forEach(row => {
    row.addEventListener('click', () => openCharDetail(row.dataset.id));
  });
}

/* 新建角色：只填名字就能建（门槛低） */
document.getElementById('addCharBtn').addEventListener('click', () => {
  const c = newChar(currentBookId);
  db.characters.push(c);
  saveDB();
  openCharDetail(c.id);
});

/* ============================================================
   D2. 用提示词生成角色（配角 / 主角 / 反派 / 龙套）
   流程：写一句描述 → AI 按「角色标准」出卡 → 预览 → 一键添加
   提示词可调：通用标准 + 每个分类各一段补充，存在 db.prompts.tasks
   （输出的 JSON 格式写死在代码里，改提示词不会把解析弄坏）
   ============================================================ */
const CATEGORY_NOTES = {
  '主角': '主角（故事的视角中心）',
  '配角': '配角（重要但非中心）',
  '反派': '反派（与主角对立）',
  '龙套': '龙套（只出现一两次，但要保持一致）'
};
const GEN_FIELDS = ['name', 'aliases', 'identity', 'oneLine', 'appearance',
  'personality', 'speech', 'want', 'flaw', 'secret', 'notes'];

/* 记住上次填的，从提示词编辑页回来不丢 */
let charGenDraft = { cat: '配角', desc: '', n: 1 };
let charGenBusy = false;

function fillPlaceholders(text, map) {
  return String(text || '').replace(/\{\{([^}]+)\}\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m;
  });
}

/* 拼 system：全局 + 通用标准 + 分类补充 + 世界规则 + 已有角色 + 写死的输出格式 */
function buildCharGenSystem(bookId, cat, n) {
  const book = db.books.find(b => b.id === bookId);
  const p = db.prompts;
  const map = {
    '书名': book ? book.title : '',
    '题材': (book && book.genre) || '未设',
    '分类': CATEGORY_NOTES[cat] || cat,
    '条数': String(n)
  };
  const dflt = defaultPrompts().tasks;
  const general = fillPlaceholders(p.tasks.charGen != null ? p.tasks.charGen : dflt.charGen, map);
  const extraRaw = p.tasks['charGen.' + cat] != null ? p.tasks['charGen.' + cat] : dflt['charGen.' + cat];
  const extra = fillPlaceholders(extraRaw, map).trim();

  const others = db.characters
    .filter(x => x.bookId === bookId && x.name)
    .slice(0, 40)
    .map(x => x.name + '（' + x.category + '）：' + (x.oneLine || '') + (x.identity ? '／' + x.identity : ''))
    .join('\n');
  const rules = buildBookRules(bookId);

  const format = [
    '【输出格式（程序要解析，必须照做）】',
    '只输出 JSON，不要代码块、不要解释。共 ' + n + ' 个角色：',
    '{"characters":[{"name":"","aliases":"","identity":"","oneLine":"","appearance":"","personality":"","speech":"","want":"","flaw":"","secret":"","notes":""}]}',
    '每个值都是字符串；没有内容的字段用空字符串。'
  ].join('\n');

  return [
    p.global,
    general,
    extra ? '【' + cat + '的额外要求】\n' + extra : '',
    rules,
    others ? '【本书已有角色（不要重名，可以与他们发生联系）】\n' + others : '（本书还没有角色）',
    format
  ].filter(Boolean).join('\n\n');
}

function cleanGenList(obj, cat) {
  const arr = obj && Array.isArray(obj.characters) ? obj.characters : [];
  return arr.map(raw => {
    const o = { category: cat };
    GEN_FIELDS.forEach(k => { o[k] = String(raw && raw[k] != null ? raw[k] : '').trim(); });
    return o;
  }).filter(o => o.name);
}

document.getElementById('genCharBtn').addEventListener('click', openCharGenSheet);

function openCharGenSheet() {
  if (!currentBookId) return;
  openSheet('<div id="genRoot"></div>', body => renderGenForm(body.querySelector('#genRoot')));
}

function renderGenForm(root) {
  const d = charGenDraft;
  root.innerHTML = `
    <div class="sheet-title">AI 创建角色 <span class="sheet-sub">写一句描述，按角色标准出卡</span></div>

    <div class="chips" id="genCats" style="margin-bottom:12px;">
      ${CATEGORIES.map(c => `
        <button class="chip ${d.cat === c.name ? 'selected' : ''}" data-cat="${c.name}" type="button">${c.icon} ${c.name}</button>
      `).join('')}
    </div>

    <div class="sheet-field" style="margin-bottom:12px;">
      想要什么样的人
      <textarea class="field-input" id="genDesc" rows="4"
        placeholder="例：城南茶馆的老板娘，和沈默是旧识，嘴碎心热，知道一点旧城大火的内情"></textarea>
    </div>

    <div class="sheet-field" style="margin-bottom:12px;">
      一次生成几个（1~3）
      <input class="field-input" id="genN" type="number" inputmode="numeric" min="1" max="3">
    </div>

    <div id="genOut"></div>

    <div style="display:flex;gap:8px;">
      <button class="btn btn-ghost" id="genPrompt" type="button">⚙ 调提示词</button>
      <button class="btn btn-primary" id="genGo" type="button">生成</button>
    </div>
  `;
  const desc = root.querySelector('#genDesc');
  const nEl = root.querySelector('#genN');
  desc.value = d.desc;
  nEl.value = d.n;
  desc.addEventListener('input', () => { d.desc = desc.value; });
  nEl.addEventListener('input', () => {
    const v = parseInt(nEl.value, 10);
    if (v >= 1 && v <= 3) d.n = v;
  });
  root.querySelectorAll('#genCats .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      d.cat = btn.dataset.cat;
      root.querySelectorAll('#genCats .chip').forEach(b => b.classList.toggle('selected', b === btn));
    });
  });
  root.querySelector('#genGo').addEventListener('click', () => runCharGen(root));
  root.querySelector('#genPrompt').addEventListener('click', () => renderGenPromptEditor(root));
}

async function runCharGen(root) {
  if (charGenBusy) return;
  const d = charGenDraft;
  const out = root.querySelector('#genOut');
  if (!d.desc.trim()) {
    out.innerHTML = '<div class="empty" style="padding:6px 0 12px;">先写一句想要什么样的人。</div>';
    return;
  }
  const n = Math.min(3, Math.max(1, d.n || 1));
  charGenBusy = true;
  out.innerHTML = '<div class="empty" style="padding:6px 0 12px;">正在生成…</div>';
  try {
    track('角色·AI创建');
    const system = buildCharGenSystem(currentBookId, d.cat, n);
    const reply = await callAIOnce(system, '请创建 ' + n + ' 个' + d.cat + '。作者的描述：\n' + d.desc.trim());
    const list = cleanGenList(parseJSONBlock(reply), d.cat);
    if (!list.length) throw new Error('AI 没有返回可用的角色，换个描述再试，或点「调提示词」。');
    renderGenResults(out, list);
  } catch (e) {
    console.error(e);
    out.innerHTML = '<div class="empty" style="padding:6px 0 12px;text-align:left;white-space:pre-wrap;">【出错了】' +
      esc(e && e.message ? e.message : e) + '</div>';
  } finally {
    charGenBusy = false;
  }
}

function renderGenResults(out, list) {
  const dup = name => db.characters.some(c => c.bookId === currentBookId && c.name === name);
  out.innerHTML = list.map((o, i) => `
    <div class="result-card" data-gi="${i}">
      <div class="result-label">${iconOfCategory(o.category)} ${esc(o.category)} · 方案 ${i + 1} / ${list.length}
        ${dup(o.name) ? '<span style="color:#c0392b;">（本书已有同名）</span>' : ''}</div>
      <div class="result-text"><b>${esc(o.name)}</b>${o.oneLine ? '｜' + esc(o.oneLine) : ''}</div>
      <div class="result-text" style="font-size:12px;opacity:.85;line-height:1.8;">
        ${GEN_FIELDS.filter(k => k !== 'name' && k !== 'oneLine' && o[k])
          .map(k => '<div><b>' + esc(CHAR_FIELD_LABELS[k]) + '：</b>' + esc(o[k]) + '</div>').join('')}
      </div>
      <div class="result-actions">
        <button class="btn btn-primary" data-gadd="${i}" type="button">添加到角色库</button>
      </div>
    </div>
  `).join('') + (list.length > 1
    ? '<button class="btn btn-ghost" id="genAddAll" type="button" style="margin-bottom:12px;">全部添加</button>' : '');

  function addOne(i) {
    const btn = out.querySelector('[data-gadd="' + i + '"]');
    if (!btn || btn.disabled) return;
    const c = newChar(currentBookId);
    const o = list[i];
    c.category = o.category;
    GEN_FIELDS.forEach(k => { c[k] = o[k]; });
    db.characters.push(c);
    saveDB();
    renderCharList();
    btn.disabled = true;
    btn.textContent = '已添加 ✓';
  }
  out.querySelectorAll('[data-gadd]').forEach(btn => {
    btn.addEventListener('click', () => addOne(parseInt(btn.dataset.gadd, 10)));
  });
  const all = out.querySelector('#genAddAll');
  if (all) all.addEventListener('click', () => { list.forEach((_, i) => addOne(i)); all.disabled = true; });
}

/* 提示词编辑页：通用标准 + 当前分类的补充，就地改、就地存 */
function renderGenPromptEditor(root) {
  const cat = charGenDraft.cat;
  const key = 'charGen.' + cat;
  root.innerHTML = `
    <div class="sheet-title">调提示词 <span class="sheet-sub">角色创建 · ${esc(cat)}</span></div>

    <div class="sheet-field" style="margin-bottom:12px;">
      ${esc(cat)}的额外要求（只对「${esc(cat)}」生效）
      <textarea class="field-input" id="gpExtra" rows="7"></textarea>
    </div>

    <details class="block">
      <summary>通用标准（四种分类共用）</summary>
      <div style="padding:12px 14px 14px;">
        <textarea class="field-input" id="gpGeneral" rows="12"></textarea>
      </div>
    </details>

    <div class="sheet-sub" style="margin:4px 2px 12px;line-height:1.8;">
      · 可用变量：{{书名}} {{题材}} {{分类}} {{条数}}<br>
      · 世界规则、本书已有角色会自动带上，不用自己写<br>
      · 输出格式（JSON）由程序固定，怎么改都不会解析失败<br>
      · 调优套路：多做了什么写\"禁止\"，少做了什么写\"必须\"，不像就给一个例子
    </div>

    <div style="display:flex;gap:8px;">
      <button class="btn btn-ghost" id="gpReset" type="button">恢复默认</button>
      <button class="btn btn-ghost" id="gpBack" type="button">返回</button>
      <button class="btn btn-primary" id="gpSave" type="button">保存</button>
    </div>
  `;
  const dflt = defaultPrompts().tasks;
  const extra = root.querySelector('#gpExtra');
  const general = root.querySelector('#gpGeneral');
  extra.value = db.prompts.tasks[key] != null ? db.prompts.tasks[key] : (dflt[key] || '');
  general.value = db.prompts.tasks.charGen != null ? db.prompts.tasks.charGen : dflt.charGen;

  root.querySelector('#gpSave').addEventListener('click', () => {
    db.prompts.tasks[key] = extra.value;
    db.prompts.tasks.charGen = general.value;
    saveDB();
    renderGenForm(root);
    root.querySelector('#genOut').innerHTML =
      '<div class="empty" style="padding:6px 0 12px;">提示词已保存，下次生成就生效。</div>';
  });
  root.querySelector('#gpReset').addEventListener('click', () => {
    extra.value = dflt[key] || '';
    general.value = dflt.charGen;
  });
  root.querySelector('#gpBack').addEventListener('click', () => renderGenForm(root));
}

/* ============================================================
   E. 角色详情（折叠区块 + 每个字段的灯泡）
   ============================================================ */
const bulbMenu = document.getElementById('bulbMenu');
const resultsWrap = document.getElementById('resultsWrap');

let activeCharId = null;
let activeField = 'oneLine';
let activeBulb = null;

/* AI 的作用目标：谁最后点了灯泡，它就是谁。
   { sceneKey, get(), set(v), chapterId } —— 角色字段和章节正文都走这里 */
let activeTarget = null;

function targetIsChar() {
  return !!activeTarget && activeTarget.sceneKey.indexOf('char.') === 0;
}
function targetChar() {
  return targetIsChar() ? currentChar() : null;
}

/* 角色字段当目标 */
function targetFromCharField(field) {
  return {
    sceneKey: 'char.' + field,
    get: function () {
      const c = currentChar();
      return c ? String(c[field] || '') : '';
    },
    set: function (v) {
      const c = currentChar();
      if (!c) return;
      c[field] = v;
      saveDB();
      const el = document.querySelector('#charDetailBody textarea[data-field="' + field + '"], #charDetailBody input[data-field="' + field + '"]');
      if (el) el.value = v;
    }
  };
}

/* 章节正文当目标 */
function targetFromChapter() {
  return {
    sceneKey: 'chapter.body',
    chapterId: activeChapterId,
    get: function () {
      const c = currentChapter();
      return c ? String(c.text || '') : '';
    },
    set: function (v) {
      const c = currentChapter();
      if (!c) return;
      c.text = v;
      saveDB();
      const el = document.querySelector('#chapterBody [data-cf="text"]');
      if (el) el.value = v;
      updateWordCount();
    }
  };
}

function currentChar() {
  return db.characters.find(c => c.id === activeCharId) || null;
}

/* 每个字段的示例（不知道怎么下笔时，点一下就填进去） */
const FIELD_HINTS = {
  oneLine:     { ex: '瘸腿老兵，嘴刻薄心软' },
  aliases:     { ex: '沈叔（街坊这么叫）、老沈（战友这么叫）' },
  identity:    { ex: '退役老兵，在城南修鞋为生' },
  appearance:  { ex: '左腿旧伤，走路带金属摩擦声；常年一件洗得发白的灰褂子。' },
  personality: { ex: '被冒犯时不吵，只是不说话了；对熟人反而更刻薄。' },
  speech:      { ex: '短句，爱用反问，不说软话；急了会重复对方的话。' },
  want:        { ex: '把旧城那笔账算清' },
  flaw:        { ex: '阴雨天腿疼得走不动，只能靠墙站着' },
  secret:      { ex: '旧城那场火，是他点的' },
  notes:       { ex: '爱吃甜，但从不承认' }
};

/* 常见关系的反向称谓（自动配对，配不上就让作者自己填） */
const REVERSE_LABELS = {
  '师父': '徒弟', '徒弟': '师父',
  '父亲': '儿子', '儿子': '父亲',
  '母亲': '女儿', '女儿': '母亲',
  '叔叔': '侄子', '侄子': '叔叔',
  '舅舅': '外甥', '外甥': '舅舅',
  '哥哥': '弟弟', '弟弟': '哥哥',
  '姐姐': '妹妹', '妹妹': '姐姐',
  '妻子': '丈夫', '丈夫': '妻子',
  '情侣': '情侣', '恋人': '恋人',
  '朋友': '朋友', '敌人': '敌人',
  '上司': '下属', '下属': '上司',
  '主人': '仆人', '仆人': '主人',
  '师兄': '师弟', '师弟': '师兄',
  '师姐': '师妹', '师妹': '师姐',
  '恩人': '仇人', '仇人': '恩人'
};

/* 外貌构造器：分块点选，自动拼成一句 */
const LOOK_PARTS = [
  { label: '发型', items: ['短发', '寸头', '长发', '马尾', '光头', '乱发', '花白头发'] },
  { label: '眉眼', items: ['眉骨高', '眉毛稀疏', '眼神锐利', '眼皮耷拉', '眼窝深陷', '眼角有疤'] },
  { label: '鼻嘴', items: ['鼻梁塌', '鼻梁挺', '嘴唇干裂', '嘴角下垂', '牙齿发黄', '薄唇'] },
  { label: '脸型', items: ['方脸', '瘦长脸', '圆脸', '颧骨高', '下巴尖', '左脸有旧疤'] },
  { label: '身材', items: ['精瘦', '高大', '矮壮', '微胖', '佝偻', '肩很宽'] },
  { label: '服饰', items: ['灰布长衫', '旧军装', '洗得发白的褂子', '皮夹克', '粗布短打', '长袍'] },
  { label: '鞋子', items: ['旧皮靴', '布鞋', '草鞋', '赤脚', '军靴'] }
];

/* 一个字段 = 标签 + 清空 + 灯泡 + 输入框 */
function fieldBlock(label, key, ph, rows) {
  const lookBtn = key === 'appearance'
    ? '<button class="clear-btn look-open" data-look="1" type="button">详细构造</button>'
    : '';
  const hint = FIELD_HINTS[key]
    ? `<div class="field-hint" data-fill="${key}">示例：${esc(FIELD_HINTS[key].ex)}<span class="hint-tag">点一下填入</span></div>`
    : '';

  return `
    <div class="field">
      <div class="field-label">
        <span>${label}</span>
        <span class="label-actions">
          ${lookBtn}
          <button class="clear-btn" data-clear="${key}" type="button">清空</button>
          <button class="bulb" data-field="${key}" type="button">💡</button>
        </span>
      </div>
      <textarea class="field-input" data-field="${key}" rows="${rows || 3}" placeholder="${ph || ''}"></textarea>
      ${hint}
    </div>
  `;
}

function openCharDetail(id) {
  activeCharId = id;
  activeField = 'oneLine';
  activeTarget = targetFromCharField('oneLine');
  clearResults();
  closePopover();
  renderCharDetail();
  showView('view-chardetail');
}

function renderCharDetail() {
  const c = currentChar();
  if (!c) return;
  const book = db.books.find(b => b.id === c.bookId);

  document.getElementById('charDetailTitle').textContent = c.name || '未命名';

  const body = document.getElementById('charDetailBody');
  body.innerHTML = `
    <div class="field">
      <div class="field-label"><span>名字</span></div>
      <input class="field-input name-input" data-field="name" type="text" placeholder="给他起个名字">
    </div>

    <div class="panel" style="margin-bottom:14px;">
      <div class="panel-label">分类 <span class="hint">${esc(book ? book.title : '')}</span></div>
      <div class="chips" id="catChips">
        ${CATEGORIES.map(cat => `
          <button class="chip ${c.category === cat.name ? 'selected' : ''}"
                  data-cat="${cat.name}" type="button">${cat.icon} ${cat.name}</button>
        `).join('')}
      </div>
    </div>

    <div class="field">
      <div class="field-label">
        <span>一句话人设</span>
        <span class="label-actions">
          <button class="bulb" data-field="oneLine" type="button">💡</button>
        </span>
      </div>
      <textarea class="field-input one-line-input" data-field="oneLine" rows="2"
        placeholder="15 字以内，一眼看清他是谁"></textarea>
    </div>

    <details class="block">
      <summary>身份 · 别名 / 职业</summary>
      ${fieldBlock('别名 / 称呼', 'aliases', '小名、绰号、别人怎么叫他', 2)}
      ${fieldBlock('身份 / 职业', 'identity', '他是干什么的', 2)}
    </details>

    <details class="block">
      <summary>人 · 外貌 / 性格 / 说话方式</summary>
      ${fieldBlock('外貌', 'appearance', '长相、衣着、体态、特征', 3)}
      ${fieldBlock('性格', 'personality', '他遇到事会怎么反应', 3)}
      ${fieldBlock('说话方式', 'speech', '口癖、语气、常用词', 3)}
    </details>

    <details class="block">
      <summary>动机 · 想要什么 / 弱点 / 秘密</summary>
      ${fieldBlock('想要什么', 'want', '目标、欲望', 2)}
      ${fieldBlock('弱点 / 阻碍', 'flaw', '他怕什么、缺什么', 2)}
      ${fieldBlock('秘密', 'secret', '别人不知道的事', 3)}
    </details>

    <details class="block">
      <summary>关系 · 和谁是什么关系</summary>
      <div id="relList" style="padding:12px 14px 0;"></div>
      <div style="padding:0 14px 14px;">
        <button class="link-btn" id="addRelBtn" type="button" style="margin-bottom:0;">＋ 添加一条关系</button>
      </div>
    </details>

    <details class="block">
      <summary>备注</summary>
      ${fieldBlock('备注', 'notes', '零散的灵感', 3)}
    </details>

    ${stateHistoryHtml(c, '状态记录') ? `<details class="block"><summary>状态记录 · 每章之后的他</summary>${stateHistoryHtml(c, '状态记录')}</details>` : ''}
  `;

  /* 填值 */
  body.querySelectorAll('[data-field]').forEach(el => {
    el.value = c[el.dataset.field] || '';
  });

  /* 输入即保存 */
  body.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      const ch = currentChar();
      if (!ch) return;
      ch[el.dataset.field] = el.value;
      if (el.dataset.field === 'name') {
        document.getElementById('charDetailTitle').textContent = el.value || '未命名';
      }
      saveDB();
    });
  });

  /* 分类切换 */
  body.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = currentChar();
      if (!ch) return;
      ch.category = btn.dataset.cat;
      saveDB();
      body.querySelectorAll('[data-cat]').forEach(b => {
        b.classList.toggle('selected', b.dataset.cat === ch.category);
      });
    });
  });

  /* 清空单个字段 */
  body.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = currentChar();
      if (!ch) return;
      const key = btn.dataset.clear;
      ch[key] = '';
      /* 注意：灯泡按钮也有 data-field，所以必须明确只找输入框 */
      const el = body.querySelector('textarea[data-field="' + key + '"], input[data-field="' + key + '"]');
      if (el) el.value = '';
      saveDB();
      clearResults();
    });
  });

  /* 灯泡：记住它作用在哪个字段 */
  body.querySelectorAll('.bulb').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeField = btn.dataset.field;
      activeTarget = targetFromCharField(btn.dataset.field);
      togglePopoverAt(btn);
    });
  });

  /* 点示例 → 填进对应的框（空着就直接填，已有内容就接在后面） */
  body.querySelectorAll('[data-fill]').forEach(el => {
    el.addEventListener('click', () => {
      const ch = currentChar();
      if (!ch) return;
      const key = el.dataset.fill;
      const box = body.querySelector('textarea[data-field="' + key + '"]');
      if (!box) return;
      const ex = FIELD_HINTS[key] ? FIELD_HINTS[key].ex : '';
      if (!ex) return;
      box.value = box.value.trim() ? box.value.trim() + '\n' + ex : ex;
      ch[key] = box.value;
      saveDB();
    });
  });

  /* 外貌 → 详细构造 */
  body.querySelectorAll('[data-look]').forEach(btn => {
    btn.addEventListener('click', () => openLookBuilder());
  });

  /* 关系区 */
  renderRelations();
  const addRel = body.querySelector('#addRelBtn');
  if (addRel) addRel.addEventListener('click', openRelSheet);
}

/* ---------- 关系：列表 ---------- */
function renderRelations() {
  const c = currentChar();
  const box = document.getElementById('relList');
  if (!c || !box) return;

  const rels = Array.isArray(c.relations) ? c.relations : [];

  if (!rels.length) {
    box.innerHTML = '<div class="empty" style="padding:10px 0 14px;">还没有关系记录</div>';
    return;
  }

  box.innerHTML = rels.map((r, i) => {
    const other = db.characters.find(x => x.id === r.targetId);
    return `
      <div class="rel-item">
        <div class="rel-main">
          <span class="rel-who">${esc(other ? other.name || '未命名' : '（已删除的人）')}</span>
          <span class="rel-label">${esc(r.label || '')}</span>
        </div>
        ${r.note ? `<div class="rel-note">${esc(r.note)}</div>` : ''}
        <button class="rel-del" data-reldel="${i}" type="button">✕</button>
      </div>
    `;
  }).join('');

  box.querySelectorAll('[data-reldel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c2 = currentChar();
      if (!c2) return;
      const i = +btn.dataset.reldel;
      const removed = c2.relations[i];
      c2.relations.splice(i, 1);
      /* 双向：对方那边也删掉 */
      if (removed) {
        const other = db.characters.find(x => x.id === removed.targetId);
        if (other && Array.isArray(other.relations)) {
          other.relations = other.relations.filter(r => r.targetId !== c2.id);
        }
      }
      saveDB();
      renderRelations();
    });
  });
}

/* ---------- 关系：添加 ---------- */
function openRelSheet() {
  const c = currentChar();
  if (!c) return;

  const others = db.characters.filter(x => x.bookId === c.bookId && x.id !== c.id);

  if (!others.length) {
    showMessage('【提示】这本书还没有别的角色，先建一个再连关系。');
    return;
  }

  let pickedId = null;

  openSheet(`
    <div class="sheet-title">添加关系 <span class="sheet-sub">双向自动同步</span></div>

    <div class="look-label">对方是谁</div>
    <div class="chips" id="relPeople">
      ${others.map(o => `<button class="chip rel-chip" data-id="${o.id}" type="button">${esc(o.name || '未命名')}</button>`).join('')}
    </div>

    <div class="sheet-row" style="margin-top:10px;">
      <label class="sheet-field">他 / 她 是我的
        <input class="field-input" id="relLabel" type="text" placeholder="如：侄子、师父、朋友">
      </label>
      <label class="sheet-field">在我这边，我是他的
        <input class="field-input" id="relReverse" type="text" placeholder="如：叔叔">
      </label>
    </div>

    <div class="sheet-field" style="margin-top:10px;">
      一句说明（写清关系，AI 才不会猜错）
      <textarea class="field-input" id="relNote" rows="2"
        placeholder="如：天明是他一手带大的，严厉但护着"></textarea>
    </div>

    <button class="btn btn-primary" id="relSave" type="button" style="margin-top:14px;">保存</button>
  `, (body) => {
    const people = body.querySelector('#relPeople');
    const labelInput = body.querySelector('#relLabel');
    const revInput = body.querySelector('#relReverse');
    const noteInput = body.querySelector('#relNote');

    people.querySelectorAll('.rel-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        pickedId = chip.dataset.id;
        people.querySelectorAll('.rel-chip').forEach(x => x.classList.toggle('selected', x === chip));
      });
    });

    /* 称谓一变，自动配对反向称谓 */
    labelInput.addEventListener('input', () => {
      const v = labelInput.value.trim();
      if (REVERSE_LABELS[v]) revInput.value = REVERSE_LABELS[v];
    });

    body.querySelector('#relSave').addEventListener('click', () => {
      const ch = currentChar();
      if (!ch) return;
      if (!pickedId) { alert('先选一个人'); return; }
      const label = labelInput.value.trim();
      if (!label) { alert('写上他/她是你的什么人，比如"侄子"'); return; }

      const reverse = revInput.value.trim() || REVERSE_LABELS[label] || '';
      const note = noteInput.value.trim();

      ch.relations = ch.relations || [];
      ch.relations.push({ targetId: pickedId, label: label, reverse: reverse, note: note });

      /* 双向：对方也加一条 */
      const other = db.characters.find(x => x.id === pickedId);
      if (other) {
        other.relations = other.relations || [];
        const exists = other.relations.some(r => r.targetId === ch.id);
        if (!exists) {
          other.relations.push({
            targetId: ch.id,
            label: reverse || '（未填）',
            reverse: label,
            note: ''
          });
        }
      }

      saveDB();
      closeSheet();
      renderRelations();
    });
  });
}

/* 外貌构造器：分块点选，拼成一句，填回外貌；每类可自己加词 */
function openLookBuilder() {
  const custom = db.lookCustom || {};

  /* 运行时清单 = 预设 + 自己加过的词 */
  const runtime = LOOK_PARTS.map(g => ({
    label: g.label,
    items: g.items.concat(custom[g.label] || [])
  }));

  const selected = new Set();   // 选中的词，键是 "类名::词"

  openSheet(`
    <div class="sheet-title">外貌构造 <span class="sheet-sub">点选，自动拼成一句</span></div>
    <div id="lookGroups"></div>
    <div class="field" style="margin-top:12px;margin-bottom:0;">
      <div class="field-label"><span>拼出来的样子</span></div>
      <textarea class="field-input" id="lookPreview" rows="3" placeholder="上面点选后，这里会自动拼好"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-ghost" id="lookCancel" type="button">取消</button>
      <button class="btn btn-primary" id="lookApply" type="button">填进外貌</button>
    </div>
  `, (body) => {
    const wrap = body.querySelector('#lookGroups');
    const preview = body.querySelector('#lookPreview');

    function render() {
      wrap.innerHTML = runtime.map((g, gi) => `
        <div class="look-group">
          <div class="look-label">${g.label}</div>
          <div class="chips">
            ${g.items.map((it, ii) => {
              const on = selected.has(g.label + '::' + it);
              return `<button class="chip look-chip ${on ? 'selected' : ''}"
                        data-g="${gi}" data-i="${ii}" type="button">${esc(it)}</button>`;
            }).join('')}
            <button class="chip look-chip look-add" data-add="${gi}" type="button">＋</button>
          </div>
          <div class="look-add-row" id="addRow${gi}" style="display:none;">
            <input class="field-input" id="addInput${gi}" type="text"
                   placeholder="自己加一个词，如：络腮胡">
            <button class="btn btn-primary look-add-ok" data-ok="${gi}" type="button">加</button>
          </div>
        </div>
      `).join('');
      bind();
    }

    /* 按"类→词"的固定顺序拼，保证语序稳定 */
    function rebuild() {
      const parts = [];
      runtime.forEach(g => {
        g.items.forEach(it => {
          if (selected.has(g.label + '::' + it)) parts.push(it);
        });
      });
      preview.value = parts.length ? parts.join('，') + '。' : '';
    }

    function bind() {
      /* 点词：选中/取消 */
      wrap.querySelectorAll('.look-chip:not(.look-add)').forEach(chip => {
        chip.addEventListener('click', () => {
          const g = runtime[+chip.dataset.g];
          const it = g.items[+chip.dataset.i];
          const key = g.label + '::' + it;
          if (selected.has(key)) selected.delete(key);
          else selected.add(key);
          chip.classList.toggle('selected');
          rebuild();
        });
      });

      /* 点＋：展开输入行 */
      wrap.querySelectorAll('[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          const gi = btn.dataset.add;
          const row = wrap.querySelector('#addRow' + gi);
          const input = wrap.querySelector('#addInput' + gi);
          row.style.display = 'flex';
          input.value = '';
          input.focus();
        });
      });

      /* 点"加"：存进自定义词库 */
      wrap.querySelectorAll('[data-ok]').forEach(btn => {
        btn.addEventListener('click', () => {
          const gi = +btn.dataset.ok;
          const input = wrap.querySelector('#addInput' + gi);
          const word = input.value.trim();
          if (!word) return;

          const g = runtime[gi];
          if (!g.items.includes(word)) {
            g.items.push(word);
            db.lookCustom = db.lookCustom || {};
            db.lookCustom[g.label] = (db.lookCustom[g.label] || []).concat(word);
            saveDB();
          }
          selected.add(g.label + '::' + word);
          render();
          rebuild();
        });
      });
    }

    render();
    rebuild();

    body.querySelector('#lookApply').addEventListener('click', () => {
      const text = preview.value.trim();
      if (!text) return;
      const ch = currentChar();
      if (!ch) return;
      ch.appearance = text;
      const el = document.querySelector('#charDetailBody textarea[data-field="appearance"]');
      if (el) el.value = text;
      saveDB();
      closeSheet();
      clearResults();
    });

    body.querySelector('#lookCancel').addEventListener('click', closeSheet);
  });
}

/* 灯泡弹层：浮动定位到被点的灯泡下方 */
function togglePopoverAt(bulb) {
  if (bulbMenu.classList.contains('open') && activeBulb === bulb) {
    closePopover();
    return;
  }
  if (activeBulb) activeBulb.classList.remove('open');
  activeBulb = bulb;
  bulb.classList.add('open');

  const r = bulb.getBoundingClientRect();
  const w = 168, h = 160;   // 弹层大约的宽高（多了"调提示词"一行，高度变大了）
  let left = r.right - w;
  if (left < 8) left = 8;
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);

  bulbMenu.style.left = left + 'px';
  bulbMenu.style.top = top + 'px';
  bulbMenu.classList.add('open');
}

function closePopover() {
  bulbMenu.classList.remove('open');
  if (activeBulb) activeBulb.classList.remove('open');
}

/* 点空白处关闭 */
document.addEventListener('click', (e) => {
  if (!bulbMenu.contains(e.target) && !e.target.classList.contains('bulb')) closePopover();
});

/* 灯泡里的四个动作 */
bulbMenu.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    closePopover();
    if (act === 'polish') runAI('polish');
    else if (act === 'expand') openExpandSheet();
    else if (act === 'style') openStyleSheet();
    else if (act === 'other') openOtherSheet();
    else if (act === 'review') runReview();
    else if (act === 'peek') openPeekSheet();
    else if (act === 'tune') openPromptSheet();
  });
});

/* ============================================================
   F. AI 调用（真接口）
   ============================================================ */

/* 角色字段的中文名（喂给 AI 时用） */
const CHAR_FIELD_LABELS = {
  name: '名字', aliases: '别名', category: '分类', identity: '身份职业',
  oneLine: '一句话人设', appearance: '外貌', personality: '性格',
  speech: '说话方式', want: '想要什么', flaw: '弱点', secret: '秘密', notes: '备注'
};

/* 把整张角色卡拼成文本；跳过"正在写的那一项"（它已经在原文里了） */
function buildCharCard(ch, excludeField) {
  const lines = [];
  Object.keys(CHAR_FIELD_LABELS).forEach(k => {
    if (k === excludeField) return;
    const v = String(ch[k] == null ? '' : ch[k]).trim();
    if (!v) return;
    lines.push(CHAR_FIELD_LABELS[k] + '：' + v);
  });
  if (!lines.length) return '';
  return '【角色卡】\n' + lines.join('\n');
}

/* 组装 system 提示词：全局 + 场景 + 任务 + 角色卡 + 书名 */
function buildSystemPrompt(sceneKey, task, payload, ch) {
  const p = db.prompts;

  const scene = p.scenes[sceneKey] || '';
  let taskText = p.tasks[task] || '';

  const pickedStyles = (payload.styleIds || [])
    .map(id => db.styles.find(s => s.id === id))
    .filter(Boolean);

  const card = ch ? buildCharCard(ch, activeField) : '';

  taskText = taskText
    .replace(/\{\{目标字数\}\}/g, payload.targetChars || 800)
    .replace(/\{\{条数\}\}/g, payload.count || 1)
    .replace(/\{\{风格提示词\}\}/g, pickedStyles.map(s => s.title + '：' + s.prompt).join('；'))
    .replace(/\{\{作者指令\}\}/g, payload.instruction || '')
    .replace(/\{\{角色卡\}\}/g, card);

  const sceneFilled = scene.replace(/\{\{角色卡\}\}/g, card);

  /* 如果提示词里自己写了 {{角色卡}}，就不再自动追加，避免重复 */
  const usedCardVar = scene.indexOf('{{角色卡}}') >= 0 || (p.tasks[task] || '').indexOf('{{角色卡}}') >= 0;

  /* 章节正文没有"当前角色"，ch 是 null → 书名得从 payload 里拿 */
  const bookId = ch ? ch.bookId : (payload.bookId || '');
  const book = db.books.find(b => b.id === bookId);
  const bookLine = book
    ? '【作品】《' + book.title + '》' + (book.genre ? '（' + book.genre + '）' : '')
    : '';

  const nowLine = '【当前正在写】' + sceneLabel(sceneKey);

  const parts = [p.global, sceneFilled, taskText];
  if (bookLine) parts.push(bookLine);

  /* 章节场景：整本书的角色表 + 前情 + 规则 */
  const isChapterScene = sceneKey.indexOf('chapter.') === 0;
  if (isChapterScene && payload.bookId) {
    const cast = buildCastText(payload.bookId);
    if (cast) parts.push(cast);
    const story = buildStorySoFar(payload.bookId, payload.chapterId);
    if (story) parts.push(story);
    const stateText = buildChapterStateText(
      payload.chapterId ? db.chapters.find(c => c.id === payload.chapterId) : null
    );
    if (stateText) parts.push(stateText);
    const rules = buildBookRules(payload.bookId);
    if (rules) parts.push(rules);
  } else {
    if (!usedCardVar && card) parts.push(card);
    const relText = ch ? buildRelationsText(ch) : '';
    if (relText) parts.push(relText);
    const rules = buildBookRules(bookId);
    if (rules) parts.push(rules);
  }
  parts.push(nowLine);
  parts.push('若生成内容与角色卡或关系表冲突，以它们为准；不要臆测出关系表以外的亲密关系。');

  return parts.filter(Boolean).join('\n\n');
}

/* 把当前角色的关系拼成文本（喂给 AI 的关键：别猜错关系） */
function buildRelationsText(c) {
  const rels = Array.isArray(c.relations) ? c.relations : [];
  const lines = [];
  rels.forEach(r => {
    const other = db.characters.find(x => x.id === r.targetId);
    if (!other) return;
    let line = '· ' + (other.name || '未命名') + '：' + r.label;
    if (r.reverse) line += '（我称他"' + r.reverse + '"）';
    if (r.note) line += ' —— ' + r.note;
    lines.push(line);
  });
  if (!lines.length) return '';
  return '【与我的关系（已确定，不要臆测成其他关系）】\n' + lines.join('\n');
}

/* 全书角色表（给正文/审稿用：每个角色一行精简卡） */
function buildCastText(bookId) {
  const list = db.characters.filter(c => c.bookId === bookId && c.name);
  if (!list.length) return '';
  const lines = list.map(c => {
    const bits = [];
    if (c.oneLine) bits.push(c.oneLine);
    if (c.identity) bits.push(c.identity);
    if (c.speech) bits.push('说话:' + c.speech.slice(0, 20));
    const rels = (c.relations || []).map(r => {
      const o = db.characters.find(x => x.id === r.targetId);
      return o ? o.name + '→' + r.label : null;
    }).filter(Boolean);
    if (rels.length) bits.push('关系:' + rels.slice(0, 3).join('，'));
    return '· ' + c.name + (bits.length ? '（' + bits.join('；') + '）' : '');
  });
  return '【本书角色表（确定关系已列出，不要臆测成其他关系）】\n' + lines.join('\n');
}

/* 前情提要：把前面所有章节的摘要拼起来，喂给 AI（治"乱写"的根） */
function buildStorySoFar(bookId, beforeChapterId) {
  const list = db.chapters
    .filter(c => c.bookId === bookId && c.id !== beforeChapterId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const lines = [];
  list.forEach((c, i) => {
    const s = String(c.summary || '').trim();
    if (!s) return;
    lines.push('第 ' + (c.order || i + 1) + ' 章《' + (c.title || '') + '》\n' + s);
  });

  if (!lines.length) return '';
  return '【前情提要（已发生的事，不要与之矛盾）】\n' + lines.join('\n\n');
}

/* 世界规则 */
function buildBookRules(bookId) {
  const book = db.books.find(b => b.id === bookId);
  const r = book && String(book.rules || '').trim();
  if (!r) return '';
  return '【世界规则（不可违反）】\n' + r;
}

/* 调一次接口 */
async function callAIOnce(system, userText) {
  const api = db.api;
  if (!api.baseUrl) throw new Error('还没填接口地址，点右上角 ⚙ 设置');
  if (!api.model) throw new Error('还没填模型名，点右上角 ⚙ 设置');
  if (!api.key) throw new Error('还没填 API Key，点右上角 ⚙ 设置');

  const url = api.baseUrl.replace(/\/+$/, '') + '/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + api.key
    },
    body: JSON.stringify({
      model: api.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ],
      temperature: 0.9
    })
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 160); } catch (e) {}
    throw new Error('接口返回 ' + res.status + (detail ? '：' + detail : ''));
  }

  const data = await res.json();
  const content = data && data.choices && data.choices[0] &&
    data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('接口返回里没有内容');
  return String(content).trim();
}

/* 主入口：点灯泡 → 这里 */
async function runAI(action, payload = {}) {
  if (!activeTarget) {
    showMessage('【提示】先在要处理的文字旁边点 💡，再选动作。');
    return;
  }

  const base = String(activeTarget.get() || '').trim();
  if (!base) {
    showMessage('【提示】这段还是空的，先写几句再让 AI 动手。');
    return;
  }

  const count = Math.min(5, Math.max(1, payload.count || 1));

  const ch = targetChar();
  const p2 = Object.assign({}, payload);
  if (activeTarget.chapterId) {
    p2.chapterId = activeTarget.chapterId;
    const cur = currentChapter();
    if (cur) p2.bookId = cur.bookId;
  }
  if (ch) p2.bookId = ch.bookId;

  track('动作·' + ({ polish: '润色', expand: '扩写', style: '风格', other: '其他' }[action] || action));

  const system = buildSystemPrompt(activeTarget.sceneKey, action, p2, ch);

  showMessage('正在生成…（' + count + ' 条）');

  try {
    const jobs = [];
    for (let i = 0; i < count; i++) {
      jobs.push(callAIOnce(system, base));
    }
    const list = await Promise.all(jobs);
    showResults(list);
  } catch (e) {
    console.error(e);
    showMessage('【出错了】' + (e && e.message ? e.message : e));
  }
}

/* 当前候选（采用时按序号取） */
let currentResults = [];

/* 显示候选列表 */
function showResults(list) {
  currentResults = list.slice();

  if (!list.length) {
    resultsWrap.innerHTML = '';
    return;
  }

  resultsWrap.innerHTML = list.map((text, i) => `
    <div class="result-card">
      <div class="result-label">方案 ${i + 1} / ${list.length}</div>
      <div class="result-text">${esc(text)}</div>
      <div class="result-actions">
        <button class="btn btn-primary" data-adopt="${i}" type="button">采用这条</button>
      </div>
    </div>
  `).join('') + `
    <button class="btn btn-ghost discard-all" data-discard="1" type="button">全部放弃</button>
  `;

  resultsWrap.querySelectorAll('[data-adopt]').forEach(btn => {
    btn.addEventListener('click', () => adoptResult(parseInt(btn.dataset.adopt, 10)));
  });
  const discardAll = resultsWrap.querySelector('[data-discard]');
  if (discardAll) discardAll.addEventListener('click', clearResults);

  resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* 只显示一条提示（不能采用） */
function showMessage(text) {
  currentResults = [];
  resultsWrap.innerHTML = `
    <div class="result-card">
      <div class="result-label">提示</div>
      <div class="result-text">${esc(text)}</div>
    </div>
  `;
  resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* 清掉所有候选 */
function clearResults() {
  currentResults = [];
  resultsWrap.innerHTML = '';
}

/* 采用第 index 条：写回当前字段 */
function adoptResult(index) {
  if (!activeTarget) return;
  const raw = currentResults[index];
  if (raw == null) return;
  activeTarget.set(raw);   // 由目标自己决定写回哪里
  clearResults();
}

/* ============================================================
   G. 底部抽屉：通用开关
   ============================================================ */
const sheet = document.getElementById('sheet');
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetBody = document.getElementById('sheetBody');

function openSheet(html, onMount) {
  sheetBody.innerHTML = html;
  sheet.classList.add('open');
  sheetBackdrop.classList.add('open');
  if (onMount) onMount(sheetBody);
}
function closeSheet() {
  sheet.classList.remove('open');
  sheetBackdrop.classList.remove('open');
}
sheetBackdrop.addEventListener('click', closeSheet);

/* ============================================================
   H. 风格选择（多选，按点击顺序叠加）
   ============================================================ */
let selectedStyleIds = [];

function openStyleSheet() {
  openSheet(`
    <div class="sheet-title">选择风格 <span class="sheet-sub">可多选，先点的在前</span></div>
    <div class="chips" id="chipWrap"></div>
    <button class="link-btn" id="goNewStyle" type="button">＋ 新建风格</button>
    <button class="btn btn-primary" id="styleConfirm" type="button">确认</button>
  `, (body) => {
    renderChips(body);

    body.querySelector('#styleConfirm').addEventListener('click', () => {
      const ids = selectedStyleIds.slice();
      closeSheet();
      if (!ids.length) {
        showMessage('【提示】你还没选风格。');
        return;
      }
      runAI('style', { styleIds: ids });
    });

    body.querySelector('#goNewStyle').addEventListener('click', () => {
      reopenStyleSheetAfterSave = true;
      closeSheet();
      showView('view-stylenew');
    });
  });
}

function renderChips(body) {
  const wrap = body.querySelector('#chipWrap');
  if (!db.styles.length) {
    wrap.innerHTML = '<div class="empty" style="width:100%">风格库是空的，先新建一个</div>';
    return;
  }
  wrap.innerHTML = db.styles.map(s => {
    const idx = selectedStyleIds.indexOf(s.id);
    const selected = idx >= 0;
    return `
      <button class="chip ${selected ? 'selected' : ''}" data-id="${s.id}" type="button">
        ${selected ? `<span class="order">${idx + 1}</span>` : ''}${esc(s.title)}
      </button>
    `;
  }).join('');

  wrap.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      const i = selectedStyleIds.indexOf(id);
      if (i >= 0) selectedStyleIds.splice(i, 1);   // 再点一次取消
      else selectedStyleIds.push(id);              // 后点的排在后面
      renderChips(body);
    });
  });
}

/* ============================================================
   I. 「扩写」：先填目标字数（默认 800，可改）
   ============================================================ */
const MIN_EXPAND_CHARS = 20;   // 原文低于这个字数，不扩写

function openExpandSheet() {
  const base = String(activeTarget ? activeTarget.get() : '').trim();
  if (base.length < MIN_EXPAND_CHARS) {
    showMessage('【提示】这段太短（' + base.length + ' 字），先写到 ' + MIN_EXPAND_CHARS + ' 字以上再扩写。');
    return;
  }
  openSheet(`
    <div class="sheet-title">扩写 <span class="sheet-sub">当前原文 ${base.length} 字</span></div>
    <div class="sheet-row">
      <label class="sheet-field">目标字数
        <input class="field-input" id="expandTarget" type="number" inputmode="numeric" value="800" min="50" max="5000">
      </label>
      <label class="sheet-field">生成几条
        <input class="field-input" id="expandCount" type="number" inputmode="numeric" value="3" min="1" max="5">
      </label>
    </div>
    <div class="sheet-sub" style="margin:8px 2px 0;">字数 50~5000　·　条数 1~5</div>
    <button class="btn btn-primary" id="expandRun" type="button" style="margin-top:14px;">确认扩写</button>
  `, (body) => {
    const target = body.querySelector('#expandTarget');
    const count = body.querySelector('#expandCount');
    setTimeout(() => target.focus(), 120);
    body.querySelector('#expandRun').addEventListener('click', () => {
      let t = parseInt(target.value, 10);
      if (!t || t < 50) t = 50;
      if (t > 5000) t = 5000;
      let c = parseInt(count.value, 10);
      if (!c || c < 1) c = 1;
      if (c > 5) c = 5;
      closeSheet();
      runAI('expand', { targetChars: t, count: c });
    });
  });
}

/* ============================================================
   J. 「其他」：自由指令
   ============================================================ */
function openOtherSheet() {
  openSheet(`
    <div class="sheet-title">想让 AI 怎么做？</div>
    <textarea class="field-input" id="otherInput" rows="3"
      placeholder="例如：把这段改成第一人称，语气更阴冷"></textarea>
    <label class="sheet-field" style="margin-top:10px;">生成几条
      <input class="field-input" id="otherCount" type="number" inputmode="numeric" value="3" min="1" max="5">
    </label>
    <button class="btn btn-primary" id="otherRun" type="button" style="margin-top:12px;">执行</button>
  `, (body) => {
    const ta = body.querySelector('#otherInput');
    const count = body.querySelector('#otherCount');
    setTimeout(() => ta.focus(), 120);
    body.querySelector('#otherRun').addEventListener('click', () => {
      const v = ta.value.trim();
      if (!v) return;
      let c = parseInt(count.value, 10);
      if (!c || c < 1) c = 1;
      if (c > 5) c = 5;
      closeSheet();
      runAI('other', { instruction: v, count: c });
    });
  });
}

/* ============================================================
   K. 风格库：列表 / 新建 / 删除
   ============================================================ */
let reopenStyleSheetAfterSave = false;

document.getElementById('openStyleLib').addEventListener('click', () => {
  renderStyleList();
  showView('view-styles');
});
document.getElementById('addStyleBtn').addEventListener('click', () => {
  reopenStyleSheetAfterSave = false;
  openNewStyleForm();
});

function renderStyleList() {
  const body = document.getElementById('styleListBody');
  if (!db.styles.length) {
    body.innerHTML = '<div class="empty">风格库还是空的<br>点右上角「＋」建第一个风格</div>';
    return;
  }
  body.innerHTML = db.styles.map(s => `
    <div class="row" style="cursor:default;">
      <span class="row-icon">🎨</span>
      <span class="row-main">
        <span class="row-title">${esc(s.title)}</span>
        <span class="row-sub">${esc(s.prompt)}</span>
      </span>
      <button class="icon-btn" data-del="${s.id}" type="button"
        style="width:30px;height:30px;font-size:14px;">✕</button>
    </div>
  `).join('');

  body.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.del;
      db.styles = db.styles.filter(s => s.id !== id);
      saveDB();
      renderStyleList();
      styleCount.textContent = db.styles.length + ' 条';
    });
  });
}

/* 新建风格表单 */
const styleTitleInput = document.getElementById('styleTitleInput');
const stylePromptInput = document.getElementById('stylePromptInput');
const titleCount = document.getElementById('titleCount');

function openNewStyleForm() {
  styleTitleInput.value = '';
  stylePromptInput.value = '';
  updateTitleCount();
  showView('view-stylenew');
}

function updateTitleCount() {
  const len = styleTitleInput.value.length;
  titleCount.textContent = len + ' / 4';
  titleCount.classList.toggle('over', len > 4);
}
/* 中文输入法的坑：打拼音时字母会先进输入框（"组合中"状态）。
   如果在组合过程中截断，中文就永远提交不进来。
   所以：组合中不截断，等 compositionend（中文落定）之后再截。 */
let titleComposing = false;

styleTitleInput.addEventListener('compositionstart', () => {
  titleComposing = true;
});

styleTitleInput.addEventListener('compositionend', () => {
  titleComposing = false;
  truncateStyleTitle();
  updateTitleCount();
});

styleTitleInput.addEventListener('input', () => {
  // 只有不在打拼音的时候，才真的截断
  if (!titleComposing) truncateStyleTitle();
  updateTitleCount();
});

function truncateStyleTitle() {
  if (styleTitleInput.value.length > 4) {
    styleTitleInput.value = styleTitleInput.value.slice(0, 4);
  }
}

document.getElementById('saveStyleBtn').addEventListener('click', () => {
  const title = styleTitleInput.value.trim();
  const prompt = stylePromptInput.value.trim();
  if (!title) { alert('先给风格起个标题'); return; }
  if (!prompt) { alert('写一句风格提示词，AI 才知道怎么改'); return; }

  db.styles.push({ id: uid('s'), title, prompt });
  saveDB();
  styleCount.textContent = db.styles.length + ' 条';

  // 回到来的地方；如果是从风格选择面板来的，再把面板打开
  goBack();
  if (reopenStyleSheetAfterSave) {
    reopenStyleSheetAfterSave = false;
    openStyleSheet();
  }
});

/* ============================================================
   K2. 提示词：就近可调 + AI 设置
   ============================================================ */

/* 点「👁 看这次会发给 AI 什么」：把真实要发的提示词整段显示出来 */
function openPeekSheet() {
  if (!activeTarget) {
    showMessage('【提示】先在要处理的文字旁边点 💡。');
    return;
  }

  const sceneKey = activeTarget.sceneKey;
  const ch = targetChar();
  const isChapter = sceneKey.indexOf('chapter.') === 0;

  /* 润色这一档的 payload 只有默认值，够用来预览结构 */
  const payload = {};
  if (activeTarget.chapterId) {
    payload.chapterId = activeTarget.chapterId;
    const cur = currentChapter();
    if (cur) payload.bookId = cur.bookId;
  }
  if (ch) payload.bookId = ch.bookId;

  const system = buildSystemPrompt(sceneKey, 'polish', payload, ch);
  const card = ch ? buildCharCard(ch, activeField) : '';
  const relText = ch ? buildRelationsText(ch) : '';
  const userText = String(activeTarget.get() || '').trim();

  openSheet(`
    <div class="sheet-title">这次会发给 AI 什么 <span class="sheet-sub">${esc(sceneLabel(sceneKey))}</span></div>
    <div class="peek-note">下面是完整内容。<b>看不到【与我的关系】就说明关系没注入。</b></div>

    <div class="look-label">① 系统提示词（system）</div>
    <pre class="peek-box" id="peekSystem"></pre>

    <div class="look-label" style="margin-top:12px;">② 你这段原文（user）</div>
    <pre class="peek-box" id="peekUser"></pre>

    <div class="peek-checks" id="peekChecks"></div>

    <button class="btn btn-primary" id="peekClose" type="button" style="margin-top:14px;">知道了</button>
  `, (body) => {
    body.querySelector('#peekSystem').textContent = system;
    body.querySelector('#peekUser').textContent = userText || '（这一段还是空的）';

    /* 自动体检：几样关键内容在不在 */
    const checks = [
      { name: '全局输出规则', ok: system.indexOf('只输出结果文本') >= 0 },
      { name: '场景引导（这一项）', ok: !!db.prompts.scenes[sceneKey] },
      { name: isChapter ? '本章素材 / 前情' : '角色卡', ok: isChapter ? (system.indexOf('【本章状态') >= 0 || system.indexOf('【前情提要') >= 0) : !!card },
      { name: '关系表', ok: isChapter ? true : !!relText },
      { name: '书名 / 题材', ok: system.indexOf('【作品】') >= 0 },
      { name: '原文非空', ok: !!userText }
    ];

    body.querySelector('#peekChecks').innerHTML = checks.map(c =>
      `<span class="peek-chip ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'} ${c.name}</span>`
    ).join('');

    body.querySelector('#peekClose').addEventListener('click', closeSheet);
  });
}

/* 点灯泡弹层里的「⚙ 调这一项的提示词」→ 就地编辑当前场景 */
function openPromptSheet() {
  if (!activeTarget) {
    showMessage('【提示】先在要处理的文字旁边点 💡。');
    return;
  }
  const sceneKey = activeTarget.sceneKey;
  const saved = db.prompts.scenes[sceneKey] || '';
  const defaults = defaultPrompts();

  if (!defaults.scenes[sceneKey]) {
    showMessage('【提示】这一项还没有对应的提示词模板（key：' + sceneKey + '）');
    return;
  }

  openSheet(`
    <div class="sheet-title">调提示词 <span class="sheet-sub">${esc(sceneLabel(sceneKey))}</span></div>

    <div class="sheet-field" style="margin-bottom:12px;">
      这一项的引导语
      <textarea class="field-input" id="scenePrompt" rows="5"></textarea>
    </div>

    <details class="block">
      <summary>全局规则（所有调用共用）</summary>
      <div style="padding:12px 14px 14px;">
        <textarea class="field-input" id="globalPrompt" rows="7"></textarea>
      </div>
    </details>

    <div class="sheet-sub" style="margin:4px 2px 12px;line-height:1.8;">
      · 角色卡会自动带上（除了你正在写的这一项），所以可以写"参考身份生成服饰"<br>
      · 想自己控制位置，就在提示词里写 <b>{{角色卡}}</b><br>
      · 调优套路：多做了什么写"禁止"，少做了什么写"必须"，不像就给例子
    </div>

    <div style="display:flex;gap:8px;">
      <button class="btn btn-ghost" id="resetPrompt" type="button">恢复默认</button>
      <button class="btn btn-primary" id="savePrompt" type="button">保存</button>
    </div>
  `, (body) => {
    const sceneTa = body.querySelector('#scenePrompt');
    const globalTa = body.querySelector('#globalPrompt');
    sceneTa.value = saved;
    globalTa.value = db.prompts.global;

    body.querySelector('#savePrompt').addEventListener('click', () => {
      db.prompts.scenes[sceneKey] = sceneTa.value;
      db.prompts.global = globalTa.value;
      saveDB();
      closeSheet();
      showMessage('提示词已保存，下次点灯泡就生效。');
    });

    body.querySelector('#resetPrompt').addEventListener('click', () => {
      const d = defaultPrompts();
      sceneTa.value = d.scenes[sceneKey] || '';
      globalTa.value = d.global;
    });
  });
}

/* ---- AI 设置页 ---- */
function openSettings() {
  document.getElementById('apiBaseUrl').value = db.api.baseUrl || '';
  document.getElementById('apiModel').value = db.api.model || '';
  document.getElementById('apiKey').value = db.api.key || '';
  document.getElementById('apiResult').textContent = '';
  showView('view-settings');
}

document.getElementById('openSettings').addEventListener('click', openSettings);

/* 保存设置 */
document.getElementById('saveApi').addEventListener('click', () => {
  db.api.baseUrl = document.getElementById('apiBaseUrl').value.trim();
  db.api.model = document.getElementById('apiModel').value.trim();
  db.api.key = document.getElementById('apiKey').value.trim();
  saveDB();
  const out = document.getElementById('apiResult');
  out.textContent = '已保存 ✅';
});

/* 测试连接 */
document.getElementById('testApi').addEventListener('click', async () => {
  const out = document.getElementById('apiResult');

  // 先按输入框里的值临时保存，免得用户忘了点保存
  db.api.baseUrl = document.getElementById('apiBaseUrl').value.trim();
  db.api.model = document.getElementById('apiModel').value.trim();
  db.api.key = document.getElementById('apiKey').value.trim();
  saveDB();

  out.textContent = '正在测试…';

  try {
    const reply = await callAIOnce('你是一个测试助手。只回四个字。', '说"连接正常"四个字。');
    out.textContent = '✅ 连接正常。AI 回复：' + reply.slice(0, 40);
  } catch (e) {
    console.error(e);
    out.textContent = '❌ 失败：' + (e && e.message ? e.message : e);
  }
});

/* ============================================================
   K2b. 角色整卡体检：先检查（不动笔），再润色（只改表达）
   ============================================================ */

/* 表达类字段：可以润色（只改字句） */
const POLISH_FIELDS = ['oneLine', 'appearance', 'personality', 'speech', 'notes'];
/* 设定类字段：一律不润色，怕改跑剧情 */
const SETTING_FIELDS = ['identity', 'aliases', 'want', 'flaw', 'secret'];

const CHECK_SYSTEM = [
  '你是一个严格的中文小说角色设定审稿人。你只挑毛病，不改写。',
  '',
  '【只输出 JSON】不要解释、不要代码块。格式：',
  '{"issues":[{"kind":"contradict|vague|missing|clash","fields":["appearance"],"quote":"相关原文（可空）","problem":"问题是什么（20字内）","advice":"该怎么改（30字内）"}]}',
  '',
  '【四类问题】',
  'contradict：同一张卡里两项自相矛盾（如身份是修鞋匠，外貌却写华服玉冠）',
  'vague：写了等于没写（如"性格：善良""想要什么：变强"）',
  'missing：关键项空着（主角没有秘密、没有弱点、没有说话方式）',
  'clash：与本书其他角色或常识明显冲突',
  '',
  '【规则】',
  '1. 最多 8 条，按严重程度排序',
  '2. 没有问题就返回 {"issues":[]}',
  '3. fields 用英文字段名：oneLine/appearance/personality/speech/identity/aliases/want/flaw/secret/notes'
].join('\n');

const CHECK_KINDS = {
  contradict: { label: '矛盾', color: 'red' },
  vague:      { label: '笼统', color: 'orange' },
  missing:    { label: '缺项', color: 'blue' },
  clash:      { label: '冲突', color: 'purple' }
};

const POLISH_SYSTEM = [
  '你是一个中文小说角色设定的文字编辑。你只改表达，绝不改设定。',
  '',
  '【绝对禁止】',
  '1. 不新增任何事实、地名、人名、数字、背景',
  '2. 不改变性格取向、动机、秘密的内容',
  '3. 不把一句话扩写成一段（长度最多增加 50%）',
  '',
  '【只输出 JSON】格式：',
  '{"items":[{"field":"appearance","before":"原句","after":"改后"}]}',
  '',
  '【只处理这些字段】oneLine / appearance / personality / speech / notes',
  '不需要改的字段就不要出现在结果里。'
].join('\n');

/* 打开体检面板 */
document.getElementById('charCheckBtn').addEventListener('click', openCharCheck);

function charCardText(c) {
  const lines = [];
  Object.keys(CHAR_FIELD_LABELS).forEach(k => {
    const v = String(c[k] == null ? '' : c[k]).trim();
    if (!v) { lines.push('【' + CHAR_FIELD_LABELS[k] + '】（空）'); return; }
    lines.push('【' + CHAR_FIELD_LABELS[k] + '】' + v);
  });
  return lines.join('\n');
}

function openCharCheck() {
  const c = currentChar();
  if (!c) return;
  const wrap = document.getElementById('resultsWrap');
  wrap.innerHTML = `
    <div class="review-panel">
      <div class="review-head">整卡体检</div>
      <div class="empty" style="padding:8px 0 14px;line-height:1.9;">
        先「检查」找出矛盾和空项，再「润色」只改表达。
        <br>设定类字段（秘密 / 想要什么 / 弱点 / 身份 / 别名）不会被润色。
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" id="doCheck" type="button">① 检查</button>
        <button class="btn btn-primary" id="doPolish" type="button">② 润色</button>
      </div>
    </div>
  `;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('doCheck').addEventListener('click', runCharCheck);
  document.getElementById('doPolish').addEventListener('click', runCharPolish);
}

/* ---------- ① 检查 ---------- */
function parseJSONBlock(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

async function runCharCheck() {
  const c = currentChar();
  if (!c) return;
  const wrap = document.getElementById('resultsWrap');

  const book = db.books.find(b => b.id === c.bookId);
  const others = db.characters
    .filter(x => x.bookId === c.bookId && x.id !== c.id && x.name)
    .map(x => x.name + '：' + (x.oneLine || '') + (x.identity ? '／' + x.identity : ''))
    .join('\n');

  const system = [
    CHECK_SYSTEM,
    '【作品】' + (book ? '《' + book.title + '》' : ''),
    others ? '【本书其他角色】\n' + others : '（本书暂无其他角色）'
  ].join('\n\n');

  wrap.innerHTML = `<div class="review-panel"><div class="review-head">整卡体检</div>
    <div class="empty">正在检查…</div></div>`;

  try {
    const reply = await callAIOnce(system, charCardText(c));
    const obj = parseJSONBlock(reply);
    const issues = Array.isArray(obj.issues) ? obj.issues.slice(0, 8) : [];
    renderCheckResult(issues);
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="review-panel"><div class="review-head">整卡体检</div>
      <div class="empty" style="text-align:left;white-space:pre-wrap;">【出错了】${esc(e.message || e)}</div></div>`;
  }
}

function renderCheckResult(issues) {
  const wrap = document.getElementById('resultsWrap');

  if (!issues.length) {
    wrap.innerHTML = `<div class="review-panel">
      <div class="review-head">检查结果</div>
      <div class="empty">没挑出问题 👍 可以去点「② 润色」了。</div>
      <div style="margin-top:12px;">
        <button class="btn btn-primary" id="goPolish" type="button">去润色</button>
      </div>
    </div>`;
    const b = document.getElementById('goPolish');
    if (b) b.addEventListener('click', runCharPolish);
    return;
  }

  wrap.innerHTML = `
    <div class="review-panel">
      <div class="review-head">检查结果 · ${issues.length} 条</div>
      <div id="checkCards">
        ${issues.map((it, i) => {
          const k = CHECK_KINDS[it.kind] || CHECK_KINDS.vague;
          const fieldNames = (it.fields || [])
            .map(f => CHAR_FIELD_LABELS[f] || f).join(' / ');
          return `
            <div class="issue">
              <div class="issue-top">
                <span class="lg lg-${k.color}">${k.label}</span>
                <span class="issue-reason">${esc(fieldNames)}</span>
              </div>
              ${it.quote ? `<div class="issue-quote">${esc(it.quote)}</div>` : ''}
              <div class="issue-problem">${esc(it.problem || '')}</div>
              <div class="issue-suggest">${esc(it.advice || '')}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-ghost" id="againCheck" type="button">重新检查</button>
        <button class="btn btn-primary" id="goPolish" type="button">去润色</button>
      </div>
    </div>
  `;

  document.getElementById('againCheck').addEventListener('click', runCharCheck);
  document.getElementById('goPolish').addEventListener('click', runCharPolish);
}

/* ---------- ② 润色（只改表达类字段） ---------- */
async function runCharPolish() {
  const c = currentChar();
  if (!c) return;
  const wrap = document.getElementById('resultsWrap');

  const payloadLines = POLISH_FIELDS
    .map(k => {
      const v = String(c[k] || '').trim();
      return v ? '【' + CHAR_FIELD_LABELS[k] + '】' + v : '';
    })
    .filter(Boolean);

  if (!payloadLines.length) {
    wrap.innerHTML = `<div class="review-panel"><div class="review-head">润色</div>
      <div class="empty">表达类字段都还空着，先写两句再润色。</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="review-panel"><div class="review-head">润色</div>
    <div class="empty">正在润色…</div></div>`;

  try {
    const reply = await callAIOnce(POLISH_SYSTEM, payloadLines.join('\n\n'));
    const obj = parseJSONBlock(reply);
    const items = Array.isArray(obj.items)
      ? obj.items.filter(it => it && it.field && it.after && POLISH_FIELDS.includes(it.field))
      : [];
    renderPolishResult(items);
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="review-panel"><div class="review-head">润色</div>
      <div class="empty" style="text-align:left;white-space:pre-wrap;">【出错了】${esc(e.message || e)}</div></div>`;
  }
}

let polishItems = [];

function renderPolishResult(items) {
  const wrap = document.getElementById('resultsWrap');
  polishItems = items;

  if (!items.length) {
    wrap.innerHTML = `<div class="review-panel"><div class="review-head">润色</div>
      <div class="empty">这一版没有需要改的地方。</div></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="review-panel">
      <div class="review-head">润色建议 · ${items.length} 条</div>
      <div id="polishCards">
        ${items.map((it, i) => `
          <div class="issue" data-pi="${i}">
            <div class="issue-top">
              <span class="lg lg-blue">${esc(CHAR_FIELD_LABELS[it.field] || it.field)}</span>
            </div>
            <div class="issue-quote">${esc(it.before || '')}</div>
            <div class="issue-suggest">${esc(it.after)}</div>
            <div class="issue-actions">
              <button class="mini-btn" data-pskip="${i}" type="button">忽略</button>
              <button class="mini-btn primary" data-papply="${i}" type="button">接受</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-ghost" id="polishAll" type="button">全部接受</button>
        <button class="btn btn-primary" id="polishDone" type="button">完成</button>
      </div>
    </div>
  `;

  wrap.querySelectorAll('[data-papply]').forEach(btn => {
    btn.addEventListener('click', () => applyPolish(+btn.dataset.papply));
  });
  wrap.querySelectorAll('[data-pskip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.pskip;
      polishItems[i] = null;
      const el = wrap.querySelector('.issue[data-pi="' + i + '"]');
      if (el) el.classList.add('issue-done');
    });
  });

  document.getElementById('polishAll').addEventListener('click', () => {
    polishItems.forEach((it, i) => { if (it) applyPolish(i, true); });
    renderCharDetail();
  });
  document.getElementById('polishDone').addEventListener('click', () => {
    renderCharDetail();
    wrap.innerHTML = '';
  });

  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* 接受一条润色 */
function applyPolish(i, silent) {
  const it = polishItems[i];
  const c = currentChar();
  if (!it || !c) return;

  c[it.field] = it.after;
  saveDB();

  polishItems[i] = null;

  if (!silent) {
    const el = document.querySelector('#resultsWrap .issue[data-pi="' + i + '"]');
    if (el) el.classList.add('issue-done');
    /* 把内容同步回页面上的输入框 */
    const box = document.querySelector('#charDetailBody textarea[data-field="' + it.field + '"], #charDetailBody input[data-field="' + it.field + '"]');
    if (box) box.value = it.after;
  }
}

/* ============================================================
   K3. 章节：列表 / 详情 / 正文 / 审稿
   ============================================================ */
let activeChapterId = null;

function currentChapter() {
  return db.chapters.find(c => c.id === activeChapterId) || null;
}

function bookChapters(bookId) {
  return db.chapters
    .filter(c => c.bookId === bookId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/* 打开章节列表 */
function openChapterList() {
  renderChapterList();
  showView('view-chapterlist');
}

function renderChapterList() {
  const book = currentBook();
  const body = document.getElementById('chapterListBody');
  if (!book) return;

  document.getElementById('chapterListTitle').textContent = '章节 · ' + book.title;

  const list = bookChapters(book.id);

  if (!list.length) {
    body.innerHTML = '<div class="empty">还没有章节<br>点右上角「＋」新建一章</div>';
    return;
  }

  body.innerHTML = list.map((c, i) => {
    const words = (c.text || '').replace(/\s/g, '').length;
    const preview = (c.text || '').replace(/\s/g, '').slice(0, 30);
    return `
      <button class="row" data-cid="${c.id}" type="button">
        <span class="row-icon">📄</span>
        <span class="row-main">
          <span class="row-title">${esc(c.title || ('第 ' + (i + 1) + ' 章'))}</span>
          <span class="row-sub">${esc(preview) || '还没开始写'}</span>
        </span>
        <span class="book-tag">${words} 字</span>
        <span class="row-arrow">›</span>
      </button>
    `;
  }).join('');

  body.querySelectorAll('[data-cid]').forEach(btn => {
    btn.addEventListener('click', () => openChapter(btn.dataset.cid));
  });
}

/* 新建章节：唯一的章节工厂（加字段只改这里） */
function newChapter(bookId, order) {
  return {
    id: uid('ch'), bookId: bookId,
    title: '第 ' + order + ' 章', goal: '', text: '',
    order: order, summary: '',
    events: [],              /* 老版本的"事件工作台"，留着不删，只是不再显示 */
    state: newChapterState()
  };
}

/* 本章状态：这一章里，谁出场 / 在哪 / 用了什么 / 伏笔怎么走 */
function newChapterState() {
  return {
    charIds: [],       /* 出场人物 */
    regionId: '',      /* 发生地点（地图里的某个区域） */
    itemIds: [],       /* 出场道具 */
    fore: [],          /* 伏笔：[{ id, mode: 'plant' | 'push' | 'payoff' }] */
    draft: [],         /* AI 总结出来、还没写回素材库的新状态 */
    summary: ''        /* 本章状态一句话 */
  };
}

/* 老章节没有 state → 就地补一个，不用迁移数据 */
function chapterState(ch) {
  if (!ch) return newChapterState();
  if (!ch.state || typeof ch.state !== 'object') ch.state = newChapterState();
  const s = ch.state;
  s.charIds = Array.isArray(s.charIds) ? s.charIds : [];
  s.itemIds = Array.isArray(s.itemIds) ? s.itemIds : [];
  s.fore = Array.isArray(s.fore) ? s.fore : [];
  s.draft = Array.isArray(s.draft) ? s.draft : [];
  if (typeof s.regionId !== 'string') s.regionId = '';
  if (typeof s.summary !== 'string') s.summary = '';
  return s;
}

document.getElementById('addChapterBtn').addEventListener('click', () => {
  const book = currentBook();
  if (!book) return;
  const n = bookChapters(book.id).length + 1;
  const ch = newChapter(book.id, n);
  db.chapters.push(ch);
  book.chapters = bookChapters(book.id).length;
  saveDB();
  openChapter(ch.id);
});

/* 打开一章 */
function openChapter(id) {
  activeChapterId = id;
  activeField = 'text';
  activeTarget = targetFromChapter();
  clearResults();
  closePopover();
  document.getElementById('reviewWrap').innerHTML = '';
  renderChapter();
  showView('view-chapter');
}

function renderChapter() {
  const ch = currentChapter();
  if (!ch) return;

  document.getElementById('chapterTitle').textContent = ch.title || '未命名章节';
  updateWordCount();

  const body = document.getElementById('chapterBody');
  body.innerHTML = `
    <div class="field">
      <div class="field-label"><span>章标题</span></div>
      <input class="field-input name-input" data-cf="title" type="text" placeholder="第 1 章">
    </div>

    <div class="panel" style="margin-bottom:14px;">
      <div class="panel-label">本章状态 <span class="hint">调取素材 · 写完回填</span></div>
      <div id="stateBox"></div>
      <button class="link-btn" id="openStateBtn" type="button" style="margin-bottom:0;">＋ 调取素材</button>
      <div id="stateDraft"></div>
      <button class="btn btn-ghost" id="genStateBtn" type="button" style="margin-top:10px;">总结本章状态</button>
    </div>

    <div class="field">
      <div class="field-label">
        <span>正文</span>
        <span class="label-actions">
          <button class="bulb" id="chapterBulb" type="button">💡</button>
        </span>
      </div>
      <textarea class="field-input body-input" data-cf="text" rows="16"
        placeholder="就从这里开始写。写累了点上面的 💡，让它看看你写的这段。"></textarea>
    </div>

    <div class="panel" style="margin-bottom:0;">
      <div class="panel-label">本章总结 <span class="hint">喂给 AI 的记忆，防乱写</span></div>
      <div id="summaryBox"></div>
      <button class="btn btn-primary" id="genSummaryBtn" type="button">生成章节总结</button>
    </div>
  `;

  renderChapterState();
  renderStateDraft();
  renderSummary();

  document.getElementById('openStateBtn').addEventListener('click', openStateSheet);
  document.getElementById('genStateBtn').addEventListener('click', genChapterState);

  body.querySelectorAll('[data-cf]').forEach(el => {
    el.value = ch[el.dataset.cf] || '';
    el.addEventListener('input', () => {
      const c = currentChapter();
      if (!c) return;
      c[el.dataset.cf] = el.value;
      if (el.dataset.cf === 'title') {
        document.getElementById('chapterTitle').textContent = el.value || '未命名章节';
      }
      if (el.dataset.cf === 'text') updateWordCount();
      saveDB();
    });
  });

  document.getElementById('chapterBulb').addEventListener('click', (e) => {
    e.stopPropagation();
    activeField = 'text';
    activeTarget = targetFromChapter();
    togglePopoverAt(e.currentTarget);
  });
}

function updateWordCount() {
  const ch = currentChapter();
  if (!ch) return;
  const n = (ch.text || '').replace(/\s/g, '').length;
  document.getElementById('chapterWords').textContent = n + ' 字';
}

/* ============================================================
   K3b. 本章状态（工作台）
   ------------------------------------------------------------
   正文上方那块不再叫"事件工作台"，改成本章状态：
   把素材库里的 人物 / 地点 / 道具 / 伏笔 调进这一章，
   写完让 AI 总结出每个素材的新状态，确认后写回素材库。
   数据挂在 ch.state（见 newChapterState()），老章节没有就自动补。
   ============================================================ */

/* 伏笔在这一章里怎么走（三种状态） */
const FORE_MODES = {
  plant:  { label: '埋下', icon: '🌱' },
  push:   { label: '推进', icon: '↗' },
  payoff: { label: '回收', icon: '✅' }
};
function foreModeLabel(mode) {
  return (FORE_MODES[mode] || FORE_MODES.plant).label;
}

/* 素材三种"姓"，写回时要靠它找对表 */
const STATE_KINDS = {
  char:   { icon: '👥', label: '人物' },
  region: { icon: '🗺️', label: '地点' },
  item:   { icon: '🗡️', label: '道具' },
  fore:   { icon: '🧵', label: '伏笔' }
};

function stateMaterialById(kind, id) {
  if (kind === 'char') return db.characters.find(c => c.id === id) || null;
  if (kind === 'region') return regionById(id);
  if (kind === 'item') return db.items.find(i => i.id === id) || null;
  if (kind === 'fore') return db.events.find(e => e.id === id) || null;
  return null;
}

function stateMaterialName(kind, id) {
  const m = stateMaterialById(kind, id);
  if (!m) return '';
  if (kind === 'region') return regionPath(m.id);
  return m.name || m.title || '未命名';
}

/* ---------- 工作台上那一块只读展示 ---------- */

function renderChapterState() {
  const ch = currentChapter();
  const box = document.getElementById('stateBox');
  if (!ch || !box) return;

  const s = chapterState(ch);

  const chars = s.charIds
    .map(id => db.characters.find(c => c.id === id))
    .filter(Boolean);
  const items = s.itemIds
    .map(id => db.items.find(i => i.id === id))
    .filter(Boolean);
  const rg = s.regionId ? regionById(s.regionId) : null;
  const fores = s.fore
    .map(f => ({ f: f, e: db.events.find(x => x.id === f.id) }))
    .filter(x => x.e);

  const any = chars.length || items.length || rg || fores.length;

  if (!any) {
    box.innerHTML = '<div class="empty" style="padding:8px 0 12px;">这一章<b>谁出场、在哪、用了什么、哪条伏笔要走</b>，从这里调取。</div>';
    return;
  }

  box.innerHTML = [
    stateLine('👥', '出场人物',
      chars.map(c => stateChip(iconOfCategory(c.category) + ' ' + (c.name || '未命名'), 'char', c.id)),
      '还没勾人'),
    stateLine('🗺️', '发生地点',
      rg ? [stateChip('📍 ' + regionPath(rg.id), 'region', rg.id)] : [],
      '还没选地方'),
    stateLine('🗡️', '出场道具',
      items.map(i => stateChip('📦 ' + (i.name || '未命名'), 'item', i.id)),
      '还没勾道具'),
    stateLine('🧵', '伏笔状态',
      fores.map(x => foreChip(x.e, x.f.mode)),
      '这一章没有伏笔')
  ].join('');

  bindStateBox(box);
}

function stateLine(icon, label, chips, emptyText) {
  return `
    <div class="st-line">
      <div class="st-head"><span class="st-icon">${icon}</span>${label}</div>
      <div class="st-chips">
        ${chips.length ? chips.join('') : `<span class="st-empty">${emptyText}</span>`}
      </div>
    </div>`;
}

function stateChip(text, kind, id) {
  return `
    <span class="st-chip">
      <span class="st-chip-t">${esc(text)}</span>
      <button class="st-x" data-stdel="${kind}:${id}" type="button" aria-label="移除">×</button>
    </span>`;
}

/* 伏笔 chip：点中间那颗徽章循环 埋下 → 推进 → 回收 */
function foreChip(e, mode) {
  const m = FORE_MODES[mode] || FORE_MODES.plant;
  return `
    <span class="st-chip st-chip-fore">
      <button class="st-mode st-mode-${mode || 'plant'}" data-stmode="${e.id}" type="button"
        title="点一下切换：埋下 → 推进 → 回收">${m.icon} ${m.label}</button>
      <span class="st-chip-t">${esc(e.title || '未命名伏笔')}</span>
      <button class="st-x" data-stdel="fore:${e.id}" type="button" aria-label="移除">×</button>
    </span>`;
}

function bindStateBox(box) {
  box.querySelectorAll('[data-stdel]').forEach(b => {
    b.addEventListener('click', () => {
      const [kind, id] = b.dataset.stdel.split(':');
      removeFromState(currentChapter(), kind, id);
    });
  });

  box.querySelectorAll('[data-stmode]').forEach(b => {
    b.addEventListener('click', () => {
      const ch = currentChapter();
      const s = chapterState(ch);
      const f = s.fore.find(x => x.id === b.dataset.stmode);
      if (!f) return;
      const order = ['plant', 'push', 'payoff'];
      f.mode = order[(order.indexOf(f.mode) + 1) % order.length];
      saveDB();
      renderChapterState();
    });
  });
}

/* 从本章状态里去掉一个素材 */
function removeFromState(ch, kind, id) {
  if (!ch) return;
  const s = chapterState(ch);
  if (kind === 'char') s.charIds = s.charIds.filter(x => x !== id);
  if (kind === 'item') s.itemIds = s.itemIds.filter(x => x !== id);
  if (kind === 'region' && s.regionId === id) s.regionId = '';
  if (kind === 'fore') s.fore = s.fore.filter(f => f.id !== id);
  saveDB();
  renderChapterState();
}

/* ---------- 抽屉：从素材库四类里勾 ---------- */

function openStateSheet() {
  const ch = currentChapter();
  if (!ch) return;
  const book = db.books.find(b => b.id === ch.bookId);
  if (!book) return;

  const s = chapterState(ch);

  /* 抽屉里的临时选择，点保存才落到 ch.state */
  const pick = {
    chars: new Set(s.charIds),
    items: new Set(s.itemIds),
    region: s.regionId || '',
    fore: new Map(s.fore.map(f => [f.id, f.mode || 'plant']))
  };

  const pool = {
    chars: db.characters.filter(c => c.bookId === book.id),
    items: db.items.filter(i => i.bookId === book.id),
    regions: bookRegions(book.id),
    fores: bookForeshadows(book.id)
  };

  let keyword = '';

  openSheet(`
    <div class="sheet-title">调取素材 <span class="sheet-sub">勾进本章状态</span></div>
    <input class="field-input" id="stSearch" type="text" placeholder="搜名字：人物 / 地点 / 道具 / 伏笔">
    <div id="stSections" style="margin-top:14px;"></div>
    <button class="btn btn-primary" id="stSave" type="button" style="margin-top:16px;">保存本章状态</button>
  `, (body) => {
    const sections = body.querySelector('#stSections');

    const draw = () => {
      sections.innerHTML = [
        stateSection('👥', '出场人物', 'chars', pool.chars.map(c => ({
          id: c.id, text: iconOfCategory(c.category) + ' ' + (c.name || '未命名'),
          sub: c.oneLine || '', on: pick.chars.has(c.id)
        })), keyword),
        stateSection('🗺️', '发生地点', 'region', pool.regions.map(r => ({
          id: r.id, text: regionPath(r.id), sub: r.vibe || '', on: pick.region === r.id
        })), keyword),
        stateSection('🗡️', '出场道具', 'items', pool.items.map(i => ({
          id: i.id, text: i.name || '未命名', sub: i.line || '', on: pick.items.has(i.id)
        })), keyword),
        stateSection('🧵', '伏笔', 'fore', pool.fores.map(e => ({
          id: e.id, text: e.title || '未命名伏笔',
          sub: e.payoffEventId ? '已回收' : '未回收',
          on: pick.fore.has(e.id)
        })), keyword)
      ].join('');

      sections.querySelectorAll('[data-pick]').forEach(b => {
        b.addEventListener('click', () => {
          const kind = b.dataset.kind;
          const id = b.dataset.pick;
          if (kind === 'chars') {
            if (pick.chars.has(id)) pick.chars.delete(id); else pick.chars.add(id);
          } else if (kind === 'items') {
            if (pick.items.has(id)) pick.items.delete(id); else pick.items.add(id);
          } else if (kind === 'region') {
            pick.region = pick.region === id ? '' : id;   /* 地点只能选一个 */
          } else if (kind === 'fore') {
            if (pick.fore.has(id)) pick.fore.delete(id); else pick.fore.set(id, 'plant');
          }
          draw();
        });
      });
    };

    draw();

    const search = body.querySelector('#stSearch');
    search.addEventListener('input', () => {
      keyword = search.value.trim();
      draw();
    });

    body.querySelector('#stSave').addEventListener('click', () => {
      const cur = currentChapter();
      if (!cur) return;
      const st = chapterState(cur);
      st.charIds = Array.from(pick.chars);
      st.itemIds = Array.from(pick.items);
      st.regionId = pick.region;
      /* 保住原来已经调过的伏笔进度 */
      st.fore = Array.from(pick.fore.entries()).map(([id, mode]) => {
        const old = (cur.state.fore || []).find(f => f.id === id);
        return { id: id, mode: old ? (old.mode || 'plant') : mode };
      });
      saveDB();
      closeSheet();
      renderChapterState();
    });
  });
}

/* 抽屉里的一段：标题 + 可选 chips（搜索时自动过滤） */
function stateSection(icon, label, kind, list, keyword) {
  const k = (keyword || '').toLowerCase();
  const shown = k
    ? list.filter(x => (x.text + ' ' + (x.sub || '')).toLowerCase().indexOf(k) >= 0)
    : list;

  const head = `
    <div class="st-sec-head">
      <span>${icon} ${label}</span>
      <span class="st-sec-count">${list.filter(x => x.on).length} / ${list.length}</span>
    </div>`;

  if (!list.length) {
    return `${head}<div class="st-sec-empty">素材库里还没有${label}，先去书房建几个。</div>`;
  }
  if (!shown.length) {
    return `${head}<div class="st-sec-empty">没搜到</div>`;
  }

  return `
    ${head}
    <div class="st-sec-chips">
      ${shown.map(x => `
        <button class="st-pick ${x.on ? 'on' : ''}" data-kind="${kind}" data-pick="${x.id}" type="button">
          <span class="st-pick-t">${esc(x.text)}</span>
          ${x.sub ? `<span class="st-pick-s">${esc(x.sub.slice(0, 16))}</span>` : ''}
        </button>`).join('')}
    </div>`;
}

/* ============================================================
   K3c. 总结本章状态 → 写回素材库
   ------------------------------------------------------------
   AI 只允许从"本章素材清单"里挑 id，挑不到就不输出，
   作者逐条点"写回素材库"，素材上追加一条状态记录（不改原始设定）；
   想改成正式设定就点"提升为正式设定"。
   ============================================================ */

const CHAPTER_STATE_SYSTEM = [
  '你是小说编辑。读完这一章正文，更新"本章素材清单"里每个素材的状态。',
  '',
  '【只输出 JSON】不要解释，不要代码块标记。格式：',
  '{"summary":"本章状态一句话，60 字内",',
  ' "characters":[{"id":"素材 id","state":"这个人本章之后的状态：在哪、伤没伤、怎么想、知道了什么，40 字内"}],',
  ' "regions":[{"id":"素材 id","state":"这个地方现在变成了什么样，40 字内"}],',
  ' "items":[{"id":"素材 id","state":"这件东西现在在谁手里、变成什么样，30 字内"}],',
  ' "foreshadows":[{"id":"素材 id","mode":"plant|push|payoff","state":"这处伏笔本章怎么处理，30 字内"}]}',
  '',
  '【mode 含义】',
  'plant = 本章第一次埋下',
  'push = 本章推进了一步，还没兑现',
  'payoff = 本章把它圆了',
  '',
  '【规则】',
  '1. id 只能从下面给的清单里原样抄，不要编造 id',
  '2. 正文里没变化的素材不要输出',
  '3. 状态写"现在是什么样"，不要写"他做了什么"的流水账',
  '4. 不要评价文笔，不要给建议'
].join('\n');

/* 把本章调取的素材拼成带 id 的清单（AI 只认这份） */
function buildStateMaterialList(ch) {
  const s = chapterState(ch);
  const lines = [];

  s.charIds.forEach(id => {
    const c = db.characters.find(x => x.id === id);
    if (!c) return;
    const now = (c.states || []).slice(-1)[0];
    lines.push('[char] id=' + c.id + ' 名字=' + (c.name || '未命名') +
      (c.oneLine ? '，人设=' + c.oneLine : '') +
      (now ? '，上次状态=' + now.text : ''));
  });
  if (s.regionId) {
    const r = regionById(s.regionId);
    if (r) {
      const now = (r.states || []).slice(-1)[0];
      lines.push('[region] id=' + r.id + ' 名字=' + regionPath(r.id) +
        (r.vibe ? '，氛围=' + r.vibe : '') +
        (now ? '，上次状态=' + now.text : ''));
    }
  }
  s.itemIds.forEach(id => {
    const i = db.items.find(x => x.id === id);
    if (!i) return;
    const now = (i.states || []).slice(-1)[0];
    lines.push('[item] id=' + i.id + ' 名字=' + (i.name || '未命名') +
      (i.line ? '，一句=' + i.line : '') +
      (now ? '，上次状态=' + now.text : ''));
  });
  s.fore.forEach(f => {
    const e = db.events.find(x => x.id === f.id);
    if (!e) return;
    lines.push('[foreshadow] id=' + e.id + ' 名字=' + (e.title || '未命名伏笔') +
      '，本章计划=' + foreModeLabel(f.mode) +
      (e.cause ? '，原由=' + e.cause.slice(0, 30) : ''));
  });

  return lines.join('\n');
}

async function genChapterState() {
  const ch = currentChapter();
  if (!ch) return;
  const text = (ch.text || '').trim();

  if (text.length < 50) {
    alert('正文太短（' + text.length + ' 字），先多写一点再总结。');
    return;
  }

  const list = buildStateMaterialList(ch);
  if (!list) {
    alert('还没调取素材。先点「＋ 调取素材」，把人 / 地点 / 道具勾上。');
    return;
  }

  const book = db.books.find(b => b.id === ch.bookId);
  const box = document.getElementById('stateDraft');
  box.innerHTML = '<div class="empty" style="padding:8px 0;">正在总结本章状态…</div>';

  const system = [
    CHAPTER_STATE_SYSTEM,
    '【作品】' + (book ? '《' + book.title + '》' : ''),
    '【本章素材清单】\n' + list
  ].filter(Boolean).join('\n\n');

  try {
    const reply = await callAIOnce(system, '【本章正文】\n' + text.slice(0, 6000));
    const obj = parseJSONBlock(reply);
    const cur = currentChapter();
    if (!cur) return;
    const st = chapterState(cur);
    st.draft = mapStateDraft(obj, cur);
    st.summary = String(obj.summary || '').trim().slice(0, 80);
    saveDB();
    renderStateDraft();
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty" style="padding:8px 0;text-align:left;white-space:pre-wrap;">【出错了】' +
      esc(e.message || e) + '\n（也可能是模型没按要求返回 JSON）</div>';
  }
}

/* AI 的 JSON → 待写回列表（只收本章清单里真实存在的 id） */
function mapStateDraft(obj, ch) {
  const s = chapterState(ch);
  const out = [];
  const charOk = new Set(s.charIds);
  const itemOk = new Set(s.itemIds);
  const foreOk = new Set(s.fore.map(f => f.id));
  const chapTitle = ch.title || '';

  const add = (kind, id, text, mode) => {
    const t = String(text || '').trim();
    if (!t) return;
    const name = stateMaterialName(kind, id);
    if (!name) return;
    out.push({ kind: kind, id: id, name: name, text: t, mode: mode || '', chapterTitle: chapTitle, done: false });
  };

  (obj.characters || []).forEach(x => { if (x && charOk.has(x.id)) add('char', x.id, x.state); });
  (obj.regions || []).forEach(x => { if (x && s.regionId === x.id) add('region', x.id, x.state); });
  (obj.items || []).forEach(x => { if (x && itemOk.has(x.id)) add('item', x.id, x.state); });
  (obj.foreshadows || []).forEach(x => {
    if (!x || !foreOk.has(x.id)) return;
    const mode = FORE_MODES[x.mode] ? x.mode : 'push';
    add('fore', x.id, x.state, mode);
  });

  return out;
}

function renderStateDraft() {
  const ch = currentChapter();
  const box = document.getElementById('stateDraft');
  if (!ch || !box) return;

  const s = chapterState(ch);

  if (!s.draft.length) {
    box.innerHTML = s.summary
      ? `<div class="st-summary">本章状态：${esc(s.summary)}</div>`
      : '';
    return;
  }

  box.innerHTML = `
    <div class="st-summary">${s.summary ? '本章状态：' + esc(s.summary) : ''}</div>
    <div class="draft-head">AI 总结出的新状态 <span class="hint">点写回才进素材库</span></div>
    ${s.draft.map((d, i) => `
      <div class="draft-item ${d.done ? 'done' : ''}">
        <div class="draft-top">
          <span class="draft-kind">${(STATE_KINDS[d.kind] || {}).icon || '·'}</span>
          <span class="draft-name">${esc(d.name)}</span>
          ${d.mode ? `<span class="draft-mode">${foreModeLabel(d.mode)}</span>` : ''}
          ${d.done ? '<span class="draft-done">已写回</span>' : ''}
        </div>
        <div class="draft-text">${esc(d.text)}</div>
        ${d.done ? '' : `
          <div class="draft-actions">
            <button class="mini-btn primary" data-dwrite="${i}" type="button">写回素材库</button>
            <button class="mini-btn" data-dpromote="${i}" type="button">提升为正式设定</button>
            <button class="mini-btn" data-ddrop="${i}" type="button">丢弃</button>
          </div>`}
      </div>`).join('')}
    <button class="btn btn-ghost" id="writeAllBtn" type="button" style="margin-top:10px;">全部写回</button>
  `;

  box.querySelectorAll('[data-dwrite]').forEach(b =>
    b.addEventListener('click', () => writeStateDraft(+b.dataset.dwrite, false)));
  box.querySelectorAll('[data-dpromote]').forEach(b =>
    b.addEventListener('click', () => writeStateDraft(+b.dataset.dpromote, true)));
  box.querySelectorAll('[data-ddrop]').forEach(b =>
    b.addEventListener('click', () => {
      const st = chapterState(currentChapter());
      st.draft.splice(+b.dataset.ddrop, 1);
      saveDB();
      renderStateDraft();
    }));

  const all = box.querySelector('#writeAllBtn');
  if (all) all.addEventListener('click', () => {
    const st = chapterState(currentChapter());
    st.draft.forEach((d, i) => { if (!d.done) writeStateDraft(i, false, true); });
    saveDB();
    renderStateDraft();
    renderChapterState();
  });
}

/* 写回一条：素材上追加状态记录；promote=true 顺带写进正式字段 */
function writeStateDraft(i, promote, silent) {
  const ch = currentChapter();
  if (!ch) return;
  const s = chapterState(ch);
  const d = s.draft[i];
  if (!d || d.done) return;

  const target = stateMaterialById(d.kind, d.id);
  if (!target) {                     /* 素材被删了：标掉，别反复报错 */
    d.done = true;
    saveDB();
    if (!silent) renderStateDraft();
    return;
  }

  target.states = Array.isArray(target.states) ? target.states : [];
  target.states.push({
    chapterId: ch.id,
    chapterTitle: d.chapterTitle || '',
    text: d.text,
    promoted: !!promote,
    at: Date.now()
  });

  if (promote) promoteStateToSetting(d, target);

  /* 伏笔标成"回收" → 事件状态跟着改成已了结 */
  if (d.kind === 'fore') {
    const ev = target;
    if (d.mode === 'payoff') {
      ev.payoffChapterId = ch.id;
      if (!ev.payoffEventId) ev.payoffEventId = 'chapter:' + ch.id;   /* 用章节回收，引用事件那条路也认 */
      ev.status = 'done';
    } else {
      const sf = s.fore.find(f => f.id === d.id);
      if (sf) sf.mode = d.mode;
      if (ev.status === 'seed') ev.status = 'ongoing';
    }
    ev.updatedAt = Date.now();
  }

  d.done = true;
  saveDB();
  if (!silent) { renderStateDraft(); renderChapterState(); }
}

/* 提升为正式设定：追加到素材本来的描述里（带章节戳，可追溯） */
function promoteStateToSetting(d, target) {
  const stamp = '【' + (d.chapterTitle || '本章') + '后】';
  const append = (obj, key) => {
    obj[key] = (obj[key] ? obj[key] + '\n' : '') + stamp + d.text;
  };
  if (d.kind === 'char') append(target, 'notes');
  else if (d.kind === 'item') append(target, 'desc');
  else if (d.kind === 'region') append(target, 'desc');
  else if (d.kind === 'fore') append(target, 'detail');
}

/* 素材上的状态记录（角色详情 / 道具抽屉 / 区域抽屉都用它） */
function stateHistoryHtml(m, title) {
  const list = Array.isArray(m && m.states) ? m.states : [];
  if (!list.length) return '';
  const items = list.slice().reverse().map(r => `
    <div class="st-hist-item">
      <div class="st-hist-head">${esc(r.chapterTitle || '某章')}${r.promoted ? '<span class="st-hist-tag">已提升</span>' : ''}</div>
      <div class="st-hist-text">${esc(r.text)}</div>
    </div>`).join('');
  return `<div class="st-hist"><div class="st-hist-title">${title || '状态记录'}（${list.length}）</div>${items}</div>`;
}

/* 给 AI 的"本章状态"上下文：人物 / 地点 / 道具 / 伏笔 + 各自现状 */
function buildChapterStateText(ch) {
  if (!ch) return '';
  const s = chapterState(ch);
  const lines = [];

  const chars = s.charIds.map(id => db.characters.find(c => c.id === id)).filter(Boolean);
  if (chars.length) lines.push('出场人物：' + chars.map(c => c.name || '未命名').join('、'));

  const rg = s.regionId ? regionById(s.regionId) : null;
  if (rg) lines.push('发生地点：' + regionPath(rg.id) + (rg.vibe ? '（' + rg.vibe + '）' : ''));

  const items = s.itemIds.map(id => db.items.find(i => i.id === id)).filter(Boolean);
  if (items.length) {
    lines.push('出场道具：' + items.map(i => (i.name || '未命名') + (i.line ? '（' + i.line + '）' : '')).join('、'));
  }

  const fores = s.fore
    .map(f => ({ f: f, e: db.events.find(x => x.id === f.id) }))
    .filter(x => x.e);
  if (fores.length) {
    lines.push('本章伏笔：' + fores.map(x => (x.e.title || '未命名') + '·' + foreModeLabel(x.f.mode)).join('、'));
  }

  const now = [];
  chars.forEach(c => {
    const st = (c.states || []).slice(-1)[0];
    if (st) now.push(c.name + '：' + st.text);
  });
  if (now.length) lines.push('人物现状：\n· ' + now.join('\n· '));

  if (s.summary) lines.push('本章状态：' + s.summary);

  if (!lines.length) return '';
  return '【本章状态（作者已勾定，不要写到清单外的角色或地点上）】\n' + lines.join('\n');
}

/* ---------- 章节总结 ---------- */
const SUMMARY_SYSTEM = [
  '你是一个小说编辑。请为这一章写一份"前情提要"，供后续章节写作参考。',
  '',
  '【只输出三行，不要别的】',
  '发生了什么：<这一章的关键事件，不超过 60 字>',
  '关系变化：<谁和谁的关系变成了什么，没有就写"无">',
  '留下的线索：<埋下的伏笔或未解决的问题，没有就写"无">',
  '',
  '【禁止】不要评价文笔，不要给建议，不要复述原文'
].join('\n');

function renderSummary() {
  const ch = currentChapter();
  const box = document.getElementById('summaryBox');
  if (!ch || !box) return;

  if (ch.summary) {
    box.innerHTML = `<div class="summary-text">${esc(ch.summary)}</div>`;
  } else {
    box.innerHTML = '<div class="empty" style="padding:6px 0 12px;">还没有总结。写完这一章后来生成一份——<b>后面几章靠它才不会乱写</b>。</div>';
  }

  const btn = document.getElementById('genSummaryBtn');
  if (btn) btn.onclick = genSummary;
}

async function genSummary() {
  const ch = currentChapter();
  if (!ch) return;
  const text = (ch.text || '').trim();
  if (text.length < 50) {
    alert('正文太短（' + text.length + ' 字），先多写一点再总结。');
    return;
  }

  const box = document.getElementById('summaryBox');
  box.innerHTML = '<div class="empty">正在总结…</div>';

  const book = db.books.find(b => b.id === ch.bookId);
  const events = (ch.events || []).map((e, i) => (i + 1) + '. ' + e.text).join('\n');

  const system = [
    SUMMARY_SYSTEM,
    '【作品】' + (book ? '《' + book.title + '》' : ''),
    events ? '【作者列的事件大纲】\n' + events : ''
  ].filter(Boolean).join('\n\n');

  try {
    const reply = await callAIOnce(system, text.slice(0, 6000));
    const c = currentChapter();
    if (!c) return;
    c.summary = reply.trim();
    saveDB();
    renderSummary();
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty" style="text-align:left;white-space:pre-wrap;">【出错了】' + esc(e.message || e) + '</div>';
  }
}

/* ---------- 审稿：AI 当编辑 ---------- */

/* 五类问题的颜色与名称 */
const REVIEW_TYPES = {
  grammar: { label: '语法用词', color: 'red' },
  style:   { label: '文风不符', color: 'blue' },
  desc:    { label: '描写缺失', color: 'orange' },
  setting: { label: '设定冲突', color: 'purple' },
  rhythm:  { label: '节奏重复', color: 'green' }
};

const REVIEW_SYSTEM = [
  '你是一个严格但专业的中文小说编辑。你的任务是审稿，不是改写。',
  '',
  '【只输出 JSON】不要任何解释、不要代码块标记。格式：',
  '{"issues":[{"type":"grammar|style|desc|setting|rhythm","quote":"原文片段（必须与原文完全一致，10~40字）","suggest":"建议改成什么","reason":"为什么（20字内）"}]}',
  '',
  '【五类问题】',
  'grammar：病句、错别字、搭配不当、标点误用',
  'style：大白话、口语化、出戏、不符合给定文风',
  'desc：描写缺失，全是"他说""他走"，没有画面和感官',
  'setting：与角色卡或常识矛盾（如腿瘸却健步如飞）',
  'rhythm：段落过长、同一词重复、节奏拖沓',
  '',
  '【规则】',
  '1. quote 必须从原文里原样截取，不要改字，方便程序定位',
  '2. 最多 8 条，按严重程度排序',
  '3. 没有问题就返回 {"issues":[]}',
  '4. 不要整段重写，只做最小必要的修改建议'
].join('\n');

/* 从 AI 回复里抠出 JSON */
function parseReview(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  const obj = JSON.parse(s);
  if (!obj || !Array.isArray(obj.issues)) return [];
  return obj.issues.filter(it => it && it.quote).slice(0, 8);
}

async function runReview() {
  const ch = currentChapter();
  if (!ch) return;
  const text = (ch.text || '').trim();
  if (text.length < 20) {
    showReviewMessage('【提示】正文太短（' + text.length + ' 字），先写几句再让 AI 看。');
    return;
  }

  const book = db.books.find(b => b.id === ch.bookId);
  const cards = db.characters
    .filter(c => c.bookId === ch.bookId)
    .map(c => buildCharCard(c, null))
    .filter(Boolean)
    .join('\n\n');

  const system = [
    REVIEW_SYSTEM,
    '【作品】' + (book ? '《' + book.title + '》' + (book.genre ? '（' + book.genre + '）' : '') : ''),
    cards ? '【本篇可用角色卡】\n' + cards : '（暂无角色卡）'
  ].join('\n\n');

  showReviewMessage('正在审稿…');

  try {
    const reply = await callAIOnce(system, text);
    const issues = parseReview(reply);
    renderReview(issues);
  } catch (e) {
    console.error(e);
    showReviewMessage('【出错了】' + (e && e.message ? e.message : e) +
      '\n\n（如果反复失败，可能是模型没按要求返回 JSON）');
  }
}

/* 审稿结果渲染：正文标色 + 问题卡片 */
let reviewIssues = [];

function renderReview(issues) {
  reviewIssues = issues;
  const ch = currentChapter();
  const wrap = document.getElementById('reviewWrap');
  if (!ch) return;

  if (!issues.length) {
    wrap.innerHTML = `
      <div class="review-panel">
        <div class="review-head">审稿结果</div>
        <div class="empty">这一稿没挑出问题 👍 可以继续往下写。</div>
      </div>`;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  /* 在正文里把问题片段标出来（按字符串定位） */
  const text = ch.text || '';
  const marks = [];
  issues.forEach((it, i) => {
    const pos = text.indexOf(it.quote);
    if (pos >= 0) marks.push({ start: pos, end: pos + it.quote.length, idx: i });
  });
  marks.sort((a, b) => a.start - b.start);

  let html = '';
  let cursor = 0;
  marks.forEach(m => {
    if (m.start < cursor) return;                 // 重叠就跳过
    html += esc(text.slice(cursor, m.start));
    const t = REVIEW_TYPES[issues[m.idx].type] || REVIEW_TYPES.style;
    html += `<mark class="mk mk-${t.color}" data-issue="${m.idx}">` +
            esc(text.slice(m.start, m.end)) + '</mark>';
    cursor = m.end;
  });
  html += esc(text.slice(cursor));

  wrap.innerHTML = `
    <div class="review-panel">
      <div class="review-head">
        审稿结果
        <span class="review-legend">
          ${Object.keys(REVIEW_TYPES).map(k =>
            `<span class="lg lg-${REVIEW_TYPES[k].color}">${REVIEW_TYPES[k].label}</span>`
          ).join('')}
        </span>
      </div>
      <div class="review-text">${html}</div>
    </div>

    <div class="review-panel">
      <div class="review-head">共 ${issues.length} 条建议</div>
      <div id="reviewCards"></div>
    </div>
  `;

  const cards = wrap.querySelector('#reviewCards');
  cards.innerHTML = issues.map((it, i) => {
    const t = REVIEW_TYPES[it.type] || REVIEW_TYPES.style;
    return `
      <div class="issue" data-i="${i}">
        <div class="issue-top">
          <span class="lg lg-${t.color}">${t.label}</span>
          <span class="issue-reason">${esc(it.reason || '')}</span>
        </div>
        <div class="issue-quote">${esc(it.quote)}</div>
        <div class="issue-suggest">${esc(it.suggest || '')}</div>
        <div class="issue-actions">
          <button class="mini-btn" data-skip="${i}" type="button">忽略</button>
          <button class="mini-btn primary" data-apply="${i}" type="button">接受修改</button>
        </div>
      </div>
    `;
  }).join('');

  cards.querySelectorAll('[data-apply]').forEach(btn => {
    btn.addEventListener('click', () => applyIssue(+btn.dataset.apply));
  });
  cards.querySelectorAll('[data-skip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.skip;
      reviewIssues[i] = null;
      const el = cards.querySelector('.issue[data-i="' + i + '"]');
      if (el) el.classList.add('issue-done');
    });
  });

  /* 点正文里的颜色 → 滚到对应卡片 */
  wrap.querySelectorAll('.mk').forEach(mk => {
    mk.addEventListener('click', () => {
      const el = cards.querySelector('.issue[data-i="' + mk.dataset.issue + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* 接受一条建议：用建议替换原文片段 */
function applyIssue(i) {
  const it = reviewIssues[i];
  const ch = currentChapter();
  if (!it || !ch) return;

  const text = ch.text || '';
  const pos = text.indexOf(it.quote);
  if (pos < 0) {
    if (it.suggest) {
      ch.text = text + '\n' + it.suggest;
      saveDB();
      renderChapter();
      showReviewMessage('原句没找到，已把建议追加到正文末尾，你自己挪位置。');
    }
    return;
  }

  ch.text = text.slice(0, pos) + (it.suggest || '') + text.slice(pos + it.quote.length);
  saveDB();
  renderChapter();

  reviewIssues[i] = null;
  const cards = document.getElementById('reviewCards');
  const el = cards && cards.querySelector('.issue[data-i="' + i + '"]');
  if (el) el.classList.add('issue-done');
}

function showReviewMessage(text) {
  const wrap = document.getElementById('reviewWrap');
  wrap.innerHTML = `<div class="review-panel"><div class="review-head">审稿</div>
    <div class="empty" style="white-space:pre-wrap;text-align:left;">${esc(text)}</div></div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   K4. 事件库：老虎机卡片流
   ============================================================ */
const EV_STATUS = {
  seed:    { label: '未发生', color: 'blue' },
  ongoing: { label: '进行中', color: 'orange' },
  done:    { label: '已了结', color: 'green' }
};

let evFilterChar = '';    // 按角色筛选
let evFilterStatus = '';  // 按状态筛选
let evCurrentId = null;   // 当前选中的卡片（详情骨架跟着它）
let evList = [];          // 当前这一层、筛选后的顺序列表
let evParentId = '';      // 当前钻进哪条事件（'' = 停在主线列表）

function bookEvents(bookId) {
  return db.events
    .filter(e => e.bookId === bookId)
    .sort((a, b) => {
      const ca = chapterOrderOf(a.chapterId);
      const cb = chapterOrderOf(b.chapterId);
      if (ca !== cb) return ca - cb;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
}

function chapterOrderOf(chapterId) {
  if (!chapterId) return 9999;
  const c = db.chapters.find(x => x.id === chapterId);
  return c ? (c.order || 0) : 9999;
}

function openEventLib() {
  const book = currentBook();
  if (!book) return;

  evParentId = '';          /* 每次进来先看主线列表 */
  evCurrentId = null;

  if (!db.events.some(e => e.bookId === book.id)) {
    /* 第一次进来给个示例：一条主线 + 一条挂在它下面的子事件 */
    const people = db.characters.filter(c => c.bookId === book.id).slice(0, 2).map(c => c.id);
    const main = newEvent(book.id, '');
    main.title = '旧账浮出水面';
    main.cause = '林砚偷看了那封信';
    main.placeText = '城南旧桥';
    main.participants = people;
    db.events.push(main);

    const sub = newEvent(book.id, main.id);
    sub.title = '沈默与林砚在旧桥摊牌';
    sub.cause = '林砚拿那封信逼问';
    sub.placeText = '城南旧桥';
    sub.participants = people;
    db.events.push(sub);

    saveDB();
  }

  renderEventLib();
  showView('view-events');
}

function renderEventLib() {
  const book = currentBook();
  if (!book) return;

  const all = bookEvents(book.id);

  /* 进入的顶层事件被删了 / 换了书 → 退回主线列表 */
  if (evParentId && !all.some(e => e.id === evParentId)) evParentId = '';

  const top = all.filter(e => !e.parentId);

  /* 第一屏：主线大卡 */
  if (!evParentId) {
    evList = top;
    evCurrentId = null;
    renderEvFilters(book, top);
    renderEvTop(top, all);
    renderEventDetail();
    return;
  }

  /* 第二屏：这条主线下面的子事件（老虎机） */
  const kids = all.filter(e => e.parentId === evParentId);
  evList = kids.filter(e => {
    if (evFilterChar && !(e.participants || []).includes(evFilterChar)) return false;
    if (evFilterStatus && e.status !== evFilterStatus) return false;
    return true;
  });

  if (!evList.some(e => e.id === evCurrentId)) {
    evCurrentId = evList.length ? evList[0].id : null;
  }

  renderEvFilters(book, kids);
  renderEvTop(top, all);
  renderSlot();
  renderEventDetail();
}

/* 筛选条：只在钻进某条主线之后才显示（主线列表本来就不长，不用筛） */
function renderEvFilters(book, layer) {
  const box = document.getElementById('evFilters');
  if (!box) return;

  box.hidden = !evParentId;
  if (!evParentId) { box.innerHTML = ''; return; }

  const people = db.characters.filter(c => c.bookId === book.id && c.name);

  box.innerHTML = `
    <div class="ev-filter-row">
      <button class="ev-f ${!evFilterChar && !evFilterStatus ? 'on' : ''}" data-fc="" type="button">全部 ${layer.length}</button>
      ${Object.keys(EV_STATUS).map(k =>
        `<button class="ev-f ${evFilterStatus === k ? 'on' : ''}" data-fs="${k}" type="button">${EV_STATUS[k].label}</button>`
      ).join('')}
    </div>
    ${people.length ? `<div class="ev-filter-row">
      ${people.map(p =>
        `<button class="ev-f ${evFilterChar === p.id ? 'on' : ''}" data-fc="${p.id}" type="button">${esc(p.name)}</button>`
      ).join('')}
    </div>` : ''}
  `;

  box.querySelectorAll('[data-fc]').forEach(b => b.addEventListener('click', () => {
    evFilterChar = b.dataset.fc;
    renderEventLib();
  }));
  box.querySelectorAll('[data-fs]').forEach(b => b.addEventListener('click', () => {
    evFilterStatus = (evFilterStatus === b.dataset.fs) ? '' : b.dataset.fs;
    renderEventLib();
  }));
}

/* 第一屏：主线大卡（一本书可以有好几张，用户自己定义谁是主线） */
function renderEvTop(top, all) {
  const box = document.getElementById('evTop');
  const branch = document.getElementById('evBranch');
  if (!box || !branch) return;

  const focused = !!evParentId;
  box.hidden = focused;
  branch.hidden = !focused;

  /* 右上角「⋯」只在钻进某条主线时出现（用来删这条主线） */
  const menuBtn = document.getElementById('evBranchMenu');
  if (menuBtn) menuBtn.hidden = !focused;

  if (focused) { box.innerHTML = ''; return; }

  if (!top.length) {
    box.innerHTML = '<div class="empty">还没有主线事件<br>点右上角「＋」立一条，再把每章发生的事挂到它下面</div>';
    return;
  }

  box.innerHTML = top.map(e => {
    const st = EV_STATUS[e.status] || EV_STATUS.seed;
    const kids = all.filter(x => x.parentId === e.id).length;
    const names = (e.participants || [])
      .map(id => { const c = db.characters.find(x => x.id === id); return c ? c.name : null; })
      .filter(Boolean);

    return `
      <div class="ev-hero" data-hero="${e.id}">
        <div class="ev-hero-top">
          <span class="lg lg-${st.color}">${st.label}</span>
          <span class="ev-hero-count">${kids} 条子事件</span>
        </div>
        <div class="ev-hero-title">${esc(e.title || '未命名主线')}</div>
        ${e.cause ? `<div class="ev-hero-line"><b>起因</b>${esc(e.cause)}</div>` : ''}
        ${e.effect ? `<div class="ev-hero-line"><b>影响</b>${esc(e.effect)}</div>` : ''}
        <div class="ev-hero-foot">
          <div class="ev-hero-tags">
            ${names.map(n => `<span class="slot-tag">${esc(n)}</span>`).join('')}
            ${eventPlaceLabel(e) ? `<span class="slot-tag place">${esc(eventPlaceLabel(e))}</span>` : ''}
            ${e.isForeshadow ? '<span class="slot-tag fore">伏笔</span>' : ''}
          </div>
          <span class="ev-hero-go">进入 ›</span>
        </div>
      </div>`;
  }).join('');

  box.querySelectorAll('[data-hero]').forEach(el => {
    el.addEventListener('click', () => enterEvBranch(el.dataset.hero));
  });
}

/* 钻进某条事件（它就成了当前的"主线"） */
function enterEvBranch(id) {
  evParentId = id;
  evCurrentId = null;
  evFilterChar = '';
  evFilterStatus = '';
  buzz(10);
  renderEventLib();
}

/* 退回主线列表 */
function exitEvBranch() {
  evParentId = '';
  evCurrentId = null;
  evFilterChar = '';
  evFilterStatus = '';
  renderEventLib();
}

/* 老虎机轨道：只滚当前主线下的子事件 */
/* 一张事件卡的内部内容（单独抽出来：改字时只刷这一张，不重建整条轨道） */
function slotCardInner(e) {
  const st = EV_STATUS[e.status] || EV_STATUS.seed;
  const names = (e.participants || [])
    .map(id => { const c = db.characters.find(x => x.id === id); return c ? c.name : null; })
    .filter(Boolean);
  const chap = e.chapterId
    ? '第 ' + chapterOrderOf(e.chapterId) + ' 章'
    : '未定章节';
  const kids = db.events.filter(x => x.parentId === e.id).length;
  return `
        <div class="slot-top">
          <span class="lg lg-${st.color}">${st.label}</span>
          <span class="slot-chap">${chap}</span>
        </div>
        <div class="slot-title">${esc(e.title || '未命名事件')}</div>
        ${e.cause ? `<div class="slot-line"><b>起因</b>${esc(e.cause)}</div>` : ''}
        ${e.effect ? `<div class="slot-line"><b>影响</b>${esc(e.effect)}</div>` : ''}
        <div class="slot-tags">
          ${names.map(n => `<span class="slot-tag">${esc(n)}</span>`).join('')}
          ${eventPlaceLabel(e) ? `<span class="slot-tag place">${esc(eventPlaceLabel(e))}</span>` : ''}
          ${e.isForeshadow ? '<span class="slot-tag fore">伏笔</span>' : ''}
          ${kids ? `<span class="slot-tag more" data-drill="${e.id}">${kids} 分支 ›</span>` : ''}
        </div>
      `;
}

function renderSlot() {
  const track = document.getElementById('slotTrack');
  if (!track) return;

  const parent = db.events.find(e => e.id === evParentId);
  const crumb = document.getElementById('evCrumbTitle');
  if (crumb) crumb.textContent = parent ? (parent.title || '未命名主线') : '';

  if (!evList.length) {
    track.innerHTML = '<div class="slot-empty">这条主线下面还没有事件<br>点上面的「＋ 子事件」加一条</div>';
    return;
  }

  track.innerHTML = evList.map(e => `
      <div class="slot-card ${e.id === evCurrentId ? 'on' : ''}" data-ev="${e.id}">${slotCardInner(e)}</div>
    `).join('');

  track.querySelectorAll('[data-ev]').forEach(card => {
    card.addEventListener('click', (ev) => {
      const drill = ev.target.closest('[data-drill]');
      if (drill) { enterEvBranch(drill.dataset.drill); return; }   /* 往下钻一层 */
      selectEvent(card.dataset.ev, true);
    });
  });

  fitSlotPadding(track);
}

/* 上下留白 = 半个容器 - 半张卡，这样第一张和最后一张都能滚到出奖线上 */
function fitSlotPadding(track) {
  if (!track) return;
  const card = track.querySelector('.slot-card');
  if (!card) return;
  const pad = Math.max(8, Math.round((track.clientHeight - card.offsetHeight) / 2));
  track.style.paddingTop = pad + 'px';
  track.style.paddingBottom = pad + 'px';
}

function selectEvent(id, scrollTo) {
  evCurrentId = id;
  const track = document.getElementById('slotTrack');
  if (track) {
    track.querySelectorAll('.slot-card').forEach(c => c.classList.toggle('on', c.dataset.ev === id));
    if (scrollTo) {
      const el = track.querySelector('[data-ev="' + id + '"]');
      if (el) {
        slotLock = Date.now() + 420;      /* 程序化滚动期间，自动选择先让开 */
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  buzz(10);
  renderEventDetail();
}

/* ---------- 滚到哪张，就选哪张（老虎机的核心手感） ---------- */
let slotLock = 0;          /* 程序化滚动的锁，避免自己跟自己打架 */

function bindSlotAutoSelect() {
  const track = document.getElementById('slotTrack');
  if (!track) return;

  let ticking = false;
  const raf = window.requestAnimationFrame || (fn => setTimeout(fn, 16));

  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    raf(() => {
      ticking = false;
      pickCenteredCard(false);
    });
  }, { passive: true });

  /* 滚停的那一刻：定稿 + 一点触感 */
  const settle = () => pickCenteredCard(true);
  if ('onscrollend' in window) {
    track.addEventListener('scrollend', settle);
  } else {
    let timer = null;
    track.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 130);
    }, { passive: true });
  }

  /* 屏幕转方向 / 键盘收起 → 卡高变了，留白跟着重算 */
  window.addEventListener('resize', () => fitSlotPadding(track));
}

/* 找出离中线最近的那张卡 */
function pickCenteredCard(settle) {
  if (!evParentId) return;
  if (Date.now() < slotLock) return;      /* 点击导致的滚动，别抢 */

  const track = document.getElementById('slotTrack');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('[data-ev]'));
  if (!cards.length) return;

  const tr = track.getBoundingClientRect();
  const mid = tr.top + tr.height / 2;

  let best = null;

  /* 滚到顶 / 滚到底：直接认第一张、最后一张（留白算不准时的保险） */
  const atTop = track.scrollTop <= 2;
  const atBottom = track.scrollTop + track.clientHeight >= track.scrollHeight - 2;
  if (atTop) best = cards[0];
  else if (atBottom) best = cards[cards.length - 1];

  if (!best) {
    let bestDist = Infinity;
    cards.forEach(c => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = c; }
    });
  }

  if (!best) return;
  const id = best.dataset.ev;
  if (id === evCurrentId) {
    if (settle) buzz(8);
    return;
  }

  evCurrentId = id;
  cards.forEach(c => c.classList.toggle('on', c.dataset.ev === id));
  if (settle) buzz(8);
  renderEventDetail();
}

/* 触感：Android 真震，iOS 靠动画（这里只做能力判断） */
function buzz(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

/* ============================================================
   详情面板（v0.10：骨架 → 真表单）
   ------------------------------------------------------------
   · 标题 / 状态 / 经过 常驻；因果、谁在哪、章节、伏笔 折叠
   · 输入框用 data-evf（不要和老虎机卡片的 data-ev 混）
   · 地点存 regionId（地图里的区域 id），区域改名这里自动跟着变
   · 打字只存盘 + 局部刷新那一张卡，不重绘详情（否则键盘会收起）
   ============================================================ */
const evOpenBlocks = new Set();   /* 重绘后保持折叠块的开合 */
let evSaveTimer = 0;

/* 地点显示：优先地图区域；老数据只有手写文字时回落 placeText */
function eventPlaceLabel(e, full) {
  const rg = e && e.regionId ? regionById(e.regionId) : null;
  if (rg) return full ? regionPath(rg.id) : (rg.name || '未命名区域');
  return (e && e.placeText) || '';
}

/* 出现章节：chapters[] 为准，兼容只有 chapterId 的老数据；按章节顺序排 */
function evChapterIds(e) {
  const ids = Array.isArray(e.chapters) ? e.chapters.slice() : [];
  if (e.chapterId && ids.indexOf(e.chapterId) < 0) ids.unshift(e.chapterId);
  return ids
    .filter(id => db.chapters.some(c => c.id === id))
    .sort((a, b) => chapterOrderOf(a) - chapterOrderOf(b));
}

function evSaveSoon() {
  clearTimeout(evSaveTimer);
  evSaveTimer = setTimeout(saveDB, 250);
}

/* 局部刷新老虎机里的这一张卡（滚动位置不动） */
function patchSlotCard(e) {
  const card = document.querySelector('#slotTrack .slot-card[data-ev="' + e.id + '"]');
  if (card) card.innerHTML = slotCardInner(e);
}

function renderEventDetail() {
  const box = document.getElementById('eventDetail');
  if (!box) return;

  /* 停在主线列表时不显示详情 */
  if (!evParentId) { box.innerHTML = ''; return; }

  const e = db.events.find(x => x.id === evCurrentId);
  if (!e) {
    box.innerHTML = '<div class="panel ev-detail"><div class="empty">还没有选中事件</div></div>';
    return;
  }

  const st = EV_STATUS[e.status] || EV_STATUS.seed;
  const people = (e.participants || [])
    .map(id => db.characters.find(c => c.id === id)).filter(Boolean);
  const chapIds = evChapterIds(e);
  const placeFull = eventPlaceLabel(e, true);
  const legacyPlace = !e.regionId && e.placeText;
  const open = k => (evOpenBlocks.has(k) ? 'open' : '');

  let foreText = '没有标成伏笔。';
  if (e.isForeshadow) {
    if (e.payoffChapterId) foreText = '回收于第 ' + chapterOrderOf(e.payoffChapterId) + ' 章';
    else if (e.payoffEventId) {
      const pe = db.events.find(x => x.id === e.payoffEventId);
      foreText = '回收于事件「' + (pe ? (pe.title || '未命名') : '已删除') + '」';
    } else foreText = '已标为伏笔，还没回收。';
  }

  box.innerHTML = `
    <div class="panel ev-detail">
      <div class="ev-d-head">
        <span class="ev-d-title">事件详情</span>
        <span class="lg lg-${st.color}">${st.label}</span>
      </div>

      <input class="field-input" data-evf="title" type="text" placeholder="一句话标题">

      <div class="chips ev-d-status" style="margin:10px 0;">
        ${Object.keys(EV_STATUS).map(k => `
          <button class="chip chip-sm ${e.status === k ? 'selected' : ''}" data-evstatus="${k}" type="button">${EV_STATUS[k].label}</button>
        `).join('')}
      </div>

      <div class="field" style="margin-bottom:8px;">
        <div class="field-label"><span>经过</span></div>
        <textarea class="field-input" data-evf="detail" rows="3" placeholder="这件事具体怎么发生的"></textarea>
      </div>

      <details class="block ev-more" data-blk="cause" ${open('cause')}>
        <summary>因果 · 起因 / 结果 / 影响</summary>
        <div style="padding:10px 12px 12px;">
          <div class="field-label"><span>起因</span></div>
          <textarea class="field-input" data-evf="cause" rows="2" placeholder="为什么会发生"></textarea>
          <div class="field-label" style="margin-top:10px;"><span>结果</span></div>
          <textarea class="field-input" data-evf="result" rows="2" placeholder="发生之后的直接结果"></textarea>
          <div class="field-label" style="margin-top:10px;"><span>影响</span></div>
          <textarea class="field-input" data-evf="effect" rows="2" placeholder="对后面剧情 / 关系的影响"></textarea>
        </div>
      </details>

      <details class="block ev-more" data-blk="who" ${open('who')}>
        <summary>谁在哪 · 参与者 / 地点</summary>
        <div style="padding:10px 12px 12px;">
          <div class="field-label"><span>参与者</span></div>
          <div class="chips">
            ${people.map(c => `<button class="chip chip-sm selected" data-evrmchar="${c.id}" type="button">${esc(c.name || '未命名')} ×</button>`).join('')}
            <button class="chip chip-sm" id="evPickChars" type="button">＋ 选择角色</button>
          </div>
          <div class="field-label" style="margin-top:6px;"><span>发生地点 <span class="hint">来自地图</span></span></div>
          <div class="chips">
            ${placeFull ? `<button class="chip chip-sm selected" id="evClearRegion" type="button">📍 ${esc(placeFull)} ×</button>` : ''}
            <button class="chip chip-sm" id="evPickRegion" type="button">${e.regionId ? '换地点' : '＋ 选择地点'}</button>
          </div>
          ${legacyPlace ? `<div class="ev-d-tip">旧写法的地点「${esc(e.placeText)}」还没对应到地图，点「选择地点」选一个区域就会替换它。</div>` : ''}
        </div>
      </details>

      <details class="block ev-more" data-blk="chap" ${open('chap')}>
        <summary>出现章节</summary>
        <div style="padding:10px 12px 12px;">
          <div class="chips">
            ${chapIds.map(id => `<button class="chip chip-sm selected" data-evrmchap="${id}" type="button">第 ${chapterOrderOf(id)} 章 ×</button>`).join('')}
            <button class="chip chip-sm" id="evPickChaps" type="button">＋ 选择章节</button>
          </div>
        </div>
      </details>

      <details class="block ev-more" data-blk="fore" ${open('fore')}>
        <summary>伏笔</summary>
        <div style="padding:10px 12px 12px;">
          <div class="ev-d-tip" style="margin:0 0 10px;">${esc(foreText)}</div>
          <button class="chip chip-sm ${e.isForeshadow ? 'selected' : ''}" id="evToggleFore" type="button">${e.isForeshadow ? '取消伏笔' : '标成伏笔'}</button>
        </div>
      </details>

      <button class="ev-d-del" id="evDeleteBtn" type="button" style="margin:10px 0 8px;">删除这条</button>
    </div>
  `;

  /* 文本框填值（用 .value，不拼进 HTML，避免引号/换行出问题） */
  ['title', 'detail', 'cause', 'result', 'effect'].forEach(f => {
    const el = box.querySelector('[data-evf="' + f + '"]');
    if (!el) return;
    el.value = e[f] || '';
    el.addEventListener('input', () => {
      e[f] = el.value;
      e.updatedAt = Date.now();
      evSaveSoon();
      if (f === 'title') {
        const t = document.querySelector('#slotTrack .slot-card[data-ev="' + e.id + '"] .slot-title');
        if (t) t.textContent = el.value || '未命名事件';
      }
    });
    /* 离开输入框时，把卡片上的起因/影响行也同步（它们有无会改变卡片高度，所以不在打字时刷） */
    el.addEventListener('change', () => { patchSlotCard(e); });
  });

  /* 折叠块开合记住 */
  box.querySelectorAll('details[data-blk]').forEach(d => {
    d.addEventListener('toggle', () => {
      if (d.open) evOpenBlocks.add(d.dataset.blk); else evOpenBlocks.delete(d.dataset.blk);
    });
  });

  /* 状态 */
  box.querySelectorAll('[data-evstatus]').forEach(b => {
    b.addEventListener('click', () => {
      e.status = b.dataset.evstatus;
      e.updatedAt = Date.now();
      saveDB();
      patchSlotCard(e);
      renderEventDetail();
    });
  });

  /* 参与者 */
  box.querySelectorAll('[data-evrmchar]').forEach(b => {
    b.addEventListener('click', () => {
      e.participants = (e.participants || []).filter(id => id !== b.dataset.evrmchar);
      commitEventLinks(e);
    });
  });
  box.querySelector('#evPickChars').addEventListener('click', () => openEvCharPick(e));

  /* 地点 */
  box.querySelector('#evPickRegion').addEventListener('click', () => openEvRegionPick(e));
  const clr = box.querySelector('#evClearRegion');
  if (clr) clr.addEventListener('click', () => {
    e.regionId = '';
    e.placeText = '';
    commitEventLinks(e);
  });

  /* 章节 */
  box.querySelectorAll('[data-evrmchap]').forEach(b => {
    b.addEventListener('click', () => {
      setEventChapters(e, evChapterIds(e).filter(id => id !== b.dataset.evrmchap));
      commitEventLinks(e);
    });
  });
  box.querySelector('#evPickChaps').addEventListener('click', () => openEvChapterPick(e));

  /* 伏笔：和「伏笔」模块是同一份数据（isForeshadow / payoff*），这里只管开关 */
  box.querySelector('#evToggleFore').addEventListener('click', () => {
    if (e.isForeshadow) {
      e.isForeshadow = false;
      e.payoffEventId = '';
      e.payoffChapterId = '';
    } else {
      e.isForeshadow = true;
    }
    commitEventLinks(e);
    renderBook();
  });

  /* 删除：点一次变红确认，再点才真删（连带它下面的分支） */
  const delBtn = box.querySelector('#evDeleteBtn');
  if (delBtn) {
    let armed = false;
    delBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        delBtn.textContent = '真的删除？会连分支一起删';
        delBtn.classList.add('armed');
        setTimeout(() => {
          if (!armed) return;
          armed = false;
          delBtn.textContent = '删除这条';
          delBtn.classList.remove('armed');
        }, 3000);
        return;
      }
      deleteEventCascade(evCurrentId);
    });
  }
}

/* 改了关联（人 / 地 / 章 / 伏笔）：存盘 + 刷卡 + 重绘详情 */
function commitEventLinks(e) {
  e.updatedAt = Date.now();
  saveDB();
  patchSlotCard(e);
  renderEventDetail();
}

/* 章节：chapters[] 存全部；chapterId 取最早那章（老虎机排序、卡片角标用它） */
function setEventChapters(e, ids) {
  const sorted = ids
    .filter(id => db.chapters.some(c => c.id === id))
    .sort((a, b) => chapterOrderOf(a) - chapterOrderOf(b));
  e.chapters = sorted;
  e.chapterId = sorted[0] || '';
}

/* ---------- 三个选择抽屉 ---------- */
function pickSheetRows(list, onSet, multi) {
  return list.map(x => `
    <button class="st-pick ${onSet.has(x.id) ? 'on' : ''}" data-epick="${x.id}" type="button">
      <span class="st-pick-t">${esc(x.text)}</span>
      ${x.sub ? `<span class="st-pick-s">${esc(String(x.sub).slice(0, 16))}</span>` : ''}
    </button>`).join('');
}

function openEvCharPick(e) {
  const chars = db.characters.filter(c => c.bookId === e.bookId);
  const on = new Set(e.participants || []);
  const list = chars.map(c => ({ id: c.id, text: iconOfCategory(c.category) + ' ' + (c.name || '未命名'), sub: c.oneLine }));
  openSheet(`
    <div class="sheet-title">参与者 <span class="sheet-sub">可多选</span></div>
    <div class="st-sec-chips" id="epRows" style="margin-top:10px;"></div>
    <button class="btn btn-primary" id="epSave" type="button" style="margin-top:16px;">确定</button>
  `, body => {
    const rows = body.querySelector('#epRows');
    const draw = () => {
      rows.innerHTML = list.length ? pickSheetRows(list, on) : '<div class="st-sec-empty">这本书还没有角色。</div>';
      rows.querySelectorAll('[data-epick]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.epick;
        if (on.has(id)) on.delete(id); else on.add(id);
        draw();
      }));
    };
    draw();
    body.querySelector('#epSave').addEventListener('click', () => {
      e.participants = Array.from(on);
      closeSheet();
      commitEventLinks(e);
    });
  });
}

function openEvRegionPick(e) {
  const regs = bookRegions(e.bookId);
  if (!regs.length) {
    openSheet(`
      <div class="sheet-title">发生地点</div>
      <div class="sheet-sub" style="margin-top:10px;line-height:1.8;">这本书还没有地图。先在书房 → 地图里建几个区域，再回来选。</div>
    `);
    return;
  }
  const list = regs
    .map(r => ({ id: r.id, text: regionPath(r.id), sub: r.vibe }))
    .sort((a, b) => a.text.localeCompare(b.text, 'zh'));
  let keyword = '';
  openSheet(`
    <div class="sheet-title">发生地点 <span class="sheet-sub">只能选一个</span></div>
    <input class="field-input" id="erSearch" type="text" placeholder="搜区域名">
    <div class="st-sec-chips" id="erRows" style="margin-top:12px;"></div>
  `, body => {
    const rows = body.querySelector('#erRows');
    const draw = () => {
      const k = keyword.toLowerCase();
      const shown = k ? list.filter(x => (x.text + ' ' + (x.sub || '')).toLowerCase().indexOf(k) >= 0) : list;
      rows.innerHTML = shown.length
        ? pickSheetRows(shown, new Set([e.regionId]))
        : '<div class="st-sec-empty">没搜到</div>';
      rows.querySelectorAll('[data-epick]').forEach(b => b.addEventListener('click', () => {
        e.regionId = b.dataset.epick;
        e.placeText = '';          /* 地图是唯一来源，旧的手写文字不再保留 */
        closeSheet();
        commitEventLinks(e);
      }));
    };
    draw();
    const search = body.querySelector('#erSearch');
    search.addEventListener('input', () => { keyword = search.value.trim(); draw(); });
  });
}

function openEvChapterPick(e) {
  const chaps = bookChapters(e.bookId);
  const on = new Set(evChapterIds(e));
  const list = chaps.map((c, i) => ({
    id: c.id, text: '第 ' + (c.order || i + 1) + ' 章', sub: c.title
  }));
  openSheet(`
    <div class="sheet-title">出现章节 <span class="sheet-sub">长线剧情可多选</span></div>
    <div class="st-sec-chips" id="ecRows" style="margin-top:10px;"></div>
    <button class="btn btn-primary" id="ecSave" type="button" style="margin-top:16px;">确定</button>
  `, body => {
    const rows = body.querySelector('#ecRows');
    const draw = () => {
      rows.innerHTML = list.length ? pickSheetRows(list, on) : '<div class="st-sec-empty">这本书还没有章节。</div>';
      rows.querySelectorAll('[data-epick]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.epick;
        if (on.has(id)) on.delete(id); else on.add(id);
        draw();
      }));
    };
    draw();
    body.querySelector('#ecSave').addEventListener('click', () => {
      setEventChapters(e, Array.from(on));
      closeSheet();
      commitEventLinks(e);
      /* 章节变了会影响老虎机的排序，整条轨道重排一次 */
      renderEventLib();
    });
  });
}

/* 删一条事件，连带它下面所有子孙（不然会留下孤儿数据） */
function deleteEventCascade(id) {
  const kill = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    db.events.forEach(e => {
      if (e.parentId && kill.has(e.parentId) && !kill.has(e.id)) {
        kill.add(e.id);
        grew = true;
      }
    });
  }
  db.events = db.events.filter(e => !kill.has(e.id));
  saveDB();
  if (kill.has(evCurrentId)) evCurrentId = null;
  if (kill.has(evParentId)) evParentId = '';
  renderEventLib();
}

/* 主线自己的菜单（右上角 ⋯）：目前只有删除 */
function openBranchMenu() {
  const e = db.events.find(x => x.id === evParentId);
  if (!e) return;

  const kids = db.events.filter(x => x.parentId === e.id).length;

  openSheet(`
    <div class="sheet-title">${esc(e.title || '未命名主线')} <span class="sheet-sub">这条主线</span></div>
    <div class="del-warn">
      删除后，它下面的 <b>${kids}</b> 条子事件会一起删掉，<b>不能恢复</b>。
    </div>
    <button class="btn btn-danger" id="delBranchBtn" type="button" style="margin-top:14px;">删除这条主线</button>
    <button class="btn btn-ghost" id="delBranchCancel" type="button" style="margin-top:8px;">取消</button>
  `, (body) => {
    const btn = body.querySelector('#delBranchBtn');
    let armed = false;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.classList.add('armed');
        btn.textContent = '再点一次，确认删除';
        return;
      }
      closeSheet();
      deleteEventCascade(e.id);
    });
    body.querySelector('#delBranchCancel').addEventListener('click', closeSheet);
  });
}

/* 新建事件：一句话标题 + 挂在哪条主线下面（细节留给以后的详情面板） */
function openNewEventSheet() {
  const book = currentBook();
  if (!book) return;

  const all = bookEvents(book.id);
  const top = all.filter(e => !e.parentId);
  const preset = evParentId || '';

  openSheet(`
    <div class="sheet-title">新建事件 <span class="sheet-sub">先立一句话，细节以后补</span></div>
    <input class="field-input" id="evTitleInput" type="text" maxlength="40" placeholder="一句话：谁做了什么">
    <div class="sheet-field" style="margin-top:14px;">挂在哪条主线下面</div>
    <select class="field-input" id="evParentPick">
      <option value="" ${preset ? '' : 'selected'}>不挂 · 新建一条主线</option>
      ${top.map(t => `<option value="${t.id}" ${t.id === preset ? 'selected' : ''}>${esc(t.title || '未命名主线')}</option>`).join('')}
    </select>
    <button class="btn btn-primary" id="evCreate" type="button" style="margin-top:16px;">创建</button>
  `, (body) => {
    const input = body.querySelector('#evTitleInput');
    setTimeout(() => input.focus(), 120);

    body.querySelector('#evCreate').addEventListener('click', () => {
      const title = input.value.trim();
      if (!title) return;

      const parentId = body.querySelector('#evParentPick').value;
      const e = newEvent(book.id, parentId);
      e.title = title;
      db.events.push(e);
      saveDB();

      /* 建完直接落到它所在的那一层，省得用户自己找 */
      evParentId = parentId;
      evCurrentId = e.id;
      closeSheet();
      renderEventLib();
    });
  });
}

function newEvent(bookId, parentId) {
  return {
    id: uid('ev'), bookId: bookId,
    parentId: parentId || '',
    title: '', detail: '', status: 'seed',
    participants: [], placeText: '',
    chapterId: '', chapters: [],
    cause: '', causeEventIds: [],
    result: '', effect: '', effectEventIds: [],
    regionId: '',            /* 发生地点：地图里的区域 id（改名自动同步） */
    isForeshadow: false, payoffEventId: '',
    createdAt: Date.now(), updatedAt: Date.now()
  };
}

document.getElementById('addEventLibBtn').addEventListener('click', openNewEventSheet);
document.getElementById('evBackTop').addEventListener('click', exitEvBranch);
document.getElementById('evAddChild').addEventListener('click', openNewEventSheet);
document.getElementById('evBranchMenu').addEventListener('click', openBranchMenu);
bindSlotAutoSelect();   /* 滚动自动吸附选中：轨道只绑一次，卡片重建也不掉 */

document.getElementById('openEventLib').addEventListener('click', openEventLib);

/* ============================================================
   K5. 地图（区域层级：大陆 → 国家 → 城市 → 街区 → 场景）
   ------------------------------------------------------------
   和事件库同一套思路：parentId 记归属，深度不限，层级由作者自己定。
   第一屏看顶层区域，点进去看它下面的小区域，可以一直往下钻。
   ============================================================ */
let rgParentId = '';        /* 当前钻进哪个区域（'' = 停在顶层） */

function bookRegions(bookId) {
  return db.regions.filter(r => r.bookId === bookId);
}

function regionById(id) {
  return db.regions.find(r => r.id === id) || null;
}

function regionChildren(parentId, bookId) {
  return db.regions.filter(r =>
    r.bookId === bookId && (r.parentId || '') === (parentId || '')
  );
}

/* 从当前区域一路往上，拼出"雾都 / 城南 / 旧桥"这样的路径 */
function regionPath(id) {
  const names = [];
  let cur = regionById(id);
  let guard = 0;
  while (cur && guard++ < 30) {
    names.unshift(cur.name || '未命名区域');
    cur = cur.parentId ? regionById(cur.parentId) : null;
  }
  return names.join(' / ');
}

/* 它下面所有子孙的 id（防止把区域挂到自己下面形成死循环） */
function regionDescendantIds(id) {
  const out = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    db.regions.forEach(r => {
      if (r.parentId && (r.parentId === id || out.has(r.parentId)) && !out.has(r.id)) {
        out.add(r.id);
        grew = true;
      }
    });
  }
  return out;
}

/* 反查：这个区域（含它下面的小区域）发生过哪些事件 */
function regionEventsOf(regionId) {
  const ids = regionDescendantIds(regionId);
  ids.add(regionId);
  return db.events.filter(ev => ev.regionId && ids.has(ev.regionId));
}

function openRegions() {
  const book = currentBook();
  if (!book) return;
  rgParentId = '';
  renderRegions();
  showView('view-regions');
}

function renderRegions() {
  const book = currentBook();
  if (!book) return;

  /* 当前区域被删了 / 换了书 → 退回顶层 */
  let here = rgParentId ? regionById(rgParentId) : null;
  if (rgParentId && !here) { rgParentId = ''; here = null; }

  const list = regionChildren(rgParentId, book.id);

  document.getElementById('regionTitle').textContent = here ? (here.name || '未命名区域') : '地图';

  const crumb = document.getElementById('rgCrumb');
  crumb.hidden = !here;
  if (here) document.getElementById('rgCrumbTitle').textContent = regionPath(here.id);

  const menuBtn = document.getElementById('rgMenuBtn');
  if (menuBtn) menuBtn.hidden = !here;

  /* 当前区域名片 */
  document.getElementById('rgHere').innerHTML = here ? `
    <div class="panel rg-here">
      <div class="rg-here-name">${esc(here.name || '未命名区域')}</div>
      ${here.vibe ? `<div class="rg-here-vibe">${esc(here.vibe)}</div>` : ''}
      ${here.desc ? `<div class="rg-here-desc">${esc(here.desc)}</div>` : ''}
      <div class="rg-here-foot">
        <span class="rg-here-count">${list.length} 个小区域 · ${regionEventsOf(here.id).length} 件事</span>
        <button class="link-btn" id="rgEditBtn" type="button" style="margin:0;">编辑</button>
      </div>
    </div>` : '';

  /* 区域列表 */
  const box = document.getElementById('rgList');
  if (!list.length) {
    box.innerHTML = `<div class="empty">${here
      ? '这里还没划分小区域<br>点右上角「＋」加一个'
      : '还没画地图<br>点右上角「＋」先建一个区域'}</div>`;
  } else {
    box.innerHTML = `<section class="panel">${list.map(r => {
      const kids = regionChildren(r.id, book.id).length;
      return `
        <button class="row" data-rg="${r.id}" type="button">
          <span class="row-icon">${r.parentId ? '📍' : '🗺️'}</span>
          <span class="row-main">
            <span class="row-title">${esc(r.name || '未命名区域')}</span>
            <span class="row-sub">${esc(r.vibe || r.desc || '还没写氛围')}</span>
          </span>
          ${kids ? `<span class="book-tag">${kids} 处</span>` : ''}
          <span class="row-arrow">›</span>
        </button>`;
    }).join('')}</section>`;

    box.querySelectorAll('[data-rg]').forEach(b => {
      b.addEventListener('click', () => enterRegion(b.dataset.rg));
    });
  }

  const editBtn = document.getElementById('rgEditBtn');
  if (editBtn) editBtn.addEventListener('click', () => openRegionSheet(here.id));
}

/* 钻进某个区域 */
function enterRegion(id) {
  rgParentId = id;
  buzz(10);
  renderRegions();
}

/* 退回上一级（不是直接跳回顶层，符合"一层层退"的直觉） */
function exitRegion() {
  const here = regionById(rgParentId);
  rgParentId = here ? (here.parentId || '') : '';
  renderRegions();
}

/* 新建 / 编辑区域 */
function openRegionSheet(id) {
  const book = currentBook();
  if (!book) return;

  const isEdit = !!id;
  const r = isEdit ? regionById(id) : null;
  if (isEdit && !r) return;

  /* 选上级时排除自己和自己的子孙，避免"自己是自己的爹" */
  const banned = isEdit ? regionDescendantIds(id) : new Set();
  if (isEdit) banned.add(id);

  const options = bookRegions(book.id)
    .filter(x => !banned.has(x.id))
    .map(x => `<option value="${x.id}" ${!isEdit && x.id === rgParentId ? 'selected' : ''}>${esc(regionPath(x.id))}</option>`)
    .join('');

  openSheet(`
    <div class="sheet-title">${isEdit ? '编辑区域' : '新建区域'}
      <span class="sheet-sub">${isEdit ? '' : '先起名，氛围慢慢补'}</span></div>

    <input class="field-input" id="rgName" type="text" maxlength="30" placeholder="名字：雾都 / 城南 / 旧桥">
    <input class="field-input" id="rgVibe" type="text" maxlength="40" style="margin-top:10px;"
      placeholder="一句话氛围：阴湿、逼仄、闻得到煤灰味">
    <textarea class="field-input" id="rgDesc" rows="3" style="margin-top:10px;"
      placeholder="这里有什么、谁住、能发生什么事"></textarea>

    ${isEdit ? stateHistoryHtml(r, '状态记录') : ''}

    ${isEdit ? '' : `
      <div class="sheet-field" style="margin-top:14px;">挂在哪一级下面</div>
      <select class="field-input" id="rgParent">
        <option value="" ${rgParentId ? '' : 'selected'}>不挂 · 新建一个顶层区域</option>
        ${options}
      </select>`}

    <button class="btn btn-primary" id="rgSave" type="button" style="margin-top:16px;">
      ${isEdit ? '保存' : '创建'}
    </button>
    ${isEdit ? '<button class="btn btn-danger" id="rgDel" type="button" style="margin-top:8px;">删除这个区域</button>' : ''}
  `, (body) => {
    const nameEl = body.querySelector('#rgName');
    const vibeEl = body.querySelector('#rgVibe');
    const descEl = body.querySelector('#rgDesc');

    if (isEdit) {
      nameEl.value = r.name || '';
      vibeEl.value = r.vibe || '';
      descEl.value = r.desc || '';
    }
    setTimeout(() => nameEl.focus(), 120);

    body.querySelector('#rgSave').addEventListener('click', () => {
      const name = nameEl.value.trim();
      if (!name) return;                       /* 没名字不建，免得列表里一堆"未命名" */

      if (isEdit) {
        const cur = regionById(id);
        if (!cur) return;
        cur.name = name;
        cur.vibe = vibeEl.value.trim();
        cur.desc = descEl.value.trim();
        cur.updatedAt = Date.now();
      } else {
        const parentId = body.querySelector('#rgParent').value;
        const nr = newRegion(book.id, parentId);
        nr.name = name;
        nr.vibe = vibeEl.value.trim();
        nr.desc = descEl.value.trim();
        db.regions.push(nr);
        rgParentId = parentId;                 /* 建完就落到它所在那一层 */
      }

      saveDB();
      closeSheet();
      renderRegions();
      renderBook();                            /* 书房那行的计数跟着变 */
    });

    const delBtn = body.querySelector('#rgDel');
    if (delBtn) {
      let armed = false;
      delBtn.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          delBtn.classList.add('armed');
          delBtn.textContent = '再点一次，连小区域一起删';
          return;
        }
        const up = r.parentId || '';
        deleteRegionCascade(id);
        rgParentId = up;                       /* 删完退回上一级 */
        closeSheet();
        renderRegions();
        renderBook();
      });
    }
  });
}

function newRegion(bookId, parentId) {
  return {
    id: uid('rg'), bookId: bookId, parentId: parentId || '',
    name: '', vibe: '', desc: '',
    createdAt: Date.now(), updatedAt: Date.now()
  };
}

/* 删一个区域，连带它下面所有小区域 */
function deleteRegionCascade(id) {
  const kill = regionDescendantIds(id);
  kill.add(id);
  db.regions = db.regions.filter(r => !kill.has(r.id));
  db.events.forEach(ev => { if (ev.regionId && kill.has(ev.regionId)) ev.regionId = ''; });
  saveDB();
}


/* ============================================================
   K6. 道具（按分类分组，横向排列）
   ------------------------------------------------------------
   一个分类一条横向轨道，卡片左右翻；点卡片进编辑。
   ============================================================ */
const ITEM_CATS = [
  { key: '武器', icon: '🗡️' },
  { key: '信物', icon: '💍' },
  { key: '消耗', icon: '🧪' },
  { key: '线索', icon: '📜' },
  { key: '其他', icon: '📦' }
];

function bookItems(bookId) {
  return db.items.filter(i => i.bookId === bookId);
}

function openItems() {
  renderItems();
  showView('view-items');
}

function renderItems() {
  const book = currentBook();
  if (!book) return;

  const all = bookItems(book.id);
  const body = document.getElementById('itemsBody');

  if (!all.length) {
    body.innerHTML = '<div class="empty">还没有道具<br>点右上角「＋」建第一个</div>';
    return;
  }

  body.innerHTML = ITEM_CATS.map(cat => {
    const list = all.filter(i => i.cat === cat.key);
    if (!list.length) return '';
    return `
      <div class="item-group">
        <div class="group-head">
          <span>${cat.icon} ${cat.key}</span>
          <span class="group-count">${list.length}</span>
        </div>
        <div class="item-rail">
          ${list.map(i => `
            <button class="item-card" data-item="${i.id}" type="button">
              <span class="item-name">${esc(i.name || '未命名')}</span>
              <span class="item-line">${esc(i.line || '还没写一句')}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }).join('');

  body.querySelectorAll('[data-item]').forEach(b => {
    b.addEventListener('click', () => openItemSheet(b.dataset.item));
  });
}

/* 新建 / 编辑道具 */
function openItemSheet(id) {
  const book = currentBook();
  if (!book) return;

  const it = id ? db.items.find(x => x.id === id) : null;
  let cat = it ? it.cat : '武器';

  openSheet(`
    <div class="sheet-title">${it ? '编辑道具' : '新建道具'}
      <span class="sheet-sub">${it ? '' : '名字 + 一句就够'}</span></div>

    <input class="field-input" id="itName" type="text" maxlength="24" placeholder="名字：那封信 / 沈默的刀">

    <div class="sheet-field" style="margin-top:12px;">分类</div>
    <div class="chips" id="itCats">
      ${ITEM_CATS.map(c =>
        `<button class="chip chip-sm ${cat === c.key ? 'selected' : ''}" data-cat="${c.key}" type="button">${c.icon} ${c.key}</button>`
      ).join('')}
    </div>

    <input class="field-input" id="itLine" type="text" maxlength="40" style="margin-top:12px;"
      placeholder="一句话：它是干嘛的 / 长什么样">
    <textarea class="field-input" id="itDesc" rows="3" style="margin-top:10px;"
      placeholder="来历、谁拿着、什么时候会用到"></textarea>

    ${it ? stateHistoryHtml(it, '状态记录') : ''}

    <button class="btn btn-primary" id="itSave" type="button" style="margin-top:16px;">
      ${it ? '保存' : '创建'}
    </button>
    ${it ? '<button class="btn btn-danger" id="itDel" type="button" style="margin-top:8px;">删除这个道具</button>' : ''}
  `, (body) => {
    const nameEl = body.querySelector('#itName');
    const lineEl = body.querySelector('#itLine');
    const descEl = body.querySelector('#itDesc');

    if (it) {
      nameEl.value = it.name || '';
      lineEl.value = it.line || '';
      descEl.value = it.desc || '';
    }
    setTimeout(() => nameEl.focus(), 120);

    body.querySelectorAll('[data-cat]').forEach(b => {
      b.addEventListener('click', () => {
        cat = b.dataset.cat;
        body.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('selected', x.dataset.cat === cat));
      });
    });

    body.querySelector('#itSave').addEventListener('click', () => {
      const name = nameEl.value.trim();
      if (!name) return;

      if (it) {
        it.name = name;
        it.cat = cat;
        it.line = lineEl.value.trim();
        it.desc = descEl.value.trim();
        it.updatedAt = Date.now();
      } else {
        const ni = newItem(book.id);
        ni.name = name;
        ni.cat = cat;
        ni.line = lineEl.value.trim();
        ni.desc = descEl.value.trim();
        db.items.push(ni);
      }
      saveDB();
      closeSheet();
      renderItems();
      renderBook();
    });

    const delBtn = body.querySelector('#itDel');
    if (delBtn) {
      let armed = false;
      delBtn.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          delBtn.classList.add('armed');
          delBtn.textContent = '再点一次，确认删除';
          return;
        }
        db.items = db.items.filter(x => x.id !== id);
        saveDB();
        closeSheet();
        renderItems();
        renderBook();
      });
    }
  });
}

function newItem(bookId) {
  return {
    id: uid('it'), bookId: bookId, cat: '武器',
    name: '', line: '', desc: '',
    createdAt: Date.now(), updatedAt: Date.now()
  };
}


/* ============================================================
   K7. 伏笔（回收清单）
   ------------------------------------------------------------
   不新建数据表：伏笔就是 events 里的 isForeshadow，
   回收就是 payoffEventId 指向"哪件事把它圆了"（定案 C）。
   这一页只回答一个问题：我埋了什么还没填？
   ============================================================ */
function bookForeshadows(bookId) {
  return bookEvents(bookId).filter(e => e.isForeshadow);
}

function openForeshadows() {
  renderForeshadows();
  showView('view-foreshadows');
}

function renderForeshadows() {
  const book = currentBook();
  if (!book) return;

  const all = bookForeshadows(book.id);
  const body = document.getElementById('foreBody');

  if (!all.length) {
    body.innerHTML = '<div class="empty">还没有伏笔<br>点右上角「＋」，把某件事标成伏笔</div>';
    return;
  }

  const open = all.filter(e => !e.payoffEventId);
  const done = all.filter(e => e.payoffEventId);

  body.innerHTML = `
    ${open.length ? `
      <div class="group-head"><span>🧵 未回收</span><span class="group-count">${open.length}</span></div>
      <section class="panel">${open.map(e => foreRow(e, false)).join('')}</section>` : ''}
    ${done.length ? `
      <div class="group-head" style="margin-top:18px;"><span>✅ 已回收</span><span class="group-count">${done.length}</span></div>
      <section class="panel">${done.map(e => foreRow(e, true)).join('')}</section>` : ''}
  `;

  body.querySelectorAll('[data-fore]').forEach(b => {
    b.addEventListener('click', () => openForeSheet(b.dataset.fore));
  });
}

function foreRow(e, done) {
  const chap = e.chapterId ? '第 ' + chapterOrderOf(e.chapterId) + ' 章' : '未定章节';
  let sub;

  if (e.payoffChapterId) {
    /* 本章状态里标成"回收" → 回收点是章节，不是某条事件 */
    sub = '埋于 ' + chap + ' · 回收于第 ' + chapterOrderOf(e.payoffChapterId) + ' 章';
  } else if (done) {
    const pay = db.events.find(x => x.id === e.payoffEventId);
    sub = '埋于 ' + chap + ' · 回收于「' + esc(pay ? (pay.title || '未命名事件') : '事件已删') + '」';
  } else {
    sub = '埋于 ' + chap + (e.cause ? ' · ' + esc(e.cause) : '');
  }
  return `
    <button class="row" data-fore="${e.id}" type="button">
      <span class="row-icon">${done ? '✅' : '🧵'}</span>
      <span class="row-main">
        <span class="row-title">${esc(e.title || '未命名事件')}</span>
        <span class="row-sub">${sub}</span>
      </span>
      <span class="row-arrow">›</span>
    </button>`;
}

/* 点一条伏笔：指定在哪件事里回收 */
function openForeSheet(id) {
  const book = currentBook();
  if (!book) return;
  const e = db.events.find(x => x.id === id);
  if (!e) return;

  const others = bookEvents(book.id).filter(x => x.id !== id);

  openSheet(`
    <div class="sheet-title">${esc(e.title || '未命名事件')}
      <span class="sheet-sub">这件伏笔</span></div>

    <div class="sheet-field" style="margin-top:10px;">在哪件事里回收了它</div>
    <select class="field-input" id="forePayoff">
      <option value="">还没回收（先挂着）</option>
      ${others.map(x => `<option value="${x.id}" ${e.payoffEventId === x.id ? 'selected' : ''}>${esc(x.title || '未命名事件')}</option>`).join('')}
    </select>

    <button class="btn btn-primary" id="foreSave" type="button" style="margin-top:16px;">保存</button>
    <button class="btn btn-ghost" id="foreUnmark" type="button" style="margin-top:8px;">取消伏笔标记</button>
  `, (body) => {
    body.querySelector('#foreSave').addEventListener('click', () => {
      const cur = db.events.find(x => x.id === id);
      if (!cur) return;
      cur.payoffEventId = body.querySelector('#forePayoff').value;
      cur.updatedAt = Date.now();
      saveDB();
      closeSheet();
      renderForeshadows();
      renderBook();
    });

    body.querySelector('#foreUnmark').addEventListener('click', () => {
      const cur = db.events.find(x => x.id === id);
      if (!cur) return;
      cur.isForeshadow = false;
      cur.payoffEventId = '';
      saveDB();
      closeSheet();
      renderForeshadows();
      renderBook();
    });
  });
}

/* ＋：把某件事标成伏笔（事件详情还没装修，先从这里标） */
function openMarkForeSheet() {
  const book = currentBook();
  if (!book) return;

  const candidates = bookEvents(book.id).filter(e => !e.isForeshadow);

  if (!candidates.length) {
    openSheet(`
      <div class="sheet-title">标为伏笔</div>
      <div class="sheet-sub" style="margin-top:10px;">这本书的事件都已经标成伏笔了。</div>
    `);
    return;
  }

  openSheet(`
    <div class="sheet-title">标为伏笔 <span class="sheet-sub">哪件事埋了坑</span></div>
    <select class="field-input" id="forePick" style="margin-top:10px;">
      ${candidates.map(e => `<option value="${e.id}">${esc(e.title || '未命名事件')}</option>`).join('')}
    </select>
    <button class="btn btn-primary" id="foreMark" type="button" style="margin-top:16px;">标成伏笔</button>
  `, (body) => {
    body.querySelector('#foreMark').addEventListener('click', () => {
      const cur = db.events.find(x => x.id === body.querySelector('#forePick').value);
      if (!cur) return;
      cur.isForeshadow = true;
      cur.updatedAt = Date.now();
      saveDB();
      closeSheet();
      renderForeshadows();
      renderBook();
    });
  });
}

document.getElementById('openForeshadows').addEventListener('click', openForeshadows);
document.getElementById('addForeBtn').addEventListener('click', openMarkForeSheet);

document.getElementById('openItems').addEventListener('click', openItems);
document.getElementById('addItemBtn').addEventListener('click', () => openItemSheet(null));

document.getElementById('openRegions').addEventListener('click', openRegions);
document.getElementById('addRegionBtn').addEventListener('click', () => openRegionSheet(null));
document.getElementById('rgAddChild').addEventListener('click', () => openRegionSheet(null));
document.getElementById('rgBackBtn').addEventListener('click', exitRegion);
document.getElementById('rgMenuBtn').addEventListener('click', () => openRegionSheet(rgParentId));


/* ============================================================
   L2. 世界规则 + 导出导入 + 统计
   ============================================================ */
document.getElementById('openRules').addEventListener('click', openRulesSheet);

function openRulesSheet() {
  const book = currentBook();
  if (!book) return;
  openSheet(`
    <div class="sheet-title">世界规则 <span class="sheet-sub">《${esc(book.title)}》</span></div>
    <div class="sheet-field" style="margin-bottom:12px;">
      这本书不能违反的规则，一行一条
      <textarea class="field-input" id="rulesInput" rows="6"
        placeholder="例：\n无魔法，只有物理和火药 \n角色死了不能复活 \n贵族不得与非贵族通婚"></textarea>
    </div>
    <button class="btn btn-primary" id="rulesSave" type="button">保存</button>
  `, (body) => {
    const ta = body.querySelector('#rulesInput');
    ta.value = book.rules || '';
    setTimeout(() => ta.focus(), 120);
    body.querySelector('#rulesSave').addEventListener('click', () => {
      const b = currentBook();
      if (!b) return;
      b.rules = ta.value.trim();
      saveDB();
      closeSheet();
    });
  });
}

/* ---------- 导出 / 导入 ---------- */
/* 备份里要带的全部数据（API Key 永远置空）。
   以后新增了 db.xxx 数组，记得同时加到这里 + applyImportData()，否则换设备会丢。 */
function buildExportData() {
  return {
    version: 7,
    exportedAt: new Date().toISOString(),
    books: db.books, characters: db.characters, styles: db.styles,
    prompts: db.prompts, api: { baseUrl: db.api.baseUrl, model: db.api.model, key: '' },
    lookCustom: db.lookCustom, chapters: db.chapters, materials: db.materials,
    events: db.events, regions: db.regions, items: db.items
  };
}

function exportJSON() {
  const data = buildExportData();
  const text = JSON.stringify(data, null, 2);

  openSheet(`
    <div class="sheet-title">导出备份</div>
    <div class="sheet-sub" style="margin-bottom:8px;">
      把下面的内容保存成 .json 文件，可以放 iCloud 云盘。<b>API Key 不会被导出。</b>
    </div>
    <textarea class="field-input" id="exportText" rows="8" readonly></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-ghost" id="copyExport" type="button">复制全部</button>
      <button class="btn btn-primary" id="downloadExport" type="button">下载 .json</button>
    </div>
  `, (body) => {
    const ta = body.querySelector('#exportText');
    ta.value = text;

    body.querySelector('#copyExport').addEventListener('click', () => {
      ta.select();
      document.execCommand('copy');
      ta.value = '已复制 ✅（粘贴到备忘录，存成 .json 即可）';
      setTimeout(() => { ta.value = text; }, 1500);
    });

    body.querySelector('#downloadExport').addEventListener('click', () => {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '小说工作台备份.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    });
  });
}

/* 这三项是 v0.7~v0.9 才有的；旧备份里没有时，本机的保持原样（不清空） */
const IMPORT_OPTIONAL = [
  { key: 'events', label: '事件' },
  { key: 'regions', label: '地图' },
  { key: 'items', label: '道具' }
];

function validateImportData(data) {
  if (!data || typeof data !== 'object') throw new Error('不是有效的备份文件');
  const must = ['books', 'characters', 'styles'];
  const miss = must.filter(k => !Array.isArray(data[k]));
  if (miss.length) throw new Error('缺少字段：' + miss.join('、'));
}

/* 应用备份：覆盖本机数据。返回「旧备份里没有、所以保持本机原样」的项目名 */
function applyImportData(data) {
  validateImportData(data);

  /* 覆盖前先把本机数据留一份，万一导错了还能在控制台找回：
     localStorage.getItem('mynovel_v1_before_import') */
  try { localStorage.setItem(STORAGE_KEY + '_before_import', JSON.stringify(db)); } catch (e) {}

  db.books = data.books;
  db.characters = data.characters;
  db.styles = data.styles;
  db.prompts = mergePrompts(data.prompts, defaultPrompts());
  db.lookCustom = (data.lookCustom && typeof data.lookCustom === 'object') ? data.lookCustom : {};
  db.chapters = Array.isArray(data.chapters) ? data.chapters : [];
  db.materials = Array.isArray(data.materials) ? data.materials : [];

  const kept = [];
  IMPORT_OPTIONAL.forEach(o => {
    if (Array.isArray(data[o.key])) db[o.key] = data[o.key];
    else kept.push(o.label);
  });

  if (data.api) {
    db.api.baseUrl = data.api.baseUrl || '';
    db.api.model = data.api.model || '';
    /* key 不导入，保持本机的 */
  }
  saveDB();
  return kept;
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      validateImportData(data);          /* 先校验，再问，再动数据 */

      const sum = (data.books || []).length + ' 本书 / ' + (data.characters || []).length + ' 个角色 / ' +
        (Array.isArray(data.chapters) ? data.chapters.length : 0) + ' 章';
      if (!confirm('导入会覆盖本机现有的书、角色、章节等数据。\n\n备份里有：' + sum + '\n\n确定导入吗？')) return;

      const kept = applyImportData(data);
      renderHome();
      const out = document.getElementById('apiResult');
      const msg = '✅ 导入成功：' + db.books.length + ' 本书 / ' +
        db.characters.length + ' 个角色 / ' + db.chapters.length + ' 章 / ' +
        db.events.length + ' 个事件 / ' + db.regions.length + ' 个区域 / ' + db.items.length + ' 个道具';
      if (out) out.textContent = msg;
      closeSheet();
      if (kept.length) alert('这份是旧版备份，不含「' + kept.join('、') + '」。\n本机的这几项保持原样，可能和导入的书对不上。');
    } catch (e) {
      alert('导入失败：' + (e.message || e));
    }
  };
  reader.readAsText(file);
}

document.getElementById('exportBtn').addEventListener('click', () => {
  track('动作·导出');
  exportJSON();
});
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) handleImportFile(f);
  e.target.value = '';
});

/* ---------- 统计展示 ---------- */
function renderUsage() {
  const box = document.getElementById('usageBox');
  if (!box) return;
  const u = db.usage || {};
  const entries = Object.entries(u).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    box.innerHTML = '<div class="empty" style="padding:8px 0;">还没有统计数据，用一段时间再来看。</div>';
    return;
  }
  const max = entries[0][1];
  box.innerHTML = entries.filter(e => e[1] > 0).map(([k, v]) => `
    <div class="usage-row">
      <span class="usage-name">${esc(k)}</span>
      <div class="usage-bar"><div style="width:${Math.round(v / max * 100)}%"></div></div>
      <span class="usage-num">${v}</span>
    </div>
  `).join('');
}

function openSettings() {
  document.getElementById('apiBaseUrl').value = db.api.baseUrl || '';
  document.getElementById('apiModel').value = db.api.model || '';
  document.getElementById('apiKey').value = db.api.key || '';
  document.getElementById('apiResult').textContent = '';
  renderUsage();
  showView('view-settings');
}

/* ============================================================
   L. 新建书籍
   ============================================================ */
function openNewBookSheet() {
  openSheet(`
    <div class="sheet-title">新建书籍</div>
    <input class="field-input" id="bookNameInput" type="text" maxlength="20" placeholder="书名">
    <button class="btn btn-primary" id="bookOk" type="button" style="margin-top:12px;">创建</button>
  `, (body) => {
    const input = body.querySelector('#bookNameInput');
    setTimeout(() => input.focus(), 120);
    body.querySelector('#bookOk').addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return;
      db.books.push({ id: uid('b'), title: name, chapters: 0 });
      saveDB();
      closeSheet();
      renderHome();
    });
  });
}

/* ============================================================
   L3. 书籍设置：删除本书（连带角色 / 章节 / 事件）
   ============================================================ */
document.getElementById('bookMenuBtn').addEventListener('click', openBookMenu);

function openBookMenu() {
  const book = currentBook();
  if (!book) return;

  const nChar = db.characters.filter(c => c.bookId === book.id).length;
  const nChap = db.chapters.filter(c => c.bookId === book.id).length;
  const nEv = db.events.filter(e => e.bookId === book.id).length;

  openSheet(`
    <div class="sheet-title">${esc(book.title)} <span class="sheet-sub">书籍设置</span></div>
    <div class="del-warn">
      删除后，这本书的 <b>${nChar}</b> 个角色、<b>${nChap}</b> 章正文、<b>${nEv}</b> 条事件
      会一起删掉，<b>不能恢复</b>。
    </div>
    <button class="btn btn-danger" id="delBookBtn" type="button" style="margin-top:14px;">删除这本书</button>
    <button class="btn btn-ghost" id="delBookCancel" type="button" style="margin-top:8px;">取消</button>
  `, (body) => {
    const delBtn = body.querySelector('#delBookBtn');
    let armed = false;                       /* 两段式确认：第一下变红，第二下才删 */
    delBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        delBtn.classList.add('armed');
        delBtn.textContent = '再点一次，确认删除';
        return;
      }
      deleteBook(book.id);
    });
    body.querySelector('#delBookCancel').addEventListener('click', closeSheet);
  });
}

function deleteBook(bookId) {
  db.books = db.books.filter(b => b.id !== bookId);
  db.characters = db.characters.filter(c => c.bookId !== bookId);
  db.chapters = db.chapters.filter(c => c.bookId !== bookId);
  db.events = db.events.filter(e => e.bookId !== bookId);
  saveDB();
  if (currentBookId === bookId) currentBookId = null;
  if (typeof evCurrentId !== 'undefined') evCurrentId = null;
  closeSheet();
  goBack();                                  /* 退回大厅 */
}

/* ============================================================
   M. 键盘：把底部抽屉顶上去 + 正文区让出键盘高度
   ============================================================ */
if (window.visualViewport) {
  const vv = window.visualViewport;
  let scheduled = false;

  function applyKB() {
    scheduled = false;
    /* 键盘不会"顶"页面，它只是把可视区压小：
       键盘高度 ≈ 窗口高 − 可视区高（再减去可视区被推上去的距离） */
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', kb + 'px');
    if (kb > 0) keepEditorVisible();
  }

  /* 光标被键盘挡住时，把内容往上滚一段（配合 CSS 里的 padding-bottom） */
  function keepEditorVisible() {
    const el = document.activeElement;
    if (!el || !el.closest) return;
    const content = el.closest('#view-chapter .content, #view-events .content');
    if (!content) return;

    const vh = vv.height + vv.offsetTop;      /* 可视区底边（视口坐标） */
    const r = el.getBoundingClientRect();
    const overflow = r.bottom - vh;
    if (overflow > 0) content.scrollTop += overflow + 12;
  }

  function onChange() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyKB);
  }
  vv.addEventListener('resize', onChange);
  vv.addEventListener('scroll', onChange);
}

/* ============================================================
   N. 启动
   ============================================================ */
renderHome();
