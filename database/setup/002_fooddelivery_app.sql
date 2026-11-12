-- OPERATOR TEMPLATE ONLY; never paste into a terminal/Workbench results pane.
-- Run via mysql_baseline.py --action provision-app after separate approval.
-- RANDOM PASSWORD is captured directly into a protected external option file.
-- No existing account is changed, reset or granted additional access.
CREATE USER 'fooddelivery_app'@'127.0.0.1' IDENTIFIED BY RANDOM PASSWORD;
GRANT SELECT, INSERT, UPDATE, DELETE ON `fooddelivery`.* TO 'fooddelivery_app'@'127.0.0.1';
