.PHONY: build run test clean

BINARY=im-server

build:
	go build -o bin/$(BINARY) cmd/main.go

run:
	go run cmd/main.go

test:
	go test ./...

clean:
	rm -rf bin/
	rm -rf logs/
