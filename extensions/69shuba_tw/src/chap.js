load('libs.js');
load('config.js');

function execute(url) {
    var t0 = Date.now();
    url = url.replace("http://", "https://");
    Console.log("[CHAP] start: " + url);

    // /read/ chapters: v16 fetch→browser; per-book fetch disable; silent batch cooldown.
    var doc = fetchChapCF(url);

    if (!doc) {
        Console.log("[CHAP] fetch fail ms=" + (Date.now() - t0));
        return Response.error("Chapter load failed — open 69shuba.tw in app browser once, then retry");
    }

    doc.select(".hide720, .ads, .txtinfo, .reader-ad, script").remove();

    var content = doc.select("#nr1").html() + "";

    if (!content || content.trim().length < 50) {
        Console.log("[CHAP] empty #nr1 ms=" + (Date.now() - t0));
        return Response.error("Chapter content not found");
    }

    content = content
        .replace(/&nbsp;/g, " ")
        .replace(/\(本章完\)/g, "")
        .replace(/（本章完）/g, "")
        .replace(/69書吧/g, "")
        .replace(/69书吧/g, "")
        .replace(/www\.69shuba\.tw/g, "")
        .replace(/<p>.*?69shuba.*?<\/p>/g, "")
        .replace(/<br\s*\/?>|\n/g, "<br><br>");

    Console.log("[CHAP] ok len=" + content.length + " ms=" + (Date.now() - t0));
    return Response.success(content);
}
