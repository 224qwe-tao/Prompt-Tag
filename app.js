(() => {
  const baseData = Array.isArray(window.TAG_DATA) ? window.TAG_DATA : [];
  const meta = window.TAG_METADATA || {};
  const STORAGE_KEY = 'novelai_prompt_tag_dictionary_local_v3';
  const GITHUB_CONFIG_KEY = 'novelai_prompt_tag_dictionary_github_config_v1';
  const SHARED_CHANGES_PATH = 'dictionary-changes.json';
  const state = {
    selected: [],
    major: '全部',
    section: '全部',
    query: '',
    suffix: '',
    local: { edits: {}, custom: [], settings: {}, deleted: [], categories: { major: [], section: [] } },
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
    addEntryBtn: $('addEntryBtn'), addCategoryBtn: $('addCategoryBtn'), editCategoriesBtn: $('editCategoriesBtn'), deleteCategoryEntriesBtn: $('deleteCategoryEntriesBtn'), exportDataBtn: $('exportDataBtn'), importDataInput: $('importDataInput'),
    detailDialog: $('detailDialog'), closeDialog: $('closeDialog'), detailEditEntry: $('detailEditEntry'), detailTitle: $('detailTitle'), detailMeta: $('detailMeta'), detailMain: $('detailMain'),
    detailNegative: $('detailNegative'), detailNotes: $('detailNotes'), detailAddMain: $('detailAddMain'), detailCopyNegative: $('detailCopyNegative'),
    entryDialog: $('entryDialog'), entryForm: $('entryForm'), entryDialogTitle: $('entryDialogTitle'), closeEntryDialog: $('closeEntryDialog'), cancelEntryBtn: $('cancelEntryBtn'), resetEntryBtn: $('resetEntryBtn'),
    editEntryId: $('editEntryId'), editTitle: $('editTitle'), editMajor: $('editMajor'), editSection: $('editSection'), editAuthor: $('editAuthor'),
    editStartPage: $('editStartPage'), editEndPage: $('editEndPage'), editMainTag: $('editMainTag'), editNegativeTag: $('editNegativeTag'), editNotes: $('editNotes'), editRaw: $('editRaw'),
    majorOptions: $('majorOptions'), sectionOptions: $('sectionOptions'),
    categoryDialog: $('categoryDialog'), categoryForm: $('categoryForm'), closeCategoryDialog: $('closeCategoryDialog'), cancelCategoryBtn: $('cancelCategoryBtn'),
    categoryType: $('categoryType'), categoryFrom: $('categoryFrom'), categoryTo: $('categoryTo'), categoryNewName: $('categoryNewName'), categoryEntryToDelete: $('categoryEntryToDelete'), categoryList: $('categoryList'), deleteCategoryEntries: $('deleteCategoryEntries'), addCategoryConfirm: $('addCategoryConfirm'),
    githubRepo: $('githubRepo'), githubBranch: $('githubBranch'), githubPath: $('githubPath'), githubToken: $('githubToken'), githubRememberToken: $('githubRememberToken'),
    saveGithubConfigBtn: $('saveGithubConfigBtn'), loadGithubBtn: $('loadGithubBtn'), saveGithubBtn: $('saveGithubBtn'), githubStatus: $('githubStatus')
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
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
        categories: parsed.categories && typeof parsed.categories === 'object' ? {
          major: Array.isArray(parsed.categories.major) ? parsed.categories.major.filter(Boolean) : [],
          section: Array.isArray(parsed.categories.section) ? parsed.categories.section.filter(Boolean) : []
        } : { major: [], section: [] }
      };
      if (state.local.settings.outputFontSize) state.outputFontSize = state.local.settings.outputFontSize;
    } catch (err) {
      state.local = { edits: {}, custom: [], settings: {}, deleted: [], categories: { major: [], section: [] } };
    }
  }

  function saveLocalData(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.local));
  }

  function buildChangesPayload(){
    return {
      name: 'NovelAI Prompt Tag Dictionary shared changes',
      version: 5,
      source_name: meta.source_name || 'PDF',
      exported_at: new Date().toISOString(),
      edits: state.local.edits || {},
      custom: state.local.custom || [],
      settings: state.local.settings || {},
      deleted: state.local.deleted || [],
      categories: state.local.categories || { major: [], section: [] }
    };
  }

  function normalizeChangesPayload(payload){
    const parsed = payload && typeof payload === 'object' ? payload : {};
    return {
      edits: parsed.edits && typeof parsed.edits === 'object' ? parsed.edits : {},
      custom: Array.isArray(parsed.custom) ? parsed.custom.filter(e => e && e.id) : [],
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted.filter(Boolean) : [],
      categories: parsed.categories && typeof parsed.categories === 'object' ? {
        major: Array.isArray(parsed.categories.major) ? parsed.categories.major.filter(Boolean) : [],
        section: Array.isArray(parsed.categories.section) ? parsed.categories.section.filter(Boolean) : []
      } : { major: [], section: [] }
    };
  }

  function mergeChangesPayload(payload, preferIncoming = true){
    const incoming = normalizeChangesPayload(payload);
    state.local.edits = preferIncoming
      ? {...(state.local.edits || {}), ...incoming.edits}
      : {...incoming.edits, ...(state.local.edits || {})};
    state.local.settings = preferIncoming
      ? {...(state.local.settings || {}), ...incoming.settings}
      : {...incoming.settings, ...(state.local.settings || {})};
    state.local.deleted = unique([...(state.local.deleted || []), ...incoming.deleted]);
    state.local.categories = state.local.categories || { major: [], section: [] };
    state.local.categories.major = unique([...(state.local.categories.major || []), ...(incoming.categories?.major || [])]);
    state.local.categories.section = unique([...(state.local.categories.section || []), ...(incoming.categories?.section || [])]);

    const customMap = new Map();
    const addCustom = (entry) => { if (entry && entry.id) customMap.set(entry.id, entry); };
    if (preferIncoming) {
      (state.local.custom || []).forEach(addCustom);
      incoming.custom.forEach(addCustom);
    } else {
      incoming.custom.forEach(addCustom);
      (state.local.custom || []).forEach(addCustom);
    }
    state.local.custom = [...customMap.values()];
    if (state.local.settings.outputFontSize) applyOutputFontSize(state.local.settings.outputFontSize, false);
    saveLocalData();
    hydrateData();
    initFilters();
    renderEntries();
    renderSelected();
    if (els.categoryDialog?.open) renderCategoryEditor();
    return {
      edits: Object.keys(incoming.edits).length,
      custom: incoming.custom.length,
      deleted: incoming.deleted.length,
      categories: (incoming.categories?.major || []).length + (incoming.categories?.section || []).length
    };
  }

  function describeChangeCounts(counts){
    const parts = [];
    if (counts.edits) parts.push(`修改 ${counts.edits}`);
    if (counts.custom) parts.push(`新增 ${counts.custom}`);
    if (counts.deleted) parts.push(`刪除 ${counts.deleted}`);
    if (counts.categories) parts.push(`分類 ${counts.categories}`);
    return parts.length ? parts.join('、') : '沒有新增修改';
  }

  function base64EncodeUnicode(str){
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64DecodeUnicode(b64){
    const clean = String(b64 || '').replace(/\s/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function githubApiPath(path){
    return String(path || SHARED_CHANGES_PATH).split('/').map(encodeURIComponent).join('/');
  }

  function parseRepoSlug(input){
    const value = String(input || '').trim().replace(/\.git$/, '');
    const urlMatch = value.match(/github\.com\/([^\/]+)\/([^\/#?]+)/i);
    if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`;
    const parts = value.split('/').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return '';
  }

  function inferGithubRepoFromLocation(){
    const host = location.hostname || '';
    const match = host.match(/^([^\.]+)\.github\.io$/i);
    const pathRepo = location.pathname.split('/').filter(Boolean)[0];
    if (match && pathRepo) return `${match[1]}/${pathRepo}`;
    return '';
  }

  function setGithubStatus(message, isError = false){
    if (!els.githubStatus) return;
    els.githubStatus.textContent = message;
    els.githubStatus.classList.toggle('error', Boolean(isError));
  }

  function loadGithubConfig(){
    try {
      const parsed = JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function getGithubFormConfig(){
    return {
      repo: parseRepoSlug(els.githubRepo?.value),
      branch: (els.githubBranch?.value || 'main').trim() || 'main',
      path: (els.githubPath?.value || SHARED_CHANGES_PATH).trim() || SHARED_CHANGES_PATH,
      token: (els.githubToken?.value || '').trim(),
      rememberToken: Boolean(els.githubRememberToken?.checked)
    };
  }

  function renderGithubConfig(){
    const cfg = loadGithubConfig();
    if (els.githubRepo) els.githubRepo.value = cfg.repo || inferGithubRepoFromLocation();
    if (els.githubBranch) els.githubBranch.value = cfg.branch || 'main';
    if (els.githubPath) els.githubPath.value = cfg.path || SHARED_CHANGES_PATH;
    if (els.githubToken) els.githubToken.value = cfg.token || '';
    if (els.githubRememberToken) els.githubRememberToken.checked = Boolean(cfg.token);
  }

  function saveGithubConfig(showMessage = true){
    const cfg = getGithubFormConfig();
    const saved = {
      repo: cfg.repo,
      branch: cfg.branch,
      path: cfg.path,
      token: cfg.rememberToken ? cfg.token : ''
    };
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(saved));
    if (showMessage) {
      setGithubStatus(`已儲存 GitHub 設定：${cfg.repo || '未填 Repository'} / ${cfg.branch} / ${cfg.path}`);
      showToast('已儲存 GitHub 設定');
    }
    return cfg;
  }

  function githubHeaders(token){
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function githubErrorMessage(res){
    try {
      const json = await res.json();
      return json.message || `${res.status} ${res.statusText}`;
    } catch (err) {
      return `${res.status} ${res.statusText}`;
    }
  }

  async function autoLoadSharedChanges(){
    try {
      const res = await fetch(`${SHARED_CHANGES_PATH}?v=${Date.now()}`, {cache:'no-store'});
      if (!res.ok) return;
      const parsed = await res.json();
      const counts = mergeChangesPayload(parsed, true);
      if (counts.edits || counts.custom || counts.deleted) {
        showToast('已載入 GitHub 共享修改');
        setGithubStatus(`已自動載入 ${SHARED_CHANGES_PATH}：${describeChangeCounts(counts)}`);
      }
    } catch (err) {
      // GitHub Pages 上沒有共享檔或本地開啟 file:// 時可安全忽略。
    }
  }

  async function loadChangesFromGithub(){
    const cfg = saveGithubConfig(false);
    if (!cfg.repo) return setGithubStatus('請先輸入 Repository，例如 username/repository。', true);
    const url = `https://api.github.com/repos/${cfg.repo}/contents/${githubApiPath(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`;
    try {
      setGithubStatus('正在從 GitHub 載入修改…');
      const res = await fetch(url, {headers: githubHeaders(cfg.token)});
      if (res.status === 404) {
        setGithubStatus(`找不到 ${cfg.path}，可先按「保存到 GitHub」建立此檔案。`, true);
        return;
      }
      if (!res.ok) throw new Error(await githubErrorMessage(res));
      const file = await res.json();
      const text = base64DecodeUnicode(file.content || '');
      const parsed = JSON.parse(text);
      const counts = mergeChangesPayload(parsed, true);
      setGithubStatus(`已載入 GitHub 修改：${describeChangeCounts(counts)}`);
      showToast('已載入 GitHub 修改');
    } catch (err) {
      setGithubStatus(`載入失敗：${err.message}`, true);
      showToast('GitHub 載入失敗');
    }
  }

  async function saveChangesToGithub(){
    const cfg = saveGithubConfig(false);
    if (!cfg.repo) return setGithubStatus('請先輸入 Repository，例如 username/repository。', true);
    if (!cfg.token) return setGithubStatus('請輸入 Fine-grained token。Token 需要該 repository 的 Contents: Read and write 權限。', true);
    const url = `https://api.github.com/repos/${cfg.repo}/contents/${githubApiPath(cfg.path)}`;
    try {
      setGithubStatus('正在檢查 GitHub 檔案…');
      let sha = null;
      const getRes = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, {headers: githubHeaders(cfg.token)});
      if (getRes.ok) {
        const current = await getRes.json();
        sha = current.sha || null;
      } else if (getRes.status !== 404) {
        throw new Error(await githubErrorMessage(getRes));
      }

      const payload = buildChangesPayload();
      const content = JSON.stringify(payload, null, 2);
      const body = {
        message: 'Update NovelAI Prompt Tag dictionary changes',
        content: base64EncodeUnicode(content),
        branch: cfg.branch
      };
      if (sha) body.sha = sha;

      setGithubStatus('正在保存到 GitHub…');
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {...githubHeaders(cfg.token), 'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      if (!putRes.ok) throw new Error(await githubErrorMessage(putRes));
      setGithubStatus(`已保存到 GitHub：${cfg.path}。其他設備重新開啟網站後會讀取更新；GitHub Pages 可能需要等待短時間部署。`);
      showToast('已保存到 GitHub');
    } catch (err) {
      setGithubStatus(`保存失敗：${err.message}`, true);
      showToast('GitHub 保存失敗');
    }
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

  function ensureCategoryStore(){
    if (!state.local.categories || typeof state.local.categories !== 'object') state.local.categories = { major: [], section: [] };
    if (!Array.isArray(state.local.categories.major)) state.local.categories.major = [];
    if (!Array.isArray(state.local.categories.section)) state.local.categories.section = [];
  }

  function extraCategories(type){
    ensureCategoryStore();
    return unique(state.local.categories[type] || []);
  }

  function allCategoryNames(type, sourceData = data){
    const names = unique([...(sourceData || []).map(e => e[type]), ...extraCategories(type)]);
    return names.filter(Boolean);
  }

  function initFilters(){
    const majors = ['全部', ...allCategoryNames('major')];
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
    const categoryCount = (state.local.categories?.major || []).length + (state.local.categories?.section || []).length;
    let countLine = `${data.length} 個條目可用；${meta.filtered || 0} 個高風險條目已預設排除；來源：${meta.source_name || 'PDF'}`;
    if (customCount || editedCount || deletedCount || categoryCount) countLine += `；本機新增 ${customCount}、修改 ${editedCount}、刪除 ${deletedCount}、分類 ${categoryCount}`;
    els.metaLine.textContent = countLine;
  }

  function renderDatalistOptions(){
    els.majorOptions.innerHTML = allCategoryNames('major').map(m => `<option value="${escapeHtml(m)}"></option>`).join('');
    els.sectionOptions.innerHTML = allCategoryNames('section').map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
  }

  function renderSectionOptions(){
    const pool = state.major === '全部' ? data : data.filter(e => e.major === state.major);
    const sections = ['全部', ...unique([...pool.map(e => e.section), ...extraCategories('section')])];
    els.sectionSelect.innerHTML = sections.map(s => `<option>${escapeHtml(s)}</option>`).join('');
    if (!sections.includes(state.section)) state.section = '全部';
    els.sectionSelect.value = state.section;
  }

  function renderCategoryChips(){
    const majors = ['全部', ...allCategoryNames('major')];
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
    const payload = buildChangesPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dictionary-changes.json';
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
        const counts = mergeChangesPayload(parsed, true);
        showToast(`已匯入修改：${describeChangeCounts(counts)}`);
      } catch (err) {
        showToast('JSON 格式不正確');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function clearLocalData(){
    const ok = confirm('確定清除本機新增、修改與刪除記錄？此操作不會影響原始 tags.js。');
    if (!ok) return;
    state.local = { edits: {}, custom: [], settings: {}, deleted: [], categories: { major: [], section: [] } };
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
    extraCategories(type).forEach(name => counts.set(name, 0));
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

  function addCategory(){
    const type = els.categoryType.value === 'section' ? 'section' : 'major';
    const name = (els.categoryNewName?.value || '').trim();
    if (!name) return showToast('請輸入要新增的分類名稱');
    ensureCategoryStore();
    const existing = new Set(allCategoryNames(type));
    if (existing.has(name)) return showToast('此分類已存在');
    state.local.categories[type] = unique([...(state.local.categories[type] || []), name]);
    if (type === 'major') state.major = name;
    if (type === 'section') state.section = name;
    saveLocalData();
    initFilters();
    renderEntries();
    renderSelected();
    renderCategoryEditor();
    if (els.categoryNewName) els.categoryNewName.value = '';
    showToast(`已新增分類：${name}`);
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

    ensureCategoryStore();
    const extraList = state.local.categories[type] || [];
    const extraIdx = extraList.indexOf(oldName);
    if (extraIdx >= 0) {
      state.local.categories[type][extraIdx] = newName;
      state.local.categories[type] = unique(state.local.categories[type]);
      changed += 1;
    } else if (!changed) return showToast('沒有條目使用此分類');
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
    const ok = confirm(`確定刪除「${entry.title}」？\n\n目前位於「${name}」${label}。這只會刪除這一個條目，不會刪除整個分類。`);
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
  els.addCategoryBtn?.addEventListener('click', () => { openCategoryEditor(); setTimeout(() => els.categoryNewName?.focus(), 30); });
  els.editCategoriesBtn.addEventListener('click', openCategoryEditor);
  els.deleteCategoryEntriesBtn.addEventListener('click', openCategoryEditor);
  els.categoryType.addEventListener('change', renderCategoryEditor);
  els.categoryFrom.addEventListener('change', () => { els.categoryTo.value = els.categoryFrom.value; renderCategoryEntryChoices(); });
  els.categoryForm.addEventListener('submit', e => { e.preventDefault(); applyCategoryRename(); });
  els.addCategoryConfirm?.addEventListener('click', addCategory);
  els.deleteCategoryEntries.addEventListener('click', deleteSelectedEntryInCategory);
  els.closeCategoryDialog.addEventListener('click', () => els.categoryDialog.close());
  els.cancelCategoryBtn.addEventListener('click', () => els.categoryDialog.close());
  els.closeEntryDialog.addEventListener('click', () => els.entryDialog.close());
  els.cancelEntryBtn.addEventListener('click', () => els.entryDialog.close());
  els.entryForm.addEventListener('submit', e => { e.preventDefault(); saveEntry(collectEntryFromForm()); });
  els.resetEntryBtn.addEventListener('click', resetEntryToOriginal);
  els.exportDataBtn.addEventListener('click', exportLocalData);
  if (els.importDataInput) {
    els.importDataInput.addEventListener('change', e => { importLocalData(e.target.files[0]); e.target.value = ''; });
  }
  
  els.saveGithubConfigBtn?.addEventListener('click', () => saveGithubConfig(true));
  els.loadGithubBtn?.addEventListener('click', loadChangesFromGithub);
  els.saveGithubBtn?.addEventListener('click', saveChangesToGithub);

  loadLocalData();
  renderGithubConfig();
  applyOutputFontSize(state.outputFontSize, false);
  hydrateData();
  initFilters();
  renderEntries();
  renderSelected();
  autoLoadSharedChanges();
})();
