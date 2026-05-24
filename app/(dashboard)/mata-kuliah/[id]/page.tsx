import PageWrapper from "@/components/layout/PageWrapper";

export default async function MataKuliahDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageWrapper title="Detail Mata Kuliah" description={`Detail mata kuliah ID: ${id}`}>
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Detail mata kuliah akan ditampilkan di sini.
      </div>
    </PageWrapper>
  );
}
