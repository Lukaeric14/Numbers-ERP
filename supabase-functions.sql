-- Supabase RPC Functions for Dashboard Queries
-- Run these in your Supabase SQL Editor

-- Function to get monthly revenue data
CREATE OR REPLACE FUNCTION get_monthly_revenue(target_workspace_id uuid)
RETURNS TABLE (
  total_revenue numeric,
  total_invoices bigint,
  total_paid numeric,
  outstanding_balance numeric
)
LANGUAGE sql
AS $$
  SELECT 
    sum(amount_due) as total_revenue,
    count(*) as total_invoices,
    sum(amount_paid) as total_paid,
    sum(amount_due - amount_paid) as outstanding_balance
  FROM invoices
  WHERE workspace_id = target_workspace_id
    AND date_trunc('month', created_at) = date_trunc('month', current_date);
$$;

-- Function to get new customers this month
CREATE OR REPLACE FUNCTION get_monthly_new_customers(target_workspace_id uuid)
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT count(*)
  FROM students
  WHERE workspace_id = target_workspace_id
    AND date_trunc('month', created_at) = date_trunc('month', current_date);
$$;

-- Function to get total active students
CREATE OR REPLACE FUNCTION get_active_students(target_workspace_id uuid)
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT count(*)
  FROM students
  WHERE workspace_id = target_workspace_id;
$$;

-- Function to get lessons data for chart (last 30 days)
CREATE OR REPLACE FUNCTION get_lessons_chart_data(target_workspace_id uuid)
RETURNS TABLE (
  lesson_date date,
  lesson_count bigint
)
LANGUAGE sql
AS $$
  SELECT 
    date_trunc('day', start_time)::date as lesson_date,
    count(*) as lesson_count
  FROM lessons
  WHERE workspace_id = target_workspace_id
    AND start_time >= current_date - interval '30 days'
  GROUP BY date_trunc('day', start_time)
  ORDER BY lesson_date;
$$;

-- Function to get recent lessons for table
CREATE OR REPLACE FUNCTION get_recent_lessons(target_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  service_name text,
  status text,
  start_time timestamp with time zone,
  student_name text
)
LANGUAGE sql
AS $$
  SELECT 
    l.id,
    l.title,
    s.name as service_name,
    l.status,
    l.start_time,
    concat(st.first_name, ' ', st.last_name) as student_name
  FROM lessons l
  LEFT JOIN services s ON l.service_id = s.id
  LEFT JOIN students st ON l.student_id = st.id
  WHERE l.workspace_id = target_workspace_id
  ORDER BY l.start_time DESC
  LIMIT 10;
$$;
