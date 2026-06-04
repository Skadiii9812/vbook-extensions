load('libs.js');
load('config.js');

function execute(url) {
    url = url.replace("http://", "https://");
    var bookIdMatch = url.match(/\/book\/(\d+)/);
    var bookId = bookIdMatch && bookIdMatch[1] ? bookIdMatch[1] : "";

    if (bookId) {
        var cached = getDetailCache(bookId);
        var ut = getBookUpdateTime(bookId);
        if (cached && cached.name && ut && cached.updateTime === ut && isCfProbeRecent()) {
            Console.log("[69sh] detail cache hit bookId=" + bookId);
            return Response.success({
                name: cached.name,
                cover: cached.cover,
                host: cached.host || BASE_URL,
                author: cached.author,
                description: cached.description,
                detail: cached.detail,
                ongoing: cached.ongoing
            });
        }
    }

    ensureCfReady();
    var doc = fetchCFOnce(url);

    if (!doc) {
        return Response.error("Cannot load detail page");
    }

    var name = doc.select('meta[property="og:title"]').attr("content") + "";
    var cover = doc.select('meta[property="og:image"]').attr("content") + "";
    var author = doc.select('meta[property="og:novel:author"]').attr("content") + "";
    var type = doc.select('meta[property="og:novel:category"]').attr("content") + "";
    var status = doc.select('meta[property="og:novel:status"]').attr("content") + "";
    var updateTime = doc.select('meta[property="og:novel:update_time"]').attr("content") + "";
    var latestChap = doc.select('meta[property="og:novel:latest_chapter_name"]').attr("content") + "";
    var description = doc.select('meta[property="og:description"]').attr("content") + "";

    if (bookId && updateTime) {
        markBookDetailSynced(bookId, updateTime);
    }

    if (cover && cover.indexOf("//") === 0) {
        cover = "https:" + cover;
    }

    var ongoing = status.indexOf("連載") !== -1;
    var detailInfo = "類別: " + type + "<br>狀態: " + status + "<br>最新: " + latestChap + "<br>更新: " + updateTime;

    var result = {
        name: name,
        cover: cover,
        host: BASE_URL,
        author: author,
        description: description,
        detail: detailInfo,
        ongoing: ongoing
    };

    if (bookId) {
        setDetailCache(bookId, {
            name: name,
            cover: cover,
            host: BASE_URL,
            author: author,
            description: description,
            detail: detailInfo,
            ongoing: ongoing,
            updateTime: updateTime
        });
    }

    return Response.success(result);
}
