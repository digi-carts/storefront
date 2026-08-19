'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useStorefrontStore } from '@/lib/storefront-store';
import { useStorePath } from '@/lib/use-store-path';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Trash2, User } from 'lucide-react';

interface Address { id: string; name: string; line1: string; city: string; country: string; zip: string; isDefault: boolean }

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'IN' },
  { code: '+1', flag: '🇺🇸', name: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'GB' },
  { code: '+61', flag: '🇦🇺', name: 'AU' },
  { code: '+971', flag: '🇦🇪', name: 'AE' },
  { code: '+65', flag: '🇸🇬', name: 'SG' },
  { code: '+60', flag: '🇲🇾', name: 'MY' },
  { code: '+49', flag: '🇩🇪', name: 'DE' },
  { code: '+33', flag: '🇫🇷', name: 'FR' },
  { code: '+81', flag: '🇯🇵', name: 'JP' },
  { code: '+55', flag: '🇧🇷', name: 'BR' },
  { code: '+94', flag: '🇱🇰', name: 'LK' },
  { code: '+977', flag: '🇳🇵', name: 'NP' },
  { code: '+92', flag: '🇵🇰', name: 'PK' },
  { code: '+880', flag: '🇧🇩', name: 'BD' },
];

function splitPhone(full: string): { dialCode: string; number: string } {
  for (const c of COUNTRY_CODES) {
    if (full.startsWith(c.code)) return { dialCode: c.code, number: full.slice(c.code.length).trim() };
  }
  return { dialCode: '+91', number: full };
}

export default function ProfilePage() {
  const { user, clearAuth } = useStorefrontStore();
  const base = useStorePath();
  const router = useRouter();

  const [name, setName] = useState('');
  const [dialCode, setDialCode] = useState('+91');
  const [phoneNum, setPhoneNum] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrName, setAddrName] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrCountry, setAddrCountry] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');

  useEffect(() => {
    if (!user) { router.push(`${base}/login`); return; }
    api.get('/auth/me').then(r => {
      setName(r.data.user.name || '');
      const { dialCode: dc, number } = splitPhone(r.data.user.phone || '');
      setDialCode(dc);
      setPhoneNum(number);
    }).catch(() => {});
    api.get('/auth/user/addresses').then(r => setAddresses(r.data.addresses || [])).catch(() => {});
  }, [user, base, router]);

  const saveProfile = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phoneNum && !/^\d{6,14}$/.test(phoneNum.replace(/[\s\-().]/g, ''))) {
      setProfileError('Enter a valid phone number'); return;
    }
    setSavingProfile(true); setProfileError(''); setProfileSaved(false);
    try {
      const phone = phoneNum ? `${dialCode}${phoneNum}` : '';
      await api.patch('/auth/me', { name, phone });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch { setProfileError('Failed to save profile.'); }
    finally { setSavingProfile(false); }
  };

  const addAddress = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddrSaving(true); setAddrError('');
    try {
      const r = await api.post('/auth/user/addresses', {
        name: addrName, line1: addrLine1, city: addrCity, country: addrCountry, zip: addrZip,
        isDefault: addresses.length === 0,
      });
      setAddresses(prev => [...prev, r.data.address]);
      setAddrName(''); setAddrLine1(''); setAddrCity(''); setAddrCountry(''); setAddrZip('');
    } catch { setAddrError('Failed to add address.'); }
    finally { setAddrSaving(false); }
  };

  const setDefault = async (id: string) => {
    await api.patch(`/auth/user/addresses/${id}/default`).catch(() => {});
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  };

  const deleteAddress = async (id: string) => {
    await api.delete(`/auth/user/addresses/${id}`).catch(() => {});
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleLogout = () => { clearAuth(); router.push(`${base}/login`); };

  if (!user) return null;

  return (
    <TemplateWrapper>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
              <User size={20} className="text-neutral-500" />
            </div>
            <div>
              <p className="font-semibold">{name || user.email}</p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input id="profile-name" placeholder="Your name" value={name}
                  onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profile-phone">WhatsApp / Phone</Label>
                <div className="flex gap-2">
                  <select
                    value={dialCode}
                    onChange={e => setDialCode(e.target.value)}
                    className="border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black shrink-0">
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <Input id="profile-phone" placeholder="98765 43210" value={phoneNum}
                    onChange={e => setPhoneNum(e.target.value)} type="tel" className="flex-1" />
                </div>
                <p className="text-xs text-neutral-400">Used for order notifications via WhatsApp</p>
              </div>
              {profileError && <p className="text-sm text-red-500">{profileError}</p>}
              {profileSaved && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Saved!
                </p>
              )}
              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Saved Addresses</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map(a => (
                  <div key={a.id} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${a.isDefault ? 'border-black bg-neutral-50' : ''}`}>
                    <div className="text-sm">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-neutral-500">{a.line1}, {a.city}, {a.country} {a.zip}</p>
                      {a.isDefault && <span className="text-xs text-black font-semibold">Default</span>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!a.isDefault && (
                        <button type="button" onClick={() => setDefault(a.id)}
                          className="text-xs text-neutral-500 hover:text-black border rounded px-2 py-0.5">
                          Set default
                        </button>
                      )}
                      <button type="button" onClick={() => deleteAddress(a.id)}
                        className="text-neutral-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={addAddress} className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Add New Address</p>
              <div className="space-y-1">
                <Label htmlFor="addr-name">Full Name</Label>
                <Input id="addr-name" placeholder="Recipient name" value={addrName}
                  onChange={e => setAddrName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addr-line1">Street Address</Label>
                <Input id="addr-line1" placeholder="123 Main St" value={addrLine1}
                  onChange={e => setAddrLine1(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="addr-city">City</Label>
                  <Input id="addr-city" placeholder="City" value={addrCity}
                    onChange={e => setAddrCity(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="addr-country">Country</Label>
                  <Input id="addr-country" placeholder="IN" value={addrCountry}
                    onChange={e => setAddrCountry(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="addr-zip">PIN / ZIP</Label>
                  <Input id="addr-zip" placeholder="682001" value={addrZip}
                    onChange={e => setAddrZip(e.target.value)} required />
                </div>
              </div>
              {addrError && <p className="text-sm text-red-500">{addrError}</p>}
              <Button type="submit" variant="outline" disabled={addrSaving} className="w-full">
                {addrSaving ? 'Adding…' : '+ Add Address'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </TemplateWrapper>
  );
}
