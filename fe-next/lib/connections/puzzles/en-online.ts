import type { ConnectionPuzzle } from "../types";

/**
 * English Word Bridge riddles — compound chains (word1+bridge and bridge+word2
 * are both real English compounds, e.g. SUN|LIGHT|HOUSE = sunlight + lighthouse).
 * Sourced from authored chains + /claude-council (gemini+grok), then a
 * 3-reviewer gate confirmed BOTH compounds are real common English and the
 * bridge is reasonably unique. Isolated file for easy audit. 2026-05-30.
 */
export const EN_ONLINE: ConnectionPuzzle[] = [
  { id: "en-o-001", word1: "COW", word2: "HOOD", bridge: "BOY", difficulty: "medium" }, // cowboy + boyhood
  { id: "en-o-002", word1: "SEA", word2: "COLOR", bridge: "WATER", difficulty: "medium" }, // seawater + watercolor
  { id: "en-o-003", word1: "BUTTER", word2: "WEED", bridge: "MILK", difficulty: "medium" }, // buttermilk + milkweed
  { id: "en-o-004", word1: "HAIR", word2: "CUSHION", bridge: "PIN", difficulty: "medium" }, // hairpin + pincushion
  { id: "en-o-005", word1: "TABLE", word2: "BOUND", bridge: "CLOTH", difficulty: "medium" }, // tablecloth + clothbound
  { id: "en-o-006", word1: "BROAD", word2: "MUSIC", bridge: "SHEET", difficulty: "medium" }, // broadsheet + sheetmusic
  { id: "en-o-007", word1: "BULL", word2: "PAL", bridge: "PEN", difficulty: "medium" }, // bullpen + penpal
  { id: "en-o-008", word1: "SAND", word2: "CAR", bridge: "BOX", difficulty: "medium" }, // sandbox + boxcar
  { id: "en-o-009", word1: "FILM", word2: "SEARCH", bridge: "STRIP", difficulty: "medium" }, // filmstrip + stripsearch
  { id: "en-o-010", word1: "RAIN", word2: "BOOK", bridge: "CHECK", difficulty: "medium" }, // raincheck + checkbook
  { id: "en-o-011", word1: "TOOTH", word2: "WOOD", bridge: "BRUSH", difficulty: "medium" }, // toothbrush + brushwood
  { id: "en-o-012", word1: "SUPER", word2: "BOOM", bridge: "SONIC", difficulty: "medium" }, // supersonic + sonicboom
  { id: "en-o-013", word1: "WATER", word2: "PAD", bridge: "LILY", difficulty: "medium" }, // waterlily + lilypad
  { id: "en-o-014", word1: "HOME", word2: "FAST", bridge: "STEAD", difficulty: "medium" }, // homestead + steadfast
  { id: "en-o-015", word1: "LADY", word2: "SPRAY", bridge: "BUG", difficulty: "medium" }, // ladybug + bugspray
  { id: "en-o-016", word1: "WHITE", word2: "CLOTH", bridge: "WASH", difficulty: "medium" }, // whitewash + washcloth
  { id: "en-o-017", word1: "HONEY", word2: "STRUCK", bridge: "MOON", difficulty: "medium" }, // honeymoon + moonstruck
  { id: "en-o-018", word1: "HEAD", word2: "SHIFT", bridge: "GEAR", difficulty: "medium" }, // headgear + gearshift
  { id: "en-o-019", word1: "LIFE", word2: "DISTANCE", bridge: "LONG", difficulty: "medium" }, // lifelong + longdistance
  { id: "en-o-020", word1: "BLUE", word2: "HOPPER", bridge: "GRASS", difficulty: "medium" }, // bluegrass + grasshopper
  { id: "en-o-021", word1: "FIRE", word2: "LOAD", bridge: "TRUCK", difficulty: "medium" }, // firetruck + truckload
  { id: "en-o-022", word1: "BACK", word2: "RULE", bridge: "SLIDE", difficulty: "medium" }, // backslide + sliderule
  { id: "en-o-023", word1: "WORK", word2: "PRESS", bridge: "BENCH", difficulty: "medium" }, // workbench + benchpress
  { id: "en-o-024", word1: "OVER", word2: "OFF", bridge: "TAKE", difficulty: "medium" }, // overtake + takeoff
  { id: "en-o-025", word1: "WATER", word2: "READ", bridge: "PROOF", difficulty: "medium" }, // waterproof + proofread
  { id: "en-o-026", word1: "HAND", word2: "LINK", bridge: "CUFF", difficulty: "medium" }, // handcuff + cufflink
  { id: "en-o-027", word1: "SHOE", word2: "BEAN", bridge: "STRING", difficulty: "medium" }, // shoestring + stringbean
  { id: "en-o-028", word1: "JACK", word2: "LUCK", bridge: "POT", difficulty: "medium" }, // jackpot + potluck
  { id: "en-o-029", word1: "MOUSE", word2: "LOCK", bridge: "PAD", difficulty: "medium" }, // mousepad + padlock
  { id: "en-o-030", word1: "TOP", word2: "BOX", bridge: "HAT", difficulty: "medium" }, // tophat + hatbox
  { id: "en-o-031", word1: "GOD", word2: "SHIP", bridge: "MOTHER", difficulty: "medium" }, // godmother + mothership
  { id: "en-o-032", word1: "PASSION", word2: "CAKE", bridge: "FRUIT", difficulty: "medium" }, // passionfruit + fruitcake
  { id: "en-o-033", word1: "FLAT", word2: "WINNER", bridge: "BREAD", difficulty: "medium" }, // flatbread + breadwinner
  { id: "en-o-034", word1: "COUNTER", word2: "SPIN", bridge: "TOP", difficulty: "medium" }, // countertop + topspin
  { id: "en-o-035", word1: "PAPER", word2: "BOARD", bridge: "CLIP", difficulty: "medium" }, // paperclip + clipboard
  { id: "en-o-036", word1: "TEXT", word2: "STORE", bridge: "BOOK", difficulty: "medium" }, // textbook + bookstore
  { id: "en-o-037", word1: "JOY", word2: "SHARE", bridge: "RIDE", difficulty: "medium" }, // joyride + rideshare
  { id: "en-o-038", word1: "EVER", word2: "BELT", bridge: "GREEN", difficulty: "medium" }, // evergreen + greenbelt
  { id: "en-o-039", word1: "INFRA", word2: "WOOD", bridge: "RED", difficulty: "medium" }, // infrared + redwood
  { id: "en-o-040", word1: "BELL", word2: "SCOTCH", bridge: "HOP", difficulty: "medium" }, // bellhop + hopscotch
  { id: "en-o-041", word1: "PLY", word2: "PECKER", bridge: "WOOD", difficulty: "medium" }, // plywood + woodpecker
  { id: "en-o-042", word1: "GUNNY", word2: "CLOTH", bridge: "SACK", difficulty: "medium" }, // gunnysack + sackcloth
  { id: "en-o-043", word1: "FASHION", word2: "DOWN", bridge: "SHOW", difficulty: "medium" }, // fashionshow + showdown
  { id: "en-o-044", word1: "PONY", word2: "GATE", bridge: "TAIL", difficulty: "medium" }, // ponytail + tailgate
  { id: "en-o-045", word1: "TAIL", word2: "KEEPER", bridge: "GATE", difficulty: "medium" }, // tailgate + gatekeeper
  { id: "en-o-046", word1: "SNAKE", word2: "TIGHT", bridge: "SKIN", difficulty: "medium" }, // snakeskin + skintight
  { id: "en-o-047", word1: "WASTE", word2: "BALL", bridge: "BASKET", difficulty: "medium" }, // wastebasket + basketball
];
