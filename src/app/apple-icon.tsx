import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #0f172a 100%)',
          position: 'relative',
        }}
      >
        <svg
          width="114"
          height="114"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 6.5A8 8 0 0 1 19 6.5" stroke="#38bdf8" strokeDasharray="2 1.5" strokeWidth="1.6" />
          <path d="M3 13h2l2-4h7l2 4h4v3H3v-3z" />
          <path d="M14 9l1.5 4H19" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
