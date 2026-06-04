var BASE_URL = "https://69shuba.tw";
try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
} catch (e) {}

// ============ Asset Blocking Lists ============
// _BLOCK_ADS: ad networks confirmed from 69shuba_tw device testing.
// cn.macacusdame.com confirmed in chap.js device output. Add more as discovered.
var _BLOCK_ADS = [
    "cn.macacusdame.com",
    "googletagmanager",
    "google-analytics",
    "cloudflareinsights"
];

// _BLOCK_HEAVY: generic static assets — not needed for HTML content parsing.
// Blocking these speeds up all browser sessions significantly.
var _BLOCK_HEAVY = [
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
    ".css", ".woff", ".woff2", ".ttf", ".eot"
];

// ============ Cloudflare Cookie System ============
// After first browser CF bypass, Android WebView stores cf_clearance cookie.
// We extract and reuse it for all fetch() calls — making them instant.
var _cfCookie = null;
var _cfUA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
var _cfReady = false;

// --- Cookie Storage ---
function loadCookie() {
    if (_cfCookie) return _cfCookie;
    try {
        var lc = localCookie.getCookie();
        if (lc && lc.length > 10) { _cfCookie = lc; return _cfCookie; }
    } catch(e) {}
    try {
        var ls = localStorage.getItem("69sh_cf");
        if (ls && ls.length > 10) { _cfCookie = ls; return _cfCookie; }
    } catch(e) {}
    return null;
}

function storeCookie(cookie) {
    if (!cookie || cookie.length < 5) return;
    _cfCookie = cookie;
    _cfReady = true;
    try { localStorage.setItem("69sh_cf", cookie); } catch(e) {}
    try {
        var parts = cookie.split(";");
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i].trim();
            if (p) localCookie.setCookie(p);
        }
    } catch(e) {}
}

function invalidateCookie() {
    _cfCookie = null;
    _cfReady = false;
    try { localStorage.removeItem("69sh_cf"); } catch(e) {}
}

// --- Extract cookies from an active browser session ---
function extractCookiesFromBrowser(browser) {
    var cookie = "";
    try {
        browser.callJs("window._69shc = document.cookie;", 300);
        cookie = browser.getVariable("_69shc") + "";
    } catch(e) {}
    if (!cookie || cookie.length < 10) {
        try { cookie = localCookie.getCookie() + ""; } catch(e) {}
    }
    if (cookie && cookie.length > 5) {
        storeCookie(cookie);
    }
}

// ============ WARMUP: Solve CF once, cache forever ============
// Launches homepage in browser once to get cf_clearance cookie.
// Subsequent calls skip this entirely if cookie is cached.
function warmupCF() {
    if (_cfReady || loadCookie()) {
        _cfReady = true;
        return true;
    }
    var browser = Engine.newBrowser();
    browser.setUserAgent(UserAgent.android());
    browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
    var doc = browser.launch(BASE_URL + "/", 15000);
    if (doc) {
        var t = doc.text() + "";
        // Wait longer if CF challenge or 69shuba content not yet loaded
        if (t.length < 500 || t.indexOf("Just a moment") >= 0 || t.indexOf("69\u66f8\u5427") < 0) {
            sleep(5000);
            doc = browser.html();
        }
        extractCookiesFromBrowser(browser);
    }
    browser.close();
    _cfReady = !!loadCookie();
    return _cfReady;
}

// ============ FAST FETCH: uses cached cookie (~1-2s) ============
function fetchFast(url) {
    var cookie = loadCookie();
    if (!cookie) return null;
    try {
        var res = fetch(url, {
            headers: {
                "User-Agent": _cfUA,
                "Accept": "text/html",
                "Accept-Language": "zh-TW,zh;q=0.9",
                "Cookie": cookie
            }
        });
        if (res && res.ok) {
            var doc = res.html();
            if (doc) {
                var t = doc.text() + "";
                if (t.length > 500 && t.indexOf("Just a moment") < 0) return doc;
            }
        }
    } catch(e) {}
    invalidateCookie();
    return null;
}

// ============ BROWSER FETCH: full browser with blocking (~5-10s) ============
function fetchBrowserCF(url, timeout) {
    var t = timeout !== undefined ? timeout : 15000;
    var browser = Engine.newBrowser();
    browser.setUserAgent(UserAgent.android());
    browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
    var doc = browser.launch(url, t);
    if (doc) extractCookiesFromBrowser(browser);
    browser.close();
    return doc;
}

// ============ SMART FETCH: fast → warmup → browser ============
// Use for pages that serve static HTML (detail, indexlist, chapter pages).
// Never combine browser.block() + launchAsync() — sync launch only as last resort.
function fetchCF(url) {
    var doc = fetchFast(url);
    if (doc) return doc;
    if (!_cfReady) warmupCF();
    doc = fetchFast(url);
    if (doc) return doc;
    return fetchBrowserCF(url);
}

// ============ Throttled fetch (TOC pagination / burst calls) ============
// 1s gap between consecutive indexlist fetches — balances speed vs CF rate limits.
// page.js uses unthrottled fetchCF (single request). Only toc.js paces multi-page fetches.
var _FETCH_MIN_MS = 1000;
var _LAST_FETCH_KEY = "69sh_last_fetch";

function throttleWait() {
    var now = Date.now();
    var last = 0;
    try {
        last = parseInt(localStorage.getItem(_LAST_FETCH_KEY) || "0", 10);
    } catch (e) {}
    var gap = now - last;
    if (gap < _FETCH_MIN_MS) {
        sleep(_FETCH_MIN_MS - gap);
    }
}

function markFetch() {
    try {
        localStorage.setItem(_LAST_FETCH_KEY, String(Date.now()));
    } catch (e) {}
}

function fetchCFThrottled(url) {
    throttleWait();
    var doc = fetchCF(url);
    markFetch();
    return doc;
}

// ============ Indexlist URL + parsing helpers ============
function resolveIndexUrl(url) {
    url = (url || "").replace("http://", "https://");
    if (url.indexOf("/indexlist/") >= 0) return url;
    var bookIdMatch = url.match(/\/(?:book|txt|indexlist)\/(\d+)/);
    if (bookIdMatch && bookIdMatch[1]) {
        return BASE_URL + "/indexlist/" + bookIdMatch[1] + "/";
    }
    return url;
}

function isValidIndexDoc(doc) {
    if (!doc) return false;
    var title = doc.select("title").text() + "";
    if (!title || title.indexOf("69書吧") === -1) return false;
    var listItems = doc.select("#catalog ul li");
    if (listItems.size() === 0) listItems = doc.select("li");
    return listItems.size() > 0;
}

function parseIndexPages(doc, indexUrl) {
    var pageList = [];
    var options = doc.select("#indexselect-top option, #indexselect option");
    for (var i = 0; i < options.size(); i++) {
        var e = options.get(i);
        var value = e.attr("value") + "";
        if (value) {
            if (value.indexOf("/") === 0) value = BASE_URL + value;
            pageList.push(value);
        }
    }
    if (pageList.length === 0) pageList.push(indexUrl);
    return pageList;
}

function parseChapterList(doc, host) {
    var list = [];
    var listItems = doc.select("#catalog ul li");
    if (listItems.size() === 0) listItems = doc.select("li");

    var bookTitle = "";
    var titleElement = doc.select("ul.last9 li.title a.back").first();
    if (!titleElement) {
        var pageTitle = doc.select("title").text() + "";
        var titleMatch = pageTitle.match(/《(.*?)》/);
        if (titleMatch && titleMatch[1]) bookTitle = titleMatch[1];
    } else {
        var titleText = titleElement.text() + "";
        var backMatch = titleText.match(/《(.*?)》/);
        if (backMatch && backMatch[1]) bookTitle = backMatch[1];
    }

    for (var i = 0; i < listItems.size(); i++) {
        var li = listItems.get(i);
        var className = li.attr("class") + "";
        if (className && className.indexOf("title") !== -1) continue;

        var name = "";
        var link = "";
        var protectedItem = li.select(".protected-chapter-link").first();
        if (!protectedItem) protectedItem = li.select("[data-cid-url]").first();

        if (protectedItem) {
            link = protectedItem.attr("data-cid-url") + "";
            name = protectedItem.text() + "";
            if (!name) name = protectedItem.attr("data-title") + "";
        }

        if (!link || link.length === 0) {
            var a = li.select("a").first();
            if (a) {
                link = a.attr("href") + "";
                name = a.text() + "";
            }
        }

        if (link && link.length > 0) {
            if (link.indexOf("/") === 0) link = host + link;
            if (name) {
                if (bookTitle && name.indexOf(bookTitle) !== -1) {
                    name = name.replace(bookTitle, "").trim();
                }
                name = name.trim();
            } else {
                name = "Chapter " + (list.length + 1);
            }
            list.push({ name: name, url: link, host: host });
        }
    }
    return list;
}

// ============ TOC page cache (auto-check) ============
var _TOC_CACHE_PREFIX = "69sh_toc_";
var _UPDATE_TIME_PREFIX = "69sh_ut_";

function getTocCacheKey(indexUrl) {
    var m = (indexUrl || "").match(/\/indexlist\/(\d+)\/?(\d*)/);
    if (m) {
        return m[1] + "_p" + (m[2] || "1");
    }
    return (indexUrl || "").replace(/[^a-zA-Z0-9]/g, "_");
}

function getTocPageCache(indexUrl) {
    try {
        var raw = localStorage.getItem(_TOC_CACHE_PREFIX + getTocCacheKey(indexUrl));
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function setTocPageCache(indexUrl, chapters) {
    if (!chapters || chapters.length === 0) return;
    var cacheKey = getTocCacheKey(indexUrl);
    var bookId = cacheKey.split("_p")[0];
    var updateTime = "";
    try { updateTime = localStorage.getItem(_UPDATE_TIME_PREFIX + bookId) + ""; } catch (e) {}
    try {
        localStorage.setItem(_TOC_CACHE_PREFIX + cacheKey, JSON.stringify({
            chapters: chapters,
            updateTime: updateTime,
            ts: Date.now()
        }));
    } catch (e) {}
}

function invalidateTocCache(bookId) {
    if (!bookId) return;
    for (var p = 1; p <= 20; p++) {
        try { localStorage.removeItem(_TOC_CACHE_PREFIX + bookId + "_p" + p); } catch (e) {}
    }
}

function syncTocCacheValidity(bookId, updateTime) {
    if (!bookId || !updateTime) return;
    try {
        var key = _UPDATE_TIME_PREFIX + bookId;
        var prev = localStorage.getItem(key) + "";
        if (prev && prev !== updateTime) invalidateTocCache(bookId);
        localStorage.setItem(key, updateTime);
    } catch (e) {}
}

function getBookUpdateTime(bookId) {
    if (!bookId) return "";
    try {
        return localStorage.getItem(_UPDATE_TIME_PREFIX + bookId) + "";
    } catch (e) {}
    return "";
}

function fetchBookUpdateTime(bookUrl) {
    bookUrl = (bookUrl || "").replace("http://", "https://");
    var doc = fetchCF(bookUrl);
    if (!doc) return "";
    return doc.select('meta[property="og:novel:update_time"]').attr("content") + "";
}

function ensureTocCacheFresh(bookUrl) {
    bookUrl = (bookUrl || "").replace("http://", "https://");
    var bookIdMatch = bookUrl.match(/\/book\/(\d+)/);
    if (!bookIdMatch || !bookIdMatch[1]) return;
    var updateTime = fetchBookUpdateTime(bookUrl);
    if (updateTime) {
        syncTocCacheValidity(bookIdMatch[1], updateTime);
    }
}