Socket.IO Üretim Notları

- `NEXT_PUBLIC_SOCKET_URL` üretim domain’inizi ve portunuzu işaret etmelidir (HTTPS önerilir).
- Backend’de `application.properties` için `socket.origin` whitelist kullanın (örn. `https://app.example.com`).
- Reverse proxy kullanıyorsanız `X-Forwarded-*` başlıklarını doğru iletin ve WebSocket upgrade ayarlarını yapın.
- Günlüklerde kullanıcı verilerini maskeleyin; sadece `jobId`, `type`, `status` gibi alanları seviyeli olarak kaydedin.
