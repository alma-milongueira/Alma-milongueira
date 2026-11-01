# Alma Milongueira

Estúdio de bolso para compositores de música nativista do Rio Grande do Sul. É um PWA mobile-first: dá pra instalar no celular e funciona sem internet.

> **Fase 1 (pronta):** projetos, editor de letra com contador de sílabas e rimas, cifras com transposição, capotraste e afinações, e IA de acordes e temas.
> **Fase 2 (pronta):** estúdio multipista com faixas empilhadas (inserir acima/abaixo), gravação com guia e contagem, calibração de latência, mixer com EQ, alinhamento manual, exportação MP3 de 5–7 MB e envio pelo WhatsApp.
> Fases 3–4 (importar do WhatsApp, convites, alinhamento automático…) entram depois, cada uma com confirmação.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase: Auth (link por e-mail e Google), Postgres com RLS, Storage (áudios)
- PWA: `app/manifest.ts` + `public/sw.js` (offline básico)
- Web Audio API (AudioWorklet para gravar, OfflineAudioContext para mixar) + lamejs para codificar MP3 no aparelho
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

### Estúdio (Fase 2)

Aba **Estúdio** do projeto: as faixas ficam empilhadas e coloridas por instrumento, numa linha do tempo comum marcada em compassos.

- **Inserir faixa acima ou abaixo** da selecionada. A posição na pilha é guardada em `ordem` como número decimal, então dá pra inserir no meio sem renumerar as outras.
- **Gravar** com guia no fone: as faixas já gravadas, o click no BPM do projeto, os dois ou nada; contagem de entrada de 2 ou 4 tempos. O microfone é capturado por um AudioWorklet (`public/worklets/gravador.js`) com o número exato do quadro do relógio de áudio. Assim a gravação cai no lugar certo da linha do tempo, sem o atraso de início imprevisível do MediaRecorder. O áudio é guardado em MP3 de 128 kbps, codificado no aparelho com lamejs.
- **Calibração de latência** por saída (alto-falante, fone com fio, fone Bluetooth):
  - *Teste da batida*: bate palma junto com o click. O app mede o atraso total de saída + entrada e compensa sozinho em toda gravação.
  - *Teste do toque*: toca na tela junto com o click. Mede só a saída.
- **Mixer** por faixa: volume, mudo/solo e EQ de 3 bandas (250 Hz, 1 kHz, 4 kHz).
- **Alinhamento manual**: arrastar a faixa selecionada, botões −10/+10 ms, e arrastar na régua marca um trecho pra tocar em loop e conferir. O deslocamento fica salvo por faixa (`offset_ms`), separado da latência compensada (`latencia_ms`). O pequeno silêncio que o MP3 acrescenta no início é medido no aparelho e descontado na reprodução.
- **Exportar MP3** só com as faixas marcadas. O bitrate é escolhido entre 32 e 320 kbps pra o arquivo ficar entre 5 e 7 MB. Exceções: uma música com menos de ~2 min não chega a 5 MB nem em 320 kbps, e uma com mais de ~29 min passa de 7 MB mesmo em 32 kbps; nos dois casos o app avisa.
- **Enviar no WhatsApp**: usa a Web Share API com o arquivo. Se o navegador não suportar, baixa o MP3 e abre `wa.me` com a mensagem (e um link temporário de 7 dias, quando a conta está na nuvem).

No modo local os áudios ficam no IndexedDB do aparelho. Na nuvem vão para o bucket privado `audios` do Supabase Storage, com uma cópia em cache no aparelho.

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
2. **SQL Editor → New query**: rode, nesta ordem:
   - `supabase/migrations/0001_fase1_projetos.sql`
   - `0002_fase2_faixas.sql` (cria a tabela `faixas` e o bucket privado `audios`, com RLS)
   - `0003_acessos.sql` (lista de acessos com até 10 e-mails e o administrador) Se preferir a CLI, use `supabase link` e depois `supabase db push`.
3. **Authentication → Hooks → Before User Created**: ative o hook do tipo *Postgres* e aponte para `public.hook_antes_de_criar_usuario`. Assim ninguém fora da lista consegue nem criar conta. Mesmo sem o hook, a RLS já impede quem não está na lista de ver ou gravar qualquer dado.
4. **Authentication → Providers → Email**: deixe **Confirm email** ligado. Senão alguém poderia criar conta com um e-mail liberado que não é dele.
5. **Authentication → URL Configuration**
   - *Site URL*: `https://SEU-APP.vercel.app`
   - *Redirect URLs*: `https://SEU-APP.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`
6. **Authentication → Providers**
   - *Email*: já vem ligado (entrada por senha ou por link mágico).
   - *Google*: crie um OAuth Client no Google Cloud Console (tipo “Web”). A URI de redirecionamento autorizada é `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Depois cole o Client ID e o Secret no Supabase.
7. **Project Settings → API**: copie a `URL` e a `anon public key`.

### 2. Chave de IA (gratuita)

- Gemini: <https://aistudio.google.com/apikey> → `GEMINI_API_KEY`
- Groq: <https://console.groq.com/keys> → `GROQ_API_KEY`

### 3. Vercel

1. Importe o repositório em <https://vercel.com/new>. O framework (Next.js) é detectado sozinho.
2. Em **Settings → Environment Variables**, cadastre as variáveis do `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `GEMINI_API_KEY` (ou `GROQ_API_KEY`).
3. Faça o deploy e atualize a *Site URL* do Supabase com o domínio final.
4. No celular, abra o site e escolha **Adicionar à tela inicial** para instalar o PWA.

## Acessos (até 10 e-mails)

O app é fechado: só entram os e-mails da tabela `acessos`, com no máximo **10, contando o administrador**. O limite é garantido por trigger no banco.

- **Administrador ("quem manda")**: `luiscanabarro@hotmail.com`, definido na migração `0003_acessos.sql`. Na tela **Conta**, ele vê o painel *Acessos*, onde libera e remove e-mails.
- **Primeiro acesso do administrador**: abra o app → **Conta** → **Criar conta** com esse e-mail e a senha escolhida. Depois confirme pelo link que chega no e-mail. A senha **não** fica no código nem no repositório.
- **Membros**: depois de liberados, cada um usa **Criar conta** com o próprio e-mail. O login pode ser por senha, link por e-mail ou Google.
- **Remover alguém** corta o acesso na hora. Os projetos da pessoa continuam guardados, mas ela não consegue mais abrir.
- **Trocar o administrador ou o limite**: edite `0003_acessos.sql` (e `LIMITE_ACESSOS` em `src/lib/data/acessos.ts`) e rode de novo.
- **Sem Supabase (modo local)** não há contas nem lista: tudo fica só no aparelho.

## Segurança

- RLS ligado: cada usuário só lê e altera os próprios projetos e áudios, e só se o e-mail estiver na lista de acessos. Um trigger impede trocar o dono.
- As chaves de IA ficam só no servidor (`server-only`). A rota `/api/ia` limita tamanho do pedido e frequência por IP.
- A `anon key` é pública por design; a proteção dos dados vem do RLS.
