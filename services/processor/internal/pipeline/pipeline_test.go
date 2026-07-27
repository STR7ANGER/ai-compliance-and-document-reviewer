package pipeline

import (
	"errors"
	"testing"
)
type scanner struct { clean bool; err error }
func (s scanner) Clean([]byte) (bool,error) { return s.clean,s.err }
type ocr struct{}
func (ocr) Text([]byte)(string,error){ return "scanned clause",nil }

func TestRejectsMalwareBeforeParsing(t *testing.T) { p:=Processor{Scanner:scanner{clean:false},OCR:ocr{},MaximumBytes:1000}; _,err:=p.Process([]byte("%PDF-TEXT:secret"),"application/pdf"); if !errors.Is(err,ErrInfected){t.Fatal(err)} }
func TestRejectsMediaMismatch(t *testing.T) { p:=Processor{Scanner:scanner{clean:true},OCR:ocr{},MaximumBytes:1000}; _,err:=p.Process([]byte("not pdf"),"application/pdf"); if !errors.Is(err,ErrMediaMismatch){t.Fatal(err)} }
func TestParsesTextAndFallsBackToOCR(t *testing.T) { p:=Processor{Scanner:scanner{clean:true},OCR:ocr{},MaximumBytes:1000}; parsed,err:=p.Process([]byte("%PDF-TEXT:clause"),"application/pdf"); if err!=nil||parsed.Pages[0].Text!="clause"||parsed.Pages[0].OCR{t.Fatal(parsed,err)}; scanned,err:=p.Process([]byte("%PDF-image"),"application/pdf"); if err!=nil||scanned.Pages[0].Text!="scanned clause"||!scanned.Pages[0].OCR{t.Fatal(scanned,err)} }
