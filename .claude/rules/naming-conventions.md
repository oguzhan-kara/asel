# Naming Conventions

These naming conventions apply to ALL projects. Consistency across the codebase is mandatory.

| Target | Convention | Example |
|--------|-----------|---------|
| **React Components** | PascalCase | `UserList.tsx`, `DataTable.tsx` |
| **Component directories** | PascalCase | `components/UserList/` |
| **Route paths** | kebab-case | `/user-management`, `/work-orders` |
| **API endpoints** | kebab-case | `/api/audit-logs`, `/api/work-orders` |
| **Database tables** | snake_case | `user_roles`, `audit_logs` |
| **Database columns** | snake_case | `created_at`, `is_active` |
| **Environment variables** | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| **JSON/API fields** | camelCase | `firstName`, `createdAt`, `isActive` |
| **TypeScript files** | camelCase | `authService.ts`, `useAuth.ts` |
| **Go files** | snake_case | `auth_handler.go`, `user_service.go` |
| **Python files** | snake_case | `auth_service.py`, `data_model.py` |
| **Java/Kotlin files** | PascalCase | `AuthService.java`, `UserDto.kt` |
| **CSS/SCSS files** | kebab-case | `user-list.module.css` |
| **Test files** | same as source + suffix | `authService.test.ts`, `auth_handler_test.go` |
| **Migration files** | timestamp_description | `20260315_create_users.sql` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| **Interfaces/Types** | PascalCase, no prefix | `User`, `CreateUserRequest` (not `IUser`) |
| **Enums** | PascalCase members | `UserRole.Admin`, `Status.Active` |
