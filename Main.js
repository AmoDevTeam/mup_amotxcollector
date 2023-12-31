const KasApi = require('./KasApi.js');

async function main() {
    while (1) {
        // 요청 api 실행
        let kasApi = new KasApi();
        await kasApi.getTxList();

        // 스케쥴러 실행 간격 지정
        await new Promise(resolve => setTimeout(resolve, process.env.REQUEST_INTERVAL));
    }
}

main();
