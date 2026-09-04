package org.chaveamento.model.time;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "times")
public class Time {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private EnumTime tipo;
    private String imagem;

    public Time(String nome, EnumTime tipo, String imagem) {
        this.nome = nome;
        this.tipo = tipo;
        this.imagem = imagem;
    }
}
