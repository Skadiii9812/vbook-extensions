load('libs.js');
load('config.js');

function execute(url) {
    var t0 = Date.now();
    Console.log("[TOC] start: " + url);

    var indexUrl = resolveIndexUrl(url);
    var bookIdMatch = indexUrl.match(/\/indexlist\/(\d+)/);
    var bookId = bookIdMatch && bookIdMatch[1] ? bookIdMatch[1] : "";

    var cached = getTocPageCache(indexUrl);
    var ut = getBookUpdateTime(bookId);
    if (cached && cached.chapters && cached.chapters.length > 0 && ut && cached.updateTime === ut) {
        Console.log("[TOC] cache hit: " + cached.chapters.length + " ms=" + (Date.now() - t0));
        return Response.success(cached.chapters);
    }

    if (bookId) {
        ensureTocCacheFresh(BASE_URL + "/book/" + bookId + "/", false);
    }

    cached = getTocPageCache(indexUrl);
    ut = getBookUpdateTime(bookId);
    if (cached && cached.chapters && cached.chapters.length > 0 && ut && cached.updateTime === ut) {
        Console.log("[TOC] cache hit: " + cached.chapters.length + " ms=" + (Date.now() - t0));
        return Response.success(cached.chapters);
    }

    Console.log("[TOC] fetch throttled");
    var doc = fetchCFThrottled(indexUrl);
    if (!doc || !isValidIndexDoc(doc)) {
        Console.log("[TOC] failed to load indexlist ms=" + (Date.now() - t0));
        if (bookId) invalidateTocCache(bookId);
        var errMsg = "Cannot load TOC";
        if (!canUseTocCache()) {
            errMsg = "Cloudflare session expired — open 69shuba.tw in app browser once";
        }
        return Response.error(errMsg);
    }

    if (bookId && isIndexlistPageOne(indexUrl)) {
        var pageList = parseIndexPages(doc, indexUrl);
        if (pageList.length > 0) {
            setPageListCache(bookId, pageList);
        }
    }

    var list = parseChapterList(doc, BASE_URL);
    if (list.length === 0) {
        return Response.error("No chapters found");
    }

    setTocPageCache(indexUrl, list);
    Console.log("[TOC] chapters: " + list.length + " ms=" + (Date.now() - t0));
    return Response.success(list);
}
