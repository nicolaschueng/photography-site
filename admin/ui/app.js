// 后台前端 (原生 ES 模块)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const api = (p, opts) => fetch('/api' + p, opts).then(async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
});

let state = { collections: [], currentSlug: null };

// ===== Toast =====
const toastEl = $('#toast');
let toastTimer;
function toast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('bg-red-600', isError);
  toastEl.classList.toggle('bg-stone-900', !isError);
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.style.opacity = '0'), 2200);
}

// ===== 状态条 =====
async function refreshStatus() {
  try {
    const s = await api('/status');
    const pill = $('#status-pill');
    if (s.pendingChanges === 0) {
      pill.textContent = '已同步';
      pill.className = 'text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
    } else {
      pill.textContent = `待发布 ${s.pendingChanges} 处改动`;
      pill.className = 'text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
    }
  } catch (e) {
    $('#status-pill').textContent = '状态未知';
  }
}

// ===== 加载 =====
async function loadAll() {
  const d = await api('/collections');
  state.collections = d.collections;
  renderList();
  if (!state.currentSlug && state.collections[0]) {
    state.currentSlug = state.collections[0].slug;
  }
  renderEditor();
  refreshStatus();
}

// ===== 左栏列表 =====
function renderList() {
  const ul = $('#collection-list');
  ul.innerHTML = '';
  for (const c of state.collections) {
    const li = document.createElement('li');
    li.className = `group rounded-md border ${c.slug === state.currentSlug ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 hover:border-stone-400'}`;
    li.innerHTML = `
      <button class="w-full text-left px-3 py-2.5 flex items-center gap-3">
        <div class="w-10 h-10 rounded bg-stone-100 overflow-hidden flex-shrink-0">
          ${c.cover ? `<img src="${c.cover}" class="w-full h-full object-cover" />` : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${escapeHtml(c.title) || '<未命名>'}</div>
          <div class="text-[11px] opacity-60 truncate">${c.category} · ${c.year} · ${c.photos.length}张</div>
        </div>
      </button>
    `;
    li.querySelector('button').onclick = () => {
      state.currentSlug = c.slug;
      renderList();
      renderEditor();
    };
    ul.appendChild(li);
  }
}

// ===== 右栏编辑器 =====
function renderEditor() {
  const c = state.collections.find((x) => x.slug === state.currentSlug);
  const ed = $('#editor');
  if (!c) {
    ed.innerHTML = `<p class="text-stone-400 text-center py-20">未选中</p>`;
    return;
  }
  ed.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <div>
        <p class="text-[11px] tracking-widest text-stone-400 uppercase">slug: ${c.slug}</p>
        <h2 class="text-2xl font-semibold mt-1">${escapeHtml(c.title) || '<未命名>'}</h2>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-delete-c" class="text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50">删除集合</button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      ${field('title', '标题', c.title)}
      ${field('subtitle', '副标题', c.subtitle)}
      ${field('year', '年份', c.year)}
      ${selectField('category', '分类', c.category, ['人文', '风光'])}
    </div>
    ${textareaField('description', '简介', c.description, 3)}

    <div class="mt-8 mb-3 flex items-center justify-between">
      <h3 class="text-sm font-medium text-stone-500 uppercase tracking-widest">照片 (${c.photos.length})</h3>
      <label class="text-sm px-3 py-1.5 rounded-md bg-stone-900 text-white hover:bg-black cursor-pointer">
        + 上传照片
        <input id="upload-input" type="file" accept="image/*" multiple class="hidden" />
      </label>
    </div>

    <div id="photo-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
    <div id="upload-progress" class="hidden mt-3 text-sm text-stone-500"></div>
  `;

  // 元数据自动保存
  $$('input[data-field], textarea[data-field], select[data-field]', ed).forEach((el) => {
    el.addEventListener('change', async () => {
      const k = el.dataset.field;
      try {
        await api(`/collections/${c.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [k]: el.value }),
        });
        c[k] = el.value;
        renderList();
        refreshStatus();
        toast('已保存');
      } catch (e) {
        toast('保存失败:' + e.message, true);
      }
    });
  });

  // 删除集合
  $('#btn-delete-c').onclick = async () => {
    if (!confirm(`确认删除「${c.title}」?该集合下所有照片也会被删除,且不可恢复。`)) return;
    try {
      await api(`/collections/${c.slug}`, { method: 'DELETE' });
      state.collections = state.collections.filter((x) => x.slug !== c.slug);
      state.currentSlug = state.collections[0]?.slug ?? null;
      renderList();
      renderEditor();
      refreshStatus();
      toast('已删除');
    } catch (e) {
      toast('删除失败:' + e.message, true);
    }
  };

  // 上传
  $('#upload-input').onchange = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const prog = $('#upload-progress');
    prog.classList.remove('hidden');
    prog.textContent = `正在处理 ${files.length} 张图片(转 webp + 压缩)…`;
    try {
      const res = await fetch(`/api/collections/${c.slug}/photos`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '上传失败');
      Object.assign(c, json.collection);
      renderPhotos();
      renderList();
      refreshStatus();
      toast(`已上传 ${json.added.length} 张`);
    } catch (err) {
      toast('上传失败:' + err.message, true);
    } finally {
      prog.classList.add('hidden');
      e.target.value = '';
    }
  };

  renderPhotos();
}

function renderPhotos() {
  const c = state.collections.find((x) => x.slug === state.currentSlug);
  const grid = $('#photo-grid');
  grid.innerHTML = '';
  c.photos.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'bg-stone-50 rounded-lg overflow-hidden border border-stone-200 group relative';
    card.draggable = true;
    card.dataset.src = p.src;
    card.innerHTML = `
      <div class="relative">
        <img src="${p.src}" class="thumb w-full" loading="lazy" />
        ${c.cover === p.src ? `<span class="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">封面</span>` : ''}
        <div class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition">
          <span class="text-[10px] text-white/90">No.${String(i + 1).padStart(2, '0')}</span>
          <div class="flex gap-1">
            ${c.cover === p.src ? '' : `<button data-act="cover" class="text-[10px] px-1.5 py-0.5 rounded bg-white/90 hover:bg-white">设封面</button>`}
            <button data-act="del" class="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700">删</button>
          </div>
        </div>
      </div>
      <div class="p-2 space-y-1.5">
        <textarea data-cap data-i="${i}" rows="2" placeholder="caption (图片下方说明文字)"
          class="w-full text-[12px] leading-snug px-2 py-1.5 rounded border border-stone-200 focus:border-stone-400 outline-none">${escapeHtml(p.caption || '')}</textarea>
        <details class="text-[11px] text-stone-500">
          <summary class="cursor-pointer hover:text-stone-800">更多字段</summary>
          <div class="mt-1.5 space-y-1">
            <input data-loc data-i="${i}" value="${escapeHtml(p.location || '')}" placeholder="拍摄地" class="w-full px-2 py-1 rounded border border-stone-200 outline-none focus:border-stone-400" />
            <input data-yr data-i="${i}" value="${escapeHtml(p.year || '')}" placeholder="年份" class="w-full px-2 py-1 rounded border border-stone-200 outline-none focus:border-stone-400" />
            <textarea data-story data-i="${i}" rows="2" placeholder="story (caption 下方的长说明)"
              class="w-full px-2 py-1 rounded border border-stone-200 outline-none focus:border-stone-400">${escapeHtml(p.story || '')}</textarea>
          </div>
        </details>
      </div>
    `;
    grid.appendChild(card);
  });

  // 事件委托:删除/封面
  grid.onclick = async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = btn.closest('[data-src]');
    const src = card.dataset.src;
    const idx = c.photos.findIndex((p) => p.src === src);
    if (btn.dataset.act === 'del') {
      if (!confirm('确认删除该照片?')) return;
      try {
        const r = await api(`/collections/${c.slug}/photos/${idx}`, { method: 'DELETE' });
        Object.assign(c, r.collection);
        renderPhotos();
        renderList();
        refreshStatus();
      } catch (err) { toast('删除失败:' + err.message, true); }
    } else if (btn.dataset.act === 'cover') {
      try {
        const r = await api(`/collections/${c.slug}/cover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src }),
        });
        Object.assign(c, r);
        renderPhotos();
        renderList();
        refreshStatus();
        toast('已设为封面');
      } catch (err) { toast('设置失败:' + err.message, true); }
    }
  };

  // caption / location / year / story 自动保存(blur)
  const saveField = async (i, field, value) => {
    try {
      await api(`/collections/${c.slug}/photos/${i}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      c.photos[i][field] = value;
      refreshStatus();
    } catch (err) { toast('保存失败:' + err.message, true); }
  };
  $$('textarea[data-cap]', grid).forEach((el) => {
    el.addEventListener('blur', () => saveField(+el.dataset.i, 'caption', el.value));
  });
  $$('input[data-loc]', grid).forEach((el) => {
    el.addEventListener('blur', () => saveField(+el.dataset.i, 'location', el.value));
  });
  $$('input[data-yr]', grid).forEach((el) => {
    el.addEventListener('blur', () => saveField(+el.dataset.i, 'year', el.value));
  });
  $$('textarea[data-story]', grid).forEach((el) => {
    el.addEventListener('blur', () => saveField(+el.dataset.i, 'story', el.value));
  });

  // 拖拽排序
  let dragSrc = null;
  grid.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-src]');
    if (!card) return;
    dragSrc = card.dataset.src;
    card.classList.add('dragging');
  });
  grid.addEventListener('dragend', (e) => {
    e.target.closest('[data-src]')?.classList.remove('dragging');
    $$('.drop-target', grid).forEach((el) => el.classList.remove('drop-target'));
  });
  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const card = e.target.closest('[data-src]');
    if (!card || card.dataset.src === dragSrc) return;
    $$('.drop-target', grid).forEach((el) => el.classList.remove('drop-target'));
    card.classList.add('drop-target');
  });
  grid.addEventListener('drop', async (e) => {
    e.preventDefault();
    const card = e.target.closest('[data-src]');
    if (!card || !dragSrc || card.dataset.src === dragSrc) return;
    const fromIdx = c.photos.findIndex((p) => p.src === dragSrc);
    const toIdx = c.photos.findIndex((p) => p.src === card.dataset.src);
    const [moved] = c.photos.splice(fromIdx, 1);
    c.photos.splice(toIdx, 0, moved);
    renderPhotos();
    try {
      await api(`/collections/${c.slug}/photos/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcs: c.photos.map((p) => p.src) }),
      });
      refreshStatus();
    } catch (err) { toast('排序失败:' + err.message, true); }
  });
}

// ===== 表单字段渲染 =====
function field(name, label, value) {
  return `
    <label class="block">
      <span class="block text-xs text-stone-500 mb-1">${label}</span>
      <input data-field="${name}" value="${escapeHtml(value || '')}" class="w-full px-3 py-2 rounded-md border border-stone-200 outline-none focus:border-stone-400" />
    </label>`;
}
function selectField(name, label, value, options) {
  return `
    <label class="block">
      <span class="block text-xs text-stone-500 mb-1">${label}</span>
      <select data-field="${name}" class="w-full px-3 py-2 rounded-md border border-stone-200 outline-none focus:border-stone-400 bg-white">
        ${options.map((o) => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </label>`;
}
function textareaField(name, label, value, rows = 3) {
  return `
    <label class="block">
      <span class="block text-xs text-stone-500 mb-1">${label}</span>
      <textarea data-field="${name}" rows="${rows}" class="w-full px-3 py-2 rounded-md border border-stone-200 outline-none focus:border-stone-400">${escapeHtml(value || '')}</textarea>
    </label>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ===== 全局按钮 =====
$('#btn-new-collection').onclick = async () => {
  const title = prompt('新作品集标题:');
  if (!title) return;
  try {
    const c = await api('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    state.collections.unshift(c);
    state.currentSlug = c.slug;
    renderList();
    renderEditor();
    refreshStatus();
    toast('已创建');
  } catch (e) { toast('创建失败:' + e.message, true); }
};

$('#btn-publish').onclick = async () => {
  const btn = $('#btn-publish');
  btn.disabled = true;
  btn.textContent = '发布中…';
  try {
    const r = await api('/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (r.skipped) toast('没有需要发布的改动');
    else toast('已推送,GitHub Actions 构建中,约 2 分钟后线上更新');
    refreshStatus();
  } catch (e) {
    toast('发布失败:' + e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '发布到线上';
  }
};

loadAll();
