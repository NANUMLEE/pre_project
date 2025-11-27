-- running_record 테이블 마이그레이션 스크립트
-- 기존 테이블을 새로운 스키마로 변경

USE Users;

-- 기존 데이터가 있으면 백업 생성
CREATE TABLE IF NOT EXISTS running_record_backup AS SELECT * FROM running_record;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS running_record;

-- 새로운 스키마로 테이블 생성
CREATE TABLE running_record (
    record_id VARCHAR(20) NOT NULL PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    distance_km DECIMAL(6,2) NOT NULL,
    pace_km DECIMAL(6,1) DEFAULT NULL,
    route LONGTEXT,
    start_point VARCHAR(255),
    via1_point VARCHAR(255) NULL,
    via2_point VARCHAR(255) NULL,
    via3_point VARCHAR(255) NULL,
    end_point VARCHAR(255),
    calories_kcal DECIMAL(10,2),
    duration_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 테이블 생성 확인
DESCRIBE running_record;
