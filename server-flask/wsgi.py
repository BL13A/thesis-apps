"""WSGI entry for production servers (Waitress, Gunicorn, etc.)"""

from app import bootstrap_app, create_app

bootstrap_app()
application = create_app()
