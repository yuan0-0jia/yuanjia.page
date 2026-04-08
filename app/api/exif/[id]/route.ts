import { getPhotoExif } from "@/app/_lib/data-service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const exif = await getPhotoExif(id);
  return NextResponse.json(exif);
}
