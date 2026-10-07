// Orbitlabor für Windows: Die EXE enthält die komplette Web-App. Sie startet einen kleinen
// Server nur auf diesem Rechner (127.0.0.1) und öffnet die App in einem App-Fenster von
// Microsoft Edge (auf jedem Windows 10/11 vorhanden). Fehlt Edge, übernimmt der Standardbrowser.
// Ist das Fenster geschlossen, beendet sich das Programm von selbst.
package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strconv"
	"sync/atomic"
	"time"
)

//go:embed all:app
var content embed.FS

// Fester Port: So bleibt die Adresse gleich und gespeicherte Spielstände bleiben erhalten.
const preferredPort = 47173

var version = "dev"

var (
	pings    atomic.Int64
	lastPing atomic.Int64
)

// Hält die App am Leben, solange das Fenster offen ist (auch im Standardbrowser).
const pingScript = `<script>(function(){var p=function(){fetch('/__orbitlabor/ping',{cache:'no-store'}).catch(function(){})};p();setInterval(p,15000);document.addEventListener('visibilitychange',p)})()</script>`

var mimeTypes = map[string]string{
	".html":        "text/html; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".mjs":         "text/javascript; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".json":        "application/json",
	".webmanifest": "application/manifest+json",
	".svg":         "image/svg+xml",
	".png":         "image/png",
	".ico":         "image/x-icon",
	".woff2":       "font/woff2",
	".woff":        "font/woff",
	".txt":         "text/plain; charset=utf-8",
}

func main() {
	app, err := fs.Sub(content, "app")
	if err != nil {
		fail("Die App-Dateien fehlen in der EXE.", err)
	}
	index, err := fs.ReadFile(app, "index.html")
	if err != nil {
		fail("Die App-Dateien fehlen in der EXE.", err)
	}
	index = bytes.Replace(index, []byte("</head>"), []byte(pingScript+"</head>"), 1)

	ln, url, running := listen()
	if running {
		// Das Orbitlabor läuft schon: nur ein weiteres Fenster öffnen.
		openWindow(url)
		return
	}

	srv := &http.Server{Handler: handler(app, index), ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = srv.Serve(ln) }()
	lastPing.Store(time.Now().UnixNano())

	idle := durationEnv("ORBITLABOR_IDLE", 150*time.Second)
	started := time.Now()
	window := openWindow(url)
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-window:
			window = nil
			// Ein sofortiges Ende heißt: Edge hat an ein laufendes Fenster übergeben.
			// Dann entscheidet das Lebenszeichen der Seite.
			if time.Since(started) > 8*time.Second {
				shutdown(srv)
				return
			}
		case <-ticker.C:
			if window == nil && time.Since(time.Unix(0, lastPing.Load())) > idle {
				shutdown(srv)
				return
			}
		}
	}
}

func handler(app fs.FS, index []byte) http.Handler {
	files := http.FileServer(http.FS(app))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Orbitlabor", version)
		switch r.URL.Path {
		case "/__orbitlabor/ping":
			pings.Add(1)
			lastPing.Store(time.Now().UnixNano())
			w.Header().Set("Cache-Control", "no-store")
			w.WriteHeader(http.StatusNoContent)
			return
		case "/__orbitlabor/status":
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "no-store")
			_ = json.NewEncoder(w).Encode(map[string]any{"version": version, "pings": pings.Load()})
			return
		case "/", "/index.html":
			w.Header().Set("Content-Type", mimeTypes[".html"])
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(index)
			return
		}
		// Windows liefert über die Registry teils falsche Typen (z. B. text/plain für .js);
		// Module brauchen aber den richtigen Typ. Deshalb fest vorgeben.
		if t, ok := mimeTypes[path.Ext(r.URL.Path)]; ok {
			w.Header().Set("Content-Type", t)
		}
		if path.Dir(r.URL.Path) == "/assets" {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		files.ServeHTTP(w, r)
	})
}

// listen öffnet den festen Port. Ist er belegt, prüft es, ob dort schon ein Orbitlabor läuft;
// sonst weicht es auf einen freien Port aus.
func listen() (net.Listener, string, bool) {
	addr := "127.0.0.1:" + strconv.Itoa(preferredPort)
	if ln, err := net.Listen("tcp", addr); err == nil {
		return ln, "http://" + addr + "/", false
	}
	client := http.Client{Timeout: 2 * time.Second}
	if res, err := client.Get("http://" + addr + "/__orbitlabor/status"); err == nil {
		res.Body.Close()
		if res.Header.Get("X-Orbitlabor") != "" {
			return nil, "http://" + addr + "/", true
		}
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fail("Das Orbitlabor konnte keinen lokalen Anschluss öffnen.", err)
	}
	return ln, "http://" + ln.Addr().String() + "/", false
}

// openWindow startet ein App-Fenster. Der Kanal schließt sich, wenn der Browser beendet ist;
// nil bedeutet: Das Ende des Fensters ist nicht beobachtbar (Standardbrowser).
func openWindow(url string) chan struct{} {
	browser := findBrowser()
	if browser == "none" {
		fmt.Println("Orbitlabor läuft unter", url)
		return nil
	}
	if browser != "" {
		profile := filepath.Join(dataDir(), "Browser")
		cmd := exec.Command(browser,
			"--app="+url,
			"--user-data-dir="+profile,
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-sync",
			"--window-size=1440,920",
		)
		if err := cmd.Start(); err == nil {
			done := make(chan struct{})
			go func() {
				_ = cmd.Wait()
				close(done)
			}()
			return done
		}
	}
	openDefault(url)
	return nil
}

func findBrowser() string {
	if b := os.Getenv("ORBITLABOR_BROWSER"); b != "" {
		return b
	}
	var candidates []string
	if runtime.GOOS == "windows" {
		for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"} {
			base := os.Getenv(env)
			if base == "" {
				continue
			}
			candidates = append(candidates,
				filepath.Join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
				filepath.Join(base, "Google", "Chrome", "Application", "chrome.exe"),
			)
		}
	} else if runtime.GOOS == "darwin" {
		// Mac: Chrome oder Edge öffnen ein eigenes App-Fenster; sonst der Standardbrowser (Safari).
		home, _ := os.UserHomeDir()
		for _, base := range []string{"/Applications", filepath.Join(home, "Applications")} {
			candidates = append(candidates,
				filepath.Join(base, "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
				filepath.Join(base, "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"),
			)
		}
	} else {
		candidates = []string{"/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"}
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return ""
}

func openDefault(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		fail("Es wurde kein Browser gefunden. Bitte "+url+" von Hand öffnen.", err)
	}
}

func dataDir() string {
	base, err := os.UserCacheDir()
	if err != nil {
		base = os.TempDir()
	}
	dir := filepath.Join(base, "Orbitlabor")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

func durationEnv(name string, fallback time.Duration) time.Duration {
	if v, err := strconv.Atoi(os.Getenv(name)); err == nil && v > 0 {
		return time.Duration(v) * time.Second
	}
	return fallback
}

func shutdown(srv *http.Server) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

func fail(message string, err error) {
	showError("Orbitlabor", message+"\n\n"+err.Error())
	os.Exit(1)
}
