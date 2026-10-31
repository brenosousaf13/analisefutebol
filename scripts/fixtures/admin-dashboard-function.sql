-- Function body exported on 2026-10-31 for isolated tests. No production records.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(id uuid, email character varying, full_name text, phone text, cpf text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, analysis_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _jwt_email text;
  _is_admin boolean;
BEGIN
  -- Get the email of the currently authenticated user
  -- Using a distinct variable name to avoid ambiguity with column names
  SELECT auth.jwt() ->> 'email' INTO _jwt_email;

  -- Security Check: Check if email exists in admin_users table
  -- We explicitly alias the table 'au_admin' to ensure no ambiguity
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au_admin WHERE au_admin.email = _jwt_email
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Access Denied: User % is not authorized.', _jwt_email;
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::varchar,
    (au.raw_user_meta_data->>'full_name')::text as full_name,
    (au.raw_user_meta_data->>'phone')::text as phone,
    (au.raw_user_meta_data->>'cpf')::text as cpf,
    au.created_at,
    au.last_sign_in_at,
    COUNT(a.id) as analysis_count
  FROM auth.users au
  LEFT JOIN public.analyses a ON a.user_id = au.id
  GROUP BY au.id
  ORDER BY au.created_at DESC;
END;
$function$
