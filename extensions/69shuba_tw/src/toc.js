load('libs.js');
load('config.js');

function execute(url) {
    Console.log("[TOC] start: " + url);

    var indexUrl = resolveIndexUrl(url);
    var bookIdMatch = indexUrl.match(/\/indexlist\/(\d+)/);
    var bookId = bookIdMatch && bookIdMatch[1] ? bookIdMatch[1] : "";
    if (bookId) {
        ensureTocCacheFresh(BASE_URL + "/book/" + bookId + "/", false);
    }

    var cached = getTocPageCache(indexUrl);
    var ut = getBookUpdateTime(bookId);
    if (cached && cached.chapters && cached.chapters.length > 0 && ut && cached.updateTime === ut && canUseTocCache()) {
        Console.log("[TOC] cache hit: " + cached.chapters.length);
        return Response.success(cached.chapters);
    }

    var doc = fetchCFThrottled(indexUrl);
    if (!doc || !isValidIndexDoc(doc)) {
        Console.log("[TOC] failed to load indexlist");
        if (bookId) invalidateTocCache(bookId);
        var errMsg = "Cannot load TOC";
        if (!isCfProbeRecent() || !loadCookie()) {
            errMsg = "Cloudflare session expired — open 69shuba.tw in app browser once";
        }
        return Response.error(errMsg);
    }

    var list = parseChapterList(doc, BASE_URL);
    if (list.length === 0) {
        return Response.error("No chapters found");
    }

    setTocPageCache(indexUrl, list);
    Console.log("[TOC] chapters: " + list.length);
    return Response.success(list);
}
