package org.chaveamento.model.participacaotorneio;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.chaveamento.model.time.Time;
import org.chaveamento.model.torneio.Torneio;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "participacoes_torneio", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_torneio_time",
                columnNames = {"torneio_id", "time_id"}
        )
}
)
public class ParticipacaoTorneio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "torneio_id", nullable = false)
    private Torneio torneio;

    @ManyToOne
    @JoinColumn(name = "time_id", nullable = false)
    private Time time;

    public ParticipacaoTorneio(Torneio torneio, Time time) {
        this.torneio = torneio;
        this.time = time;
    }
}
