-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS calendar;
USE calendar;

drop table if exists tasks;

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME NULL,
    task_day DATE NOT NULL COMMENT 'UTC日期，格式：YYYY-MM-DD',
    task_day_time TIME NOT NULL COMMENT 'UTC时间，格式：HH:mm:ss',
    is_recurring BOOLEAN DEFAULT FALSE COMMENT '是否为周期性任务',
    week_count INT DEFAULT 4 COMMENT '周期任务持续周数',
    original_task_id BIGINT NULL COMMENT '原始任务ID（用于关联周期性任务）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建索引
CREATE INDEX idx_task_day ON tasks(task_day);
CREATE INDEX idx_completed ON tasks(completed);
CREATE INDEX idx_is_recurring ON tasks(is_recurring);
CREATE INDEX idx_original_task_id ON tasks(original_task_id);