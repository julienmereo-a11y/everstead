-- Let a firm's advisers see the invoices the Everstead team uploads for them.
-- invoices is service-role-only, so reads go through a SECURITY DEFINER RPC scoped
-- to the caller's firm; a storage SELECT policy lets them open the PDF (signed URL).

create or replace function public.get_adviser_invoices()
returns table(id uuid, amount integer, currency text, issue_date date, due_date date,
              status text, file_path text, notes text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select i.id, i.amount, i.currency, i.issue_date, i.due_date, i.status, i.file_path, i.notes, i.created_at
  from public.invoices i
  where i.adviser_id in (select public.my_adviser_firm_ids())
  order by i.issue_date desc
$$;
grant execute on function public.get_adviser_invoices() to authenticated;

-- Invoice PDFs are stored at '<firm_id>/<file>'. A firm's advisers may read theirs.
drop policy if exists "advisers read own firm invoices" on storage.objects;
create policy "advisers read own firm invoices" on storage.objects for select to authenticated
  using (bucket_id = 'adviser-invoices'
    and exists (select 1 from public.my_adviser_firm_ids() fid where fid::text = split_part(name, '/', 1)));
