load('libs.js');
load('config.js');

function execute(url) {
    Console.log("[PAGE] === START PROCESSING (BROWSER MODE) ===");
    Console.log("[PAGE] Input URL: " + url);

    url = url.replace("http://", "https://");

    // 1. Convert URL to indexlist safely (Supports old URLs from /txt/ or /book/)
    let indexUrl = url;
    let bookIdMatch = url.match(/\/(?:book|txt|indexlist)\/(\d+)/);
    if (bookIdMatch && bookIdMatch[1]) {
        indexUrl = "https://69shuba.tw/indexlist/" + bookIdMatch[1] + "/";
    }

    // 2. USE BROWSER INSTEAD OF FETCH
    let browser = Engine.newBrowser();

    browser.launchAsync(indexUrl);

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

    // Close browser to free memory
    browser.close();

    if (doc) {
        let pageList = [];

        // Selector options (Supports both PC and Mobile layouts)
        let options = doc.select("#indexselect-top option, #indexselect option");

        for (let i = 0; i < options.size(); i++) {
            let e = options.get(i);
            let value = e.attr("value") + "";
            if (value) {
                if (value.startsWith("/")) {
                    value = "https://69shuba.tw" + value;
                }
                pageList.push(value);
            }
        }

        // If pagination is not found (short story or only 1 page)
        if (pageList.length === 0) {
            pageList.push(indexUrl);
        }

        Console.log("[PAGE] Returned result: " + pageList.length + " pages.");
        return Response.success(pageList);
    }
    return null;
}