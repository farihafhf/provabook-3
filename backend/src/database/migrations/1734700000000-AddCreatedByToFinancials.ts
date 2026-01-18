import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByToFinancials1734700000000 implements MigrationInterface {
  name = 'AddCreatedByToFinancials1734700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add created_by_id column to letters_of_credit
    await queryRunner.query(
      `ALTER TABLE "letters_of_credit" ADD COLUMN IF NOT EXISTS "created_by_id" uuid`,
    );

    // Add foreign key constraint for letters_of_credit
    await queryRunner.query(
      `ALTER TABLE "letters_of_credit" 
       ADD CONSTRAINT "FK_letters_of_credit_created_by" 
       FOREIGN KEY ("created_by_id") 
       REFERENCES "user_profiles"("id") 
       ON DELETE SET NULL`,
    );

    // Add created_by_id column to proforma_invoices
    await queryRunner.query(
      `ALTER TABLE "proforma_invoices" ADD COLUMN IF NOT EXISTS "created_by_id" uuid`,
    );

    // Add foreign key constraint for proforma_invoices
    await queryRunner.query(
      `ALTER TABLE "proforma_invoices" 
       ADD CONSTRAINT "FK_proforma_invoices_created_by" 
       FOREIGN KEY ("created_by_id") 
       REFERENCES "user_profiles"("id") 
       ON DELETE SET NULL`,
    );

    // Create index for better query performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_letters_of_credit_created_by" ON "letters_of_credit" ("created_by_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_proforma_invoices_created_by" ON "proforma_invoices" ("created_by_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_proforma_invoices_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_letters_of_credit_created_by"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "proforma_invoices" DROP CONSTRAINT IF EXISTS "FK_proforma_invoices_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "letters_of_credit" DROP CONSTRAINT IF EXISTS "FK_letters_of_credit_created_by"`,
    );

    // Drop columns
    await queryRunner.query(`ALTER TABLE "proforma_invoices" DROP COLUMN IF EXISTS "created_by_id"`);
    await queryRunner.query(`ALTER TABLE "letters_of_credit" DROP COLUMN IF EXISTS "created_by_id"`);
  }
}
