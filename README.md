# Planny8 — 120 rangka, dialog AI on-demand

Salinan baharu daripada folder planny3 yang diberikan. Susun atur, warna, gaya/suara/durasi dan aliran UI asal dikekalkan; kawalan jana semula/jana semua dan status ditambah. Tiada hubungan deployment dengan planny7.vercel.app. Fail asal, key lama dan tetapan Vercel lama tidak disalin atau diubah.

## Ciri

- GPT-6 Luna, Responses API, Structured Outputs dan reasoning.effort: none.
- 30 hari × 4 rangka idea dibina lokal. Apabila hasil sesuatu hari dibuka, hanya empat dialog hari itu dijana. Tukar tab antara empat idea tidak membuat permintaan baharu.
- Produk dan creator menggunakan on-demand. Jana semula idea ini menjana satu idea sahaja. Pilihan tambahan: jana semua 120 dialog menjana baki sahaja, empat setiap request, setelah pengguna memilihnya.
- Upstash Redis menyimpan dialog 30 hari. Kunci cache merangkumi produk, scene, gaya, suara, durasi, model, reasoning dan versi prompt. Lock database menghalang janaan idea sama serentak. Browser menyimpan hasil melalui IndexedDB.
- Maksimum tiga cubaan model. Part sah dikekalkan dalam request itu; hanya part invalid dihantar untuk repair bersama konteks cerita. Jika semua cubaan gagal, kemajuan part dalam request gagal belum disimpan merentas request.
- Setiap request dicatat sebagai planny.usage. Setiap panggilan model termasuk repair merekod token input/output, cached tokens, reasoning tokens, status dan latency. Token yang provider tidak berikan ialah null. Anggaran USD direkod untuk GPT-6 Luna bila token tersedia. Log disimpan 30 hari di Redis dan dalam Vercel Function Logs. Log tidak mengandungi key, IP mentah atau teks produk/dialog.
- Lalai: 60 request/minit/IP dan 500 request janaan cache-miss/hari bagi seluruh aplikasi (UTC). Satu request boleh mengandungi empat idea dan tiga cubaan repair. Hasil cache masih tersedia selepas had janaan harian, tertakluk had request/minit.
- Database tidak tersedia: AI dihentikan dengan mesej jelas supaya cache dan had penggunaan tidak dipintas. Hasil yang sudah ada di browser masih boleh dilihat.

## Upload ke GitHub dan Vercel BAHARU

1. Cipta repo GitHub baharu, contohnya planny8. Upload kandungan folder ini termasuk api/, scripts/, test/, package.json, pnpm-lock.yaml, index.html, vercel.json dan fail ignore. Jangan upload ZIP sahaja.
2. Vercel: Add New Project, import repo baharu. Jangan pilih projek Planny7 atau pindahkan domain lamanya.
3. Framework Other, Node.js 22.x. Root Directory ialah folder yang mempunyai package.json. Kekalkan vercel.json; jangan tambah functions bersama builds.
4. Cipta database Upstash Redis baharu dan sambungkan kepada projek Vercel baharu sahaja. Dapatkan REST URL dan REST token daripada dashboard/integrasi Upstash.
5. Masukkan environment variables berikut pada projek Vercel BAHARU:

| Variable | Nilai |
| --- | --- |
| OPENAI_API_KEY | Key baharu yang anda sediakan sendiri |
| UPSTASH_REDIS_REST_URL | REST URL database baharu |
| UPSTASH_REDIS_REST_TOKEN | REST token database baharu |
| OPENAI_MODEL | gpt-6-luna (lalai) |
| OPENAI_REASONING_EFFORT | none (lalai) |
| DAILY_GENERATION_LIMIT | 500 (lalai) |
| REQUESTS_PER_MINUTE | 60 (lalai) |

6. Deploy. Redeploy jika environment variables dimasukkan kemudian. Gunakan URL baharu yang Vercel berikan. Jangan tambah alias planny7.vercel.app.
7. Cuba produk contoh: hari pertama empat dialog AI, hari lain kekal rangka hingga dibuka. Cuba jana semula satu idea dan semak Function Logs. Reload hasil tersimpan tidak memanggil AI lagi.

Pakej tidak mengandungi key atau .env.local. API key DAN database perlu dikonfigurasi sebelum AI berfungsi. Repo GitHub, projek Vercel, database sebenar dan API langsung belum dicipta atau diuji; pengguna mengurus upload/deploy sendiri.

## Kos dan 200 pengguna aktif

RM50–RM200/bulan ialah sasaran, bukan jaminan. Harga rasmi Luna yang disemak: USD0.10/juta token input, USD0.01/juta cached input, USD0.50/juta output. Anggaran log menggunakan harga standard ini, bukan invois. Mata wang, cukai, Upstash, Vercel, request provider tanpa usage dan perubahan harga tidak termasuk.

Contoh andaian: 200 pengguna × 30 hari × satu hari dibuka sehari = 6,000 request/bulan. Jika purata satu request ialah 4,000 input dan 1,000 output token, kos asas model sekitar USD5.40. Jika penggunaan token/repair/regenerate meningkat lima kali, sekitar USD27.00. Ukur purata sebenar melalui log. Had request ialah kawalan volum, bukan had bil wang. Had lalai 500/hari dikongsi semua pengguna.

Aplikasi asal tiada login. Versi ini mengekalkannya: rate limit berasaskan IP, bukan kuota akaun. Cache input sama boleh dikongsi, tanpa endpoint untuk menyenaraikan hasil orang lain. Jika pelancaran berbayar memerlukan kuota individu atau pemilikan akaun, autentikasi perlu ditambah. Tiada dakwaan ujian beban 200 pengguna serentak.

## Simpanan dan eksport

- Muat turun/copy semua idea tidak mencetuskan AI bagi semua 120. Idea belum dijana dilabel rangka lokal. Pilih jana semua dahulu untuk eksport semua dialog lengkap.
- Janaan semula gagal mengekalkan dialog lama. Jika database gagal selepas model menjawab, percubaan seterusnya mungkin menggunakan kredit lagi.
- Cache server 30 hari; browser kekal sehingga storan dibuang. Ini bukan penyegerakan akaun: regenerate pada satu browser tidak mengemas kini salinan browser lain secara langsung.
- Validasi memeriksa format, perkataan dan pendua dalam request. Keunikan semantik semua 120 atau semua pengguna tidak dijamin.
- Mengubah model memerlukan semakan sokongan reasoning dan Structured Outputs. Tiada pertukaran model automatik apabila akses gagal.

## Ujian

    pnpm install --frozen-lockfile
    pnpm verify
    pnpm test
    pnpm exec playwright install chromium
    pnpm test:browser

Untuk Chrome sedia ada, tetapkan PLAYWRIGHT_EXECUTABLE_PATH. Ujian menggunakan respons model dan database simulasi, tanpa key sebenar/caj API. Suite meliputi validasi, repair part, error, cache, lock serentak, had harian, empat idea, hari 30, reload, regen satu, eksport, mobile, 56 saat, storan disekat dan pilihan 120. Ujian langsung perlu dibuat selepas deploy pada URL baharu sahaja.

Rujukan: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
