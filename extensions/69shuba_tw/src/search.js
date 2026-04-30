load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    
    // 69shuba search requires POST.
    // Inject cached CF cookie if available for resilience against CF blocks.
    var searchHeaders = {
        "Content-Type": "application/x-www-form-urlencoded"
    };
    var cfCookie = loadCookie();
    if (cfCookie) searchHeaders["Cookie"] = cfCookie;

    let response = fetch("https://69shuba.tw/search/", {
        method: "POST",
        headers: searchHeaders,
        body: "searchkey=" + encodeURIComponent(key) + "&searchtype=all"
    });

    if (response.ok) {
        let doc = response.html();
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
        
        return Response.success(list);
    }
    
    return null;
}
