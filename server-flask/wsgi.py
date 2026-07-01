"""WSGI entry for production servers (Waitress, Gunicorn, etc.)"""

import threading

from app import bootstrap_app, create_app

application = create_app()


def _run_bootstrap_in_background():
    try:
        bootstrap_app()
    except Exception as error:
        print(f'  Background bootstrap failed (non-fatal): {error}', flush=True)
    else:
        print('  Background seeding/bootstrap complete.', flush=True)

threading.Thread(target=_run_bootstrap_in_background, daemon=True).start()