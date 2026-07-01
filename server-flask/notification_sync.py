"""Keep management-portal notification feeds aligned with live warehouse data."""

from notification_repository import delete_notification, upsert_notification
from procurement_repository import count_pending_procurement
from repositories import list_inspections_for_auth, list_managed_users
from warehouse_repository import list_low_stock_tiles


def _sync_id(user_id: str, key: str) -> str:
    return f'notif-sync-{user_id}-{key}'


def _auth_for_user(user_id: str) -> dict:
    return {
        'userId': user_id,
        'permissions': ['view_all_inspections', 'view_inventory', 'view_procurement'],
    }


def _count_pending_manual_reviews(auth: dict) -> int:
    inspections = list_inspections_for_auth(auth)
    return sum(
        1
        for record in inspections
        if record.get('result') == 'Manual'
        or record.get('inventoryStatus') == 'Pending'
        or record.get('qaStatus') == 'Pending'
    )


def _count_inventory_blocked(auth: dict) -> int:
    inspections = list_inspections_for_auth(auth)
    return sum(
        1
        for record in inspections
        if record.get('inventoryStatus') == 'Rejected'
        or record.get('result') == 'Rejected'
    )


def _upsert_or_clear(
    user_id: str,
    key: str,
    *,
    active: bool,
    title: str,
    message: str,
    notification_type: str,
    related_id: str,
) -> None:
    notification_id = _sync_id(user_id, key)
    if not active:
        delete_notification(notification_id, user_id)
        return
    upsert_notification({
        'id': notification_id,
        'userId': user_id,
        'title': title,
        'message': message,
        'type': notification_type,
        'relatedId': related_id,
        'read': False,
    })


def sync_management_notifications(user_id: str, role: str) -> None:
    auth = _auth_for_user(user_id)

    if role == 'System Administrator':
        managed_count = len(list_managed_users())
        _upsert_or_clear(
            user_id,
            'managed-users',
            active=managed_count > 0,
            title='Portal Accounts',
            message=f'{managed_count} management and warehouse accounts are active in TileVision.',
            notification_type='users',
            related_id='sync:managed-users',
        )
        return

    if role in ('Quality Assurance Manager', 'Quality Assurance Officer'):
        pending = _count_pending_manual_reviews(auth)
        _upsert_or_clear(
            user_id,
            'pending-qa',
            active=pending > 0,
            title='Manual Review Queue',
            message=(
                f'{pending} inspection{"s" if pending != 1 else ""} '
                'need QA verification in the manual review queue.'
            ),
            notification_type='qa',
            related_id='sync:pending-qa',
        )
        return

    if role == 'Inventory Manager':
        low_stock = list_low_stock_tiles()
        low_count = len(low_stock)
        _upsert_or_clear(
            user_id,
            'low-stock',
            active=low_count > 0,
            title='Low Stock Alert',
            message=(
                f'{low_count} SKU{"s" if low_count != 1 else ""} '
                'are at or below reorder level.'
            ),
            notification_type='inventory',
            related_id='sync:low-stock',
        )

        blocked = _count_inventory_blocked(auth)
        _upsert_or_clear(
            user_id,
            'blocked-inventory',
            active=blocked > 0,
            title='Blocked Inventory',
            message=(
                f'{blocked} batch{"es" if blocked != 1 else ""} '
                'are blocked pending QA or inventory action.'
            ),
            notification_type='inventory',
            related_id='sync:blocked-inventory',
        )
        return

    if role == 'Purchasing Officer':
        low_stock = list_low_stock_tiles()
        low_count = len(low_stock)
        _upsert_or_clear(
            user_id,
            'reorder-alerts',
            active=low_count > 0,
            title='Reorder Alerts',
            message=(
                f'{low_count} tile SKU{"s" if low_count != 1 else ""} '
                'need procurement attention.'
            ),
            notification_type='procurement',
            related_id='sync:reorder-alerts',
        )

        pending_procurement = count_pending_procurement()
        _upsert_or_clear(
            user_id,
            'pending-procurement',
            active=pending_procurement > 0,
            title='Pending Purchase Requests',
            message=(
                f'{pending_procurement} purchase request'
                f'{"s" if pending_procurement != 1 else ""} await approval or fulfillment.'
            ),
            notification_type='procurement',
            related_id='sync:pending-procurement',
        )
