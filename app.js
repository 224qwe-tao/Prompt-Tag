(() => {
  const data = window.TAG_DATA || [];
  const meta = window.TAG_METADATA || {};
  const state = { selected: [], major: '全部', section: '全部', query: '', suffix: '' };

  const $ = (id) => document.getElementById(id);
  const els = {
    metaLine: $('metaLine'), customInput: $('customInput'), addCustomBtn: $('addCustomBtn'),
    searchInput: $('searchInput'), majorSelect: $('majorSelect'), sectionSelect: $('sectionSelect'), categoryChips: $('categoryChips'),
    selectedTags: $('selectedTags'), entryList: $('entryList'), clearSelectedBtn: $('clearSelectedBtn'), copySelectedBtn: $('copySelectedBtn'),
    randomBtn: $('randomBtn'), outputPrompt: $('outputPrompt'), buildBtn: $('buildBtn'), resetBtn: $('resetBtn'), copyOutputBtn: $('copyOutputBtn'),
    qualityToggle: $('qualityToggle'), underscoreToggle: $('underscoreToggle'), dedupeToggle: $('dedupeToggle'), pageToggle: $('pageToggle'),
    selectFirstVisible: $('selectFirstVisible'), selectCategoryOnly: $('selectCategoryOnly'), themeBtn: $('themeBtn'), toast: $('toast'),
    detailDialog: $('detailDialog'), closeDialog: $('closeDialog'), detailTitle: $('detailTitle'), detailMeta: $('detailMeta'), detailMain: $('detailMain'),
    detailNegative: $('detailNegative'), detailNotes: $('detailNotes'), detailAddMain: $('detailAddMain'), detailCopyNegative: $('detailCopyNegative')
  };

  function showToast(msg){
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast.tid);
    showToast.tid = setTimeout(() => els.toast.classList.remove('show'), 1700);
  }

  function cleanPrompt(text){
    let value = (text || '').replace(/\s+/g, ' ').trim();
    if (els.underscoreToggle.checked) value = value.replaceAll('_', ' ');
    if (state.suffix) value += state.suffix;
    return value;
  }

  function splitTags(text){
    return (text || '')
      .split(',')
      .map(t => cleanPrompt(t))
      .filter(Boolean);
  }

  function buildPrompt(){
    let tags = [];
    if (els.qualityToggle.checked) {
      tags.push('amazing quality', 'very aesthetic', 'absurdres', 'masterpiece', 'best quality');
    }
    state.selected.forEach(item => tags.push(...splitTags(item.text)));
    if (els.dedupeToggle.checked) {
      const seen = new Set();
      tags = tags.filter(t => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (els.pageToggle.checked) {
      const pages = [...new Set(state.selected.map(i => i.page).filter(Boolean))];
      if (pages.length) tags.push(`source pages: ${pages.join('/')}`);
    }
    return tags.join(', ');
  }

  function renderSelected(){
    els.selectedTags.innerHTML = '';
    if (!state.selected.length) {
      els.selectedTags.classList.add('empty');
      els.selectedTags.innerHTML = '<span>尚未添加，點擊下方條目或輸入自訂 Tag。</span>';
      els.outputPrompt.value = buildPrompt();
      return;
    }
    els.selectedTags.classList.remove('empty');
    state.selected.forEach((item, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.innerHTML = `<span>${escapeHtml(item.label)}</span><span class="x">×</span>`;
      chip.title = item.text;
      chip.addEventListener('click', () => { state.selected.splice(i,1); renderSelected(); });
      els.selectedTags.appendChild(chip);
    });
    els.outputPrompt.value = buildPrompt();
  }

  function addTag(label, text, page){
    if (!text) return showToast('此條目沒有主要 Tag');
    state.selected.push({label, text, page});
    renderSelected();
    showToast('已加入');
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function unique(list){ return [...new Set(list.filter(Boolean))]; }

  function initFilters(){
    const majors = ['全部', ...unique(data.map(e => e.major))];
    els.majorSelect.innerHTML = majors.map(m => `<option>${escapeHtml(m)}</option>`).join('');
    renderSectionOptions();
    renderCategoryChips();
    const countLine = `${meta.included || data.length} 個條目已收錄；${meta.filtered || 0} 個高風險條目已預設排除；來源：${meta.source_name || 'PDF'}`;
    els.metaLine.textContent = countLine;
  }

  function renderSectionOptions(){
    const pool = state.major === '全部' ? data : data.filter(e => e.major === state.major);
    const sections = ['全部', ...unique(pool.map(e => e.section))];
    els.sectionSelect.innerHTML = sections.map(s => `<option>${escapeHtml(s)}</option>`).join('');
    if (!sections.includes(state.section)) state.section = '全部';
    els.sectionSelect.value = state.section;
  }

  function renderCategoryChips(){
    const majors = ['全部', ...unique(data.map(e => e.major))];
    els.categoryChips.innerHTML = '';
    majors.forEach(m => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.major === m ? ' active' : '');
      chip.textContent = m.replace(/^([一二三四五六七八九十]+、)/, '$1 ');
      chip.addEventListener('click', () => { state.major = m; state.section = '全部'; els.majorSelect.value = m; renderSectionOptions(); renderCategoryChips(); renderEntries(); });
      els.categoryChips.appendChild(chip);
    });
  }

  function filteredEntries(){
    const q = state.query.trim().toLowerCase();
    return data.filter(e => {
      if (state.major !== '全部' && e.major !== state.major) return false;
      if (state.section !== '全部' && e.section !== state.section) return false;
      if (!q) return true;
      const hay = `${e.title} ${e.major} ${e.section} ${e.author} ${e.main_tag} ${e.negative_tag} ${e.notes} ${e.raw}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderEntries(){
    const list = filteredEntries();
    els.entryList.innerHTML = '';
    if (!list.length) {
      els.entryList.innerHTML = '<p class="muted">沒有符合條件的條目。</p>';
      return;
    }
    list.forEach(e => {
      const card = document.createElement('article');
      card.className = 'entry-card';
      const tagText = e.main_tag || e.raw || '';
      card.innerHTML = `
        <div class="entry-top">
          <div class="entry-title">${escapeHtml(e.title)}</div>
          <span class="badge">p.${e.start_page}${e.end_page && e.end_page !== e.start_page ? '-' + e.end_page : ''}</span>
        </div>
        <div class="entry-badges">
          <span class="badge">${escapeHtml((e.major || '').replace(/^([一二三四五六七八九十]+、)/, '$1 '))}</span>
          <span class="badge">${escapeHtml(e.section || '未分類')}</span>
          ${e.author ? `<span class="badge">By ${escapeHtml(e.author)}</span>` : ''}
        </div>
        <div class="entry-tags">${escapeHtml(tagText)}</div>
        <div class="entry-actions">
          <button class="add">添加</button>
          <button class="view">查看</button>
        </div>`;
      card.querySelector('.add').addEventListener('click', () => addTag(e.title, e.main_tag || e.raw, e.start_page));
      card.querySelector('.view').addEventListener('click', () => openDetail(e));
      els.entryList.appendChild(card);
    });
  }

  function openDetail(e){
    els.detailTitle.textContent = e.title;
    els.detailMeta.textContent = `${e.major || ''} / ${e.section || ''} · By ${e.author || '未知'} · p.${e.start_page}${e.end_page !== e.start_page ? '-' + e.end_page : ''}`;
    els.detailMain.textContent = e.main_tag || '（未解析到主要 Tag，請查看原始摘錄）';
    els.detailNegative.textContent = e.negative_tag || '（無）';
    els.detailNotes.textContent = e.notes || e.raw || '（無）';
    els.detailAddMain.onclick = () => addTag(e.title, e.main_tag || e.raw, e.start_page);
    els.detailCopyNegative.onclick = async () => { await navigator.clipboard.writeText(e.negative_tag || ''); showToast('已複製負面 Tag'); };
    els.detailDialog.showModal();
  }


  els.addCustomBtn.addEventListener('click', () => { const v = els.customInput.value.trim(); if(v){ addTag(v, v, null); els.customInput.value=''; }});
  els.customInput.addEventListener('keydown', e => { if(e.key === 'Enter') els.addCustomBtn.click(); });
  els.searchInput.addEventListener('input', e => { state.query = e.target.value; renderEntries(); });
  els.majorSelect.addEventListener('change', e => { state.major = e.target.value; state.section = '全部'; renderSectionOptions(); renderCategoryChips(); renderEntries(); });
  els.sectionSelect.addEventListener('change', e => { state.section = e.target.value; renderEntries(); });
  els.clearSelectedBtn.addEventListener('click', () => { state.selected = []; renderSelected(); });
  els.copySelectedBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(buildPrompt()); showToast('已複製已選 Tag'); });
  els.buildBtn.addEventListener('click', () => { els.outputPrompt.value = buildPrompt(); showToast('已輸出'); });
  els.copyOutputBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(els.outputPrompt.value || buildPrompt()); showToast('已複製 Prompt'); });
  els.resetBtn.addEventListener('click', () => { state.selected=[]; state.query=''; state.major='全部'; state.section='全部'; els.searchInput.value=''; els.majorSelect.value='全部'; renderSectionOptions(); renderCategoryChips(); renderEntries(); renderSelected(); });
  els.randomBtn.addEventListener('click', () => { const list = filteredEntries(); if(!list.length) return; const e = list[Math.floor(Math.random()*list.length)]; addTag(e.title, e.main_tag || e.raw, e.start_page); });
  els.selectFirstVisible.addEventListener('click', () => { const e = filteredEntries()[0]; if(e) addTag(e.title, e.main_tag || e.raw, e.start_page); });
  els.selectCategoryOnly.addEventListener('click', () => { els.searchInput.value=''; state.query=''; renderEntries(); showToast('已套用目前分類'); });
  els.closeDialog.addEventListener('click', () => els.detailDialog.close());
  els.themeBtn.addEventListener('click', () => { document.body.classList.toggle('dark'); els.themeBtn.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark'; });
  [els.qualityToggle, els.underscoreToggle, els.dedupeToggle, els.pageToggle].forEach(el => el.addEventListener('change', renderSelected));
  document.querySelectorAll('.suffix').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.suffix').forEach(b => b.classList.remove('active'));
    if (state.suffix === btn.dataset.value) { state.suffix = ''; }
    else { state.suffix = btn.dataset.value; btn.classList.add('active'); }
    renderSelected();
  }));

  initFilters();
  renderEntries();
  renderSelected();
})();
