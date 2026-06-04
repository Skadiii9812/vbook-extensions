load('config.js');

function execute(key, page) {
    if (!page) page = '1';

    ensureCfReady();
    var searchHeaders = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": _cfUA,
        "Accept-Language": "zh-TW,zh;q=0.9"
    };
    var cfCookie = loadCookie();
    if (cfCookie) searchHeaders["Cookie"] = cfCookie;

    let response = fetch(BASE_URL + "/search/", {
        method: "POST",
        headers: searchHeaders,
        body: "searchkey=" + encodeURIComponent(key) + "&searchtype=all"
    });

    if (response.ok) {
        let doc = response.html();
        if (!doc || !isValid69shDoc(doc, BASE_URL + "/search/")) {
            return Response.error("Cannot load search — Cloudflare session expired");
        }
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
                if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
                let author = authorEl ? authorEl.text().replace(/作者[:：]/, "").trim() : "";
                let description = introEl ? introEl.text().trim() : "";
                
                if (link.startsWith("/")) {
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
        
        return Response.success(list);
    }
    
    return Response.error("Search request failed");
}
