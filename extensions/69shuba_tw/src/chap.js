load('libs.js');
load('config.js');

function execute(url) {
    url = url.replace("http://", "https://");

    // 69shuba chapter pages serve full static HTML — no browser needed.
    // fetchCF() uses cached CF cookie for instant lightweight fetch (~1-2s).
    // This is critical for bulk downloads: eliminates WebView RAM spikes
    // that previously caused random download hangs.
    var doc = fetchCF(url);

    if (doc) {
        doc.select(".hide720, .ads, .txtinfo, .reader-ad, script").remove();

        // Get content from #nr1 tag
        let content = doc.select("#nr1").html() + "";

        if (content) {
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
                .replace(/<br\s*\/?>|\n/g, "<br><br>");

            return Response.success(content);
        }
    }
    return null;
}