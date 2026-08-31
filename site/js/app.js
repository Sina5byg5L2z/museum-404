/* 404 博物馆 · SPA */
const $app = document.getElementById('app');
const $footer = document.getElementById('site-footer');

const ERA = {
  portal:{yrs:'1994–2000', nm:'拨号上网 · 门户时代'},
  bbs:{yrs:'2000–2005', nm:'BBS · 论坛黄金年代'},
  blog:{yrs:'2005–2009', nm:'博客 · 个人媒体觉醒'},
  social:{yrs:'2009–2013', nm:'社交网络 · 微博大战'},
  mobile:{yrs:'2013–2017', nm:'移动互联网 · O2O前夜'},
  o2o:{yrs:'2015–2019', nm:'O2O · 补贴大战坟场'},
  stream:{yrs:'2018–2022', nm:'流媒体 · 算法时代'},
  agent:{yrs:'2023–2026', nm:'AI 时代 · 智能体浪潮'}
};
const CAUSE = {
  policy:'政策监管', competition:'竞争失利', copyright:'版权大战', tech_shift:'技术革命',
  funding:'资金断裂', fraud:'骗局崩塌', founder:'创始人', market:'市场萎缩',
  merge_absorb:'被并购吸收', other:'其他'
};
const ERA_ORDER = ['portal','bbs','blog','social','mobile','o2o','stream','agent'];

let idxCache=null, dbPromise=null, quizCache=null;
async function idx(){ if(!idxCache){ idxCache=fetch('data/index.json').then(r=>r.json()).then(d=>d.entries); } return idxCache; }
async function db(){ if(!dbPromise){ dbPromise=fetch('data/db.json').then(r=>r.json()).then(d=>{ const m={}; d.entries.forEach(e=>m[e.id]=e); return m; }); } return dbPromise; }
async function quizData(){ if(!quizCache){ quizCache=fetch('data/quiz.json').then(r=>r.json()).then(d=>d.quiz); } return quizCache; }

const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function life(e){ return (e.born||'????')+' — '+(e.died||'????'); }
function tearsStars(n){ return '✦'.repeat(n)+'✧'.repeat(5-n); }

/* ---------- 路由 ---------- */
addEventListener('hashchange', route);
async function route(){
  const h = location.hash.slice(1) || '/';
  const [_, seg, arg] = h.split('/');
  window.scrollTo(0,0);
  try{
    if(h==='/' || seg==='') await vHome();
    else if(seg==='museum') await vMuseum(arg||'all');
    else if(seg==='e') await vEntry(arg);
    else if(seg==='timeline') await vTimeline();
    else if(seg==='quiz') await vQuiz();
    else if(seg==='about') vAbout();
    else vHome();
  }catch(ex){ $app.innerHTML = '<div class="loading">展品暂时打不开…<br><small>'+esc(ex)+'</small></div>'; }
}

/* ---------- 顶栏/页脚 ---------- */
function nav(seg){
  const items=[['/','门厅'],['#/museum','墓碑长廊'],['#/timeline','时间轴'],['#/quiz','冲浪测验'],['#/about','关于']];
  return `<header class="top"><div class="wrap">
    <a class="logo" href="#/"><b>404</b> 博物馆</a>
    <nav class="main">${items.map(([u,t])=>`<a href="${u}" class="${(u==='#'+seg||(u==='/'&&seg===''))?'on':''}">${t}</a>`).join('')}</nav>
  </div></header>`;
}
function footer(){
  $footer.innerHTML = `<div class="wrap">
    <p><b>404 博物馆</b> — 纪念那些消失的中国互联网产品。数据与叙事由 AI 智能体集群考据生成，所有事实性陈述附来源，发现错误欢迎提 issue 修正。</p>
    <p>内容以 <a href="#/about">CC BY-SA 4.0</a> 提供 · 引用报道版权归原作者所有 · <a href="#/about">生产方法</a></p>
    <p>互联网并非永恒。2013 年的网页，38% 已经消失。</p></div>`;
}

/* ---------- 首页 ---------- */
async function vHome(){
  const entries = await idx();
  const day = Math.floor(Date.now()/864e5);
  const today = entries[day % entries.length] || entries[0];
  const shuffled = [...entries].sort(()=>Math.random()-.5).slice(0,6);
  const eraCounts = {}; entries.forEach(e=>eraCounts[e.era]=(eraCounts[e.era]||0)+1);
  $app.innerHTML = nav('/') + `
  <section class="hero"><div class="wrap">
    <div class="stat">据中国教育和科研计算机网：2013 年的网页，38% 已不复存在</div>
    <h1>404 <span class="num">博物馆</span></h1>
    <p class="sub">纪念那些消失的中国互联网产品。<br>每一块墓碑都有考据、有引用，还有一场 AI 圆桌复盘。</p>
    <div class="actions">
      <a class="btn primary" href="#/museum">进入墓碑长廊（${entries.length}）</a>
      <a class="btn" href="#/quiz">测测你是哪年冲浪选手</a>
    </div>
  </div></section>
  <section class="sec"><div class="wrap"><h2>今日扫墓</h2><p class="desc">每天为你随机开一座碑。</p>
    <a class="today" href="#/e/${today.id}">
      <div class="stone-mini">🪦</div>
      <div><h3>${esc(today.name)}</h3><div class="life">${life(today)} · ${CAUSE[today.death_cause]||''}</div>
      <p>${esc(today.epitaph)}</p></div>
    </a>
  </div></section>
  <section class="sec"><div class="wrap"><h2>年代墙</h2><p class="desc">按产品实质死亡的年代分布。</p>
    <div class="era-wall">${ERA_ORDER.map(k=>{
      const n=eraCounts[k]||0;
      return `<div class="era-card" onclick="location.hash='#/museum/${k}'">
        <div class="yrs">${ERA[k].yrs}</div><div class="nm">${ERA[k].nm}</div>
        <div class="ct">${n} 座墓碑</div></div>`;}).join('')}
    </div>
  </div></section>
  <section class="sec"><div class="wrap"><h2>随机参观</h2><p class="desc">博物馆没有导览员，只有命运。</p>
    <div class="sec-grid">${shuffled.map(cardHTML).join('')}</div>
  </div></section>
  ${footerHTML()}`;
}
function cardHTML(e){
  return `<a class="card" href="#/e/${e.id}">
    <div class="tears" title="时代眼泪指数">${tearsStars(e.tears_hint||3)}</div>
    <h3>${esc(e.name)}</h3>
    <div class="life">${life(e)} · ${ERA[e.era]?.nm||''}</div>
    <div class="epi">${esc(e.epitaph)}</div>
    <div class="meta"><span class="chip cause">${CAUSE[e.death_cause]||''}</span>
    ${(e.tags||[]).slice(0,2).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>
  </a>`;
}
function footerHTML(){
  return `<footer id="site-footer"><div class="wrap">
    <p>互联网并非永恒。2013 年的网页，38% 已经消失。</p>
    <p>数据由 AI 智能体集群考据生成 · 内容 CC BY-SA 4.0 · <a href="#/about">关于与勘误</a></p></div></footer>`;
}

/* ---------- 长廊 ---------- */
let museumState={era:'all',cat:'all',cause:'all',q:''};
async function vMuseum(eraParam){
  if(eraParam && ERA[eraParam]) museumState.era=eraParam;
  const all = await idx();
  $app.innerHTML = nav('#/museum') + `
  <section class="sec"><div class="wrap">
    <h2>墓碑长廊</h2><p class="desc">共 ${all.length} 座碑。按年代 / 类别 / 死因筛选，或直接搜索。</p>
    <div class="filter-bar">
      <input id="q" placeholder="搜索产品名、别名、标签…" value="${esc(museumState.q)}">
    </div>
    <div class="filter-bar" id="era-pills"><span class="count-note">年代</span>
      <span class="pill ${museumState.era==='all'?'on':''}" data-era="all">全部</span>
      ${ERA_ORDER.map(k=>`<span class="pill ${museumState.era===k?'on':''}" data-era="${k}" title="${ERA[k].yrs}">${ERA[k].yrs.split('–')[0]}s</span>`).join('')}
    </div>
    <div class="filter-bar" id="cat-pills"><span class="count-note">类别</span>
      <span class="pill ${museumState.cat==='all'?'on':''}" data-cat="all">全部</span>
      ${[['community','社区'],['social','社交'],['media','媒体'],['music','音乐'],['video','视频'],['game','游戏'],['ecommerce','电商'],['o2o','O2O'],['finance','金融'],['hardware','硬件'],['software','软件'],['webdisk','网盘'],['education','教育'],['tool','工具'],['browser','浏览器'],['other','其他']]
        .map(([k,n])=>`<span class="pill ${museumState.cat===k?'on':''}" data-cat="${k}">${n}</span>`).join('')}
    </div>
    <div class="filter-bar" id="cause-pills"><span class="count-note">死因</span>
      <span class="pill ${museumState.cause==='all'?'on':''}" data-cause="all">全部</span>
      ${Object.entries(CAUSE).map(([k,n])=>`<span class="pill ${museumState.cause===k?'on':''}" data-cause="${k}">${n}</span>`).join('')}
    </div>
    <div class="count-note" id="count"></div>
    <div class="sec-grid" id="grid"></div>
  </div></section>${footerHTML()}`;
  const input=document.getElementById('q');
  input.oninput=()=>{museumState.q=input.value;renderGrid(all);};
  document.querySelectorAll('#era-pills .pill').forEach(p=>p.onclick=()=>{museumState.era=p.dataset.era;syncPills();renderGrid(all);});
  document.querySelectorAll('#cat-pills .pill').forEach(p=>p.onclick=()=>{museumState.cat=p.dataset.cat;syncPills();renderGrid(all);});
  document.querySelectorAll('#cause-pills .pill').forEach(p=>p.onclick=()=>{museumState.cause=p.dataset.cause;syncPills();renderGrid(all);});
  renderGrid(all);
}
function syncPills(){
  document.querySelectorAll('#era-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.era===museumState.era));
  document.querySelectorAll('#cat-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.cat===museumState.cat));
  document.querySelectorAll('#cause-pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.cause===museumState.cause));
}
function renderGrid(all){
  const q=museumState.q.trim().toLowerCase();
  const list=all.filter(e=>
    (museumState.era==='all'||e.era===museumState.era) &&
    (museumState.cat==='all'||e.category===museumState.cat) &&
    (museumState.cause==='all'||e.death_cause===museumState.cause) &&
    (!q || [e.name,...(e.aliases||[]),...(e.tags||[])].join(' ').toLowerCase().includes(q)));
  document.getElementById('count').textContent=`命中 ${list.length} 座碑`;
  document.getElementById('grid').innerHTML = list.map(cardHTML).join('') ||
    '<div style="color:var(--ink-faint);padding:30px 0">这里还没有墓碑。</div>';
}

/* ---------- 词条页 ---------- */
async function vEntry(id){
  const m = await db();
  const e = m[id];
  if(!e){ $app.innerHTML=nav('#/e')+'<div class="loading">这座碑不存在。</div>'; return; }
  const list = Object.values(m).sort((a,b)=>String(a.died).localeCompare(String(b.died)));
  const i = list.findIndex(x=>x.id===id);
  const prev=list[i-1], next=list[i+1];
  const votes = JSON.parse(localStorage.getItem('m404-votes')||'{}');
  const my = votes[id];
  $app.innerHTML = nav('#/e') + `
  <div class="entry-head"><div class="wrap">
    <div class="tomb">
      <div class="r-i-p">REST IN PEACE</div>
      <h1>${esc(e.name)}</h1>
      <div class="life">${esc(e.born||'????')}<span class="dash">✝</span>${esc(e.died||'????')}</div>
      <div class="epi">${esc(e.epitaph)}</div>
      <div class="cause">死因 · <b>${CAUSE[e.death_cause]||''}</b> — ${esc(e.cause_detail||'')}</div>
    </div>
    <div class="vote-row">
      <span>时代眼泪指数：</span>
      <span class="stars">${[1,2,3,4,5].map(n=>`<span class="star ${my&&n<=my?'on':''}" data-n="${n}">✦</span>`).join('')}</span>
      <span id="voted">${my?`你投了 ${my}`:`点击打分`}</span>
    </div>
  </div></div>
  <section class="story"><div class="wrap">
    <h2><span>壹</span>诞生</h2><p>${esc(e.story['诞生'])}</p>
    <h2><span>贰</span>巅峰</h2><p>${esc(e.story['巅峰'])}</p>
    <h2><span>叁</span>转折</h2><p>${esc(e.story['转折'])}</p>
    <h2><span>肆</span>终局</h2><p>${esc(e.story['终局'])}</p>
  </div></section>
  <section class="sec"><div class="wrap">
    <h2 style="text-align:center">名场面</h2>
    <div class="moments">${e.moments.map(x=>`<div class="moment">${esc(x)}</div>`).join('')}</div>
  </div></section>
  ${(e.quotes&&e.quotes.length)?`<section class="sec"><div class="wrap">
    <h2 style="text-align:center">留下的那句话</h2>
    ${e.quotes.map(q=>`<div class="quote-block"><div class="qt">“${esc(q.text)}”</div><div class="qc">— ${esc(q.context||'')}</div></div>`).join('')}
  </div></section>`:''}
  <section class="sec"><div class="wrap">
    <h2 style="text-align:center">AI 圆桌复盘</h2>
    <p class="desc" style="text-align:center">四个视角，围着这块碑聊了聊它为什么死。</p>
    <div class="roundtable">${e.roundtable.map((r,i)=>`
      <div class="rt p${i+1}"><div class="avatar">${['📐','🕯️','💰','⏳'][i]}</div>
      <div class="bubble"><div class="who">${esc(r.persona)}</div><div class="say">${esc(r.say)}</div></div></div>`).join('')}
    </div>
    <div class="consensus">${esc(e.consensus)}</div>
  </div></section>
  <section class="sec"><div class="wrap">
    <h2 style="text-align:center">遗产</h2>
    <div class="legacy-list">${e.legacy.map(x=>`<div class="moment">${esc(x)}</div>`).join('')}</div>
  </div></section>
  <section class="sec"><div class="wrap">
    <h2 style="text-align:center">来源与考据</h2>
    <ul class="sources">${e.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>
      <span class="site">· ${esc(s.site)}${s.date?' · '+esc(s.date):''}</span></li>`).join('')}</ul>
    ${e.status==='partially_verified'?'<div class="status-note">⚠️ 本词条部分事实仍待进一步考证（status: partially_verified），欢迎提供线索。</div>':''}
    ${(e.related&&e.related.length)?`<div style="text-align:center;margin-top:20px"><h2 style="text-align:center">一并参观</h2>
      <div class="related-row">${e.related.map(r=>m[r]?`<a href="#/e/${r}">${esc(m[r].name)}</a>`:'').join('')}</div></div>`:''}
    <div class="prevnext">
      ${prev?`<a href="#/e/${prev.id}">← 更早的碑<span>${esc(prev.name)}</span></a>`:'<span></span>'}
      ${next?`<a class="next" href="#/e/${next.id}">更近的碑 →<span>${esc(next.name)}</span></a>`:'<span></span>'}
    </div>
  </div></section>${footerHTML()}`;
  document.querySelectorAll('.star').forEach(s=>s.onclick=()=>{
    votes[id]=+s.dataset.n; localStorage.setItem('m404-votes',JSON.stringify(votes));
    document.querySelectorAll('.star').forEach(x=>x.classList.toggle('on',+x.dataset.n<=votes[id]));
    document.getElementById('voted').textContent=`你投了 ${votes[id]} · 谢谢扫墓`;
  });
}

/* ---------- 时间轴 ---------- */
async function vTimeline(){
  const all=await idx();
  const byYear={};
  all.forEach(e=>{const y=String(e.died).slice(0,4);(byYear[y]=byYear[y]||[]).push(e);});
  const years=Object.keys(byYear).sort();
  const t0=+years[0]||2000, t1=+years[years.length-1]||2026;
  const cols=[]; for(let y=t0;y<=t1;y++) cols.push(y);
  $app.innerHTML=nav('#/timeline')+`
  <section class="sec"><div class="wrap">
    <h2>死亡时间轴</h2><p class="desc">把每座碑钉在它退场的年份上。悬停圆点，点击产品名。</p>
    <div class="timeline"><div class="tl-track">
      ${cols.map(y=>`<div class="tl-year"><div class="yr">${y}</div><div class="dot" title="${(byYear[y]||[]).map(e=>e.name).join('、')}"></div>
        <div class="names">${(byYear[y]||[]).slice(0,8).map(e=>`<a href="#/e/${e.id}">${esc(e.name)}</a>`).join('')}</div></div>`).join('')}
    </div></div>
  </div></section>${footerHTML()}`;
}

/* ---------- 测验 ---------- */
async function vQuiz(){
  const allQ=await quizData();
  if(!allQ.length){ $app.innerHTML=nav('#/quiz')+'<div class="loading">题库还在施工中…</div>'; return; }
  const qs=[...allQ].sort(()=>Math.random()-.5).slice(0,10);
  let i=0, score=0, eras=[];
  $app.innerHTML=nav('#/quiz')+`<section class="sec"><div class="wrap">
    <h2 style="text-align:center">冲浪测验</h2><p class="desc" style="text-align:center">10 道题，测测你是哪一年的冲浪选手。</p>
    <div class="quiz-box" id="qb"></div></div></section>${footerHTML()}`;
  const qb=document.getElementById('qb');
  function renderQ(){
    const q=qs[i];
    const opts=[{t:q.a,ok:true},...q.wrong.map(w=>({t:w,ok:false}))].sort(()=>Math.random()-.5);
    qb.innerHTML=`<div class="quiz-bar"><i style="width:${i/qs.length*100}%"></i></div>
      <div class="qno">第 ${i+1} 题 / ${qs.length}</div><h3>${esc(q.q)}</h3>
      ${opts.map((o,j)=>`<button class="opt" data-j="${j}">${esc(o.t)}</button>`).join('')}`;
    qb.querySelectorAll('.opt').forEach(btn=>btn.onclick=()=>{
      const pick=opts[+btn.dataset.j];
      qb.querySelectorAll('.opt').forEach((b,j)=>{ if(opts[j].ok) b.classList.add('correct'); });
      if(!pick.ok) btn.classList.add('wrong'); else score++;
      const entryId=q.entry;
      idx().then(es=>{ const e=es.find(x=>x.id===entryId); if(e) eras.push(e.era); });
      setTimeout(()=>{ i++; i<qs.length?renderQ():renderR(); }, 900);
    });
  }
  function renderR(){
    const mainEra = eras.length? eras.sort((a,b)=>eras.filter(x=>x===b).length-eras.filter(x=>x===a).length)[0] : null;
    const titles={portal:['拨号上网元老','你记得猫声 modem 的握手音。'],
      bbs:['BBS 黄金一代','灌水、置顶、斑竹——这些词是你青春的方言。'],
      blog:['博客时代文青','你的 RSS 阅读器曾经比朋友圈还热闹。'],
      social:['微博原住民','你见证了 140 字如何改变中文互联网。'],
      mobile:['移动冲浪先驱','你的第一台智能机装满了后来都消失的 App。'],
      o2o:['补贴大战幸存者','你薅过千团大战的羊毛，也等过永远不退的押金。'],
      stream:['算法时代冲浪手','你看着一个又一个 App 悄悄下线，学会了不回头。'],
      agent:['AI 时代新人类','你出生就在线上，博物馆对你来说是考古现场。']};
    const t=titles[mainEra]||titles['stream'];
    qb.innerHTML=`<div class="quiz-result">
      <div class="qno">答对 ${score} / ${qs.length}</div>
      <div class="title">${t[0]}</div>
      <div class="desc">${t[1]}</div>
      <div class="actions" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn" id="copy">复制战报分享</button>
        <button class="btn" id="again">再测一次</button></div>
    </div>`;
    document.getElementById('copy').onclick=()=>{
      const txt=`【404博物馆·冲浪测验】我是「${t[0]}」，${score}/${qs.length}。测测你是哪一年的冲浪选手：`;
      (navigator.clipboard?.writeText(txt)||Promise.reject()).then(()=>alert('已复制战报！'),()=>alert(txt));
    };
    document.getElementById('again').onclick=vQuiz;
  }
  renderQ();
}

/* ---------- 关于 ---------- */
function vAbout(){
  $app.innerHTML=nav('#/about')+`<section class="sec"><div class="wrap"><div class="about-block">
    <h2>这里是什么</h2>
    <p>「404 博物馆」是一座为<strong>消失的中国互联网产品</strong>建立的线上纪念博物馆。每一个词条记录一个产品的诞生、巅峰、转折与终局，所有事实性陈述都附有公开报道来源。</p>
    <h2>内容是怎么生产的</h2>
    <ol>
      <li><strong>考据</strong>：AI 智能体上网检索权威报道（央媒、法院、政府网站、科技媒体），为每个产品撰写词条；</li>
      <li><strong>校验</strong>：脚本强制检查引用数量（≥2）、日期格式、死因分类等结构性规则；</li>
      <li><strong>圆桌复盘</strong>：四个 AI 视角（产品经理 / 老用户 / 投资人 / 时代观察者）基于词条事实做复盘——这是本馆与普通档案不同的地方。</li>
    </ol>
    <h2>勘误与共建</h2>
    <p>AI 会犯错。如果你发现日期、数字或叙事与事实不符，欢迎在本项目的 GitHub 仓库提 issue 或直接改 JSON 文件——每块墓碑就是一个独立的数据文件。标注 <code>partially_verified</code> 的词条尤其需要你的线索。</p>
    <h2>版权与许可</h2>
    <p>本项目原创内容（词条叙事、圆桌复盘）以 <strong>CC BY-SA 4.0</strong> 提供；引用的新闻标题与链接版权归原作者所有，引用仅为说明事实来源。本项目不做任何商业用途。</p>
    <h2>为什么做这个</h2>
    <p>2013 年的网页，38% 已经消失。小鸡词典停服时，人们发现连「查梗」的地方都会一夜蒸发。我们不抢救数据——我们只希望当产品消失时，至少有块碑解释它曾经来过。</p>
  </div></div></section>${footerHTML()}`;
}

footer(); route();
