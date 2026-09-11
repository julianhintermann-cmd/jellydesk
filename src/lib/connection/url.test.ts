import { normalizeServerUrl, deriveSeerrUrl } from '@/lib/connection/url';

describe('normalizeServerUrl', () => {
  it('ergänzt http und entfernt Slash', () => {
    expect(normalizeServerUrl('192.168.1.125:8096/')).toBe('http://192.168.1.125:8096');
  });
  it('behält https und Pfad', () => {
    expect(normalizeServerUrl('https://jf.example.com/jellyfin/')).toBe('https://jf.example.com/jellyfin');
  });
  it('trimmt Leerzeichen', () => {
    expect(normalizeServerUrl('  http://a:8096 ')).toBe('http://a:8096');
  });
  it('liefert null bei Unsinn', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('not a url')).toBeNull();
  });
});

describe('deriveSeerrUrl', () => {
  it('setzt Port 5055 auf gleichem Host', () => {
    expect(deriveSeerrUrl('http://192.168.1.125:8096')).toBe('http://192.168.1.125:5055');
    expect(deriveSeerrUrl('https://jf.example.com')).toBe('https://jf.example.com:5055');
  });
});
