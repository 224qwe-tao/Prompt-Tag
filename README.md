# NovelAI Prompt Tag Dictionary

靜態版 NovelAI Prompt Tag 字典網站，可直接部署到 GitHub Pages。

## 檔案

- `index.html`：網站入口
- `styles.css`：UI 樣式
- `app.js`：搜尋、輸出、手動修改輸出格、輸出格放大/縮小、文字大小調整、複製、字典新增/修改、分類新增、分類名稱修改、單一條目刪除、GitHub 保存功能
- `tags.js`：由 PDF 解析出的字典資料
- `dictionary-changes.json`：跨設備同步用的修改資料檔；GitHub 保存會更新此檔案
- `.nojekyll`：讓 GitHub Pages 直接提供靜態檔案

## 使用方式

1. 直接開啟 `index.html`。
2. 搜尋或篩選條目。
3. 點擊卡片上的「添加」把主要 Tag 加入輸出。
4. 輸出格可直接手動修改；按 `Output` 會重新根據已選 Tag 產生 Prompt。
5. 使用輸出標題旁的 `⛶` 可將輸出格放大為彈出編輯視窗，紅色縮小按鈕可回到右側面板；`A− / 100% / A+` 可調整輸出格文字大小。
6. 在右側 `Custom Settings` 調整輸出處理。
7. 點擊 `Output` 或 `複製 Prompt`。

## 新增與修改字典條目

網站已加入以下管理功能：

- `增加字典條目`：新增自訂條目。
- 卡片上的 `修改` 或詳情視窗的 `修改條目`：修改現有條目。
- `添加分類`：新增主分類或子分類，即使暫時沒有條目也會顯示於篩選與分類列表。
- `修改分類名稱`：批量重新命名主分類或子分類，會套用到所有使用該分類的條目；空分類也可以重新命名。
- `刪除條目` / 編輯分類視窗中的 `刪除所選條目`：先選主分類或子分類，再從該分類中選擇一個條目刪除；不會一次刪除整個分類。

新增、修改、添加分類、分類重新命名與單一條目刪除記錄會先儲存在目前瀏覽器的 `localStorage`，因此可在 GitHub Pages 靜態網站上正常使用。

## GitHub 保存與跨設備同步

此版本新增 `GitHub 保存` 面板，可把目前瀏覽器的修改保存到 repository 內的 `dictionary-changes.json`。其他設備打開網站時，網站會自動讀取此檔案並套用修改。

### 第一次設定

1. 把網站檔案上傳到 GitHub repository，並啟用 GitHub Pages。
2. 建立 GitHub fine-grained token：
   - Repository access：選擇這個網站所在的 repository
   - Permissions → Repository permissions → Contents：選擇 `Read and write`
3. 回到網站右側 `GitHub 保存`：
   - `Repository`：輸入 `username/repository`
   - `Branch`：通常是 `main`
   - `保存檔案路徑`：保持 `dictionary-changes.json`
   - `Fine-grained token`：貼上 token
4. 按 `儲存設定`。
5. 修改或新增條目後，按 `保存到 GitHub`。
6. 等待 GitHub Pages 部署完成後，其他設備重新打開網站即可看到相同修改。

### 注意

- Token 不會寫入 `dictionary-changes.json`，只會留在目前瀏覽器；只有勾選「在本機記住 Token」時才會保存到目前瀏覽器的 `localStorage`。
- 不建議把 token 直接寫入任何網站檔案或 commit 到 GitHub。
- 若網站是公開 GitHub Pages，其他人也能讀取 `dictionary-changes.json` 內的修改內容，但看不到你的 token。
- GitHub Pages 更新通常需要等待一小段時間，保存後未立即顯示時請稍後重新整理。
- `匯出修改` 仍可手動下載 `dictionary-changes.json` 作備份。

## GitHub Pages 部署

1. 建立一個新的 GitHub repository。
2. 將 ZIP 內全部檔案解壓到 repository 根目錄。
3. Commit 並 push 到 GitHub。
4. 到 `Settings` → `Pages`。
5. 在 `Build and deployment` 選擇 `Deploy from a branch`。
6. Branch 選擇 `main`，資料夾選擇 `/root`。
7. 儲存後等待 GitHub Pages 完成部署。

## 備註

PDF 原圖沒有導入，網站只使用解析出的文字型 Prompt Tag 條目。預設排除的高風險條目沒有放入 `tags.js`。
