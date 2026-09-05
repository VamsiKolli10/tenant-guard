-- Allow a password reset to evict sessions that already exist.
--
-- Sessions are stateless JWTs with a twelve-hour lifetime, so before this a
-- user who reset their password because they believed they were compromised
-- left the attacker's session working for up to twelve hours. Recording the
-- instant from which sessions are considered valid gives the JWT callback
-- something to check against without moving to database-backed sessions.

ALTER TABLE "User" ADD COLUMN "sessionsValidAfter" TIMESTAMP(3);
