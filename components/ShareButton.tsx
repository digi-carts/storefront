'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, X } from 'lucide-react';

interface ShareMenuProps {
  readonly title: string;
  readonly url?: string;
}

export function ShareButton({ title, url }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
  };

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={16} className="text-green-500" />,
      href: `https://wa.me/?text=${encodeURIComponent(title + ' ' + shareUrl)}`,
    },
    {
      label: 'Twitter / X',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'Facebook',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-blue-600"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch { /* user cancelled */ }
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleNativeShare}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-black border rounded-full px-3 py-1.5 hover:border-neutral-400 transition-colors"
      >
        <Share2 size={14} />
        Share
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close share menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            onKeyDown={e => e.key === 'Escape' && setOpen(false)}
          />
          <div className="absolute left-0 top-10 z-50 bg-white border rounded-xl shadow-lg p-1 min-w-[180px]">
            <div className="flex items-center justify-between px-3 py-2 border-b mb-1">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Share</span>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-black">
                <X size={14} />
              </button>
            </div>
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-neutral-50 transition-colors"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            {shareOptions.map(opt => (
              <a
                key={opt.label}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-neutral-50 transition-colors"
              >
                {opt.icon}
                {opt.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
