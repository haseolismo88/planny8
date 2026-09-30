# Pengesahan Planny8

Diuji pada 30 September 2026 menggunakan Node.js 24 dan Chrome tempatan. Sasaran deployment Node.js 22 kekal.

- 11 ujian backend/cache lulus.
- Semakan layout deployment, sintaks semua JavaScript, route lama dan sempadan secret lulus.
- Browser: 4 idea/request hari pertama, hari 30, cache selepas reload, regenerate 1 idea, eksport rangka/AI, mobile tanpa overflow, 56 saat/7 part, IndexedDB disekat, pilihan semua 120, creator, ralat API dan retry manual lulus.
- Semua blok CSS sepadan dengan sumber asal. Paparan desktop dan mobile diperiksa.
- Pakej diperiksa: tiada .env.local, key, node_modules atau .vercel daripada projek asal.

Ujian menggunakan respons OpenAI dan Redis simulasi. Tiada caj API, panggilan model langsung, database langsung, ujian beban 200 pengguna atau deployment dibuat. Akses sebenar GPT-6 Luna dan konfigurasi Vercel/Upstash perlu disahkan selepas pengguna menyediakan key dan database pada projek baharu.
