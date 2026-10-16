# Sistema de Chaveamento de Robôs 🤖⚽

Repositório unificado do sistema de chaveamento e acompanhamento de torneios de **RoboCode**, **RoboSoccer** e **Maratona de Programação**, contendo a API backend em Spring Boot e a interface frontend em React.

---

## 📖 Guia de Integração — RoboSoccer (Atualização Automática)

Esta seção é destinada à integração do **RoboSoccer** com o sistema de chaveamento para atualização automática de placares, rounds e avanço de fase em tempo real.

### 🔐 1. Autenticação

Todas as chamadas à API de partidas requerem um token JWT válido no cabeçalho:

```http
Authorization: Bearer <SEU_TOKEN_JWT>
```

Para obter o token, envie uma requisição para a rota de login:

- **Endpoint:** `POST /auth/login`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "login": "seu_usuario",
    "senha": "sua_senha"
  }
  ```
- **Resposta:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### ⚡ 2. Endpoints para Gerenciamento de Partidas

Abaixo estão os endpoints disponíveis sob a rota `/partidas`:

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/partidas/{partidaId}/iniciar` | Transiciona o status da partida para `EM_ANDAMENTO` |
| `POST` | `/partidas/{partidaId}/rounds` | **(Principal)** Registra um gol / vitória de round em tempo real |
| `POST` | `/partidas/{partidaId}/resultado` | Finaliza a partida com placar consolidado |
| `PUT`  | `/partidas/{partidaId}/resultado` | Atualiza o resultado de uma partida já finalizada (Admin) |
| `POST` | `/partidas/{partidaId}/resetar` | Zera o placar para `0 x 0` e reinicia o confronto |
| `GET`  | `/partidas/{partidaId}` | Consulta o placar, status e dados da partida |

---

### ⚽ 3. Detalhamento das Chamadas

#### 3.1. Iniciar Partida
Recomendado antes do início do jogo (passa o status de `AGUARDANDO` para `EM_ANDAMENTO`).

- **Endpoint:** `POST /partidas/{partidaId}/iniciar`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Body:** Vazio

---

#### 3.2. Registrar Gol / Round (Em Tempo Real)
Chamado a cada gol ou round vencido no RoboSoccer. Incrementa automaticamente o placar do time indicado.

- **Endpoint:** `POST /partidas/{partidaId}/rounds`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

##### Exemplo A — Envio simples a cada gol:
```json
{
  "vencedorRound": "TIME_A"
}
```
> **Nota:** `vencedorRound` aceita `"TIME_A"` ou `"TIME_B"`. Se preferir, pode enviar `"timeVencedorId": 12` com o ID do time.

##### Exemplo B — Envio com regras automáticas de encerramento:
A própria API pode finalizar a partida e avançar o time vencedor para a próxima fase do torneio caso uma condição seja atingida:

```json
{
  "vencedorRound": "TIME_A",
  "vitoriasParaGanhar": 2,
  "finalizarComDuasSeguidas": true,
  "maxRounds": 3
}
```

- `vitoriasParaGanhar` *(opcional, int)*: Se um time atingir essa pontuação, a partida é encerrada como `FINALIZADA` e o vencedor avança no chaveamento.
- `finalizarComDuasSeguidas` *(opcional, bool)*: Encerra antecipadamente se o placar abrir 2x0 para qualquer lado.
- `maxRounds` *(opcional, int)*: Limite máximo de rounds. Se atingido e não houver empate, quem tiver mais pontos vence.

---

#### 3.3. Finalizar Partida com Placar Consolidado
Caso o RoboSoccer prefira consolidar e enviar o resultado apenas ao final do confronto:

- **Endpoint:** `POST /partidas/{partidaId}/resultado`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "placarTimeA": 3,
    "placarTimeB": 1,
    "vencedorId": 12
  }
  ```
> **Regra:** Não são permitidos empates (`placarTimeA == placarTimeB`). O `vencedorId` deve pertencer a um dos dois times da partida. O vencedor avança automaticamente para o próximo jogo da chave.

---

#### 3.4. Resetar Partida
Caso ocorra algum problema técnico e seja necessário reiniciar a partida do zero:

- **Endpoint:** `POST /partidas/{partidaId}/resetar`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Body:** Vazio
- **Efeito:** Reseta os placares para `0 x 0` e retorna o status para `EM_ANDAMENTO`.

---

#### 3.5. Consultar Dados da Partida
- **Endpoint:** `GET /partidas/{partidaId}`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Resposta de Exemplo:**
  ```json
  {
    "id": 1,
    "fase": "PRIMEIRA_FASE",
    "status": "EM_ANDAMENTO",
    "timeA": {
      "id": 10,
      "nome": "RoboTeam Alpha"
    },
    "timeB": {
      "id": 12,
      "nome": "RoboTeam Beta"
    },
    "placarTimeA": 2,
    "placarTimeB": 1,
    "vencedor": null
  }
  ```

---

## 🏗️ Estrutura do Projeto

- **`chaveamento-robos/`**: API REST desenvolvida em Java 17 com Spring Boot, Spring Security (JWT), Spring Data JPA e PostgreSQL.
- **`front-chaveamento-robos/`**: Interface web desenvolvida em React 19, Vite, Tailwind CSS, TanStack Query e Lucide Icons.

---

## 💻 Executando Localmente

### Backend (Spring Boot)
```bash
cd chaveamento-robos
mvn spring-boot:run
```
A API estará disponível em `http://localhost:8080`.

### Frontend (React + Vite)
```bash
cd front-chaveamento-robos
npm install
npm run dev
```
A aplicação estará acessível em `http://localhost:5173`.
