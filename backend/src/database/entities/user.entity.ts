import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  openid: string;

  @Column({ type: 'varchar', length: 16, default: 'teacher' })
  role: 'teacher' | 'admin';

  @Column({ type: 'varchar', length: 64, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
