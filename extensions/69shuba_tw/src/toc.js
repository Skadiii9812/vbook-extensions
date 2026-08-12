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
    if (list.length === 0) {
        return Response.error("No chapters found");
    }

    Console.log("[TOC] chapters: " + list.length + " ms=" + (Date.now() - t0));
    return Response.success(list);
}
