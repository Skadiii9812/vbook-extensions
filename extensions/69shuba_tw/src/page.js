load('libs.js');
load('config.js');

function execute(url) {
    var t0 = Date.now();
    Console.log("[PAGE] start: " + url);
    url = (url || "").replace("http://", "https://");

    var bookIdMatch = url.match(/\/(?:book|indexlist)\/(\d+)/);
    var bookId = bookIdMatch && bookIdMatch[1] ? bookIdMatch[1] : "";
    var bookUrl = url;
    if (url.indexOf("/book/") < 0 && bookId) {
        bookUrl = BASE_URL + "/book/" + bookId + "/";
    }

    if (bookId && shouldSkipDetailRefresh(bookId)) {
        var utEarly = getBookUpdateTime(bookId);
        var cachedEarly = getPageListCache(bookId);
        if (cachedEarly && cachedEarly.pageUrls && cachedEarly.pageUrls.length > 0 && utEarly && cachedEarly.updateTime === utEarly) {
            Console.log("[PAGE] skip detail");
            prewarmTocPagesForUpdate(bookId, cachedEarly.pageUrls);
            Console.log("[PAGE] pages from cache: " + cachedEarly.pageUrls.length + " ms=" + (Date.now() - t0));
            return Response.success(cachedEarly.pageUrls);
        }
    }

    ensureCfReady();

    var forceCheck = bookId && !getBookUpdateTime(bookId);
    ensureTocCacheFresh(bookUrl, forceCheck, true);
    if (bookId && shouldSkipDetailRefresh(bookId)) {
        Console.log("[PAGE] skip detail");
    }

    var ut = getBookUpdateTime(bookId);
    var cachedPages = bookId ? getPageListCache(bookId) : null;
    if (cachedPages && cachedPages.pageUrls && cachedPages.pageUrls.length > 0 && ut && cachedPages.updateTime === ut) {
        prewarmTocPagesForUpdate(bookId, cachedPages.pageUrls);
        Console.log("[PAGE] pages from cache: " + cachedPages.pageUrls.length + " ms=" + (Date.now() - t0));
        return Response.success(cachedPages.pageUrls);
    }

    var indexUrl = resolveIndexUrl(url);
    var doc = fetchCFOnce(indexUrl);

    if (!doc || !isValidIndexDoc(doc)) {
        Console.log("[PAGE] failed to load indexlist ms=" + (Date.now() - t0));
        return Response.error("Cannot load indexlist");
    }

    var pageList = parseIndexPages(doc, indexUrl);
    if (bookId) {
        setPageListCache(bookId, pageList);
        var list = parseChapterList(doc, BASE_URL);
        if (list.length > 0) {
            setTocPageCache(indexUrl, list);
        }
    }
    prewarmTocPagesForUpdate(bookId, pageList);
    Console.log("[PAGE] pages fetched: " + pageList.length + " ms=" + (Date.now() - t0));
    return Response.success(pageList);
}
