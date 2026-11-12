-- MANUAL ONLY. First run 00_preflight_readonly.sql; STOP on any finding.
-- Do not use mysql --force. Maintenance window: stop all profile writers.
-- The helper routine is DDL; it must not even be installed when read-only preflight fails.
-- MySQL DDL implicitly commits: backup/restore, not ROLLBACK, handles partial DDL failure.
DELIMITER $$
CREATE PROCEDURE stage2_expand_auth_v1()
BEGIN
    IF @@port <> 3307 OR DATABASE() <> 'fooddelivery_stage2_rehearsal' OR DATABASE() IS NULL
       OR REPLACE(@@datadir,CHAR(92),'/') <> 'F:/New folder/food-delivery-mysql-test/data/' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Not the approved isolated MySQL test target';
    END IF;
    IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE()
        AND ((table_name='customers' AND column_name='customer_id') OR
             (table_name='restaurants' AND column_name='restaurant_id') OR
             (table_name='drivers' AND column_name='driver_id'))
        AND column_type='bigint' AND is_nullable='NO' AND column_key='PRI') <> 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Incompatible profile primary keys';
    END IF;
    IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()
        AND table_name IN ('customers','restaurants','drivers') AND engine='InnoDB') <> 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Profile tables must use InnoDB';
    END IF;
    IF EXISTS (SELECT 1 FROM (SELECT email,password FROM customers UNION ALL SELECT email,password FROM restaurants UNION ALL SELECT email,password FROM drivers) p GROUP BY LOWER(TRIM(email)) HAVING COUNT(*)>1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Duplicate normalized emails; manual resolution required';
    END IF;
    IF EXISTS (SELECT 1 FROM (SELECT email,password FROM customers UNION ALL SELECT email,password FROM restaurants UNION ALL SELECT email,password FROM drivers) p WHERE email IS NULL OR CHAR_LENGTH(TRIM(email))>255
        OR NOT REGEXP_LIKE(TRIM(email),CONVERT(0x5e5b412d5a612d7a302d392e5f252b2d5d2b405b412d5a612d7a302d392e2d5d2b5c2e5b412d5a612d7a5d7b322c7d24 USING utf8mb4),'c')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported legacy email; manual resolution required';
    END IF;
    IF EXISTS (SELECT 1 FROM (SELECT email,password FROM customers UNION ALL SELECT email,password FROM restaurants UNION ALL SELECT email,password FROM drivers) p WHERE password IS NULL
        OR NOT REGEXP_LIKE(password,CONVERT(0x5e5c24325b6162795d5c2428305b342d395d7c5b31325d5b302d395d7c335b30315d295c245b2e2f412d5a612d7a302d395d7b35337d24 USING utf8mb4),'c')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid BCrypt hashes; no credential conversion permitted';
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE()
        AND table_name IN ('accounts','auth_sessions','refresh_tokens')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Auth schema already exists or is partial; inspect manually';
    END IF;
    CREATE TABLE accounts (
        account_id BIGINT NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        customer_id BIGINT NULL, restaurant_id BIGINT NULL, driver_id BIGINT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        password_changed_at DATETIME(6) NULL,
        PRIMARY KEY(account_id),
        CONSTRAINT uq_accounts_email UNIQUE(email),
        CONSTRAINT uq_accounts_customer UNIQUE(customer_id),
        CONSTRAINT uq_accounts_restaurant UNIQUE(restaurant_id),
        CONSTRAINT uq_accounts_driver UNIQUE(driver_id),
        CONSTRAINT fk_accounts_customer FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
        CONSTRAINT fk_accounts_restaurant FOREIGN KEY(restaurant_id) REFERENCES restaurants(restaurant_id),
        CONSTRAINT fk_accounts_driver FOREIGN KEY(driver_id) REFERENCES drivers(driver_id),
        CONSTRAINT ck_accounts_role CHECK(role IN ('CUSTOMER','RESTAURANT','DRIVER','ADMIN')),
        CONSTRAINT ck_accounts_status CHECK(status IN ('ACTIVE','DISABLED')),
        CONSTRAINT ck_accounts_email_normalized CHECK(email=LOWER(TRIM(email))),
        CONSTRAINT ck_accounts_profile CHECK(
            (role='CUSTOMER' AND customer_id IS NOT NULL AND restaurant_id IS NULL AND driver_id IS NULL) OR
            (role='RESTAURANT' AND restaurant_id IS NOT NULL AND customer_id IS NULL AND driver_id IS NULL) OR
            (role='DRIVER' AND driver_id IS NOT NULL AND customer_id IS NULL AND restaurant_id IS NULL) OR
            (role='ADMIN' AND customer_id IS NULL AND restaurant_id IS NULL AND driver_id IS NULL))
    ) ENGINE=InnoDB;
    CREATE TABLE auth_sessions (
        session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        account_id BIGINT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        expires_at DATETIME(6) NOT NULL, revoked_at DATETIME(6) NULL,
        PRIMARY KEY(session_id), KEY ix_sessions_account(account_id), KEY ix_sessions_expiry(expires_at),
        CONSTRAINT fk_sessions_account FOREIGN KEY(account_id) REFERENCES accounts(account_id),
        CONSTRAINT ck_sessions_expiry CHECK(expires_at>created_at)
    ) ENGINE=InnoDB;
    CREATE TABLE refresh_tokens (
        refresh_token_id BIGINT NOT NULL AUTO_INCREMENT,
        session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        token_hash BINARY(32) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        expires_at DATETIME(6) NOT NULL, used_at DATETIME(6) NULL,
        PRIMARY KEY(refresh_token_id), CONSTRAINT uq_refresh_hash UNIQUE(token_hash),
        KEY ix_refresh_session(session_id), KEY ix_refresh_expiry(expires_at),
        CONSTRAINT fk_refresh_session FOREIGN KEY(session_id) REFERENCES auth_sessions(session_id),
        CONSTRAINT ck_refresh_expiry CHECK(expires_at>created_at)
    ) ENGINE=InnoDB;
END$$
DELIMITER ;
CALL stage2_expand_auth_v1();
DROP PROCEDURE stage2_expand_auth_v1;
