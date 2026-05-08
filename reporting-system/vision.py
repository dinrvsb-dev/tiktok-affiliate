import anthropic
import json
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPT = """Extract the following data from this TikTok Live dashboard screenshot.
Return ONLY a valid JSON object with these exact keys:
- start_time  (e.g. "14:30" or "14:30:00")
- end_time    (e.g. "16:00" or "16:00:00")
- duration    (e.g. "1h 30m" or "90 minutes")
- spent       (e.g. "RM 150.00" — include currency symbol if visible)
- sales_gmv   (e.g. "RM 750.00" — include currency symbol if visible)
- roi         (e.g. "5.0x" or "500%")

Use null for any value not found. Return only the JSON object, no explanation."""


async def extract_dashboard_data(image_b64: str, media_type: str) -> dict | None:
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": PROMPT},
                    ],
                }
            ],
        )

        text = message.content[0].text.strip()

        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text.strip())

    except Exception as e:
        print(f"[vision] error: {e}")
        return None
