import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = path.resolve(
  process.cwd(),
  "../../supabase/migrations"
);

async function readMigrations(): Promise<string> {
  try {
    const filenames = await readdir(migrationsDirectory);
    const migrations = await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".sql"))
        .sort()
        .map((filename) => readFile(path.join(migrationsDirectory, filename), "utf8"))
    );

    return migrations.join("\n");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

describe("Supabase migration contract", () => {
  it("defines tenant-scoped records, private source storage, and controlled deletion", async () => {
    const migrationSql = await readMigrations();

    expect(migrationSql).toContain("create table public.organizations");
    expect(migrationSql).toContain("create table public.organization_members");
    expect(migrationSql).toContain("create table public.projects");
    expect(migrationSql).toContain("create table public.sources");
    expect(migrationSql).toContain("create table public.source_chunks");
    expect(migrationSql).toContain("create table public.evidence_items");
    expect(migrationSql).toContain("enable row level security");
    expect(migrationSql).toContain("caselab-sources");
    expect(migrationSql).toContain("delete_source_cascade");
    expect(migrationSql).toContain("delete_project_cascade");
  });

  it("does not grant direct browser deletion of projects or sources", async () => {
    const migrationSql = await readMigrations();

    expect(migrationSql).not.toContain("on public.projects for all");
    expect(migrationSql).not.toContain("on public.sources for all");
  });
});
