package org.chaveamento.model.torneio;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "torneios")
public class Torneio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private EnumTorneio tipo;

    @Enumerated(EnumType.STRING)
    private StatusTorneio status;

    public Torneio(EnumTorneio tipo) {
        this.tipo = tipo;
        this.status = StatusTorneio.INSCRICOES;
    }
}
