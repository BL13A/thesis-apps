import type { Permission, UserRole } from '@/types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'Warehouse Personnel': ['view_home', 'view_profile'],
  'Quality Assurance Officer': ['view_home', 'view_profile'],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_home: 'Home Dashboard',
  start_inspection: 'Start Inspection',
  submit_inspection: 'Submit Inspection',
  capture_images: 'Capture Tile Images',
  view_own_history: 'Own Inspection History',
  view_own_results: 'Own Inspection Results',
  view_profile: 'Profile Access',
  view_all_inspections: 'View All Inspections',
  review_manual_cases: 'Review Manual Cases',
  approve_inspection: 'Approve Inspection',
  reject_inspection: 'Reject Inspection',
  add_qa_remarks: 'Add QA Remarks',
  view_defect_summary: 'Defect Summary',
};

export const RESTRICTED_FOR_WAREHOUSE: string[] = [
  'QA Review',
  'Approve / Reject Inspection',
  'Defect Analytics',
  'User Management',
  'Inventory Management',
  'Procurement',
];

export const RESTRICTED_FOR_QA: string[] = [
  'Start Inspection',
  'Procurement',
  'User Management',
  'System Configuration',
];
