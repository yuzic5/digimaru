// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { client } from './lib/contentful'; 

const blog = defineCollection({
    // 【変更点】loader を glob から Contentful 用の自作関数に切り替えます
    loader: async () => {
        const locales = ['ja', 'en'];
        
        const allEntries = await Promise.all(
            locales.map(async (locale) => {
                const response = await client.getEntries({
                    content_type: 'blogPost', // Contentfulで設定したID
                    locale: locale,
                });

                return response.items.map((item: any) => ({
                    // Astro内部で使う一意のID（記事ID-言語）
                    id: `${item.sys.id}-${locale === 'ja' ? 'ja' : 'en'}`,
                    title: item.fields.title,
                    slug: item.fields.slug,
                    heroImage: item.fields.heroImage,
					pubDate: item.fields.pubDate,
                    body: item.fields.body, // Rich Text
                    lang: locale === 'ja' ? 'ja' : 'en',
                }));
            })
        );

        return allEntries.flat();
    },
    // 【変更点】スキーマを Contentful の設計図（Title, Slugなど）に合わせます
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        heroImage: z.string().optional(),
		pubDate: z.coerce.date(),
        lang: z.enum(['ja', 'en']),
        body: z.any(),
    }),
});

// Page用のローダーを定義（基本はblogと同じですが、content_typeを'page'にします）
const pages = defineCollection({
    loader: async () => {
        const locales = ['ja', 'en'];
        const allEntries = await Promise.all(
            locales.map(async (locale) => {
                const response = await client.getEntries({
                    content_type: 'page', // ここを'page'に変更
                    locale: locale,
                });
                return response.items.map((item: any) => ({
                    id: `${item.sys.id}-${locale}`,
                    title: item.fields.title,
                    slug: item.fields.slug,
                    heroImage: item.fields.heroImage,
                    body: item.fields.body,
                    lang: locale,
                }));
            })
        );
        return allEntries.flat();
    },
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        heroImage: z.string().optional(),
        lang: z.enum(['ja', 'en']),
        body: z.any(),
    }),
});

export const collections = { blog, pages };