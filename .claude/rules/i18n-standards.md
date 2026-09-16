# Internationalization (i18n) Standards

All user-facing projects MUST be i18n-ready from day one. Retrofitting i18n is expensive.

## Language Priority

| Priority | Language | Usage |
|----------|----------|-------|
| 1 | Turkish (TR) | Default UI language, user-facing text |
| 2 | English (EN) | Secondary language, code/docs/variables |

## Rules

- **NO hardcoded Turkish strings in components** — all user-visible text MUST go through i18n
- **Code and variables in English** — `userName` not `kullaniciAdi`, `isActive` not `aktifMi`
- **API error messages in English** — frontend translates for display
- **Date format**: `DD.MM.YYYY` for Turkish locale (not MM/DD/YYYY)
- **Number format**: `1.234,56` for Turkish locale (dot=thousands, comma=decimal)
- **Currency**: `₺1.234,56` (TRY symbol prefix)

## Implementation

### React Projects
- Use `react-i18next` with `common` namespace as default
- Translation files: `public/locales/{lang}/common.json`
- Inline bundled (no lazy loading for small apps)
- `useTranslation()` hook in components

### Backend
- Error codes in UPPER_SNAKE_CASE English: `USER_NOT_FOUND`, `VALIDATION_ERROR`
- Error messages in English (frontend translates)
- Audit log actions in English: `AUTH_LOGIN`, `USER_CREATE`

### Database
- Column names in English snake_case
- Enum values in English UPPER_CASE: `ACTIVE`, `INACTIVE`, `PENDING`
- User-facing content fields support UTF-8 (Turkish characters: ç, ğ, ı, İ, ö, ş, ü)

## API-Only Projects (no UI)
- i18n framework NOT required
- Error messages in English
- Documentation in English
