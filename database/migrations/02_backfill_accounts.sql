-- MANUAL ONLY. Keep all profile writers stopped; never overwrite existing Accounts.
-- Requires successful read-only preflight and 01_expand_auth.sql. No ADMIN is created.
DELIMITER $$
CREATE PROCEDURE stage2_backfill_accounts_v1()
BEGIN
    DECLARE source_count BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
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
    IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()
        AND table_name IN ('accounts','auth_sessions','refresh_tokens') AND engine='InnoDB')<>3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Auth schema is absent or incomplete';
    END IF;
    IF EXISTS(SELECT 1 FROM accounts) OR EXISTS(SELECT 1 FROM auth_sessions) OR EXISTS(SELECT 1 FROM refresh_tokens) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Auth tables must be empty; do not overwrite or rerun backfill';
    END IF;
    START TRANSACTION;
    SET source_count=(SELECT COUNT(*) FROM customers)+(SELECT COUNT(*) FROM restaurants)+(SELECT COUNT(*) FROM drivers);
    INSERT INTO accounts(email,password_hash,role,status,customer_id,restaurant_id,driver_id,created_at)
        SELECT LOWER(TRIM(email)),password,'CUSTOMER','ACTIVE',customer_id,NULL,NULL,created_at FROM customers
        UNION ALL SELECT LOWER(TRIM(email)),password,'RESTAURANT','ACTIVE',NULL,restaurant_id,NULL,created_at FROM restaurants
        UNION ALL SELECT LOWER(TRIM(email)),password,'DRIVER','ACTIVE',NULL,NULL,driver_id,created_at FROM drivers;
    IF (SELECT COUNT(*) FROM accounts)<>source_count THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Backfill row count mismatch';
    END IF;
    COMMIT;
END$$
DELIMITER ;
CALL stage2_backfill_accounts_v1();
DROP PROCEDURE stage2_backfill_accounts_v1;
