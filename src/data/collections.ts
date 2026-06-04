// 数据来源: 根目录 data/collections.json (由后台编辑器维护)
// 前端通过 Vite 的 JSON import 静态打包,构建时即固化
import data from '../../data/collections.json';

export type Photo = {
  src: string;
  caption: string;
  story?: string;
  location?: string;
  year?: string;
};

export type Collection = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover: string;
  category: '人文' | '风光';
  year: string;
  photos: Photo[];
};

export const collections: Collection[] = (data as { collections: Collection[] }).collections;

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}
