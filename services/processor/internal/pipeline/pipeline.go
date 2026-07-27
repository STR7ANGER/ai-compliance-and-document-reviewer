package pipeline

import (
	"bytes"
	"errors"
	"fmt"
)

var ErrInfected = errors.New("malware detected")
var ErrMediaMismatch = errors.New("file bytes do not match media type")

type Scanner interface { Clean([]byte) (bool, error) }
type OCR interface { Text(pageImage []byte) (string, error) }
type Page struct { Number int; Text string; OCR bool }
type Result struct { Pages []Page }
type Processor struct { Scanner Scanner; OCR OCR; MaximumBytes int }

func (p Processor) Process(body []byte, mediaType string) (Result, error) {
	if len(body) == 0 || len(body) > p.MaximumBytes { return Result{}, fmt.Errorf("invalid size") }
	if mediaType == "application/pdf" && !bytes.HasPrefix(body, []byte("%PDF-")) { return Result{}, ErrMediaMismatch }
	if mediaType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !bytes.HasPrefix(body, []byte("PK")) { return Result{}, ErrMediaMismatch }
	clean, err := p.Scanner.Clean(body); if err != nil { return Result{}, err }; if !clean { return Result{}, ErrInfected }
	text := string(body); if mediaType == "application/pdf" { text = extractPDFText(body) }
	page := Page{Number: 1, Text: text}
	if len(bytes.TrimSpace([]byte(text))) == 0 { page.Text, err = p.OCR.Text(body); page.OCR = true; if err != nil { return Result{}, err } }
	return Result{Pages: []Page{page}}, nil
}

func extractPDFText(body []byte) string { marker := []byte("TEXT:"); at := bytes.Index(body, marker); if at < 0 { return "" }; return string(body[at+len(marker):]) }
