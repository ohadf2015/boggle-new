'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

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
  disabled = false,
  className,
}: CountrySelectorProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const currentCountry = useMemo(() => {
    if (!value) return null;
    return COUNTRIES.find((c) => c.code === value) || { code: value, name: value };
  }, [value]);

  const handleSelect = (code: string | null) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t('profile.selectCountry')}
          aria-expanded={open}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-500 transition-colors w-full',
            'text-sm font-bold',
            'bg-neo-cream dark:bg-neo-navy-elevated text-neo-black dark:text-neo-white',
            'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-sm',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none',
            className
          )}
        >
          {currentCountry ? (
            <>
              <span className="text-lg">{getCountryFlag(currentCountry.code)}</span>
              <span className="flex-1 text-start truncate">{currentCountry.name}</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 opacity-50" />
              <span className="flex-1 text-start opacity-70">
                {t('profile.selectCountry')}
              </span>
            </>
          )}
          <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={t('profile.searchCountry')} aria-label={t('profile.searchCountry')} />
          <CommandList className="max-h-60">
            <CommandEmpty>{t('profile.noCountryFound')}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect(null)}
                  className="text-neo-red data-[selected=true]:bg-neo-red/10 data-[selected=true]:text-neo-red"
                >
                  <X className="w-4 h-4" />
                  {t('profile.clearCountry')}
                </CommandItem>
              )}
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => handleSelect(country.code)}
                >
                  <span className="text-lg">{getCountryFlag(country.code)}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  {value === country.code && <Check className="w-4 h-4 shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default CountrySelector;
