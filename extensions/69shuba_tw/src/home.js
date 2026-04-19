function execute() {
    return Response.success([
        { title: "玄幻魔法", input: "https://69shuba.tw/fenlei/xuanhuan/{{page}}/", script: "gen.js" },
        { title: "武俠修真", input: "https://69shuba.tw/fenlei/wuxia/{{page}}/", script: "gen.js" },
        { title: "都市小說", input: "https://69shuba.tw/fenlei/dushi/{{page}}/", script: "gen.js" },
        { title: "歷史軍事", input: "https://69shuba.tw/fenlei/lishi/{{page}}/", script: "gen.js" },
        { title: "遊戲競技", input: "https://69shuba.tw/fenlei/youxi/{{page}}/", script: "gen.js" },
        { title: "科幻空間", input: "https://69shuba.tw/fenlei/kehu/{{page}}/", script: "gen.js" },
        { title: "言情小說", input: "https://69shuba.tw/fenlei/yanqing/{{page}}/", script: "gen.js" },
        { title: "同人小說", input: "https://69shuba.tw/fenlei/tongren/{{page}}/", script: "gen.js" }
    ]);
}
