(() => {
  const baseData = Array.isArray(window.TAG_DATA) ? window.TAG_DATA : [];
  const meta = window.TAG_METADATA || {};
  const STORAGE_KEY = 'novelai_prompt_tag_dictionary_local_v3';
  const state = {
    selected: [],
    major: '全部',
    section: '全部',
    query: '',
    suffix: '',
    local: { edits: {}, custom: [] },
    currentDetailId: null,
    outputManualEdit: false
  };
  let data = [];

  const $ = (id) => document.getElementById(id);
  const els = {
    metaLine: $('metaLine'), customInput: $('customInput'), addCustomBtn: $('addCustomBtn'),
    searchInput: $('searchInput'), majorSelect: $('majorSelect'), sectionSelect: $('sectionSelect'), categoryChips: $('categoryChips'),
    selectedTags: $('selectedTags'), entryList: $('entryList'), clearSelectedBtn: $('clearSelectedBtn'), copySelectedBtn: $('copySelectedBtn'),
    randomBtn: $('randomBtn'), outputPrompt: $('outputPrompt'), buildBtn: $('buildBtn'), resetBtn: $('resetBtn'), copyOutputBtn: $('copyOutputBtn'),
    qualityToggle: $('qualityToggle'), underscoreToggle: $('underscoreToggle'), dedupeToggle: $('dedupeToggle'), pageToggle: $('pageToggle'),
    selectFirstVisible: $('selectFirstVisible'), selectCategoryOnly: $('selectCategoryOnly'), themeBtn: $('themeBtn'), toast: $('toast'),
    addEntryBtn: $('addEntryBtn'), exportDataBtn: $('exportDataBtn'), importDataInput: $('importDataInput'), clearLocalDataBtn: $('clearLocalDataBtn'),
    detailDialog: $('detailDialog'), closeDialog: $('closeDialog'), detailEditEntry: $('detailEditEntry'), detailTitle: $('detailTitle'), detailMeta: $('detailMeta'), detailMain: $('detailMain'),
    detailNegative: $('detailNegative'), detailNotes: $('detailNotes'), detailAddMain: $('detailAddMain'), detailCopyNegative: $('detailCopyNegative'),
    entryDialog: $('entryDialog'), entryForm: $('entryForm'), entryDialogTitle: $('entryDialogTitle'), closeEntryDialog: $('closeEntryDialog'), cancelEntryBtn: $('cancelEntryBtn'), resetEntryBtn: $('resetEntryBtn'),
    editEntryId: $('editEntryId'), editTitle: $('editTitle'), editMajor: $('editMajor'), editSection: $('editSection'), editAuthor: $('editAuthor'),
    editStartPage: $('editStartPage'), editEndPage: $('editEndPage'), editMainTag: $('editMainTag'), editNegativeTag: $('editNegativeTag'), editNotes: $('editNotes'), editRaw: $('editRaw'),
    majorOptions: $('majorOptions'), sectionOptions: $('sectionOptions')
  };

  function showToast(msg){
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast.tid);
    showToast.tid = setTimeout(() => els.toast.classList.remove('show'), 1700);
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function unique(list){ return [...new Set(list.filter(Boolean))]; }
  function numberOrBlank(value){ const n = Number(value); return Number.isFinite(n) && n > 0 ? n : ''; }
  function findEntry(id){ return data.find(e => e.id === id); }
  function pageLabel(e){
    if (e.start_page) return `p.${e.start_page}${e.end_page && e.end_page !== e.start_page ? '-' + e.end_page : ''}`;
    return e.isCustom ? 'Custom' : 'p.-';
  }

  function loadLocalData(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state.local = {
        edits: parsed.edits && typeof parsed.edits === 'object' ? parsed.edits : {},
        custom: Array.isArray(parsed.custom) ? parsed.custom : []
      };
    } catch (err) {
      state.local = { edits: {}, custom: [] };
    }
  }

  function saveLocalData(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.local));
  }

  function hydrateData(){
    data = baseData.map(entry => {
      const patch = state.local.edits[entry.id];
      return patch ? {...entry, ...patch, isEdited:true, isCustom:false} : {...entry, isEdited:false, isCustom:false};
    });
    const custom = state.local.custom.map(entry => ({...entry, isCustom:true, isEdited:false}));
    data = [...data, ...custom];
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

  function updateOutputFromSelected(force = false){
    if (force || !state.outputManualEdit) {
      els.outputPrompt.value = buildPrompt();
      state.outputManualEdit = false;
    }
  }

  function renderSelected(){
    els.selectedTags.innerHTML = '';
    if (!state.selected.length) {
      els.selectedTags.classList.add('empty');
      els.selectedTags.innerHTML = '<span>尚未添加，點擊下方條目或輸入自訂 Tag。</span>';
      updateOutputFromSelected();
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
    updateOutputFromSelected();
  }

  function addTag(label, text, page, id){
    if (!text) return showToast('此條目沒有主要 Tag');
    state.selected.push({label, text, page, id});
    renderSelected();
    showToast('已加入');
  }

  function initFilters(){
    const majors = ['全部', ...unique(data.map(e => e.major))];
    if (!majors.includes(state.major)) state.major = '全部';
    els.majorSelect.innerHTML = majors.map(m => `<option>${escapeHtml(m)}</option>`).join('');
    els.majorSelect.value = state.major;
    renderSectionOptions();
    renderCategoryChips();
    renderMetaLine();
    renderDatalistOptions();
  }

  function renderMetaLine(){
    const customCount = state.local.custom.length;
    const editedCount = Object.keys(state.local.edits).length;
    let countLine = `${data.length} 個條目可用；${meta.filtered || 0} 個高風險條目已預設排除；來源：${meta.source_name || 'PDF'}`;
    if (customCount || editedCount) countLine += `；本機新增 ${customCount}、修改 ${editedCount}`;
    els.metaLine.textContent = countLine;
  }

  function renderDatalistOptions(){
    els.majorOptions.innerHTML = unique(data.map(e => e.major)).map(m => `<option value="${escapeHtml(m)}"></option>`).join('');
    els.sectionOptions.innerHTML = unique(data.map(e => e.section)).map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
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
      chip.addEventListener('click', () => { state.major = m; state.section = '全部'; initFilters(); renderEntries(); });
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
      card.className = `entry-card${e.isCustom ? ' custom' : ''}${e.isEdited ? ' edited' : ''}`;
      const tagText = e.main_tag || e.raw || '';
      card.innerHTML = `
        <div class="entry-top">
          <div class="entry-title">${escapeHtml(e.title)}</div>
          <span class="badge">${pageLabel(e)}</span>
        </div>
        <div class="entry-badges">
          <span class="badge">${escapeHtml((e.major || '').replace(/^([一二三四五六七八九十]+、)/, '$1 '))}</span>
          <span class="badge">${escapeHtml(e.section || '未分類')}</span>
          ${e.author ? `<span class="badge">By ${escapeHtml(e.author)}</span>` : ''}
          ${e.isCustom ? '<span class="badge custom-badge">新增</span>' : ''}
          ${e.isEdited ? '<span class="badge custom-badge">已修改</span>' : ''}
        </div>
        <div class="entry-tags">${escapeHtml(tagText)}</div>
        <div class="entry-actions">
          <button class="add">添加</button>
          <button class="view">查看</button>
          <button class="edit">修改</button>
        </div>`;
      card.querySelector('.add').addEventListener('click', () => addTag(e.title, e.main_tag || e.raw, e.start_page, e.id));
      card.querySelector('.view').addEventListener('click', () => openDetail(e));
      card.querySelector('.edit').addEventListener('click', () => openEntryEditor(e));
      els.entryList.appendChild(card);
    });
  }

  function openDetail(e){
    state.currentDetailId = e.id;
    els.detailTitle.textContent = e.title;
    els.detailMeta.textContent = `${e.major || ''} / ${e.section || ''} · By ${e.author || '未知'} · ${pageLabel(e)}${e.isCustom ? ' · 新增條目' : e.isEdited ? ' · 已修改' : ''}`;
    els.detailMain.textContent = e.main_tag || '（未解析到主要 Tag，請查看原始摘錄）';
    els.detailNegative.textContent = e.negative_tag || '（無）';
    els.detailNotes.textContent = e.notes || e.raw || '（無）';
    els.detailAddMain.onclick = () => addTag(e.title, e.main_tag || e.raw, e.start_page, e.id);
    els.detailCopyNegative.onclick = async () => { await navigator.clipboard.writeText(e.negative_tag || ''); showToast('已複製負面 Tag'); };
    els.detailDialog.showModal();
  }

  function openEntryEditor(entry){
    const isNew = !entry;
    els.entryDialogTitle.textContent = isNew ? '增加字典條目' : '修改字典條目';
    els.editEntryId.value = entry?.id || '';
    els.editTitle.value = entry?.title || '';
    els.editMajor.value = entry?.major || (state.major !== '全部' ? state.major : '自訂');
    els.editSection.value = entry?.section || (state.section !== '全部' ? state.section : '未分類');
    els.editAuthor.value = entry?.author || '';
    els.editStartPage.value = entry?.start_page || '';
    els.editEndPage.value = entry?.end_page || '';
    els.editMainTag.value = entry?.main_tag || '';
    els.editNegativeTag.value = entry?.negative_tag || '';
    els.editNotes.value = entry?.notes || '';
    els.editRaw.value = entry?.raw || '';
    els.resetEntryBtn.style.display = (!isNew && !entry.isCustom) ? '' : 'none';
    els.entryDialog.showModal();
    setTimeout(() => els.editTitle.focus(), 30);
  }

  function collectEntryFromForm(){
    const id = els.editEntryId.value || `custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const start = numberOrBlank(els.editStartPage.value);
    const end = numberOrBlank(els.editEndPage.value) || start;
    return {
      id,
      title: els.editTitle.value.trim(),
      major: els.editMajor.value.trim() || '自訂',
      section: els.editSection.value.trim() || '未分類',
      author: els.editAuthor.value.trim(),
      start_page: start,
      end_page: end,
      main_tag: els.editMainTag.value.trim(),
      negative_tag: els.editNegativeTag.value.trim(),
      notes: els.editNotes.value.trim(),
      raw: els.editRaw.value.trim(),
      blocked: false,
      block_reason: ''
    };
  }

  function saveEntry(entry){
    if (!entry.title) return showToast('請輸入條目名稱');
    if (!entry.main_tag) return showToast('請輸入主要 Tag');
    if (entry.id.startsWith('custom-')) {
      const idx = state.local.custom.findIndex(e => e.id === entry.id);
      if (idx >= 0) state.local.custom[idx] = entry;
      else state.local.custom.push(entry);
    } else {
      state.local.edits[entry.id] = entry;
    }
    saveLocalData();
    hydrateData();
    updateSelectedFromEntry(entry);
    initFilters();
    renderEntries();
    renderSelected();
    els.entryDialog.close();
    showToast('已儲存字典條目');
  }

  function updateSelectedFromEntry(entry){
    state.selected = state.selected.map(item => {
      if (item.id !== entry.id) return item;
      return {label: entry.title, text: entry.main_tag || entry.raw, page: entry.start_page, id: entry.id};
    });
  }

  function resetEntryToOriginal(){
    const id = els.editEntryId.value;
    if (!id || id.startsWith('custom-')) return;
    delete state.local.edits[id];
    saveLocalData();
    hydrateData();
    const original = findEntry(id);
    updateSelectedFromEntry(original || {id, title:'', main_tag:'', raw:'', start_page:''});
    initFilters();
    renderEntries();
    renderSelected();
    els.entryDialog.close();
    showToast('已還原原始條目');
  }

  function exportLocalData(){
    const payload = {
      name: 'NovelAI Prompt Tag Dictionary local changes',
      version: 3,
      source_name: meta.source_name || 'PDF',
      exported_at: new Date().toISOString(),
      edits: state.local.edits,
      custom: state.local.custom
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novelai-tag-dictionary-local-changes.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('已匯出修改');
  }

  function importLocalData(file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const edits = parsed.edits && typeof parsed.edits === 'object' ? parsed.edits : {};
        const custom = Array.isArray(parsed.custom) ? parsed.custom : [];
        state.local.edits = {...state.local.edits, ...edits};
        const customMap = new Map(state.local.custom.map(e => [e.id, e]));
        custom.forEach(e => { if (e && e.id) customMap.set(e.id, e); });
        state.local.custom = [...customMap.values()];
        saveLocalData();
        hydrateData();
        initFilters();
        renderEntries();
        renderSelected();
        showToast('已匯入修改');
      } catch (err) {
        showToast('JSON 格式不正確');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function clearLocalData(){
    const ok = confirm('確定清除本機新增與修改？此操作不會影響原始 tags.js。');
    if (!ok) return;
    state.local = { edits: {}, custom: [] };
    saveLocalData();
    hydrateData();
    initFilters();
    renderEntries();
    renderSelected();
    showToast('已清除本機修改');
  }

  function refreshOutputOptions(){ renderSelected(); }

  els.addCustomBtn.addEventListener('click', () => {
    const v = els.customInput.value.trim();
    if(v){ addTag(v, v, null, null); els.customInput.value=''; }
  });
  els.customInput.addEventListener('keydown', e => { if(e.key === 'Enter') els.addCustomBtn.click(); });
  els.searchInput.addEventListener('input', e => { state.query = e.target.value; renderEntries(); });
  els.majorSelect.addEventListener('change', e => { state.major = e.target.value; state.section = '全部'; initFilters(); renderEntries(); });
  els.sectionSelect.addEventListener('change', e => { state.section = e.target.value; renderEntries(); });
  els.clearSelectedBtn.addEventListener('click', () => { state.selected = []; renderSelected(); });
  els.copySelectedBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(buildPrompt()); showToast('已複製已選 Tag'); });
  els.outputPrompt.addEventListener('input', () => { state.outputManualEdit = true; });
  els.buildBtn.addEventListener('click', () => { updateOutputFromSelected(true); showToast('已重新產生輸出'); });
  els.copyOutputBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(els.outputPrompt.value || buildPrompt()); showToast('已複製 Prompt'); });
  els.resetBtn.addEventListener('click', () => { state.selected=[]; state.query=''; state.major='全部'; state.section='全部'; state.outputManualEdit=false; els.searchInput.value=''; initFilters(); renderEntries(); renderSelected(); });
  els.randomBtn.addEventListener('click', () => { const list = filteredEntries(); if(!list.length) return; const e = list[Math.floor(Math.random()*list.length)]; addTag(e.title, e.main_tag || e.raw, e.start_page, e.id); });
  els.selectFirstVisible.addEventListener('click', () => { const e = filteredEntries()[0]; if(e) addTag(e.title, e.main_tag || e.raw, e.start_page, e.id); });
  els.selectCategoryOnly.addEventListener('click', () => { els.searchInput.value=''; state.query=''; renderEntries(); showToast('已套用目前分類'); });
  els.closeDialog.addEventListener('click', () => els.detailDialog.close());
  els.detailEditEntry.addEventListener('click', () => { const e = findEntry(state.currentDetailId); if(e) openEntryEditor(e); });
  els.themeBtn.addEventListener('click', () => { document.body.classList.toggle('dark'); els.themeBtn.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark'; });
  [els.qualityToggle, els.underscoreToggle, els.dedupeToggle, els.pageToggle].forEach(el => el.addEventListener('change', refreshOutputOptions));
  document.querySelectorAll('.suffix').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.suffix').forEach(b => b.classList.remove('active'));
    if (state.suffix === btn.dataset.value) { state.suffix = ''; }
    else { state.suffix = btn.dataset.value; btn.classList.add('active'); }
    renderSelected();
  }));

  els.addEntryBtn.addEventListener('click', () => openEntryEditor(null));
  els.closeEntryDialog.addEventListener('click', () => els.entryDialog.close());
  els.cancelEntryBtn.addEventListener('click', () => els.entryDialog.close());
  els.entryForm.addEventListener('submit', e => { e.preventDefault(); saveEntry(collectEntryFromForm()); });
  els.resetEntryBtn.addEventListener('click', resetEntryToOriginal);
  els.exportDataBtn.addEventListener('click', exportLocalData);
  els.importDataInput.addEventListener('change', e => { importLocalData(e.target.files[0]); e.target.value = ''; });
  els.clearLocalDataBtn.addEventListener('click', clearLocalData);

  loadLocalData();
  hydrateData();
  initFilters();
  renderEntries();
  renderSelected();
})();
