const KasApi = require('./KasApi.js');

async function collectorMain() {
    let kasApi = new KasApi();
    while (1) {
        // 요청 api 실행 - 이전 커서 사용
        await kasApi.getTxList(true); 

        // 스케쥴러 실행 간격 지정
        await new Promise(resolve => setTimeout(resolve, process.env.REQUEST_INTERVAL));
    }
}

collectorMain();
