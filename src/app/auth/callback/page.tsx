"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { supabase } from "@/lib/supabase/client";

// O supabase-js (fluxo PKCE, detectSessionInUrl) troca o ?code= pela sessão sozinho.
export default function Callback() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sb = supabase();
    const code = url.searchParams.get("code");
    const finalizar = () => router.replace("/conta");
    (async () => {
      const desc = url.searchParams.get("error_description") || url.hash.match(/error_description=([^&]+)/)?.[1];
      if (desc) {
        setErro(decodeURIComponent(desc.replace(/\+/g, " ")));
        return;
      }
      if (!sb) return finalizar();
      const { data } = await sb.auth.getSession();
      if (data.session) return finalizar();
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error && !(await sb.auth.getSession()).data.session) {
          setErro(error.message);
          return;
        }
      }
      finalizar();
    })();
  }, [router]);

  return (
    <main>
      <Cabecalho titulo="Entrando…" />
      <p className="p-6 text-lg text-terra">{erro ? `Não deu pra entrar: ${erro}` : "Abrindo a porteira do galpão…"}</p>
    </main>
  );
}
