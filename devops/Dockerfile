# BrawlArena 3D - Browser-based Brawl Stars inspired game
FROM nginx:alpine

# Copy static game files (HTML, CSS, JS, assets)
COPY src/ /usr/share/nginx/html/

# Add nginx config for proper MIME types and caching
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|gif|ico|svg|woff2?)$ { \
        expires 1h; \
        add_header Cache-Control "public, immutable"; \
    } \
    location = /health { \
        access_log off; \
        return 200 "OK"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]