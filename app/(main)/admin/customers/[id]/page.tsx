import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/db'
import CustomerDetail from '@/components/admin/CustomerDetail'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      },
    },
  })

  if (!customer) notFound()

  return (
    <div className="space-y-6">
      <CustomerDetail customer={JSON.parse(JSON.stringify(customer))} />
    </div>
  )
}
