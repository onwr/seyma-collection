-- 1000 kalemlik büyük partilerde `failures`/`items` JSON'u TEXT'in 65.535 baytlık
-- sınırını aşıp güncellemenin hata fırlatmasına (ve tüm kontrol kuyruğunun kilitlenmesine)
-- yol açıyordu. MEDIUMTEXT'e (16MB) genişletiliyor.
ALTER TABLE `TrendyolBatchCheck` MODIFY COLUMN `failures` MEDIUMTEXT NULL;
ALTER TABLE `TrendyolBatchCheck` MODIFY COLUMN `items` MEDIUMTEXT NULL;
