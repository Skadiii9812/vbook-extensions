load('libs.js');
load('config.js');

function execute(url) {
    url = url.replace("http://", "https://");
    var doc = fetchCF(url);

    if (!doc) {
        return Response.error("Cannot load detail page");
    }

    // --- GET DATA FROM META TAGS (Added + "" for Rhino data type safety) ---
    var name = doc.select('meta[property="og:title"]').attr("content") + "";
    var cover = doc.select('meta[property="og:image"]').attr("content") + "";
    var author = doc.select('meta[property="og:novel:author"]').attr("content") + "";
    var type = doc.select('meta[property="og:novel:category"]').attr("content") + "";
    var status = doc.select('meta[property="og:novel:status"]').attr("content") + "";
    var updateTime = doc.select('meta[property="og:novel:update_time"]').attr("content") + "";
    var latestChap = doc.select('meta[property="og:novel:latest_chapter_name"]').attr("content") + "";
    var description = doc.select('meta[property="og:description"]').attr("content") + "";

    var bookIdMatch = url.match(/\/book\/(\d+)/);
    if (bookIdMatch && bookIdMatch[1] && updateTime) {
        syncTocCacheValidity(bookIdMatch[1], updateTime);
    }

    if (cover && cover.indexOf("//") === 0) {
        cover = "https:" + cover;
    }

    var ongoing = status.indexOf("連載") !== -1;
    var detailInfo = "類別: " + type + "<br>狀態: " + status + "<br>最新: " + latestChap + "<br>更新: " + updateTime;

    return Response.success({
        name: name,
        cover: cover,
        host: BASE_URL,
        author: author,
        description: description,
        detail: detailInfo,
        ongoing: ongoing
    });
}