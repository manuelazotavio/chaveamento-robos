# front-chaveamento-robos

Painel pro torneio de robótica do IFSP (RoboCode / RoboSoccer). Consome a API do `chaveamento-robos` (Spring Boot, roda em `localhost:8080`).

React + Vite + TS, Tailwind v4, uns componentes no estilo shadcn, React Router, TanStack Query, Axios. Sem login — a API nem tem autenticação ainda, então não fazia sentido montar uma tela pra isso.

## rodando

```
npm install
npm run dev
```

Precisa da API rodando em `localhost:8080` (dá pra trocar em `.env`, `VITE_API_URL`).

Ah, e nessa máquina o `npm run` às vezes dá esse erro: "Este programa está bloqueado por uma política de grupo". É a política do Windows bloqueando os `.cmd` que o npm usa pra chamar `vite`/`tsc`. Se acontecer, chama direto pelo node:

```
node .\node_modules\vite\bin\vite.js
node .\node_modules\typescript\bin\tsc -b
node .\node_modules\vite\bin\vite.js build
```

## o que tem

- **Times**: `GET`/`POST /api/times` — lista e cadastra time (nome + tipo ROBOCODE/ROBOSOCCER).
- **Torneios**: `GET`/`POST /torneios` — lista e cria torneio (só categoria; status fica INSCRICOES por padrão). Reparem que essa rota não tem o prefixo `/api`, diferente de times — inconsistência que já tava assim no backend.
- **Inscrição**: `POST /torneios/{id}/times/{id}` — inscreve um time num torneio. Não tem `GET` pra ver quem já tá inscrito em cada torneio, então a tela só oferece a ação de inscrever, não mostra lista de participantes.

Chaveamento em si (gerar as chaves do mata-mata) ainda não existe no backend.

Mexi em duas coisas na API pra isso funcionar:
- CORS (`chaveamento-robos/.../config/CorsConfig.java`) liberando `localhost:5173` — sem isso o navegador bloqueia tudo. Precisei adicionar mapping separado pra `/torneios/**` porque essa rota não segue o prefixo `/api`.
- `Torneio.java` tava sem construtor sem argumento — o Hibernate quebra tentando instanciar a entidade ao ler do banco (JPA exige). Aproveitei e botei o status como `INSCRICOES` por padrão na criação, porque ele tava sempre nascendo `null`.
