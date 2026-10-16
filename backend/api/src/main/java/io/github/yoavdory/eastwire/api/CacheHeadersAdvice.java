package io.github.yoavdory.eastwire.api;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Successful API reads may be reused by the browser for a minute, and shown stale for up to ten
 * more while a fresh copy is fetched (stale-while-revalidate). The data changes about once an
 * hour, so this costs nothing in freshness and spares a sleeping or busy server. A controller's
 * own max-age (e.g. the city list's 24 hours) is kept and only gains the stale window. Errors
 * and the health check are never cached.
 */
@RestControllerAdvice
class CacheHeadersAdvice implements ResponseBodyAdvice<Object> {

    static final String CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=600";

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
            Class<? extends HttpMessageConverter<?>> converterType, ServerHttpRequest request, ServerHttpResponse response) {
        String path = request.getURI().getPath();
        int status = response instanceof ServletServerHttpResponse servlet ? servlet.getServletResponse().getStatus() : 200;
        if (status == 200 && path.startsWith("/api/v1/") && !path.equals("/api/v1/health")) {
            String own = response.getHeaders().getCacheControl();
            if (own == null || own.isBlank()) {
                response.getHeaders().setCacheControl(CACHE_CONTROL);
            } else if (!own.contains("stale-while-revalidate")) {
                response.getHeaders().setCacheControl(own + ", stale-while-revalidate=600");
            }
        } else {
            response.getHeaders().setCacheControl("no-store");
        }
        return body;
    }
}
