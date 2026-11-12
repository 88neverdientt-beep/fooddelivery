-- APPROVED TEST REHEARSAL ONLY. Never auto-run at application startup.
-- MySQL DDL implicit commits; snapshot and verify first. Rollback app, retain columns.
DELIMITER $$
CREATE PROCEDURE stage8_expand_versions()
BEGIN
 IF @@port<>3307 OR DATABASE()<>'fooddelivery_stage8_e2e'
    OR REPLACE(@@datadir,CHAR(92),'/')<>'F:/New folder/food-delivery-mysql-test/data/' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unapproved Stage8 target';
 END IF;
 IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('accounts','customers','restaurants','drivers'))<>4 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Required profile/account tables missing';
 END IF;
 IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name IN ('accounts','customers','restaurants','drivers') AND column_name='version')<>0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Version migration already or partially applied; inspect before retry';
 END IF;
 ALTER TABLE accounts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
 ALTER TABLE customers ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
 ALTER TABLE restaurants ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
 ALTER TABLE drivers ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
END$$
DELIMITER ;
CALL stage8_expand_versions();
DROP PROCEDURE stage8_expand_versions;
