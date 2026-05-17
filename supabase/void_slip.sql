alter table public.sales
  add column if not exists cost_of_goods_sold numeric(12, 2),
  add column if not exists gross_profit numeric(12, 2),
  add column if not exists pricing_method text,
  add column if not exists voided_at timestamptz;

alter table public.sales
  drop constraint if exists sales_slip_status_check;

alter table public.sales
  add constraint sales_slip_status_check
  check (slip_status in ('DRAFT', 'SOLD', 'VOID'));

alter table public.sales_slip_items
  add column if not exists unit_cost_applied numeric(12, 2),
  add column if not exists line_cost numeric(12, 2),
  add column if not exists line_profit numeric(12, 2);

create or replace function public.void_slip(p_slip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slip public.sales%rowtype;
  v_item record;
  v_total_qty numeric;
  v_total_value numeric;
  v_unit_cost numeric;
begin
  if p_slip_id is null then
    raise exception 'p_slip_id is required';
  end if;

  select *
  into v_slip
  from public.sales
  where id = p_slip_id
  for update;

  if not found then
    raise exception 'Slip % not found', p_slip_id;
  end if;

  if v_slip.slip_status <> 'SOLD' then
    raise exception 'Only SOLD slips can be voided. Current status: %', v_slip.slip_status;
  end if;

  if v_slip.completed_at is null then
    raise exception 'Slip % cannot be voided because completed_at is null', p_slip_id;
  end if;

  if v_slip.slip_type not in ('SALE', 'RETURN') then
    raise exception 'Unsupported slip_type: %', v_slip.slip_type;
  end if;

  if not exists (
    select 1
    from public.sales_slip_items
    where slip_id = p_slip_id
  ) then
    raise exception 'Slip % has no line items', p_slip_id;
  end if;

  for v_item in
    select
      product_id,
      sum(quantity) as quantity,
      max(unit_cost_applied) as unit_cost_applied,
      sum(line_cost) as line_cost
    from public.sales_slip_items
    where slip_id = p_slip_id
    group by product_id
    order by product_id
  loop
    if coalesce(v_item.quantity, 0) <= 0 then
      raise exception
        'Slip % contains invalid quantity % for product %',
        p_slip_id, v_item.quantity, v_item.product_id;
    end if;

    v_unit_cost := coalesce(
      v_item.unit_cost_applied,
      case
        when coalesce(v_item.quantity, 0) = 0 then null
        when v_item.line_cost is null then null
        else round(v_item.line_cost / v_item.quantity, 2)
      end,
      0
    );

    if v_slip.slip_type = 'SALE' then
      insert into public.inventory_in (
        shop_id,
        product_id,
        quantity,
        remaining_quantity,
        purchase_price,
        created_at
      )
      values (
        v_slip.shop_id,
        v_item.product_id,
        v_item.quantity,
        v_item.quantity,
        v_unit_cost,
        now()
      );
    else
      select
        coalesce(sum(ii.remaining_quantity), 0),
        coalesce(sum(ii.remaining_quantity * ii.purchase_price), 0)
      into v_total_qty, v_total_value
      from public.inventory_in ii
      where ii.shop_id = v_slip.shop_id
        and ii.product_id = v_item.product_id;

      if v_total_qty < v_item.quantity then
        raise exception
          'Cannot void return for product %, available stock % is below required %',
          v_item.product_id, v_total_qty, v_item.quantity;
      end if;

      insert into public.inventory_in (
        shop_id,
        product_id,
        quantity,
        remaining_quantity,
        purchase_price,
        created_at
      )
      values (
        v_slip.shop_id,
        v_item.product_id,
        0,
        -1 * v_item.quantity,
        case
          when v_total_qty = 0 then v_unit_cost
          else round(v_total_value / v_total_qty, 2)
        end,
        now()
      );
    end if;
  end loop;

  update public.sales
  set
    slip_status = 'VOID',
    voided_at = now()
  where id = p_slip_id
    and slip_status = 'SOLD';

  if not found then
    raise exception 'Failed to void slip %', p_slip_id;
  end if;
end;
$$;

create index if not exists idx_sales_slip_items_slip_product
  on public.sales_slip_items (slip_id, product_id);

create index if not exists idx_inventory_in_shop_product
  on public.inventory_in (shop_id, product_id);

revoke all on function public.void_slip(uuid) from public;
grant execute on function public.void_slip(uuid) to anon, authenticated, service_role;
