-- Remove css_class from tool tables (colour/class is not user-configurable on tool pages).

alter table public.tool_categories
  drop column if exists css_class;

alter table public.tool_items
  drop column if exists css_class;
