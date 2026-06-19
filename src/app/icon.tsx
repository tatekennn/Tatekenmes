import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 512,
  height: 512,
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
          background: 'linear-gradient(145deg, #f7fffd 0%, #dff6f2 46%, #ffffff 100%)',
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 34,
            padding: 62,
            borderRadius: 88,
            background: 'linear-gradient(135deg, #13bfb6, #83e2dc)',
            boxShadow: '0 34px 80px rgba(19, 191, 182, 0.32)',
          }}
        >
          {[0, 1, 2, 3].map((dot) => (
            <div
              key={dot}
              style={{
                width: 101,
                height: 101,
                borderRadius: 18,
                background: '#ffffff',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.7)',
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
