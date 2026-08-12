var BASE_URL = "https://69shuba.tw";
try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
} catch (e) {}

// ============ Asset Blocking Lists ============
var _BLOCK_ADS = [
    "cn.macacusdame.com",
    "googletagmanager",
    "google-analytics",
    "cloudflareinsights"
];

var _BLOCK_HEAVY = [
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
    ".css", ".woff", ".woff2", ".ttf", ".eot"
];

// ============ Cloudflare Cookie Session (only cache we keep) ============
var _cfCookie = null;
var _cfUA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
var _CF_COOKIE_KEY = "69sh_cf";
var _CF_COOKIE_TS_KEY = "69sh_cf_ts";
var _GLOBAL_FETCH_MIN_MS = 400;
var _LAST_ANY_FETCH_KEY = "69sh_last_any_fetch";
var _CF_ERR = "Cloudflare session missing — open 69shuba.tw in app browser once";

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

function loadCookie() {
    if (_cfCookie) return _cfCookie;
    // Prefer localCookie — shares HttpOnly cf_clearance with app / WebView jar
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
    try {
        localStorage.removeItem(_CF_COOKIE_KEY);
        localStorage.removeItem(_CF_COOKIE_TS_KEY);
    } catch (e) {}
}

function cfSessionError() {
    return Response.error(_CF_ERR);
}

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

function extractCookiesFromBrowser(browser) {
    var cookie = "";
    // Prefer localCookie (HttpOnly cf_clearance) over document.cookie
    try { cookie = localCookie.getCookie() + ""; } catch (e) {}
    if (!cookie || cookie.length < 10) {
        try {
            browser.callJs("window._69shc = document.cookie;", 300);
            cookie = browser.getVariable("_69shc") + "";
        } catch (e2) {}
    }
    if (cookie && cookie.length > 5) {
        storeCookie(cookie);
    }
}

function harvestCookieAfterBrowser() {
    try {
        var lc = localCookie.getCookie() + "";
        if (lc && lc.length > 10) storeCookie(lc);
    } catch (e) {}
}

function buildFetchHeaders(extra) {
    var headers = {
        "User-Agent": _cfUA,
        "Accept": "text/html",
        "Accept-Language": "zh-TW,zh;q=0.9"
    };
    var cookie = loadCookie();
    if (cookie) headers["Cookie"] = cookie;
    if (extra) {
        for (var k in extra) {
            if (extra.hasOwnProperty(k)) headers[k] = extra[k];
        }
    }
    return headers;
}

// Always try fetch (CF assumed ready after user opens app browser).
// Only fail when response is a CF challenge / invalid doc.
function fetchFast(url, extraHeaders) {
    globalFetchWait();
    try {
        var res = fetch(url, { headers: buildFetchHeaders(extraHeaders) });
        if (res && res.ok) {
            var doc = res.html();
            if (doc && isValid69shDoc(doc, url)) {
                markGlobalFetch();
                return doc;
            }
            if (doc && isCfChallengeText(doc.text() + "")) {
                invalidateCookie();
            }
        }
    } catch (e) {}
    return null;
}

function fetchChapReadFast(url) {
    url = (url || "").replace("http://", "https://");
    if (url.indexOf("/read/") < 0) return null;
    var bookMatch = url.match(/\/read\/(\d+)\/(\d+)/);
    if (!bookMatch || !bookMatch[1]) return null;
    var referer = BASE_URL + "/book/" + bookMatch[1] + "/";
    return fetchFast(url, { "Referer": referer });
}

// Fetch-only chapter path — no WebView.
function fetchChapCF(url) {
    url = (url || "").replace("http://", "https://");
    if (url.indexOf("/read/") >= 0) {
        return fetchChapReadFast(url);
    }
    return fetchFast(url);
}

function waitForCfBrowser(browser, maxMs) {
    var elapsed = 0;
    var step = 250;
    var limit = maxMs !== undefined ? maxMs : 12000;
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

// Browser fallback for detail/page/toc only (not chap). Needed when fetch gets 403
// because Engine/WebView cookies often do not sync into localCookie for fetch().
function fetchBrowserCF(url, timeout) {
    var t = timeout !== undefined ? timeout : 12000;
    globalFetchWait();
    Console.log("[69sh] browser fallback url=" + url);
    var browser = Engine.newBrowser();
    var doc = null;
    try {
        browser.setUserAgent(UserAgent.android());
        browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
        browser.launch(url, t);
        doc = waitForCfBrowser(browser, 12000);
        if (doc && !isCfChallengeText(doc.text() + "") && isValid69shDoc(doc, url)) {
            extractCookiesFromBrowser(browser);
            markGlobalFetch();
        } else {
            doc = null;
        }
    } finally {
        try { browser.close(); } catch (e) {}
        harvestCookieAfterBrowser();
    }
    return doc;
}

function fetchCFOnce(url) {
    url = (url || "").replace("http://", "https://");
    var doc = null;
    if (url.indexOf("/indexlist/") >= 0) {
        var m = url.match(/\/indexlist\/(\d+)/);
        if (m && m[1]) {
            doc = fetchFast(url, { "Referer": BASE_URL + "/book/" + m[1] + "/" });
            if (doc) return doc;
        }
    }
    doc = fetchFast(url);
    if (doc) return doc;
    return fetchBrowserCF(url);
}

function fetchCF(url) {
    return fetchCFOnce(url);
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
