-- ====================================================================
-- Sinh viên: Nguyễn Đức Mạnh - Mã SV: B23DCCN532 - Lớp: B23CNPM06
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `iot_monitor` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `iot_monitor`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `action`;
DROP TABLE IF EXISTS `dataSensors`;
DROP TABLE IF EXISTS `devices`;
DROP TABLE IF EXISTS `sensors`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- 1. BẢNG users: Quản lý thông tin tài khoản & liên kết hồ sơ nộp bài
-- ====================================================================
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `student_id` VARCHAR(20) NOT NULL,
  `class_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `avatar_url` TEXT NULL,
  `github_link` VARCHAR(255) NULL,
  `figma_link` VARCHAR(255) NULL,
  `postman_link` VARCHAR(255) NULL,
  `report_link` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 2. BẢNG sensors: Quản lý danh mục các cảm biến phần cứng
-- ====================================================================
CREATE TABLE `sensors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sensor_code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `min_value` FLOAT NULL,
  `max_value` FLOAT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 3. BẢNG devices: Quản lý danh mục thiết bị ngoại vi điều khiển
-- ====================================================================
CREATE TABLE `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `pin` VARCHAR(10) NOT NULL,
  `current_state` ENUM('ON', 'OFF') DEFAULT 'OFF',
  `is_online` TINYINT(1) DEFAULT 1,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 4. BẢNG dataSensors: Lưu trữ bản ghi đo lường cảm biến theo thời gian
-- ====================================================================
CREATE TABLE `dataSensors` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NULL,
  `sensor_id` INT NOT NULL,
  `sensor_code` VARCHAR(20) NOT NULL,
  `sensor_name` VARCHAR(100) NOT NULL,
  `sensor_type` VARCHAR(50) NOT NULL,
  `value` FLOAT NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `recorded_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_datasensors_sensor` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_datasensors_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL,
  INDEX `idx_device_sensor_time` (`device_id`, `sensor_id`, `recorded_at`),
  INDEX `idx_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 5. BẢNG action: Lưu trữ nhật ký lịch sử điều khiển thiết bị
-- ====================================================================
CREATE TABLE `action` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `device_id` INT NOT NULL,
  `device_code` VARCHAR(20) NOT NULL,
  `device_name` VARCHAR(100) NOT NULL,
  `device_type` VARCHAR(50) NOT NULL,
  `operator_name` VARCHAR(100) NOT NULL DEFAULT 'Nguyễn Đức Mạnh',
  `action` ENUM('ON', 'OFF') NOT NULL,
  `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT') DEFAULT 'PENDING',
  `request_id` VARCHAR(36) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_action_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_action_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  INDEX `idx_device_created` (`device_id`, `created_at`),
  INDEX `idx_action_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- NẠP DỮ LIỆU BAN ĐẦU
-- ====================================================================

-- 1. Nạp hồ sơ sinh viên
INSERT INTO `users` (`id`, `full_name`, `student_id`, `class_name`, `email`, `avatar_url`, `github_link`, `figma_link`, `postman_link`, `report_link`)
VALUES (
  1, 
  'Nguyễn Đức Mạnh', 
  'B23DCCN532', 
  'B23CNPM06', 
  'manhnd.b23cn532@stu.ptit.edu.vn', 
  'https://lh3.googleusercontent.com/sample_avatar.png', 
  'https://github.com/ndmanh1811/iot-monitor', 
  'https://www.figma.com/design/FRr7TrQ7FZvDj4f9bnIoDc/IOT?node-id=0-1&t=VdPH1gQNDxw2ykH3-1', 
  'https://documenter.getpostman.com/view/55143373/2sBYHNY3qd', 
  'https://drive.google.com/file/d/1SSenW4ttSeO4YOU9HeKDHjw83YCqQW7s/view?usp=sharing'
);

-- 2. Nạp danh mục 3 cảm biến
INSERT INTO `sensors` (`id`, `sensor_code`, `name`, `unit`, `min_value`, `max_value`, `description`)
VALUES 
(1, '#TEMP-01', 'Nhiệt độ', '°C', -40.0, 80.0, 'Cảm biến đo nhiệt độ môi trường'),
(2, '#HUMI-01', 'Độ ẩm', '%', 0.0, 100.0, 'Cảm biến đo độ ẩm không khí'),
(3, '#LIGHT-01', 'Ánh sáng', 'lux', 0.0, 1024.0, 'Cảm biến quang trở đo cường độ ánh sáng');

-- 3. Nạp danh mục 3 thiết bị điều khiển
INSERT INTO `devices` (`id`, `device_code`, `name`, `type`, `pin`, `current_state`, `is_online`, `description`)
VALUES 
(1, '#LED-01', 'Đèn LED', 'led', 'GPIO5', 'ON', 1, 'Đèn chiếu sáng thông minh'),
(2, '#AC-01', 'Điều hòa', 'ac', 'GPIO12', 'OFF', 1, 'Điều hòa nhiệt độ phòng'),
(3, '#FAN-01', 'Quạt', 'fan', 'GPIO14', 'OFF', 0, 'Quạt thông gió tuần hoàn');

-- 4. Nạp dữ liệu đo lường cảm biến mẫu (Khớp với dữ liệu server.js đang chạy)
INSERT INTO `dataSensors` (`device_id`, `sensor_id`, `sensor_code`, `sensor_name`, `sensor_type`, `value`, `unit`, `recorded_at`) VALUES
(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 30.5, '°C', '2025-05-20 10:00:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 65.0, '%', '2025-05-20 10:00:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 450, 'lux', '2025-05-20 10:00:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 30.2, '°C', '2025-05-20 09:55:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 64.5, '%', '2025-05-20 09:55:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 430, 'lux', '2025-05-20 09:55:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 30.0, '°C', '2025-05-20 09:50:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 66.2, '%', '2025-05-20 09:50:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 415, 'lux', '2025-05-20 09:50:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 29.8, '°C', '2025-05-20 09:45:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 67.0, '%', '2025-05-20 09:45:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 390, 'lux', '2025-05-20 09:45:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 29.5, '°C', '2025-05-20 09:40:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 68.1, '%', '2025-05-20 09:40:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 375, 'lux', '2025-05-20 09:40:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 29.0, '°C', '2025-05-20 09:35:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 69.5, '%', '2025-05-20 09:35:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 360, 'lux', '2025-05-20 09:35:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 28.5, '°C', '2025-05-20 09:30:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 70.0, '%', '2025-05-20 09:30:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 350, 'lux', '2025-05-20 09:30:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 28.2, '°C', '2025-05-20 09:25:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 71.2, '%', '2025-05-20 09:25:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 330, 'lux', '2025-05-20 09:25:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 28.0, '°C', '2025-05-20 09:20:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 72.0, '%', '2025-05-20 09:20:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 310, 'lux', '2025-05-20 09:20:00'),

(1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', 27.5, '°C', '2025-05-20 09:10:00'),
(1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', 74.0, '%', '2025-05-20 09:10:00'),
(1, 3, '#LIGHT-01', 'Ánh sáng', 'light', 280, 'lux', '2025-05-20 09:10:00');

-- 5. Nạp nhật ký lịch sử điều khiển thiết bị mẫu (Full 100% người điều khiển là Nguyễn Đức Mạnh)
INSERT INTO `action` (`user_id`, `device_id`, `device_code`, `device_name`, `device_type`, `operator_name`, `action`, `status`, `request_id`, `created_at`) VALUES
(1, 1, '#LED-01', 'Đèn LED', 'led', 'Nguyễn Đức Mạnh', 'ON', 'SUCCESS', UUID(), '2025-05-20 10:00:15'),
(1, 2, '#AC-01', 'Điều hòa', 'ac', 'Nguyễn Đức Mạnh', 'ON', 'SUCCESS', UUID(), '2025-05-20 09:58:30'),
(1, 3, '#FAN-01', 'Quạt', 'fan', 'Nguyễn Đức Mạnh', 'ON', 'FAILED', UUID(), '2025-05-20 09:45:10'),
(1, 1, '#LED-01', 'Đèn LED', 'led', 'Nguyễn Đức Mạnh', 'OFF', 'SUCCESS', UUID(), '2025-05-20 09:30:00'),
(1, 2, '#AC-01', 'Điều hòa', 'ac', 'Nguyễn Đức Mạnh', 'OFF', 'PENDING', UUID(), '2025-05-20 09:15:42'),
(1, 3, '#FAN-01', 'Quạt', 'fan', 'Nguyễn Đức Mạnh', 'ON', 'SUCCESS', UUID(), '2025-05-20 09:00:20'),
(1, 1, '#LED-01', 'Đèn LED', 'led', 'Nguyễn Đức Mạnh', 'ON', 'SUCCESS', UUID(), '2025-05-20 08:30:00'),
(1, 2, '#AC-01', 'Điều hòa', 'ac', 'Nguyễn Đức Mạnh', 'ON', 'SUCCESS', UUID(), '2025-05-20 08:00:00'),
(1, 1, '#LED-01', 'Đèn LED', 'led', 'Nguyễn Đức Mạnh', 'OFF', 'SUCCESS', UUID(), '2025-05-20 07:30:00'),
(1, 3, '#FAN-01', 'Quạt', 'fan', 'Nguyễn Đức Mạnh', 'OFF', 'SUCCESS', UUID(), '2025-05-20 07:00:00');
