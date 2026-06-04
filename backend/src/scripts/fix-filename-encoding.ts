/**
 * 一次性修复脚本：将 Multer latin1 编码导致的中文文件名乱码恢复为 UTF-8
 *
 * 用法: npx ts-node -r tsconfig-paths/register src/scripts/fix-filename-encoding.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KbFile } from '../database/entities/kb-file.entity';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const fileRepo = app.get<Repository<KbFile>>(getRepositoryToken(KbFile));

  const files = await fileRepo.find();
  let fixed = 0;

  for (const file of files) {
    try {
      // 尝试 latin1 → utf8 转码
      const original = Buffer.from(file.filename, 'latin1').toString('utf8');

      // 如果转码后不同且转码后看起来像正常文本（含中文字符或与原名不同），则修复
      if (original !== file.filename) {
        console.log(`[FIX] "${file.filename}" → "${original}"`);
        await fileRepo.update(file.id, { filename: original });
        fixed++;
      }
    } catch {
      // 跳过无法转码的
    }
  }

  console.log(`\nDone: ${fixed} of ${files.length} files fixed.`);
  await app.close();
}

main().catch(console.error);
