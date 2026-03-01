import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import VendorList from '@/components/admin/VendorList'

export default async function VendorsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [items, total] = await Promise.all([
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
      take: 20,
    }),
    prisma.vendor.count({ where: { isActive: true } }),
  ])

  return (
    <div className="space-y-6">
      <VendorList initialItems={JSON.parse(JSON.stringify(items))} initialTotal={total} />
    </div>
  )
}
