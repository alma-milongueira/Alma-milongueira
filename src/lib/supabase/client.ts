import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { limparChave, limparUrlSupabase } from "./url";

const url = limparUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anon = limparChave(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabaseConfigurado = Boolean(url && anon);

let cliente: SupabaseClient | null = null;

/** Cliente do navegador. Retorna null quando o Supabase não está configurado (modo só-aparelho). */
export function supabase(): SupabaseClient | null {
  if (!supabaseConfigurado) return null;
  cliente ??= createClient(url!, anon!, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cliente;
}
