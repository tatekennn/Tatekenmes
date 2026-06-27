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
          background: 'radial-gradient(circle at 50% 45%, #3a080c 0%, #090505 62%, #000 100%)',
          color: '#f7f1df',
          fontSize: 210,
          fontWeight: 900,
          fontFamily: 'serif',
        }}
      >
        覇気
      </div>
    ),
    size,
  );
}
