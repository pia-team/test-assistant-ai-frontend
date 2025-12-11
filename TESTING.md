Bağlantı ve Gerçek Zamanlı Güncelleme Testleri

1. Ortam Değişkenleri
- `.env.local` dosyasına `NEXT_PUBLIC_SOCKET_URL` ve `NEXT_PUBLIC_SOCKET_DEBUG` ekleyin.

2. Bağlantı Durumu
- Uygulamayı çalıştırın ve header sağ üstteki ikonun altındaki durum noktasını izleyin.
- Sunucu kapalıyken kırmızı, yeniden bağlanırken sarı, bağlandığında yeşil görünmelidir.

3. İş Başlatma Senaryoları
- `Test Üretimi`, `Test Çalıştırma` veya `JSON Yükleme` akışını başlatın.
- `job_update` eventleri geldikçe header’daki liste ve ana sayfa tablosu anlık güncellenmelidir.

4. Bağlantı Kesintisi ve Yeniden Bağlanma
- Socket sunucusunu durdurup başlatın.
- Bağlantı durum noktasının değişimini ve yeniden bağlanma sonrası güncellemelerin devam ettiğini doğrulayın.

5. Debug Loglar
- `.env.local` içinde `NEXT_PUBLIC_SOCKET_DEBUG=true` ayarlayın.
- Konsolda alınan Socket eventleri ve argüman sayıları görünecektir.
