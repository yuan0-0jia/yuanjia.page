import { getAboutContent } from "../_lib/data-service";
import AboutContent from "../_components/AboutContent";
import AboutEditToggle from "../_components/AboutEditToggle";

export const metadata = {
  title: "About",
  description:
    "Learn more about Yuan Jia — software engineer and photographer based in south bay.",
};

export const revalidate = 3600;

export default async function Page() {
  const content = await getAboutContent();

  return (
    <div className="mx-4 md:mx-12 lg:mx-20 my-12 md:my-20 flex flex-col items-center justify-center p-4 tracking-wide">
      <div className="max-w-5xl w-full">
        <header className="text-center mb-12">
          <div className="vintage-divider mb-8 animate-fade-in opacity-0 stagger-1">
            <span className="text-sepia-500 dark:text-sepia-400">✦</span>
          </div>
          <h1 className="font-typewriter text-3xl md:text-4xl text-warmGray-800 dark:text-cream tracking-wide animate-fade-in-up opacity-0 stagger-2">
            About Me
          </h1>
          <p className="font-typewriter text-sm mt-4 text-sepia-500 dark:text-sepia-400 tracking-wider animate-fade-in-up opacity-0 stagger-3">
            — Yuan Jia —
          </p>
        </header>

        <div className="animate-fade-in-up opacity-0 stagger-4">
          <AboutEditToggle content={content}>
            <AboutContent blocks={content} />
          </AboutEditToggle>
        </div>
      </div>
    </div>
  );
}
