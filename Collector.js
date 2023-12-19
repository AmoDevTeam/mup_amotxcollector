const KasApi = require('./KasApi.js');

// 현재 시점부터 전부 이전의 기록 전부 다 가져올 때 사용함.
// 평소에는 딱히 사용할 필요가 없으며, 최초에 초기화할 때만 사용하면 됨.
async function collectorMain() {
    let kasApi = new KasApi();
    while (!KasApi.checkEnded()) {
        // 요청 api 실행 - 이전 커서 사용
        await kasApi.getTxList(true); 

        // 스케쥴러 실행 간격 지정
        await new Promise(resolve => setTimeout(resolve, process.env.REQUEST_INTERVAL));
    }
}

collectorMain();
