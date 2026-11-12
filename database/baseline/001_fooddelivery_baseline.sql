-- Food Delivery baseline v1: schema only, MySQL 8.0.46. No data or accounts.
-- Execute ONLY through tools/deployment/mysql_baseline.py after target approval.
-- Raw execution bypasses safety checks. No IF NOT EXISTS: partial installation must stop.

CREATE TABLE `customers` (
  `created_at` datetime(6) NOT NULL,
  `customer_id` bigint NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(15) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `UKrfbvkrffamfql7cjmen8v976v` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `restaurants` (
  `restaurant_status` bit(1) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `restaurant_id` bigint NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(15) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`restaurant_id`),
  UNIQUE KEY `UKfe6aq2gbudopv20yl6b77798m` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `drivers` (
  `drive_status` bit(1) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `driver_id` bigint NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(15) NOT NULL,
  `license_plate` varchar(20) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`driver_id`),
  UNIQUE KEY `UKre66mdta4hy6pxm2w1rqu08jv` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `food_items` (
  `item_id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(150) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payment_methods` (
  `is_active` bit(1) NOT NULL,
  `method_id` bigint NOT NULL AUTO_INCREMENT,
  `method_code` varchar(30) NOT NULL,
  `method_name` varchar(50) NOT NULL,
  PRIMARY KEY (`method_id`),
  UNIQUE KEY `UKpu3rxdcaus39di8g7s6xv4sk6` (`method_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `restaurant_food_items` (
  `is_available` bit(1) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `item_id` bigint NOT NULL,
  `restaurant_food_item_id` bigint NOT NULL AUTO_INCREMENT,
  `restaurant_id` bigint NOT NULL,
  PRIMARY KEY (`restaurant_food_item_id`),
  UNIQUE KEY `UKgkbdxkabiy3ijm702fqc7y7ci` (`restaurant_id`,`item_id`),
  KEY `FKoh4v7c17s0jry1so965x2yiy5` (`item_id`),
  CONSTRAINT `FK86eyfbft1xsjbbgtd9f2g9tv4` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `FKoh4v7c17s0jry1so965x2yiy5` FOREIGN KEY (`item_id`) REFERENCES `food_items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `carts` (
  `cart_id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint DEFAULT NULL,
  `restaurant_id` bigint DEFAULT NULL,
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `UK88sv4i13lo80s74ox7rsb5a2c` (`customer_id`),
  KEY `FK1wwmot9772p901aismub7pd5c` (`restaurant_id`),
  CONSTRAINT `FK1wwmot9772p901aismub7pd5c` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `FK8ba3sryid5k8a9kidpkvqipyt` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cart_items` (
  `quantity` int NOT NULL,
  `cart_id` bigint NOT NULL,
  `cart_item_id` bigint NOT NULL AUTO_INCREMENT,
  `restaurant_food_item_id` bigint NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`cart_item_id`),
  KEY `FKpcttvuq4mxppo8sxggjtn5i2c` (`cart_id`),
  KEY `FKog89jg3e4pp958ldf2dtk0jf2` (`restaurant_food_item_id`),
  CONSTRAINT `FKog89jg3e4pp958ldf2dtk0jf2` FOREIGN KEY (`restaurant_food_item_id`) REFERENCES `restaurant_food_items` (`restaurant_food_item_id`),
  CONSTRAINT `FKpcttvuq4mxppo8sxggjtn5i2c` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `orders` (
  `shipping_fee` decimal(12,2) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `order_id` bigint NOT NULL AUTO_INCREMENT,
  `restaurant_id` bigint DEFAULT NULL,
  `delivery_address` varchar(255) NOT NULL,
  `order_status` enum('CANCELLED','COMPLETED','CONFIRMED','DELIVERING','PENDING','PREPARING','READY') DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `FKpxtb8awmi0dk6smoh2vp1litg` (`customer_id`),
  KEY `FK2m9qulf12xm537bku3jnrrbup` (`restaurant_id`),
  CONSTRAINT `FK2m9qulf12xm537bku3jnrrbup` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `FKpxtb8awmi0dk6smoh2vp1litg` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `order_details` (
  `quantity` int NOT NULL,
  `subtotal` decimal(12,2) DEFAULT NULL,
  `unit_price` decimal(12,2) DEFAULT NULL,
  `order_detail_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint DEFAULT NULL,
  `restaurant_food_item_id` bigint DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`order_detail_id`),
  KEY `FKjyu2qbqt8gnvno9oe9j2s2ldk` (`order_id`),
  KEY `FKc5cccl4giure8wvnrwt4v5xdn` (`restaurant_food_item_id`),
  CONSTRAINT `FKc5cccl4giure8wvnrwt4v5xdn` FOREIGN KEY (`restaurant_food_item_id`) REFERENCES `restaurant_food_items` (`restaurant_food_item_id`),
  CONSTRAINT `FKjyu2qbqt8gnvno9oe9j2s2ldk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `deliveries` (
  `delivered_time` datetime(6) DEFAULT NULL,
  `delivery_id` bigint NOT NULL AUTO_INCREMENT,
  `driver_id` bigint DEFAULT NULL,
  `order_id` bigint DEFAULT NULL,
  `pickup_time` datetime(6) DEFAULT NULL,
  `delivery_status` enum('CANCELLED','DELIVERED','DELIVERING','PENDING','PICKED_UP') DEFAULT NULL,
  PRIMARY KEY (`delivery_id`),
  UNIQUE KEY `UKk36n9p5v7dd96hpgkwybvbogt` (`order_id`),
  KEY `FK8ateuqis5a8je9rimyvt1nmps` (`driver_id`),
  CONSTRAINT `FK7isx0rnbgqr1dcofd5putl6jw` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `FK8ateuqis5a8je9rimyvt1nmps` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payments` (
  `amount` decimal(12,2) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `order_id` bigint NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `payment_id` bigint NOT NULL AUTO_INCREMENT,
  `payment_method_id` bigint DEFAULT NULL,
  `refunded_at` datetime(6) DEFAULT NULL,
  `transaction_code` varchar(100) DEFAULT NULL,
  `payment_status` enum('CANCELLED','PENDING','REFUNDED','SUCCESS') DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `UK8vo36cen604as7etdfwmyjsxt` (`order_id`),
  KEY `FKce1n8pa67lq4l57l9mhugdgab` (`payment_method_id`),
  CONSTRAINT `FK81gagumt0r8y3rmudcgpbk42l` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `FKce1n8pa67lq4l57l9mhugdgab` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`method_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ratings` (
  `rating_score` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `rating_id` bigint NOT NULL AUTO_INCREMENT,
  `restaurant_id` bigint DEFAULT NULL,
  `comment` text,
  PRIMARY KEY (`rating_id`),
  KEY `FKb0aai9hp9gtd2don8c08qxn3y` (`customer_id`),
  KEY `FKntiwrmxidegn417oxunmtnjpa` (`restaurant_id`),
  CONSTRAINT `FKb0aai9hp9gtd2don8c08qxn3y` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `FKntiwrmxidegn417oxunmtnjpa` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `accounts` (
  `account_id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `customer_id` bigint DEFAULT NULL,
  `restaurant_id` bigint DEFAULT NULL,
  `driver_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `password_changed_at` datetime(6) DEFAULT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_accounts_email` (`email`),
  UNIQUE KEY `uq_accounts_customer` (`customer_id`),
  UNIQUE KEY `uq_accounts_restaurant` (`restaurant_id`),
  UNIQUE KEY `uq_accounts_driver` (`driver_id`),
  CONSTRAINT `fk_accounts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `fk_accounts_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`),
  CONSTRAINT `fk_accounts_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `ck_accounts_email_normalized` CHECK ((`email` = lower(trim(`email`)))),
  CONSTRAINT `ck_accounts_profile` CHECK ((((`role` = _utf8mb4'CUSTOMER') and (`customer_id` is not null) and (`restaurant_id` is null) and (`driver_id` is null)) or ((`role` = _utf8mb4'RESTAURANT') and (`restaurant_id` is not null) and (`customer_id` is null) and (`driver_id` is null)) or ((`role` = _utf8mb4'DRIVER') and (`driver_id` is not null) and (`customer_id` is null) and (`restaurant_id` is null)) or ((`role` = _utf8mb4'ADMIN') and (`customer_id` is null) and (`restaurant_id` is null) and (`driver_id` is null)))),
  CONSTRAINT `ck_accounts_role` CHECK ((`role` in (_utf8mb4'CUSTOMER',_utf8mb4'RESTAURANT',_utf8mb4'DRIVER',_utf8mb4'ADMIN'))),
  CONSTRAINT `ck_accounts_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'DISABLED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auth_sessions` (
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `account_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` datetime(6) NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `ix_sessions_account` (`account_id`),
  KEY `ix_sessions_expiry` (`expires_at`),
  CONSTRAINT `fk_sessions_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`),
  CONSTRAINT `ck_sessions_expiry` CHECK ((`expires_at` > `created_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `refresh_tokens` (
  `refresh_token_id` bigint NOT NULL AUTO_INCREMENT,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `token_hash` binary(32) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` datetime(6) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`refresh_token_id`),
  UNIQUE KEY `uq_refresh_hash` (`token_hash`),
  KEY `ix_refresh_session` (`session_id`),
  KEY `ix_refresh_expiry` (`expires_at`),
  CONSTRAINT `fk_refresh_session` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions` (`session_id`),
  CONSTRAINT `ck_refresh_expiry` CHECK ((`expires_at` > `created_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
