-- Minimum reference data, separate explicit approval after schema acceptance.
-- Execute only through the guarded operator; never an application-startup seed.
-- No hard-coded method_id and no UPDATE of an existing payment method.
INSERT INTO payment_methods (method_code,method_name,is_active)
VALUES ('COD','Thanh toán khi nhận hàng',b'1');
