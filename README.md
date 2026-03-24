# Projeto TEAMO — Netlify + Blob Store

## Publicar no Netlify
1. Suba esta pasta para um repositório Git e conecte o repositório ao Netlify.
2. Em **Site configuration > Environment variables**, crie:
   - `ADMIN_USER=Leydyany`
   - `ADMIN_PASSWORD=203040`
   - `SESSION_SECRET=troque-por-uma-chave-longa`
3. Em **Storage**, conecte um **Blob store** ao site.
4. Faça um novo deploy.

## Como funciona
- O formulário em `index.html` salva em `/api/create`.
- O login no topo chama `/api/login`.
- O painel em `admin.html` lê `/api/list`, permite editar/excluir e exporta CSV.
- O projeto também tenta `/.netlify/functions/*` como rota de fallback.

## Observações
- O painel só abre com o login correto.
- Se o login estiver errado, aparece a mensagem: `Necessário fazer uma conta, para obter acesso.`
- Depois do cadastro, a pessoa vê apenas a confirmação de envio. O painel continua restrito ao responsável.


Atualizações: removida a mensagem 'CADASTRO ENVIADO COM SUCESSO'; leitura do painel com consistência forte no Blob Store para exibir novos cadastros logo após salvar.


## Publicação no Netlify com Blobs

Para o painel de cadastrados funcionar em produção:

1. Importe o projeto no Netlify (não use apenas deploy manual de pasta estática).
2. No site, ative **Blobs**.
3. Publique novamente.
4. Configure as variáveis:
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`

Opcional, apenas se quiser conexão explícita ao Blob Store:
- `NETLIFY_SITE_ID`
- `NETLIFY_AUTH_TOKEN`

Se o Blob Store não estiver conectado, a API agora retorna erro real em produção em vez de salvar num arquivo temporário que não aparece no painel.
