#!/bin/bash
input=$(cat)
get() { printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d||"{}");const v=process.argv[1].split(".").reduce((o,k)=>o&&o[k],j);process.stdout.write(v==null?"":String(v))})' "$1"; }
MODEL=$(get model.display_name); DIR=$(get workspace.current_dir); PCT=$(get context_window.used_percentage)
PROJECT=$(basename "${DIR:-.}"); PCT=${PCT%%.*}; PCT=${PCT:-0}
BRANCH=$(git -C "$DIR" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
printf '\033[1;34m%s\033[0m %s \033[36m%s\033[0m  ctx %s%%\n' "$PROJECT" "${BRANCH:+($BRANCH)}" "$MODEL" "$PCT"
