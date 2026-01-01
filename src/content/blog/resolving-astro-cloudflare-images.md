---
title: 'Astro v5 + Cloudflare Pagesで画像パスとビルドエラーに悶絶した記録'
description: 'プロジェクト開始早々に直面した、画像インポートとデプロイ設定の罠をいかに突破したか。'
pubDate: '2026-01-02'
heroImage: './blog-placeholder-about.svg'
---

Astro v5 での画像パスとCloudflareデプロイに対するエラー修正の工程をここに記す。
最終的に成功した手順で整理してほしかったんだけど。。。

## 1. 画像パスの迷宮

Astro v5のContent Layerにおいて、記事（Markdown）と同じフォルダに画像を配置した際、ビルドエラーが発生した。

### 発生した問題
- `.md`内で指定した画像パスが、ビルド時に「モジュールが見つからない」と怒られる。
- `/`（絶対パス）と `./`（相対パス）が混在し、Astroのキャッシュが混乱。

### 解決策
1. **`.astro` フォルダの削除**: キャッシュを物理的に消去し、`npx astro sync` で型定義を再生成。
2. **パスの統一**: 記事内の画像は `./filename.jpg`、共通素材は `public/` フォルダへ配置し `/filename.svg` で参照する設計に整理。

## 2. FallbackImageの定義エラー

共通コンポーネント `BaseHead.astro` で、画像がない時のデフォルト値を設定しようとしてハマった。

### 発生した問題
- `import FallbackImage from '...'` を消したのに、コード下部で変数を使っていたため `FallbackImage is not defined` エラーが発生。

### 解決策
分割代入のデフォルト値を、変数ではなく直接「パス文字列」に書き換えた。

```astro
// 修正前
const { title, description, image = FallbackImage } = Astro.props;

// 修正後
const { title, description, image = '/blog-placeholder-about.svg' } = Astro.props;
```

## 3. Astro v5の「頑固なキャッシュ」

パスを ./ に修正してもエラーが消えないという、不可解な現象に直面した。

### 発生した問題
Astro v5から導入された Content Layer は、内部でデータベースを使用して記事データをキャッシュしている。そのため、ファイルを修正しても「古い失敗の記憶」が優先され、エラーがループしてしまう。

### 解決策：物理的な記憶消去
以下のコマンドを順に実行し、キャッシュフォルダを完全に削除して再同期させることで解決した。
- rm -r .astro （キャッシュフォルダの削除）
- npx astro sync （コンテンツの再スキャンと同期）

### 解決策：自動掃除スクリプトの導入
いちいち手動でフォルダを消すのは非効率なため、package.json に「掃除と起動」を一撃で行うスクリプトを追加した。

[追加したスクリプト]
```json
"clean": "rm -rf .astro dist && npx astro sync && npm run dev"
```

これにより、npm run clean と打つだけで、古い記憶をリセットして真っさらな状態で開発を再開できるようになった。

## 4. スキーマの「リフォーム」：エラーを未然に防ぐ

標準の image() ヘルパーは厳格すぎて、少しのパスミスでサイト全体をクラッシュさせる。そこで、画像でも文字列（パス）でも受け付ける「ハイブリッド設定」へスキーマを変更した。

### 解決策：z.union の活用
content.config.ts の heroImage 定義を以下のように拡張した。

[修正後のスキーマ]
```ts
// 修正前
heroImage: image().optional()

// 修正後
heroImage: z.union([image(), z.string()]).optional()
```

この「いいとこ取り」の設定により、Astroによる画像最適化の恩恵を受けつつ、publicフォルダの画像を直接指定してもエラーで止まらない柔軟な設計（アダプティブ・ツーリング）を実現した。


## 5. Cloudflare "Worker" の罠と "Pages" への生還

デプロイ先をCloudflareに選び、デプロイしようとした。

### 発生した問題
Cloudflareの現在のGUI（2026年時点）では、新規作成画面から進むと「Worker」の作成ルートしか表示されず、「Pages」を選択できなかった。
- GUIの誘導に従うと「Worker」として登録され、静的サイトのデプロイには不要なコマンド入力を求められ、困った。

### 解決策：Pages作成画面へのダイレクトリンク
GUIの誘導を無視して、Pages作成専用のURLへ直接アクセスするのが最も確実な「ショートカット」だった。URLは「Gemini」が教えてくれた。

- Cloudflare Pages 直接作成リンク: 
https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages

このリンクから進むことで、フレームワークプリセットから Astro を選ぶだけで「Pages」を作成できた。

## 6. 最終的なプロジェクト構成

試行錯誤の結果、以下の構成が「最も頑丈で壊れにくい」ことが判明した。

- public/: サイトロゴ、ファビコンなど（絶対パス / で参照）
- src/content/blog/: 各記事のアイキャッチ画像（相対パス ./ で参照）
- about.astro: imageヘルパーを使わず、直接パス指定することでビルドエラーのリスクを最小限に抑えた。