-- Enforce the append-only guarantee the application documents for its audit
-- trail. Application-level discipline is not tamper evidence: anything holding
-- the application's database credentials could previously rewrite or delete
-- audit history. This moves the guarantee into the database, where a
-- compromised application process cannot reach past it.

CREATE OR REPLACE FUNCTION "audit_log_append_only"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'AuditLog is append-only; % is not permitted on audit records', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "audit_log_append_only_guard" ON "AuditLog";

CREATE TRIGGER "audit_log_append_only_guard"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION "audit_log_append_only"();

-- Operational notes
--
-- 1. Retention pruning must be a deliberate, privileged act. A table owner or
--    superuser can run:
--        ALTER TABLE "AuditLog" DISABLE TRIGGER "audit_log_append_only_guard";
--        -- delete the aged partition/rows
--        ALTER TABLE "AuditLog" ENABLE TRIGGER "audit_log_append_only_guard";
--    Do this from an operator session, never from the application role.
--
-- 2. Deleting a User would cascade a SET NULL onto "AuditLog"."actorUserId",
--    which this trigger refuses. The application has no user-deletion path
--    today; if one is added, it must anonymise the user record rather than
--    delete it, or follow the privileged procedure in note 1.
