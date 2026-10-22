/* Liliet Pet — site logic */
(function () {
  "use strict";

  var I18N = window.LILIET_I18N;
  var PRODUCTS = window.LILIET_PRODUCTS || [];
  var LANGS = ["fa", "en", "tr"];
  var PHONE_WA = "989364559096";
  var CATS = [
    { id: "carriers", img: "assets/img/categories/carriers.webp" },
    { id: "beds", img: "assets/img/categories/beds.webp" },
    { id: "collars", img: "assets/img/categories/collars.webp" },
    { id: "scratchers", img: "assets/img/categories/scratchers.webp" },
    { id: "litter", img: "assets/img/products/travel-litter/1052.webp" },
    { id: "covers", img: "assets/img/products/car-seat-cover/1201.webp" }
  ];

  var state = { lang: "fa", cat: "all", query: "", product: null, variant: 0 };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ------------------------------------------------------------------ helpers
  function t(key, vars) {
    if (vars && vars.count === 1 && I18N[state.lang][key + "_one"]) key += "_one";
    var s = (I18N[state.lang] && I18N[state.lang][key]);
    if (s == null) s = I18N.en[key] != null ? I18N.en[key] : key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function num(n) {
    return Number(n).toLocaleString(state.lang === "fa" ? "fa-IR" : state.lang === "tr" ? "tr-TR" : "en-US");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s || "")
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; })
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; })
      .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌‏]/g, " ")
      .toLocaleLowerCase().replace(/\s+/g, " ").trim();
  }
  function variantCodes(v) {
    return Object.keys(v.codes || {}).map(function (k) { return v.codes[k]; }).filter(Boolean);
  }
  function variantName(p, v, i) {
    if (v.color) return v.color[state.lang];
    if (v.label) return v.label[state.lang];
    var designs = p.variants.filter(function (x) { return !x.color && !x.label; });
    if (designs.length < 2) return p.name[state.lang];
    return t("m_design") + " " + num(designs.indexOf(v) + 1);
  }
  function catName(id) { return t("cat_" + id); }
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  // ------------------------------------------------------------------ i18n
  function applyStatic() {
    var d = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.documentElement.dir = d.dir;
    document.title = t("meta_title");
    var md = $('meta[name="description"]');
    if (md) md.setAttribute("content", t("meta_desc"));
    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    $$("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    $$(".lang button").forEach(function (b) {
      var on = b.getAttribute("data-lang") === state.lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    });
  }

  function setLang(lang, save) {
    if (LANGS.indexOf(lang) < 0) lang = "fa";
    state.lang = lang;
    if (save) { try { localStorage.setItem("liliet-lang", lang); } catch (e) { /* storage unavailable */ } }
    applyStatic();
    renderStats();
    renderCats();
    renderChips();
    renderGrid();
    renderFooterCats();
    if (state.product) renderModal();
    var url = new URL(location.href);
    if (lang === "fa") url.searchParams.delete("lang"); else url.searchParams.set("lang", lang);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  // ------------------------------------------------------------------ renderers
  function renderStats() {
    var variants = PRODUCTS.reduce(function (n, p) { return n + p.variants.filter(function (v) { return !v.label; }).length; }, 0);
    $("#statProducts").textContent = num(PRODUCTS.length);
    $("#statVariants").textContent = num(variants) + "+";
    $("#statCats").textContent = num(CATS.length);
  }

  function countIn(cat) {
    return PRODUCTS.filter(function (p) { return p.cat === cat; }).length;
  }

  function renderCats() {
    $("#catGrid").innerHTML = CATS.map(function (c) {
      return '<a class="cat reveal in" href="#products" data-cat="' + c.id + '">' +
        '<span class="cat__img"><img src="' + c.img + '" alt="" loading="lazy"></span>' +
        "<h3>" + esc(catName(c.id)) + "</h3><p>" + esc(t("catd_" + c.id)) + "</p>" +
        '<span class="cat__count">' + esc(t("count_products", { n: num(countIn(c.id)), count: countIn(c.id) })) + "</span></a>";
    }).join("");
  }

  function renderFooterCats() {
    $("#footerCats").innerHTML = CATS.map(function (c) {
      return '<li><a href="#products" data-cat="' + c.id + '">' + esc(catName(c.id)) + "</a></li>";
    }).join("");
  }

  function renderChips() {
    var all = [{ id: "all" }].concat(CATS);
    $("#chips").innerHTML = all.map(function (c) {
      var on = state.cat === c.id;
      return '<button type="button" role="tab" class="chip' + (on ? " active" : "") + '" aria-selected="' + on + '" data-cat="' + c.id + '">' +
        esc(c.id === "all" ? t("cat_all") : catName(c.id)) + "</button>";
    }).join("");
  }

  function matches(p, q) {
    if (!q) return { ok: true, v: 0 };
    var hay = [p.name.fa, p.name.en, p.name.tr, catName(p.cat)].concat(p.models.map(function (m) { return m.code; }));
    if (norm(hay.join(" ")).indexOf(q) >= 0) return { ok: true, v: 0 };
    for (var i = 0; i < p.variants.length; i++) {
      var v = p.variants[i];
      var words = variantCodes(v);
      if (v.color) words = words.concat([v.color.fa, v.color.en, v.color.tr]);
      if (norm(words.join(" ")).indexOf(q) >= 0) return { ok: true, v: i };
    }
    return { ok: false };
  }

  // Prices are not published on the site; customers are asked to get in touch.
  function priceHtml() {
    return '<a class="price" href="#contact"><small>' + esc(t("price_label")) + "</small><strong>" + esc(t("price_contact")) + "</strong></a>";
  }

  function renderGrid() {
    var q = norm(state.query);
    var html = [], n = 0;
    PRODUCTS.forEach(function (p) {
      if (state.cat !== "all" && p.cat !== state.cat) return;
      var m = matches(p, q);
      if (!m.ok) return;
      n++;
      var shown = p.variants.filter(function (v) { return !v.label; });
      var sw = shown.slice(0, 5).map(function (v) {
        var i = p.variants.indexOf(v);
        return '<button type="button" class="swatch' + (i === m.v ? " active" : "") + '" data-v="' + i + '" title="' + esc(variantName(p, v, i)) + '">' +
          '<img src="' + v.img + '" alt="" loading="lazy"></button>';
      }).join("");
      var more = shown.length > 5 ? '<span class="swatch-more">+' + num(shown.length - 5) + "</span>" : "";
      var main = p.variants[m.v];
      html.push(
        '<article class="card" data-id="' + p.id + '" data-v="' + m.v + '" style="animation-delay:' + Math.min(n * 40, 400) + 'ms">' +
        '<a class="card__link" href="#product/' + p.id + "/" + m.v + '" aria-label="' + esc(p.name[state.lang]) + '"></a>' +
        '<div class="card__media"><img src="' + main.img + '" alt="' + esc(p.name[state.lang] + " - " + variantName(p, main, m.v)) + '" loading="lazy" width="800" height="600">' +
        '<span class="card__tag">' + esc(catName(p.cat)) + "</span></div>" +
        '<div class="card__body"><h3>' + esc(p.name[state.lang]) + "</h3>" +
        (shown.length > 1 ? '<div class="swatches">' + sw + more + "</div>" : "") +
        '<div class="card__foot">' + priceHtml() +
        '<span class="card__go" aria-hidden="true"><svg class="flip"><use href="#i-arrow"/></svg></span></div></div></article>'
      );
    });
    $("#grid").innerHTML = html.join("");
    $("#results").textContent = t("results", { n: num(n), count: n });
    $("#empty").hidden = n > 0;
  }

  // ------------------------------------------------------------------ modal
  var lastFocus = null;

  function openProduct(id, v) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    state.product = p;
    state.variant = Math.max(0, Math.min(p.variants.length - 1, v | 0));
    lastFocus = document.activeElement;
    renderModal();
    var modal = $("#modal");
    modal.hidden = false;
    document.body.classList.add("lock");
    setTimeout(function () { $(".modal__close", modal).focus(); }, 30);
  }

  function closeModal() {
    if (!state.product) return;
    state.product = null;
    $("#modal").hidden = true;
    document.body.classList.remove("lock");
    if (/^#product\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search + "#products");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderModal() {
    var p = state.product, v = p.variants[state.variant];
    $("#mCat").textContent = catName(p.cat);
    $("#mTitle").textContent = p.name[state.lang];
    var img = $("#mImg");
    img.src = v.img;
    img.alt = p.name[state.lang] + " - " + variantName(p, v, state.variant);

    var codes = v.codes || {};
    var codeParts = Object.keys(codes).map(function (k) {
      var label = p.models.length > 1 ? t("mdl_" + k) + " " : "";
      return label + "<b>" + (codes[k] ? esc(codes[k]) : esc(t("out_of_stock"))) + "</b>";
    });
    $("#mVariant").innerHTML = '<span class="vname">' + esc(variantName(p, v, state.variant)) + "</span>" +
      (codeParts.length ? '<span class="vcode">' + esc(t("m_color_code")) + ": " + codeParts.join(" · ") + "</span>" : "");

    $("#mThumbs").innerHTML = p.variants.length > 1 ? p.variants.map(function (x, i) {
      return '<button type="button" class="thumb' + (i === state.variant ? " active" : "") + '" data-v="' + i + '" title="' + esc(variantName(p, x, i)) + '" aria-label="' + esc(variantName(p, x, i)) + '">' +
        '<img src="' + x.img + '" alt="" loading="lazy"></button>';
    }).join("") : "";

    var multi = p.models.length > 1;
    var head = "<tr>" + (multi ? "<th>" + esc(t("m_model")) + "</th>" : "") + "<th>" + esc(t("m_code")) + "</th><th>" + esc(t("m_size")) + "</th><th>" + esc(t("m_price")) + "</th></tr>";
    $("#mModels").innerHTML = head + p.models.map(function (m) {
      var sel = multi && Object.prototype.hasOwnProperty.call(codes, m.key);
      var price = m.soldOut ? esc(t("out_of_stock")) : '<a href="tel:+989364559096">' + esc(t("price_contact")) + "</a>";
      return '<tr class="' + (sel ? "sel" : "") + '">' + (multi ? "<td>" + esc(t("mdl_" + m.key)) + "</td>" : "") + '<td class="code">' + esc(m.code) +
        '</td><td dir="ltr">' + esc(m.size || "—") + '</td><td class="' + (m.soldOut ? "na" : "p") + '">' + price + "</td></tr>";
    }).join("");

    $("#mFeatures").innerHTML = p.features.map(function (f) {
      return '<li><svg class="ico"><use href="#i-check"/></svg><span>' + esc(t("ft_" + f)) + "</span></li>";
    }).join("");

    var codeText = variantCodes(v).join(" / ") || p.models.map(function (m) { return m.code; }).join(" / ");
    var msg = t("wa_msg", { name: p.name[state.lang] + " - " + variantName(p, v, state.variant), code: codeText });
    $("#mWa").href = "https://wa.me/" + PHONE_WA + "?text=" + encodeURIComponent(msg + "\n" + productUrl(p, state.variant));
  }

  function productUrl(p, v) {
    var u = new URL(location.href);
    u.hash = "product/" + p.id + "/" + v;
    return u.toString();
  }

  // ------------------------------------------------------------------ catalog (code protected)
  var CATALOG_META = "assets/catalog/catalog.json";
  var CATALOG_DATA = "assets/catalog/catalog.bin";
  var gateFocus = null, gateBusy = false, catalogUrl = null;

  function gateMsg(key, kind) {
    var el = $("#gateMsg");
    el.textContent = key ? t(key) : "";
    el.className = "gate__msg" + (kind ? " gate__msg--" + kind : "");
  }
  function openGate() {
    gateFocus = document.activeElement;
    closeNav();
    $("#gate").hidden = false;
    document.body.classList.add("lock");
    $("#gateWa").href = "https://wa.me/" + PHONE_WA + "?text=" + encodeURIComponent(t("wa_code_msg"));
    if (!catalogUrl) gateMsg("");
    setTimeout(function () { $("#gateCode").focus(); }, 30);
  }
  function closeGate() {
    if ($("#gate").hidden) return;
    $("#gate").hidden = true;
    if (!state.product) document.body.classList.remove("lock");
    if (gateFocus && gateFocus.focus) gateFocus.focus();
  }
  function setProgress(ratio) {
    var bar = $("#gateProgress");
    bar.hidden = ratio == null;
    $("span", bar).style.width = Math.round((ratio || 0) * 100) + "%";
  }
  function fetchWithProgress(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      var total = +res.headers.get("Content-Length") || 0;
      if (!res.body || !res.body.getReader || !total) return res.arrayBuffer();
      var reader = res.body.getReader(), chunks = [], got = 0;
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            var out = new Uint8Array(got), off = 0;
            chunks.forEach(function (c) { out.set(c, off); off += c.length; });
            return out.buffer;
          }
          chunks.push(r.value);
          got += r.value.length;
          setProgress(Math.min(got / total, 1));
          return pump();
        });
      })();
    });
  }
  function saveFile(url, name) {
    var a = $("#gateFile");
    a.href = url;
    a.download = name;
    a.hidden = false;
    a.click();
  }
  function submitGate(e) {
    e.preventDefault();
    if (gateBusy) return;
    var C = window.LilietCatalogCrypto;
    var input = $("#gateCode");
    var code = C ? C.normalizeCode(input.value) : input.value;
    if (!/^\d{4}$/.test(code)) { gateMsg("gate_short", "error"); input.focus(); return; }
    if (!C || !window.crypto || !window.crypto.subtle || !window.TextEncoder) { gateMsg("gate_unsupported", "error"); return; }
    gateBusy = true;
    $("#gateSubmit").disabled = true;
    $("#gateFile").hidden = true;
    gateMsg("gate_checking");
    var meta;
    fetch(CATALOG_META, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (m) { meta = m; return C.verify(code, meta); })
      .then(function (key) {
        if (!key) {
          gateMsg("gate_wrong", "error");
          input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
          input.select();
          return null;
        }
        gateMsg("gate_downloading");
        setProgress(0);
        return fetchWithProgress(CATALOG_DATA).then(function (data) {
          return C.unlock(key, meta, data);
        }).then(function (pdf) {
          if (catalogUrl) URL.revokeObjectURL(catalogUrl);
          catalogUrl = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
          saveFile(catalogUrl, meta.name || "Liliet-Pet-Catalog.pdf");
          gateMsg("gate_ok", "ok");
          toast(t("gate_ok"));
        });
      })
      .catch(function () { gateMsg("gate_error", "error"); })
      .then(function () {
        gateBusy = false;
        $("#gateSubmit").disabled = false;
        setProgress(null);
      });
  }

  function routeFromHash() {
    var m = /^#product\/([\w-]+)(?:\/(\d+))?/.exec(location.hash);
    if (m) openProduct(m[1], m[2] ? parseInt(m[2], 10) : 0);
    else if (state.product) closeModal();
  }

  // ------------------------------------------------------------------ events
  function bind() {
    $$(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.getAttribute("data-lang"), true); });
    });

    document.addEventListener("click", function (e) {
      var catLink = e.target.closest("[data-cat]");
      if (catLink) {
        state.cat = catLink.getAttribute("data-cat");
        renderChips();
        renderGrid();
        if (catLink.tagName === "A") {
          e.preventDefault();
          closeNav();
          $("#products").scrollIntoView({ behavior: "smooth" });
        }
        return;
      }
      var sw = e.target.closest(".swatch");
      if (sw) {
        var card = sw.closest(".card");
        var p = PRODUCTS.filter(function (x) { return x.id === card.getAttribute("data-id"); })[0];
        var i = +sw.getAttribute("data-v");
        $(".card__media img", card).src = p.variants[i].img;
        $(".card__link", card).setAttribute("href", "#product/" + p.id + "/" + i);
        $$(".swatch", card).forEach(function (s) { s.classList.toggle("active", s === sw); });
        return;
      }
      var th = e.target.closest(".thumb");
      if (th && state.product) {
        state.variant = +th.getAttribute("data-v");
        renderModal();
        history.replaceState(null, "", "#product/" + state.product.id + "/" + state.variant);
        return;
      }
      if (e.target.closest("[data-gate]")) { e.preventDefault(); openGate(); return; }
      if (e.target.closest("[data-gate-close]")) { closeGate(); return; }
      if (e.target.closest("[data-close]")) { closeModal(); return; }
    });

    // Swatch hover previews on desktop.
    document.addEventListener("mouseover", function (e) {
      var sw = e.target.closest && e.target.closest(".swatch");
      if (sw && !sw.classList.contains("active")) sw.click();
    });

    var timer;
    $("#search").addEventListener("input", function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () { state.query = e.target.value; renderGrid(); }, 120);
    });

    window.addEventListener("hashchange", routeFromHash);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!$("#gate").hidden) closeGate(); else closeModal();
        closeNav();
      }
      if (state.product && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        var dir = (e.key === "ArrowRight") === (document.documentElement.dir === "rtl") ? -1 : 1;
        var n = state.product.variants.length;
        state.variant = (state.variant + dir + n) % n;
        renderModal();
      }
      if (e.key === "Tab" && state.product) trapFocus(e);
    });

    $("#gateForm").addEventListener("submit", submitGate);
    $("#gateCode").addEventListener("input", function (e) {
      var C = window.LilietCatalogCrypto;
      var v = (C ? C.normalizeCode(e.target.value) : e.target.value).replace(/\D/g, "").slice(0, 4);
      if (v !== e.target.value) e.target.value = v;
      if ($("#gateMsg").classList.contains("gate__msg--error")) gateMsg("");
    });

    $("#mShare").addEventListener("click", function () {
      var url = productUrl(state.product, state.variant);
      var done = function () { toast(t("m_copied")); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("", url); });
      else prompt("", url);
    });

    // Mobile navigation
    $("#navOpen").addEventListener("click", openNav);
    $("#navClose").addEventListener("click", closeNav);
    $("#navBackdrop").addEventListener("click", closeNav);
    $$(".nav__link").forEach(function (a) { a.addEventListener("click", closeNav); });

    // Contact form → WhatsApp or e-mail
    $("#contactForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var via = (e.submitter && e.submitter.value) || "wa";
      var text = t("form_hello", { name: f.name.value.trim() }) + "\n" + f.message.value.trim();
      if (via === "mail") location.href = "mailto:sales@lilietpet.com?subject=" + encodeURIComponent("Liliet Pet - " + f.name.value.trim()) + "&body=" + encodeURIComponent(text);
      else window.open("https://wa.me/" + PHONE_WA + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    });

    $("#toTop").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    var header = $("#header"), toTop = $("#toTop");
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      header.classList.toggle("scrolled", y > 10);
      toTop.classList.toggle("show", y > 700);
    }, { passive: true });
  }

  function trapFocus(e) {
    var f = $$("#modal button, #modal a[href]").filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openNav() {
    $("#nav").classList.add("open");
    document.body.classList.add("nav-open", "lock");
    $("#navOpen").setAttribute("aria-expanded", "true");
  }
  function closeNav() {
    if (!$("#nav").classList.contains("open")) return;
    $("#nav").classList.remove("open");
    document.body.classList.remove("nav-open");
    if (!state.product) document.body.classList.remove("lock");
    $("#navOpen").setAttribute("aria-expanded", "false");
  }

  function observe() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$(".reveal:not(.in)").forEach(function (el) { io.observe(el); });

    var links = $$(".nav__link");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["home", "categories", "products", "about", "catalog", "contact"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  // ------------------------------------------------------------------ init
  function init() {
    var params = new URLSearchParams(location.search);
    var lang = params.get("lang");
    if (LANGS.indexOf(lang) < 0) {
      try { lang = localStorage.getItem("liliet-lang"); } catch (e) { lang = null; }
    }
    $("#year").textContent = new Date().getFullYear();
    bind();
    setLang(LANGS.indexOf(lang) >= 0 ? lang : "fa", false);
    observe();
    routeFromHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
