# NovelAI Prompt Tag Dictionary

靜態版 NovelAI Prompt Tag 字典網站，可直接部署到 GitHub Pages。

## 檔案

- `index.html`：網站入口
- `styles.css`：UI 樣式
- `app.js`：搜尋、輸出、手動修改輸出格、輸出格放大/縮小、文字大小調整、複製、字典新增/修改、分類名稱修改與單一條目刪除功能
- `tags.js`：由 PDF 解析出的字典資料
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

網站已加入兩種管理功能：

- `增加字典條目`：新增自訂條目。
- 卡片上的 `修改` 或詳情視窗的 `修改條目`：修改現有條目。
- `修改分類名稱`：批量重新命名主分類或子分類，會套用到所有使用該分類的條目。
- `刪除條目` / 編輯分類視窗中的 `刪除所選條目`：先選主分類或子分類，再從該分類中選擇一個條目刪除；不會一次刪除整個分類。

新增、修改、分類重新命名與單一條目刪除記錄會儲存在目前瀏覽器的 `localStorage`，因此可在 GitHub Pages 靜態網站上正常使用，但只會影響目前瀏覽器。若想讓所有訪客都看到同一份修改，請使用 `匯出修改`，再把匯出的 JSON 內容整合到 `tags.js` 或另外提交到 repository。

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
