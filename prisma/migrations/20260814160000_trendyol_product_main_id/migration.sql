-- Trendyol'da ürünün GERÇEKTE kayıtlı olduğu productMainId — eski Excel yüklemesinden kalma
-- değerler bizim varsayılanımızla ("URUN-{id}") eşleşmediği için "zaten mevcut" hatalarına
-- yol açıyordu. checkPendingBatches artık bu hatayı görünce barkoddan gerçek değeri sorgulayıp
-- buraya kalıcı olarak yazıyor.
ALTER TABLE `Product` ADD COLUMN `trendyolProductMainId` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD UNIQUE INDEX `Product_trendyolProductMainId_key` (`trendyolProductMainId`);
