'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTemplate } from '@/lib/template-context';
import { useStorefrontStore } from '@/lib/storefront-store';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import {
  SiWhatsapp, SiInstagram, SiFacebook, SiYoutube, SiX,
} from 'react-icons/si';
import { MdEmail, MdPhone } from 'react-icons/md';
import type { IconType } from 'react-icons';

function useStorePath() {
  const pathname = usePathname();
  const match = /^\/s\/([^/]+)/.exec(pathname);
  return match ? `/s/${match[1]}` : '';
}

interface SocialMeta { label: string; bg: string; Icon: IconType }

const SOCIAL_META: Record<string, SocialMeta> = {
  contactEmail:    { label: 'Email',     bg: '#EA4335', Icon: MdEmail },
  contactPhone:    { label: 'Phone',     bg: '#22C55E', Icon: MdPhone },
  socialWhatsapp:  { label: 'WhatsApp',  bg: '#25D366', Icon: SiWhatsapp },
  socialInstagram: { label: 'Instagram', bg: '#E1306C', Icon: SiInstagram },
  socialFacebook:  { label: 'Facebook',  bg: '#1877F2', Icon: SiFacebook },
  socialYoutube:   { label: 'YouTube',   bg: '#FF0000', Icon: SiYoutube },
  socialX:         { label: 'X',         bg: '#000000', Icon: SiX },
};

export default function AboutPage() {
  const template = useTemplate();
  const { store } = useStorefrontStore();
  const b = (store?.branding || {}) as Record<string, string>;
  const isCard = template === 'card';
  const base = useStorePath();

  const title = b.aboutTitle || store?.name || 'About Us';
  const description = b.aboutDescription || `Welcome to ${store?.name || 'our store'}. We are dedicated to offering quality products and an excellent shopping experience.`;
  const socialEntries = Object.entries(SOCIAL_META).filter(([key]) => !!b[key]);

  // branding.address is an object { line1, pincode, city, district, state, country } (set in merchant setup).
  const addr = (store?.branding as Record<string, unknown> | undefined)?.address as
    | { line1?: string; pincode?: string; city?: string; district?: string; state?: string; country?: string }
    | undefined;
  const formattedAddress = addr
    ? [addr.line1, addr.district, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(', ')
    : '';

  const socialHref = (key: string, value: string) => {
    if (key === 'contactEmail') return `mailto:${value}`;
    if (key === 'contactPhone') return `tel:${value}`;
    return value;
  };

  return (
    <TemplateWrapper>
      <div className="mx-auto px-6 py-12 max-w-3xl">
        {isCard && (
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-10 mb-10 text-center">
            <h1 className="text-4xl font-extrabold mb-2">{title}</h1>
            {b.heroSubtext && <p className="text-indigo-200">{b.heroSubtext}</p>}
          </div>
        )}
        {!isCard && <h1 className="text-3xl font-bold mb-8">{title}</h1>}

        <div className={isCard ? 'bg-white rounded-2xl shadow p-8 space-y-6' : 'space-y-6'}>
          <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{description}</p>

          {b.businessHours && (
            <div className={isCard ? 'border-t pt-6' : ''}>
              <h2 className="font-semibold text-lg mb-2">Business Hours</h2>
              <p className="text-neutral-600">🕐 {b.businessHours}</p>
            </div>
          )}

          {socialEntries.length > 0 && (
            <div className={isCard ? 'border-t pt-6' : ''}>
              <h2 className="font-semibold text-lg mb-4">Contact Us</h2>
              <div className="flex flex-wrap gap-3">
                {socialEntries.map(([key, { label, bg, Icon }]) => (
                  <a key={key} href={socialHref(key, b[key])}
                    target="_blank" rel="noopener noreferrer"
                    title={label} aria-label={label}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: bg }}>
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {formattedAddress && (
            <div className={isCard ? 'border-t pt-6' : ''}>
              <p className="text-neutral-600">📍 {formattedAddress}</p>
            </div>
          )}

          <div className={isCard ? 'border-t pt-6' : ''}>
            <Link href={`${base}/products`}
              className={`inline-block font-semibold px-6 py-2.5 rounded-full transition-colors ${isCard ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-black text-white hover:bg-neutral-800'}`}>
              Browse Products →
            </Link>
          </div>
        </div>
      </div>
    </TemplateWrapper>
  );
}
