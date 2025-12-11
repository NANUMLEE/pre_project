-- Users 데이터베이스에서 테이블 생성
USE Users;

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    gender VARCHAR(10),
    age INT,
    height_cm INT,
    weight_kg INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- running_record 테이블 생성
CREATE TABLE IF NOT EXISTS running_record (
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
);

-- 테이블 생성 확인
SHOW TABLES;
DESCRIBE users;
DESCRIBE running_record;
