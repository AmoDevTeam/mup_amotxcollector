const mysql = require('promise-mysql');
const Logger = require('./Logger')
require('dotenv').config();

class Database {
    async init() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };

        try {
            this.connection = await mysql.createConnection(this.dbConfig);
            Logger.info('MySQL Connected...');
        } catch (err) {
            Logger.error(`MySQL 연결 오류:${err}`);
            process.exit(1);
        }
    }

    async close() {
        try {
            await this.connection.end();
            Logger.info('MySQL 연결 해제됨.');
        } catch (err) {
            Logger.error(`MySQL 연결 해제 오류: ${err}`);
            throw err;
        }
    }

    async beginTransaction() {
        await this.connection.beginTransaction();
    }

    async commitTransaction() {
        await this.connection.commit();
    }    

    async rollbackTransaction() {
        await this.connection.rollback();
    }

    async query(sql, args) {
        return this.connection.query(sql, args);
    }

    async insertVaAcctLog(data) {
        const sql = `
            INSERT INTO tb_service_vacctlogs (
                sysid        , org_c     , tgrm_dsc   , tr_dsc        , 
                tr_dt        , tr_tm     , tr_natv_no , bnk_c         , 
                giro_c       , ocu_dsc   , ir_saf_dsc , med_dsc       , 
                ddl_dsc      , rv_bnk_c  , rv_acno    , drw_bnk_c     , 
                drw_dprnm    , tram      , obc_tram   , csh_tram      , 
                retry_yn     , aut_crc_yn, is_canceled, process_status,
                cancel_status
            ) VALUES (
                ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, ?, ?,
                ?
            )
        `;
        try {
            const params = [
                data.sysid    , data.org_c     , data.tgrm_dsc  , data.tr_dsc   , 
                data.tr_dt    , data.tr_tm     , data.tr_natv_no, data.bnk_c    , 
                data.giro_c   , data.ocu_dsc   , data.ir_saf_dsc, data.med_dsc  , 
                data.ddl_dsc  , data.rv_bnk_c  , data.rv_acno   , data.drw_bnk_c, 
                data.drw_dprnm, data.tram      , data.obc_tram  , data.csh_tram , 
                data.retry_yn , data.aut_crc_yn, 0              , 0             ,
                0
            ];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('insertVaAcctLog Error: ', err);
            throw err;
        }
    }    

    async getAccountHolder(bankCode, accountNumber) {
        const sql = `
            SELECT account_holder
            FROM tb_service_banks
            WHERE bank_code = ? 
            AND account_number = ? 
            AND in_use = 1 
            AND account_holder IS NOT NULL 
            AND account_holder <> ''
            ORDER BY update_dt DESC
            LIMIT 1
        `;
        try {
            const params = [bankCode, accountNumber.toString()];
            const results = await this.query(sql, params);
            return results.length > 0 ? results[0].account_holder : null;
        } catch (err) {
            Logger.error('getAccountHolder Error: ', err);
            throw err;
        }
    }    

    async getServiceBankInfo(bankCode, accountNumber) {
        const sql = `
            SELECT account_holder, service_id
            FROM tb_service_banks
            WHERE bank_code + '' = ? 
            AND account_number + '' = ? 
            AND in_use = 1 
            AND account_holder IS NOT NULL 
            AND account_holder <> ''
            ORDER BY update_dt DESC
            LIMIT 1
        `;

        try {
            const params = [bankCode, accountNumber];
            const results = await this.query(sql, params);
            return results.length > 0 ? results[0] : null; // 여기를 수정하여 전체 결과 객체를 반환합니다.
        } catch (err) {
            Logger.error('getServiceBankInfo Error: ', err);
            throw err;
        }
    }    

    async checkDepositRecordExists(trDt, trNatvNo) {
        const sql = `
            SELECT COUNT(*) as count
            FROM tb_service_vacctlogs
            WHERE tr_dt = ? 
            AND tr_natv_no = ?
        `;
        try {
            const params = [trDt, trNatvNo];
            const result = await this.query(sql, params);
            return result[0].count > 0;
        } catch (err) {
            Logger.error('checkDepositRecordExists Error:', err);
            throw err;
        }
    }

    async getDepositRecordStatus(trDt, trNatvNo) {
        const sql = `
            SELECT id, is_canceled, process_status, cancel_status
            FROM tb_service_vacctlogs
            WHERE tr_dt = ? 
            AND tr_natv_no = ?
        `;
        try {
            const params = [trDt, trNatvNo];
            const result = await this.query(sql, params);
            return result[0];
        } catch (err) {
            Logger.error('checkDepositRecordExists Error:', err);
            throw err;
        }
    }    

    async getDepositRecordId(trDt, trNatvNo) {
        const sql = `
            SELECT id
            FROM tb_service_vacctlogs
            WHERE tr_dt = ? 
            AND tr_natv_no = ?
            LIMIT 1
        `;
        try {
            const params = [trDt, trNatvNo];
            const result = await this.query(sql, params);
            return result.length > 0 ? result[0].id : null;
        } catch (err) {
            Logger.error('getDepositRecordId Error:', err);
            throw err;
        }
    }    

    async insertServiceCharge(data) {
        const sql = `
            INSERT INTO tb_service_charges (
                service_id, account_holder, credit_charge, charge, 
                wallet    , vacctlog_id   , is_canceled
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        try {
            const params = [
                data.serviceId, data.accountHolder, data.creditCharge, data.charge, 
                data.wallet, data.vacctlogId, data.isCanceled
            ];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('insertServiceCharge ERROR:', err);
            throw err;
        }
    }    

    async cancelDepositRecord(vacctlogId) {
        const sql = `
            UPDATE tb_service_vacctlogs
            SET is_canceled = 1
            WHERE id = ?
        `;
        try {
            const params = [vacctlogId];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('cancelDepositRecord ERROR:', err);
            throw err;
        }
    }    

    async processConfirmDepositRecord(vacctlogId) {
        const sql = `
            UPDATE tb_service_vacctlogs
            SET process_status = 1, 
                is_canceled = 0,
                cancel_status = 0
            WHERE id = ?
        `;
        try {
            const params = [vacctlogId];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('cancelDepositRecord ERROR:', err);
            throw err;
        }
    }   

    async cancelComfirmDepositRecord(vacctlogId) {
        const sql = `
            UPDATE tb_service_vacctlogs
            SET cancel_status = 1
            WHERE id = ?
            AND is_canceled = 1
        `;
        try {
            const params = [vacctlogId];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('cancelDepositRecord ERROR:', err);
            throw err;
        }
    }      

    async getWalletBalance(serviceId) {
        const sql = `
            SELECT wallet
            FROM tb_services
            WHERE service_id = ?
        `;
        try {
            const params = [serviceId];
            const result = await this.connection.query(sql, params);
            return result.length > 0 ? result[0].wallet : null;
        } catch (err) {
            Logger.error('getWalletBalance ERROR:', err);
            throw err;
        }
    }

    async increaseWalletBalance(serviceId, depositAmount) {
        const sql = `
            UPDATE tb_services
            SET wallet = wallet + ?
            WHERE service_id = ?
        `;
        try {
            const params = [depositAmount, serviceId];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('increaseWalletBalance ERROR:', err);
            throw err;
        }
    }

    async decreaseWalletBalance(serviceId, cancelAmount) {
        const sql = `
            UPDATE tb_services
            SET wallet = wallet - ?
            WHERE service_id = ?
        `;
        try {
            const params = [cancelAmount, serviceId];
            return await this.query(sql, params);
        } catch (err) {
            Logger.error('decreaseWalletBalance ERROR:', err);
            throw err;
        }
    }

    async getTransactionSummaryByDate(totDt) {
        // 입금건의 경우 취소처리건도 포함해서 건수와 합계를 구해서 보내야 함.
        const sql = `
            SELECT 
            COALESCE(SUM(CASE WHEN is_canceled = 0 OR is_canceled = 1 THEN 1 ELSE 0 END), 0) AS normal_count,
            COALESCE(SUM(CASE WHEN is_canceled = 0 OR is_canceled = 1 THEN tram ELSE 0 END), 0) AS normal_total,
            COALESCE(SUM(CASE WHEN is_canceled = 1 THEN 1 ELSE 0 END), 0) AS cancel_count,
            COALESCE(SUM(CASE WHEN is_canceled = 1 THEN tram ELSE 0 END), 0) AS cancel_total        
            FROM tb_service_vacctlogs
            WHERE tr_dt = ?
        `;

        try {
            const params = [totDt];
            const result = await this.query(sql, params);
            return result[0];
        } catch (err) {
            Logger.error('getTransactionSummaryByDate Error:', err);
            throw err;
        }
    }
}

module.exports = Database;