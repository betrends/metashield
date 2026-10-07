-- Store Paystack transaction reference on invoices for reconciliation
alter table invoices add column if not exists paystack_reference text;
