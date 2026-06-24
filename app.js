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
    local: { edits: {}, custom: [], settings: {}, deleted: [] },
    currentDetailId: null,
    outputManualEdit: false,
    outputFontSize: 13
  };
  let data = [];

  const $ = (id) => document.getElementById(id);
  const els = {
    metaLine: $('metaLine'), customInput: $('customInput'), addCustomBtn: $('addCustomBtn'),
    searchInput: $('searchInput'), majorSelect: $('majorSelect'), sectionSelect: $('sectionSelect'), categoryChips: $('categoryChips'),
    selectedTags: $('selectedTags'), entryList: $('entryList'), clearSelectedBtn: $('clearSelectedBtn'), copySelectedBtn: $('copySelectedBtn'),
    randomBtn: $('randomBtn'), outputPrompt: $('outputPrompt'), outputPromptLarge: $('outputPromptLarge'), outputDialog: $('outputDialog'), outputFullscreenBtn: $('outputFullscreenBtn'), outputFullscreenClose: $('outputFullscreenClose'), outputZoomOut: $('outputZoomOut'), outputZoomReset: $('outputZoomReset'), outputZoomIn: $('outputZoomIn'), buildBtn: $('buildBtn'), resetBtn: $('resetBtn'), copyOutputBtn: $('copyOutputBtn'),
    qualityToggle: $('qualityToggle'), underscoreToggle: $('underscoreToggle'), dedupeToggle: $('dedupeToggle'), pageToggle: $('pageToggle'),
    selectFirstVisible: $('selectFirstVisible'), selectCategoryOnly: $('selectCategoryOnly'), themeBtn: $('themeBtn'), toast: $('toast'),
    addEntryBtn: $('addEntryBtn'), editCategoriesBtn: $('editCategoriesBtn'), deleteCategoryEntriesBtn: $('deleteCategoryEntriesBtn'), exportDataBtn: $('exportDataBtn'), importDataInput: $('importDataInput'), clearLocalDataBtn: $('clearLocalDataBtn'),
    detailDialog: $('detailDialog'), closeDialog: $('closeDialog'), detailEditEntry: $('detailEditEntry'), detailTitle: $('detailTitle'), detailMeta: $('detailMeta'), detailMain: $('detailMain'),
    detailNegative: $('detailNegative'), detailNotes: $('detailNotes'), detailAddMain: $('detailAddMain'), detailCopyNegative: $('detailCopyNegative'),
    entryDialog: $('entryDialog'), entryForm: $('entryForm'), entryDialogTitle: $('entryDialogTitle'), closeEntryDialog: $('closeEntryDialog'), cancelEntryBtn: $('cancelEntryBtn'), resetEntryBtn: $('resetEntryBtn'),
    editEntryId: $('editEntryId'), editTitle: $('editTitle'), editMajor: $('editMajor'), editSection: $('editSection'), editAuthor: $('editAuthor'),
    editStartPage: $('editStartPage'), editEndPage: $('editEndPage'), editMainTag: $('editMainTag'), editNegativeTag: $('editNegativeTag'), editNotes: $('editNotes'), editRaw: $('editRaw'),
    majorOptions: $('majorOptions'), sectionOptions: $('sectionOptions'),
    categoryDialog: $('categoryDialog'), categoryForm: $('categoryForm'), closeCategoryDialog: $('closeCategoryDialog'), cancelCategoryBtn: $('cancelCategoryBtn'),
    categoryType: $('categoryType'), categoryFrom: $('categoryFrom'), categoryTo: $('categoryTo'), categoryEntryToDelete: $('categoryEntryToDelete'), categoryList: $('categoryList'), deleteCategoryEntries: $('deleteCategoryEntries')
  };

  function showToast(msg){
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast.tid);
    showToast.tid = setTimeout(() => els.toast.classList.remove('show'), 1700);
  }

  function setEditableText(el, text){
    if (!el) return;
    if ('value' in el) el.value = text || '';
    else el.textContent = text || '';
  }

  function getEditableText(el){
    if (!el) return '';
    if ('value' in el) return el.value;
    return (el.innerText || el.textContent || '').replace(/ /g, ' ');
  }

  function setOutputText(text){
    setEditableText(els.outputPrompt, text);
    setEditableText(els.outputPromptLarge, text);
  }

  function getOutputText(){
    if (els.outputDialog?.open && els.outputPromptLarge) return getEditableText(els.outputPromptLarge);
    return getEditableText(els.outputPrompt);
  }

  function syncOutputEditors(source){
    const text = getEditableText(source);
    if (source !== els.outputPrompt) setEditableText(els.outputPrompt, text);
    if (source !== els.outputPromptLarge) setEditableText(els.outputPromptLarge, text);
    state.outputManualEdit = true;
  }

  function focusEditableEnd(el){
    if (!el) return;
    el.focus();
    if (!('value' in el) && window.getSelection && document.createRange) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else if ('value' in el) {
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }

  function focusOutputEnd(){
    focusEditableEnd(els.outputDialog?.open ? els.outputPromptLarge : els.outputPrompt);
  }

  function openOutputFullscreen(){
    setEditableText(els.outputPromptLarge, getEditableText(els.outputPrompt));
    els.outputDialog.showModal();
    setTimeout(() => focusEditableEnd(els.outputPromptLarge), 30);
  }

  function closeOutputFullscreen(){
    setEditableText(els.outputPrompt, getEditableText(els.outputPromptLarge));
    els.outputDialog.close();
    focusEditableEnd(els.outputPrompt);
  }

  function applyOutputFontSize(size, persist = true){
    const next = Math.max(11, Math.min(28, Number(size) || 13));
    state.outputFontSize = next;
    document.documentElement.style.setProperty('--output-font-size', `${next}px`);
    if (persist) {
      state.local.settings = state.local.settings || {};
      state.local.settings.outputFontSize = next;
      saveLocalData();
    }
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
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
        settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted : []
      };
      if (state.local.settings.outputFontSize) state.outputFontSize = state.local.settings.outputFontSize;
    } catch (err) {
      state.local = { edits: {}, custom: [], settings: {}, deleted: [] };
    }
  }

  function saveLocalData(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.local));
  }

  function hydrateData(){
    const deleted = new Set(state.local.deleted || []);
    data = baseData
      .filter(entry => !deleted.has(entry.id))
      .map(entry => {
        const patch = state.local.edits[entry.id];
        return patch ? {...entry, ...patch, isEdited:true, isCustom:false} : {...entry, isEdited:false, isCustom:false};
      });
    const custom = state.local.custom
      .filter(entry => entry && !deleted.has(entry.id))
      .map(entry => ({...entry, isCustom:true, isEdited:false}));
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
      setOutputText(buildPrompt());
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
    const deletedCount = (state.local.deleted || []).length;
    let countLine = `${data.length} 個條目可用；${meta.filtered || 0} 個高風險條目已預設排除；來源：${meta.source_name || 'PDF'}`;
    if (customCount || editedCount || deletedCount) countLine += `；本機新增 ${customCount}、修改 ${editedCount}、刪除 ${deletedCount}`;
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
      version: 4,
      source_name: meta.source_name || 'PDF',
      exported_at: new Date().toISOString(),
      edits: state.local.edits,
      custom: state.local.custom,
      settings: state.local.settings || {},
      deleted: state.local.deleted || []
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
        const settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
        const deleted = Array.isArray(parsed.deleted) ? parsed.deleted : [];
        state.local.edits = {...state.local.edits, ...edits};
        state.local.settings = {...(state.local.settings || {}), ...settings};
        state.local.deleted = unique([...(state.local.deleted || []), ...deleted]);
        if (state.local.settings.outputFontSize) applyOutputFontSize(state.local.settings.outputFontSize, false);
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
    const ok = confirm('確定清除本機新增、修改與刪除記錄？此操作不會影響原始 tags.js。');
    if (!ok) return;
    state.local = { edits: {}, custom: [], settings: {}, deleted: [] };
    applyOutputFontSize(13, false);
    saveLocalData();
    hydrateData();
    initFilters();
    renderEntries();
    renderSelected();
    showToast('已清除本機修改');
  }

  function sanitizeEntry(entry){
    const {isCustom, isEdited, ...clean} = entry || {};
    return clean;
  }

  function getCategoryCounts(type){
    const counts = new Map();
    data.forEach(e => {
      const name = (e[type] || '未分類').trim() || '未分類';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()].sort((a,b) => a[0].localeCompare(b[0], 'zh-Hant'));
  }

  function entriesInCategory(type, name){
    return data
      .filter(entry => ((entry[type] || '未分類').trim() || '未分類') === name)
      .sort((a,b) => (Number(a.start_page) || 99999) - (Number(b.start_page) || 99999) || String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hant'));
  }

  function renderCategoryEntryChoices(){
    const type = els.categoryType.value === 'section' ? 'section' : 'major';
    const name = (els.categoryFrom.value || '').trim();
    const previous = els.categoryEntryToDelete.value;
    const entries = name ? entriesInCategory(type, name) : [];
    els.categoryEntryToDelete.innerHTML = entries.map(entry => {
      const page = pageLabel(entry);
      const markers = `${entry.isCustom ? ' · 新增' : ''}${entry.isEdited ? ' · 已修改' : ''}`;
      return `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.title)}（${page}）${markers}</option>`;
    }).join('');
    if (entries.some(entry => entry.id === previous)) els.categoryEntryToDelete.value = previous;
    els.deleteCategoryEntries.disabled = !entries.length;
  }

  function renderCategoryEditor(){
    const type = els.categoryType.value || 'major';
    const previous = els.categoryFrom.value;
    const counts = getCategoryCounts(type);
    els.categoryFrom.innerHTML = counts.map(([name, count]) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}（${count}）</option>`).join('');
    if (counts.some(([name]) => name === previous)) els.categoryFrom.value = previous;
    else if (counts[0]) els.categoryFrom.value = counts[0][0];
    const selected = els.categoryFrom.value || (counts[0] ? counts[0][0] : '');
    els.categoryTo.value = selected;
    renderCategoryEntryChoices();
    els.categoryList.innerHTML = counts.map(([name, count]) => `
      <button type="button" class="category-pill" data-name="${escapeHtml(name)}">
        <span>${escapeHtml(name)}</span><small>${count} 條</small>
      </button>`).join('') || '<p class="muted">暫無分類。</p>';
    els.categoryList.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        els.categoryFrom.value = btn.dataset.name;
        els.categoryTo.value = btn.dataset.name;
        renderCategoryEntryChoices();
      });
    });
  }

  function openCategoryEditor(){
    renderCategoryEditor();
    els.categoryDialog.showModal();
  }

  function applyCategoryRename(){
    const type = els.categoryType.value === 'section' ? 'section' : 'major';
    const oldName = (els.categoryFrom.value || '').trim();
    const newName = (els.categoryTo.value || '').trim();
    if (!oldName) return showToast('請選擇目前分類');
    if (!newName) return showToast('請輸入新分類名稱');
    if (oldName === newName) return showToast('分類名稱沒有變更');

    let changed = 0;
    data.forEach(entry => {
      const currentName = (entry[type] || '未分類').trim() || '未分類';
      if (currentName !== oldName) return;
      changed += 1;
      if (entry.isCustom) {
        const idx = state.local.custom.findIndex(e => e.id === entry.id);
        if (idx >= 0) state.local.custom[idx] = {...state.local.custom[idx], [type]: newName};
      } else {
        state.local.edits[entry.id] = sanitizeEntry({...entry, [type]: newName});
      }
    });

    if (!changed) return showToast('沒有條目使用此分類');
    if (type === 'major' && state.major === oldName) state.major = newName;
    if (type === 'section' && state.section === oldName) state.section = newName;
    saveLocalData();
    hydrateData();
    initFilters();
    renderEntries();
    renderSelected();
    renderCategoryEditor();
    showToast(`已更新 ${changed} 個條目的分類`);
  }


  function deleteSelectedEntryInCategory(){
    const type = els.categoryType.value === 'section' ? 'section' : 'major';
    const name = (els.categoryFrom.value || '').trim();
    const id = els.categoryEntryToDelete.value;
    if (!name) return showToast('請先選擇分類');
    if (!id) return showToast('請先選擇要刪除的條目');
    const entry = findEntry(id);
    if (!entry) return showToast('找不到該條目，請重新選擇');

    const label = type === 'section' ? '子分類' : '主分類';
    const ok = confirm(`確定刪除「${entry.title}」？\n\n目前位於「${name}」${label}。這只會刪除這一個條目，不會刪除整個分類；可用「清除本機修改」恢復原始資料。`);
    if (!ok) return;

    if (entry.isCustom) {
      state.local.custom = state.local.custom.filter(e => e.id !== id);
    } else {
      state.local.deleted = unique([...(state.local.deleted || []), id]);
      delete state.local.edits[id];
    }
    state.selected = state.selected.filter(item => item.id !== id);

    saveLocalData();
    hydrateData();
    initFilters();
    renderEntries();
    renderSelected();
    renderCategoryEditor();
    showToast(`已刪除條目：${entry.title}`);
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
  [els.outputPrompt, els.outputPromptLarge].filter(Boolean).forEach(editor => {
    editor.addEventListener('input', () => syncOutputEditors(editor));
    editor.addEventListener('paste', (e) => {
      if ('value' in editor) return;
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
      syncOutputEditors(editor);
    });
  });
  els.outputFullscreenBtn.addEventListener('click', openOutputFullscreen);
  els.outputFullscreenClose.addEventListener('click', closeOutputFullscreen);
  els.outputDialog.addEventListener('cancel', () => setEditableText(els.outputPrompt, getEditableText(els.outputPromptLarge)));
  els.outputDialog.addEventListener('close', () => setEditableText(els.outputPrompt, getEditableText(els.outputPromptLarge)));
  els.outputZoomOut.addEventListener('click', () => { applyOutputFontSize(state.outputFontSize - 1); focusOutputEnd(); });
  els.outputZoomReset.addEventListener('click', () => { applyOutputFontSize(13); focusOutputEnd(); });
  els.outputZoomIn.addEventListener('click', () => { applyOutputFontSize(state.outputFontSize + 1); focusOutputEnd(); });
  els.buildBtn.addEventListener('click', () => { updateOutputFromSelected(true); focusOutputEnd(); showToast('已重新產生輸出'); });
  els.copyOutputBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(getOutputText() || buildPrompt()); showToast('已複製 Prompt'); });
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
  els.editCategoriesBtn.addEventListener('click', openCategoryEditor);
  els.deleteCategoryEntriesBtn.addEventListener('click', openCategoryEditor);
  els.categoryType.addEventListener('change', renderCategoryEditor);
  els.categoryFrom.addEventListener('change', () => { els.categoryTo.value = els.categoryFrom.value; renderCategoryEntryChoices(); });
  els.categoryForm.addEventListener('submit', e => { e.preventDefault(); applyCategoryRename(); });
  els.deleteCategoryEntries.addEventListener('click', deleteSelectedEntryInCategory);
  els.closeCategoryDialog.addEventListener('click', () => els.categoryDialog.close());
  els.cancelCategoryBtn.addEventListener('click', () => els.categoryDialog.close());
  els.closeEntryDialog.addEventListener('click', () => els.entryDialog.close());
  els.cancelEntryBtn.addEventListener('click', () => els.entryDialog.close());
  els.entryForm.addEventListener('submit', e => { e.preventDefault(); saveEntry(collectEntryFromForm()); });
  els.resetEntryBtn.addEventListener('click', resetEntryToOriginal);
  els.exportDataBtn.addEventListener('click', exportLocalData);
  els.importDataInput.addEventListener('change', e => { importLocalData(e.target.files[0]); e.target.value = ''; });
  els.clearLocalDataBtn.addEventListener('click', clearLocalData);

  loadLocalData();
  applyOutputFontSize(state.outputFontSize, false);
  hydrateData();
  initFilters();
  renderEntries();
  renderSelected();
})();
