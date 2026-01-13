FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binaries
RUN go build -o im-api cmd/im-api/main.go
RUN go build -o im-gateway cmd/im-gateway/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy binaries from builder
COPY --from=builder /app/im-api .
COPY --from=builder /app/im-gateway .

# Copy configs directory (ensure it contains config.yaml)
COPY configs/ /app/configs/

# Create necessary directories
RUN mkdir logs uploads

# Expose ports
EXPOSE 8081 8082

# Default command (can be overridden in docker-compose)
CMD ["./im-api"]
