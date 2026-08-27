import { readdir } from "node:fs/promises";
import path from "node:path";
import PoetryFeed, { type Poem } from "@/components/PoetryFeed";

async function getImages(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const location = path.join(folder, entry.name);
    return entry.isDirectory() ? getImages(location) : location;
  }));
  return nested.flat().filter((entry): entry is string => /\.(jpe?g|png|webp|gif)$/i.test(entry));
}

export default async function Home() {
  const files = (await getImages(path.join(process.cwd(), "images"))).sort().reverse();
  const poems: Poem[] = files.map((file) => ({
    id: file,
    image: `/images/${path.relative(path.join(process.cwd(), "images"), file).split(path.sep).map(encodeURIComponent).join("/")}`,
    title: "诗页",
    date: path.basename(file).match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "未注明日期",
  }));

  return <PoetryFeed poems={poems} />;
}
