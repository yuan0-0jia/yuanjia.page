import { ImageResponse } from "next/og";
import { getAvatar } from "./_lib/data-service";

export const runtime = "edge";
export const alt = "Yuan Jia — Software engineer & photographer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const avatar = await getAvatar();
  const avatarUrl = avatar?.find((photo: any) => photo.id === 1)?.image;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdf9f2",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Decorative border */}
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: "1px solid #e5cc8e",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 60,
          }}
        >
          {/* Avatar */}
          {avatarUrl && (
            <img
              src={avatarUrl}
              width={220}
              height={220}
              style={{
                borderRadius: "50%",
                border: "2px solid #e5cc8e",
              }}
            />
          )}

          {/* Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 64,
                color: "#332F29",
                letterSpacing: "0.03em",
                marginBottom: 16,
              }}
            >
              Yuan Jia
            </div>
            <div
              style={{
                width: 60,
                height: 2,
                backgroundColor: "#CC9329",
                marginBottom: 20,
              }}
            />
            <div
              style={{
                fontSize: 24,
                color: "#99793D",
                letterSpacing: "0.08em",
              }}
            >
              Software engineer & photographer
            </div>
          </div>
        </div>

        {/* Corner ornament */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 48,
            fontSize: 16,
            color: "#CC9329",
            letterSpacing: "0.1em",
          }}
        >
          yuanjia.page
        </div>
      </div>
    ),
    { ...size }
  );
}
