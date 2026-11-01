# Galpão Estúdio

Estúdio de bolso para compositores de música nativista do Rio Grande do Sul. É um PWA mobile-first: dá pra instalar no celular e funciona sem internet.

> **Fase 1 (pronta):** projetos, editor de letra com contador de sílabas e rimas, cifras com transposição, capotraste e afinações, e IA de acordes e temas.
> Fases 2–4 (gravação, mixer, alinhamento, convites…) entram depois, cada uma com confirmação.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase: Auth (link por e-mail e Google), Postgres com RLS (Storage entra na Fase 2)
- PWA: `app/manifest.ts` + `public/sw.js` (offline básico)
- IA de texto: Gemini **ou** Groq (camada gratuita), sempre chamada pela rota server-side `/api/ia`
- Vitest para os testes do motor musical

## Estrutura

```
src/
  app/
    page.tsx              # Início ("Galpão")
    projetos/             # Lista + criar projeto
    projeto/              # Editor (/projeto?id=…): Letra · Cifra · Ideias · Ficha
    ideias/               # IA de acordes e temas avulsa
    conta/                # Login (Google / link por e-mail), levar projetos pra nuvem
    auth/callback/        # Retorno do login (PKCE)
    offline/              # Página de fallback do service worker
    api/ia/route.ts       # Rota server-side da IA (com limite por IP)
    manifest.ts           # Manifesto do PWA
  components/
    letra/LetraEditor.tsx # Seções, versos, sílabas, esquema de rimas, folha de rimas
    cifra/                # Editor/visualizador ChordPro + diagramas de acordes
    ideias/IdeiasPainel.tsx
    projeto/              # Ficha técnica, cartões
    Icones.tsx            # Gaita, violão, bombo, cuia…
  lib/
    music/                # notas, acordes, afinações (busca de posições), ritmos, harmonia (graus/variações)
    letra/                # sílabas poéticas, rimas + vocabulário campeiro
    ia/                   # provedores (Gemini/Groq), prompts, validação, banco de temas
    audio/tocador.ts      # Toca a progressão com a levada do ritmo (Web Audio)
    data/                 # Repositório local (localStorage) e nuvem (Supabase)
    supabase/client.ts
supabase/migrations/      # Schema SQL com RLS
public/sw.js, public/icones/
```

### Como a IA combina regras e modelo

1. O **motor de teoria** (`lib/music/harmonia.ts`) gera as progressões típicas de cada ritmo no tom escolhido e variações (ii–V, dominante secundária, troca pelo relativo, empréstimo modal, diminuto de passagem). Funciona offline e sem chave.
2. Essas progressões vão no prompt como base, e o modelo é instruído a propor progressões **novas** em JSON.
3. A resposta é **validada pelas regras**: um acorde que não existe derruba a progressão inteira, e cada acorde fora do tom aparece marcado em amarelo.
4. Sem chave ou com falha da IA, a tela segue com as sugestões do motor e avisa.

Temas (pago, querência, fronteira, chimarrão, lida campeira) seguem a mesma lógica: há um banco local de imagens, motes e títulos, e a IA acrescenta ideias originais.

### Sílabas e rimas

- O contador mostra a contagem **poética**, até a última sílaba tônica e com sinalefa entre vogais, e embaixo, menor, a **gramatical**.
- Cada seção pode ter uma métrica-alvo (ex.: 7 = redondilha maior). O número fica verde quando bate com a métrica, amarelo com ±1 e vermelho com diferença maior.
- Rimas: a chave vai da vogal tônica até o fim da palavra. O dicionário traz mais de 400 palavras, com o vocabulário campeiro em destaque, e também usa as palavras da própria letra. Se faltar opção, dá pra pedir mais rimas à IA.

### Cifra

Formato ChordPro: `[Em]Lá no meu [B7]pago`. Uma linha `{Refrão}` vira título de parte. Ao trocar o tom ou o capotraste, a tela mostra o tom que soa e o **desenho na mão**. Os diagramas são calculados para qualquer afinação (Padrão, Drop D, DADGAD, meio tom abaixo), e o botão “Sugerir capotraste” procura a casa em que os desenhos ficam mais fáceis.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # opcional: sem Supabase roda em modo local
npm run dev                  # http://localhost:3000
npm test                     # testes do motor musical
npm run build && npm start   # produção (o service worker só registra em produção)
```

Sem as variáveis do Supabase, o app funciona por completo em **modo local**: os dados ficam no aparelho e não há login.

## Deploy

### 1. Supabase

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor → New query**: cole e rode `supabase/migrations/0001_fase1_projetos.sql`. Se preferir a CLI, use `supabase link` e depois `supabase db push`.
3. **Authentication → URL Configuration**
   - *Site URL*: `https://SEU-APP.vercel.app`
   - *Redirect URLs*: `https://SEU-APP.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`
4. **Authentication → Providers**
   - *Email*: já vem ligado (o login é por link mágico).
   - *Google*: crie um OAuth Client no Google Cloud Console (tipo “Web”). A URI de redirecionamento autorizada é `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Depois cole o Client ID e o Secret no Supabase.
5. **Project Settings → API**: copie a `URL` e a `anon public key`.

### 2. Chave de IA (gratuita)

- Gemini: <https://aistudio.google.com/apikey> → `GEMINI_API_KEY`
- Groq: <https://console.groq.com/keys> → `GROQ_API_KEY`

### 3. Vercel

1. Importe o repositório em <https://vercel.com/new>. O framework (Next.js) é detectado sozinho.
2. Em **Settings → Environment Variables**, cadastre as variáveis do `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `GEMINI_API_KEY` (ou `GROQ_API_KEY`).
3. Faça o deploy e atualize a *Site URL* do Supabase com o domínio final.
4. No celular, abra o site e escolha **Adicionar à tela inicial** para instalar o PWA.

## Segurança

- RLS ligado: cada usuário só lê e altera os próprios projetos, e um trigger impede trocar o dono.
- As chaves de IA ficam só no servidor (`server-only`). A rota `/api/ia` limita tamanho do pedido e frequência por IP.
- A `anon key` é pública por design; a proteção dos dados vem do RLS.
