import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0B7A85',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#8FE0E2' }} />
        <div style={{ width: 82, height: 82, borderRadius: 18, background: '#FFFFFF' }} />
      </div>
    ),
    { ...size },
  );
}
