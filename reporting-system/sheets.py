import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import os

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

HEADERS = ["Timestamp", "Sender", "Start Time", "End Time", "Duration", "Spent", "Sales GMV", "ROI"]


def _get_sheet():
    creds = Credentials.from_service_account_file("service_account.json", scopes=SCOPES)
    gc = gspread.authorize(creds)
    return gc.open_by_key(os.getenv("GOOGLE_SHEET_ID")).sheet1


async def append_to_sheet(data: dict, sender: str) -> bool:
    try:
        sheet = _get_sheet()

        if not sheet.get_all_values():
            sheet.append_row(HEADERS)

        row = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            sender,
            data.get("start_time") or "",
            data.get("end_time") or "",
            data.get("duration") or "",
            data.get("spent") or "",
            data.get("sales_gmv") or "",
            data.get("roi") or "",
        ]
        sheet.append_row(row)
        return True

    except Exception as e:
        print(f"[sheets] error: {e}")
        return False
