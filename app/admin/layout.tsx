import { PageViewTracker } from '@/components/audit/page-view-tracker'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PageViewTracker />
    </>
  )
}
