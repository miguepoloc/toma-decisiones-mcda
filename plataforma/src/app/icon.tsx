import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0B7A85',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8FE0E2' }} />
        <div style={{ width: 15, height: 15, borderRadius: 3.5, background: '#FFFFFF' }} />
      </div>
    ),
    { ...size },
  );
}
