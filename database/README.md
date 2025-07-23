# Database Migrations and Triggers

This directory contains database migrations and triggers for the Numbers ERP system.

## Parent Balance Automation

The parent balance automation system automatically maintains the following fields in the `parents` table:

- **`current_balance`**: Sum of outstanding invoices (pending + sent status)
- **`total_billed`**: Sum of all invoice amounts ever created
- **`total_paid`**: Sum of all payments received

### How It Works

1. **Automatic Updates**: Triggers fire whenever invoices are created, updated, or deleted
2. **Real-time Calculations**: Parent balances are updated immediately when invoice status changes
3. **Accurate Tracking**: Handles partial payments and status transitions properly

### Applying the Migration

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250123_parent_balance_automation.sql`
4. Paste and run the SQL

#### Option 2: Supabase CLI
```bash
# If you have Supabase CLI set up
supabase db push
```

#### Option 3: Direct SQL Execution
```bash
# Connect to your database and run:
psql -h your-db-host -U your-username -d your-database -f supabase/migrations/20250123_parent_balance_automation.sql
```

### Functions Created

1. **`update_parent_balances_from_invoices()`**
   - Trigger function that runs on invoice changes
   - Recalculates balances for the affected parent
   - Handles INSERT, UPDATE, and DELETE operations

2. **`recalculate_all_parent_balances()`**
   - Utility function to recalculate all parent balances
   - Useful for data migration or fixing inconsistencies
   - Can be called manually: `SELECT recalculate_all_parent_balances();`

### Trigger Details

- **Trigger Name**: `trigger_update_parent_balances_on_invoice_change`
- **Fires On**: `AFTER INSERT OR UPDATE OR DELETE ON invoices`
- **For Each**: `ROW`

### Balance Calculations

```sql
-- Current Balance (Outstanding)
current_balance = SUM(amount_due - amount_paid) 
WHERE status IN ('pending', 'sent') AND amount_due > amount_paid

-- Total Billed (All Time)
total_billed = SUM(amount_due) 
WHERE parent_id = parent_uuid

-- Total Paid (All Time)  
total_paid = SUM(amount_paid)
WHERE parent_id = parent_uuid
```

### Testing the System

After applying the migration:

1. **Create an invoice** - Parent's `current_balance` and `total_billed` should increase
2. **Mark invoice as paid** - Parent's `current_balance` should decrease, `total_paid` should increase
3. **Delete an invoice** - All balances should recalculate correctly

### Troubleshooting

If balances seem incorrect, you can recalculate them manually:

```sql
SELECT recalculate_all_parent_balances();
```

This will fix any inconsistencies and bring all parent balances up to date.

### Performance Notes

- Triggers are efficient and only update the specific parent affected
- Calculations use proper indexes on `parent_id` and `status` fields
- COALESCE handles NULL cases gracefully
- No performance impact on other database operations
