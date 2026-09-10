package org.chaveamento.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    // em dev aponta pro vite (porta padrao 5173); em producao vem de app.cors.origem-frontend (env FRONTEND_URL)
    @Value("${app.cors.origem-frontend}")
    private String origemFrontend;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origens = { "http://localhost:5173", origemFrontend };
        String[] metodos = { "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS" };

        registry.addMapping("/api/**")
                .allowedOrigins(origens)
                .allowedMethods(metodos)
                .allowedHeaders("*");

        // torneios/participacao/partidas não seguem o prefixo /api, então precisam do próprio mapping
        registry.addMapping("/torneios/**")
                .allowedOrigins(origens)
                .allowedMethods(metodos)
                .allowedHeaders("*");

        registry.addMapping("/partidas/**")
                .allowedOrigins(origens)
                .allowedMethods(metodos)
                .allowedHeaders("*");

        // login/autenticacao tambem nao segue o prefixo /api
        registry.addMapping("/auth/**")
                .allowedOrigins(origens)
                .allowedMethods(metodos)
                .allowedHeaders("*");

        registry.addMapping("/usuarios/**")
                .allowedOrigins(origens)
                .allowedMethods(metodos)
                .allowedHeaders("*");
    }

    // expõe os arquivos salvos em uploads/ (imagens dos times) via HTTP
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}
