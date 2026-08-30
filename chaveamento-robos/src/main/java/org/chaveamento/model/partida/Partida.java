package org.chaveamento.model.partida;

import jakarta.persistence.*;
import lombok.*;
import org.chaveamento.model.torneio.Torneio;
import org.chaveamento.model.time.Time;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "partidas")
public class Partida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FasePartida fase;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusPartida status;

    @ManyToOne
    @JoinColumn(name = "time_a_id")
    private Time timeA;

    @ManyToOne
    @JoinColumn(name = "time_b_id")
    private Time timeB;

    private Integer placarTimeA;

    private Integer placarTimeB;

    @ManyToOne
    @JoinColumn(name = "vencedor_id")
    private Time vencedor;

    @ManyToOne
    @JoinColumn(name = "proxima_partida_id")
    private Partida proximaPartida;

    @ManyToOne
    @JoinColumn(name = "torneio_id", nullable = false)
    private Torneio torneio;

    @Enumerated(EnumType.STRING)
    private PosicaoProximaPartida posicaoProximaPartida;
}