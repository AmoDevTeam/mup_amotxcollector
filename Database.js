const mysql = require('promise-mysql');
const Logger = require('./Logger')
require('dotenv').config();

class Database {
    async init() {
        this.dbConfig = {
            host    : process.env.DB_HOST,
            user    : process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };

        try {
            this.connection = await mysql.createConnection(this.dbConfig);
            Logger.info('MySQL Connected...');
        } catch (err) {
            Logger.error(`MySQL 연결 오류:${err.message}`);
            throw err;
        }
    }

    async close() {
        try {
            await this.connection.end();
            Logger.info('MySQL 연결 해제됨.');
        } catch (err) {
            Logger.error(`MySQL 연결 해제 오류: ${err.message}`);
            throw err;
        }
    }

    async query(sql, args) {
        return this.connection.query(sql, args);
    }


    async insertTx(tx) {
        const sql = `INSERT INTO tb_amo_txs (
                        block_number, 
                        txid, 
                        from_address, 
                        to_address, 
                        value, 
                        timestamp
                    ) VALUES (
                        ?,
                        ?, 
                        ?, 
                        ?, 
                        ?, 
                        ?)
                    ON DUPLICATE KEY UPDATE id=id`;
        try {
            const params = [tx.blockNumber, tx.txid, tx.fromAddress, tx.toAddress, tx.value, tx.timestamp];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error(`insertTx Error: ${err.message}`);
            throw err;
        }
    }


    async bulkInsertTx(records) {
        const sql = `INSERT INTO tb_amo_txs (
                        block_number, 
                        txid, 
                        from_address, 
                        to_address, 
                        value, 
                        timestamp
                    ) VALUES ? 
                    ON DUPLICATE KEY UPDATE id=id`;
        try {
            return await this.query(sql, [records]);
        } catch (err) {
            Logger.error(`bulkInsertTx Error: ${err.message}`);
            throw err;
        }
    }

    // 수신 주소로 TRANSACTION 정보 찾기 (여러건 나올 수 있음)
    async getTxByToAddress(toAddress) {
        const sql = `
            SELECT id, block_number, txid, from_address, to_address, value, timestamp, created_at 
            FROM tb_amo_txs
            WHERE to_address = ?
            ORDER BY block_number DESC, timestamp DESC
        `;
        try {
            const params = [toAddress];
            const results = await this.query(sql, params);
            return results.length > 0 ? results : null;
        } catch (err) {
            Logger.error(`getTxByToAddress Error: ${err.message}`);
            throw err;
        }
    }        

    // TXID로 TRANSACTION 정보 찾기
    async getTxByTxid(txid) {
        const sql = `
            SELECT id, block_number, txid, from_address, to_address, value, timestamp, created_at 
            FROM tb_amo_txs
            WHERE txid = ?
        `;

        console.log('sql ===> ', sql);
        try {
            const params = [txid];
            const results = await this.query(sql, params);
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            Logger.error(`getTxByTxid Error: ${err.message}`);
            throw err;
        }
    }    


    // 임시 주소 입금 합계(SUM) 구하기
    async getTxSumValueByToAddress(toAddress) {
        const sql = `
            SELECT sum(value) AS sum_value
            FROM tb_amo_txs
            WHERE to_address = ?
        `;
        try {
            const params = [toAddress];
            const results = await this.query(sql, params);
            return results.length > 0 ? results[0].sum_value : null;
        } catch (err) {
            Logger.error(`getTxTotalValueByToAddress Error: ${err.message}`);
            throw err;
        }
    }        
}

module.exports = Database;