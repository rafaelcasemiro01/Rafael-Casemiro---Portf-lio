# Rafael Casemiro — Portfólio (React + Vite)

Site de apresentação profissional de **Rafael Casemiro**, UI/UX Designer.
Tema preto + ouro, bilíngue (PT/EN), animações (brilho do mouse, botões magnéticos, reveal ao rolar), formulário de contato e SEO/Open Graph.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # testa o build localmente
```

## Publicar

A pasta `dist/` é um site estático — funciona em qualquer host:

- **Vercel:** `npm i -g vercel` e rode `vercel` na raiz (ou importe o repositório em vercel.com). Framework detectado: Vite.
- **Netlify:** arraste a pasta `dist/` em app.netlify.com/drop, ou conecte o repo (build command `npm run build`, publish dir `dist`).
- **GitHub Pages:** publique o conteúdo de `dist/`.

## Onde editar cada coisa

| O quê | Arquivo |
|---|---|
| Textos, projetos, skills, contatos (PT/EN) | `src/data.js` |
| Layout e estilos da página | `src/App.jsx` (estilos inline) |
| Reset, fontes, keyframes, hover/foco, responsivo | `src/index.css` |
| Metadados, título, favicon, OG, Google Analytics | `index.html` |
| Imagens (foto, logo, capas, OG) | `public/assets/` |

## Configurar os extras

### Formulário de contato (receber por email)
Por padrão o formulário abre o app de email já preenchido (funciona sem backend).
Para receber as mensagens direto na sua caixa:
1. Crie um formulário grátis em **https://formspree.io**.
2. Copie o endpoint (ex: `https://formspree.io/f/abcdwxyz`).
3. Em `src/data.js`, troque:
   ```js
   export const FORMSPREE_ENDPOINT = null;
   // por:
   export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
   ```

### Google Analytics
Em `index.html`, troque `G-XXXXXXXXXX` (aparece 2x) pelo seu ID de medição (GA4),
obtido em https://analytics.google.com.

### Domínio / Open Graph
As metatags em `index.html` usam `https://rafaelcasemiro.uiux.designer.com/`.
Ao definir seu domínio final, atualize `og:url`, `og:image`, `twitter:image` e `canonical`
para a **URL absoluta** correta (redes sociais exigem URL completa para o preview do link).

## Stack
- React 18 + Vite 5
- Sem dependências de UI — estilos inline + um CSS global.
- Fontes do sistema (stack SF Pro / Helvetica), sem web fonts externas.
