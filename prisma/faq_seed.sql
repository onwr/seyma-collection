-- İlk kurulumda tablo boşsa örnek SSS ekler; doluysa hiçbir şey yapmaz.
INSERT INTO `Faq` (`category`, `question`, `answer`, `sortOrder`, `isActive`, `showOnHome`, `updatedAt`)
SELECT
  v.`category`,
  v.`question`,
  v.`answer`,
  v.`sortOrder`,
  v.`isActive`,
  v.`showOnHome`,
  NOW(3)
FROM (
  SELECT
    'Sipariş & Kargo' AS `category`,
    'Siparişimi ne zaman kargoya verirsiniz?' AS `question`,
    'Ödemeniz onaylandıktan sonra siparişiniz aynı iş günü içinde veya en geç 1–2 iş günü içinde kargoya teslim edilir. Kampanya ve yoğun dönemlerde bu süre kısa süreli uzayabilir; güncel bilgi için sipariş detayınızı veya müşteri hizmetlerimizi kullanabilirsiniz.' AS `answer`,
    1 AS `sortOrder`,
    1 AS `isActive`,
    1 AS `showOnHome`
  UNION ALL SELECT
    'Sipariş & Kargo',
    'Kargo ücreti nasıl hesaplanıyor?',
    'Sepet tutarınıza ve seçtiğiniz teslimat adresine göre kargo ücreti ödeme adımında net olarak gösterilir. Belirli tutarın üzerindeki siparişlerde ücretsiz kargo kampanyalarımız olabilir; kampanya koşulları sepet sayfasında belirtilir.',
    2, 1, 1
  UNION ALL SELECT
    'İade & Değişim',
    'Ürünü iade edebilir miyim?',
    'Mesafeli satış kapsamındaki ürünlerde yasal cayma hakkınız ve mağaza politikamıza uygun olarak açılmamış, kullanılmamış ve etiketleri yerinde ürünleri belirtilen süre içinde iade edebilirsiniz. Hijyen ürünlerinde ambalaj açılmışsa iade kabul edilmeyebilir; detaylar İade Koşulları sayfamızda yer alır.',
    3, 1, 1
  UNION ALL SELECT
    'İade & Değişim',
    'İade ücreti kimden kesilir?',
    'Cayma hakkı kullanımında iade kargo ücreti müşteri tarafından karşılanabilir; kampanya veya kusurlu ürün durumunda farklılık gösterebilir. İade onayı sonrası ödeme iadeniz, ödeme yönteminize göre birkaç iş günü içinde hesabınıza yansır.',
    4, 1, 1
  UNION ALL SELECT
    'Ürün & Güvenlik',
    'Ürünleriniz güvenli ve bebekler için uygun mu?',
    'Little Mom''s Store olarak seçtiğimiz markaları ve ürünleri titizlikle değerlendiriyor; ürün sayfalarında yaş önerisi ve kullanım bilgilerini paylaşıyoruz. Her bebeğin farklı olduğunu unutmayın; alerji veya özel durumlarda üretici etiketini ve doktor önerisini dikkate almanızı öneririz.',
    5, 1, 1
  UNION ALL SELECT
    'Ürün & Güvenlik',
    'Stokta olmayan ürün ne zaman gelir?',
    'Tükenen ürünler için tedarik tarihi net olmayabilir. Ürün sayfasında “Gelince haber ver” veya benzeri bir seçenek varsa e-posta ile bilgilendirilebilirsiniz; ayrıca müşteri hizmetlerimizden stok durumu hakkında güncel bilgi alabilirsiniz.',
    6, 1, 1
  UNION ALL SELECT
    'Hesap',
    'Şifremi unuttum, ne yapmalıyım?',
    'Giriş sayfasındaki “Şifremi unuttum” bağlantısından e-posta adresinizi girerek sıfırlama bağlantısı talep edebilirsiniz. E-posta gelmezse spam klasörünü kontrol edin veya destek hattımızdan yardım isteyin.',
    7, 1, 0
) AS v
WHERE NOT EXISTS (SELECT 1 FROM `Faq` LIMIT 1);
