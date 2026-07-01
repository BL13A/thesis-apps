import json
import urllib.error
import urllib.request

from notification_repository import list_push_tokens_for_user

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def send_expo_push_to_user(user_id: str, title: str, message: str) -> None:
    tokens = list_push_tokens_for_user(user_id)
    if not tokens:
        return

    for token in tokens:
        _send_expo_push(token, title, message)


def _send_expo_push(token: str, title: str, message: str) -> None:
    payload = {
        'to': token,
        'title': title,
        'body': message,
        'sound': 'default',
        'priority': 'high',
    }
    data = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(
        EXPO_PUSH_URL,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
    except urllib.error.URLError as error:
        print(f'[PUSH] Failed to send Expo push: {error}', flush=True)
