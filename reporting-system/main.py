from fastapi import FastAPI, Form, Request
from fastapi.responses import PlainTextResponse
import httpx
import base64
import os
from dotenv import load_dotenv
from vision import extract_dashboard_data
from sheets import append_to_sheet

load_dotenv()

app = FastAPI()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")


def twiml(msg: str) -> str:
    safe = msg.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"<?xml version='1.0' encoding='UTF-8'?><Response><Message>{safe}</Message></Response>"


@app.post("/webhook", response_class=PlainTextResponse)
async def whatsapp_webhook(
    NumMedia: str = Form(default="0"),
    MediaUrl0: str = Form(default=None),
    MediaContentType0: str = Form(default=None),
    From: str = Form(default="unknown"),
    Body: str = Form(default=""),
):
    if NumMedia == "0" or not MediaUrl0:
        return twiml("Sila hantar screenshot dashboard TikTok Live anda.")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            MediaUrl0,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
        )
        image_b64 = base64.standard_b64encode(resp.content).decode("utf-8")
        media_type = MediaContentType0 or "image/jpeg"

    data = await extract_dashboard_data(image_b64, media_type)

    if not data:
        return twiml(
            "Gagal extract data. Pastikan screenshot adalah dari dashboard TikTok Live."
        )

    success = await append_to_sheet(data, From)

    if not success:
        return twiml("Data berjaya di-extract tapi gagal simpan ke Google Sheets.")

    reply = (
        f"Data berjaya disimpan!\n"
        f"Start: {data.get('start_time') or 'N/A'}\n"
        f"End: {data.get('end_time') or 'N/A'}\n"
        f"Duration: {data.get('duration') or 'N/A'}\n"
        f"Spent: {data.get('spent') or 'N/A'}\n"
        f"Sales GMV: {data.get('sales_gmv') or 'N/A'}\n"
        f"ROI: {data.get('roi') or 'N/A'}"
    )
    return twiml(reply)


@app.get("/health")
async def health():
    return {"status": "ok"}
