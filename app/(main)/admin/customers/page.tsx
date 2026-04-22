import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import CustomerList from '@/components/admin/CustomerList'

export default async function CustomersPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 20,
    }),
    prisma.customer.count({ where: { isActive: true } }),
  ])

  return (
    <div className="space-y-6">
      <CustomerList initialItems={JSON.parse(JSON.stringify(items))} initialTotal={total} />
    </div>
  )
}
