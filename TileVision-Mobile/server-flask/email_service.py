import requests

from brand_theme import COLORS
from config import (
    APP_DEEP_LINK_SCHEME,
    BREVO_API_KEY,
    BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME,
    RESET_PASSWORD_URL,
)

BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'


def is_smtp_configured() -> bool:
    """Name kept for backwards compatibility with existing callers/routes.
    This actually checks whether the Brevo HTTP email API is configured.
    Render's free tier blocks outbound SMTP ports (25/465/587), so emails
    are sent through Brevo's HTTPS API instead of smtplib."""
    return bool(BREVO_API_KEY and BREVO_SENDER_EMAIL)


def _send_via_brevo(to_email: str, subject: str, html: str, plain: str) -> None:
    if not is_smtp_configured():
        raise RuntimeError('Email is not configured. Set BREVO_API_KEY (and BREVO_SENDER_EMAIL) in .env')

    response = requests.post(
        BREVO_API_URL,
        headers={
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        json={
            'sender': {'name': BREVO_SENDER_NAME, 'email': BREVO_SENDER_EMAIL},
            'to': [{'email': to_email}],
            'subject': subject,
            'htmlContent': html,
            'textContent': plain,
        },
        timeout=30,
    )
    if response.status_code >= 300:
        raise RuntimeError(f'Brevo send failed ({response.status_code}): {response.text}')


def build_reset_email_html(name: str, reset_url: str, app_link: str) -> str:
    c = COLORS
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:{c['background']};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,{c['background']} 0%,{c['background_secondary']} 35%,#1e3a5f 70%,{c['background_secondary']} 100%);padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:{c['surface']};border:1px solid {c['card_border']};border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
        <tr>
          <td style="background:linear-gradient(135deg,{c['primary']},{c['primary_dark']});padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">TileVision</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">TileVision · Warehouse Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 12px;color:{c['text']};font-size:16px;">Hi {name},</p>
            <p style="margin:0 0 24px;color:{c['text_secondary']};font-size:14px;line-height:1.7;">
              We received a request to reset your password. Tap the button below to open the reset page and choose a new password.
              This link expires in <strong style="color:{c['text']};">1 hour</strong>.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="{reset_url}" style="display:inline-block;background:{c['primary']};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;box-shadow:0 4px 14px rgba(59,130,246,0.35);">
                Reset Password
              </a>
            </div>
            <p style="margin:0 0 12px;color:{c['text_muted']};font-size:12px;line-height:1.6;">
              Using the TileVision app? <a href="{app_link}" style="color:{c['primary_light']};text-decoration:none;font-weight:600;">Open in app</a>
            </p>
            <p style="margin:0;color:{c['text_muted']};font-size:11px;line-height:1.6;word-break:break-all;">
              Or copy this link:<br><span style="color:{c['text_secondary']};">{reset_url}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:{c['background_secondary']};padding:16px 32px;text-align:center;border-top:1px solid {c['card_border']};">
            <p style="margin:0;color:{c['text_muted']};font-size:11px;">&copy; TileVision · AI-assisted tile defect documentation</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def build_welcome_email_html(name: str, email: str, password: str, role: str, login_url: str) -> str:
    c = COLORS
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:{c['background']};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,{c['background']} 0%,{c['background_secondary']} 35%,#1e3a5f 70%,{c['background_secondary']} 100%);padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:{c['surface']};border:1px solid {c['card_border']};border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
        <tr>
          <td style="background:linear-gradient(135deg,{c['primary']},{c['primary_dark']});padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">TileVision</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Welcome aboard</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 12px;color:{c['text']};font-size:16px;">Hi {name},</p>
            <p style="margin:0 0 20px;color:{c['text_secondary']};font-size:14px;line-height:1.7;">
              An account has been created for you on TileVision as
              <strong style="color:{c['text']};">{role}</strong>. Here are your login details:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:{c['background_secondary']};border:1px solid {c['card_border']};border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px;color:{c['text_muted']};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                  <p style="margin:0 0 16px;color:{c['text']};font-size:15px;font-family:monospace;">{email}</p>
                  <p style="margin:0 0 8px;color:{c['text_muted']};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Temporary Password</p>
                  <p style="margin:0;color:{c['text']};font-size:15px;font-family:monospace;">{password}</p>
                </td>
              </tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="{login_url}" style="display:inline-block;background:{c['primary']};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;box-shadow:0 4px 14px rgba(59,130,246,0.35);">
                Sign In
              </a>
            </div>
            <p style="margin:0;color:{c['text_muted']};font-size:12px;line-height:1.6;">
              For security, please sign in and change this temporary password as soon as possible.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:{c['background_secondary']};padding:16px 32px;text-align:center;border-top:1px solid {c['card_border']};">
            <p style="margin:0;color:{c['text_muted']};font-size:11px;">&copy; TileVision · AI-assisted tile defect documentation</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_welcome_email(to_email: str, name: str, password: str, role: str) -> None:
    login_url = RESET_PASSWORD_URL.rsplit('/', 1)[0] if '/' in RESET_PASSWORD_URL else RESET_PASSWORD_URL

    plain = (
        f'Welcome to TileVision\n\n'
        f'Hi {name},\n\n'
        f'An account has been created for you as {role}.\n\n'
        f'Email: {to_email}\n'
        f'Temporary Password: {password}\n\n'
        f'Sign in here: {login_url}\n\n'
        f'Please change your password after your first login.\n'
    )
    html = build_welcome_email_html(name, to_email, password, role, login_url)

    _send_via_brevo(to_email, 'Welcome to TileVision — Your account is ready', html, plain)


def send_password_reset_email(to_email: str, name: str, token: str) -> None:
    reset_url = f'{RESET_PASSWORD_URL}?token={token}'
    app_link = f'{APP_DEEP_LINK_SCHEME}://reset-password?token={token}'

    plain = (
        f'TileVision Password Reset\n\n'
        f'Hi {name},\n\n'
        f'Reset your password using this link (expires in 1 hour):\n'
        f'{reset_url}\n\n'
        f'Open in app: {app_link}\n'
    )
    html = build_reset_email_html(name, reset_url, app_link)

    _send_via_brevo(to_email, 'TileVision — Reset your password', html, plain)
