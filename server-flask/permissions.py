WAREHOUSE_PERMISSIONS = [
    'view_home',
    'view_profile',
    'view_inventory',
    'manage_inventory',
    'manage_stock',
    'view_deliveries',
    'manage_deliveries',
    'recognize_tiles',
    'view_recognition_logs',
]

INSPECTION_PERMISSIONS = [
    'view_all_inspections',
    'submit_inspection',
    'approve_inspection',
    'reject_inspection',
    'add_qa_remarks',
    'review_manual_cases',
]

PROCUREMENT_PERMISSIONS = [
    'view_procurement',
    'manage_procurement',
    'view_suppliers',
    'manage_suppliers',
]

ADMIN_PERMISSIONS = (
    WAREHOUSE_PERMISSIONS
    + PROCUREMENT_PERMISSIONS
    + INSPECTION_PERMISSIONS
    + [
        'view_reports',
        'manage_users',
        'view_activity_logs',
    ]
)

ROLE_PERMISSIONS = {
    'System Administrator': ADMIN_PERMISSIONS,
    'Inventory Manager': WAREHOUSE_PERMISSIONS + [
        'view_procurement',
        'view_suppliers',
        'view_reports',
        'view_all_inspections',
    ],
    'Purchasing Officer': [
        'view_home',
        'view_profile',
        'view_inventory',
        'view_procurement',
        'manage_procurement',
        'view_suppliers',
        'manage_suppliers',
        'view_reports',
    ],
    'Warehouse Personnel': WAREHOUSE_PERMISSIONS + [
        'submit_inspection',
        'view_all_inspections',
    ],
    'Quality Assurance Manager': [
        'view_home',
        'view_profile',
        'view_reports',
        'view_all_inspections',
        'approve_inspection',
        'reject_inspection',
        'add_qa_remarks',
        'review_manual_cases',
        'view_recognition_logs',
        'view_inventory',
    ],
    'Customer Service': WAREHOUSE_PERMISSIONS,
}

ROLE_ALIASES = {
    'Quality Assurance Officer': 'Quality Assurance Manager',
}


def get_permissions_for_role(role: str) -> list[str]:
    normalized = ROLE_ALIASES.get(role, role)
    return ROLE_PERMISSIONS.get(normalized, ROLE_PERMISSIONS.get(role, []))


def has_permission(auth: dict, permission: str) -> bool:
    return permission in auth.get('permissions', [])
