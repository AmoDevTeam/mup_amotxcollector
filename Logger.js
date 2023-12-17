const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;
const fs = require('fs');
const path = require('path');

// 로그 파일 디렉토리 경로 설정
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 로그 포맷 설정
const logFormat = printf(({ timestamp, level, message }) => {
  return `${timestamp} ${level}: ${message}`;
});

// 날짜별로 로그 파일 생성
const Logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(logDir, `${new Date().toISOString().slice(0, 10)}.log`),
      level: 'info', // 로그 레벨 설정 (info 이상의 로그만 저장)
    }),
  ],
});

module.exports = Logger;