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
// Use for pages that serve static HTML (detail.js, search.js).
// Do NOT use for JS-rendered pages — use browser.launchAsync() instead.
function fetchCF(url) {
    // 1. Try instant cached-cookie fetch
    var doc = fetchFast(url);
    if (doc) return doc;
    // 2. Warmup CF if needed (one-time cost)
    if (!_cfReady) warmupCF();
    // 3. Retry fast fetch after warmup
    doc = fetchFast(url);
    if (doc) return doc;
    // 4. Last resort: full browser
    return fetchBrowserCF(url);
}