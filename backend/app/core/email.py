import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_sync(to_email: str, subject: str, body: str) -> bool:
    if not settings.smtp_host or not settings.smtp_from_email:
        if settings.environment == "development":
            logger.warning("SMTP is not configured. Development email for %s:\n%s", to_email, body)
        else:
            logger.warning("SMTP is not configured; email delivery was skipped for %s", to_email)
        return False
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_starttls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password or "")
        smtp.send_message(message)
    return True


async def send_email(to_email: str, subject: str, body: str) -> bool:
    return await asyncio.to_thread(_send_sync, to_email, subject, body)
