# LexiClash Routes & Pages

## Overview
Next.js App Router with `[locale]/` dynamic segment for i18n.
Supported locales: `en`, `he` (RTL), `sv`, `ja`, `es`.

All routes below are under `app/` directory. The `[locale]` segment is one of the 5 locales above.

---

## Route Map

### Core Pages
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]` | `app/[locale]/page.tsx` | Landing page (HomePageClient -> LandingView) |
| `/[locale]/about` | `app/[locale]/about/page.tsx` | About page |
| `/[locale]/rules` | `app/[locale]/rules/page.tsx` | Game rules |
| `/[locale]/contact` | `app/[locale]/contact/page.tsx` | Contact form |
| `/[locale]/faq` | `app/[locale]/faq/page.tsx` | FAQ page |
| `/[locale]/settings` | `app/[locale]/settings/page.tsx` | User settings |
| `/[locale]/leaderboard` | `app/[locale]/leaderboard/page.tsx` | Global leaderboard |
| `/[locale]/profile` | `app/[locale]/profile/page.tsx` | User profile |
| `/[locale]/friends` | `app/[locale]/friends/page.tsx` | Friends list |
| `/[locale]/accessibility` | `app/[locale]/accessibility/page.tsx` | Accessibility statement |
| `/[locale]/unsubscribe` | `app/[locale]/unsubscribe/page.tsx` | Email unsubscribe |

### Game Modes
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/multiplayer` | `app/[locale]/multiplayer/page.tsx` | Multiplayer lobby & game |
| `/[locale]/singleplayer` | `app/[locale]/singleplayer/page.tsx` | Single player vs AI |
| `/[locale]/blast` | `app/[locale]/blast/page.tsx` | Blast mode |
| `/[locale]/join/[code]` | `app/[locale]/join/[code]/page.tsx` | Join room by code |
| `/[locale]/challenge/[code]` | `app/[locale]/challenge/[code]/page.tsx` | Challenge link |
| `/[locale]/custom/[puzzleCode]` | `app/[locale]/custom/[puzzleCode]/page.tsx` | Custom puzzle |
| `/[locale]/hebrew-multiplayer-word-game` | `app/[locale]/hebrew-multiplayer-word-game/page.tsx` | SEO landing for Hebrew |

### Daily Challenge
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/daily` | `app/[locale]/daily/page.tsx` | Daily challenge router (redirects or shows landing) |
| `/[locale]/daily/word-hunt` | `app/[locale]/daily/word-hunt/page.tsx` | Word Hunt Survival puzzle |
| `/[locale]/daily/buzz` | `app/[locale]/daily/buzz/page.tsx` | Daily Buzz (AI-generated trending topics) |

### Adventure Mode
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/adventure` | `app/[locale]/adventure/page.tsx` | Adventure mode (world map) |
| `/[locale]/adventure/skills` | `app/[locale]/adventure/skills/page.tsx` | Skills tree |
| `/[locale]/adventure/achievements` | `app/[locale]/adventure/achievements/page.tsx` | Adventure achievements |

### Brain Training
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/brain` | `app/[locale]/brain/page.tsx` | Brain training hub |
| `/[locale]/brain/drills/memory-hunt` | `app/[locale]/brain/drills/memory-hunt/page.tsx` | Memory Hunt drill |
| `/[locale]/brain/drills/pattern-switcher` | `app/[locale]/brain/drills/pattern-switcher/page.tsx` | Pattern Switcher drill |
| `/[locale]/brain/drills/rare-gems` | `app/[locale]/brain/drills/rare-gems/page.tsx` | Rare Gems drill |
| `/[locale]/brain/drills/combo-master` | `app/[locale]/brain/drills/combo-master/page.tsx` | Combo Master drill |
| `/[locale]/brain/drills/lightning-round` | `app/[locale]/brain/drills/lightning-round/page.tsx` | Lightning Round drill |

### Education
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/education` | `app/[locale]/education/page.tsx` | Education hub |
| `/[locale]/education/classroom-game` | `app/[locale]/education/classroom-game/page.tsx` | Classroom game mode |
| `/[locale]/education/duels` | `app/[locale]/education/duels/page.tsx` | Duels lobby |
| `/[locale]/education/duels/[duelId]` | `app/[locale]/education/duels/[duelId]/page.tsx` | Active duel |

### Teacher Dashboard
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/teacher` | `app/[locale]/teacher/page.tsx` | Teacher dashboard |
| `/[locale]/teacher/reports` | `app/[locale]/teacher/reports/page.tsx` | Teaching reports |
| `/[locale]/teacher/curriculum` | `app/[locale]/teacher/curriculum/page.tsx` | Curriculum management |
| `/[locale]/teacher/classroom/[id]/analytics` | `app/[locale]/teacher/classroom/[id]/analytics/page.tsx` | Classroom analytics |

### Student Portal
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/student` | `app/[locale]/student/page.tsx` | Student dashboard |
| `/[locale]/student/join` | `app/[locale]/student/join/page.tsx` | Join classroom |
| `/[locale]/student/profile` | `app/[locale]/student/profile/page.tsx` | Student profile |
| `/[locale]/student/lessons` | `app/[locale]/student/lessons/page.tsx` | Lesson list |
| `/[locale]/student/lessons/[id]` | `app/[locale]/student/lessons/[id]/page.tsx` | Individual lesson |
| `/[locale]/student/achievements` | `app/[locale]/student/achievements/page.tsx` | Student achievements |

### Admin
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/admin` | `app/[locale]/admin/page.tsx` | Admin dashboard |
| `/[locale]/admin/words` | `app/[locale]/admin/words/page.tsx` | Word management |
| `/[locale]/admin/players` | `app/[locale]/admin/players/page.tsx` | Player management |
| `/[locale]/admin/dictionary` | `app/[locale]/admin/dictionary/page.tsx` | Dictionary management |
| `/[locale]/admin/invalid-words` | `app/[locale]/admin/invalid-words/page.tsx` | Invalid words review |
| `/[locale]/admin/wikipedia-words` | `app/[locale]/admin/wikipedia-words/page.tsx` | Wikipedia words import |
| `/[locale]/admin/milog-words` | `app/[locale]/admin/milog-words/page.tsx` | Milog words import |
| `/[locale]/admin/word-bank` | `app/[locale]/admin/word-bank/page.tsx` | Word bank |
| `/[locale]/admin/daily-buzz` | `app/[locale]/admin/daily-buzz/page.tsx` | Daily Buzz admin |
| `/[locale]/admin/web-vitals` | `app/[locale]/admin/web-vitals/page.tsx` | Web vitals dashboard |

### Blog & Content
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/blog` | `app/[locale]/blog/page.tsx` | Blog index |
| `/[locale]/blog/improve-word-game-skills` | `app/[locale]/blog/improve-word-game-skills/page.tsx` | Blog post |
| `/[locale]/blog/science-behind-word-games` | `app/[locale]/blog/science-behind-word-games/page.tsx` | Blog post |
| `/[locale]/blog/10-surprising-benefits-word-games` | `app/[locale]/blog/10-surprising-benefits-word-games/page.tsx` | Blog post |
| `/[locale]/blog/daily-challenge-strategies` | `app/[locale]/blog/daily-challenge-strategies/page.tsx` | Blog post |
| `/[locale]/blog/multilingual-word-learning` | `app/[locale]/blog/multilingual-word-learning/page.tsx` | Blog post |
| `/[locale]/blog/top-player-secrets` | `app/[locale]/blog/top-player-secrets/page.tsx` | Blog post |

### Legal
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/legal` | `app/[locale]/legal/page.tsx` | Legal index |
| `/[locale]/legal/privacy` | `app/[locale]/legal/privacy/page.tsx` | Privacy policy |
| `/[locale]/legal/terms` | `app/[locale]/legal/terms/page.tsx` | Terms of service |

### Auth
| URL Pattern | Page File | Description |
|---|---|---|
| `/[locale]/auth/callback` | `app/[locale]/auth/callback/page.tsx` | OAuth callback handler |

### Special (Non-locale)
| URL Pattern | Page File | Description |
|---|---|---|
| `/party-screen` | `app/party-screen/page.tsx` | Party screen (TV display) |
| `/party-screen/[roomCode]` | `app/party-screen/[roomCode]/page.tsx` | Party screen for specific room |

---

## Route Count Summary
- **Total pages:** 67
- **Locale-based:** 65
- **Non-locale:** 2 (party-screen)
- **Dynamic segments:** `[locale]`, `[code]`, `[puzzleCode]`, `[id]`, `[duelId]`, `[roomCode]`
