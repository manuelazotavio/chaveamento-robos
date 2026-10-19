# ⚽ RoboSoccer Torneio — Guia do Operador

Simulador **RoboSoccer** (ROSOS, baseado no [Robot-Soccer-Simulator](https://github.com/ivanseidel/Robot-Soccer-Simulator)) integrado ao **chaveamento-robos**: cada gol aparece em tempo real no chaveamento e o vencedor avança sozinho para a próxima fase.

---

## 🧰 Pré-requisitos

- [Processing](https://processing.org/download) 3.3.6 ou superior.
- A API do chaveamento rodando e um torneio de **ROBOSOCCER** com o chaveamento já gerado.

O sketch fica em `robosoccer/SoccerSimulator/`. O nome da pasta precisa continuar `SoccerSimulator`, igual ao do arquivo `SoccerSimulator.pde`.

---

## ⚙️ Configuração (uma vez)

1. Copie `SoccerSimulator/torneio.properties.example` para `SoccerSimulator/torneio.properties`.
2. Preencha `api.url`, `api.email`, `api.senha` e `torneio.id`.
3. Ajuste as regras se precisar:
   - `jogo.duracaoSegundos`: duração total em segundos (padrão `300`). O tempo é dividido em 2 tempos, com troca de lado no intervalo.
   - `jogo.jogadoresPorTime`: quantidade de robôs por time (padrão `2`).
   - `jogo.golDeOuro`: se o jogo terminar empatado, a partida continua até o próximo gol (padrão `true`).

---

## 🤖 Quando os times entregarem o código

Cada time entrega **um arquivo `.java`** com uma classe que implementa `Team`. Use `CustomTeamA.java` como modelo.

- O nome da classe precisa ser único e igual ao nome do arquivo (ex.: `TimeAlfa` em `TimeAlfa.java`).
- Os robôs do time precisam ser classes **internas** dessa classe, como em `CustomTeamA`. Assim, dois times podem ter um robô `Attacker` sem conflito.
- Precisa ser `.java`: arquivos `.pde` não funcionam.

Para cada time:

1. Copie o arquivo para `robosoccer/SoccerSimulator/`.
2. Em `torneio.properties`, ligue o ID do time no chaveamento à classe:
   ```properties
   time.12=TimeAlfa
   time.15=TimeBeta
   ```
   O ID do time aparece no painel web (tela de Times).
3. **Feche e abra o Processing de novo** (ou reabra o sketch) para ele compilar os arquivos novos.

---

## 🎯 Conduzindo uma partida

1. Abra `SoccerSimulator.pde` no Processing e clique em **Run**.
2. A tela inicial lista as partidas do chaveamento:
   - **↑ / ↓**: escolhem a partida.
   - **ENTER**: carrega a partida.
   - **C**: recarrega o chaveamento e o `torneio.properties`.

   Partidas em cinza já foram finalizadas ou ainda não têm os dois times.
3. Ao carregar, o placar da partida é zerado na API e ela passa para `EM_ANDAMENTO`.
4. Aperte **ESPAÇO** para começar.
5. A cada gol, o placar é enviado ao chaveamento (`POST /partidas/{id}/rounds`).
6. No fim do 2º tempo:
   - **Com vencedor:** o resultado final é enviado (`POST /partidas/{id}/resultado`), a partida é finalizada e o vencedor avança na chave.
   - **Empate com gol de ouro ativo:** o jogo continua, e o próximo gol encerra a partida.
7. Aperte **M** para voltar à lista e escolher a próxima partida.

### Teclas durante a partida

| Tecla | Ação |
| :--- | :--- |
| `ESPAÇO` | Inicia / pausa / retoma |
| `I` | Reinicia a partida do zero (zera também na API) |
| `R` | Reposiciona robôs e bola no centro |
| `E` | Reenvia o resultado final, se o envio falhou |
| `M` | Volta para a lista de partidas |
| Arrastar com o mouse | Move a bola ou um robô (intervenção do juiz) |

As cores são fixas: o **Time A** do chaveamento joga de **azul** e o **Time B** de **amarelo**. No 1º tempo o Time B começa na esquerda, e os lados trocam no intervalo. O placar enviado sempre segue o time, não o lado.

---

## 🛠️ Problemas comuns

- **"Sem classe para ..."**: falta a linha `time.<ID>=Classe` no `torneio.properties`. Adicione e aperte **C**.
- **"Classe X não encontrada"**: o arquivo `X.java` não está na pasta do sketch, ou o Processing não foi reaberto depois de copiar o arquivo.
- **"Falha no login"**: confira o email e a senha no `torneio.properties`.
- **Erro ao enviar resultado**: aperte **E** para tentar de novo. Se não der, registre o resultado pelo painel web.
