import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_BRANCHES, getBrandBranch } from "@/components/brandPortal/brands";
import styles from "./page.module.css";

export function generateStaticParams() {
  return BRAND_BRANCHES.map((branch) => ({ id: branch.id }));
}

type BranchPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BranchPageProps) {
  const { id } = await params;
  const branch = getBrandBranch(id);
  return {
    title: branch ? `${branch.title} | Spirit Connect` : "Spirit Connect",
    description: branch?.summary,
  };
}

export default async function BranchPage({ params }: BranchPageProps) {
  const { id } = await params;
  const branch = getBrandBranch(id);
  if (!branch) notFound();

  return (
    <main className={styles.page} style={{ "--branch-accent": branch.accent } as React.CSSProperties}>
      <Link className={styles.back} href="/">
        Back to projector
      </Link>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>{branch.eyebrow}</p>
        <h1>{branch.title}</h1>
        <p className={styles.summary}>{branch.summary}</p>
        <p className={styles.detail}>{branch.detail}</p>
        <div className={styles.keywords}>
          {branch.keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
