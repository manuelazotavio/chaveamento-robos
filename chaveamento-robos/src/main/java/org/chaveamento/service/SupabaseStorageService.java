package org.chaveamento.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.InputStream;

/**
 * Faz upload de arquivos (fotos/audios dos times) pro Supabase Storage.
 * O filesystem do Render/Railway e efemero, entao nao da pra guardar isso em disco local.
 */
@Service
public class SupabaseStorageService {

    private final RestClient restClient;
    private final String bucket;
    private final String publicUrlBase;

    public SupabaseStorageService(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.service-role-key}") String serviceRoleKey,
            @Value("${supabase.bucket}") String bucket
    ) {
        this.bucket = bucket;
        this.publicUrlBase = supabaseUrl + "/storage/v1/object/public/" + bucket + "/";

        this.restClient = RestClient.builder()
                .baseUrl(supabaseUrl + "/storage/v1/object/" + bucket)
                .defaultHeader("Authorization", "Bearer " + serviceRoleKey)
                .defaultHeader("apikey", serviceRoleKey)
                .build();
    }

    /**
     * Sobe o arquivo pro bucket em <caminho> (ex.: "time/4.jpg") e retorna a URL publica.
     * upsert=true sobrescreve se ja existir (mesmo padrao do REPLACE_EXISTING que tinha em disco).
     */
    public String upload(String caminho, InputStream conteudo, String contentType) throws IOException {

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
}
