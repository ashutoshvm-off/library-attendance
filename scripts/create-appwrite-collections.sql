-- This is a reference for the Appwrite collections structure
-- You'll need to create these collections in your Appwrite console

-- Collection: records
-- Attributes:
-- - admissionId (string, required)
-- - studentName (string, required)
-- - checkInTime (datetime, optional)
-- - checkOutTime (datetime, optional)
-- - date (string, required) -- Format: YYYY-MM-DD
-- - status (enum: ['checked-in', 'checked-out'], required)

-- Collection: students
-- Attributes:
-- - admissionId (string, required, unique)
-- - name (string, required)
-- - email (string, optional)
-- - phone (string, optional)

-- Collection: staff
-- Attributes:
-- - staffId (string, required, unique)
-- - name (string, required)
-- - role (string, required)
-- - email (string, optional)
-- - isActive (boolean, default: true)

-- Collection: login-records
-- Attributes:
-- - staffId (string, required)
-- - staffName (string, required)
-- - staffRole (string, required)
-- - loginTime (datetime, required)
-- - logoutTime (datetime, optional)
-- - sessionDuration (integer, optional) -- in seconds
-- - ipAddress (string, optional)
-- - userAgent (string, optional)

-- Indexes to create:
-- records collection:
-- - Index on 'date' field for faster date-based queries
-- - Index on 'admissionId' field for faster student lookups
-- - Index on 'status' field for filtering checked-in/out students

-- students collection:
-- - Index on 'admissionId' field (unique) for faster lookups

-- staff collection:
-- - Index on 'staffId' field (unique) for faster lookups

-- login-records collection:
-- - Index on 'loginTime' field for chronological sorting
-- - Index on 'staffId' field for staff-specific queries
-- - Index on 'logoutTime' field for active session queries
