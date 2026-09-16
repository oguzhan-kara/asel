---
paths: {{rules.backend,frontend}}
---

# Clean Code Standards

Code must be readable, maintainable, and well-structured. These limits prevent complexity from accumulating.

## File Size Limits

| Metric | Limit | Action |
|--------|-------|--------|
| File length | 400 lines max | Split into smaller modules |
| Function/method length | 50 lines max | Extract helper functions |
| Component length (React) | 300 lines max | Split into sub-components |
| Class length (Java/Go struct) | 400 lines max | Extract services/helpers |

## Structure Rules

- **Single Responsibility**: Each file/class/function does ONE thing
- **No God Components**: A React component that fetches data, manages state, handles events, AND renders complex UI must be split
- **Extract hooks**: Complex state logic → custom hook (`useXxx`)
- **Extract utils**: Reusable logic → utility function
- **Extract constants**: Magic numbers/strings → named constants
- **Extract types**: Shared types → dedicated type file

## Naming

- Functions: verb + noun (`getUserById`, `calculateTotal`, `handleSubmit`)
- Booleans: `is`, `has`, `should`, `can` prefix (`isActive`, `hasPermission`)
- Arrays: plural (`users`, `items`, `orders`)
- Callbacks: `on` prefix for props (`onClick`, `onSubmit`, `onChange`)
- Handlers: `handle` prefix for implementations (`handleClick`, `handleSubmit`)

## React Specific

- **No inline functions in JSX** for expensive operations — extract or useCallback
- **No nested ternaries** — use early return or switch/map
- **Props > 5** — consider grouping into an object or splitting component
- **No prop drilling > 2 levels** — use context or state management

## Backend Specific

- **No business logic in controllers/handlers** — delegate to service layer
- **No raw SQL in controllers** — use repository/DAO pattern
- **No nested try-catch > 2 levels** — extract error handling
- **No callback hell** — use async/await or promises

### Bekleme ve kilit (2026-09-10'da pahalıya öğrenildi)

- **`synchronized` bloğun içinde ağ/IO çağrısı YOK.** Kilit yalnız alan okuma/yazma
  gibi hesap işlerini korur. Bir istemci çağrısı kilidin altında takılırsa o kilidi
  bekleyen her thread de takılır — tek bağlantının maliyeti tüm servis olur.
- **Süresiz bekleme YOK.** `Future.get()`, `CompletableFuture.join()`, `latch.await()`,
  `.block()` — hepsi **timeout'lu** çağrılır. Kütüphanenin "zaten timeout'u var"
  varsayımı **ölçülmeden kabul edilmez**: `RedisMessageListenerContainer`'ın
  `maxSubscriptionRegistrationWaitingTime` ayarı vardır ama `addListener` yolunu
  korumaz (3.4.13 bytecode'unda sınırsız `join()`).
- **Uzun ömürlü akışlar (SSE/WebSocket) istek havuzunu paylaşmaz.** Aynı havuzda
  tıkanan bir akış REST'i de yanına alır.
- **Timeout'ta davranış: o isteği reddet, servisi ayakta tut.** Sessizce yutmak da
  sonsuza beklemek de yanlış; çağıran hata alır, thread havuza döner.

**Neden bu kadar net:** `lena-api` 2026-09-10'da bu üçünün birleşiminden çöktü —
`DashboardSseService.ensureHeaderListener` `synchronized` içinden sınırsız bekleyen bir
abonelik çağrısı yaptı; 200/200 Tomcat thread'i o monitörde kilitlendi; SSE ile birlikte
**tüm REST uçları** öldü, `/actuator/health` bile cevap vermedi. Yalnız restart kurtardı.
Aynı hata iki serviste birbirinden bağımsız yazılmıştı (`DashboardSseService` +
`MonitoringSseService`) — kural olmadığı için ikinci kez de yazıldı.
Muhafız testler: `SseListenerRegistrationLockTest` (lena-api) ·
`SpringChannelSubscriberTimeoutTest` (lena-cache-spring).
