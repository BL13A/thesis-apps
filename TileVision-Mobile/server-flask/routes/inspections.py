from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from auth_middleware import authenticate, require_permission
from permissions import has_permission
from batch_ids import generate_next_batch_id, is_valid_batch_id, normalize_batch_id
from notification_service import notify_after_inspection_created, notify_after_qa_review
from repositories import (
    find_inspection_by_id,
    find_user_by_id,
    insert_inspection,
    list_inspections_for_auth,
    update_inspection_image,
    update_inspection_qa_review,
)

inspections_bp = Blueprint('inspections', __name__, url_prefix='/api/inspections')

REQUIRED_BATCH_FIELDS = [
    'batchId',
    'supplierName',
    'tileType',
    'tileSize',
    'quantity',
    'expectedDimension',
]


def compute_inventory_status(qa_status: str, current_status: str | None) -> str:
    if qa_status == 'Passed':
        return 'Available'
    if qa_status == 'Rejected':
        return 'Rejected'
    return current_status or 'Pending'


@inspections_bp.get('/')
@authenticate
def list_inspections():
    records = list_inspections_for_auth(g.auth)
    if not records and has_permission(g.auth, 'view_all_inspections'):
        from inspection_seed import seed_inspection_records

        seed_inspection_records()
        records = list_inspections_for_auth(g.auth)
    return jsonify({'success': True, 'inspections': records})


@inspections_bp.get('/<inspection_id>')
@authenticate
def get_inspection(inspection_id: str):
    record = find_inspection_by_id(inspection_id)
    if not record:
        return jsonify({'success': False, 'error': 'Inspection not found.'}), 404

    can_view_all = has_permission(g.auth, 'view_all_inspections')
    if not can_view_all and record['inspectedBy'] != g.auth['userId']:
        return jsonify({'success': False, 'error': 'You do not have access to this inspection.'}), 403

    return jsonify({'success': True, 'inspection': record})


def _request_body() -> dict:
    if request.content_type and 'multipart/form-data' in request.content_type:
        return request.form.to_dict()
    return request.get_json(silent=True) or {}


@inspections_bp.post('/')
@authenticate
@require_permission('submit_inspection')
def create_inspection():
    body = _request_body()
    missing = [field for field in REQUIRED_BATCH_FIELDS if not str(body.get(field, '')).strip()]

    if missing:
        return jsonify({
            'success': False,
            'error': f'Missing required fields: {", ".join(missing)}',
        }), 400

    if not body.get('result') or not body.get('defectType') or body.get('confidenceScore') is None:
        return jsonify({'success': False, 'error': 'Inspection result fields are required.'}), 400

    raw_batch_id = str(body.get('batchId') or '').strip()
    batch_id = normalize_batch_id(raw_batch_id)
    if not batch_id:
        if raw_batch_id and not is_valid_batch_id(raw_batch_id):
            return jsonify({
                'success': False,
                'error': 'batchId must use numeric format YYYY-NNNN (example: 2026-0142).',
            }), 400
        batch_id = generate_next_batch_id()

    inspector = find_user_by_id(g.auth['userId'])
    record = {
        'id': str(body.get('id') or f'insp-{int(datetime.now().timestamp() * 1000)}'),
        'date': body.get('date') or datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'batchId': batch_id,
        'supplierName': str(body['supplierName']).strip(),
        'tileType': str(body['tileType']).strip(),
        'tileSize': str(body['tileSize']).strip(),
        'quantity': str(body['quantity']).strip(),
        'expectedDimension': str(body['expectedDimension']).strip(),
        'imageUri': body.get('imageUri')
        or (request.files.get('image').filename if request.files.get('image') else None),
        'result': body['result'],
        'defectType': body['defectType'],
        'confidenceScore': float(body['confidenceScore']),
        'sizeValidation': body.get('sizeValidation') or 'Valid',
        'inventoryStatus': body.get('inventoryStatus') or 'Pending',
        'inspectedBy': g.auth['userId'],
        'inspectedByName': (inspector or {}).get('name') or body.get('inspectedByName') or 'Warehouse User',
        'qaStatus': body.get('qaStatus') or ('Pending' if body['result'] == 'Manual' else 'None'),
        'qaRemarks': body.get('qaRemarks'),
        'reviewedBy': body.get('reviewedBy'),
        'reviewedAt': body.get('reviewedAt'),
    }

    insert_inspection(record)
    notify_after_inspection_created(record)
    return jsonify({'success': True, 'inspection': record}), 201


@inspections_bp.route('/<inspection_id>/qa', methods=['PATCH'])
@inspections_bp.route('/<inspection_id>/review', methods=['PATCH'])
@authenticate
def qa_review(inspection_id: str):
    record = find_inspection_by_id(inspection_id)
    if not record:
        return jsonify({'success': False, 'error': 'Inspection not found.'}), 404

    body = request.get_json(silent=True) or {}
    qa_status = body.get('qaStatus')
    qa_remarks = (body.get('qaRemarks') or '').strip()
    reviewer = find_user_by_id(g.auth['userId'])
    reviewer_name = (body.get('reviewerName') or '').strip() or (reviewer or {}).get('name') or 'QA Officer'

    if qa_status not in ('Passed', 'Rejected'):
        return jsonify({'success': False, 'error': 'qaStatus must be Passed or Rejected.'}), 400

    if qa_status == 'Passed' and not has_permission(g.auth, 'approve_inspection'):
        return jsonify({'success': False, 'error': 'You cannot approve inspections.'}), 403
    if qa_status == 'Rejected' and not has_permission(g.auth, 'reject_inspection'):
        return jsonify({'success': False, 'error': 'You cannot reject inspections.'}), 403
    if not has_permission(g.auth, 'add_qa_remarks') and not has_permission(g.auth, 'review_manual_cases'):
        return jsonify({'success': False, 'error': 'You cannot review inspections.'}), 403

    updated = update_inspection_qa_review(
        record['id'],
        {
            'qaStatus': qa_status,
            'qaRemarks': qa_remarks,
            'reviewedBy': reviewer_name,
            'reviewedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'inventoryStatus': compute_inventory_status(qa_status, record.get('inventoryStatus')),
        },
    )

    notify_after_qa_review(updated, g.auth['userId'])
    return jsonify({'success': True, 'inspection': updated})


@inspections_bp.route('/<inspection_id>/image', methods=['PATCH'])
@authenticate
def set_inspection_image(inspection_id: str):
    if not has_permission(g.auth, 'view_all_inspections'):
        return jsonify({'success': False, 'error': 'You cannot update this inspection.'}), 403

    record = find_inspection_by_id(inspection_id)
    if not record:
        return jsonify({'success': False, 'error': 'Inspection not found.'}), 404

    body = request.get_json(silent=True) or {}
    image_uri = str(body.get('imageUri') or '').strip()
    if not image_uri:
        return jsonify({'success': False, 'error': 'imageUri is required.'}), 400

    updated = update_inspection_image(inspection_id, image_uri)
    return jsonify({'success': True, 'inspection': updated})
