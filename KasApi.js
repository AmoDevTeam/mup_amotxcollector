const https = require('https');
const Logger = require('./Logger')
const Database = require('./Database')

require('dotenv').config();

const AMO_CONTRACT_ADDRESS  = '0x6e6c55ac20c41669261969089fad7f7fcd9ba690';
const QUERY_SIZE            = 500;   // 한 번에 가져올 개수
const PRESET                = 735; // KAS(KLAYTN API SERVICE)에 등록되어 있는 조회할 contract 정보 

class KasApi {
    static cursor;

    constructor() {
        KasApi.cursor = null;
    }

    static checkEnded() {
        return (!KasApi.cursor || KasApi.cursor === '');
    }

    async getTxList(cursorFlag = false) {
        Logger.info('try request api');
        let path = `/v2/transfer?kind=ft&size=${QUERY_SIZE}&presets=${PRESET}`;
        if (cursorFlag && KasApi.cursor && KasApi.cursor !== '') {
            Logger.info(`USING CURSOR : ${KasApi.cursor}`);
            path += `&cursor=${encodeURIComponent(KasApi.cursor)}`;
        }

        const options = {
            hostname: 'th-api.klaytnapi.com',
            path: path,
            method: 'GET',
            headers: {
                'x-chain-id'   : '8217',
                'Authorization': 'Basic ' + Buffer.from(process.env.API_CREDENTIAL).toString('base64')
            }
        };

        const req = https.request(options, (res) => {
            let rawData = '';

            res.on('data', (chunk) => {
                rawData += chunk;
            });

            res.on('end', async () => {
                try {
                    Logger.info('received message');                
                    const dataJson = JSON.parse(rawData);
                    await this.saveResponse(dataJson);
                } catch (err) {
                    console.error(err);
                    Logger.error(err.message);
                }
            });
        });    

        req.on('error', (err) => {
            console.error(err);
            Logger.error(err.message);
        });

        req.end();
    }

    async saveResponse(txResponse) {
        try {
            let db = new Database();
            await db.init();

            try {
                const allRecords = [];

                // Collect all valid records
                txResponse.items.forEach(item => {
                    const transferType = item?.transferType;
                    const contractAddress = item?.contract?.address;

                    if (transferType === 'ft' && contractAddress === AMO_CONTRACT_ADDRESS) {
                        const blockNumber = item?.transaction?.blockNumber;
                        const txid = item?.transaction?.transactionHash;
                        const timestamp = item?.transaction?.timestamp;
                        const fromAddress = item?.from;
                        const toAddress = item?.to;
                        const value = item?.formattedValue;

                        if (blockNumber && txid && timestamp && fromAddress && toAddress && value) {
                            allRecords.push([blockNumber, txid, fromAddress, toAddress, value, timestamp]);
                        }
                    }
                });

                // Bulk insert in batches of 100
                for (let i = 0; i < allRecords.length; i += 100) {
                    const batch = allRecords.slice(i, i + 100);
                    await db.bulkInsertTx(batch);
                }

                KasApi.cursor = txResponse.cursor;
                Logger.info(`RECEIVED CURSOR : ${KasApi.cursor}`);
            } catch (error) {
                console.log(error);
                Logger.error(`saveResponse exception #1: ${error.message}`);
            }

            await db.close();
        } catch (error) {
            console.log(error);
            Logger.error(`saveResponse exception #2: ${error.message}`);
        }
    }
}


module.exports = KasApi;