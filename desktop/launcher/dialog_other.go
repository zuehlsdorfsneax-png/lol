//go:build !windows

package main

import (
	"fmt"
	"os"
)

func showError(title, text string) {
	fmt.Fprintln(os.Stderr, title+": "+text)
}
