import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / '.env')

API_PORT = int(os.getenv('API_PORT', '3000'))
JWT_SECRET = os.getenv('JWT_SECRET', 'tilevision-dev-secret-change-in-production')
JWT_EXPIRES_IN = os.getenv('JWT_EXPIRES_IN', '7d')
DEFAULT_PASSWORD = 'password123'
RESET_TOKEN_EXPIRES_MINUTES = int(os.getenv('RESET_TOKEN_EXPIRES_MINUTES', '60'))
RESET_PASSWORD_URL = os.getenv(
    'RESET_PASSWORD_URL',
    f'http://localhost:{API_PORT}/reset-password',
)
APP_DEEP_LINK_SCHEME = os.getenv('APP_DEEP_LINK_SCHEME', 'tilevision')

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'TileVision')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', SMTP_USER)

ROBOFLOW_API_URL = os.getenv('ROBOFLOW_API_URL', 'https://serverless.roboflow.com')
ROBOFLOW_API_KEY = os.getenv('ROBOFLOW_API_KEY', '')
ROBOFLOW_WORKSPACE = os.getenv('ROBOFLOW_WORKSPACE', 'aurora-magdalene-benavidez')
ROBOFLOW_WORKFLOW_ID = os.getenv('ROBOFLOW_WORKFLOW_ID', 'general-segmentation-api')
ROBOFLOW_DEFECT_CLASSES = os.getenv('ROBOFLOW_DEFECT_CLASSES', 'hole,line,edge-chipping')

# AI training / inference paths (see backend/config/ai_paths.py)
TILE_DATASET_DIR = os.getenv('TILE_DATASET_DIR', str(ROOT_DIR / 'tile_dataset'))
MODELS_DIR = os.getenv('MODELS_DIR', str(ROOT_DIR / 'models'))
TRAINING_DIR = os.getenv('TRAINING_DIR', str(ROOT_DIR / 'training'))
RECOGNITION_LOGS_DIR = os.getenv('RECOGNITION_LOGS_DIR', str(ROOT_DIR / 'recognition_logs'))
YOLO_MODEL_FILE = os.getenv('YOLO_MODEL_FILE', 'tilevision_yolov8.pt')

MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', '127.0.0.1'),
    'port': int(os.getenv('MYSQL_PORT', '3306')),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'tilevision'),
    'charset': 'utf8mb4',
}
