load('libs.js');
load('config.js');

function execute(url) {
    var t0 = Date.now();
    Console.log("[PAGE] start: " + url);
    url = (url || "").replace("http://", "https://");

    var indexUrl = resolveIndexUrl(url);
    var doc = fetchCFOnce(indexUrl);

    if (!doc || !isValidIndexDoc(doc)) {
        Console.log("[PAGE] failed ms=" + (Date.now() - t0));
        return cfSessionError();
    }

    var pageList = parseIndexPages(doc, indexUrl);
    Console.log("[PAGE] pages fetched: " + pageList.length + " ms=" + (Date.now() - t0));
    return Response.success(pageList);
}
