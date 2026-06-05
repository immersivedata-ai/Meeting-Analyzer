"""
Email sending utility using Gmail SMTP.
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_reset_email(to_email: str, reset_token: str, expires_minutes: int = 60) -> bool:
    """
    Send a password reset email with the reset token.
    Returns True if sent successfully, False otherwise.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_name = os.getenv("SMTP_FROM_NAME", "Manthan AI")

    if not smtp_user or not smtp_pass:
        logger.error("SMTP credentials not configured")
        return False

    reset_link = f"{os.getenv('APP_URL', 'http://localhost:8080')}/reset-password"

    subject = "Reset your Manthan AI password"
    body = f"""Hi,

You requested a password reset for your Manthan AI account.

Use the following reset code on the reset password page:

    {reset_token}

Or go directly to: {reset_link}

This code expires in {expires_minutes} minutes.

If you didn't request this, you can safely ignore this email.

— {from_name}
"""

    msg = MIMEMultipart()
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logger.info(f"Reset email sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed — check username and app password")
        return False
    except Exception as e:
        logger.error(f"Failed to send reset email: {e}")
        return False
