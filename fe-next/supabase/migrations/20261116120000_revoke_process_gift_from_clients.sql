-- process_gift is SECURITY DEFINER and trusts p_sender_id. Only the backend (service role) calls it,
-- so a signed-in user must not be able to run it directly and move another player's coins.
REVOKE EXECUTE ON FUNCTION public.process_gift(uuid, uuid, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_gift(uuid, uuid, text, integer, integer, integer) TO service_role;
