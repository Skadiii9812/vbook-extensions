load('libs.js');
load('config.js');

function execute(url) {
    const HOST = "https://69shuba.tw";

    url = url.replace("http://", "https://");

    // Ensure chapter list is always fetched from indexlist page (Supports old URLs from /txt/ or /book/)
    if (url.indexOf("/indexlist/") === -1) {
        let bookIdMatch = url.match(/\/(?:book|txt)\/(\d+)/);
        if (bookIdMatch && bookIdMatch[1]) {
            url = "https://69shuba.tw/indexlist/" + bookIdMatch[1] + "/";
        }
    }

    var browser = Engine.newBrowser();
    browser.launchAsync(url);

    let doc;
    for (let i = 0; i < 30; i++) {
        sleep(250); // 0.25s sleep, max 7.5s. Balance between speed and stability.
        doc = browser.html();
        if (doc) {
            let title = doc.select("title").text() + "";
            let listItems = doc.select("#catalog ul li");
            if (listItems.size() === 0) listItems = doc.select("li");

            // Ensure Cloudflare is bypassed AND the page body has started rendering
            if (title && title.indexOf("69書吧") !== -1 && listItems.size() > 0) {
                break;
            }
        }
    }
    browser.close();

    if (doc) {
        Console.log("[TOC] Page title: " + doc.select("title").text());

        let list = [];
        let listItems = doc.select("#catalog ul li");
        if (listItems.size() === 0) {
            listItems = doc.select("li");
        }

        // --- FIND BOOK TITLE FOR FILTERING ---
        let bookTitle = "";
        let titleElement = doc.select("ul.last9 li.title a.back").first();
        if (!titleElement) {
            let pageTitle = doc.select("title").text() + "";
            let match = pageTitle.match(/《(.*?)》/);
            if (match && match[1]) bookTitle = match[1];
        } else {
            let text = titleElement.text() + "";
            let match = text.match(/《(.*?)》/);
            if (match && match[1]) bookTitle = match[1];
        }

        Console.log("[TOC] Book title found for filtering: '" + bookTitle + "'");

        for (let i = 0; i < listItems.size(); i++) {
            let li = listItems.get(i);

            // 1. Check title class
            let className = li.attr("class") + "";
            if (className && className.indexOf("title") !== -1) {
                continue;
            }

            let name = "";
            let link = "";
            let isProtected = false;

            // Use .select() because getElementsByClass threw an error in Rhino
            let protectedItem = li.select(".protected-chapter-link").first();

            // CSS selector fallback only if necessary
            if (!protectedItem) {
                protectedItem = li.select("[data-cid-url]").first();
            }

            if (protectedItem) {
                link = protectedItem.attr("data-cid-url") + "";
                name = protectedItem.text() + "";
                if (!name) name = protectedItem.attr("data-title") + "";
                isProtected = true;
            }

            if (!link || link.length === 0) {
                let a = li.select("a").first();
                if (a) {
                    link = a.attr("href") + "";
                    name = a.text() + "";
                }
            }

            if (link && link.length > 0) {
                if (link.startsWith("/")) {
                    link = HOST + link;
                }

                if (name) {
                    if (bookTitle && name.indexOf(bookTitle) !== -1) {
                        name = name.replace(bookTitle, "").trim();
                    }
                    name = name.trim();
                } else {
                    name = "Chapter " + (list.length + 1);
                }

                list.push({
                    name: name,
                    url: link,
                    host: HOST
                });
            }
        }

        Console.log("[TOC] Total chapters fetched: " + list.length);
        return Response.success(list);
    } else {
        Console.log("[TOC] Error loading page (Cloudflare or Timeout)");
    }

    return null;
}