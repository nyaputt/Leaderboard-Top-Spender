/* =========================================================
   KLAMBY TOP SPENDER — APP
   Reads a Google Sheet (CSV), ranks customers, renders the
   hero, podium and list, and animates changes.
   You normally do not need to edit this file: see config.js.
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.LEADERBOARD_CONFIG || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var state = {
    rows: [],            // ranked rows from last successful load
    prevRanks: null,     // Map key -> rank from previous load
    moves: {},           // key -> {dir, until}
    filter: "all",
    query: "",
    loading: false,
    lastOk: null,
    timer: null,
    isDemo: false,
    openKey: null,
    first: true
  };

  var money = new Intl.NumberFormat(CFG.locale || "id-ID", {
    style: "currency", currency: CFG.currency || "IDR", maximumFractionDigits: 0
  });
  var timeFmt = new Intl.DateTimeFormat(CFG.locale || "id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  var dateFmt = new Intl.DateTimeFormat(CFG.locale || "id-ID", { day: "numeric", month: "short", year: "numeric" });

  /* ---------------- Brand text & assets ---------------- */
  function applyBrand() {
    $$("[data-text]").forEach(function (el) {
      var v = CFG[el.getAttribute("data-text")];
      if (typeof v === "string") el.textContent = v;
    });
    document.title = (CFG.brandName || "KLAMBY") + " " + (CFG.campaignTitle || "Top Spender");
    var assets = CFG.assets || {};
    $$("img[data-asset]").forEach(function (img) {
      var src = assets[img.getAttribute("data-asset")];
      img.classList.add("is-missing");
      if (!src) return;
      img.onload = function () { img.classList.remove("is-missing"); };
      img.onerror = function () { img.classList.add("is-missing"); };
      img.src = src;
    });
  }

  /* ---------------- Sheet URL helpers ---------------- */
  function toCsvUrl(url) {
    url = (url || "").trim();
    if (!url) return "";
    if (/output=csv|tqx=out:csv|format=csv/.test(url)) return url;
    // Published link without output=csv  (.../pubhtml or .../pub)
    if (/\/spreadsheets\/d\/e\//.test(url)) {
      var base = url.replace(/\/pubhtml.*$/, "/pub").replace(/\/pub\?.*$/, "/pub");
      var gidP = (url.match(/gid=(\d+)/) || [])[1];
      return base + "?output=csv" + (gidP ? "&gid=" + gidP + "&single=true" : "");
    }
    // Normal share/edit link
    var id = (url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || [])[1];
    if (id) {
      var gid = (url.match(/gid=(\d+)/) || [])[1] || "0";
      return "https://docs.google.com/spreadsheets/d/" + id + "/gviz/tq?tqx=out:csv&gid=" + gid;
    }
    return url; // any other CSV URL
  }

  function bust(url) {
    return url + (url.indexOf("?") > -1 ? "&" : "?") + "_cb=" + Date.now();
  }

  /* ---------------- CSV parsing ---------------- */
  function parseCSV(text) {
    var rows = [], row = [], field = "", i = 0, q = false, c;
    text = text.replace(/^﻿/, "");
    while (i < text.length) {
      c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
        } else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
      i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return v.trim() !== ""; }); });
  }

  // Accepts 12500000, "Rp 12.500.000", "12,500,000", "12.500.000,50", "IDR 12.5jt"? (plain numbers only)
  function parseMoney(v) {
    if (typeof v === "number") return v;
    var s = String(v || "").replace(/[^\d.,-]/g, "");
    if (!s) return NaN;
    var lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
    if (lastDot > -1 && lastComma > -1) {
      var dec = lastDot > lastComma ? "." : ",";
      var thou = dec === "." ? "," : ".";
      s = s.split(thou).join("").replace(dec, ".");
    } else if (lastDot > -1 || lastComma > -1) {
      var sep = lastDot > -1 ? "." : ",";
      var parts = s.split(sep);
      // "12.500.000" or "12,500" -> thousands; "125.5" -> decimal
      if (parts.length > 2 || parts[parts.length - 1].length === 3) s = parts.join("");
      else s = parts.join(".");
    }
    return parseFloat(s);
  }

  function findCol(header, names) {
    // "Total_Spending", "totalSpending" and "total spending" all match
    var norm = function (x) { return String(x).trim().replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-]+/g, " ").replace(/\s+/g, " ").toLowerCase(); };
    var h = header.map(norm);
    for (var i = 0; i < names.length; i++) {
      var idx = h.indexOf(norm(names[i]));
      if (idx > -1) return idx;
    }
    return -1;
  }

  function toRanked(table) {
    if (!table.length) return [];
    var cols = CFG.columns || {};
    var header = table[0];
    var iName = findCol(header, cols.name || ["name"]);
    var iSpend = findCol(header, cols.spending || ["total spending"]);
    var iId = findCol(header, cols.id || ["id"]);
    if (iName < 0 || iSpend < 0) {
      // No recognisable header: assume columns are [Name, Spending] or [Rank, Name, Spending]
      var n = header.length;
      var firstIsData = !isNaN(parseMoney(header[n - 1]));
      if (!firstIsData) table = table.slice(1);
      iName = n >= 3 ? 1 : 0; iSpend = n - 1;
    } else {
      table = table.slice(1);
    }
    var list = table.map(function (r) {
      var name = (r[iName] || "").trim();
      var id = iId > -1 ? (r[iId] || "").trim() : "";
      return { name: name, amount: parseMoney(r[iSpend]), key: (id || name).toLowerCase() };
    }).filter(function (r) { return r.name && isFinite(r.amount); });

    // Merge duplicate customers (same key) by summing
    var map = {};
    list.forEach(function (r) {
      if (map[r.key]) map[r.key].amount += r.amount;
      else map[r.key] = r;
    });
    list = Object.keys(map).map(function (k) { return map[k]; });

    list.sort(function (a, b) { return b.amount - a.amount || a.name.localeCompare(b.name); });
    list = list.slice(0, CFG.maxRows || 100);
    list.forEach(function (r, i) { r.rank = i + 1; });
    return list;
  }

  function displayName(name) {
    if (!CFG.maskNames) return name;
    return name.split(/\s+/).map(function (w) {
      return w.length <= 2 ? w : w.slice(0, 2) + "*".repeat(w.length - 2);
    }).join(" ");
  }

  /* ---------------- Loading ---------------- */
  function setStatus(kind, label) {
    var el = $("#refresh");
    el.classList.remove("is-loading", "is-error", "is-demo");
    if (kind) el.classList.add("is-" + kind);
    $("#refreshLabel").textContent = label;
  }

  /* ---------------- Apps Script support ----------------
     Turns whatever the web app returns into a table (array of rows,
     first row = headers) so the same ranking code can be used.
     Accepts: [{...}, ...] · [[header...], [row...]] · {data|rows|values|items: ...} · CSV text */
  function jsonToTable(json) {
    if (json && !Array.isArray(json)) {
      json = json.data || json.rows || json.values || json.items || json.result || json.leaderboard || [];
    }
    if (!Array.isArray(json) || !json.length) return [];
    if (Array.isArray(json[0])) return json.map(function (r) { return r.map(function (v) { return v == null ? "" : String(v); }); });
    var headers = [];
    json.forEach(function (o) { Object.keys(o || {}).forEach(function (k) { if (headers.indexOf(k) < 0) headers.push(k); }); });
    return [headers].concat(json.map(function (o) {
      return headers.map(function (h) { return o[h] == null ? "" : String(o[h]); });
    }));
  }

  function textToTable(text) {
    var t = text.trim();
    if (/^<(!doctype|html)/i.test(t)) throw new Error("Got a web page, not data. Check the sheet / web app is shared with Anyone.");
    if (t.charAt(0) === "[" || t.charAt(0) === "{") return jsonToTable(JSON.parse(t));
    return parseCSV(text);
  }

  // JSONP fallback, for older Apps Script code that only supports ?callback=
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var cb = "__lb_cb_" + Date.now();
      var s = document.createElement("script");
      var timer = setTimeout(function () { done(); reject(new Error("Apps Script did not answer")); }, 15000);
      function done() { clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (data) { done(); resolve(jsonToTable(data)); };
      s.onerror = function () { done(); reject(new Error("Couldn't reach the Apps Script web app")); };
      s.src = url + (url.indexOf("?") > -1 ? "&" : "?") + "callback=" + cb + "&_cb=" + Date.now();
      document.head.appendChild(s);
    });
  }

  function fetchTable(url) {
    return fetch(bust(url), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(textToTable);
  }

  function load(manual) {
    if (state.loading) return;
    state.loading = true;
    var apps = (CFG.appsScriptUrl || "").trim();
    var url = apps || toCsvUrl(CFG.sheetUrl);
    state.isDemo = !url;
    if (!url) url = "sample-data.csv";
    setStatus("loading", "Updating…");
    $("#btnRefresh").classList.add("is-spinning");

    var job = apps
      ? fetchTable(apps).catch(function (err) { console.warn("[Leaderboard] fetch failed, trying JSONP", err); return jsonp(apps); })
      : fetchTable(url);

    job
      .then(function (table) {
        var ranked = toRanked(table);
        if (!ranked.length) throw new Error("No rows found. Check the column names.");
        update(ranked);
        state.lastOk = new Date();
        $("#demoBanner").hidden = !state.isDemo;
        setStatus(state.isDemo ? "demo" : null, state.isDemo ? "Demo data" : "Live");
        $("#lastUpdated").textContent = "Updated " + timeFmt.format(state.lastOk);
        if (manual) toast("Leaderboard refreshed");
      })
      .catch(function (err) {
        console.warn("[Leaderboard]", err);
        setStatus("error", state.lastOk ? "Offline · " + timeFmt.format(state.lastOk) : "Can't reach data");
        if (manual || !state.lastOk) toast("Couldn't load the data: " + err.message);
      })
      .then(function () {
        state.loading = false;
        $("#btnRefresh").classList.remove("is-spinning");
      });
  }

  function schedule() {
    clearInterval(state.timer);
    var sec = Math.max(10, CFG.refreshSeconds || 30);
    state.timer = setInterval(function () { if (!document.hidden) load(false); }, sec * 1000);
  }

  /* ---------------- Update & diff ---------------- */
  function update(ranked) {
    var prev = state.prevRanks;
    var now = Date.now();
    var enteredTop3 = [];
    var newRanks = {};
    ranked.forEach(function (r) {
      newRanks[r.key] = r.rank;
      if (prev) {
        var old = prev[r.key];
        if (old && old !== r.rank) state.moves[r.key] = { dir: r.rank < old ? "up" : "down", until: now + 60000 };
        if (r.rank <= 3 && (!old || old > 3)) enteredTop3.push(r);
      }
    });
    var oldAmounts = {};
    state.rows.forEach(function (r) { oldAmounts[r.key] = r.amount; });

    state.rows = ranked;
    state.prevRanks = newRanks;

    renderHero();
    renderPodium(enteredTop3);
    renderList(state.first ? null : oldAmounts, prev);
    state.first = false;

    enteredTop3.forEach(function (r, i) {
      setTimeout(function () { toast(displayName(r.name) + " is now Top 3"); }, i * 2600);
    });
  }

  /* ---------------- Rendering ---------------- */
  function renderHero() {
    var top = state.rows[0];
    if (!top) return;
    var hero = $(".hero");
    var nameEl = $("#heroName");
    var swap = function () {
      revealText(nameEl, displayName(top.name), 0);
      odo($("#heroAmount"), top.amount);
    };
    if (state.first) {
      setTimeout(swap, 500);
      setTimeout(function () { burst($(".prize"), 22); }, 1700);
    } else if (nameEl.dataset.key !== top.key) {
      // New #1: a curtain sweeps across, the name swaps while covered, then icons pop
      hero.classList.remove("is-takeover"); void hero.offsetWidth; hero.classList.add("is-takeover");
      setTimeout(swap, 600);
      setTimeout(function () { burst(hero, 26); }, 900);
      setTimeout(function () { hero.classList.remove("is-takeover"); }, 1400);
    } else {
      odo($("#heroAmount"), top.amount);
    }
    nameEl.dataset.key = top.key;
  }

  function renderPodium(entered) {
    var enteredKeys = entered.map(function (r) { return r.key; });
    [2, 3].forEach(function (rank) {
      var card = $('.podium__card[data-rank="' + rank + '"]');
      var r = state.rows[rank - 1];
      var nameEl = $(".podium__name", card);
      card.classList.toggle("is-dim", !r);
      if (!r) { nameEl.textContent = "—"; $(".podium__amount", card).textContent = "—"; return; }
      if (nameEl.dataset.key !== r.key) {
        revealText(nameEl, displayName(r.name), state.first ? 900 + rank * 150 : 0);
        nameEl.dataset.key = r.key;
      }
      odo($(".podium__amount", card), r.amount);
      if (enteredKeys.indexOf(r.key) > -1) {
        card.classList.remove("is-spotlight"); void card.offsetWidth; card.classList.add("is-spotlight");
        setTimeout(function () { burst(card, 16); }, 300);
      }
    });
    if (enteredKeys.indexOf(state.rows[0] && state.rows[0].key) > -1) {
      setTimeout(function () { burst($(".hero"), 16); }, 300);
    }
  }

  /* Split text into letters that rise in one by one */
  function revealText(el, text, delay) {
    var k = 0;
    el.setAttribute("aria-label", text);
    el.innerHTML = text.split(" ").map(function (w) {
      return '<span class="w" aria-hidden="true">' + w.split("").map(function (c) {
        return '<span class="ch" style="animation-delay:' + ((delay || 0) + k++ * 28) + 'ms">' + esc(c) + "</span>";
      }).join("") + "</span>";
    }).join(" ");
  }

  /* Rolling-digit number: every digit spins to its new value */
  function odo(el, value) {
    var str = money.format(value);
    var mask = str.replace(/\d/g, "d");
    if (el._mask !== mask) {
      el._mask = mask;
      el.innerHTML = str.split("").map(function (c, i) {
        if (!/\d/.test(c)) return '<span class="odo__s" aria-hidden="true">' + (/\s/.test(c) ? "&nbsp;" : esc(c)) + "</span>";
        var col = "";
        for (var n = 0; n < 10; n++) col += "<span>" + n + "</span>";
        return '<span class="odo__d" aria-hidden="true"><span class="odo__col" style="transition-delay:' + (i * 45) + 'ms">' + col + "</span></span>";
      }).join("");
      void el.offsetWidth; // start at 0, then roll
    }
    el.setAttribute("aria-label", str);
    var digits = str.replace(/\D/g, "").split("");
    $$(".odo__col", el).forEach(function (col, i) {
      col.style.transform = "translateY(-" + (+digits[i] * 10) + "%)";
    });
  }

  function visibleRows() {
    var q = state.query.trim().toLowerCase();
    var lim = state.filter === "all" ? Infinity : parseInt(state.filter, 10);
    return state.rows.filter(function (r) {
      return r.rank <= lim && (!q || displayName(r.name).toLowerCase().indexOf(q) > -1);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function highlight(name) {
    var q = state.query.trim();
    var safe = esc(name);
    if (!q) return safe;
    var i = name.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return safe;
    return esc(name.slice(0, i)) + "<mark>" + esc(name.slice(i, i + q.length)) + "</mark>" + esc(name.slice(i + q.length));
  }

  /* One short line shown when a row is tapped */
  function detailText(r) {
    var rows = state.rows, min = CFG.minSpend || 0;
    var parts = [];
    if (r.rank === 1) parts.push(rows[1] ? "Leading by " + money.format(r.amount - rows[1].amount) : "Leading");
    else if (r.rank <= 3) parts.push(money.format(rows[r.rank - 2].amount - r.amount) + " to #" + (r.rank - 1));
    else if (rows[2]) parts.push(money.format(rows[2].amount - r.amount) + " to Top 3");
    if (min && r.amount < min) parts.push(money.format(min - r.amount) + " to min. spend");
    return parts.join(" · ");
  }

  function renderList(oldAmounts, prev) {
    var list = $("#boardList");
    var rows = visibleRows();
    var now = Date.now();

    // FLIP: remember where rows were
    var before = {};
    var existing = {};
    $$(".row", list).forEach(function (li) {
      before[li.dataset.key] = li.getBoundingClientRect().top;
      existing[li.dataset.key] = li;
    });

    var frag = document.createDocumentFragment();
    rows.forEach(function (r, i) {
      var li = existing[r.key];
      var isNew = !li;
      if (!li) {
        li = document.createElement("li");
        li.dataset.key = r.key;
        li.innerHTML = '<span class="row__rank"></span><span class="row__name"></span><span class="row__amount"></span><span class="row__detail"><span></span></span>';
      }
      delete existing[r.key];
      li.className = "row" + (r.rank <= 3 ? " row--top" : "");
      if (!oldAmounts) { li.classList.add("is-enter"); li.style.animationDelay = (Math.min(i, 14) * 45 + (prev ? 0 : 600)) + "ms"; }
      else { li.style.animationDelay = ""; if (isNew) li.classList.add("is-new"); }
      if (state.openKey === r.key) li.classList.add("is-open");

      var mv = state.moves[r.key];
      var moveHtml = "";
      if (mv && mv.until > now) moveHtml = '<span class="row__move row__move--' + mv.dir + '" aria-label="moved ' + mv.dir + '">' + (mv.dir === "up" ? "▲" : "▼") + "</span>";
      $(".row__rank", li).innerHTML = String(r.rank).padStart(2, "0") + moveHtml;
      $(".row__name", li).innerHTML = highlight(displayName(r.name));
      $(".row__name", li).title = displayName(r.name);
      $(".row__detail > span", li).textContent = detailText(r);
      var amt = $(".row__amount", li);
      if (oldAmounts && oldAmounts[r.key] !== undefined && oldAmounts[r.key] !== r.amount) {
        countUp(amt, oldAmounts[r.key], r.amount);
        if (!isNew) { li.classList.remove("is-flash"); void li.offsetWidth; li.classList.add("is-flash"); }
      } else {
        amt.textContent = money.format(r.amount);
      }
      frag.appendChild(li);
    });
    Object.keys(existing).forEach(function (k) { list.removeChild(existing[k]); });
    list.appendChild(frag);
    $("#boardEmpty").hidden = rows.length > 0;

    // FLIP: slide rows from their old place to the new one
    $$(".row", list).forEach(function (li) {
      var old = before[li.dataset.key];
      if (old === undefined || !li.animate) return;
      var dy = old - li.getBoundingClientRect().top;
      if (!dy) return;
      li.animate([{ transform: "translateY(" + dy + "px)" }, { transform: "translateY(0)" }],
        { duration: 750, easing: "cubic-bezier(.22,.8,.24,1)" });
    });
  }

  function countUp(el, from, to) {
    if (!isFinite(from) || from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = money.format(to); return;
    }
    var start = performance.now(), dur = 1100;
    var id = (el._cu = (el._cu || 0) + 1);
    (function step(t) {
      if (el._cu !== id) return;
      var p = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = money.format(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  /* Celebration: the five brand icons pop out of an element */
  function burst(el, count) {
    var src = (CFG.assets || {}).icons;
    if (!src || !el || !el.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var layer = $("#burstLayer"), r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2 - 19, cy = r.top + r.height / 2 - 19;
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.className = "ico";
      s.style.backgroundImage = 'url("' + src + '")';
      s.style.backgroundPosition = (i % 5) * 25 + "% 0";
      layer.appendChild(s);
      var ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * Math.max(140, r.width * .45);
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * .7 - 70;
      var rot = (Math.random() - .5) * 540, sc = .6 + Math.random() * .6;
      var anim = s.animate([
        { transform: "translate(" + cx + "px," + cy + "px) scale(.2) rotate(0deg)", opacity: 0 },
        { offset: .12, opacity: 1 },
        { offset: .45, transform: "translate(" + (cx + dx * .8) + "px," + (cy + dy) + "px) scale(" + sc + ") rotate(" + rot / 2 + "deg)", opacity: 1 },
        { transform: "translate(" + (cx + dx) + "px," + (cy + dy + 240) + "px) scale(" + sc * .8 + ") rotate(" + rot + "deg)", opacity: 0 }
      ], { duration: 1700 + Math.random() * 800, easing: "cubic-bezier(.2,.7,.3,1)", delay: Math.random() * 140, fill: "both" });
      anim.onfinish = (function (n) { return function () { if (n.parentNode) n.parentNode.removeChild(n); }; })(s);
    }
  }

  /* Gentle 3D tilt that follows the pointer */
  function tilt(area, target, max, base) {
    if (!area || !matchMedia("(hover: hover)").matches) return;
    area.addEventListener("pointermove", function (e) {
      var r = area.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      target.style.transform = (base || "") + " rotateY(" + (x * max) + "deg) rotateX(" + (-y * max) + "deg)";
    });
    area.addEventListener("pointerleave", function () { target.style.transform = ""; });
  }

  function buildMarquee() {
    var src = (CFG.assets || {}).icons, track = $("#marquee");
    if (!src || !track) return;
    var one = "";
    for (var i = 0; i < 20; i++) one += '<span class="ico" style="background-image:url(&quot;' + esc(src) + '&quot;);background-position:' + (i % 5) * 25 + '% 0"></span>';
    track.innerHTML = one + one; // doubled for a seamless loop
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, 2600);
  }

  /* ---------------- Modes ---------------- */
  var urlMode = new URLSearchParams(location.search).get("mode");

  function setPresent(on) {
    document.body.classList.toggle("is-present", on);
    if (on) { state.query = ""; $("#search").value = ""; setFilter("all"); }
    autoScroll.reset();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    var el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
  }

  document.addEventListener("fullscreenchange", function () {
    if (document.fullscreenElement) setPresent(true);
    else if (urlMode !== "present") setPresent(false);
  });

  function setFilter(f) {
    state.filter = f;
    $$(".filter__btn").forEach(function (b) {
      var on = b.dataset.filter === f;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    if (state.rows.length) renderList(null, true);
  }

  /* Slow auto-scroll of the list in presentation mode */
  var autoScroll = (function () {
    var vp, y = 0, pauseUntil = 0, dir = 1, last = 0, raf;
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (!document.body.classList.contains("is-present") || CFG.autoScrollInPresentation === false) { last = t; return; }
      vp = vp || $("#boardViewport");
      var max = vp.scrollHeight - vp.clientHeight;
      if (max <= 2) { last = t; return; }
      var dt = last ? Math.min(64, t - last) : 16; last = t;
      if (t < pauseUntil) return;
      if (dir === 1) {
        y += dt * 0.03;
        if (y >= max) { y = max; pauseUntil = t + 4000; dir = -1; }
      } else {
        y -= dt * 0.6;
        if (y <= 0) { y = 0; pauseUntil = t + 5000; dir = 1; }
      }
      vp.scrollTop = y;
    }
    return {
      start: function () { if (!raf) raf = requestAnimationFrame(tick); },
      reset: function () { y = 0; dir = 1; pauseUntil = performance.now() + 4000; var v = $("#boardViewport"); if (v) v.scrollTop = 0; }
    };
  })();

  /* ---------------- Events ---------------- */
  function bind() {
    var debounce;
    $("#search").addEventListener("input", function (e) {
      clearTimeout(debounce);
      debounce = setTimeout(function () { state.query = e.target.value; renderList(null, true); }, 120);
    });
    $$(".filter__btn").forEach(function (b) {
      b.addEventListener("click", function () { setFilter(b.dataset.filter); });
    });
    $("#btnRefresh").addEventListener("click", function () { load(true); });
    $("#btnPresent").addEventListener("click", function () { setPresent(!document.body.classList.contains("is-present")); });
    $("#btnFullscreen").addEventListener("click", toggleFullscreen);
    $("#boardList").addEventListener("click", function (e) {
      if (document.body.classList.contains("is-present")) return;
      var li = e.target.closest(".row");
      if (!li) return;
      var open = !li.classList.contains("is-open");
      $$(".row.is-open").forEach(function (x) { x.classList.remove("is-open"); });
      li.classList.toggle("is-open", open);
      state.openKey = open ? li.dataset.key : null;
    });
    $(".prize").addEventListener("click", function () { burst($(".prize"), 18); });
    tilt($("#prizeStage"), $("#prize"), 16);
    $$(".podium__card").forEach(function (c) { tilt(c, c, 10, "perspective(800px)"); });

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (k === "f") toggleFullscreen();
      else if (k === "p") setPresent(!document.body.classList.contains("is-present"));
      else if (k === "r") load(true);
      else if (k === "escape" && document.body.classList.contains("is-present") && !document.fullscreenElement) setPresent(false);
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && state.lastOk && Date.now() - state.lastOk > (CFG.refreshSeconds || 30) * 1000) load(false);
    });
  }

  /* ---------------- Start ---------------- */
  applyBrand();
  revealText($(".headline"), $(".headline").textContent, 100);
  buildMarquee();
  bind();
  if (urlMode === "present") setPresent(true);
  autoScroll.start();
  load(false);
  schedule();
})();
