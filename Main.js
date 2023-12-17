const https = require('https');

require('dotenv').config();

function makeRequest() {
    console.log('makeRequest');
    const options = {
        hostname: 'th-api.klaytnapi.com',
        path: '/v2/transfer?kind=ft&size=100&presets=735',
        method: 'GET',
        headers: {
            'x-chain-id': '8217',
            'Authorization': 'Basic ' + Buffer.from(process.env.API_CREDENTIAL).toString('base64')
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);

        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.end();
}

// 최초 한 번 실행
makeRequest();

// 실행할 함수와 시간 간격(밀리초 단위)을 설정합니다. 2분 = 120000 밀리초
setInterval(makeRequest, 120000);