"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useAuth } from "./AuthProvider";

const AvatarImageItem = dynamic(() => import("./AvatarImageItem"), {
  ssr: false,
});

interface AvatarData {
  id: number;
  image: string;
}

export default function EditableAvatar({ avatar }: { avatar: AvatarData }) {
  const { isEditMode } = useAuth();

  if (isEditMode) {
    return (
      <div className="relative h-44 w-44 md:h-56 md:w-56 lg:h-64 lg:w-64 rounded-full overflow-hidden [&>div]:h-full! [&>div]:w-full!">
        <AvatarImageItem avatar={avatar} />
      </div>
    );
  }

  return (
    <div className="relative h-44 w-44 md:h-56 md:w-56 lg:h-64 lg:w-64 rounded-full overflow-hidden">
      <Image
        alt="Yuan"
        src={avatar.image}
        fill
        priority={true}
        quality={75}
        sizes="(max-width: 768px) 176px, (max-width: 1024px) 224px, 256px"
        className="object-cover"
      />
    </div>
  );
}
