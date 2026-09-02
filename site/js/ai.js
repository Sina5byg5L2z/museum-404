/* 404 博物馆 · AI 问事处
   聊天式界面：全屏高度、输入框钉底；会话历史存 IndexedDB（db: m404-ai / store: sessions）；
   回答用零依赖 markdown 渲染器（先整体转义再做白名单变换，防 XSS）。
   BYOK：密钥只存 localStorage，请求由浏览器直连 OpenAI 兼容接口。 */
window.M404AI = (() => {
  const LSC='m404-ai-cfg', LSH='m404-ai-chat', LS_LAST='m404-ai-last';
  const PRESETS = {
    siliconflow:{nm:'硅基流动 SiliconFlow', base:'https://api.siliconflow.cn/v1', model:'Qwen/Qwen3-8B'},
    mimo:      {nm:'小米 MiMo',      base:'https://api.xiaomimimo.com/v1', model:'mimo-v2-flash'},
    deepseek:  {nm:'DeepSeek',       base:'https://api.deepseek.com/v1', model:'deepseek-chat'},
    zhipu:     {nm:'智谱 GLM',       base:'https://open.bigmodel.cn/api/paas/v4', model:'glm-4-flash'},
    moonshot:  {nm:'月之暗面 Kimi',  base:'https://api.moonshot.cn/v1', model:'moonshot-v1-8k'},
    dashscope: {nm:'阿里通义千问',   base:'https://dashscope.aliyuncs.com/compatible-mode/v1', model:'qwen-plus'},
    doubao:    {nm:'字节豆包 · 火山方舟', base:'https://ark.cn-beijing.volces.com/api/v3', model:'doubao-1.5-pro-32k'},
    hunyuan:   {nm:'腾讯混元',       base:'https://api.hunyuan.cloud.tencent.com/v1', model:'hunyuan-turbos-latest'},
    qianfan:   {nm:'百度千帆',       base:'https://qianfan.baidubce.com/v2', model:'ernie-4.0-8k-latest'},
    lingyi:    {nm:'零一万物',       base:'https://api.lingyiwanwu.com/v1', model:'yi-lightning'},
    openai:    {nm:'OpenAI',         base:'https://api.openai.com/v1', model:'gpt-4o-mini'},
    openrouter:{nm:'OpenRouter',     base:'https://openrouter.ai/api/v1', model:'openrouter/auto'},
    groq:      {nm:'Groq',           base:'https://api.groq.com/openai/v1', model:'llama-3.3-70b-versatile'},
    ollama:    {nm:'Ollama（本机）',  base:'http://127.0.0.1:11434/v1', model:'qwen2.5:7b'},
    lmstudio:  {nm:'LM Studio（本机）', base:'http://127.0.0.1:1234/v1', model:'local-model'},
    custom:    {nm:'自定义（任意 OpenAI 兼容端点）', base:'', model:''},
  };
  const PRESET_GROUPS = [
    ['常用', ['siliconflow','mimo','deepseek','zhipu','moonshot']],
    ['国内其他', ['dashscope','doubao','hunyuan','qianfan','lingyi']],
    ['海外', ['openai','openrouter','groq']],
    ['本机 · 免密钥', ['ollama','lmstudio']],
    ['其他', ['custom']],
  ];
  const DEFAULT_SYS =
`你是「404博物馆」的 AI 讲解员。这座线上博物馆纪念消失的中国互联网产品，每座碑记录一个产品的诞生、巅峰、转折与终局，事实性陈述均附公开报道来源。

回答规则：
1. 优先依据【馆藏资料】作答，引用时标注来源词条，如（据馆藏·虾米音乐）。
2. 馆藏资料没覆盖的：先说明本馆未收录相关词条，再可基于公开常识简短补充，并注明那部分不是馆藏考据。
3. 不编造日期、数字与来源；馆藏资料互相冲突时要指出。
4. 风格温和、有讲解员的考据感，可用「碑」「扫墓」的意象，不煽情不夸张。
5. 用中文回答。可以用 markdown 组织内容（小标题、列表、表格、加粗），但不要用一级二级标题。`;
  const SAMPLES = [
    '音乐产品里,哪些是被版权大战拖垮的?',
    '共享单车大战,钱是怎么烧没的?',
    '帮我挑五座最值得看的碑,说说理由。',
  ];
  const SUGGEST_FIXED = ['千团大战谁赢了?','有哪些死掉的搜索引擎?','P2P 是怎么崩的?'];

  let sending=false, ctrl=null, rafPending=false;
  let cur=null, list=[];   /* 当前会话 & 会话索引（IndexedDB 镜像） */

  /* ---------- 配置 ---------- */
  const getCfg = () => {
    try{ return JSON.parse(localStorage.getItem(LSC)) || {}; }catch{ return {}; }
  };
  const hasCfg = () => { const c=getCfg(); return !!(c.baseUrl && c.model); };

  /* ---------- IndexedDB（会话历史） ---------- */
  let idbP=null;
  const idb = () => idbP || (idbP = new Promise((res,rej)=>{
    const q=indexedDB.open('m404-ai',1);
    q.onupgradeneeded=()=>{ q.result.createObjectStore('sessions',{keyPath:'id'}); };
    q.onsuccess=()=>res(q.result);
    q.onerror=()=>rej(q.error);
  }));
  const idbAll = async () => {
    const d=await idb();
    return new Promise((res,rej)=>{
      const r=d.transaction('sessions').objectStore('sessions').getAll();
      r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error);
    });
  };
  const idbPut = async (s) => {
    const d=await idb();
    return new Promise((res,rej)=>{
      const r=d.transaction('sessions','readwrite').objectStore('sessions').put(s);
      r.onsuccess=()=>res(); r.onerror=()=>rej(r.error);
    });
  };
  const idbDel = async (id) => {
    const d=await idb();
    return new Promise((res,rej)=>{
      const r=d.transaction('sessions','readwrite').objectStore('sessions').delete(id);
      r.onsuccess=()=>res(); r.onerror=()=>rej(r.error);
    });
  };

  /* ---------- 会话管理 ---------- */
  const newSession = () => ({
    id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    title:'新对话', createdAt:Date.now(), updatedAt:Date.now(), msgs:[],
  });
  async function loadState(){
    try{ list=(await idbAll()).sort((a,b)=>b.updatedAt-a.updatedAt); }catch{ list=[]; }
    /* 旧版 localStorage 对话迁移进 IndexedDB */
    let migrated=null;
    try{
      const old=JSON.parse(localStorage.getItem(LSH)||'null');
      if(Array.isArray(old)&&old.length){
        const s=newSession();
        const fu=old.find(m=>m.role==='user');
        s.title=fu?fu.content.slice(0,24):'旧对话';
        s.msgs=old.filter(m=>m&&m.role&&typeof m.content==='string');
        await idbPut(s); list.push(s); list.sort((a,b)=>b.updatedAt-a.updatedAt);
        localStorage.removeItem(LSH);
        migrated=s;
      }
    }catch{}
    const last=localStorage.getItem(LS_LAST);
    cur=list.find(s=>s.id===last)||(migrated&&list.find(s=>s.id===migrated.id))||null;
  }
  async function saveCur(){
    if(!cur||!cur.msgs.length) return;
    cur.updatedAt=Date.now();
    const fu=cur.msgs.find(m=>m.role==='user');
    if(fu) cur.title=fu.content.slice(0,30);
    try{ await idbPut(cur); }catch{}
    list=[cur,...list.filter(s=>s.id!==cur.id)].sort((a,b)=>b.updatedAt-a.updatedAt);
    localStorage.setItem(LS_LAST,cur.id);
  }

  /* ---------- 检索 ---------- */
  function tokenize(q){
    const s=(q||'').toLowerCase(), set=new Set();
    (s.match(/[a-z0-9][a-z0-9\-\.]{1,}/g)||[]).forEach(w=>set.add(w));
    (s.match(/[\u4e00-\u9fff]+/g)||[]).forEach(seg=>{
      if(seg.length>=2) set.add(seg);
      for(let i=0;i+1<seg.length;i++) set.add(seg.slice(i,i+2));
    });
    return [...set];
  }
  function retrieve(entries, q){
    const terms=tokenize(q); if(!terms.length) return [];
    const scored=[];
    for(const e of entries){
      const names=(e.name+' '+(e.aliases||[]).join(' ')).toLowerCase();
      const tags=(e.tags||[]).join(' ').toLowerCase();
      const body=((e.epitaph||'')+' '+(e.cause_detail||'')).toLowerCase();
      let s=0;
      for(const t of terms){ if(names.includes(t)) s+=3; else if(tags.includes(t)) s+=2; else if(body.includes(t)) s+=1; }
      if(names.includes(q.trim().toLowerCase())) s+=6;
      if(s>0) scored.push([s,e]);
    }
    scored.sort((a,b)=>b[0]-a[0]);
    return scored.slice(0,6).map(x=>x[1]);
  }
  function entryCtx(e){
    const p=[`【${e.name}】${e.born||'?'} — ${e.died||'?'} · ${CAUSE[e.death_cause]||''}（${e.status==='partially_verified'?'部分待考':'已考据'}）`];
    if(e.cause_detail) p.push('死因: '+e.cause_detail);
    if(e.epitaph) p.push('碑文: '+e.epitaph);
    if(e.peak||e.peak_users) p.push('巅峰: '+[e.peak?'约 '+e.peak:'',e.peak_users||''].filter(Boolean).join(' · '));
    if(e.story) for(const [k,v] of Object.entries(e.story)) if(v) p.push(k+': '+v);
    if(e.tags&&e.tags.length) p.push('标签: '+e.tags.join('、'));
    if(e.sources&&e.sources.length) p.push('来源: '+e.sources.slice(0,2).map(s=>`${s.title}（${s.site}）`).join('; '));
    return p.join('\n');
  }
  function statsLine(entries){
    const yrs=entries.map(e=>String(e.died||'').slice(0,4)).filter(Boolean).sort();
    return `馆藏共 ${entries.length} 座碑（词条），卒年跨度 ${yrs[0]||'?'}–${yrs[yrs.length-1]||'?'}。词条字段：名称/别名/生卒年/死因/碑文/四段考据叙事（诞生、巅峰、转折、终局）/名场面/AI圆桌复盘/遗产/新闻来源。`;
  }

  /* ---------- 零依赖 markdown 渲染（先转义后变换，输出仅白名单标签） ---------- */
  function mdInline(s){
    return s
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,'$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g,'<del>$1</del>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*|#[^)\s]*)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(src){
    const lines=esc(String(src||'')).replace(/\r\n?/g,'\n').split('\n');
    const out=[]; let pbuf=[], code=[], inCode=false;
    const flushP=()=>{ if(pbuf.length){ out.push('<p>'+mdInline(pbuf.join('<br>'))+'</p>'); pbuf=[]; } };
    let i=0;
    while(i<lines.length){
      const ln=lines[i];
      if(/^\s*```/.test(ln)){
        flushP();
        if(!inCode){ inCode=true; code=[]; }
        else{ inCode=false; out.push('<pre><code>'+code.join('\n')+'</code></pre>'); }
        i++; continue;
      }
      if(inCode){ code.push(ln); i++; continue; }
      if(/^\s*\|.*\|\s*$/.test(ln) && i+1<lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i+1])){
        flushP();
        const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
        const head=cells(ln); i+=2; const rows=[];
        while(i<lines.length&&/^\s*\|.*\|\s*$/.test(lines[i])){ rows.push(cells(lines[i])); i++; }
        out.push('<table><thead><tr>'+head.map(h=>'<th>'+mdInline(h)+'</th>').join('')+'</tr></thead><tbody>'
          +rows.map(r=>'<tr>'+r.map(c=>'<td>'+mdInline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>');
        continue;
      }
      const h=ln.match(/^(#{1,4})\s+(.*)/);
      if(h){ flushP(); const lv=Math.min(h[1].length+2,6); out.push(`<h${lv}>`+mdInline(h[2].replace(/^#+\s*/,''))+`</h${lv}>`); i++; continue; }
      if(/^\s*(?:-\s*){3,}$|^\s*(?:\*\s*){3,}$|^\s*(_\s*){3,}$/.test(ln)){ flushP(); out.push('<hr>'); i++; continue; }
      if(/^&gt;\s?/.test(ln)){
        flushP(); const q=[];
        while(i<lines.length&&/^&gt;\s?/.test(lines[i])){ q.push(lines[i].replace(/^&gt;\s?/,'')); i++; }
        out.push('<blockquote>'+mdInline(q.join('<br>'))+'</blockquote>');
        continue;
      }
      if(/^\s*([-*+]|\d+[.、)])\s+/.test(ln)){
        flushP();
        const ordered=/^\s*\d/.test(ln); const items=[];
        while(i<lines.length&&/^\s*([-*+]|\d+[.、)])\s+/.test(lines[i])){
          items.push(lines[i].replace(/^\s*([-*+]|\d+[.、)])\s+/,'')); i++;
          while(i<lines.length&&/^\s{2,}\S/.test(lines[i])&&!/^\s*([-*+]|\d+[.、)])\s+/.test(lines[i])){ items[items.length-1]+=' '+lines[i].trim(); i++; }
        }
        out.push((ordered?'<ol>':'<ul>')+items.map(it=>'<li>'+mdInline(it)+'</li>').join('')+(ordered?'</ol>':'</ul>'));
        continue;
      }
      if(!ln.trim()){ flushP(); i++; continue; }
      pbuf.push(ln); i++;
    }
    if(inCode) out.push('<pre><code>'+code.join('\n')+'</code></pre>');
    flushP();
    return out.join('');
  }

  /* ---------- 视图 ---------- */
  async function view(){
    if(!cur) await loadState();
    $app.innerHTML=nav('#/ai')+`
    <div class="ai-shell">
      <div class="ai-toolbar">
        <button class="btn sm" id="ai-new">＋ 新对话</button>
        <button class="btn sm" id="ai-hist">历史对话</button>
        <span class="ai-chip" id="ai-chip"></span>
        <span style="flex:1"></span>
        <button class="btn sm" id="ai-cfg">接入配置</button>
      </div>
      <div class="ai-msgs" id="ai-msgs"></div>
      <div class="ai-dock">
        <div class="ai-suggest" id="ai-suggest"></div>
        <div class="ai-input-row">
          <textarea id="ai-in" rows="1" placeholder="问问看:哪些音乐产品死于版权大战?"></textarea>
          <button class="btn primary" id="ai-send">提问</button>
        </div>
        <p class="ai-note">密钥只存你的浏览器（localStorage），请求由浏览器直发服务商 · 对话历史存 IndexedDB，仅在本机 · AI 可能出错，重要事实请核对词条页引用来源。</p>
      </div>
    </div>`;
    renderChip(); renderSuggest(); renderMsgs();
    const inp=document.getElementById('ai-in'), sendBtn=document.getElementById('ai-send');
    sendBtn.onclick=()=>{ sending?stop():send(); };
    inp.addEventListener('input',()=>grow(inp));
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); if(!sending) send(); }
    });
    document.getElementById('ai-cfg').onclick=()=>openSettings();
    document.getElementById('ai-new').onclick=newChat;
    document.getElementById('ai-hist').onclick=openDrawer;
    const pre=sessionStorage.getItem('m404-ai-prefill');
    if(pre){ sessionStorage.removeItem('m404-ai-prefill'); inp.value=pre; grow(inp); if(hasCfg()) send(); else openSettings(); }
    else inp.focus();
  }

  function renderChip(){
    const c=getCfg(), el=document.getElementById('ai-chip');
    if(!el) return;
    el.textContent = hasCfg() ? `${c.model} @ ${c.baseUrl.replace(/^https?:\/\//,'').replace(/\/+$/,'')}` : '未接入 AI · 点「接入配置」开始';
    el.classList.toggle('off', !hasCfg());
  }
  function renderSuggest(){
    const box=document.getElementById('ai-suggest');
    if(!box) return;
    const empty=!cur||!cur.msgs.length;
    box.innerHTML = empty
      ? '<span class="ai-suggest-label">可以问——</span>'+[...SAMPLES,...SUGGEST_FIXED].map(s=>`<button class="ai-chip-q">${esc(s)}</button>`).join('')
      : '';
    box.querySelectorAll('.ai-chip-q').forEach(b=>b.onclick=()=>{
      const inp=document.getElementById('ai-in'); inp.value=b.textContent; grow(inp); send();
    });
  }
  function renderMsgs(){
    const box=document.getElementById('ai-msgs'); if(!box) return;
    box.innerHTML='';
    if(!cur||!cur.msgs.length){
      box.innerHTML='<div class="ai-empty">馆内请随意提问<br><small>每一句，讲解员都会先翻一遍 207 座碑的考据</small></div>';
      return;
    }
    cur.msgs.forEach(m=>appendBubble(m));
    scrollBottom(true);
  }
  function appendBubble(m){
    const box=document.getElementById('ai-msgs');
    const el=document.createElement('div'); el.className='ai-msg '+m.role+(m.error?' err':'');
    const who=document.createElement('div'); who.className='ai-who'; who.textContent=m.role==='user'?'你':'讲解员';
    const body=document.createElement('div'); body.className='ai-body'+(m.content?'':' typing');
    if(m.role==='assistant') body.innerHTML=md(m.content||'');
    else body.textContent=m.content||'';
    const cites=document.createElement('div'); cites.className='ai-cites';
    if(m.content&&m.cites&&m.cites.length) cites.innerHTML='依据馆藏: '+m.cites.map(c=>`<a href="#/e/${c.id}">${esc(c.name)}</a>`).join(' · ');
    el.append(who,body,cites); box.append(el);
    return {el,body,cites};
  }
  function scrollBottom(force){
    const box=document.getElementById('ai-msgs');
    if(box) box.scrollTop=box.scrollHeight;
  }
  function grow(t){ t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,180)+'px'; }
  function setSendingUI(on){
    const btn=document.getElementById('ai-send'); if(btn) btn.textContent=on?'停止':'提问';
  }

  /* ---------- 对话 ---------- */
  async function send(){
    if(sending) return;
    const inp=document.getElementById('ai-in');
    const text=inp.value.trim(); if(!text) return;
    if(!hasCfg()){ openSettings(); return; }
    if(!cur) cur=newSession();
    inp.value=''; grow(inp);
    cur.msgs.push({role:'user',content:text});
    renderSuggest(); appendBubble(cur.msgs[cur.msgs.length-1]); scrollBottom(true);
    saveCur();
    await callLLM(text);
  }
  function stop(){ if(ctrl) ctrl.abort(); }
  async function newChat(){
    if(sending) return;
    await saveCur();
    cur=newSession();
    renderMsgs(); renderSuggest();
    const inp=document.getElementById('ai-in'); if(inp) inp.focus();
  }

  async function callLLM(q){
    const cfg=getCfg();
    sending=true; setSendingUI(true); ctrl=new AbortController();
    const prior=cur.msgs.slice(0,-1).filter(m=>!m.error).slice(-12)
      .map(m=>({role:m.role,content:m.content}));
    const a={role:'assistant',content:'',cites:[]};
    cur.msgs.push(a);
    const {body,cites}=appendBubble(a); scrollBottom(true);
    const paint=()=>{ body.innerHTML=md(a.content); scrollBottom(); };
    try{
      const entries=await idx();
      const hits=retrieve(entries,q);
      a.cites=hits.map(h=>({id:h.id,name:h.name}));
      const m=await db();
      let parts=[],used=0;
      for(const h of hits){ const e=m[h.id]; if(!e) continue; const c=entryCtx(e);
        if(used+c.length>9000&&parts.length) break; parts.push(c); used+=c.length; }
      const sys=(cfg.system||DEFAULT_SYS)
        +'\n\n【馆藏概况】'+statsLine(entries)
        +'\n\n【馆藏资料】（与本次提问可能相关的词条，按相关度排序）\n'
        +(parts.length?parts.join('\n\n'):'（未检索到直接相关的馆藏词条）');
      const res=await fetch(cfg.baseUrl.replace(/\/+$/,'')+'/chat/completions',{
        method:'POST', signal:ctrl.signal,
        headers:Object.assign({'Content-Type':'application/json'},
          cfg.apiKey?{'Authorization':'Bearer '+cfg.apiKey}:{},
          cfg.baseUrl.includes('openrouter')?{'HTTP-Referer':location.origin,'X-Title':'Museum 404'}:{}),
        body:JSON.stringify({model:cfg.model,temperature:cfg.temp??0.7,stream:true,
          messages:[{role:'system',content:sys},...prior,{role:'user',content:q}]})
      });
      if(!res.ok){
        const t=await res.text().catch(()=>'');
        throw new Error(hintFor(res.status,t));
      }
      const ct=res.headers.get('content-type')||'';
      if(ct.includes('event-stream')){
        const reader=res.body.getReader(), dec=new TextDecoder(); let buf='';
        for(;;){
          const {done,value}=await reader.read(); if(done) break;
          buf+=dec.decode(value,{stream:true});
          let i;
          while((i=buf.indexOf('\n'))>=0){
            const line=buf.slice(0,i).trim(); buf=buf.slice(i+1);
            if(!line.startsWith('data:')) continue;
            const data=line.slice(5).trim();
            if(!data||data==='[DONE]') continue;
            try{
              const j=JSON.parse(data);
              const ch=j.choices&&j.choices[0];
              const d=ch&&(ch.delta&&ch.delta.content||ch.message&&ch.message.content);
              if(d){
                a.content+=d; body.classList.remove('typing');
                if(!rafPending){ rafPending=true; requestAnimationFrame(()=>{ rafPending=false; paint(); }); }
              }
            }catch{}
          }
        }
      }else{
        const j=await res.json();
        a.content=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||('（服务端返回了无法解析的内容）'+JSON.stringify(j).slice(0,300));
      }
      if(!a.content) a.content='（服务端没有返回内容，检查模型名是否正确。）';
    }catch(ex){
      a.error=true;
      a.content = ex.name==='AbortError' ? '—— 已停止 ——' : '⚠️ '+ex.message;
    }
    paint();
    body.classList.remove('typing');
    body.parentElement.classList.toggle('err',!!a.error);
    if(a.content&&a.cites&&a.cites.length)
      cites.innerHTML='依据馆藏: '+a.cites.map(c=>`<a href="#/e/${c.id}">${esc(c.name)}</a>`).join(' · ');
    await saveCur();
    sending=false; ctrl=null; setSendingUI(false); scrollBottom();
  }
  function hintFor(status,t){
    const map={401:'密钥无效或没有权限（401）。',403:'密钥被拒绝（403），检查额度或权限。',
      404:'接口地址或模型名不对（404）。Base URL 一般以 /v1 结尾。',402:'账户余额不足（402）。',
      429:'被限流了（429），稍后再试。'};
    if(map[status]) return map[status];
    return `服务端报错 HTTP ${status}。${t?esc(t.slice(0,180)):'请检查配置。'}`;
  }

  /* ---------- 历史会话抽屉 ---------- */
  function openDrawer(){
    let d=document.getElementById('ai-drawer');
    if(!d){
      d=document.createElement('div'); d.id='ai-drawer'; d.className='ai-drawer-mask'; d.hidden=true;
      d.innerHTML=`<aside class="ai-drawer" role="dialog" aria-label="历史对话">
        <div class="ai-drawer-head"><span>历史对话</span><button class="ai-x" id="ai-drawer-x" aria-label="关闭">×</button></div>
        <div class="ai-hist-list" id="ai-hist-list"></div>
      </aside>`;
      document.body.append(d);
      d.addEventListener('click',e=>{ if(e.target===d) d.hidden=true; });
      document.getElementById('ai-drawer-x').onclick=()=>d.hidden=true;
    }
    renderHist();
    d.hidden=false;
  }
  function renderHist(){
    const box=document.getElementById('ai-hist-list'); if(!box) return;
    if(!list.length){ box.innerHTML='<div class="ai-hist-empty">还没有历史对话。<br>问出第一句就有了。</div>'; return; }
    box.innerHTML=list.map(s=>`<div class="ai-hist-item ${cur&&s.id===cur.id?'on':''}" data-id="${s.id}">
      <div class="ai-hist-t"><div class="ai-hist-title">${esc(s.title)}</div>
      <div class="ai-hist-time">${new Date(s.updatedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${s.msgs.length} 条</div></div>
      <button class="ai-hist-del" data-del="${s.id}" title="删除这段对话">×</button></div>`).join('');
    box.querySelectorAll('.ai-hist-item').forEach(it=>it.onclick=e=>{
      if(e.target.dataset.del) return;
      switchTo(it.dataset.id);
    });
    box.querySelectorAll('.ai-hist-del').forEach(b=>b.onclick=async e=>{
      e.stopPropagation();
      const id=b.dataset.del;
      if(!confirm('删除这段对话？不可恢复。')) return;
      await idbDel(id);
      list=list.filter(s=>s.id!==id);
      if(cur&&cur.id===id){ cur=list[0]||null; if(cur) localStorage.setItem(LS_LAST,cur.id); else localStorage.removeItem(LS_LAST); renderMsgs(); renderSuggest(); }
      renderHist();
    });
  }
  async function switchTo(id){
    if(sending) return;
    if(cur&&cur.id===id){ document.getElementById('ai-drawer').hidden=true; return; }
    await saveCur();
    cur=list.find(s=>s.id===id)||null;
    if(cur) localStorage.setItem(LS_LAST,cur.id);
    document.getElementById('ai-drawer').hidden=true;
    renderMsgs(); renderSuggest();
  }

  /* ---------- 接入配置（管理面板） ---------- */
  function openSettings(){
    let mask=document.getElementById('ai-mask');
    if(!mask){
      mask=document.createElement('div'); mask.id='ai-mask'; mask.hidden=true;
      mask.innerHTML=`<div class="ai-modal" role="dialog" aria-label="AI 接入配置">
        <div class="ai-modal-head"><h3>接入 AI 讲解员</h3><button class="ai-x" id="ai-x" aria-label="关闭">×</button></div>
        <p class="ai-modal-sub">任意 OpenAI 兼容接口。密钥只存你的浏览器，请求由浏览器直连服务商，不经本站。</p>
        <label class="ai-f">服务商预设
          <select id="ai-preset">${PRESET_GROUPS.map(([g,keys])=>`<optgroup label="${esc(g)}">${keys.map(k=>`<option value="${k}">${esc(PRESETS[k].nm)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <label class="ai-f">接口地址 Base URL <input id="ai-base" placeholder="https://api.deepseek.com/v1"></label>
        <label class="ai-f">API Key <span class="ai-key-row"><input id="ai-key" type="password" placeholder="本地服务可留空"><button type="button" class="btn sm" id="ai-eye">显示</button></span></label>
        <label class="ai-f">模型名称 <input id="ai-model" placeholder="deepseek-chat"></label>
        <label class="ai-f">回答温度 <span class="ai-key-row"><input id="ai-temp" type="range" min="0" max="1" step="0.1" value="0.7"><b id="ai-temp-v">0.7</b></span></label>
        <label class="ai-f">系统提示词（讲解员人设，留空用默认）<button type="button" class="ai-restore" id="ai-restore">还原默认</button>
          <textarea id="ai-sys" rows="5" placeholder="${esc(DEFAULT_SYS.slice(0,60))}…"></textarea></label>
        <div class="ai-modal-foot">
          <button class="btn" id="ai-test">测试连接</button><span id="ai-test-out"></span>
          <span style="flex:1"></span>
          <button class="btn primary" id="ai-save">保存</button>
        </div>
        <p class="ai-cors-note">连不上多为跨域（CORS）限制：该服务商不允许浏览器直连，可换服务商或自建代理。想先空手试水，本地跑 <code>python scripts/mock_llm.py</code>，Base URL 填 <code>http://127.0.0.1:8123/v1</code>。</p>
      </div>`;
      document.body.append(mask);
      mask.addEventListener('click',e=>{ if(e.target===mask) mask.hidden=true; });
      document.getElementById('ai-x').onclick=()=>mask.hidden=true;
      const temp=document.getElementById('ai-temp');
      temp.oninput=()=>document.getElementById('ai-temp-v').textContent=temp.value;
      document.getElementById('ai-preset').onchange=e=>{
        const p=PRESETS[e.target.value];
        document.getElementById('ai-base').value=p.base;
        document.getElementById('ai-model').value=p.model;
      };
      document.getElementById('ai-eye').onclick=()=>{
        const k=document.getElementById('ai-key');
        k.type=k.type==='password'?'text':'password';
        document.getElementById('ai-eye').textContent=k.type==='password'?'显示':'隐藏';
      };
      document.getElementById('ai-restore').onclick=()=>{
        document.getElementById('ai-sys').value='';
        document.getElementById('ai-sys').placeholder='已还原为默认，保存即可生效';
      };
      document.getElementById('ai-test').onclick=testConn;
      document.getElementById('ai-save').onclick=()=>{
        const c=readForm();
        if(!/^https?:\/\//.test(c.baseUrl)){ document.getElementById('ai-test-out').textContent='⚠️ 接口地址要以 http(s):// 开头'; return; }
        if(!c.model){ document.getElementById('ai-test-out').textContent='⚠️ 模型名不能为空'; return; }
        localStorage.setItem(LSC,JSON.stringify(c));
        document.getElementById('ai-test-out').textContent='✓ 已保存';
        renderChip();
        setTimeout(()=>{ mask.hidden=true; },450);
      };
    }
    fillForm(getCfg());
    document.getElementById('ai-test-out').textContent='';
    mask.hidden=false;
  }
  function readForm(){
    return {
      provider:document.getElementById('ai-preset').value,
      baseUrl:document.getElementById('ai-base').value.trim(),
      apiKey:document.getElementById('ai-key').value.trim(),
      model:document.getElementById('ai-model').value.trim(),
      temp:parseFloat(document.getElementById('ai-temp').value),
      system:document.getElementById('ai-sys').value.trim(),
    };
  }
  function fillForm(c){
    document.getElementById('ai-preset').value=c.provider||'siliconflow';
    document.getElementById('ai-base').value=c.baseUrl||'';
    document.getElementById('ai-key').value=c.apiKey||'';
    document.getElementById('ai-model').value=c.model||'';
    document.getElementById('ai-temp').value=c.temp??0.7;
    document.getElementById('ai-temp-v').textContent=c.temp??0.7;
    document.getElementById('ai-sys').value=c.system||'';
  }
  async function testConn(){
    const out=document.getElementById('ai-test-out'), c=readForm();
    if(!/^https?:\/\//.test(c.baseUrl)||!c.model){ out.textContent='⚠️ 先填接口地址和模型名'; return; }
    out.textContent='连接中…';
    try{
      const res=await fetch(c.baseUrl.replace(/\/+$/,'')+'/chat/completions',{
        method:'POST',
        headers:Object.assign({'Content-Type':'application/json'}, c.apiKey?{'Authorization':'Bearer '+c.apiKey}:{}),
        body:JSON.stringify({model:c.model,temperature:0,max_tokens:16,
          messages:[{role:'user',content:'只回复两个字:收到'}]})
      });
      if(!res.ok){ out.textContent='✗ '+hintFor(res.status,''); return; }
      const j=await res.json();
      const say=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
      out.textContent='✓ 通了 · '+(j.model||c.model)+(say?` · 回复「${say.trim().slice(0,12)}」`:'');
    }catch(ex){ out.textContent='✗ 连不上:'+ex.message+'（多为跨域/网络）'; }
  }

  return {view, openSettings};
})();

/* 用户从其它页面直达 #/ai 时，app.js 首次路由时本模块还没加载，补一次 */
if((location.hash.slice(1)||'').startsWith('/ai')) route();
