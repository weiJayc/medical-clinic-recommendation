# 團隊 Git 與 Pull Request 協作流程（新手版）
> Medical Clinic Recommendation 專案適用

本文件目的：  
讓 **不熟 Git 的組員** 也能照表操作、不亂推、不炸 repo。  
請所有組員在開始寫程式前 **務必閱讀一次**。

---

## 0️⃣ 核心原則（一定要遵守）

1. **禁止直接修改 `main` 分支**
   - `main`：穩定版本（Demo / 報告 / 交作業）
   - 所有開發都先進 `dev`

2. **每個人只在自己的 `feature/*` 分支工作**
3. **所有程式碼合併都必須透過 Pull Request（PR）**
4. **遇到問題先停下來**
   - 貼 `git status` 與錯誤訊息到群組
   - 不要自己亂試一堆指令

---

## 1️⃣ 分支規則（Branch Strategy）

| 分支 | 用途 |
|---|---|
| main | 穩定版、最終展示 |
| dev | 整合分支（大家的 PR 都合到這） |
| feature/姓名-功能 | 個人功能分支 |

範例：
- `feature/jay-map-ui`
- `feature/anna-nlp-mapping`
- `feature/kevin-api-nearby`

---

## 2️⃣ 組員第一次加入專案要做的事

### 2.1 安裝並設定 Git（只做一次）
```bash
git --version
git config --global user.name "你的名字"
git config --global user.email "你的email"
```

---

### 2.2 Clone 專案（只做一次）
```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>
```

---

### 2.3 切到 dev 並同步最新進度（每次開始前都要）
```bash
git checkout dev
git pull
```

---

## 3️⃣ 每次開始寫程式的標準流程（所有人都一樣）

### Step A：確認 dev 是最新的
```bash
git checkout dev
git pull
```

---

### Step B：從 dev 開自己的功能分支
```bash
git checkout -b feature/<你的名字>-<任務>
```

---

### Step C：寫程式並 commit
```bash
git add .
git commit -m "feat: 說明你做了什麼"
```

Commit 訊息建議格式：
- `feat:` 新功能
- `fix:` 修 bug
- `docs:` 文件
- `chore:` 設定、整理

---

### Step D：推到 GitHub
```bash
git push -u origin feature/<你的名字>-<任務>
```

---

### Step E：在 GitHub 發起 Pull Request
- base：`dev`
- compare：你的 `feature/*` 分支

---

## 4️⃣ Pull Request（PR）流程說明

### 4.1 發起 PR 的人（Author）要做什麼

PR 描述請包含以下內容：

**① 做了什麼**
- 實作了哪個功能？

**② 怎麼測試**
- 如何確認這個功能正常？

**③ 影響範圍**
- 是否影響 API / DB / 其他模組？

**④ 備註**
- TODO、已知問題

#### Author 合併前自我檢查
- [ ] 沒有改 `main`
- [ ] 從最新 `dev` 開分支
- [ ] 只改到自己負責的資料夾
- [ ] 本地可以跑，不會直接報錯
- [ ] 沒有上傳 `.env`、API key、大型檔案

---

### 4.2 Review PR 的人（Reviewer）要做什麼

Reviewer 只需要確認三件事：

1. **改的東西合不合理**
2. **有沒有改到不該動的地方**
3. **功能是否符合 core_web_function.md**

#### Reviewer 檢查清單
- [ ] PR 是合到 `dev`
- [ ] 功能沒有超出專案範圍
- [ ] 沒有敏感資料或大型資料檔

---

### 4.3 如何合併 PR

- 原則上由隊長或指定整合者合併
- 建議使用 **Squash and Merge**
- 合併後，所有人請更新本地 `dev`：

```bash
git checkout dev
git pull
```

---

## 5️⃣ 發生衝突（Conflict）怎麼辦？

### PR 顯示有衝突時（Author 處理）

```bash
git checkout dev
git pull
git checkout feature/<你的分支>
git rebase dev
```

若出現衝突：
1. 用 VS Code 打開衝突檔案
2. 選擇正確版本（Accept Current / Incoming）
3. 解完後：
```bash
git add <檔案>
git rebase --continue
```

最後推上去：
```bash
git push --force-with-lease
```

⚠️ 不確定就貼畫面問隊長

---

## 6️⃣ 依任務類型的協作說明

### A) 前端（frontend/）
- UI、地圖、互動功能
- PR 請附操作流程或截圖

---

### B) 後端（backend/）
- API、查詢邏輯
- 若改 API 回傳格式，PR 必須說明

---

### C) NLP（nlp/）
- 症狀 → 科別 mapping
- PR 請附測試案例（輸入 → 預期結果）

---

### D) Database / GIS（database/）
⚠️ **避免上傳大型 CSV**
- repo 放 schema、script、小 sample
- 完整資料用雲端連結

---

### E) 文件（docs/）
- 規格、說明文件
- 修改 scope 前需先討論

---

## 7️⃣ 新手最常犯的錯誤（請避免）
- ❌ 直接 commit 到 `main`
- ❌ 沒 `git pull` 就開始寫
- ❌ 把 `.env`、金鑰推上去
- ❌ 一次 PR 改一大堆東西

---

## 8️⃣ 救命指令（出事先跑這些）
```bash
git status
git branch
git log --oneline --decorate -5
```

把結果貼群組，會比較好救。

---
End of Document
