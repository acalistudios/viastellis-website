import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const siteOrigin = 'https://viastellis.com'
const sitemapPath = join(root, 'public', 'sitemap.xml')
const distDir = join(root, 'dist')
const distIndexPath = join(distDir, 'index.html')

const [sitemap, indexHtml] = await Promise.all([
  readFile(sitemapPath, 'utf8'),
  readFile(distIndexPath, 'utf8'),
])

const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map(match => match[1])
  .filter(url => url.startsWith(siteOrigin))
  .map(url => new URL(url).pathname)
  .filter(path => path !== '/')

for (const route of routes) {
  const targetDir = join(distDir, route.replace(/^\/+/, ''))
  await mkdir(targetDir, { recursive: true })
  await writeFile(join(targetDir, 'index.html'), indexHtml)
}

await writeFile(join(distDir, '404.html'), indexHtml)

console.log(`Created static route copies for ${routes.length} public routes.`)
