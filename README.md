# Wardrobe Refresh Top Spender Website: Setup Guide

This guide takes you from zero to a live website, step by step. You do not need to know how to code. Plan for about 30 minutes.

**What you will do**

1. Check the images and fonts
2. Make the Google Sheet and connect it (or 2B: keep your existing Apps Script)
3. Upload the website to GitHub
4. Turn on GitHub Pages so it is live on the internet
5. (Optional) Use Netlify or Vercel instead

---

## 0. What is in the folder

```
klamby-top-spender/
├── index.html          ← the page itself (do not rename)
├── js/config.js        ← THE ONLY FILE YOU NEED TO EDIT (sheet link, campaign text)
├── js/app.js           ← the engine (no need to touch)
├── css/style.css       ← colours, fonts, layout
├── assets/             ← prize.png (treadmill) and icons.png
├── fonts/              ← put brand font files here
├── sample-data.csv     ← demo data, used until you connect your sheet
├── apps-script/Code.gs ← optional ready-made Apps Script
└── GUIDE.md            ← this guide
```

---

## 1. Images (already included)

The design follows your reference poster: the treadmill photo on flower shapes is the main visual. Three image files are used, and all of them are in the `assets` folder:

| File | What it is | Where it shows |
|---|---|---|
| `prize.png` | Bodimax Pastel Max treadmill (HD, 1232×1370) | The big main visual |
| `logo.png` | Wardrobe Refresh logo | Top left |
| `icons.png` | Row of five fashion icons | Scrolling strip at the bottom, and the little icons that pop out when someone enters the Top 3 |

The "WARDROBE REFRESH / TOP SPENDER" title, the flowers and the "For 3 Winners" badge are drawn with text and vector shapes, so they stay sharp at any screen size. The site never shows a photo bigger than its real pixel size, so nothing gets blurry.

The logo file is small (225×57 pixels), so it is shown small to stay sharp. If you have a bigger version, replace `assets/logo.png` and it will look crisper.

To change the campaign text (title, period, prize name, minimum spend, and the note at the bottom), edit `js/config.js`.

**Fonts:** put the Ambroise Francois and Kedebideri font files in the `fonts` folder with these names: `AmbroiseFrancois-Regular.otf`, `AmbroiseFrancois-Bold.otf`, `Kedebideri-Regular.otf` (.woff2, .woff or .ttf also work). Until then, the site uses similar free fonts automatically. Ambroise Francois is a paid font, so only upload it if KLAMBY has a web licence for it.

If the treadmill picture is missing, the flowers and badge still show and the rest of the site works.

---

## 2. Make and connect the Google Sheet

### 2a. Create the sheet

1. Go to [sheets.google.com](https://sheets.google.com) and click **Blank spreadsheet**.
2. Name it, for example `KLAMBY Top Spender`.
3. In **row 1**, type the column headers exactly like this:

| | A | B |
|---|---|---|
| **1** | Name | Total Spending |
| **2** | Anindya Pratiwi | 48750000 |
| **3** | Raka Mahendra | 45200000 |

Tips:
- **You do not need to sort or rank.** The website ranks customers from highest spending to lowest by itself.
- Spending can be a plain number (`48750000`) or formatted (`Rp 48.750.000`). Both work.
- Indonesian headers work too: `Nama` and `Total Belanja`.
- Optional third column `ID` (member ID or phone). Use it if two customers can have the same name. If the same name/ID appears twice, the website adds the amounts together.
- Keep the data on the **first tab**, or note which tab you use (see step 2b).

### 2b. Publish it so the website can read it

1. In the sheet, click **File → Share → Publish to web**.
2. In the first dropdown, choose the tab that has your data (for example `Sheet1`), not "Entire document".
3. In the second dropdown, choose **Comma-separated values (.csv)**.
4. Click **Publish**, then **OK**.
5. Copy the link that appears. It looks like:
   `https://docs.google.com/spreadsheets/d/e/2PACX-1vR.../pub?gid=0&single=true&output=csv`

> **Privacy:** anyone who has this link can see the names and amounts in that tab. Only put what you are happy to show on the leaderboard. Keep phone numbers, addresses and other private info in a different tab or a different file. If you want to hide part of each name, set `maskNames: true` in `config.js` ("Anindya Pratiwi" shows as "An***** Pr*****").

> **Update speed:** Google refreshes a published CSV roughly every 5 minutes, so a change in the sheet can take up to 5 minutes to appear on the website. If you need faster updates, use the alternative below.

**Alternative (faster updates):** click **Share** (top right) → under General access choose **Anyone with the link → Viewer** → **Copy link**. Paste that normal link instead. The website converts it automatically.

### 2c. Paste the link into the website

1. Open `js/config.js` in any text editor (Notepad on Windows, TextEdit on Mac, or edit it on GitHub later, see step 3d).
2. Find this line:
   ```js
   sheetUrl: "",
   ```
3. Paste your link between the quotes:
   ```js
   sheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR.../pub?gid=0&single=true&output=csv",
   ```
4. While you are there, check the campaign text:
   ```js
   campaignPeriod: "1 – 31 December 2026",
   refreshSeconds: 30,      // how often the page re-reads the sheet
   ```
5. Save the file.

> Note: double-clicking `index.html` on your computer may show "Can't reach sheet", because browsers block data loading from local files. That is normal. It works once the site is online (step 4).

---

## 2B. Sudah pakai Google Apps Script? (Ganti desain saja)

Kalau sebelumnya leaderboard kamu sudah ambil data lewat **Apps Script** dan sudah ada di GitHub, kamu **tidak perlu** bikin ulang Google Sheet atau script-nya. Cukup ganti file desainnya.

**Langkah 1: Ambil URL Apps Script yang lama**
- Buka file `config.js` / `script.js` / `index.html` lama di GitHub, cari link yang diawali `https://script.google.com/macros/s/` dan diakhiri `/exec`. Salin link itu.
- Atau buka Google Sheet → **Extensions → Apps Script → Deploy → Manage deployments**, lalu salin **Web app URL**.

**Langkah 2: Tempel ke desain baru**
Buka `js/config.js` di folder baru, lalu isi:
```js
appsScriptUrl: "https://script.google.com/macros/s/XXXX/exec",
```
`sheetUrl` boleh dibiarkan kosong. Kalau `appsScriptUrl` diisi, website pakai Apps Script.

**Langkah 3: Ganti file di repository GitHub yang lama**
1. Buka repository lama di GitHub.
2. Hapus file desain lama (misalnya `index.html`, `style.css`, `script.js`) satu per satu: buka file → ikon **⋯** atau **tempat sampah** → **Commit changes**. File lain yang tidak terkait (misalnya `CNAME` untuk custom domain) **jangan dihapus**.
3. Klik **Add file → Upload files**, lalu drag **isi** folder `klamby-top-spender` (`index.html`, `css`, `js`, `assets`, `sample-data.csv`, dll.) → **Commit changes**.
4. GitHub Pages yang sudah aktif akan update otomatis dalam 1–2 menit, dengan alamat website yang sama.

**Format data yang bisa dibaca**
Website baru otomatis mengenali hasil Apps Script dalam bentuk:
- daftar objek: `[{"Name": "Ani", "Total Spending": 90000000}, ...]`
- tabel: `[["Name", "Total Spending"], ["Ani", 90000000], ...]`
- dibungkus: `{"data": [...]}` (juga `rows`, `values`, `items`)
- teks CSV, atau JSONP (`?callback=`) untuk script lama

Nama kolom tidak harus persis: `Nama`, `Total Belanja`, `total_spending`, `totalSpending` juga dikenali. Kalau nama kolom kamu berbeda, tambahkan di `js/config.js` bagian `columns`. Ranking dihitung otomatis dari total belanja tertinggi, jadi data tidak perlu diurutkan.

**Kalau tidak muncul datanya**
- Buka URL `/exec` kamu langsung di browser. Harus muncul data (teks/JSON), bukan halaman login Google. Kalau muncul halaman login, ubah deployment: **Who has access: Anyone**.
- Setelah mengubah script, deploy ulang: **Deploy → Manage deployments → Edit (pensil) → Version: New version → Deploy**.
- Kalau script lama tetap tidak cocok, pakai script siap pakai di `apps-script/Code.gs` (cara pasangnya ada di bagian atas file itu).

---

## 3. Upload the website to GitHub

### 3a. Create a GitHub account

Go to [github.com](https://github.com) and click **Sign up** (free). Your username becomes part of the website address, for example `klamby.github.io`.

### 3b. Create a repository (a project folder on GitHub)

1. Once logged in, click the **+** at the top right → **New repository**.
2. **Repository name:** `top-spender` (any name, no spaces).
3. Choose **Public**. (GitHub Pages is free for public repositories.)
4. Leave everything else as it is and click **Create repository**.

### 3c. Upload the files

1. On the new repository page, click the link **uploading an existing file**. (If you do not see it, click **Add file → Upload files**.)
2. Open the `klamby-top-spender` folder on your computer, select **everything inside it** (`index.html`, `css`, `js`, `assets`, `fonts`, `sample-data.csv`, `GUIDE.md`, `.nojekyll`), and drag it into the browser window.
   - Important: drag the **contents** of the folder, not the folder itself. `index.html` must sit at the top level of the repository.
   - The `.nojekyll` file is hidden on Mac/Windows. It is fine if it does not get uploaded.
3. Wait until all files are listed, then click the green **Commit changes** button at the bottom.

### 3d. Changing a file later

To change the sheet link or campaign text later: open the repository on GitHub → click `js` → click `config.js` → click the **pencil icon** (Edit) → make your change → **Commit changes**. The live site updates in about 1 minute.

To add or replace an image: go into the `assets` folder on GitHub → **Add file → Upload files** → drop the file with the same name → **Commit changes**.

---

## 4. Make it live with GitHub Pages

1. In your repository, click **Settings** (top menu, gear icon).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
5. Wait 1–2 minutes, then refresh the page. A box appears at the top: **"Your site is live at https://YOUR-USERNAME.github.io/top-spender/"**.
6. Click it. You should see the leaderboard with your sheet data, and the status pill at the top right says **LIVE** with a green dot.

That is it. Every time someone edits the Google Sheet, the website picks up the change automatically.

**Custom domain (optional):** in Settings → Pages → Custom domain, type for example `topspender.klamby.id`, then add the DNS record GitHub shows you at your domain provider.

---

## 5. Using the website at the event

| What | How |
|---|---|
| **Presentation mode** (TV, LED screen) | Add `?mode=present` to the address: `https://YOUR-USERNAME.github.io/top-spender/?mode=present`. Controls are hidden, the list starts at rank 4 (the top 3 are shown in the big cards) and scrolls slowly by itself. |
| See how far someone is from the Top 3 | Tap or click a name in the list |
| Celebrate | Click the treadmill picture |
| Fullscreen | Click **Fullscreen** or press **F**. Press **Esc** to leave. |
| Toggle presentation mode | Click **Present** or press **P** |
| Refresh now | Click **Refresh** or press **R** |
| Search / filter | Type a name in the search bar; use **All / Top 10 / Top 3** |

What the audience sees when data changes:
- Rows slide smoothly to their new positions, with ▲ / ▼ arrows for one minute.
- Amounts count up to the new number.
- Big numbers roll like a counter when they change.
- When someone new takes #1, a curtain sweeps across the #1 card and the new name appears letter by letter.
- When someone enters the Top 3, their card glows, the brand icons pop out, and a message appears.

Tips for TVs: use a 16:9 screen, open the presentation link in Chrome, press F for fullscreen, and turn off the computer's sleep/screensaver.

---

## 6. Optional: Netlify or Vercel instead of GitHub Pages

Both are free for a site like this and give you an address quickly.

**Netlify (easiest, no GitHub needed)**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and sign up.
2. Drag the whole `klamby-top-spender` folder onto the page.
3. You get a live address like `random-name.netlify.app` within seconds. Rename it in **Site configuration → Change site name**.
4. To update: drag the folder again in **Deploys**.
   Or connect it to your GitHub repository (**Add new site → Import an existing project → GitHub**) so every GitHub change goes live automatically.

**Vercel**
1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New → Project**, pick the `top-spender` repository, click **Import**.
3. Framework Preset: **Other**. Leave build settings empty. Click **Deploy**.
4. You get an address like `top-spender.vercel.app`. Every GitHub change goes live automatically.

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Status says **DEMO DATA** | `sheetUrl` in `js/config.js` is still empty. Paste your link (step 2c). |
| Status says **CAN'T REACH SHEET** | Check the sheet is published (step 2b) or shared as "Anyone with the link". Open your link in a new browser tab: it should download/show plain text, not a login page. |
| "No rows found" message | Row 1 must contain headers like `Name` and `Total Spending`. If you use other words, add them in `config.js` under `columns`. |
| Sheet changed but website did not | Published CSV links update about every 5 minutes. Wait, or use the "Anyone with the link" share link instead. |
| GitHub page shows 404 | Wait 2 minutes. Check `index.html` is at the top level of the repository, not inside a folder. Check Settings → Pages shows branch `main` and `/ (root)`. |
| Treadmill picture not showing | Check the file is called exactly `prize.png` (capital letters matter on GitHub). |
| Old version still showing | Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to force-refresh. |
| Wrong currency format | Change `locale` and `currency` in `config.js` (default `id-ID` and `IDR`). |
