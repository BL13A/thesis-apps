-- TileVision MySQL schema
-- Run this in MySQL Workbench (no Docker required)

CREATE DATABASE IF NOT EXISTS tilevision
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tilevision;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(128) NOT NULL,
  employee_id VARCHAR(64) NULL,
  mobile_number VARCHAR(32) NULL,
  department VARCHAR(128) NULL,
  account_status VARCHAR(32) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inspections (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  date VARCHAR(32) NOT NULL,
  batch_id VARCHAR(64) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  tile_type VARCHAR(255) NOT NULL,
  tile_size VARCHAR(64) NOT NULL,
  quantity VARCHAR(32) NOT NULL,
  expected_dimension VARCHAR(64) NOT NULL,
  image_uri TEXT NULL,
  result VARCHAR(32) NOT NULL,
  defect_type VARCHAR(128) NOT NULL,
  confidence_score DOUBLE NOT NULL,
  size_validation VARCHAR(32) NOT NULL DEFAULT 'Valid',
  inventory_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
  inspected_by VARCHAR(64) NOT NULL,
  inspected_by_name VARCHAR(255) NOT NULL,
  qa_status VARCHAR(32) NOT NULL DEFAULT 'None',
  qa_remarks TEXT NULL,
  reviewed_by VARCHAR(255) NULL,
  reviewed_at VARCHAR(32) NULL,
  CONSTRAINT fk_inspections_inspected_by
    FOREIGN KEY (inspected_by) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX idx_inspections_inspected_by (inspected_by),
  INDEX idx_inspections_date (date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL,
  related_id VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_created (created_at),
  INDEX idx_notifications_type (type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS push_tokens (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  platform VARCHAR(16) NULL,
  updated_at VARCHAR(32) NOT NULL,
  UNIQUE KEY uk_expo_push_token (expo_push_token),
  CONSTRAINT fk_push_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_push_tokens_user (user_id)
) ENGINE=InnoDB;
