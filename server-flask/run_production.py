"""Production server using Waitress (Windows + Linux)."""

from waitress import serve

from app import print_startup_banner
from config import API_PORT
from wsgi import application

if __name__ == '__main__':
    print_startup_banner({}, 'Waitress production')
    serve(application, host='0.0.0.0', port=API_PORT, threads=8)
