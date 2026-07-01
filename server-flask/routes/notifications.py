from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate
from notification_repository import (
    list_notifications_for_user,
    mark_all_notifications_read,
    mark_notification_read,
    upsert_push_token,
)
from notification_service import ensure_welcome_notification
from notification_sync import sync_management_notifications

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.get('/')
@authenticate
def list_notifications():
    user_id = g.auth['userId']
    role = g.auth.get('role', '')
    ensure_welcome_notification(user_id)
    sync_management_notifications(user_id, role)
    records = list_notifications_for_user(user_id)
    unread = sum(1 for item in records if not item['read'])
    return jsonify({'success': True, 'notifications': records, 'unreadCount': unread})


@notifications_bp.patch('/<notification_id>/read')
@authenticate
def read_notification(notification_id: str):
    updated = mark_notification_read(notification_id, g.auth['userId'])
    if not updated:
        return jsonify({'success': False, 'error': 'Notification not found.'}), 404
    return jsonify({'success': True})


@notifications_bp.post('/read-all')
@authenticate
def read_all_notifications():
    count = mark_all_notifications_read(g.auth['userId'])
    return jsonify({'success': True, 'markedRead': count})


@notifications_bp.post('/push-token')
@authenticate
def register_push_token():
    body = request.get_json(silent=True) or {}
    token = (body.get('token') or '').strip()
    platform = (body.get('platform') or '').strip() or None

    if not token:
        return jsonify({'success': False, 'error': 'Push token is required.'}), 400

    upsert_push_token(g.auth['userId'], token, platform)
    ensure_welcome_notification(g.auth['userId'])

    return jsonify({'success': True})
