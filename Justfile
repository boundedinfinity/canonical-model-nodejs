proj_dir	:= justfile_directory()
m           := "updates"

# Bootstrap vscode
#   Run palette: Shell Command: Install 'code' command in PATH
#   Run palette: Configure Recommended Extensions
#   Run palette: Deno: Initialize Workspace Configuration

# Bootstrap macOS
#   brew install just
#   brew install deno

# Bootstrap Fedora
#   sudo dnf install -y just deno


list:
    @just --list

gen:
	deno run --allow-read gen.ts

push:
	git add . || true
	git commit -m "{{ m }}" || true
	git push origin master
