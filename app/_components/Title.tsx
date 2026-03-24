import Image from "next/image";

export default function Header({
  title,
  sub,
  img,
}: {
  title: string;
  sub: string;
  img: string;
}) {
  return (
    <div className="w-full">
      <header className="pb-6 text-center">
        <div className="vintage-divider mb-6">
          <span className="text-sepia-400 dark:text-sepia-500">✦</span>
        </div>
        <h1 className="font-typewriter text-3xl md:text-4xl lg:text-5xl text-warmGray-800 dark:text-cream tracking-wide">
          {title}
        </h1>
        <p className="mt-4 font-typewriter text-lg text-sepia-500 dark:text-sepia-400 tracking-wider">
          — {sub} —
        </p>
      </header>

      <div className="max-w-xl mx-auto mb-8 vintage-border rounded-md overflow-hidden">
        <Image
          alt={title}
          src={img}
          width={900}
          height={450}
          sizes="100vw"
          className="w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}
