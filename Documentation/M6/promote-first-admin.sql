-- SEN371 M6 - provision the first administrator
--
-- The API has no path to create an admin: registration always assigns
-- Role.Customer and nothing seeds one. This promotes an account that has
-- ALREADY REGISTERED through the deployed site, so the password is chosen by
-- that person and hashed by the API (BCrypt). No password or hash ever
-- appears in this file, the repo, or chat.
--
-- Run once in the Supabase SQL editor, after replacing the email below.
-- Role is stored as a string ('Customer' / 'Admin') - see UserConfiguration.
-- The person must sign out and back in afterwards: the role is read from the
-- JWT, and their existing token still says "customer".

BEGIN;

UPDATE users
SET    "Role" = 'Admin'
WHERE  lower("Email") = lower('REPLACE-WITH-ADMIN-EMAIL@example.com')
RETURNING "Id", "Email", "Role";          -- expect exactly 1 row

-- Expect exactly the admin(s) you intend. If the UPDATE returned 0 rows,
-- the email is wrong or the account is not registered yet: ROLLBACK.
SELECT "Email", "Role" FROM users WHERE "Role" = 'Admin';

COMMIT;
