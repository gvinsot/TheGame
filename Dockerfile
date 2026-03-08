# TheGame Web Frontend (Placeholder)
# Since no Android source code is present, this serves as a minimal web frontend

FROM nginx:alpine

# Copy static content
COPY src/ /usr/share/nginx/html/

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]