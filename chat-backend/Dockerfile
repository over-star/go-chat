FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN go build -o im-server cmd/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/im-server .

# Copy configs directory (ensure it contains config.yaml)
COPY configs/ /app/configs/

# Create necessary directories
RUN mkdir logs uploads

# Expose port
EXPOSE 8081

# Default command
CMD ["./im-server"]
