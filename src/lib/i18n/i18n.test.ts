import de from '@/lib/i18n/locales/de.json';
import en from '@/lib/i18n/locales/en.json';
import { i18n, setLanguage } from '@/lib/i18n';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('i18n', () => {
  it('de und en haben identische Keys', () => {
    expect(flatten(de).sort()).toEqual(flatten(en).sort());
  });

  it('wechselt die Sprache', async () => {
    await setLanguage('en');
    expect(i18n.t('common.continue')).toBe('Continue');
    await setLanguage('de');
    expect(i18n.t('common.continue')).toBe('Weiter');
  });
});
