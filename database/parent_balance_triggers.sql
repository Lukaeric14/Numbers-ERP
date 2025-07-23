-- Parent Balance Management System
-- This file contains triggers and functions to automatically maintain parent balance fields
-- based on invoice statuses and amounts.

-- Function to calculate and update parent balances
CREATE OR REPLACE FUNCTION update_parent_balances_from_invoices()
RETURNS TRIGGER AS $$
DECLARE
    parent_uuid uuid;
BEGIN
    -- Determine which parent to update
    IF TG_OP = 'DELETE' then
        parent_uuid := OLD.parent_id;
    ELSE
        parent_uuid := NEW.parent_id;
    END IF;

    -- Skip if no parent_id (shouldn't happen but safety check)
    IF parent_uuid IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Calculate and update parent balances
    UPDATE parents 
    SET 
        -- Current balance = sum of unpaid invoices (pending + sent)
        current_balance = COALESCE((
            SELECT SUM(amount_due - amount_paid)
            FROM invoices 
            WHERE parent_id = parent_uuid 
            AND status IN ('pending', 'sent')
            AND amount_due > amount_paid
        ), 0),
        
        -- Total billed = sum of all invoice amounts
        total_billed = COALESCE((
            SELECT SUM(amount_due)
            FROM invoices 
            WHERE parent_id = parent_uuid
        ), 0),
        
        -- Total paid = sum of all payments made
        total_paid = COALESCE((
            SELECT SUM(amount_paid)
            FROM invoices 
            WHERE parent_id = parent_uuid
        ), 0)
    
    WHERE id = parent_uuid;

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_update_parent_balances_on_invoice_change ON invoices;
CREATE TRIGGER trigger_update_parent_balances_on_invoice_change
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_balances_from_invoices();

-- Function to recalculate all parent balances (for data migration/cleanup)
CREATE OR REPLACE FUNCTION recalculate_all_parent_balances()
RETURNS void AS $$
BEGIN
    UPDATE parents 
    SET 
        current_balance = COALESCE((
            SELECT SUM(amount_due - amount_paid)
            FROM invoices 
            WHERE invoices.parent_id = parents.id 
            AND status IN ('pending', 'sent')
            AND amount_due > amount_paid
        ), 0),
        
        total_billed = COALESCE((
            SELECT SUM(amount_due)
            FROM invoices 
            WHERE invoices.parent_id = parents.id
        ), 0),
        
        total_paid = COALESCE((
            SELECT SUM(amount_paid)
            FROM invoices 
            WHERE invoices.parent_id = parents.id
        ), 0);
        
    RAISE NOTICE 'Recalculated balances for % parents', (SELECT COUNT(*) FROM parents);
END;
$$ LANGUAGE plpgsql;

-- Execute initial calculation for existing data
SELECT recalculate_all_parent_balances();

-- Add comments for documentation
COMMENT ON FUNCTION update_parent_balances_from_invoices() IS 'Automatically updates parent balance fields when invoices are modified';
COMMENT ON FUNCTION recalculate_all_parent_balances() IS 'Recalculates all parent balances from scratch - useful for data migration';
COMMENT ON TRIGGER trigger_update_parent_balances_on_invoice_change ON invoices IS 'Maintains parent balance consistency when invoices change';
