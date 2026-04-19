load('libs.js');
load('config.js');

function execute(url) {
    url = url.replace("http://", "https://");

    // Use Browser instead of fetch to bypass Cloudflare block
    var browser = Engine.newBrowser();
    browser.launchAsync(url);

    let doc;
    for (let i = 0; i < 20; i++) {
        sleep(1000);
        doc = browser.html();
        if (doc) {
            let content = doc.select("#nr1").html();
            // If chapter content is successfully loaded
            if (content && content.length > 0) {
                break;
            }
        }
    }
    browser.close();

    if (doc) {
        doc.select(".hide720, .ads, .txtinfo").remove();

        // 2. Get content from #nr1 tag
        let content = doc.select("#nr1").html() + "";

        if (content) {
            // 3. String processing (Regex clean text)
            content = content
                // Replace special whitespace characters
                .replace(/&nbsp;/g, " ")
                // Remove "End of chapter" lines
                .replace(/\(本章完\)/g, "")
                .replace(/（本章完）/g, "")
                // Remove web brand names (both Traditional and Simplified)
                .replace(/69書吧/g, "")
                .replace(/69书吧/g, "")
                .replace(/www\.69shuba\.tw/g, "")
                // Remove extra redundant lines if any
                .replace(/<p>.*?69shuba.*?<\/p>/g, "")
                // Standardize all line spacing
                // Ensure all <br>, <br/> tags, or newlines (\n) are converted to
                // exactly 2 <br><br> tags to create readable spacing on mobile.
                .replace(/<br\s*\/?>|\n/g, "<br><br>");

            return Response.success(content);
        }
    }
    return null;
}