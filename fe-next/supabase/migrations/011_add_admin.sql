-- =============================================
-- ADD ADMIN USERS
-- Migration: 011_add_admin
-- =============================================

-- Grant admin access to both admin users
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
    '9a4bd525-6517-488d-a4fa-ee20f76e06c9',
    'd0da136a-13d5-4680-9c76-1ef9b408862a'
);
