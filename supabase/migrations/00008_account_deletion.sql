-- Self-service account deletion (App Store Guideline 5.1.1(v)).
-- A SECURITY DEFINER function lets a signed-in user delete their own auth.users
-- row; every public table cascades off profiles → auth.users, so this wipes all
-- of the user's data (profiles, organizations, shifts, recurrence patterns,
-- suggestions, phone_verifications, shift_notifications).

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
