// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
    // site はご自身の URL（https://digimaru.pages.dev/）に変更しておくと、sitemap 生成が正しく行われます
    site: 'https://digimaru.pages.dev/', 
    integrations: [
        mdx(), 
        sitemap(), 
        partytown({
            // config を追加し、GA4 のデータレイヤーを Web ワーカーへ転送するように設定します
            config: {
                forward: ["dataLayer.push"],
            },
        }),
    ],
});