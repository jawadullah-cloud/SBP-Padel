from __future__ import annotations

import asyncio
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.core.config import settings


TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def _fetch_tokeninfo(id_token: str) -> dict:
    url = f"{TOKENINFO_URL}?{urlencode({'id_token': id_token})}"
    request = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=8) as response:  # noqa: S310 - fixed Google endpoint
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(401, "Google sign-in token could not be verified") from exc


async def verify_google_id_token(id_token: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not configured")
    claims = await asyncio.to_thread(_fetch_tokeninfo, id_token)
    if claims.get("aud") != settings.google_client_id:
        raise HTTPException(401, "Google sign-in token is for a different application")
    if str(claims.get("email_verified", "")).lower() != "true":
        raise HTTPException(401, "Google account email is not verified")
    email = str(claims.get("email", "")).strip().lower()
    if not email or "@" not in email:
        raise HTTPException(401, "Google account did not provide a valid email address")
    return {
        "sub": str(claims.get("sub", "")),
        "email": email,
        "name": str(claims.get("name") or claims.get("given_name") or email.split("@", 1)[0]).strip(),
        "picture": str(claims.get("picture") or "").strip() or None,
    }
