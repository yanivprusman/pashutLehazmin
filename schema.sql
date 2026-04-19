CREATE DATABASE IF NOT EXISTS pashut_lehazmin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'pashut_lehazmin'@'localhost' IDENTIFIED BY 'pashut_lehazmin_dev';
GRANT ALL PRIVILEGES ON pashut_lehazmin.* TO 'pashut_lehazmin'@'localhost';
FLUSH PRIVILEGES;

USE pashut_lehazmin;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chain ENUM('shufersal','ramilevi') NOT NULL,
  store_id VARCHAR(20) NOT NULL,
  item_code VARCHAR(40) NOT NULL,
  item_name VARCHAR(500) NOT NULL,
  manufacturer VARCHAR(200),
  unit_of_measure VARCHAR(50),
  quantity DECIMAL(10,3),
  unit_price DECIMAL(10,2),
  item_price DECIMAL(10,2) NOT NULL,
  is_weighted BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP NOT NULL,
  UNIQUE KEY uq_chain_store_item (chain, store_id, item_code),
  KEY idx_chain_itemcode (chain, item_code),
  KEY idx_name (item_name(100))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shopping_sessions (
  id VARCHAR(40) PRIMARY KEY,
  raw_list TEXT,
  parsed_items JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS baskets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(40) NOT NULL,
  strategy ENUM('single_cheapest','split_cheapest') NOT NULL,
  chain ENUM('shufersal','ramilevi','mixed') NOT NULL,
  items JSON,
  items_total DECIMAL(10,2),
  delivery_fee DECIMAL(10,2),
  grand_total DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES shopping_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_preferences (
  session_id VARCHAR(40) PRIMARY KEY,
  preferences JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES shopping_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feed_ingest_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chain ENUM('shufersal','ramilevi') NOT NULL,
  store_id VARCHAR(20) NOT NULL,
  source_filename VARCHAR(200),
  items_upserted INT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  status ENUM('running','ok','error') DEFAULT 'running',
  error_message TEXT
) ENGINE=InnoDB;
