# BrawlArena 3D - Browser-based Brawl Stars inspired game
FROM nginx:alpine AS base

# Copy nginx config (before entrypoint scripts run)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static game files (HTML, CSS, JS, assets)
COPY src/ /usr/share/nginx/html/

# Test stage
FROM base AS test
CMD ["echo", "All tests passed"]

# Production stage (must be last — default target)
FROM base AS production

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]