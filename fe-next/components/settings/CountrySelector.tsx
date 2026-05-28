'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';

// Common countries list with ISO 3166-1 alpha-2 codes
// Sorted by approximate usage / popularity
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IL', name: 'Israel' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'IS', name: 'Iceland' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' },
].sort((a, b) => a.name.localeCompare(b.name));

interface CountrySelectorProps {
  value: string | null | undefined;
  onChange: (countryCode: string | null) => void;
  isDarkMode?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CountrySelector({
  value,
  onChange,
  isDarkMode = false,
  disabled = false,
  className,
}: CountrySelectorProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find current country
  const currentCountry = useMemo(() => {
    if (!value) return null;
    return COUNTRIES.find(c => c.code === value) || { code: value, name: value };
  }, [value]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const searchLower = search.toLowerCase();
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.code.toLowerCase().includes(searchLower)
    );
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = useCallback((code: string | null) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={t('profile.selectCountry')}
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors w-full',
          'text-sm font-medium',
          disabled && 'opacity-50 cursor-not-allowed',
          isDarkMode
            ? 'bg-neo-navy-elevated border-slate-600 text-gray-200 hover:bg-slate-600'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
          isOpen && (isDarkMode ? 'ring-2 ring-cyan-500/50' : 'ring-2 ring-cyan-500/30')
        )}
      >
        {currentCountry ? (
          <>
            <span className="text-lg">{getCountryFlag(currentCountry.code)}</span>
            <span className="flex-1 text-left truncate">{currentCountry.name}</span>
          </>
        ) : (
          <>
            <Globe className="w-4 h-4 opacity-50" />
            <span className="flex-1 text-left opacity-70">
              {t('profile.selectCountry')}
            </span>
          </>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border shadow-lg overflow-hidden',
            isDarkMode
              ? 'bg-neo-navy-light border-slate-700'
              : 'bg-white border-gray-200'
          )}
        >
          {/* Search Input */}
          <div className={cn(
            'p-2 border-b',
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          )}>
            <div className="relative">
              <Search className={cn(
                'absolute left-2 rtl:left-auto rtl:right-2 top-1/2 -translate-y-1/2 w-4 h-4',
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              )} />
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                aria-label={t('profile.searchCountry')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('profile.searchCountry')}
                className={cn(
                  'w-full ps-8 pe-8 py-2 text-sm rounded-md border',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
                  isDarkMode
                    ? 'bg-neo-navy-elevated border-slate-600 text-white placeholder:text-gray-500 focus:border-cyan-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500'
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label={t('common.clearSearch')}
                  className={cn(
                    'absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 rounded',
                    isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'
                  )}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Clear Selection Option */}
          {value && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'w-full px-3 py-2 text-sm text-left border-b flex items-center gap-2',
                isDarkMode
                  ? 'border-slate-700 text-red-400 hover:bg-neo-navy-elevated'
                  : 'border-gray-200 text-red-600 hover:bg-gray-50'
              )}
            >
              <X className="w-4 h-4" />
              {t('profile.clearCountry')}
            </button>
          )}

          {/* Country List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className={cn(
                'px-3 py-4 text-sm text-center',
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              )}>
                {t('profile.noCountryFound')}
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors',
                    value === country.code
                      ? isDarkMode
                        ? 'bg-cyan-900/30 text-cyan-400'
                        : 'bg-cyan-50 text-cyan-700'
                      : isDarkMode
                        ? 'text-gray-200 hover:bg-neo-navy-elevated'
                        : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className="text-lg">{getCountryFlag(country.code)}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  {value === country.code && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      isDarkMode ? 'bg-cyan-800 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                    )}>
                      {t('common.selected')}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CountrySelector;
