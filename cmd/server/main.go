package main

import (
	"log"
	"os"

	"axolotl-changelog-viewer/internal/server"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8765"
	}
	srv := server.New(port)
	log.Printf("Axolotl Changelog Viewer serving at http://127.0.0.1:%s", port)
	log.Printf("Press Ctrl+C to stop")
	if err := srv.Start(); err != nil {
		log.Fatal(err)
	}
}
