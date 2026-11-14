-- Version 04. Maintenance window required. Never source this against Main without approval.
-- Baseline is immutable; apply this version AFTER baseline, only once.
-- Shared FoodItem rows are cloned; menu IDs and all cart/order FK values remain unchanged.
-- Fail before any persistent DDL, including CREATE PROCEDURE. The operator must not use --force.
SET @menu_v04_guard_sql = IF(
 ((@@port=3307 AND DATABASE() IN ('fooddelivery_independent_menu','fooddelivery_independent_menu_rehearsal','fooddelivery_menu_release','fooddelivery_menu_release_restore','fooddelivery_menu_release_rollback')) OR
  (@@port=3306 AND DATABASE()='fooddelivery' AND COALESCE(@approve_main_menu_v04,'')='APPROVE_MAIN_MENU_V04'))
 AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE')=16
 AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND
  ((table_name='food_items' AND column_name='image_key') OR (table_name='restaurant_food_items' AND column_name IN ('version','creation_key')))),
 'SELECT 1', 'SELECT * FROM information_schema.MENU_V04_TARGET_OR_VERSION_GUARD_FAILED');
PREPARE menu_v04_guard FROM @menu_v04_guard_sql;
EXECUTE menu_v04_guard;
DEALLOCATE PREPARE menu_v04_guard;

DELIMITER $$
CREATE PROCEDURE migrate_independent_menu_v04()
BEGIN
 DECLARE finished INT DEFAULT 0;
 DECLARE menu_id BIGINT;
 DECLARE old_food BIGINT;
 DECLARE new_food BIGINT;
 DECLARE shared CURSOR FOR SELECT m.restaurant_food_item_id,m.item_id FROM restaurant_food_items m
   WHERE EXISTS(SELECT 1 FROM restaurant_food_items first_menu WHERE first_menu.item_id=m.item_id AND first_menu.restaurant_food_item_id<m.restaurant_food_item_id)
   ORDER BY m.restaurant_food_item_id;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished=1;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 IF NOT ((@@port=3307 AND DATABASE() IN ('fooddelivery_independent_menu','fooddelivery_independent_menu_rehearsal','fooddelivery_menu_release','fooddelivery_menu_release_restore','fooddelivery_menu_release_rollback')) OR
    (@@port=3306 AND DATABASE()='fooddelivery' AND COALESCE(@approve_main_menu_v04,'')='APPROVE_MAIN_MENU_V04')) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Wrong migration target or explicit Main approval missing';
 END IF;
 IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE')<>16 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Expected exactly 16 baseline tables';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND ((table_name='food_items' AND column_name='image_key') OR (table_name='restaurant_food_items' AND column_name IN ('version','creation_key')))) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Migration already applied or partial state; stop and inspect';
 END IF;
 IF EXISTS(SELECT 1 FROM restaurant_food_items m LEFT JOIN food_items f ON f.item_id=m.item_id LEFT JOIN restaurants r ON r.restaurant_id=m.restaurant_id WHERE f.item_id IS NULL OR r.restaurant_id IS NULL) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Orphan menu found; no safe migration';
 END IF;
 ALTER TABLE food_items ADD COLUMN image_key VARCHAR(64) NULL;
 ALTER TABLE restaurant_food_items ADD COLUMN version BIGINT NOT NULL DEFAULT 0, ADD COLUMN creation_key VARCHAR(36) NULL;
 START TRANSACTION;
 OPEN shared;
 clone_loop: LOOP
   FETCH shared INTO menu_id,old_food;
   IF finished THEN LEAVE clone_loop; END IF;
   INSERT INTO food_items(name,category,description,image_key) SELECT name,category,description,image_key FROM food_items WHERE item_id=old_food;
   SET new_food=LAST_INSERT_ID();
   UPDATE restaurant_food_items SET item_id=new_food WHERE restaurant_food_item_id=menu_id;
 END LOOP;
 CLOSE shared;
 COMMIT;
 ALTER TABLE restaurant_food_items ADD CONSTRAINT uq_menu_private_food UNIQUE(item_id), ADD CONSTRAINT uq_menu_creation_key UNIQUE(creation_key);
END$$
DELIMITER ;
CALL migrate_independent_menu_v04();
DROP PROCEDURE migrate_independent_menu_v04;
