function execute(url, page) {
    if (!url) return null;
    if (!page) page = '1';

    url = url.replace("{{page}}", page);
    url = url.replace("http://", "https://");
    
    // App strips trailing slash — re-add it for 69shuba category URLs
    if (url.indexOf("?") === -1 && url.charAt(url.length - 1) !== "/") {
        url = url + "/";
    }

    Console.log("[GEN] Launching: " + url);

    var browser = Engine.newBrowser();
    browser.launchAsync(url);
    
    var doc;
    for (let i = 0; i < 30; i++) {
        sleep(500);
        doc = browser.html();
        if (doc) {
            let listItems = doc.select("table.list-item");
            if (listItems.size() > 0) {
                Console.log("[GEN] Content loaded at attempt " + i + ", items: " + listItems.size());
                break;
            }
        }
    }
    browser.close();
    
    if (doc) {
        let list = [];
        let items = doc.select("table.list-item");
        
        for (let i = 0; i < items.size(); i++) {
            let item = items.get(i);
            
            let titleEl = item.select("div.article a").first();
            let imgEl = item.select("img").first();
            let authorEl = item.select("p.fs12.gray span.mr15").first();
            let introEl = item.select("div.article a").last();
            
            if (titleEl && imgEl) {
                let name = titleEl.text().trim();
                let link = titleEl.attr("href");
                let cover = imgEl.attr("src");
                if (cover.indexOf("//") === 0) cover = "https:" + cover;
                let author = authorEl ? authorEl.text().replace(/作者[:：]/, "").trim() : "";
                let description = introEl ? introEl.text().trim() : "";
                
                if (link.startsWith("/")) {
                    link = "https://69shuba.tw" + link;
                }
                
                list.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: author ? author : description,
                    host: "https://69shuba.tw"
                });
            }
        }
        
        // Pagination: VBook handles {{page}} injection automatically if we return the template URL
        // But we can also return the explicit next page URL.
        let next = "";
        let nextEl = doc.select("div.index-container a").last();
        if (nextEl && nextEl.text().indexOf("下一页") !== -1) {
            // If the next page is just incrementing the number, we can let VBook handle it
            // by returning the current url template if needed, but returning the actual URL is safer.
            next = nextEl.attr("href");
            if (next.startsWith("/")) {
                next = "https://69shuba.tw" + next;
            }
        }
        
        return Response.success(list, next);
    }
    
    return null;
}