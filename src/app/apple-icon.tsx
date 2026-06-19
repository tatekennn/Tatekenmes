import { ImageResponse } from 'next/og';

export const runtime = 'edge';
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
          background: '#f7fffd',
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            padding: 22,
            borderRadius: 31,
            background: 'linear-gradient(135deg, #13bfb6, #83e2dc)',
          }}
        >
          {[0, 1, 2, 3].map((dot) => (
            <div key={dot} style={{ width: 30, height: 30, borderRadius: 7, background: '#ffffff' }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
