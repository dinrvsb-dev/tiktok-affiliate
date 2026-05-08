# TikTok Live Reporting System

Sistem ini menerima screenshot dashboard live daripada WhatsApp, minta metadata wajib, extract metrik utama menggunakan AI vision, dan hantar rekod yang telah disahkan ke Google Sheets.

## Ciri utama

- Webhook WhatsApp untuk terima imej dan mesej metadata.
- Penyimpanan rekod submission berasaskan fail JSON untuk setup awal yang ringan.
- Upload screenshot ke Google Drive dengan fallback ke local file path untuk development.
- Extraction metrik berstruktur menggunakan OpenAI vision model.
- Review panel web ringkas untuk semak, edit, approve, reject, dan retry submission.
- Sync ke Google Sheets hanya selepas review diluluskan.

## Flow metadata WhatsApp

Selepas team hantar screenshot, sistem akan balas dan minta metadata dalam format ini:

```text
staff: Aisyah
host: Nana
live: LIVE-2026-04-20-AM
date: 2026-04-20 10:30
```

Jika metadata lengkap berada dalam caption imej atau mesej susulan, extraction akan bermula secara automatik.

## Setup

1. Install Node.js 20 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` ke `.env` dan isi semua credentials.
4. Jalankan `npm start`.
5. Expose server ke internet dan daftarkan endpoint WhatsApp:
   - Verify URL: `/webhooks/whatsapp`
   - Receive URL: `/webhooks/whatsapp`

## Environment variables penting

- `ADMIN_API_KEY`: Digunakan oleh review panel untuk panggilan admin API.
- `WHATSAPP_*`: Kredensial webhook dan Graph API untuk muat turun media dan menghantar mesej balas.
- `OPENAI_*`: Digunakan untuk extraction screenshot.
- `GOOGLE_*`: Digunakan untuk Google Drive dan Google Sheets.

## Admin panel

UI review disediakan pada root URL `/`. Tambah header ini semasa guna API secara terus:

```text
Authorization: Bearer <ADMIN_API_KEY>
```

## Endpoint utama

- `GET /health`
- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`
- `GET /api/submissions`
- `GET /api/submissions/:id`
- `POST /api/submissions/:id/approve`
- `POST /api/submissions/:id/reject`
- `POST /api/submissions/:id/retry`
- `POST /api/dev/submissions`

## Notes

- V1 menyimpan rekod dalam `data/submissions.json`. Bila sistem matang, lapisan store ini boleh diganti dengan database tanpa ubah flow utama.
- Jika Google Drive belum dikonfigurasi, sistem masih simpan imej secara lokal untuk tujuan development.
- Jika Google Sheets belum dikonfigurasi, approve masih direkodkan dalam audit store tetapi row tidak akan disync ke sheet.
