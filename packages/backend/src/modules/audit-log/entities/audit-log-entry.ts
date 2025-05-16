import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_log_entries') // Název tabulky v databázi
export class AuditLogEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn() // Automaticky se nastaví při vytvoření
  timestamp: Date;

  @Index() // Index pro rychlejší vyhledávání
  @Column({ type: 'int', nullable: true })
  userId?: number; // ID uživatele, který provedl akci (pokud je přihlášen)

  @Column({ nullable: true })
  userName?: string; // Jméno uživatele v době akce (pro snazší čtení logu)

  @Index() // Index pro rychlejší filtrování podle akce
  @Column()
  action: string; // Klíčový identifikátor akce, např. 'LOGIN_SUCCESS', 'CREATE_PATIENT'

  @Column({ type: 'jsonb', nullable: true }) // JSONB pro efektivní ukládání a dotazování strukturovaných dat
  details?: Record<string, any>; // Objekt s detaily akce, např. { entityId: 123, changes: {...} }

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true }) // text pro delší user-agent stringy
  userAgent?: string;
} 