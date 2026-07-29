/**
 * API Route: /api/word-craft/wordlist
 * Returns a list of valid words for a given locale (HE/ES/JA).
 * Used by the client-side WordCraft game dictionary validator.
 */

import { NextRequest, NextResponse } from 'next/server'
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization'
import * as fsp from 'fs/promises'
import * as path from 'path'

const cache = new Map<string, string[]>()

async function getWords(locale: string): Promise<string[]> {
  if (cache.has(locale)) return cache.get(locale)!

  let words: string[]

  if (locale === 'he') {
    words = await loadHebrewWords()
  } else if (locale === 'es') {
    words = await loadSpanishWords()
  } else if (locale === 'sv') {
    words = await loadSwedishWords()
  } else if (locale === 'ja') {
    words = await loadJapaneseWords()
  } else {
    return []
  }

  cache.set(locale, words)
  return words
}

async function loadHebrewWords(): Promise<string[]> {
  // Reuse the same Hebrew dictionary loading as dictionary/check route
  const backendDir = path.join(process.cwd(), 'backend')
  const [mainContent, approvedContent] = await Promise.all([
    fsp.readFile(path.join(backendDir, 'hebrew_words.txt'), 'utf-8').catch(() => ''),
    fsp.readFile(path.join(backendDir, 'hebrew_words_approved.txt'), 'utf-8').catch(() => ''),
  ])

  const words: string[] = []
  for (const content of [mainContent, approvedContent]) {
    if (content) {
      for (const line of content.split('\n')) {
        const w = normalizeHebrewWord(line.trim())
        if (w.length > 0) words.push(w)
      }
    }
  }
  return words
}

async function loadSpanishWords(): Promise<string[]> {
  // Reuse the same Spanish dictionary loading as dictionary/check route
  const { default: spanishWords } = await import('an-array-of-spanish-words', {
    with: { type: 'json' },
  })
  const words = (spanishWords as string[]).map((w: string) => w.toLowerCase())

  // Also load approved Spanish words if available
  const approvedFile = path.join(process.cwd(), 'backend', 'spanish_words_approved.txt')
  const approvedContent = await fsp.readFile(approvedFile, 'utf-8').catch(() => '')

  if (approvedContent) {
    for (const line of approvedContent.split('\n')) {
      const w = line.trim().toLowerCase()
      if (w.length > 0) words.push(w)
    }
  }

  return words
}

async function loadSwedishWords(): Promise<string[]> {
  // Reuse the same Swedish dictionary loading as dictionary/check route
  const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js')
  const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt')
  const validSwedishWordPattern = /^[a-zåäöéàü]+$/i

  const words: string[] = []

  const content = await fsp.readFile(swedishWordsPath, 'utf-8').catch(() => '')

  if (content) {
    const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/)
    if (arrayMatch) {
      for (const line of arrayMatch[1].split(',')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          try {
            const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1')
            const word = JSON.parse(jsonCompatible)
            if (word && word.length > 1 && validSwedishWordPattern.test(word)) {
              words.push(word.toLowerCase())
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    }
  }

  const approvedContent = await fsp.readFile(approvedFile, 'utf-8').catch(() => '')

  if (approvedContent) {
    for (const line of approvedContent.split('\n')) {
      const w = line.trim().toLowerCase()
      if (w.length > 0) words.push(w)
    }
  }

  return words
}

async function loadJapaneseWords(): Promise<string[]> {
  // Reuse the same Japanese dictionary loading as dictionary/check route
  const backendDir = path.join(process.cwd(), 'backend')
  const [kanjiContent, approvedContent] = await Promise.all([
    fsp.readFile(path.join(backendDir, 'kanji_compounds.txt'), 'utf-8').catch(() => ''),
    fsp.readFile(path.join(backendDir, 'japanese_words_approved.txt'), 'utf-8').catch(() => ''),
  ])

  const words: string[] = []
  for (const content of [kanjiContent, approvedContent]) {
    if (content) {
      for (const line of content.split('\n')) {
        const w = line.trim()
        if (w.length > 0) words.push(w)
      }
    }
  }
  return words
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? ''

    if (!['he', 'es', 'sv', 'ja'].includes(locale)) {
      return NextResponse.json({ error: 'unsupported locale' }, { status: 400 })
    }

    const words = await getWords(locale)

    return NextResponse.json(words, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[word-craft/wordlist] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
