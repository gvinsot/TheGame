# TheGame Android App Container
# This Dockerfile is designed to run an Android app in a containerized environment
# Note: Full Android apps typically require specialized containers like Android Emulator or custom solutions

FROM alpine:latest

# Install necessary dependencies
RUN apk add --no-cache \
    curl \
    wget \
    openjdk17-jdk \
    bash

# Create app user
RUN addgroup -g 1000 app && \
    adduser -u 1000 -G app -s /bin/bash -D app

# Set working directory
WORKDIR /app

# Copy application files (placeholder - replace with actual APK or web assets)
COPY --chown=app:app . /app/

# Expose port (for web-based Android app or backend service)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run as non-root user
USER app

# Default command (placeholder - adjust based on actual app type)
CMD ["sh", "-c", "echo 'TheGame app is ready' && sleep infinity"]