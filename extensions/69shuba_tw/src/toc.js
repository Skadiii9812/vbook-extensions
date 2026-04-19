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
    for (let i = 0; i < 50; i++) {
        sleep(200); // Check every 0.2s for faster response
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
        // Try to find in the old Back button
        let titleElement = doc.select("ul.last9 li.title a.back").first();
        // Try to find in breadcrumb or page title
        if (!titleElement) {
            let pageTitle = doc.select("title").text() + ""; // Ex: 《Novel A》 Chapter 1...
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

            // 1. Check title class (Use attr to avoid hasClass error)
            let className = li.attr("class") + "";
            if (className && className.indexOf("title") !== -1) {
                continue;
            }

            let name = "";
            let link = "";
            let isProtected = false;

            // STEP 1: Find Hidden Link (Protected) - Logic for RAW HTML
            // In raw HTML, it is usually a span tag, not an 'a' tag
            let protectedItem = li.select(".protected-chapter-link").first();

            // Fallback: Find any tag with data-cid-url
            if (!protectedItem) {
                protectedItem = li.select("[data-cid-url]").first();
            }

            if (protectedItem) {
                link = protectedItem.attr("data-cid-url") + "";
                // Prioritize displayed text
                name = protectedItem.text() + "";
                // If text is empty (hidden by CSS), get data-title
                if (!name) name = protectedItem.attr("data-title") + "";
                isProtected = true;
            }

            // STEP 2: Find normal <a> tag (If step 1 yields no results)
            if (!link || link.length === 0) {
                let a = li.select("a").first();
                if (a) {
                    link = a.attr("href") + "";
                    name = a.text() + "";
                }
            }

            // --- FINAL DATA PROCESSING ---
            if (link && link.length > 0) {
                if (link.startsWith("/")) {
                    link = HOST + link;
                }

                // Clean Name: Remove book title
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