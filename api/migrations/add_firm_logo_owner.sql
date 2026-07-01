-- Let a firm OWNER set their firm's logo from inside the adviser portal.
-- The advisers table is service-role-only, so the write goes through a SECURITY
-- DEFINER RPC scoped to the caller's owned firm; a matching storage policy lets the
-- owner upload the file to the adviser-logos bucket.

create or replace function public.set_firm_logo(p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  select adviser_id into fid from public.adviser_members
    where user_id = auth.uid() and role = 'owner' and invite_status = 'accepted' limit 1;
  if fid is null then raise exception 'Only a firm owner can change the logo'; end if;
  update public.advisers set logo_url = p_url, updated_at = now() where id = fid;
end $$;
grant execute on function public.set_firm_logo(text) to authenticated;

drop policy if exists "firm owners upload adviser-logos" on storage.objects;
create policy "firm owners upload adviser-logos" on storage.objects for all to authenticated
  using      (bucket_id = 'adviser-logos' and exists (select 1 from public.adviser_members m where m.user_id = auth.uid() and m.role = 'owner' and m.invite_status = 'accepted'))
  with check (bucket_id = 'adviser-logos' and exists (select 1 from public.adviser_members m where m.user_id = auth.uid() and m.role = 'owner' and m.invite_status = 'accepted'));
