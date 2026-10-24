import { ImageResponse } from 'next/og';

export const size = {
  width: 48,
  height: 48,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '11px',
          background: 'linear-gradient(135deg, #2563eb, #0f172a)',
          position: 'relative',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 6.5A8 8 0 0 1 19 6.5" stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="1.8" />
          <path d="M3 13h2l2-4h7l2 4h4v3H3v-3z" />
          <path d="M14 9l1.5 4H19" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#10b981',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
