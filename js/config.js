/* =========================================================
   WARDROBE REFRESH · TOP SPENDER — SETTINGS
   This is the ONLY file you need to edit to connect your
   Google Sheet and change campaign text.
   ========================================================= */
window.LEADERBOARD_CONFIG = {
  /* 1) Paste your Google Sheet link between the quotes.
        Best: the "Publish to web" CSV link, which looks like
        https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv
        A normal share link (".../spreadsheets/d/XXXX/edit#gid=0") also works
        if the sheet is shared as "Anyone with the link can view".
        Leave it empty ("") to show demo data from sample-data.csv. */
  sheetUrl: "",

  /* 1b) OR: already using Google Apps Script? Paste your web app URL here
        (ends with /exec). When this is filled in, it is used instead of
        sheetUrl. See apps-script/Code.gs for a ready-made script. */
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbwRPEcszfXFfTg18oQiKXpS-CiJD73iMZ9REYY6rYJ_tEDnRC5jGMznljo96ouhZg5M/exec",

  /* 2) How often to re-read the sheet, in seconds. */
  refreshSeconds: 30,

  /* 3) Campaign text (kept short on purpose) */
  brandName: "KLAMBY",
  headline: "Wardrobe Refresh",
  campaignTitle: "Top Spender",
  prizeName: "Bodimax Treadmill",
  campaignPeriod: "13–26 November 2026",
  footerNote: "Peringkat sementara. Pemenang ditentukan berdasarkan 3 akumulasi belanja tertinggi yang mencapai minimum Rp 50.000.000 hingga akhir periode. S&K berlaku.",

  /* 4) Minimum spend to qualify (0 = no minimum). Used in the
        line that appears when you tap a name in the list. */
  minSpend: 50000000,

  /* 5) Money format */
  locale: "id-ID",
  currency: "IDR",

  /* 6) Leaderboard options */
  maxRows: 100,          // how many customers to show at most
  maskNames: false,      // true = "Anindya Pratiwi" shows as "An***** Pr******"
  autoScrollInPresentation: true,

  /* 7) Column names the site looks for in row 1 of your sheet
        (not case sensitive). Add your own header names if different. */
  columns: {
    name: ["name", "nama", "customer", "customer name", "nama customer"],
    spending: ["total spending", "spending", "total", "total belanja", "amount"],
    id: ["id", "member id", "customer id", "phone", "email"]
  },

  /* 8) Images (in the /assets folder) */
  assets: {
    logo: "assets/logo.png",     // Wardrobe Refresh logo, top left
    prize: "assets/prize.png",   // the treadmill photo, the main visual
    icons: "assets/icons.png"    // row of five fashion icons (footer + celebration)
  }
};
