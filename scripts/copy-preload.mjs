import { copyFile } from 'node:fs/promises'

await copyFile('electron/preload.cjs', 'dist-electron/preload.cjs')
