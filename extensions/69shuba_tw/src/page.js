load('libs.js');
load('config.js');

function execute(url) {
    Console.log("[PAGE] start: " + url);

    ensureTocCacheFresh(url);

    var indexUrl = resolveIndexUrl(url);
    var doc = fetchCF(indexUrl);

    if (!doc || !isValidIndexDoc(doc)) {
        Console.log("[PAGE] failed to load indexlist");
        return Response.error("Cannot load indexlist");
    }

    var pageList = parseIndexPages(doc, indexUrl);
    Console.log("[PAGE] pages: " + pageList.length);
    return Response.success(pageList);
}
