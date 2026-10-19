package org.chaveamento.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Faz upload de arquivos (fotos/audios dos times) pro Supabase Storage.
 * Se o Supabase não estiver configurado (ambiente local), faz fallback automático para a pasta uploads/ local.
 */
@Service
public class SupabaseStorageService {

    private final RestClient restClient;
    private final String publicUrlBase;
    private final boolean habilitado;

    public SupabaseStorageService(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            @Value("${supabase.bucket:times}") String bucket
    ) {
        if (supabaseUrl != null && !supabaseUrl.isBlank() && serviceRoleKey != null && !serviceRoleKey.isBlank()) {
            this.habilitado = true;
            this.publicUrlBase = supabaseUrl + "/storage/v1/object/public/" + bucket + "/";
            this.restClient = RestClient.builder()
                    .baseUrl(supabaseUrl + "/storage/v1/object/" + bucket)
                    .defaultHeader("Authorization", "Bearer " + serviceRoleKey)
                    .defaultHeader("apikey", serviceRoleKey)
                    .build();
        } else {
            this.habilitado = false;
            this.publicUrlBase = null;
            this.restClient = null;
        }
    }

    /**
     * Sobe o arquivo pro bucket em <caminho> (ex.: "time/4.jpg") e retorna a URL pública,
     * ou salva no disco local em uploads/<caminho> caso o Supabase não esteja configurado.
     */
    public String upload(String caminho, InputStream conteudo, String contentType) throws IOException {
        if (habilitado && restClient != null) {
            byte[] bytes = conteudo.readAllBytes();

            restClient.put()
                    .uri(uriBuilder -> uriBuilder.path("/" + caminho).build())
                    .header("x-upsert", "true")
                    .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                    .body(bytes)
                    .retrieve()
                    .toBodilessEntity();

            return publicUrlBase + caminho;
        }

        // Fallback local: salva no diretório uploads/<caminho>
        Path destino = Paths.get("uploads", caminho);
        if (destino.getParent() != null) {
            Files.createDirectories(destino.getParent());
        }
        Files.copy(conteudo, destino, StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/" + caminho;
    }
}
