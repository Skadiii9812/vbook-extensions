// Derives the cover URL from the book link without any HTTP request.
// Pattern confirmed: https://p.69shuba.tw/{first3}/{bookId}/{bookId}s.jpg
// e.g. /book/344710/ → https://p.69shuba.tw/344/344710/344710s.jpg
function getCoverFromLink(link) {
    var match = /\/book\/(\d+)\/?/.exec(link);
    if (!match) return "";
    var bookId = match[1];
    var prefix = bookId.substring(0, 3);
    return "https://p.69shuba.tw/" + prefix + "/" + bookId + "/" + bookId + "s.jpg";
}

function execute(url) {
    if (!url) url = "https://69shuba.tw/";
    url = url.replace("http://", "https://");

    Console.log("[FEATURED] Launching: " + url);

    var browser = Engine.newBrowser();
    browser.launchAsync(url);

    var doc;
    for (var i = 0; i < 30; i++) {
        sleep(500);
        doc = browser.html();
        if (doc && doc.select("div.s_m").size() > 0) {
            Console.log("[FEATURED] Content loaded at attempt " + i);
            break;
        }
    }
    browser.close();
    sleep(1500); // Allow WebView to fully release before next browser session (toc.js)

    if (!doc) return Response.error("Failed to load homepage");


    var list = [];

    // Select only the first two div.s_m blocks (editorial sections: no div.more inside q_top)
    var sections = doc.select("div.s_m");
    var editorialCount = 0;

    for (var s = 0; s < sections.size(); s++) {
        if (editorialCount >= 2) break;
        var section = sections.get(s);

        // Skip genre sections — they have a "div.more" link
        if (section.select("div.q_top div.more").size() > 0) continue;
        editorialCount++;

        // 1. Featured book from div.sort_top
        var featuredEl = section.select("div.sort_top").first();
        if (featuredEl) {
            var titleEl = featuredEl.select("a.s_title").first();

            if (titleEl) {
                var name  = titleEl.text().trim() + "";
                var link  = (titleEl.attr("href") || "") + "";
                if (link && link.startsWith("/")) link = "https://69shuba.tw" + link;

                if (name && link) {
                    list.push({
                        name:        name,
                        link:        link,
                        cover:       getCoverFromLink(link),
                        description: "",
                        host:        "https://69shuba.tw"
                    });
                }
            }
        }

        // 2. Additional list items from div.s_list
        var listItems = section.select("div.s_list");
        for (var j = 0; j < listItems.size(); j++) {
            var itemEl   = listItems.get(j);
            var linkEl   = itemEl.select("a").first();
            if (!linkEl) continue;

            var itemName = linkEl.text().trim() + "";
            var itemLink = (linkEl.attr("href") || "") + "";
            if (itemLink && itemLink.startsWith("/")) itemLink = "https://69shuba.tw" + itemLink;

            if (itemName && itemLink) {
                list.push({
                    name:        itemName,
                    link:        itemLink,
                    cover:       getCoverFromLink(itemLink),
                    description: "",
                    host:        "https://69shuba.tw"
                });
            }
        }
    }

    if (list.length === 0) return Response.error("No featured items found");

    // No pagination for editorial section
    return Response.success(list, null);
}
