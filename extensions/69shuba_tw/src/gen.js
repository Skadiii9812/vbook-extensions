load('config.js');

function execute(url, page) {
    if (!url) return Response.error("Missing genre URL");
    if (!page) page = '1';

    url = url.replace("{{page}}", page);
    url = url.replace("http://", "https://");

    // App strips trailing slash — re-add it for 69shuba category URLs
    if (url.indexOf("?") === -1 && url.charAt(url.length - 1) !== "/") {
        url = url + "/";
    }

    Console.log("[GEN] Launching: " + url);

    var browser = Engine.newBrowser();
    var doc = null;
    try {
        browser.block(_BLOCK_ADS.concat(_BLOCK_HEAVY));
        browser.launchAsync(url);

        for (var i = 0; i < 30; i++) {
            sleep(500);
            doc = browser.html();
            if (doc) {
                var listItems = doc.select("table.list-item");
                if (listItems.size() > 0) {
                    Console.log("[GEN] Content loaded at attempt " + i + ", items: " + listItems.size());
                    break;
                }
            }
        }
        extractCookiesFromBrowser(browser);
    } finally {
        try { browser.close(); } catch (e) {}
        harvestCookieAfterBrowser();
    }

    if (doc) {
        var list = [];
        var items = doc.select("table.list-item");

        for (var j = 0; j < items.size(); j++) {
            var item = items.get(j);

            var titleEl = item.select("div.article a").first();
            var imgEl = item.select("img").first();
            var authorEl = item.select("p.fs12.gray span.mr15").first();
            var introEl = item.select("div.article a").last();

            if (titleEl && imgEl) {
                var name = titleEl.text().trim() + "";
                var link = titleEl.attr("href") + "";
                var cover = imgEl.attr("src") + "";
                if (cover.indexOf("//") === 0) cover = "https:" + cover;
                var author = authorEl ? (authorEl.text() + "").replace(/作者[:：]/, "").trim() : "";
                var description = introEl ? (introEl.text() + "").trim() : "";

                if (link.indexOf("/") === 0) {
                    link = BASE_URL + link;
                }

                list.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: author ? author : description,
                    host: BASE_URL
                });
            }
        }

        var next = null;
        var nextEl = doc.select("div.index-container a").last();
        if (nextEl && (nextEl.text() + "").indexOf("下一页") !== -1) {
            next = nextEl.attr("href") + "";
            if (next.indexOf("/") === 0) {
                next = BASE_URL + next;
            }
        }

        return Response.success(list, next);
    }

    return Response.error("Cannot load genre list");
}
