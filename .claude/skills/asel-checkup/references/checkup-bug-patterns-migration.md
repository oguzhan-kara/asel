
1.8 Check `MIGRATION_NEEDED` raporladıysa uygula. Idempotent — yoksa atla, merge case'i destekler.

```bash
DEC=docs/brainstorming/decisions.md
BP=docs/brainstorming/bug-patterns.md

# 1) Migration gerekiyor mu?
if [ ! -f "$DEC" ] || ! grep -q '^## Bug Patterns & Prevention Rules' "$DEC"; then
  echo "NO_MIGRATION"  # Zaten migre veya hiç yoktu — atla
  exit 0
fi

# 2) Bölümü decisions.md'den çek (başlık dahil, sonraki '## ' başlığına kadar)
SECTION=$(awk '
  /^## Bug Patterns & Prevention Rules[[:space:]]*$/ {capture=1; next}
  capture && /^## / {capture=0}
  capture {print}
' "$DEC")

# 3) bug-patterns.md'yi oluştur veya merge et
if [ ! -f "$BP" ]; then
  mkdir -p docs/brainstorming
  {
    printf '# Bug Patterns & Prevention Rules\n\n'
    printf 'Runtime knowledge base of bugs that have occurred and rules to prevent them.\n'
    printf 'Read by: Planner (warnings), Gate/Scouts (compliance check), Developer (awareness).\n\n'
    printf '## Patterns\n\n'
    printf '%s\n' "$SECTION"
  } > "$BP"
else
  # Zaten varsa: SECTION'ı bug-patterns.md'nin sonuna ekle (dedup check de yap)
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    # Her satır için fF dedup (PAT-NNN imzasına göre)
    if ! grep -qF "$line" "$BP" 2>/dev/null; then
      printf '%s\n' "$line" >> "$BP"
    fi
  done <<< "$SECTION"
fi

# 4) decisions.md'den bölümü sil (başlık + altındaki tüm satırlar, sonraki '## ' hariç)
awk '
  /^## Bug Patterns & Prevention Rules[[:space:]]*$/ {skip=1; next}
  skip && /^## / {skip=0}
  !skip {print}
' "$DEC" > "$DEC.tmp" && mv "$DEC.tmp" "$DEC"

# 5) Doğrula
grep -q '^## Bug Patterns & Prevention Rules' "$DEC" && echo "FAIL: section remains in decisions.md" || echo "OK: migrated"
test -s "$BP" && echo "OK: bug-patterns.md non-empty" || echo "WARN: bug-patterns.md is empty"
```

Migration sonrası:
- `decisions.md` → `## Bug Patterns & Prevention Rules` bölümü yok
- `bug-patterns.md` → header + tüm pattern'lar `## Patterns` altında
- Dosya sistemine yazıldı ama git commit kullanıcı kontrolünde
