# Setup Guide

## 1. Anthropic API Key
1. Pergi https://console.anthropic.com
2. Create API key
3. Salin key tu

## 2. Twilio WhatsApp
1. Daftar https://www.twilio.com (ada free trial)
2. Pergi Console → Messaging → Try it out → Send a WhatsApp message
3. Follow sandbox setup (hantar join code ke nombor Twilio)
4. Salin Account SID & Auth Token dari dashboard

## 3. Google Sheets API
1. Pergi https://console.cloud.google.com
2. Buat project baru
3. Enable "Google Sheets API" dan "Google Drive API"
4. Pergi IAM → Service Accounts → Create service account
5. Download JSON key → rename jadi `service_account.json` → letak dalam folder ni
6. Buat Google Sheet baru
7. Share sheet tu dengan email service account (ada dalam JSON file tu)
8. Salin Sheet ID dari URL (bahagian panjang dalam URL)

## 4. Setup .env
```
cp .env.example .env
```
Isi semua nilai dalam `.env`

## 5. Install & Run
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 6. Deploy ke Railway (free)
1. Daftar https://railway.app
2. Connect GitHub repo
3. Add environment variables
4. Upload `service_account.json` sebagai secret file

## 7. Setup Twilio Webhook
1. Pergi Twilio Console → WhatsApp Sandbox
2. Set webhook URL: `https://your-app.railway.app/webhook`
3. Method: POST

## Cara Guna
Team member hantar screenshot TikTok Live dashboard ke nombor WhatsApp Twilio sandbox.
Bot akan reply dengan data yang di-extract dan save ke Google Sheets.
