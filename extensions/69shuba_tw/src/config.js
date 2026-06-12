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
var _cfCookie = null;
var _cfUA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
var _cfReady = false;
var _HOMEPAGE_URL = BASE_URL + "/";
var _CF_COOKIE_KEY = "69sh_cf";
var _CF_COOKIE_TS_KEY = "69sh_cf_ts";
var _CF_PROBE_TS_KEY = "69sh_cf_probe_ts";
var _CF_COOKIE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
var _CF_PROBE_MAX_AGE_MS = 30 * 60 * 1000;
var _LAST_INDEX_OK_KEY = "69sh_last_index_ok_ts";
var _INDEX_OK_MAX_AGE_MS = 30 * 60 * 1000;
var _DETAIL_SYNC_PREFIX = "69sh_detail_sync_ts_";
var _DETAIL_SYNC_TTL_MS = 5 * 60 * 1000;

function isCfChallengeText(t) {
    t = (t || "") + "";
    if (t.length < 200) return true;
    if (t.indexOf("Just a moment") >= 0) return true;
    if (t.indexOf("Please complete human verification") >= 0) return true;
    if (t.indexOf("Verify you are human") >= 0) return true;
    return false;
}

function isValid69shDoc(doc, url) {
    if (!doc) return false;
    var t = doc.text() + "";
    if (isCfChallengeText(t)) return false;
    url = (url || "") + "";
    if (url.indexOf("/indexlist/") >= 0) return isValidIndexDoc(doc);
    if (url.indexOf("/book/") >= 0) {
        var metaTitle = doc.select('meta[property="og:title"]').attr("content") + "";
        return metaTitle.length > 0 || t.indexOf("69\u66f8\u5427") >= 0;
    }
    if (url.indexOf("/txt/") >= 0 || url.indexOf("/read/") >= 0) {
        return doc.select("#nr1").size() > 0 || t.length > 500;
    }
    if (url.indexOf("/search") >= 0) {
        return doc.select("table.list-item").size() > 0 || t.length > 500;
    }
    var title = doc.select("title").text() + "";
    return title.indexOf("69\u66f8\u5427") >= 0 || t.indexOf("69\u66f8\u5427") >= 0;
}

function isCookieStale() {
    try {
        var ts = parseInt(localStorage.getItem(_CF_COOKIE_TS_KEY) || "0", 10);
        if (!ts) return !loadCookie();
        return (Date.now() - ts) > _CF_COOKIE_MAX_AGE_MS;
    } catch (e) {}
    return false;
}

function markCfProbeOk() {
    _cfReady = true;
    try { localStorage.setItem(_CF_PROBE_TS_KEY, String(Date.now())); } catch (e) {}
}

function isCfProbeRecent() {
    try {
        var ts = parseInt(localStorage.getItem(_CF_PROBE_TS_KEY) || "0", 10);
        return ts > 0 && (Date.now() - ts) < _CF_PROBE_MAX_AGE_MS;
    } catch (e) {}
    return false;
}

function markIndexFetchOk() {
    try { localStorage.setItem(_LAST_INDEX_OK_KEY, String(Date.now())); } catch (e) {}
}

function isIndexFetchRecent() {
    try {
        var ts = parseInt(localStorage.getItem(_LAST_INDEX_OK_KEY) || "0", 10);
        return ts > 0 && (Date.now() - ts) < _INDEX_OK_MAX_AGE_MS;
    } catch (e) {}
    return false;
}

function loadCookie() {
    if (_cfCookie) return _cfCookie;
    try {
        var lc = localCookie.getCookie() + "";
        if (lc && lc.length > 10) { _cfCookie = lc; return _cfCookie; }
    } catch (e) {}
    try {
        var ls = localStorage.getItem(_CF_COOKIE_KEY);
        if (ls && ls.length > 10) { _cfCookie = ls; return _cfCookie; }
    } catch (e) {}
    return null;
}

function storeCookie(cookie) {
    if (!cookie || cookie.length < 5) return;
    _cfCookie = cookie;
    _cfReady = true;
    try {
        localStorage.setItem(_CF_COOKIE_KEY, cookie);
        localStorage.setItem(_CF_COOKIE_TS_KEY, String(Date.now()));
    } catch (e) {}
    try {
        var parts = cookie.split(";");
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i].trim();
            if (p) localCookie.setCookie(p);
        }
    } catch (e) {}
}

function invalidateCookie() {
    _cfCookie = null;
    _cfReady = false;
    try {
        localStorage.removeItem(_CF_COOKIE_KEY);
        localStorage.removeItem(_CF_COOKIE_TS_KEY);
        localStorage.removeItem(_CF_PROBE_TS_KEY);
    } catch (e) {}
    setThrottleColdFor(_THROTTLE_COLD_MS);
}

var _GLOBAL_FETCH_MIN_MS = 400;
var _LAST_ANY_FETCH_KEY = "69sh_last_any_fetch";
var _THROTTLE_COLD_UNTIL_KEY = "69sh_throttle_cold_until";
var _THROTTLE_COLD_MS = 5 * 60 * 1000;
var _FETCH_MIN_MS_HOT = 750;
var _FETCH_MIN_MS_COLD = 1000;
var _FETCH_MIN_MS_FLOOR = 500;
var _LAST_FETCH_KEY = "69sh_last_fetch";
var _DETAIL_CACHE_PREFIX = "69sh_detail_";
var _DETAIL_CACHE_TTL_MS = 30 * 60 * 1000;
var _CHAP_BROWSER_N_KEY = "69sh_chap_browser_n";

function globalFetchWait() {
    var now = Date.now();
    var last = 0;
    try {
        last = parseInt(localStorage.getItem(_LAST_ANY_FETCH_KEY) || "0", 10);
    } catch (e) {}
    var gap = now - last;
    if (gap < _GLOBAL_FETCH_MIN_MS) {
        sleep(_GLOBAL_FETCH_MIN_MS - gap);
    }
}

function markGlobalFetch() {
    try {
        localStorage.setItem(_LAST_ANY_FETCH_KEY, String(Date.now()));
    } catch (e) {}
}

function isThrottleColdForced() {
    try {
        var until = parseInt(localStorage.getItem(_THROTTLE_COLD_UNTIL_KEY) || "0", 10);
        return until > 0 && Date.now() < until;
    } catch (e) {}
    return false;
}

function setThrottleColdFor(ms) {
    try {
        localStorage.setItem(_THROTTLE_COLD_UNTIL_KEY, String(Date.now() + ms));
    } catch (e) {}
}

function getFetchMinMs() {
    var minMs = _FETCH_MIN_MS_COLD;
    if (!isThrottleColdForced() && isCfProbeRecent() && loadCookie()) {
        minMs = _FETCH_MIN_MS_HOT;
    }
    if (minMs < _FETCH_MIN_MS_FLOOR) minMs = _FETCH_MIN_MS_FLOOR;
    return minMs;
}

function handleCfStress() {
    invalidateCookie();
    setThrottleColdFor(_THROTTLE_COLD_MS);
}

function extractCookiesFromBrowser(browser) {
    var cookie = "";
    try {
        browser.callJs("window._69shc = document.cookie;", 300);
        cookie = browser.getVariable("_69shc") + "";
    } catch (e) {}
    if (!cookie || cookie.length < 10) {
        try { cookie = localCookie.getCookie() + ""; } catch (e) {}
    }
    if (cookie && cookie.length > 5) {
        storeCookie(cookie);
    }
}

function waitForCfBrowser(browser, maxMs) {
    var elapsed = 0;
    var step = 250;
    var limit = maxMs !== undefined ? maxMs : 20000;
    var doc = null;
    while (elapsed < limit) {
        try { doc = browser.html(); } catch (e) { doc = null; }
        if (doc) {
            var t = doc.text() + "";
            if (!isCfChallengeText(t) && (t.indexOf("69\u66f8\u5427") >= 0 || t.length > 800)) {
                return doc;
            }
        }
        sleep(step);
        elapsed += step;
    }
    try { return browser.html(); } catch (e2) {}
    return doc;
}

function probeCfSession() {
    if (isCookieStale()) {
        invalidateCookie();
        return false;
    }
    if (!loadCookie()) return false;
    globalFetchWait();
    var doc = fetchFast(_HOMEPAGE_URL, true);
    if (doc && isValid69shDoc(doc, _HOMEPAGE_URL)) {
        markCfProbeOk();
        markGlobalFetch();
        Console.log("[69sh] probe ok");
        return true;
    }
    Console.log("[69sh] probe fail");
    setThrottleColdFor(_THROTTLE_COLD_MS);
    return false;
}

function warmupCF() {
    if (probeCfSession()) return true;

    Console.log("[69sh] warmup browser");
    var browser = Engine.newBrowser();
    try {
        browser.setUserAgent(UserAgent.android());
        browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
        browser.launch(_HOMEPAGE_URL, 15000);
        waitForCfBrowser(browser, 20000);
        extractCookiesFromBrowser(browser);
    } finally {
        browser.close();
    }
    _cfReady = probeCfSession();
    return _cfReady;
}

function ensureCfReady() {
    if (isCookieStale()) invalidateCookie();
    if (isCfProbeRecent() && loadCookie()) return true;
    if (probeCfSession()) return true;
    return warmupCF();
}

function getChapBrowserCount() {
    try {
        return parseInt(localStorage.getItem(_CHAP_BROWSER_N_KEY) || "0", 10);
    } catch (e) {}
    return 0;
}

function markChapBrowserUse() {
    var n = getChapBrowserCount() + 1;
    try {
        localStorage.setItem(_CHAP_BROWSER_N_KEY, String(n));
    } catch (e) {}
    return n;
}

function waitForChapBrowser(browser, url, maxMs) {
    var elapsed = 0;
    var step = 250;
    var limit = maxMs !== undefined ? maxMs : 8000;
    var doc = null;
    while (elapsed < limit) {
        try { doc = browser.html(); } catch (e) { doc = null; }
        if (doc && !isCfChallengeText(doc.text() + "") && isValid69shDoc(doc, url)) {
            return doc;
        }
        sleep(step);
        elapsed += step;
    }
    try {
        doc = browser.html();
        if (doc && !isCfChallengeText(doc.text() + "") && isValid69shDoc(doc, url)) {
            return doc;
        }
    } catch (e2) {}
    return null;
}

function fetchFast(url, skipInvalidate) {
    if (isCookieStale()) invalidateCookie();
    var cookie = loadCookie();
    if (!cookie) return null;
    globalFetchWait();
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
            if (doc && isValid69shDoc(doc, url)) {
                markCfProbeOk();
                markGlobalFetch();
                if (url.indexOf("/indexlist/") >= 0 || url.indexOf("/book/") >= 0) {
                    markIndexFetchOk();
                }
                return doc;
            }
            if (doc && isCfChallengeText(doc.text() + "")) {
                if (!skipInvalidate) handleCfStress();
            }
        }
    } catch (e) {}
    return null;
}

// Async browser for /read/ chapters; poll until #nr1; periodic recovery for long batches.
function fetchBrowserChap(url) {
    var t0 = Date.now();
    var n = markChapBrowserUse();
    globalFetchWait();
    var browser = Engine.newBrowser();
    var doc = null;
    try {
        browser.setUserAgent(UserAgent.android());
        browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
        browser.launchAsync(url);
        doc = waitForChapBrowser(browser, url, 10000);
        if (doc) {
            extractCookiesFromBrowser(browser);
            markCfProbeOk();
            markGlobalFetch();
        }
    } finally {
        try { browser.close(); } catch (e) {}
        sleep(500);
        if (n > 0 && n % 25 === 0) {
            Console.log("[69sh] chap browser recovery n=" + n);
            sleep(1500);
        }
    }
    Console.log("[69sh] chap browser n=" + n + " done ms=" + (Date.now() - t0));
    return doc;
}

// Chapter download: browser-only for /read/ — no untimed fetch() in chap path.
function fetchChapCF(url) {
    url = (url || "").replace("http://", "https://");
    if (!loadCookie()) {
        ensureCfReady();
    }
    globalFetchWait();

    if (url.indexOf("/read/") >= 0) {
        Console.log("[69sh] chap browser /read/");
        return fetchBrowserChap(url);
    }

    var doc = fetchFast(url, true);
    if (doc) return doc;
    sleep(500);
    doc = fetchFast(url, true);
    if (doc) return doc;
    return fetchBrowserChap(url);
}

function fetchBrowserCF(url, timeout) {
    var t = timeout !== undefined ? timeout : 15000;
    globalFetchWait();
    var browser = Engine.newBrowser();
    var doc = null;
    try {
        browser.setUserAgent(UserAgent.android());
        browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
        browser.launch(url, t);
        doc = waitForCfBrowser(browser, 20000);
        if (doc && !isCfChallengeText(doc.text() + "")) {
            extractCookiesFromBrowser(browser);
            markCfProbeOk();
            markGlobalFetch();
            if (url.indexOf("/indexlist/") >= 0 || url.indexOf("/book/") >= 0) {
                markIndexFetchOk();
            }
        } else {
            doc = null;
            handleCfStress();
        }
    } finally {
        browser.close();
    }
    return doc;
}

function fetchCFOnce(url) {
    url = (url || "").replace("http://", "https://");
    var doc = fetchFast(url);
    if (doc) return doc;
    doc = fetchBrowserCF(url);
    if (doc && isValid69shDoc(doc, url)) return doc;
    return null;
}

function fetchCF(url) {
    url = (url || "").replace("http://", "https://");
    ensureCfReady();
    return fetchCFOnce(url);
}

function canUseTocCache() {
    if (!loadCookie() || isCookieStale()) return false;
    return isCfProbeRecent() || isIndexFetchRecent();
}

// ============ Throttled fetch (TOC pagination / burst calls) ============
function throttleWait() {
    var minMs = getFetchMinMs();
    Console.log("[69sh] throttle " + minMs + "ms" + (minMs === _FETCH_MIN_MS_HOT ? " hot" : " cold"));
    var now = Date.now();
    var last = 0;
    try {
        last = parseInt(localStorage.getItem(_LAST_FETCH_KEY) || "0", 10);
    } catch (e) {}
    var gap = now - last;
    if (gap < minMs) {
        sleep(minMs - gap);
    }
}

function markFetch() {
    try {
        localStorage.setItem(_LAST_FETCH_KEY, String(Date.now()));
    } catch (e) {}
}

function fetchCFThrottled(url) {
    throttleWait();
    ensureCfReady();
    var doc = fetchCFOnce(url);
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
var _PAGE_LIST_PREFIX = "69sh_pages_";
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

function invalidatePageListCache(bookId) {
    if (!bookId) return;
    try { localStorage.removeItem(_PAGE_LIST_PREFIX + bookId); } catch (e) {}
}

function getPageListCache(bookId) {
    if (!bookId) return null;
    try {
        var raw = localStorage.getItem(_PAGE_LIST_PREFIX + bookId);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function setPageListCache(bookId, pageUrls) {
    if (!bookId || !pageUrls || pageUrls.length === 0) return;
    var updateTime = getBookUpdateTime(bookId);
    try {
        localStorage.setItem(_PAGE_LIST_PREFIX + bookId, JSON.stringify({
            pageUrls: pageUrls,
            updateTime: updateTime,
            ts: Date.now()
        }));
    } catch (e) {}
}

function invalidateTocCache(bookId) {
    if (!bookId) return;
    invalidatePageListCache(bookId);
    for (var p = 1; p <= 20; p++) {
        try { localStorage.removeItem(_TOC_CACHE_PREFIX + bookId + "_p" + p); } catch (e) {}
    }
}

function invalidateDetailCache(bookId) {
    if (!bookId) return;
    try { localStorage.removeItem(_DETAIL_CACHE_PREFIX + bookId); } catch (e) {}
}

function getDetailCache(bookId) {
    if (!bookId) return null;
    try {
        var raw = localStorage.getItem(_DETAIL_CACHE_PREFIX + bookId);
        if (!raw) return null;
        var cached = JSON.parse(raw);
        if (!cached || !cached.ts) return null;
        if ((Date.now() - cached.ts) > _DETAIL_CACHE_TTL_MS) return null;
        return cached;
    } catch (e) {}
    return null;
}

function setDetailCache(bookId, payload) {
    if (!bookId || !payload) return;
    try {
        payload.ts = Date.now();
        localStorage.setItem(_DETAIL_CACHE_PREFIX + bookId, JSON.stringify(payload));
    } catch (e) {}
}

function syncTocCacheValidity(bookId, updateTime) {
    if (!bookId || !updateTime) return;
    try {
        var key = _UPDATE_TIME_PREFIX + bookId;
        var prev = localStorage.getItem(key) + "";
        if (prev && prev !== updateTime) {
            invalidateTocCache(bookId);
            invalidateDetailCache(bookId);
            invalidatePageListCache(bookId);
        }
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

function markBookDetailSynced(bookId, updateTime) {
    if (!bookId) return;
    try { localStorage.setItem(_DETAIL_SYNC_PREFIX + bookId, String(Date.now())); } catch (e) {}
    if (updateTime) syncTocCacheValidity(bookId, updateTime);
}

function shouldSkipDetailRefresh(bookId) {
    if (!bookId) return false;
    var ut = getBookUpdateTime(bookId);
    if (!ut) return false;
    try {
        var ts = parseInt(localStorage.getItem(_DETAIL_SYNC_PREFIX + bookId) || "0", 10);
        return ts > 0 && (Date.now() - ts) < _DETAIL_SYNC_TTL_MS;
    } catch (e) {}
    return false;
}

function readUpdateTimeFromDoc(doc, bookUrl) {
    if (!doc) return "";
    var updateTime = doc.select('meta[property="og:novel:update_time"]').attr("content") + "";
    var bookIdMatch = (bookUrl || "").match(/\/book\/(\d+)/);
    if (bookIdMatch && bookIdMatch[1] && updateTime) {
        markBookDetailSynced(bookIdMatch[1], updateTime);
    }
    return updateTime;
}

function fetchBookUpdateTimeOnce(bookUrl) {
    bookUrl = (bookUrl || "").replace("http://", "https://");
    var doc = fetchCFOnce(bookUrl);
    return readUpdateTimeFromDoc(doc, bookUrl);
}

function fetchBookUpdateTime(bookUrl) {
    bookUrl = (bookUrl || "").replace("http://", "https://");
    var doc = fetchCF(bookUrl);
    return readUpdateTimeFromDoc(doc, bookUrl);
}

function ensureTocCacheFresh(bookUrl, forceCheck, cfReady) {
    bookUrl = (bookUrl || "").replace("http://", "https://");
    var bookIdMatch = bookUrl.match(/\/book\/(\d+)/);
    if (!bookIdMatch || !bookIdMatch[1]) return;
    var bookId = bookIdMatch[1];
    if (!forceCheck && shouldSkipDetailRefresh(bookId)) {
        Console.log("[69sh] ensureTocCacheFresh skip bookId=" + bookId);
        return;
    }
    var updateTime = cfReady ? fetchBookUpdateTimeOnce(bookUrl) : fetchBookUpdateTime(bookUrl);
    if (updateTime) {
        syncTocCacheValidity(bookId, updateTime);
    }
}

function isIndexlistPageOne(indexUrl) {
    var m = (indexUrl || "").match(/\/indexlist\/(\d+)\/?(\d*)/);
    if (!m) return false;
    var pageNum = m[2] || "";
    return pageNum === "" || pageNum === "1";
}

var _PREWARM_MAX_PAGES = 12;

function warmIndexlistFromDetail(bookId) {
    if (!bookId) return;
    var indexUrl = BASE_URL + "/indexlist/" + bookId + "/";
    var ut = getBookUpdateTime(bookId);
    var cached = getTocPageCache(indexUrl);
    if (cached && cached.chapters && cached.chapters.length > 0 && ut && cached.updateTime === ut) {
        var pages = getPageListCache(bookId);
        if (pages && pages.pageUrls && pages.pageUrls.length > 0) return;
    }
    var doc = fetchCFOnce(indexUrl);
    if (!doc || !isValidIndexDoc(doc)) return;
    var pageList = parseIndexPages(doc, indexUrl);
    if (pageList.length > 0) setPageListCache(bookId, pageList);
    var list = parseChapterList(doc, BASE_URL);
    if (list.length > 0) {
        setTocPageCache(indexUrl, list);
        Console.log("[69sh] detail warm index p1 chapters=" + list.length);
    }
}

function prewarmTocPagesForUpdate(bookId, pageList) {
    if (!bookId || !pageList || pageList.length === 0) return;
    if (!shouldSkipDetailRefresh(bookId)) return;
    var ut = getBookUpdateTime(bookId);
    var max = pageList.length;
    if (max > _PREWARM_MAX_PAGES) max = _PREWARM_MAX_PAGES;
    var warmed = 0;
    for (var i = 0; i < max; i++) {
        var pageUrl = pageList[i];
        var cached = getTocPageCache(pageUrl);
        if (cached && cached.chapters && cached.chapters.length > 0 && ut && cached.updateTime === ut) {
            continue;
        }
        var doc = fetchCFOnce(pageUrl);
        if (!doc || !isValidIndexDoc(doc)) continue;
        var list = parseChapterList(doc, BASE_URL);
        if (list.length === 0) continue;
        setTocPageCache(pageUrl, list);
        warmed++;
    }
    if (warmed > 0) {
        Console.log("[PAGE] prewarm toc pages=" + warmed);
    }
}