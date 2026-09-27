package main

import (
	"syscall"
	"unsafe"
)

// showError zeigt ein Windows-Meldungsfenster (die EXE hat kein Konsolenfenster).
func showError(title, text string) {
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(text)
	proc := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	_, _, _ = proc.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}
