alter table public.sales
  add column if not exists receiver_name text,
  add column if not exists customer_phone text,
  add column if not exists payment_status text;

alter table public.sales
  drop constraint if exists sales_payment_status_check;

alter table public.sales
  add constraint sales_payment_status_check
  check (payment_status is null or payment_status in ('PAID', 'UNPAID'));
