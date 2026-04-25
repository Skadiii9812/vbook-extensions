load("config.js");

function execute(url) {
    var chapUrl = resolveUrl(url);
    // Use light fetch — blocks all images/CSS/fonts for max speed
    var doc = fetchCFLight(chapUrl);
    if (!doc) return Response.error("Lỗi tải nội dung chương");
    // Console.log("[CHAP] Fetched page 1: " + chapUrl);

    var el = selFirst(doc, ".chapter-content .content, .content, #BookText, #content");
    if (!el) return Response.error("Không tìm thấy nội dung chương");

    // Remove junk
    el.select("script, style, ins, iframe, .gadBlock, .adBlock, [data-ad], a, img").remove();
    // Remove "溫馨提示" and VIP blocks by finding their containers
    el.select("div:has(span:contains(溫馨提示)), div:has(p:contains(溫馨提示)), div:has(button:contains(點擊查看))").remove();

    var html = el.html() + "";
    if (!html || html.trim().length < 50) return Response.error("Nội dung chương trống");

    // Final regex cleanup for any remaining ad text
    html = html.replace(/溫馨提示[\s\S]*?(加入書架|等功能)/g, "");
    html = html.replace(/&nbsp;/g, " ");

    // --- Multi-page support: read total pages from h1 title e.g. "(1/2)" ---
    var totalPages = 1;
    var currentPage = 1;
    var h1El = selFirst(doc, ".chapter-content h1");
    if (h1El) {
        var h1Text = h1El.text() + "";
        var pageMatch = /\((\d+)\/(\d+)\)/.exec(h1Text);
        if (pageMatch) {
            currentPage = parseInt(pageMatch[1]);
            totalPages = parseInt(pageMatch[2]);
        }
    }
    // Console.log("[CHAP] Detected page " + currentPage + " of " + totalPages);

    // Only merge if we are on page 1
    if (currentPage === 1 && totalPages > 1) {
        // Build base URL by stripping .html
        var baseUrl = chapUrl.endsWith(".html") ? chapUrl.slice(0, chapUrl.length - 5) : chapUrl;

        for (var p = 2; p <= totalPages; p++) {
            var nextUrl = baseUrl + "_" + p + ".html";

            var doc2 = fetchCFLight(nextUrl);
            if (!doc2) {
                // Console.log("[CHAP] Failed to fetch page " + p + ": " + nextUrl);
                continue;
            }
            // Console.log("[CHAP] Fetched page " + p + ": " + nextUrl);

            var el2 = selFirst(doc2, ".chapter-content .content, .content, #BookText, #content");
            if (!el2) continue;

            el2.select("script, style, ins, iframe, .gadBlock, .adBlock, [data-ad], a, img").remove();
            el2.select("div:has(span:contains(溫馨提示)), div:has(p:contains(溫馨提示)), div:has(button:contains(點擊查看))").remove();

            var html2 = el2.html() + "";
            if (!html2 || html2.trim().length < 50) continue;

            html2 = html2.replace(/溫馨提示[\s\S]*?(加入書架|等功能)/g, "");
            html2 = html2.replace(/&nbsp;/g, " ");

            html = html + "<br>" + html2;
        }
    }

    return Response.success(html);
}
