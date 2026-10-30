package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Server struct {
	port string
}

func New(port string) *Server {
	return &Server{port: port}
}

func (s *Server) Start() error {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/changelog", s.handleChangelog)

	webDir := s.findWebDir()
	mux.Handle("/", http.FileServer(http.Dir(webDir)))

	addr := fmt.Sprintf("127.0.0.1:%s", s.port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return srv.ListenAndServe()
}

func (s *Server) findWebDir() string {
	candidates := []string{"web", filepath.Join(filepath.Dir(os.Args[0]), "web")}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return "."
}

func (s *Server) handleChangelog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")

	data, err := os.ReadFile(s.findDataFile())
	if err != nil {
		http.Error(w, `{"error":"data not found"}`, http.StatusNotFound)
		return
	}
	w.Write(data)
}

func (s *Server) findDataFile() string {
	candidates := []string{
		"data/changelog.json",
		filepath.Join(filepath.Dir(os.Args[0]), "data", "changelog.json"),
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return "data/changelog.json"
}

// ===== Version structs =====

type Version struct {
	Tag                 string            `json:"tag"`
	Datetime            string            `json:"datetime,omitempty"`
	Date                string            `json:"date,omitempty"`
	Type                string            `json:"type,omitempty"`
	Publisher           string            `json:"publisher,omitempty"`
	URL                 string            `json:"url"`
	Entries             []string          `json:"entries"`
	SupplementEntries   []string          `json:"supplement_entries"`
	Sections            map[string][]string `json:"sections"`
	BulletCount         int               `json:"bullet_count"`
	SupplementCount     int               `json:"supplement_count"`
	TotalEntries        int               `json:"total_entries"`
	DaysSincePrev       float64           `json:"days_since_prev"`
}

// ===== Markdown Parser =====

func ParseMarkdownToJSON(mdPath string) ([]byte, error) {
	content, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, err
	}
	versions := parseVersions(string(content))
	data, _ := json.MarshalIndent(map[string]interface{}{
		"versions": versions,
	}, "", "  ")
	return data, nil
}

func parseVersions(content string) []*Version {
	lines := strings.Split(content, "\n")
	var versions []*Version
	var current *Version
	section := "" // "entries", "supplement", or section name

	for _, line := range lines {
		if strings.HasPrefix(line, "## v") {
			if current != nil {
				finalizeVersion(current)
				versions = append(versions, current)
			}
			tag := strings.TrimSpace(strings.TrimPrefix(line, "## "))
			current = &Version{
				Tag:               tag,
				Entries:           []string{},
				SupplementEntries: []string{},
				Sections:          map[string][]string{},
				URL:               fmt.Sprintf("https://github.com/Axolotl-Launcher/Axolotl/releases/tag/%s", tag),
			}
			section = ""
			continue
		}

		if current == nil {
			continue
		}

		if strings.Contains(line, "发布日期时间") {
			if dt := extractDateTime(line); dt != "" {
				current.Datetime = dt
				current.Date = dt[:10]
			}
		}
		if strings.Contains(line, "类型") && strings.Contains(line, "：") {
			val := strings.TrimSpace(line[strings.Index(line, "：")+1:])
			if val == "正式版" || val == "预发布" {
				current.Type = val
			}
		}
		if strings.Contains(line, "发布者") && strings.Contains(line, "：") {
			current.Publisher = strings.TrimSpace(line[strings.Index(line, "：")+1:])
		}

		if strings.HasPrefix(line, "### ") {
			name := strings.TrimSpace(strings.TrimPrefix(line, "### "))
			switch {
			case name == "变更日志" || name == "变更日志（由提交历史补全）":
				section = "entries"
			case name == "补充提交记录":
				section = "supplement"
			default:
				current.Sections[name] = []string{}
				section = name
			}
			continue
		}

		if strings.HasPrefix(line, "- ") && section != "" {
			entry := strings.TrimSpace(strings.TrimPrefix(line, "- "))
			if strings.HasPrefix(entry, "**") || strings.HasPrefix(entry, "`") {
				continue
			}
			if section == "supplement" {
				current.SupplementEntries = append(current.SupplementEntries, entry)
			} else if section != "entries" {
				current.Sections[section] = append(current.Sections[section], entry)
				current.Entries = append(current.Entries, entry)
			}
		}
	}

	if current != nil {
		finalizeVersion(current)
		versions = append(versions, current)
	}

	// Calculate days_since_prev
	for i, v := range versions {
		if i == 0 {
			v.DaysSincePrev = 0
			continue
		}
		if v.Datetime != "" && versions[i-1].Datetime != "" {
			t1, _ := time.Parse("2006-01-02 15:04:05", v.Datetime)
			t2, _ := time.Parse("2006-01-02 15:04:05", versions[i-1].Datetime)
			v.DaysSincePrev = round2(t1.Sub(t2).Hours() / 24)
		} else {
			v.DaysSincePrev = 0
		}
	}

	return versions
}

func finalizeVersion(v *Version) {
	v.BulletCount = len(v.Entries)
	v.SupplementCount = len(v.SupplementEntries)
	v.TotalEntries = v.BulletCount + v.SupplementCount
}

func extractDateTime(line string) string {
	for i := 0; i < len(line)-18; i++ {
		if line[i] >= '0' && line[i] <= '9' && line[i+4] == '-' && line[i+7] == '-' && line[i+10] == ' ' {
			sub := line[i : i+19]
			if len(sub) == 19 {
				return sub
			}
		}
	}
	return ""
}

func round2(f float64) float64 {
	return float64(int(f*100+0.5)) / 100
}
