import Login from "./Login";

// MVP: signup uses the same magic-link flow as login. Supabase creates the
// auth row on first successful sign-in. The handle_new_user() trigger seeds
// public.users + public.settings.
export default function Signup() {
  return <Login />;
}
