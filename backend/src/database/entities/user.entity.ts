import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  openid: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true, unique: true })
  phone: string | null;

  @Column({ type: 'boolean', default: false, name: 'phone_verified' })
  phoneVerified: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'password_hash' })
  passwordHash: string | null;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 16, default: 'teacher' })
  role: 'teacher' | 'admin';

  @Column({ type: 'varchar', length: 64, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Column({ type: 'integer', default: 0 })
  balance: number; // cents

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
