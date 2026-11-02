(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const ideas = window.IDEAS || [];
  const videos = window.VIDEOS || [];
  const state = { view: 'ideas', category: '全部', hero: '全部', video: '全部', platform: '全部', query: '', saved: new Set(), current: null };
  try { const ids = JSON.parse(localStorage.getItem('talon-saved-v1') || '[]'); if (Array.isArray(ids)) state.saved = new Set(ids.filter(id => ideas.some(i => i.id === id))); } catch {}
  const names = { ideas: '思路图鉴', videos: '视频目录', saved: '我的收藏' };
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[\s·:：_—–-]/g, '');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const time = value => { const seconds = Math.max(0, Math.floor(value)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
  const sourceFor = item => videos.find(v => v.bvid === item.bvid);
  const platformName = source => source.platform || 'B站';
  const authorName = source => source.author || '太农712';
  const platforms = source => [platformName(source), ...(source.alsoSources || []).map(s => s.platform)];
  const sourceLink = item => { const source = sourceFor(item); return platformName(source) === 'B站' ? `${source.url}?t=${item.time}` : source.url; };
  const referenceLabel = item => platformName(sourceFor(item)) === 'B站' ? `▷ ${time(item.time)} 原片参考` : `▷ 小红书 · 参考 ${time(item.time)}`;
  const alternateLinks = source => (source.alsoSources || []).map(s => `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.platform)}同题出处 ↗</a>`).join('');
  const isDone = video => ideas.some(i => i.bvid === video.bvid);
  function searchable(item) {
    const sections = (item.sections || []).map(s => [s.heading, s.text || '', ...(s.items || [])].join(' '));
    const source = item.sections ? sourceFor(item) : item;
    return normalize([item.title, item.summary || '', item.category || '', item.hero || '', item.mode || '', source.title, authorName(source), ...platforms(source), ...(source.alsoSources || []).map(s => s.author || ''), source.mode || '', ...(item.tags || []), ...(item.aliases || []), ...(source.aliases || []), ...sections].join(' '));
  }
  function matches(item) {
    const text = searchable(item);
    return state.query.trim().split(/\s+/).filter(Boolean).every(term => text.includes(normalize(term)));
  }
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 2200);
  }
  function setQuery(query) {
    state.query = query;
    $('#search').value = query;
    render();
  }
  function setView(view, clear = false) {
    state.view = view;
    state.category = '全部';
    if (clear) { state.query = ''; state.hero = '全部'; state.video = '全部'; state.platform = '全部'; $('#search').value = ''; }
    render();
  }
  function save(id) {
    const removing = state.saved.has(id);
    if (removing) state.saved.delete(id); else state.saved.add(id);
    try { localStorage.setItem('talon-saved-v1', JSON.stringify([...state.saved])); }
    catch { toast('浏览器暂时无法保存收藏，本次打开期间仍可使用'); render(); return; }
    toast(removing ? '已从收藏移除' : '已收藏，可从左侧随时调取');
    render();
    const detailSave = document.querySelector('[data-detail-save]');
    if (detailSave) detailSave.textContent = `${state.saved.has(id) ? '★ 已收藏' : '☆ 收藏思路'}`;
  }
  function card(item, index) {
    const selected = state.saved.has(item.id);
    const source = sourceFor(item);
    const keywords = item.tags.filter(t => ![item.hero, ...(source.aliases || [])].includes(t)).slice(0,3);
    return `<article class="idea-card" data-id="${item.id}">
      <button class="card-image-btn" data-image="${item.id}" aria-label="放大${escape(item.title)}原片截图"><img src="${escape(item.image)}" alt="${escape(item.title)}：原片截图" loading="lazy"><span class="image-zoom">↗ 原片截图</span><span class="card-time">${escape(item.timeLabel)}</span></button>
      <div class="card-body"><div class="card-meta"><span class="category-label">${escape(item.category)} / ${escape(item.hero || source.hero || '综合')}</span><span class="card-index">${String(index + 1).padStart(2,'0')}</span><button class="save-btn ${selected?'saved':''}" data-save="${item.id}" aria-label="${selected?'取消收藏':'收藏'}${escape(item.title)}" aria-pressed="${selected}">${selected?'★':'☆'}</button></div>
      <button class="card-title" data-detail="${item.id}">${escape(item.title)}</button><p class="card-summary">${escape(item.summary)}</p><div class="source-mini">${escape(platforms(source).join(' / '))} · ${escape(authorName(source))} · ${escape(source.published.slice(5,10))} · ${escape(source.title)}</div><div class="card-tags">${keywords.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div><div class="card-footer"><a href="${escape(sourceLink(item))}" target="_blank" rel="noopener noreferrer">${referenceLabel(item)}</a><button data-detail="${item.id}">展开思路 <span>↗</span></button></div></div></article>`;
  }
  function videoCard(video) {
    const count = ideas.filter(i => i.bvid === video.bvid).length;
    const done = count > 0;
    return `<article class="video-card"><a class="video-thumb" href="${escape(video.url)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${escape(video.thumbnail)}" alt="${escape(video.title)}封面"><span class="video-state ${done?'done':''}">${done?'已整理':'待整理'}</span><span class="card-time">${time(video.duration)}</span></a><div class="video-body"><h3>${escape(video.title)}</h3><div class="meta"><span>${escape(platforms(video).join(" / "))} · ${escape(authorName(video))}</span><span>${escape(video.published.slice(0,10))}</span><span>${escape(video.hero || '机制 / 综合')}</span></div>${video.alsoSources?.length ? `<div class="source-alternates">${alternateLinks(video)}</div>` : ''}<div class="video-actions"><a href="${escape(video.url)}" target="_blank" rel="noopener noreferrer">打开${escape(platformName(video))}原视频 ↗</a>${done?`<button data-open-video="${video.bvid}">查看 ${count} 个思路 →</button>`:'<span>待整理</span>'}</div></div></article>`;
  }
  function filteredPool() {
    return (state.view === 'videos' ? videos : ideas.filter(item => state.view !== 'saved' || state.saved.has(item.id))).filter(item => {
      const source = item.sections ? sourceFor(item) : item;
      return matches(item) && (state.platform === '全部' || platforms(source).includes(state.platform)) && (state.hero === '全部' || (item.sections ? item.hero === state.hero : ideas.some(i => i.bvid === source.bvid && i.hero === state.hero))) && (state.video === '全部' || source.bvid === state.video) && (state.view === 'videos' || state.category === '全部' || item.category === state.category);
    });
  }
  function render() {
    const isVideo = state.view === 'videos';
    const results = filteredPool();
    $('#section-title').innerHTML = `${names[state.view]} <span>${String(results.length).padStart(2,'0')}</span>`;
    $('#breadcrumb').textContent = names[state.view];
    $('#saved-count').textContent = String(state.saved.size).padStart(2,'0');
    $('[data-view="ideas"] .count').textContent = String(ideas.length).padStart(2,'0');
    $('[data-view="videos"] .count').textContent = String(videos.length).padStart(2,'0');
    $('#clear-search').hidden = !state.query;
    $('#catalog-toggle').innerHTML = isVideo ? '返回思路图鉴 <span>↗</span>' : '查看全部视频 <span>↗</span>';
    $('#search').placeholder = isVideo ? '搜索视频标题、英雄名或玩法关键词…' : '搜索英雄、海克斯、装备或玩法…';
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === state.view));
    document.querySelector('.filters').hidden = isVideo;
    const videoCount = new Set(results.map(item => item.bvid)).size;
    $('#result-caption').textContent = isVideo ? `${results.length} 组视频 · ${results.filter(isDone).length} 组已整理` : state.view === 'saved' ? `${results.length} 个收藏思路` : `${videoCount} 组视频 · ${results.length} 个拆解`;
    document.querySelector('.filter-bar').style.justifyContent = isVideo ? 'flex-end' : '';
    document.querySelectorAll('[data-category]').forEach(button => button.classList.toggle('active', button.dataset.category === state.category));
    $('[data-category="全部"] span').textContent = ideas.length;
    $('#hero-filter').value = state.hero;
    $('#video-filter').value = state.video;
    $('#platform-filter').value = state.platform;
    $('#results').classList.toggle('video-grid', isVideo);
    if (results.length) $('#results').innerHTML = results.map(isVideo ? videoCard : (item => card(item, ideas.indexOf(item)))).join('');
    else {
      const emptySaved = state.view === 'saved' && !state.saved.size;
      $('#results').innerHTML = `<div class="empty-state"><div class="empty-icon">${emptySaved?'☆':'⌕'}</div><h3>${emptySaved?'把想玩的思路留在这里':'没有匹配的思路'}</h3><p>${emptySaved?'点击思路卡片的星标，下次直接从这里调取。':'可以换个英雄别名、海克斯或装备名称，或重置英雄和视频筛选。'}</p><button data-empty-action="reset">查看全部思路</button></div>`;
    }
  }
  function enlarge(item) {
    $('#enlarged-image').src = item.fullImage;
    $('#enlarged-image').alt = `${item.title} · ${authorName(sourceFor(item))}原片截图`;
    $('#image-caption').textContent = `${authorName(sourceFor(item))} · ${platformName(sourceFor(item))} · 截图 ${time(Math.floor(item.imageTime ?? item.time))}`;
    $('#image-dialog').showModal();
  }
  function openDetail(id, updateHash = true) {
    const item = ideas.find(i => i.id === id);
    if (!item) return;
    state.current = item;
    const source = sourceFor(item);
    $('#detail-content').innerHTML = `<div class="detail-header"><div class="eyebrow">${escape(item.hero || source.hero || '综合')} / ${escape(item.category)} <span>· 原片 ${escape(item.timeLabel)}</span></div><button class="close-btn" data-close-detail aria-label="关闭思路详情">×</button></div><div class="detail-layout"><div class="detail-visual"><button class="detail-img-btn" data-image="${item.id}" aria-label="查看完整原片截图"><img src="${escape(item.image)}" alt="${escape(item.title)}原片截图"><span class="image-zoom">↗ 点击放大</span></button><p>原作：${escape(authorName(source))} · ${escape(platformName(source))}<br>${escape(source.published.slice(0,10))} · 视频 ${time(source.duration)}<br>${escape(source.title)}<br>截图取自对应片段，点击查看完整画面。</p><a class="source-action" href="${escape(sourceLink(item))}" target="_blank" rel="noopener noreferrer">${platformName(source) === 'B站' ? `▷ 跳到原片 ${time(item.time)} ↗` : `▷ 打开小红书 · 参考 ${time(item.time)} ↗`}</a></div><div class="detail-text"><h2>${escape(item.title)}</h2><p class="version-note">${escape(item.versionNote || source.versionNote || '按原片日期整理；未做当前版本游戏实测。')}</p><p class="detail-summary">${escape(item.summary)}</p>${item.sections.map(section=>`<section class="detail-section"><h3>${escape(section.heading)}</h3>${section.text?`<p>${escape(section.text)}</p>`:''}${section.items?`<ul>${section.items.map(line=>`<li>${escape(line)}</li>`).join('')}</ul>`:''}</section>`).join('')}<div class="reference-list"><h3>思路参考 · 回到原片核对</h3>${[...item.references, ...(source.alsoSources || []).map(s => ({label: `${s.platform}补充出处 · ${s.author} · ${s.published.slice(0,10)}`, url: s.url}))].map(ref=>`<a href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer"><span>${Number.isFinite(ref.time) ? time(ref.time) : '出处'}</span> &nbsp; ${escape(ref.label.replace(/^\d{2}:\d{2}\s*/, ''))} ↗</a>`).join('')}</div></div></div><div class="detail-bottom"><button data-detail-save data-save="${item.id}">${state.saved.has(item.id)?'★ 已收藏':'☆ 收藏思路'}</button><button data-copy="${item.id}">复制思路摘要</button><button data-next="${item.id}">下一个思路 →</button></div>`;
    if (!$('#detail-dialog').open) $('#detail-dialog').showModal();
    $('#detail-dialog').scrollTop = 0;
    if (updateHash) history.replaceState(null, '', `#idea-${item.id}`);
  }
  function openInfo(sources = false) {
    $('#info-content').innerHTML = sources ? `<div class="eyebrow muted">SOURCES & NOTES</div><h2>每个思路，都有来处。</h2><h3>内容来源</h3><p>以<a href="https://space.bilibili.com/434873769/upload/video" target="_blank" rel="noopener noreferrer">太农712 的 B 站视频 ↗</a>为基础，补充用户指定收藏板内的小红书创作者视频。收录 2026 年 10 月 13 日起、截至 11 月 2 日核对的 ${videos.length} 组公开视频（同题视频的跨平台出处合并），共 ${ideas.length} 个图文拆解。</p><p>根据各原片配音、画面字幕、装备和海克斯画面归纳；每张思路卡都保留对应原视频、时间点与实际截图。未公开、已删除或未被索引的视频不在这份清单内。小红书收藏板标示 68 篇，本次读取 67 篇：18 篇符合日期，其中 5 篇补充至现有同题视频、13 篇新增；48 篇早于日期范围，1 篇仅显示近期编辑时间，未按新发布收录。另有 1 篇未在可读取列表中出现，尚未核实。</p><h3>不同日期与模式</h3><p>作者评级、数值和机制均按原视频保留；本页未做当前版本游戏实测。自定义测试、版本改动、Bug 或触发限制会在对应思路中说明，请结合原片日期使用。</p><h3>图片与交互参考</h3><ul><li>截图与封面来自对应原视频，版权归原作者及相关权利方。</li><li>背景原画来自 <a href="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Pantheon_0.jpg" target="_blank" rel="noopener noreferrer">Riot Games / Data Dragon ↗</a>。</li><li>检索与分类逻辑参考 <a href="https://www.bilibili.com/blackboard/era/bpQtFXp5di6uI4BZ.html" target="_blank" rel="noopener noreferrer">海斗活动页面 ↗</a>。</li></ul>` : `<div class="eyebrow muted">QUICK START</div><h2>想玩什么，直接搜。</h2><h3>快速调取</h3><p>按 ⌘ K、Ctrl K 或 / 聚焦搜索框。支持英雄别名、海克斯和装备名称；用空格组合多个关键词，如「腕豪 针插垫」。</p><h3>先选英雄，再看搭配</h3><p>用英雄、视频与平台下拉框和思路分类缩小范围。「视频目录」中的「查看思路」会直接筛出该条视频的所有拆解。</p><h3>从图片回到原片</h3><p>点击「展开思路」查看图文详情。点击图片放大，B 站时间链接可跳到对应片段；小红书打开原笔记后，按标注时间定位；也可以复制带出处的思路文字。</p><h3>常用思路留在手边</h3><p>点击 ☆ 收藏，之后从「我的收藏」打开。收藏保存在当前浏览器中，暂不跨设备同步；初版潘森收藏与链接保持兼容。</p>`;
    $('#info-dialog').showModal();
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.view) setView(button.dataset.view, true);
    if (button.dataset.category) { state.category = button.dataset.category; render(); }
    if (button.dataset.query) setQuery(button.dataset.query);
    if (button.dataset.save) save(button.dataset.save);
    if (button.dataset.detail) openDetail(button.dataset.detail);
    if (button.dataset.image) enlarge(ideas.find(i=>i.id===button.dataset.image));
    if (button.hasAttribute('data-close-detail')) $('#detail-dialog').close();
    if (button.dataset.openVideo) {setView('ideas',true);state.video = button.dataset.openVideo;render();$('.workspace').scrollIntoView({block:'start'});}
    if (button.dataset.action === 'all') setView('ideas',true);
    if (button.dataset.emptyAction) { if (button.dataset.emptyAction === 'videos') setView('videos'); else setView('ideas', true); }
    if (button.dataset.next) { const visible = filteredPool().filter(i=>i.sections); const list = visible.some(i=>i.id===button.dataset.next) ? visible : ideas; const n = (list.findIndex(i=>i.id===button.dataset.next)+1)%list.length; openDetail(list[n].id); }
    if (button.dataset.copy) {
      const item = ideas.find(i=>i.id===button.dataset.copy);
      const text = `${item.title}\n${item.summary}\n\n${item.sections.map(s=>s.heading+'\n'+(s.text||s.items.map(t=>'• '+t).join('\n'))).join('\n\n')}\n\n来源：${authorName(sourceFor(item))}（${platformName(sourceFor(item))}）《${sourceFor(item).title}》\n${item.references[0].url}${(sourceFor(item).alsoSources || []).map(s => `\n${s.platform}补充出处：${s.url}`).join('')}`;
      try { await navigator.clipboard.writeText(text); toast('已复制思路与原片链接'); }
      catch { const area = document.createElement('textarea'); area.value=text; area.style.cssText='position:fixed;inset:0;opacity:0'; document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();toast(ok?'已复制思路与原片链接':'复制不可用，可选择详情文字手动复制'); }
    }
  });
  $('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
  $('.brand').addEventListener('click', event => {event.preventDefault();setView('ideas',true);$('.brand').focus();});
  $('#clear-search').addEventListener('click',()=> {setQuery('');$('#search').focus();});
  $('#catalog-toggle').addEventListener('click',()=>setView(state.view==='videos'?'ideas':'videos',true));
  $('#help-btn').addEventListener('click',()=>openInfo());
  $('#sources-btn').addEventListener('click',()=>openInfo(true));
  $('#close-image').addEventListener('click',()=>$('#image-dialog').close());
  $('#close-info').addEventListener('click',()=>$('#info-dialog').close());
  document.addEventListener('keydown', event => {
    const editing = event.target.matches('input,textarea,[contenteditable="true"]');
    if ((event.key.toLowerCase()==='k'&&(event.metaKey||event.ctrlKey)) || (event.key==='/'&&!editing)) {
      if (document.querySelector('dialog[open]')) return;
      event.preventDefault();$('#search').focus();$('#search').select();
    }
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event=>{ if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}}));
  $('#detail-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#idea-'))history.replaceState(null,'',location.pathname+location.search);});
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#idea-'))openDetail(location.hash.slice(6),false);});
  $('#hero-filter').innerHTML = '<option value="全部">全部英雄</option>' + [...new Set(ideas.map(v=>v.hero || '综合'))].map(hero=>`<option value="${escape(hero)}">${escape(hero)}</option>`).join('');
  $('#video-filter').innerHTML = '<option value="全部">全部视频</option>' + videos.map(v=>`<option value="${v.bvid}">${escape(v.published.slice(5,10))} · ${escape(v.title)}</option>`).join('');
  $('#hero-filter').addEventListener('change',e=>{state.hero=e.target.value;state.video='全部';render();});
  $('#platform-filter').addEventListener('change',e=>{state.platform=e.target.value;render();});
  $('#video-filter').addEventListener('change',e=>{state.video=e.target.value;state.hero='全部';render();});
  $('#reset-filters').addEventListener('click',()=>{setView(state.view,true);});
  render();
  if (location.hash.startsWith('#idea-')) openDetail(location.hash.slice(6),false);
})();
