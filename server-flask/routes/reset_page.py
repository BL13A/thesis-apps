from flask import Blueprint, request

from brand_theme import COLORS
from password_reset import find_valid_reset_user_id

reset_page_bp = Blueprint('reset_page', __name__)

c = COLORS


def _page_shell(title: str, body: str) -> str:
    return f"""
<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
</head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;min-height:100vh;color:{c['text']};background:{c['background']};">
  <div style="position:fixed;inset:0;background:linear-gradient(180deg,{c['background']} 0%,{c['background_secondary']} 30%,#1e3a5f 70%,{c['background_secondary']} 100%);z-index:-2;"></div>
  <div style="position:fixed;top:-100px;right:-80px;width:280px;height:280px;border-radius:50%;background:rgba(59,130,246,0.12);z-index:-1;"></div>
  <div style="position:fixed;bottom:60px;left:-60px;width:200px;height:200px;border-radius:50%;background:rgba(250,204,21,0.08);z-index:-1;"></div>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    {body}
  </div>
</body></html>
"""


def _invalid_page(message: str) -> str:
    body = f"""
  <div style="width:100%;max-width:420px;text-align:center;">
    <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:20px;background:linear-gradient(135deg,{c['primary']},{c['primary_dark']});display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(59,130,246,0.35);">
      <span style="font-size:28px;font-weight:800;color:#fff;">TV</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:{c['text']};">TileVision</h1>
    <p style="color:{c['text_secondary']};line-height:1.7;margin-bottom:24px;">{message}</p>
    <a href="/login" style="color:{c['primary_light']};font-weight:600;text-decoration:none;">Back to sign in</a>
  </div>
"""
    return _page_shell('TileVision — Invalid Link', body)


def _reset_form_page(token: str) -> str:
    body = f"""
  <div style="width:100%;max-width:420px;background:{c['surface']};border:1px solid {c['card_border']};border-radius:16px;padding:32px;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:72px;height:72px;margin:0 auto 16px;border-radius:20px;background:linear-gradient(135deg,{c['primary']},{c['primary_dark']});display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(59,130,246,0.35);">
        <span style="font-size:28px;font-weight:800;color:#fff;">TV</span>
      </div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:{c['text']};letter-spacing:-0.5px;">Reset Password</h1>
      <p style="margin:8px 0 0;color:{c['text_secondary']};font-size:14px;">TileVision · Warehouse Portal</p>
    </div>
    <form id="resetForm" style="display:flex;flex-direction:column;gap:14px;">
      <input type="hidden" name="token" value="{token}" />
      <label style="font-size:13px;font-weight:600;color:{c['text_secondary']};">New Password</label>
      <input id="newPassword" type="password" minlength="8" required placeholder="At least 8 characters"
        style="padding:12px 14px;border-radius:12px;border:1px solid {c['card_border']};background:{c['background_secondary']};color:{c['text']};font-size:16px;outline:none;" />
      <label style="font-size:13px;font-weight:600;color:{c['text_secondary']};">Confirm Password</label>
      <input id="confirmPassword" type="password" minlength="8" required placeholder="Re-enter new password"
        style="padding:12px 14px;border-radius:12px;border:1px solid {c['card_border']};background:{c['background_secondary']};color:{c['text']};font-size:16px;outline:none;" />
      <p id="error" style="color:{c['reject']};font-size:13px;margin:0;display:none;text-align:center;"></p>
      <p id="success" style="color:{c['pass']};font-size:13px;margin:0;display:none;text-align:center;"></p>
      <button type="submit" style="margin-top:8px;padding:14px;border:none;border-radius:12px;background:{c['primary']};color:#fff;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(59,130,246,0.35);">
        Update Password
      </button>
    </form>
  </div>
  <script>
    document.getElementById('resetForm').addEventListener('submit', async (event) => {{
      event.preventDefault();
      const errorEl = document.getElementById('error');
      const successEl = document.getElementById('success');
      errorEl.style.display = 'none';
      successEl.style.display = 'none';

      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      if (newPassword !== confirmPassword) {{
        errorEl.textContent = 'Passwords do not match.';
        errorEl.style.display = 'block';
        return;
      }}

      const response = await fetch('/api/auth/reset-password', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ token: '{token}', newPassword }}),
      }});
      const result = await response.json();
      if (!response.ok || !result.success) {{
        errorEl.textContent = result.error || 'Unable to reset password.';
        errorEl.style.display = 'block';
        return;
      }}

      successEl.textContent = result.message || 'Password updated! You can sign in now.';
      successEl.style.display = 'block';
      document.getElementById('resetForm').querySelector('button').disabled = true;
    }});
  </script>
"""
    return _page_shell('TileVision — Reset Password', body)


@reset_page_bp.get('/reset-password')
def reset_password_page():
    token = (request.args.get('token') or '').strip()
    if not token:
        return _invalid_page('Missing reset token. Request a new password reset email.'), 400

    if not find_valid_reset_user_id(token):
        return _invalid_page('This reset link is invalid or has expired. Request a new one from the app.'), 400

    return _reset_form_page(token)
