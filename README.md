# NovelAI Prompt Tag 字典網站

這是根據使用者提供的 PDF 文字內容自動整理的本機靜態網站。UI 參考 `https://nyk-sm.com/aegigoe/` 的雙欄、膠囊按鈕與右側設定面板。

## 使用方法

1. 解壓縮 ZIP。
2. 直接用瀏覽器開啟 `index.html`。
3. 可搜尋、按分類篩選、查看條目、加入 Prompt、複製輸出。

## GitHub Pages 上傳方法

1. 建立一個新的 GitHub repository。
2. 將 `index.html`、`styles.css`、`app.js`、`tags.js`、`README.md`、`.nojekyll` 放在 repository 根目錄。
3. 到 repository 的 **Settings → Pages**，Source 選擇 **Deploy from a branch**，Branch 選擇 `main` / `/root`。
4. 儲存後等待 GitHub Pages 完成部署。

## 整理結果

- PDF 解析條目：287
- 網站收錄條目：258
- 預設排除高風險條目：29
- PDF 原圖：未導入

## 檔案

- `index.html`：主頁面
- `styles.css`：模仿截圖風格的 UI 樣式
- `app.js`：搜尋、分類、輸出、複製等互動邏輯
- `tags.js`：由 PDF 解析並整理的資料
