-- The player's holiday, flipped from the swap icon on their own profile; null means use their location.
alter table public.profiles
  add column if not exists holiday_key text
  constraint profiles_holiday_key_check check (holiday_key in ('hanukkah', 'christmas'));
