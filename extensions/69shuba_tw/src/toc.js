load('libs.js');
load('config.js');

function execute(url) {
    var t0 = Date.now();
    Console.log("[TOC] start: " + url);

    var indexUrl = resolveIndexUrl(url);
    var doc = fetchCFOnce(indexUrl);
    if (!doc || !isValidIndexDoc(doc)) {
        Console.log("[TOC] failed to load indexlist ms=" + (Date.now() - t0));
        return cfSessionError();
    }

    var list = parseChapterList(doc, BASE_URL);
    // Last index page can be a short remainder (or empty). Do not abort the
    // whole TOC after earlier pages already returned chapters.
    Console.log("[TOC] chapters: " + list.length + " ms=" + (Date.now() - t0));
    return Response.success(list);
}
