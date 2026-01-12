.PHONY: build run test clean

BINARY_API=im-api
BINARY_GATEWAY=im-gateway

build:
	go build -o bin/$(BINARY_API) cmd/im-api/main.go
	go build -o bin/$(BINARY_GATEWAY) cmd/im-gateway/main.go

run-api:
	go run cmd/im-api/main.go

run-gateway:
	go run cmd/im-gateway/main.go

test:
	go test ./...

clean:
	rm -rf bin/
	rm -rf logs/
