import { ImageResponse } from "next/og";
import { getResumeData } from "@/app/_lib/data-service";
import { RESUME } from "./data";

export const runtime = "nodejs";
export const alt = "Resume — Yuan Jia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fromDb = await getResumeData();
  const resume = fromDb ?? RESUME;

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
        {/* Decorative border (matches /about treatment) */}
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
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 20,
              color: "#CC9329",
              letterSpacing: "0.3em",
              marginBottom: 24,
            }}
          >
            RESUME
          </div>

          {/* Name */}
          <div
            style={{
              fontSize: 88,
              color: "#332F29",
              letterSpacing: "0.04em",
              fontWeight: 400,
              marginBottom: 20,
            }}
          >
            {resume.name}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 80,
              height: 2,
              backgroundColor: "#CC9329",
              marginBottom: 24,
            }}
          />

          {/* Tagline */}
          {resume.tagline && (
            <div
              style={{
                fontSize: 28,
                color: "#66583D",
                letterSpacing: "0.05em",
                fontStyle: "italic",
              }}
            >
              {resume.tagline}
            </div>
          )}

          {/* Location */}
          {resume.location && (
            <div
              style={{
                fontSize: 18,
                color: "#99793D",
                letterSpacing: "0.15em",
                marginTop: 16,
              }}
            >
              {resume.location}
            </div>
          )}
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
          yuanjia.page/resume
        </div>
      </div>
    ),
    { ...size }
  );
}
