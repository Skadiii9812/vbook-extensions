load('libs.js');
load('config.js');

function execute(url) {
    url = url.replace("http://", "https://");
    var doc = fetchCF(url);

    if (doc) {

        // --- GET DATA FROM META TAGS (Added + "" for Rhino data type safety) ---
        let name = doc.select('meta[property="og:title"]').attr("content") + "";
        let cover = doc.select('meta[property="og:image"]').attr("content") + "";
        let author = doc.select('meta[property="og:novel:author"]').attr("content") + "";
        let type = doc.select('meta[property="og:novel:category"]').attr("content") + "";
        let status = doc.select('meta[property="og:novel:status"]').attr("content") + "";
        let updateTime = doc.select('meta[property="og:novel:update_time"]').attr("content") + "";
        let latestChap = doc.select('meta[property="og:novel:latest_chapter_name"]').attr("content") + "";
        let description = doc.select('meta[property="og:description"]').attr("content") + "";

        // Handle image link (if https: is missing)
        if (cover && cover.startsWith("//")) {
            cover = "https:" + cover;
        }

        // Handle ongoing status (true if status contains "連載" - Serializing)
        let ongoing = status.indexOf("連載") !== -1;

        // Create detail info string (displays as subtitle on app)
        // Format: Author | Category | Status | Updated
        let detailInfo = `類別: ${type}<br>狀態: ${status}<br><br>最新: ${latestChap}更新: ${updateTime}`;

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
    return null;
}