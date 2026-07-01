"""Test Gmail SMTP — run after setting SMTP_PASSWORD in .env"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import SMTP_PASSWORD, SMTP_USER
from email_service import is_smtp_configured, send_password_reset_email


def main():
    if not is_smtp_configured() or SMTP_PASSWORD == 'PASTE_GMAIL_APP_PASSWORD_HERE':
        print('Set SMTP_PASSWORD in .env first.')
        print('Get App Password: https://myaccount.google.com/apppasswords')
        sys.exit(1)

    to_email = SMTP_USER
    print(f'Sending test email to {to_email}...')
    send_password_reset_email(to_email, 'Test User', 'test-token-for-smtp-check')
    print('OK — check your inbox (and spam folder).')


if __name__ == '__main__':
    main()
