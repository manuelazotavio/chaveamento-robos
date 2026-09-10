package org.chaveamento.controller;


import org.chaveamento.dto.usuario.CadastroUsuarioDTO;
import org.chaveamento.dto.usuario.UsuarioResponse;
import org.chaveamento.model.usuario.Usuario;
import org.chaveamento.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping
    public ResponseEntity<UsuarioResponse> cadastrar(@RequestBody CadastroUsuarioDTO dados) {
        Usuario usuario = usuarioService.cadastrar(dados);

        return ResponseEntity.ok(new UsuarioResponse(usuario));
    }
}
